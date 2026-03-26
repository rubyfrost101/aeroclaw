import { app, BrowserWindow, dialog, ipcMain, shell } from 'electron'
import { promises as fs } from 'node:fs'
import { createServer, type IncomingMessage, type Server, type ServerResponse } from 'node:http'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import * as mammoth from 'mammoth'
import { PDFParse } from 'pdf-parse'
import * as XLSX from 'xlsx'
import {
  probeOpenClawGateway,
  sendViaOpenClawGateway,
  syncOpenClawGateway,
} from './openclaw-client'
import type {
  AppState,
  BootstrapPayload,
  ChatRequest,
  ChatResult,
  GatewayProbeResult,
  GatewayServiceStatus,
  GatewaySettings,
  ImportedAttachment,
  ModelProvider,
  OpenClawGatewaySnapshot,
  PluginItem,
  ProviderTestResult,
  SkillItem,
  StarterAssetsResult,
} from '../src/shared/schema'

const BRAND_NAME = 'AeroClaw'
const PROJECT_SLUG = 'aeroclaw'
const DEFAULT_GATEWAY_PORT = 18879
const DEFAULT_GATEWAY_ENDPOINT = 'http://127.0.0.1'
const DEFAULT_CANVAS_PATH = '/__aeroclaw__'
const TEXT_PREVIEW_LIMIT = 14000

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
let gatewayServer: Server | null = null
let gatewayStartedAt: string | undefined
let gatewayLastError: string | undefined
let cachedState: AppState | null = null

interface AppPaths extends GatewaySettings {
  stateFile: string
}

const builtinPlugins: PluginItem[] = [
  {
    id: 'builtin-file-inspector',
    name: '文件洞察',
    description: '上传文本、表格、PDF 或文档后，优先整理重点、摘要和待确认项。',
    enabled: true,
    source: 'builtin',
  },
  {
    id: 'builtin-web-brief',
    name: '网页速读',
    description: '为后续接入浏览器自动化和网页采集预留插件入口。',
    enabled: true,
    source: 'builtin',
  },
  {
    id: 'builtin-spreadsheet-analyst',
    name: '表格分析师',
    description: '针对 CSV / Excel 提供结构化预览，方便继续提问分析。',
    enabled: true,
    source: 'builtin',
  },
]

const builtinSkills: SkillItem[] = [
  {
    id: 'bundled-chat-ops',
    name: '对话编排',
    description: '帮助你把复杂目标拆成多个二级对话与执行步骤。',
    source: 'bundled',
  },
  {
    id: 'bundled-file-analysis',
    name: '文件分析',
    description: '导入文件时自动提取文本内容，并注入本轮对话上下文。',
    source: 'bundled',
  },
  {
    id: 'bundled-gateway-ready',
    name: '兼容网关',
    description: '预留 OpenClaw-compatible 网关接入位，但目录与名称完全独立。',
    source: 'bundled',
  },
]

function getAppPaths(): AppPaths {
  const homeDir = app.getPath('home')
  const configDir = path.join(homeDir, `.${PROJECT_SLUG}`)
  const supportDir = path.join(homeDir, 'Library', 'Application Support', BRAND_NAME)
  const workspaceDir = path.join(supportDir, 'workspace')
  const skillsDir = path.join(configDir, 'skills')
  const pluginsDir = path.join(configDir, 'plugins')
  const configFile = path.join(configDir, `${PROJECT_SLUG}.json`)
  const stateFile = path.join(supportDir, 'state.json')

  return {
    transport: 'openai-compatible',
    endpoint: DEFAULT_GATEWAY_ENDPOINT,
    port: DEFAULT_GATEWAY_PORT,
    canvasPath: DEFAULT_CANVAS_PATH,
    authToken: '',
    password: '',
    sessionKey: 'main',
    configDir,
    configFile,
    supportDir,
    workspaceDir,
    skillsDir,
    pluginsDir,
    stateFile,
  }
}

