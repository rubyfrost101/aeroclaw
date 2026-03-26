import crypto from 'node:crypto'
import { promises as fs } from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { WebSocket, type RawData } from 'ws'
import type {
  ChatResult,
  GatewayProbeResult,
  GatewaySettings,
  ImportedAttachment,
  OpenClawGatewaySession,
  OpenClawGatewaySkill,
  OpenClawGatewaySnapshot,
  OpenClawGatewayTool,
} from '../src/shared/schema'

const OPENCLAW_PROTOCOL_VERSION = 3
const OPENCLAW_SCOPES = ['operator.read', 'operator.write']
const CLIENT_ID = 'openclaw-macos'
const CLIENT_MODE = 'ui'
const CLIENT_VERSION = '0.1.0'
const CONNECT_TIMEOUT_MS = 12000
const REQUEST_TIMEOUT_MS = 30000

type DeviceIdentity = {
  deviceId: string
  publicKeyPem: string
  privateKeyPem: string
}

type StoredDeviceTokens = Record<string, { token: string; updatedAt: string }>

type RpcFrame =
  | { type: 'event'; event: string; payload?: unknown }
  | { type: 'res'; id: string; ok: boolean; payload?: unknown; error?: { message?: string; code?: string } }

type PendingRequest = {
  resolve: (value: unknown) => void
  reject: (error: Error) => void
  timer: NodeJS.Timeout
}

function base64UrlEncode(buffer: Buffer) {
  return buffer.toString('base64').replaceAll('+', '-').replaceAll('/', '_').replace(/=+$/g, '')
}

const ED25519_SPKI_PREFIX = Buffer.from('302a300506032b6570032100', 'hex')

function publicKeyRawFromPem(publicKeyPem: string) {
  const key = crypto.createPublicKey(publicKeyPem)
  const spki = key.export({ type: 'spki', format: 'der' }) as Buffer
  if (
    spki.length === ED25519_SPKI_PREFIX.length + 32 &&
    spki.subarray(0, ED25519_SPKI_PREFIX.length).equals(ED25519_SPKI_PREFIX)
  ) {
    return spki.subarray(ED25519_SPKI_PREFIX.length)
  }

  return spki
}

function fingerprintPublicKey(publicKeyPem: string) {
  return crypto.createHash('sha256').update(publicKeyRawFromPem(publicKeyPem)).digest('hex')
}

function buildDeviceAuthPayloadV3(params: {
  deviceId: string
  clientId: string
  clientMode: string
  role: string
  scopes: string[]
  signedAtMs: number
  token?: string | null
  nonce: string
  platform?: string | null
  deviceFamily?: string | null
}) {
  return [
    'v3',
    params.deviceId,
    params.clientId,
    params.clientMode,
    params.role,
    params.scopes.join(','),
    String(params.signedAtMs),
    params.token ?? '',
    params.nonce,
    (params.platform ?? '').trim().toLowerCase(),
    (params.deviceFamily ?? '').trim().toLowerCase(),
  ].join('|')
}

async function ensureParentDir(filePath: string) {
  await fs.mkdir(path.dirname(filePath), { recursive: true })
}

async function loadOrCreateDeviceIdentity(configDir: string): Promise<DeviceIdentity> {
  const identityPath = path.join(configDir, 'identity', 'device.json')

  try {
    const raw = await fs.readFile(identityPath, 'utf8')
    const parsed = JSON.parse(raw) as {
      deviceId?: string
      publicKeyPem?: string
      privateKeyPem?: string
    }

    if (
      typeof parsed.deviceId === 'string' &&
      typeof parsed.publicKeyPem === 'string' &&
      typeof parsed.privateKeyPem === 'string'
    ) {
      return {
        deviceId: parsed.deviceId,
        publicKeyPem: parsed.publicKeyPem,
        privateKeyPem: parsed.privateKeyPem,
      }
    }
  } catch {
    // regenerate below
  }

  const { publicKey, privateKey } = crypto.generateKeyPairSync('ed25519')
  const publicKeyPem = publicKey.export({ type: 'spki', format: 'pem' }).toString()
  const privateKeyPem = privateKey.export({ type: 'pkcs8', format: 'pem' }).toString()
  const identity: DeviceIdentity = {
    deviceId: fingerprintPublicKey(publicKeyPem),
    publicKeyPem,
    privateKeyPem,
  }

  await ensureParentDir(identityPath)
  await fs.writeFile(identityPath, `${JSON.stringify(identity, null, 2)}\n`, { mode: 0o600 })
  return identity
}

