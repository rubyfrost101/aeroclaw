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
import { getMainCopy, normalizeLocale } from '../src/shared/i18n'
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

function currentLocale() {
  return normalizeLocale(cachedState?.locale)
}

function currentMainCopy() {
  return getMainCopy(currentLocale())
}

function builtinPluginsForLocale(locale = currentLocale()) {
  return getMainCopy(locale).builtinPlugins.map((plugin) => ({
    ...plugin,
    enabled: true,
    source: 'builtin' as const,
  }))
}

function builtinSkillsForLocale(locale = currentLocale()) {
  return getMainCopy(locale).builtinSkills.map((skill) => ({
    ...skill,
    source: 'bundled' as const,
  }))
}

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

function trimPreview(content: string, locale = currentLocale()) {
  const copy = getMainCopy(locale)
  const normalized = content.replaceAll('\0', '').trim()
  if (!normalized) {
    return copy.emptyAttachmentPreview
  }

  if (normalized.length <= TEXT_PREVIEW_LIMIT) {
    return normalized
  }

  return `${normalized.slice(0, TEXT_PREVIEW_LIMIT)}\n\n${copy.truncatedPreview(TEXT_PREVIEW_LIMIT)}`
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

async function readAttachmentPreview(filePath: string, locale = currentLocale()) {
  const copy = getMainCopy(locale)
  const kind = inferAttachmentKind(filePath)
  const extension = extensionOf(filePath)

  if (kind === 'text') {
    return trimPreview(await fs.readFile(filePath, 'utf8'), locale)
  }

  if (kind === 'pdf') {
    const parser = new PDFParse({ data: await fs.readFile(filePath) })
    const result = await parser.getText()
    await parser.destroy()
    return trimPreview(result.text, locale)
  }

  if (kind === 'docx') {
    const result = await mammoth.extractRawText({ path: filePath })
    return trimPreview(result.value, locale)
  }

  if (kind === 'spreadsheet') {
    const workbook = XLSX.readFile(filePath)
    const firstSheet = workbook.SheetNames[0]
    const sheet = workbook.Sheets[firstSheet]
    const preview = XLSX.utils.sheet_to_csv(sheet)
    return trimPreview(`Sheet: ${firstSheet}\n\n${preview}`, locale)
  }

  if (kind === 'image') {
    return copy.imagePreview
  }

  return copy.unsupportedFilePreview(extension || '')
}

async function importAttachment(filePath: string, locale = currentLocale()): Promise<ImportedAttachment> {
  const stats = await fs.stat(filePath)

  return {
    id: crypto.randomUUID(),
    name: path.basename(filePath),
    path: filePath,
    size: stats.size,
    extension: extensionOf(filePath),
    kind: inferAttachmentKind(filePath),
    preview: await readAttachmentPreview(filePath, locale),
  }
}

async function readLocalSkills(skillsDir: string, locale = currentLocale()) {
  const copy = getMainCopy(locale)
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
            description: copy.localSkillDescription(skillFile),
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

async function readLocalPlugins(pluginsDir: string, locale = currentLocale()) {
  const copy = getMainCopy(locale)
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
        description: manifest.description ?? copy.localPluginDescription,
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

async function ensureStarterAssets(paths: AppPaths, locale = currentLocale()): Promise<StarterAssetsResult> {
  const copy = getMainCopy(locale)
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
      copy.starterSkillContent,
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
          name: copy.starterPluginManifest.name,
          description: copy.starterPluginManifest.description,
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
      copy.starterPluginReadme,
      'utf8',
    )
    created.push(starterPluginManifest, starterPluginReadme)
  }

  return { created, skipped }
}

function createDefaultState(paths: AppPaths, skills: SkillItem[], plugins: PluginItem[], locale = currentLocale()): AppState {
  const copy = getMainCopy(locale)
  const now = new Date().toISOString()
  const starterProviderId = crypto.randomUUID()
  const starterConversationId = crypto.randomUUID()

  return {
    brandName: BRAND_NAME,
    projectSlug: PROJECT_SLUG,
    locale,
    activeSection: 'chat',
    activeConversationId: starterConversationId,
    activeProviderId: starterProviderId,
    providers: [
      {
        id: starterProviderId,
        label: copy.defaultProviderLabel,
        model: 'gpt-4o-mini',
        baseUrl: 'https://api.example.com/v1',
        apiKey: '',
        tokenSourceName: copy.defaultTokenSourceName,
        notes: copy.defaultProviderNotes,
        category: 'custom',
        enabled: true,
      },
    ],
    conversations: [
      {
        id: starterConversationId,
        title: copy.welcomeTitle,
        summary: copy.welcomeSummary,
        createdAt: now,
        updatedAt: now,
        gatewaySessionKey: 'main',
        messages: [
          {
            id: crypto.randomUUID(),
            role: 'assistant',
            content: copy.welcomeMessage,
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
      ...(previous?.source === 'builtin' && plugin.source === 'builtin' ? previous : plugin),
      enabled: plugin.enabled ?? previous?.enabled ?? true,
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

function migrateLegacyDefaultContent(state: AppState): AppState {
  const englishCopy = getMainCopy('en')

  return {
    ...state,
    providers: state.providers.map((provider) => ({
      ...provider,
      label: provider.label === '自定义 OpenAI-Compatible' ? englishCopy.defaultProviderLabel : provider.label,
      tokenSourceName:
        provider.tokenSourceName === '自定义 token 源' ? englishCopy.defaultTokenSourceName : provider.tokenSourceName,
      notes: provider.notes === '安装后只需要换成你自己的 API URL、API Key 和模型名即可使用。'
        ? englishCopy.defaultProviderNotes
        : provider.notes,
    })),
    conversations: state.conversations.map((conversation) => ({
      ...conversation,
      title: conversation.title === '欢迎使用 AeroClaw' ? englishCopy.welcomeTitle : conversation.title,
      summary:
        conversation.summary === '独立目录、独立网关、安装后配 token 即可用'
          ? englishCopy.welcomeSummary
          : conversation.summary,
      messages: conversation.messages.map((message) => ({
        ...message,
        content:
          message.content ===
          '这是你的独立 `AeroClaw` 工作台。它和 `openclaw` 使用不同的配置目录、插件目录和技能目录，所以可以同时安装、同时运行。\n\n' +
            '你现在可以先在右上角配置一个自定义 token 源，然后直接聊天；也可以先导入文件，让我根据文档内容再帮你分析。'
            ? englishCopy.welcomeMessage
            : message.content ===
                  '新会话已经创建好了。你可以直接提问，也可以先导入一个文件，让我先读材料再帮你分析。'
              ? 'Your new conversation is ready. Ask a question directly, or import a file first so I can read the material before helping.'
              : message.content,
      })),
    })),
  }
}

function normalizeState(state: AppState): AppState {
  const locale = normalizeLocale((state as Partial<AppState>).locale)
  const fallback = createDefaultState(getAppPaths(), [], [], locale)
  const maybeMigrated = (state as Partial<AppState>).locale ? state : migrateLegacyDefaultContent({ ...state, locale })
  const providers = maybeMigrated.providers.length > 0 ? maybeMigrated.providers : fallback.providers
  const activeProviderId =
    providers.find((provider) => provider.id === maybeMigrated.activeProviderId)?.id ?? providers[0].id
  const conversations = maybeMigrated.conversations.length > 0 ? maybeMigrated.conversations : fallback.conversations
  const activeConversationId =
    conversations.find((conversation) => conversation.id === maybeMigrated.activeConversationId)?.id ??
    conversations[0].id

  return {
    ...maybeMigrated,
    locale,
    activeProviderId,
    activeConversationId,
    providers,
    conversations,
  }
}

async function loadState(paths: AppPaths) {
  const [storedState, storedConfig] = await Promise.all([
    readJsonFile<AppState>(paths.stateFile),
    readJsonFile<Pick<AppState, 'providers' | 'activeProviderId' | 'gateway'>>(paths.configFile),
  ])
  const locale = normalizeLocale(storedState?.locale)
  const [localSkills, localPlugins] = await Promise.all([
    readLocalSkills(paths.skillsDir, locale),
    readLocalPlugins(paths.pluginsDir, locale),
  ])
  const defaultState = createDefaultState(
    paths,
    mergeSkills(builtinSkillsForLocale(locale), localSkills),
    mergePlugins(builtinPluginsForLocale(locale), localPlugins),
    locale,
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

  const copy = currentMainCopy()
  return attachments
    .map((attachment) => copy.attachmentBlock(attachment.name, attachment.path, attachment.kind, attachment.preview))
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
  const copy = currentMainCopy()
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
    throw new Error(copy.missingApiUrl)
  }

  if (!request.provider.model.trim()) {
    throw new Error(copy.missingModel)
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
          content: copy.assistantSystemInstruction,
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
    throw new Error(copy.requestFailed(response.status, errorText))
  }

  const payload = (await response.json()) as unknown
  const content = extractAssistantContent(payload)
  if (!content) {
    throw new Error(copy.unreadableModelResponse)
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
  const copy = currentMainCopy()
  const checkedAt = new Date().toISOString()

  if (!provider.baseUrl.trim()) {
    return { ok: false, message: copy.providerTestMissingApiUrl, checkedAt }
  }

  if (!provider.model.trim()) {
    return { ok: false, message: copy.providerTestMissingModel, checkedAt }
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
              ? copy.providerConnectedWithModel(provider.model)
              : copy.providerConnectedWithoutModel(modelCount, provider.model)
            : copy.providerConnected,
      }
    }

    if (![404, 405].includes(modelsResponse.status)) {
      const errorText = await modelsResponse.text()
      return {
        ok: false,
        checkedAt,
        message: copy.providerModelsFailed(modelsResponse.status, errorText),
      }
    }
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : copy.providerServiceUnavailable
    return { ok: false, checkedAt, message: copy.providerTestFailed(message) }
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
        message: copy.providerChatProbeFailed(probeResponse.status, errorText),
      }
    }

    return {
      ok: true,
      checkedAt,
      message: copy.providerChatProbeSuccess(provider.model),
    }
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'chat/completions probe failed'
    return { ok: false, checkedAt, message: copy.providerChatProbeFallbackFailed(message) }
  }
}

async function probeGatewayConnection(settings: GatewaySettings): Promise<GatewayProbeResult> {
  if (settings.transport === 'openclaw-compatible') {
    return await probeOpenClawGateway(settings)
  }

  const copy = currentMainCopy()
  const checkedAt = new Date().toISOString()
  const host = parseGatewayHost(settings.endpoint)

  return {
    ok: true,
    checkedAt,
    gatewayUrl: `http://${host}:${settings.port}`,
    authMode: 'none',
    message: copy.localGatewayModeMessage,
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
    const copy = currentMainCopy()
    const result = await dialog.showOpenDialog({
      title: copy.filePickerTitle,
      properties: ['multiSelections', 'openFile'],
    })

    if (result.canceled) {
      return []
    }

    return Promise.all(result.filePaths.map((filePath) => importAttachment(filePath, currentLocale())))
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