async function ensureAppPaths(paths: AppPaths) {
  await Promise.all(
    [paths.configDir, paths.supportDir, paths.workspaceDir, paths.skillsDir, paths.pluginsDir].map((target) =>
      fs.mkdir(target, { recursive: true }),
    ),
  )
}

async function readJsonFile<T>(filePath: string): Promise<T | null> {
  try {
    const raw = await fs.readFile(filePath, 'utf8')
    return JSON.parse(raw) as T
  } catch {
    return null
  }
}

async function writeJsonFile(filePath: string, value: unknown) {
  await fs.writeFile(filePath, JSON.stringify(value, null, 2), 'utf8')
}

async function exists(targetPath: string) {
  try {
    await fs.access(targetPath)
    return true
  } catch {
    return false
  }
}

function trimPreview(content: string) {
  const normalized = content.replaceAll('\0', '').trim()
  if (!normalized) {
    return '文件已导入，但没有提取到可用文本内容。'
  }

  if (normalized.length <= TEXT_PREVIEW_LIMIT) {
    return normalized
  }

  return `${normalized.slice(0, TEXT_PREVIEW_LIMIT)}\n\n[内容已截断，仅保留前 ${TEXT_PREVIEW_LIMIT} 个字符用于分析]`
}

function extensionOf(filePath: string) {
  return path.extname(filePath).toLowerCase()
}

function inferAttachmentKind(filePath: string): ImportedAttachment['kind'] {
  const extension = extensionOf(filePath)

  if (['.md', '.txt', '.ts', '.tsx', '.js', '.jsx', '.json', '.csv', '.yaml', '.yml', '.py', '.rs', '.java'].includes(extension)) {
    return 'text'
  }

  if (extension === '.pdf') {
    return 'pdf'
  }

  if (extension === '.docx') {
    return 'docx'
  }

  if (['.xlsx', '.xls', '.numbers'].includes(extension)) {
    return 'spreadsheet'
  }

  if (['.png', '.jpg', '.jpeg', '.gif', '.webp', '.svg'].includes(extension)) {
    return 'image'
  }

  return 'unknown'
}

async function readAttachmentPreview(filePath: string) {
  const kind = inferAttachmentKind(filePath)
  const extension = extensionOf(filePath)

  if (kind === 'text') {
    return trimPreview(await fs.readFile(filePath, 'utf8'))
  }

  if (kind === 'pdf') {
    const parser = new PDFParse({ data: await fs.readFile(filePath) })
    const result = await parser.getText()
    await parser.destroy()
    return trimPreview(result.text)
  }

  if (kind === 'docx') {
    const result = await mammoth.extractRawText({ path: filePath })
    return trimPreview(result.value)
  }

  if (kind === 'spreadsheet') {
    const workbook = XLSX.readFile(filePath)
    const firstSheet = workbook.SheetNames[0]
    const sheet = workbook.Sheets[firstSheet]
    const preview = XLSX.utils.sheet_to_csv(sheet)
    return trimPreview(`Sheet: ${firstSheet}\n\n${preview}`)
  }

  if (kind === 'image') {
    return '这是一个图片文件。当前版本先保留文件元信息，后续可继续接入 OCR / 视觉分析插件。'
  }

  return `暂未内置 ${extension || '该类型'} 文件的深度解析，会把文件名和路径一起提供给模型参考。`
}

async function importAttachment(filePath: string): Promise<ImportedAttachment> {
  const stats = await fs.stat(filePath)

  return {
    id: crypto.randomUUID(),
    name: path.basename(filePath),
    path: filePath,
    size: stats.size,
    extension: extensionOf(filePath),
    kind: inferAttachmentKind(filePath),
    preview: await readAttachmentPreview(filePath),
  }
}