function signDevicePayload(privateKeyPem: string, payload: string) {
  const key = crypto.createPrivateKey(privateKeyPem)
  const signature = crypto.sign(null, Buffer.from(payload, 'utf8'), key)
  return base64UrlEncode(signature)
}

function publicKeyRawBase64UrlFromPem(publicKeyPem: string) {
  return base64UrlEncode(publicKeyRawFromPem(publicKeyPem))
}

function authStorePath(configDir: string) {
  return path.join(configDir, 'openclaw-device-tokens.json')
}

async function readStoredDeviceTokens(configDir: string): Promise<StoredDeviceTokens> {
  try {
    const raw = await fs.readFile(authStorePath(configDir), 'utf8')
    return JSON.parse(raw) as StoredDeviceTokens
  } catch {
    return {}
  }
}

async function storeDeviceToken(configDir: string, gatewayUrl: string, token: string) {
  const next = await readStoredDeviceTokens(configDir)
  next[gatewayUrl] = {
    token,
    updatedAt: new Date().toISOString(),
  }
  await ensureParentDir(authStorePath(configDir))
  await fs.writeFile(authStorePath(configDir), JSON.stringify(next, null, 2), 'utf8')
}

function resolveGatewayUrl(settings: GatewaySettings) {
  const raw = settings.endpoint.trim()

  if (!raw) {
    throw new Error('缺少网关地址。')
  }

  const normalizedInput =
    raw.startsWith('ws://') || raw.startsWith('wss://') || raw.startsWith('http://') || raw.startsWith('https://')
      ? raw
      : `http://${raw}`

  const url = new URL(normalizedInput)
  const protocol = url.protocol === 'https:' ? 'wss:' : url.protocol === 'http:' ? 'ws:' : url.protocol
  const port = url.port || String(settings.port)
  const pathname = url.pathname === '/' ? '' : url.pathname.replace(/\/$/, '')

  return `${protocol}//${url.hostname}${port ? `:${port}` : ''}${pathname}`
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

function safeString(value: unknown) {
  return typeof value === 'string' ? value.trim() : ''
}

function extractTextFromContent(content: unknown): string {
  if (typeof content === 'string') {
    return content.trim()
  }

  if (!Array.isArray(content)) {
    return ''
  }

  return content
    .map((block) => {
      if (!block || typeof block !== 'object') {
        return ''
      }

      const typedBlock = block as { type?: unknown; text?: unknown; thinking?: unknown }
      if (typedBlock.type === 'text' && typeof typedBlock.text === 'string') {
        return typedBlock.text
      }

      if (typeof typedBlock.text === 'string') {
        return typedBlock.text
      }

      if (typeof typedBlock.thinking === 'string') {
        return typedBlock.thinking
      }

      return ''
    })
    .filter(Boolean)
    .join('\n')
    .trim()
}

function extractLatestAssistantText(historyPayload: unknown) {
  if (!historyPayload || typeof historyPayload !== 'object') {
    return ''
  }

  const messages = Array.isArray((historyPayload as { messages?: unknown[] }).messages)
    ? (historyPayload as { messages: unknown[] }).messages
    : []

  for (let index = messages.length - 1; index >= 0; index -= 1) {
    const message = messages[index]
    if (!message || typeof message !== 'object') {
      continue
    }

    const typedMessage = message as {
      role?: unknown
      content?: unknown
      text?: unknown
      message?: { content?: unknown }
    }

    if (typedMessage.role !== 'assistant') {
      continue
    }

    const content =
      extractTextFromContent(typedMessage.content) ||
      extractTextFromContent(typedMessage.message?.content) ||
      safeString(typedMessage.text)

    if (content) {
      return content
    }
  }

  return ''
}

function inferSkillSource(skill: Record<string, unknown>): OpenClawGatewaySkill['source'] {
  const source = safeString(skill.source).toLowerCase()
  if (source === 'bundled' || source === 'workspace' || source === 'managed') {
    return source
  }

  if (skill.workspace === true) {
    return 'workspace'
  }

  if (skill.bundled === true) {
    return 'bundled'
  }

  return 'unknown'
}

function normalizeGatewaySkills(payload: unknown): OpenClawGatewaySkill[] {
  const skills = Array.isArray((payload as { skills?: unknown[] } | null)?.skills)
    ? ((payload as { skills: unknown[] }).skills)
    : []

  return skills
    .map((skill): OpenClawGatewaySkill | null => {
      if (!skill || typeof skill !== 'object') {
        return null
      }

      const typedSkill = skill as Record<string, unknown>
      const name = safeString(typedSkill.name)
      if (!name) {
        return null
      }

      return {
        id: name,
        name,
        description:
          safeString(typedSkill.description) ||
          safeString(typedSkill.summary) ||
          '来自 OpenClaw Gateway 的技能。',
        eligible: typedSkill.eligible !== false,
        source: inferSkillSource(typedSkill),
      }
    })
    .filter((skill): skill is OpenClawGatewaySkill => skill !== null)
}

function normalizeGatewayTools(payload: unknown): OpenClawGatewayTool[] {
  const groups = Array.isArray((payload as { groups?: unknown[] } | null)?.groups)
    ? ((payload as { groups: unknown[] }).groups)
    : []

  return groups.flatMap((group) => {
    if (!group || typeof group !== 'object') {
      return []
    }

    const typedGroup = group as { id?: unknown; label?: unknown; tools?: unknown[] }
    const groupLabel = safeString(typedGroup.label) || safeString(typedGroup.id) || 'Tools'
    const tools = Array.isArray(typedGroup.tools) ? typedGroup.tools : []

    return tools
      .map((tool): OpenClawGatewayTool | null => {
        if (!tool || typeof tool !== 'object') {
          return null
        }

        const typedTool = tool as Record<string, unknown>
        const id = safeString(typedTool.id)
        if (!id) {
          return null
        }

        return {
          id,
          label: safeString(typedTool.label) || id,
          description: safeString(typedTool.description) || 'OpenClaw Gateway tool',
          group: groupLabel,
          source: typedTool.source === 'plugin' ? 'plugin' : 'core',
          pluginId: safeString(typedTool.pluginId) || undefined,
        }
      })
      .filter((tool): tool is OpenClawGatewayTool => tool !== null)
  })
}

function normalizeGatewaySessions(payload: unknown): OpenClawGatewaySession[] {
  const sessions = Array.isArray((payload as { sessions?: unknown[] } | null)?.sessions)
    ? ((payload as { sessions: unknown[] }).sessions)
    : []

  return sessions
    .map((session): OpenClawGatewaySession | null => {
      if (!session || typeof session !== 'object') {
        return null
      }

      const typedSession = session as Record<string, unknown>
      const key = safeString(typedSession.key)
      if (!key) {
        return null
      }

      const updatedAtValue = typedSession.updatedAt
      const updatedAt =
        typeof updatedAtValue === 'number' && Number.isFinite(updatedAtValue)
          ? new Date(updatedAtValue * 1000).toISOString()
          : undefined

      return {
        key,
        title:
          safeString(typedSession.displayName) ||
          safeString(typedSession.subject) ||
          safeString(typedSession.room) ||
          key,
        updatedAt,
        model:
          safeString(typedSession.modelProvider) && safeString(typedSession.model)
            ? `${safeString(typedSession.modelProvider)}/${safeString(typedSession.model)}`
            : safeString(typedSession.model) || undefined,
      }
    })
    .filter((session): session is OpenClawGatewaySession => session !== null)
}

function normalizeGatewayModels(payload: unknown): string[] {
  const models = Array.isArray((payload as { models?: unknown[] } | null)?.models)
    ? ((payload as { models: unknown[] }).models)
    : []

  return models
    .map((model) => {
      if (!model || typeof model !== 'object') {
        return ''
      }

      const typedModel = model as Record<string, unknown>
      const provider = safeString(typedModel.provider)
      const modelId = safeString(typedModel.modelID) || safeString(typedModel.modelId) || safeString(typedModel.id)

      if (!modelId) {
        return ''
      }

      return provider && !modelId.startsWith(`${provider}/`) ? `${provider}/${modelId}` : modelId
    })
    .filter(Boolean)
}

class OpenClawRpcClient {
  private readonly wsUrl: string
  private readonly settings: GatewaySettings
  private readonly identity: DeviceIdentity
  private readonly storedDeviceToken?: string
  private readonly pending = new Map<string, PendingRequest>()
  private ws: WebSocket | null = null
  private connectRequestId: string | null = null
  private authMode: GatewayProbeResult['authMode'] = 'none'

  constructor(params: {
    wsUrl: string
    settings: GatewaySettings
    identity: DeviceIdentity
    storedDeviceToken?: string
  }) {
    this.wsUrl = params.wsUrl
    this.settings = params.settings
    this.identity = params.identity
    this.storedDeviceToken = params.storedDeviceToken
  }

  get resolvedAuthMode() {
    return this.authMode
  }

  async connect() {
    await new Promise<void>((resolve, reject) => {
      const ws = new WebSocket(this.wsUrl)
      this.ws = ws

      const connectTimer = setTimeout(() => {
        reject(new Error('等待 OpenClaw Gateway 握手超时。'))
        ws.terminate()
      }, CONNECT_TIMEOUT_MS)

      const failAll = (error: Error) => {
        clearTimeout(connectTimer)
        this.rejectPending(error)
        reject(error)
      }

      ws.on('error', (error: Error) => {
        failAll(error instanceof Error ? error : new Error('OpenClaw Gateway 连接失败'))
      })

      ws.on('close', (code: number, reason: Buffer) => {
        const message = reason.toString() || `连接已关闭 (${code})`
        this.rejectPending(new Error(message))
      })

      ws.on('message', (data: RawData) => {
        try {
          const text = typeof data === 'string' ? data : data.toString()
          const frame = JSON.parse(text) as RpcFrame

          if (frame.type === 'event' && frame.event === 'connect.challenge') {
            const nonce = safeString((frame.payload as { nonce?: unknown } | undefined)?.nonce)
            if (!nonce) {
              throw new Error('OpenClaw Gateway 没有返回有效 challenge nonce。')
            }

            this.sendConnect(nonce)
            return
          }

          if (frame.type === 'res' && frame.id === this.connectRequestId) {
            clearTimeout(connectTimer)
            if (!frame.ok) {
              reject(new Error(frame.error?.message || 'OpenClaw Gateway 握手失败。'))
              return
            }

            const deviceToken = safeString(
              (frame.payload as { auth?: { deviceToken?: unknown } } | undefined)?.auth?.deviceToken,
            )
            if (deviceToken) {
              void storeDeviceToken(this.settings.configDir, this.wsUrl, deviceToken)
            }

            resolve()
            return
          }

          if (frame.type === 'res') {
            const pending = this.pending.get(frame.id)
            if (!pending) {
              return
            }

            clearTimeout(pending.timer)
            this.pending.delete(frame.id)

            if (!frame.ok) {
              pending.reject(new Error(frame.error?.message || `${frame.id} 请求失败`))
              return
            }

            pending.resolve(frame.payload)
          }
        } catch (error: unknown) {
          failAll(error instanceof Error ? error : new Error('解析 OpenClaw Gateway 数据失败'))
        }
      })
    })
  }

  private sendConnect(nonce: string) {
    const ws = this.requireSocket()
    this.connectRequestId = crypto.randomUUID()

    const token = safeString(this.settings.authToken)
    const password = safeString(this.settings.password)
    const deviceToken = token || password ? '' : safeString(this.storedDeviceToken)

    this.authMode = token ? 'token' : password ? 'password' : deviceToken ? 'device-token' : 'none'

    const signedAtMs = Date.now()
    const signaturePayload = buildDeviceAuthPayloadV3({
      deviceId: this.identity.deviceId,
      clientId: CLIENT_ID,
      clientMode: CLIENT_MODE,
      role: 'operator',
      scopes: OPENCLAW_SCOPES,
      signedAtMs,
      token: token || deviceToken || null,
      nonce,
      platform: process.platform,
      deviceFamily: 'desktop',
    })

    const payload = {
      type: 'req',
      id: this.connectRequestId,
      method: 'connect',
      params: {
        minProtocol: OPENCLAW_PROTOCOL_VERSION,
        maxProtocol: OPENCLAW_PROTOCOL_VERSION,
        client: {
          id: CLIENT_ID,
          version: CLIENT_VERSION,
          platform: process.platform,
          deviceFamily: 'desktop',
          mode: CLIENT_MODE,
          displayName: `AeroClaw on ${os.hostname()}`,
        },
        role: 'operator',
        scopes: OPENCLAW_SCOPES,
        caps: [],
        commands: [],
        permissions: {},
        auth: {
          ...(token ? { token } : {}),
          ...(password ? { password } : {}),
          ...(!token && !password && deviceToken ? { deviceToken } : {}),
        },
        locale: 'zh-CN',
        userAgent: `AeroClaw/${CLIENT_VERSION}`,
        device: {
          id: this.identity.deviceId,
          publicKey: publicKeyRawBase64UrlFromPem(this.identity.publicKeyPem),
          signature: signDevicePayload(this.identity.privateKeyPem, signaturePayload),
          signedAt: signedAtMs,
          nonce,
        },
      },
    }

    ws.send(JSON.stringify(payload))
  }

  async request(method: string, params: unknown, timeoutMs = REQUEST_TIMEOUT_MS) {
    const ws = this.requireSocket()
    const id = crypto.randomUUID()

    return await new Promise<unknown>((resolve, reject) => {
      const timer = setTimeout(() => {
        this.pending.delete(id)
        reject(new Error(`${method} 请求超时。`))
      }, timeoutMs)

      this.pending.set(id, { resolve, reject, timer })
      ws.send(JSON.stringify({ type: 'req', id, method, params }))
    })
  }

  async close() {
    const ws = this.ws
    if (!ws) {
      return
    }

    await new Promise<void>((resolve) => {
      const finish = () => resolve()
      ws.once('close', finish)
      ws.close()
      setTimeout(finish, 500)
    })

    this.ws = null
  }

  private requireSocket() {
    if (!this.ws) {
      throw new Error('OpenClaw Gateway 尚未连接。')
    }

    return this.ws
  }

  private rejectPending(error: Error) {
    for (const pending of this.pending.values()) {
      clearTimeout(pending.timer)
      pending.reject(error)
    }
    this.pending.clear()
  }
}

async function withGatewayClient<T>(
  settings: GatewaySettings,
  action: (client: OpenClawRpcClient, wsUrl: string) => Promise<T>,
) {
  const wsUrl = resolveGatewayUrl(settings)
  const identity = await loadOrCreateDeviceIdentity(settings.configDir)
  const storedTokens = await readStoredDeviceTokens(settings.configDir)
  const client = new OpenClawRpcClient({
    wsUrl,
    settings,
    identity,
    storedDeviceToken: storedTokens[wsUrl]?.token,
  })

  try {
    await client.connect()
    return await action(client, wsUrl)
  } finally {
    await client.close()
  }
}

export async function probeOpenClawGateway(settings: GatewaySettings): Promise<GatewayProbeResult> {
  const checkedAt = new Date().toISOString()

  try {
    return await withGatewayClient(settings, async (client, wsUrl) => {
      await client.request('health', {})
      return {
        ok: true,
        checkedAt,
        message: '连接成功，已完成 OpenClaw Gateway 握手与 health 探测。',
        gatewayUrl: wsUrl,
        authMode: client.resolvedAuthMode,
      }
    })
  } catch (error: unknown) {
    return {
      ok: false,
      checkedAt,
      message: error instanceof Error ? error.message : 'OpenClaw Gateway 探测失败',
    }
  }
}

export async function syncOpenClawGateway(settings: GatewaySettings): Promise<OpenClawGatewaySnapshot> {
  return await withGatewayClient(settings, async (client, wsUrl) => {
    const [modelsPayload, sessionsPayload, skillsPayload, toolsPayload, configPayload] = await Promise.all([
      client.request('models.list', {}),
      client.request('sessions.list', { includeGlobal: true, includeUnknown: false, limit: 50 }),
      client.request('skills.status', {}),
      client.request('tools.catalog', {}),
      client.request('config.get', {}),
    ])

    const configPath = safeString((configPayload as { path?: unknown } | undefined)?.path)

    return {
      checkedAt: new Date().toISOString(),
      gatewayUrl: wsUrl,
      authMode: client.resolvedAuthMode ?? 'none',
      configPath: configPath || undefined,
      models: normalizeGatewayModels(modelsPayload),
      sessions: normalizeGatewaySessions(sessionsPayload),
      skills: normalizeGatewaySkills(skillsPayload),
      tools: normalizeGatewayTools(toolsPayload),
    }
  })
}

export async function sendViaOpenClawGateway(params: {
  settings: GatewaySettings
  prompt: string
  sessionKey: string
  attachments: ImportedAttachment[]
}): Promise<ChatResult> {
  return await withGatewayClient(params.settings, async (client) => {
    const attachmentPrompt = buildAttachmentPrompt(params.attachments)
    const message = attachmentPrompt ? `${params.prompt}\n\n${attachmentPrompt}` : params.prompt
    const runId = crypto.randomUUID()
    const sessionKey = params.sessionKey || params.settings.sessionKey || 'main'

    const sendPayload = (await client.request('chat.send', {
      sessionKey,
      message,
      thinking: 'adaptive',
      timeoutMs: 30000,
      idempotencyKey: runId,
    })) as { runId?: unknown; status?: unknown }

    const startedRunId = safeString(sendPayload.runId) || runId
    await client.request('agent.wait', {
      runId: startedRunId,
      timeoutMs: 120000,
    }, 125000)

    const historyPayload = await client.request('chat.history', {
      sessionKey,
    })

    const content = extractLatestAssistantText(historyPayload)
    if (!content) {
      throw new Error('OpenClaw Gateway 已返回结果，但没有找到可读的 assistant 文本。')
    }

    return { content }
  })
}
