export type MainSection = 'chat' | 'models' | 'plugins' | 'skills' | 'tasks' | 'settings'
export type MessageRole = 'assistant' | 'system' | 'user'
export type ProviderCategory = 'custom' | 'preset'
export type AttachmentKind = 'docx' | 'image' | 'pdf' | 'spreadsheet' | 'text' | 'unknown'

export interface ImportedAttachment {
  id: string
  name: string
  path: string
  size: number
  extension: string
  kind: AttachmentKind
  preview: string
}

export interface ConversationMessage {
  id: string
  role: MessageRole
  content: string
  createdAt: string
  attachments: ImportedAttachment[]
}

export interface ConversationThread {
  id: string
  title: string
  summary: string
  createdAt: string
  updatedAt: string
  gatewaySessionKey?: string
  messages: ConversationMessage[]
}

export interface ModelProvider {
  id: string
  label: string
  model: string
  baseUrl: string
  apiKey: string
  tokenSourceName: string
  notes: string
  category: ProviderCategory
  enabled: boolean
}

export interface PluginItem {
  id: string
  name: string
  description: string
  enabled: boolean
  source: 'builtin' | 'local'
  entryPath?: string
}

export interface SkillItem {
  id: string
  name: string
  description: string
  source: 'bundled' | 'local'
  path?: string
}

export interface GatewaySettings {
  transport: 'openai-compatible' | 'openclaw-compatible'
  endpoint: string
  port: number
  canvasPath: string
  authToken: string
  password: string
  sessionKey: string
  configDir: string
  configFile: string
  supportDir: string
  workspaceDir: string
  skillsDir: string
  pluginsDir: string
}

export interface AppState {
  brandName: string
  projectSlug: string
  activeSection: MainSection
  activeConversationId: string
  activeProviderId: string
  providers: ModelProvider[]
  conversations: ConversationThread[]
  plugins: PluginItem[]
  skills: SkillItem[]
  gateway: GatewaySettings
}

export interface BootstrapPayload {
  now: string
  state: AppState
}

export interface ChatRequest {
  provider: ModelProvider
  history: ConversationMessage[]
  prompt: string
  attachments: ImportedAttachment[]
  sessionKey?: string
}

export interface ChatResult {
  content: string
  usage?: string
}

export interface ProviderTestResult {
  ok: boolean
  message: string
  checkedAt: string
}

export interface StarterAssetsResult {
  created: string[]
  skipped: string[]
}

export interface GatewayServiceStatus {
  running: boolean
  url: string
  host: string
  port: number
  startedAt?: string
  lastError?: string
}

export interface GatewayProbeResult {
  ok: boolean
  checkedAt: string
  message: string
  gatewayUrl?: string
  authMode?: 'token' | 'password' | 'device-token' | 'none'
}

export interface OpenClawGatewaySession {
  key: string
  title: string
  updatedAt?: string
  model?: string
}

export interface OpenClawGatewaySkill {
  id: string
  name: string
  description: string
  eligible: boolean
  source: 'bundled' | 'workspace' | 'managed' | 'unknown'
}

export interface OpenClawGatewayTool {
  id: string
  label: string
  description: string
  group: string
  source: 'core' | 'plugin'
  pluginId?: string
}

export interface OpenClawGatewaySnapshot {
  checkedAt: string
  gatewayUrl: string
  authMode: 'token' | 'password' | 'device-token' | 'none'
  configPath?: string
  models: string[]
  sessions: OpenClawGatewaySession[]
  skills: OpenClawGatewaySkill[]
  tools: OpenClawGatewayTool[]
}

export interface DesktopApi {
  bootstrap: () => Promise<BootstrapPayload>
  pickFiles: () => Promise<ImportedAttachment[]>
  revealInFinder: (targetPath: string) => Promise<void>
  saveState: (state: AppState) => Promise<void>
  sendChat: (request: ChatRequest) => Promise<ChatResult>
  testProvider: (provider: ModelProvider) => Promise<ProviderTestResult>
  probeGateway: (settings: GatewaySettings) => Promise<GatewayProbeResult>
  syncGateway: (settings: GatewaySettings) => Promise<OpenClawGatewaySnapshot>
  createStarterAssets: () => Promise<StarterAssetsResult>
  getGatewayStatus: () => Promise<GatewayServiceStatus>
  startGateway: () => Promise<GatewayServiceStatus>
  stopGateway: () => Promise<GatewayServiceStatus>
}