async function readLocalSkills(skillsDir: string) {
  const skills: SkillItem[] = []

  try {
    const entries = await fs.readdir(skillsDir, { withFileTypes: true })
    for (const entry of entries) {
      const fullPath = path.join(skillsDir, entry.name)
      if (entry.isDirectory()) {
        const skillFile = path.join(fullPath, 'SKILL.md')
        try {
          await fs.access(skillFile)
          skills.push({
            id: `local-skill-${entry.name}`,
            name: entry.name,
            description: `来自 ${skillFile} 的本地技能。`,
            source: 'local',
            path: skillFile,
          })
        } catch {
          continue
        }
      }
    }
  } catch {
    return []
  }

  return skills
}

async function readLocalPlugins(pluginsDir: string) {
  const plugins: PluginItem[] = []

  try {
    const entries = await fs.readdir(pluginsDir, { withFileTypes: true })
    for (const entry of entries) {
      const manifestPath = entry.isDirectory()
        ? path.join(pluginsDir, entry.name, 'plugin.json')
        : entry.name.endsWith('.json')
          ? path.join(pluginsDir, entry.name)
          : ''

      if (!manifestPath) {
        continue
      }

      const manifest = await readJsonFile<{ name?: string; description?: string }>(manifestPath)
      if (!manifest) {
        continue
      }

      plugins.push({
        id: `local-plugin-${entry.name}`,
        name: manifest.name ?? entry.name.replace(/\.json$/, ''),
        description: manifest.description ?? '来自本地插件目录的扩展。',
        enabled: true,
        source: 'local',
        entryPath: manifestPath,
      })
    }
  } catch {
    return []
  }

  return plugins
}

async function ensureStarterAssets(paths: AppPaths): Promise<StarterAssetsResult> {
  const created: string[] = []
  const skipped: string[] = []

  const starterSkillDir = path.join(paths.skillsDir, 'starter_analysis')
  const starterSkillFile = path.join(starterSkillDir, 'SKILL.md')
  const starterPluginDir = path.join(paths.pluginsDir, 'starter_bridge')
  const starterPluginManifest = path.join(starterPluginDir, 'plugin.json')
  const starterPluginReadme = path.join(starterPluginDir, 'README.md')

  if (await exists(starterSkillFile)) {
    skipped.push(starterSkillFile)
  } else {
    await fs.mkdir(starterSkillDir, { recursive: true })
    await fs.writeFile(
      starterSkillFile,
      `# Starter Analysis Skill

## Purpose
Help AeroClaw summarize imported files, identify action items, and prepare follow-up prompts.

## Workflow
1. Read the imported files first.
2. Produce a concise summary.
3. List risks, open questions, and next actions.
4. When the user asks for a deeper dive, keep references grounded in the imported material.

## Notes
- This starter skill lives under ~/.aeroclaw/skills and is separated from any openclaw skill directory.
- Replace this file with your own workflow instructions at any time.
`,
      'utf8',
    )
    created.push(starterSkillFile)
  }

  if (await exists(starterPluginManifest)) {
    skipped.push(starterPluginManifest)
  } else {
    await fs.mkdir(starterPluginDir, { recursive: true })
    await fs.writeFile(
      starterPluginManifest,
      JSON.stringify(
        {
          name: 'Starter Bridge',
          description: 'A local AeroClaw plugin placeholder for future gateway or workflow integrations.',
          version: '0.1.0',
          entry: './README.md',
        },
        null,
        2,
      ),
      'utf8',
    )
    await fs.writeFile(
      starterPluginReadme,
      `# Starter Bridge

This folder is a starter local plugin for AeroClaw.

Use it to describe:
- what the plugin should do
- which local service or gateway it talks to
- what inputs and outputs it expects

AeroClaw discovers this folder from ~/.aeroclaw/plugins and keeps it separate from openclaw directories.
`,
      'utf8',
    )
    created.push(starterPluginManifest, starterPluginReadme)
  }

  return { created, skipped }
}

function createDefaultState(paths: AppPaths, skills: SkillItem[], plugins: PluginItem[]): AppState {
  const now = new Date().toISOString()
  const starterProviderId = crypto.randomUUID()
  const starterConversationId = crypto.randomUUID()

  return {
    brandName: BRAND_NAME,
    projectSlug: PROJECT_SLUG,
    activeSection: 'chat',
    activeConversationId: starterConversationId,
    activeProviderId: starterProviderId,
    providers: [
      {
        id: starterProviderId,
        label: '自定义 OpenAI-Compatible',
        model: 'gpt-4o-mini',
        baseUrl: 'https://api.example.com/v1',
        apiKey: '',
        tokenSourceName: '自定义 token 源',
        notes: '安装后只需要换成你自己的 API URL、API Key 和模型名即可使用。',
        category: 'custom',
        enabled: true,
      },
    ],
    conversations: [
      {
        id: starterConversationId,
        title: '欢迎使用 AeroClaw',
        summary: '独立目录、独立网关、安装后配 token 即可用',
        createdAt: now,
        updatedAt: now,
        gatewaySessionKey: 'main',
        messages: [
          {
            id: crypto.randomUUID(),
            role: 'assistant',
            content:
              '这是你的独立 `AeroClaw` 工作台。它和 `openclaw` 使用不同的配置目录、插件目录和技能目录，所以可以同时安装、同时运行。\n\n' +
              '你现在可以先在右上角配置一个自定义 token 源，然后直接聊天；也可以先导入文件，让我根据文档内容再帮你分析。',
            createdAt: now,
            attachments: [],
          },
        ],
      },
    ],
    plugins,
    skills,
    gateway: {
      transport: 'openai-compatible',
      endpoint: DEFAULT_GATEWAY_ENDPOINT,
      port: DEFAULT_GATEWAY_PORT,
      canvasPath: DEFAULT_CANVAS_PATH,
      authToken: '',
      password: '',
      sessionKey: 'main',
      configDir: paths.configDir,
      configFile: paths.configFile,
      supportDir: paths.supportDir,
      workspaceDir: paths.workspaceDir,
      skillsDir: paths.skillsDir,
      pluginsDir: paths.pluginsDir,
    },
  }
}

function mergePlugins(defaultPlugins: PluginItem[], storedPlugins: PluginItem[]) {
  const byId = new Map<string, PluginItem>()
  ;[...defaultPlugins, ...storedPlugins].forEach((plugin) => {
    const previous = byId.get(plugin.id)
    byId.set(plugin.id, {
      ...plugin,
      enabled: previous?.enabled ?? plugin.enabled,
    })
  })
  return Array.from(byId.values())
}

function mergeSkills(defaultSkills: SkillItem[], localSkills: SkillItem[]) {
  const byId = new Map<string, SkillItem>()
  ;[...defaultSkills, ...localSkills].forEach((skill) => {
    byId.set(skill.id, skill)
  })
  return Array.from(byId.values())
}

function normalizeState(state: AppState): AppState {
  const fallback = createDefaultState(getAppPaths(), [], [])
  const providers = state.providers.length > 0 ? state.providers : fallback.providers
  const activeProviderId =
    providers.find((provider) => provider.id === state.activeProviderId)?.id ?? providers[0].id
  const conversations = state.conversations.length > 0 ? state.conversations : fallback.conversations
  const activeConversationId =
    conversations.find((conversation) => conversation.id === state.activeConversationId)?.id ?? conversations[0].id

  return {
    ...state,
    activeProviderId,
    activeConversationId,
    providers,
    conversations,
  }
}

async function loadState(paths: AppPaths) {
  const [storedState, storedConfig, localSkills, localPlugins] = await Promise.all([
    readJsonFile<AppState>(paths.stateFile),
    readJsonFile<Pick<AppState, 'providers' | 'activeProviderId' | 'gateway'>>(paths.configFile),
    readLocalSkills(paths.skillsDir),
    readLocalPlugins(paths.pluginsDir),
  ])

  const defaultState = createDefaultState(
    paths,
    mergeSkills(builtinSkills, localSkills),
    mergePlugins(builtinPlugins, localPlugins),
  )

  const normalized = normalizeState({
    ...defaultState,
    ...storedState,
    providers: storedConfig?.providers ?? storedState?.providers ?? defaultState.providers,
    activeProviderId:
      storedConfig?.activeProviderId ?? storedState?.activeProviderId ?? defaultState.activeProviderId,
    gateway: {
      ...defaultState.gateway,
      ...storedConfig?.gateway,
      ...storedState?.gateway,
    },
    skills: mergeSkills(defaultState.skills, localSkills),
    plugins: mergePlugins(defaultState.plugins, [...(storedState?.plugins ?? []), ...localPlugins]),
  })

  cachedState = normalized
  return normalized
}

async function persistState(paths: AppPaths, state: AppState) {
  const normalized = normalizeState(state)
  cachedState = normalized
  await Promise.all([
    writeJsonFile(paths.stateFile, normalized),
    writeJsonFile(paths.configFile, {
      providers: normalized.providers,
      activeProviderId: normalized.activeProviderId,
      gateway: normalized.gateway,
    }),
  ])
}

function buildAttachmentPrompt(attachments: ImportedAttachment[]) {
  if (attachments.length === 0) {
    return ''
  }

  return attachments
    .map(
      (attachment) =>
        `### 导入文件：${attachment.name}\n` +
        `路径：${attachment.path}\n` +
        `类型：${attachment.kind}\n` +
        `内容预览：\n${attachment.preview}`,
    )
    .join('\n\n')
}

function extractAssistantContent(payload: unknown) {
  if (!payload || typeof payload !== 'object') {
    return ''
  }

  const response = payload as {
    choices?: Array<{ message?: { content?: string | Array<{ text?: string }> } }>
  }

  const content = response.choices?.[0]?.message?.content
  if (typeof content === 'string') {
    return content
  }

  if (Array.isArray(content)) {
    return content
      .map((item) => (typeof item?.text === 'string' ? item.text : ''))
      .filter(Boolean)
      .join('\n')
  }

  return ''
}

async function runChatCompletion(request: ChatRequest): Promise<ChatResult> {
  const gatewaySettings = cachedState?.gateway

  if (gatewaySettings?.transport === 'openclaw-compatible') {
    return await sendViaOpenClawGateway({
      settings: gatewaySettings,
      prompt: request.prompt,
      sessionKey: request.sessionKey || gatewaySettings.sessionKey || 'main',
      attachments: request.attachments,
    })
  }

  if (!request.provider.baseUrl.trim()) {
    throw new Error('当前模型源缺少 API URL。')
  }

  if (!request.provider.model.trim()) {
    throw new Error('当前模型源缺少模型名。')
  }

  const url = `${request.provider.baseUrl.replace(/\/$/, '')}/chat/completions`
  const attachmentPrompt = buildAttachmentPrompt(request.attachments)
  const prompt = attachmentPrompt ? `${request.prompt}\n\n${attachmentPrompt}` : request.prompt

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(request.provider.apiKey
        ? {
            Authorization: `Bearer ${request.provider.apiKey}`,
          }
        : {}),
    },
    body: JSON.stringify({
      model: request.provider.model,
      temperature: 0.4,
      messages: [
        {
          role: 'system',
          content:
            'You are AeroClaw, a standalone macOS AI workspace compatible with OpenAI-style APIs. ' +
            'Answer in Chinese unless the user clearly asks otherwise. Summarize attached files faithfully and call out uncertainty.',
        },
        ...request.history.map((message) => ({
          role: message.role,
          content: message.content,
        })),
        {
          role: 'user',
          content: prompt,
        },
      ],
    }),
  })

  if (!response.ok) {
    const errorText = await response.text()
    throw new Error(`模型请求失败 (${response.status})：${errorText}`)
  }

  const payload = (await response.json()) as unknown
  const content = extractAssistantContent(payload)
  if (!content) {
    throw new Error('模型响应中没有可读内容。')
  }

  return { content }
}

function providerHeaders(provider: ModelProvider) {
  return {
    'Content-Type': 'application/json',
    ...(provider.apiKey
      ? {
          Authorization: `Bearer ${provider.apiKey}`,
        }
      : {}),
  }
}

async function testProviderConnection(provider: ModelProvider): Promise<ProviderTestResult> {
  const checkedAt = new Date().toISOString()

  if (!provider.baseUrl.trim()) {
    return { ok: false, message: '缺少 API URL。', checkedAt }
  }

  if (!provider.model.trim()) {
    return { ok: false, message: '缺少模型名。', checkedAt }
  }

  const baseUrl = provider.baseUrl.replace(/\/$/, '')

  try {
    const modelsResponse = await fetch(`${baseUrl}/models`, {
      method: 'GET',
      headers: providerHeaders(provider),
    })

    if (modelsResponse.ok) {
      const payload = (await modelsResponse.json()) as { data?: Array<{ id?: string }> }
      const modelCount = payload.data?.length ?? 0
      const hasTargetModel = payload.data?.some((item) => item.id === provider.model) ?? false

      return {
        ok: true,
        checkedAt,
        message:
          modelCount > 0
            ? hasTargetModel
              ? `连接成功，模型列表里已找到 ${provider.model}。`
              : `连接成功，拉取到 ${modelCount} 个模型，但未直接看到 ${provider.model}。`
            : '连接成功，接口可访问。',
      }
    }

    if (![404, 405].includes(modelsResponse.status)) {
      const errorText = await modelsResponse.text()
      return {
        ok: false,
        checkedAt,
        message: `连接失败 (${modelsResponse.status})：${errorText || '无法访问 /models'}`,
      }
    }
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : '无法访问模型服务'
    return { ok: false, checkedAt, message: `连接失败：${message}` }
  }

  try {
    const probeResponse = await fetch(`${baseUrl}/chat/completions`, {
      method: 'POST',
      headers: providerHeaders(provider),
      body: JSON.stringify({
        model: provider.model,
        max_tokens: 8,
        temperature: 0,
        messages: [
          {
            role: 'user',
            content: 'Reply with OK only.',
          },
        ],
      }),
    })

    if (!probeResponse.ok) {
      const errorText = await probeResponse.text()
      return {
        ok: false,
        checkedAt,
        message: `连接失败 (${probeResponse.status})：${errorText || 'chat/completions 探测失败'}`,
      }
    }

    return {
      ok: true,
      checkedAt,
      message: `连接成功，${provider.model} 已通过对话接口探测。`,
    }
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'chat/completions 探测失败'
    return { ok: false, checkedAt, message: `连接失败：${message}` }
  }
}

async function probeGatewayConnection(settings: GatewaySettings): Promise<GatewayProbeResult> {
  if (settings.transport === 'openclaw-compatible') {
    return await probeOpenClawGateway(settings)
  }

  const checkedAt = new Date().toISOString()
  const host = parseGatewayHost(settings.endpoint)

  return {
    ok: true,
    checkedAt,
    gatewayUrl: `http://${host}:${settings.port}`,
    authMode: 'none',
    message: '当前是 AeroClaw 的独立本地网关模式。启动本地网关后即可访问兼容接口。',
  }
}

async function syncGatewayCatalog(settings: GatewaySettings): Promise<OpenClawGatewaySnapshot> {
  if (settings.transport !== 'openclaw-compatible') {
    return {
      checkedAt: new Date().toISOString(),
      gatewayUrl: `http://${parseGatewayHost(settings.endpoint)}:${settings.port}`,
      authMode: 'none',
      models: [],
      sessions: [],
      skills: [],
      tools: [],
    }
  }

  return await syncOpenClawGateway(settings)
}

function parseGatewayHost(endpoint: string) {
  try {
    const url = new URL(endpoint.includes('://') ? endpoint : `http://${endpoint}`)
    return url.hostname || '127.0.0.1'
  } catch {
    return '127.0.0.1'
  }
}

function createGatewayStatus(state: AppState): GatewayServiceStatus {
  const host = parseGatewayHost(state.gateway.endpoint)

  return {
    running: gatewayServer !== null,
    url: `http://${host}:${state.gateway.port}`,
    host,
    port: state.gateway.port,
    startedAt: gatewayStartedAt,
    lastError: gatewayLastError,
  }
}

function sendJson(res: ServerResponse, statusCode: number, payload: unknown) {
  res.writeHead(statusCode, {
    'Content-Type': 'application/json; charset=utf-8',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
  })
  res.end(JSON.stringify(payload, null, 2))
}

function safeProviders(state: AppState) {
  return state.providers.map((provider) => ({
    ...provider,
    apiKey: provider.apiKey ? '***' : '',
  }))
}

async function handleGatewayRequest(req: IncomingMessage, res: ServerResponse, paths: AppPaths) {
  if (req.method === 'OPTIONS') {
    sendJson(res, 204, {})
    return
  }

  const state = cachedState ?? (await loadState(paths))
  const requestUrl = new URL(req.url ?? '/', 'http://127.0.0.1')

  if (requestUrl.pathname === '/health') {
    sendJson(res, 200, {
      ok: true,
      brandName: BRAND_NAME,
      projectSlug: PROJECT_SLUG,
      gateway: state.gateway,
      status: createGatewayStatus(state),
    })
    return
  }

  if (requestUrl.pathname === '/skills') {
    sendJson(res, 200, {
      items: state.skills,
      total: state.skills.length,
    })
    return
  }

  if (requestUrl.pathname === '/plugins') {
    sendJson(res, 200, {
      items: state.plugins,
      total: state.plugins.length,
    })
    return
  }

  if (requestUrl.pathname === '/providers') {
    sendJson(res, 200, {
      items: safeProviders(state),
      activeProviderId: state.activeProviderId,
    })
    return
  }

  if (requestUrl.pathname === '/conversations') {
    sendJson(res, 200, {
      items: state.conversations.map((conversation) => ({
        id: conversation.id,
        title: conversation.title,
        summary: conversation.summary,
        updatedAt: conversation.updatedAt,
        messageCount: conversation.messages.length,
      })),
      activeConversationId: state.activeConversationId,
    })
    return
  }

  if (requestUrl.pathname === '/config') {
    sendJson(res, 200, {
      brandName: state.brandName,
      projectSlug: state.projectSlug,
      gateway: state.gateway,
      directories: {
        configDir: state.gateway.configDir,
        supportDir: state.gateway.supportDir,
        workspaceDir: state.gateway.workspaceDir,
        skillsDir: state.gateway.skillsDir,
        pluginsDir: state.gateway.pluginsDir,
      },
    })
    return
  }

  if (requestUrl.pathname === '/reload' && req.method === 'POST') {
    await ensureStarterAssets(paths)
    const nextState = await loadState(paths)
    sendJson(res, 200, {
      ok: true,
      status: createGatewayStatus(nextState),
      skills: nextState.skills.length,
      plugins: nextState.plugins.length,
    })
    return
  }

  sendJson(res, 404, {
    ok: false,
    message: 'Gateway endpoint not found.',
    availableEndpoints: ['/health', '/skills', '/plugins', '/providers', '/conversations', '/config', '/reload'],
  })
}

async function startGatewayServer(paths: AppPaths): Promise<GatewayServiceStatus> {
  const state = cachedState ?? (await loadState(paths))

  if (gatewayServer) {
    return createGatewayStatus(state)
  }

  const host = parseGatewayHost(state.gateway.endpoint)

  await new Promise<void>((resolve, reject) => {
    const server = createServer((req, res) => {
      void handleGatewayRequest(req, res, paths).catch((error: unknown) => {
        const message = error instanceof Error ? error.message : 'Gateway request failed'
        sendJson(res, 500, { ok: false, message })
      })
    })

    server.once('error', (error: unknown) => {
      const message = error instanceof Error ? error.message : 'Gateway start failed'
      gatewayLastError = message
      reject(new Error(message))
    })

    server.listen(state.gateway.port, host, () => {
      gatewayServer = server
      gatewayStartedAt = new Date().toISOString()
      gatewayLastError = undefined
      resolve()
    })
  })

  return createGatewayStatus(state)
}

async function stopGatewayServer(paths: AppPaths): Promise<GatewayServiceStatus> {
  const state = cachedState ?? (await loadState(paths))

  if (!gatewayServer) {
    return createGatewayStatus(state)
  }

  await new Promise<void>((resolve, reject) => {
    gatewayServer?.close((error) => {
      if (error) {
        reject(error)
        return
      }

      resolve()
    })
  })

  gatewayServer = null
  gatewayStartedAt = undefined
  return createGatewayStatus(state)
}

function createWindow() {
  const window = new BrowserWindow({
    width: 1560,
    height: 980,
    minWidth: 1180,
    minHeight: 780,
    title: BRAND_NAME,
    titleBarStyle: 'hiddenInset',
    backgroundColor: '#090b11',
    webPreferences: {
      preload: path.join(__dirname, 'preload.mjs'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  })

  if (process.env.VITE_DEV_SERVER_URL) {
    void window.loadURL(process.env.VITE_DEV_SERVER_URL)
  } else {
    void window.loadFile(path.join(process.cwd(), 'dist', 'index.html'))
  }
}

function registerIpcHandlers(paths: AppPaths) {
  ipcMain.handle('aeroclaw:bootstrap', async (): Promise<BootstrapPayload> => ({
    now: new Date().toISOString(),
    state: await loadState(paths),
  }))

  ipcMain.handle('aeroclaw:save-state', async (_event, state: AppState) => {
    await persistState(paths, state)
  })

  ipcMain.handle('aeroclaw:pick-files', async (): Promise<ImportedAttachment[]> => {
    const result = await dialog.showOpenDialog({
      title: '导入文件给 AeroClaw 分析',
      properties: ['multiSelections', 'openFile'],
    })

    if (result.canceled) {
      return []
    }

    return Promise.all(result.filePaths.map((filePath) => importAttachment(filePath)))
  })

  ipcMain.handle('aeroclaw:send-chat', async (_event, request: ChatRequest): Promise<ChatResult> =>
    runChatCompletion(request),
  )

  ipcMain.handle('aeroclaw:test-provider', async (_event, provider: ModelProvider) =>
    testProviderConnection(provider),
  )

  ipcMain.handle('aeroclaw:probe-gateway', async (_event, settings: GatewaySettings) =>
    probeGatewayConnection(settings),
  )

  ipcMain.handle('aeroclaw:sync-gateway', async (_event, settings: GatewaySettings) =>
    syncGatewayCatalog(settings),
  )

  ipcMain.handle('aeroclaw:create-starter-assets', async (): Promise<StarterAssetsResult> =>
    ensureStarterAssets(paths),
  )

  ipcMain.handle('aeroclaw:get-gateway-status', async (): Promise<GatewayServiceStatus> => {
    const state = cachedState ?? (await loadState(paths))
    return createGatewayStatus(state)
  })

  ipcMain.handle('aeroclaw:start-gateway', async (): Promise<GatewayServiceStatus> => startGatewayServer(paths))

  ipcMain.handle('aeroclaw:stop-gateway', async (): Promise<GatewayServiceStatus> => stopGatewayServer(paths))

  ipcMain.handle('aeroclaw:reveal-in-finder', async (_event, targetPath: string) => {
    await shell.openPath(targetPath)
  })
}

app.whenReady().then(async () => {
  app.setName(BRAND_NAME)
  const paths = getAppPaths()
  await ensureAppPaths(paths)
  await ensureStarterAssets(paths)
  registerIpcHandlers(paths)
  createWindow()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow()
    }
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    if (gatewayServer) {
      void stopGatewayServer(getAppPaths())
    }
    app.quit()
  }
})
