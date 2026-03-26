import { useEffect, useRef, useState } from 'react'
import {
  Blocks,
  Bot,
  BrainCircuit,
  Clock3,
  FolderCog,
  FolderKanban,
  Paperclip,
  Play,
  Plus,
  RefreshCw,
  Save,
  SendHorizonal,
  Settings,
  Sparkles,
  Square,
  PlugZap,
  Wrench,
} from 'lucide-react'
import './App.css'
import { LOCALE_OPTIONS, getUiCopy, normalizeLocale } from './shared/i18n'
import type {
  AppLocale,
  AppState,
  ConversationMessage,
  ConversationThread,
  GatewayProbeResult,
  GatewayServiceStatus,
  GatewaySettings,
  ImportedAttachment,
  MainSection,
  ModelProvider,
  OpenClawGatewaySnapshot,
  PluginItem,
  ProviderTestResult,
} from './shared/schema'

type SettingsDraft = {
  transport: GatewaySettings['transport']
  endpoint: string
  port: string
  canvasPath: string
  authToken: string
  password: string
  sessionKey: string
}

const DEFAULT_LOCALE: AppLocale = 'en'
const DEFAULT_UI_COPY = getUiCopy(DEFAULT_LOCALE)
const DEFAULT_CHAT_TITLES = new Set(LOCALE_OPTIONS.map((option) => getUiCopy(option.value).newConversationTitle))

function App() {
  const [appState, setAppState] = useState<AppState | null>(null)
  const [composerText, setComposerText] = useState('')
  const [queuedAttachments, setQueuedAttachments] = useState<ImportedAttachment[]>([])
  const [providerManagerOpen, setProviderManagerOpen] = useState(false)
  const [editingProvider, setEditingProvider] = useState<ModelProvider | null>(null)
  const [providerDraft, setProviderDraft] = useState<ModelProvider | null>(null)
  const [providerChecks, setProviderChecks] = useState<Record<string, ProviderTestResult>>({})
  const [testingProviderId, setTestingProviderId] = useState<string | null>(null)
  const [testingDraftProvider, setTestingDraftProvider] = useState(false)
  const [gatewayStatus, setGatewayStatus] = useState<GatewayServiceStatus | null>(null)
  const [gatewayProbe, setGatewayProbe] = useState<GatewayProbeResult | null>(null)
  const [gatewaySnapshot, setGatewaySnapshot] = useState<OpenClawGatewaySnapshot | null>(null)
  const [isUpdatingGatewayRuntime, setIsUpdatingGatewayRuntime] = useState(false)
  const [isProbingGateway, setIsProbingGateway] = useState(false)
  const [isSyncingGateway, setIsSyncingGateway] = useState(false)
  const [settingsDraft, setSettingsDraft] = useState<SettingsDraft>({
    transport: 'openai-compatible',
    endpoint: '',
    port: '',
    canvasPath: '',
    authToken: '',
    password: '',
    sessionKey: 'main',
  })
  const [isRefreshingState, setIsRefreshingState] = useState(false)
  const [isCreatingAssets, setIsCreatingAssets] = useState(false)
  const [statusMessage, setStatusMessage] = useState<string | null>(null)
  const [isSending, setIsSending] = useState(false)
  const [isBootstrapping, setIsBootstrapping] = useState(true)
  const [hasPersisted, setHasPersisted] = useState(false)
  const messageEndRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    window.clawNest
      .bootstrap()
      .then(async (payload) => {
        setAppState(payload.state)
        const status = await window.clawNest.getGatewayStatus()
        setGatewayStatus(status)
      })
      .catch((error: unknown) => {
        const message = error instanceof Error ? error.message : DEFAULT_UI_COPY.initFailedTitle
        setStatusMessage(message)
      })
      .finally(() => {
        setIsBootstrapping(false)
      })
  }, [])

  useEffect(() => {
    if (!appState) {
      return
    }

    if (!hasPersisted) {
      setHasPersisted(true)
      return
    }

    const timer = window.setTimeout(() => {
      window.clawNest.saveState(appState).catch((error: unknown) => {
        const copy = getUiCopy(normalizeLocale(appState.locale))
        const message = error instanceof Error ? error.message : copy.refreshStateFailed
        setStatusMessage(message)
      })
    }, 250)

    return () => window.clearTimeout(timer)
  }, [appState, hasPersisted])

  const activeConversation = appState?.conversations.find(
    (conversation) => conversation.id === appState.activeConversationId,
  )

  const activeProvider = appState?.providers.find(
    (provider) => provider.id === appState.activeProviderId,
  )

  useEffect(() => {
    messageEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' })
  }, [activeConversation?.messages.length, isSending])

  useEffect(() => {
    if (!appState) {
      return
    }

    setSettingsDraft({
      transport: appState.gateway.transport,
      endpoint: appState.gateway.endpoint,
      port: String(appState.gateway.port),
      canvasPath: appState.gateway.canvasPath,
      authToken: appState.gateway.authToken,
      password: appState.gateway.password,
      sessionKey: appState.gateway.sessionKey,
    })
  }, [appState])

  useEffect(() => {
    if (!appState) {
      return
    }

    void window.clawNest
      .getGatewayStatus()
      .then((status) => {
        setGatewayStatus(status)
      })
      .catch(() => {
        setGatewayStatus(null)
      })
  }, [appState])

  useEffect(() => {
    if (!appState) {
      return
    }

    if (appState.gateway.transport !== 'openclaw-compatible') {
      setGatewaySnapshot(null)
      setGatewayProbe(null)
      return
    }

    if (!appState.gateway.endpoint.trim()) {
      return
    }

    void window.clawNest
      .syncGateway(appState.gateway)
      .then((snapshot) => {
        setGatewaySnapshot(snapshot)
      })
      .catch(() => {
        setGatewaySnapshot(null)
      })
  }, [
    appState,
    appState?.gateway.transport,
    appState?.gateway.endpoint,
    appState?.gateway.port,
    appState?.gateway.authToken,
    appState?.gateway.password,
  ])

  if (isBootstrapping) {
    return (
      <div className="splash-screen">
        <div className="splash-card">
          <span className="splash-badge">AeroClaw</span>
          <h1>{DEFAULT_UI_COPY.splashTitle}</h1>
          <p>{DEFAULT_UI_COPY.splashLoading}</p>
        </div>
      </div>
    )
  }

  if (!appState || !activeConversation || !activeProvider) {
    return (
      <div className="splash-screen">
        <div className="splash-card">
          <span className="splash-badge">AeroClaw</span>
          <h1>{DEFAULT_UI_COPY.initFailedTitle}</h1>
          <p>{statusMessage ?? DEFAULT_UI_COPY.restartPrompt}</p>
        </div>
      </div>
    )
  }

  const currentAppState = appState
  const currentConversation = activeConversation
  const currentProvider = activeProvider
  const locale = normalizeLocale(currentAppState.locale)
  const copy = getUiCopy(locale)
  const isOpenClawTransport = currentAppState.gateway.transport === 'openclaw-compatible'

  const navItems: Array<{
    id: MainSection
    label: string
    icon: typeof Sparkles
  }> = [
    { id: 'chat', label: copy.nav.chat, icon: Sparkles },
    { id: 'models', label: copy.nav.models, icon: BrainCircuit },
    { id: 'plugins', label: copy.nav.plugins, icon: Blocks },
    { id: 'skills', label: copy.nav.skills, icon: Bot },
    { id: 'tasks', label: copy.nav.tasks, icon: Clock3 },
    { id: 'settings', label: copy.nav.settings, icon: Settings },
  ]

  function buildConversationGatewaySessionKey() {
    return `aeroclaw:${crypto.randomUUID()}`
  }

  function resolveGatewaySettingsFromDraft() {
    const port = Number.parseInt(settingsDraft.port, 10)
    if (!settingsDraft.endpoint.trim()) {
      setStatusMessage(copy.gatewayEndpointRequired)
      return null
    }

    if (!Number.isFinite(port) || port <= 0) {
      setStatusMessage(copy.gatewayPortInvalid)
      return null
    }

    return {
      ...currentAppState.gateway,
      transport: settingsDraft.transport,
      endpoint: settingsDraft.endpoint.trim(),
      port,
      canvasPath: settingsDraft.canvasPath.trim() || '/__aeroclaw__',
      authToken: settingsDraft.authToken.trim(),
      password: settingsDraft.password,
      sessionKey: settingsDraft.sessionKey.trim() || 'main',
    } satisfies GatewaySettings
  }

  async function probeGateway(settings: GatewaySettings) {
    setIsProbingGateway(true)
    try {
      const result = await window.clawNest.probeGateway(settings)
      setGatewayProbe(result)
      setStatusMessage(result.message)
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : copy.gatewayProbeFailed
      setStatusMessage(message)
    } finally {
      setIsProbingGateway(false)
    }
  }

  async function syncGatewayCatalog(settings: GatewaySettings, silent = false) {
    setIsSyncingGateway(true)
    try {
      const snapshot = await window.clawNest.syncGateway(settings)
      setGatewaySnapshot(snapshot)
      if (!silent) {
        setStatusMessage(copy.gatewaySyncSuccess(snapshot.skills.length, snapshot.tools.length, snapshot.sessions.length))
      }
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : copy.gatewaySyncFailed
      if (!silent) {
        setStatusMessage(message)
      }
    } finally {
      setIsSyncingGateway(false)
    }
  }

  function setSection(section: MainSection) {
    setAppState((current) => {
      if (!current) {
        return current
      }

      return {
        ...current,
        activeSection: section,
      }
    })
  }

  function updateLocale(nextLocale: AppLocale) {
    const nextLabel = LOCALE_OPTIONS.find((option) => option.value === nextLocale)?.label ?? nextLocale
    const nextCopy = getUiCopy(nextLocale)

    setAppState((current) => {
      if (!current) {
        return current
      }

      return {
        ...current,
        locale: nextLocale,
      }
    })
    setStatusMessage(nextCopy.languageUpdated(nextLabel))
  }

  function createConversation() {
    const now = new Date().toISOString()
    const conversation: ConversationThread = {
      id: crypto.randomUUID(),
      title: copy.newConversationTitle,
      summary: copy.newConversationSummary,
      createdAt: now,
      updatedAt: now,
      gatewaySessionKey: isOpenClawTransport ? buildConversationGatewaySessionKey() : undefined,
      messages: [
        {
          id: crypto.randomUUID(),
          role: 'assistant',
          content: copy.newConversationMessage,
          createdAt: now,
          attachments: [],
        },
      ],
    }

    setAppState((current) => {
      if (!current) {
        return current
      }

      return {
        ...current,
        activeSection: 'chat',
        activeConversationId: conversation.id,
        conversations: [conversation, ...current.conversations],
      }
    })
  }

  function selectConversation(conversationId: string) {
    setAppState((current) => {
      if (!current) {
        return current
      }

      return {
        ...current,
        activeConversationId: conversationId,
      }
    })
  }

  function openProviderManager(provider?: ModelProvider) {
    setEditingProvider(provider ?? null)
    setProviderDraft(
      provider ?? {
        id: crypto.randomUUID(),
        label: '',
        model: '',
        baseUrl: '',
        apiKey: '',
        tokenSourceName: '',
        notes: '',
        category: 'custom',
        enabled: true,
      },
    )
    setProviderManagerOpen(true)
  }

  function closeProviderManager() {
    setProviderManagerOpen(false)
    setEditingProvider(null)
    setProviderDraft(null)
  }

  function saveProvider() {
    if (!providerDraft) {
      return
    }

    if (!providerDraft.label.trim() || !providerDraft.model.trim() || !providerDraft.baseUrl.trim()) {
      setStatusMessage(copy.providerRequiredFields)
      return
    }

    const normalizedProvider = {
      ...providerDraft,
      label: providerDraft.label.trim(),
      model: providerDraft.model.trim(),
      baseUrl: providerDraft.baseUrl.trim().replace(/\/$/, ''),
      tokenSourceName: providerDraft.tokenSourceName.trim() || copy.defaultTokenSourceName,
      notes: providerDraft.notes.trim(),
    }

    setAppState((current) => {
      if (!current) {
        return current
      }

      const existingIndex = current.providers.findIndex((provider) => provider.id === normalizedProvider.id)
      const providers =
        existingIndex >= 0
          ? current.providers.map((provider) =>
              provider.id === normalizedProvider.id ? normalizedProvider : provider,
            )
          : [normalizedProvider, ...current.providers]

      return {
        ...current,
        providers,
        activeProviderId:
          current.activeProviderId === normalizedProvider.id || !current.activeProviderId
            ? normalizedProvider.id
            : current.activeProviderId,
      }
    })

    closeProviderManager()
    setStatusMessage(editingProvider ? copy.providerUpdated : copy.providerAdded)
  }

  function deleteProvider(providerId: string) {
    setAppState((current) => {
      if (!current) {
        return current
      }

      const providers = current.providers.filter((provider) => provider.id !== providerId)
      const nextActiveProviderId =
        current.activeProviderId === providerId ? providers[0]?.id ?? '' : current.activeProviderId

      return {
        ...current,
        providers,
        activeProviderId: nextActiveProviderId,
      }
    })
  }

  function selectProvider(providerId: string) {
    setAppState((current) => {
      if (!current) {
        return current
      }

      return {
        ...current,
        activeProviderId: providerId,
      }
    })
  }

  async function refreshStateFromDisk() {
    setIsRefreshingState(true)
    try {
      const payload = await window.clawNest.bootstrap()
      setAppState(payload.state)
      setStatusMessage(getUiCopy(normalizeLocale(payload.state.locale)).refreshedState)
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : copy.refreshStateFailed
      setStatusMessage(message)
    } finally {
      setIsRefreshingState(false)
    }
  }

  async function refreshGatewayStatus() {
    try {
      const status = await window.clawNest.getGatewayStatus()
      setGatewayStatus(status)
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : copy.gatewayStatusReadFailed
      setStatusMessage(message)
    }
  }

  async function startGateway() {
    setIsUpdatingGatewayRuntime(true)
    try {
      const status = await window.clawNest.startGateway()
      setGatewayStatus(status)
      setStatusMessage(copy.gatewayStarted(status.url))
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : copy.gatewayStartFailed
      setStatusMessage(message)
      await refreshGatewayStatus()
    } finally {
      setIsUpdatingGatewayRuntime(false)
    }
  }

  async function stopGateway() {
    setIsUpdatingGatewayRuntime(true)
    try {
      const status = await window.clawNest.stopGateway()
      setGatewayStatus(status)
      setStatusMessage(copy.gatewayStopped)
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : copy.gatewayStopFailed
      setStatusMessage(message)
      await refreshGatewayStatus()
    } finally {
      setIsUpdatingGatewayRuntime(false)
    }
  }

  async function createStarterAssets() {
    setIsCreatingAssets(true)
    try {
      const result = await window.clawNest.createStarterAssets()
      await refreshStateFromDisk()
      setStatusMessage(
        result.created.length > 0 ? copy.starterAssetsCreated(result.created.length) : copy.starterAssetsSkipped,
      )
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : copy.starterAssetsFailed
      setStatusMessage(message)
    } finally {
      setIsCreatingAssets(false)
    }
  }

  async function runProviderTest(provider: ModelProvider) {
    setTestingProviderId(provider.id)
    try {
      const result = await window.clawNest.testProvider(provider)
      setProviderChecks((current) => ({ ...current, [provider.id]: result }))
      setStatusMessage(result.message)
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : copy.providerTestFailed
      setStatusMessage(message)
    } finally {
      setTestingProviderId(null)
    }
  }

  async function runDraftProviderTest() {
    if (!providerDraft) {
      return
    }

    setTestingDraftProvider(true)
    try {
      const result = await window.clawNest.testProvider(providerDraft)
      setStatusMessage(result.message)
      setProviderChecks((current) => ({ ...current, [providerDraft.id]: result }))
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : copy.providerTestFailed
      setStatusMessage(message)
    } finally {
      setTestingDraftProvider(false)
    }
  }

  function saveGatewaySettings() {
    const nextGatewaySettings = resolveGatewaySettingsFromDraft()
    if (!nextGatewaySettings) {
      return
    }

    const nextState: AppState = {
      ...currentAppState,
      gateway: nextGatewaySettings,
    }

    setAppState(nextState)
    void window.clawNest.saveState(nextState)
    void refreshGatewayStatus()
    if (nextGatewaySettings.transport === 'openclaw-compatible') {
      void probeGateway(nextGatewaySettings)
      void syncGatewayCatalog(nextGatewaySettings, true)
    }

    setStatusMessage(copy.gatewaySettingsUpdated)
  }

  async function importFiles() {
    try {
      const importedFiles = await window.clawNest.pickFiles()
      if (importedFiles.length === 0) {
        return
      }

      setQueuedAttachments((current) => {
        const knownPaths = new Set(current.map((item) => item.path))
        const next = [...current]

        importedFiles.forEach((file) => {
          if (!knownPaths.has(file.path)) {
            next.push(file)
          }
        })

        return next
      })
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : copy.importFilesFailed
      setStatusMessage(message)
    }
  }

  function removeAttachment(attachmentId: string) {
    setQueuedAttachments((current) => current.filter((item) => item.id !== attachmentId))
  }

  async function sendMessage() {
    const prompt = composerText.trim()
    if (!prompt && queuedAttachments.length === 0) {
      return
    }

    if (!isOpenClawTransport && (!currentProvider.baseUrl || !currentProvider.model)) {
      setStatusMessage(copy.configureProviderFirst)
      setProviderManagerOpen(true)
      return
    }

    const now = new Date().toISOString()
    const userPrompt = prompt || copy.analyzeImportedFilesPrompt
    const userMessage: ConversationMessage = {
      id: crypto.randomUUID(),
      role: 'user',
      content: userPrompt,
      createdAt: now,
      attachments: queuedAttachments,
    }

    setIsSending(true)
    setStatusMessage(null)

    setAppState((current) => {
      if (!current) {
        return current
      }

      return {
        ...current,
        conversations: current.conversations.map((conversation) => {
          if (conversation.id !== current.activeConversationId) {
            return conversation
          }

          const nextTitle = DEFAULT_CHAT_TITLES.has(conversation.title)
            ? userPrompt.slice(0, 18) || queuedAttachments[0]?.name || copy.newConversationTitle
            : conversation.title

          return {
            ...conversation,
            title: nextTitle,
            summary: userPrompt.slice(0, 36),
            updatedAt: now,
            messages: [...conversation.messages, userMessage],
          }
        }),
      }
    })

    const history = currentConversation.messages
    setComposerText('')
    setQueuedAttachments([])

    try {
      const result = await window.clawNest.sendChat({
        provider: currentProvider,
        history,
        prompt: userPrompt,
        attachments: userMessage.attachments,
        sessionKey: currentConversation.gatewaySessionKey || currentAppState.gateway.sessionKey,
      })

      setAppState((current) => {
        if (!current) {
          return current
        }

        return {
          ...current,
          conversations: current.conversations.map((conversation) =>
            conversation.id === current.activeConversationId
              ? {
                  ...conversation,
                  updatedAt: new Date().toISOString(),
                  messages: [
                    ...conversation.messages,
                    {
                      id: crypto.randomUUID(),
                      role: 'assistant',
                      content: result.content,
                      createdAt: new Date().toISOString(),
                      attachments: [],
                    },
                  ],
                }
              : conversation,
          ),
        }
      })
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : copy.sendFailed
      setStatusMessage(message)

      setAppState((current) => {
        if (!current) {
          return current
        }

        return {
          ...current,
          conversations: current.conversations.map((conversation) =>
            conversation.id === current.activeConversationId
              ? {
                  ...conversation,
                  updatedAt: new Date().toISOString(),
                  messages: [
                    ...conversation.messages,
                    {
                      id: crypto.randomUUID(),
                      role: 'assistant',
                      content: copy.failedRequestMessage(message, isOpenClawTransport),
                      createdAt: new Date().toISOString(),
                      attachments: [],
                    },
                  ],
                }
              : conversation,
          ),
        }
      })
    } finally {
      setIsSending(false)
    }
  }

  function togglePlugin(pluginId: string) {
    setAppState((current) => {
      if (!current) {
        return current
      }

      return {
        ...current,
        plugins: current.plugins.map((plugin) =>
          plugin.id === pluginId ? { ...plugin, enabled: !plugin.enabled } : plugin,
        ),
      }
    })
  }

  function renderConversationCard(conversation: ConversationThread) {
    const isActive = conversation.id === currentAppState.activeConversationId

    return (
      <button
        key={conversation.id}
        className={`conversation-card ${isActive ? 'is-active' : ''}`}
        onClick={() => selectConversation(conversation.id)}
      >
        <span className="conversation-role">Main Agent</span>
        <strong>{conversation.title}</strong>
        <p>{conversation.summary || copy.waitingNewTask}</p>
        {isOpenClawTransport && conversation.gatewaySessionKey ? (
          <small>{conversation.gatewaySessionKey}</small>
        ) : null}
      </button>
    )
  }

  function renderProviderCard(provider: ModelProvider) {
    const isActive = provider.id === currentAppState.activeProviderId
    const checkResult = providerChecks[provider.id]
    const isTesting = testingProviderId === provider.id

    return (
      <article key={provider.id} className={`provider-card ${isActive ? 'is-active' : ''}`}>
        <div>
          <span className="provider-badge">{provider.tokenSourceName || copy.customSource}</span>
          <h3>{provider.label}</h3>
          <p>{provider.model}</p>
          <small>{provider.baseUrl || copy.pendingApiUrl}</small>
        </div>
        {checkResult ? (
          <p className={`provider-health ${checkResult.ok ? 'is-ok' : 'is-error'}`}>{checkResult.message}</p>
        ) : null}
        <div className="provider-actions">
          <button className="ghost-button" onClick={() => void runProviderTest(provider)}>
            <RefreshCw size={16} className={isTesting ? 'spin' : ''} />
            {copy.test}
          </button>
          <button className="ghost-button" onClick={() => selectProvider(provider.id)}>
            {copy.setCurrent}
          </button>
          <button className="ghost-button" onClick={() => openProviderManager(provider)}>
            {copy.edit}
          </button>
          {currentAppState.providers.length > 1 ? (
            <button className="danger-button" onClick={() => deleteProvider(provider.id)}>
              {copy.delete}
            </button>
          ) : null}
        </div>
      </article>
    )
  }

  function renderPluginCard(plugin: PluginItem) {
    return (
      <article key={plugin.id} className="feature-card">
        <div className="feature-card__header">
          <div>
            <span className="provider-badge">{plugin.source === 'builtin' ? 'Built-in' : copy.local}</span>
            <h3>{plugin.name}</h3>
          </div>
          <button
            className={`toggle-button ${plugin.enabled ? 'is-on' : ''}`}
            onClick={() => togglePlugin(plugin.id)}
          >
            {plugin.enabled ? copy.enabled : copy.disabled}
          </button>
        </div>
        <p>{plugin.description}</p>
      </article>
    )
  }

  function renderCurrentSection() {
    if (currentAppState.activeSection === 'chat') {
      return (
        <div className="chat-layout">
          <aside className="thread-pane fade-up">
            <div className="thread-pane__header">
              <div>
                <span className="eyebrow">{copy.subConversations}</span>
                <h2>{copy.chatHeading}</h2>
              </div>
              <button className="icon-button" onClick={createConversation} aria-label={copy.newConversationAria}>
                <Plus size={18} />
              </button>
            </div>
            <button className="primary-button" onClick={createConversation}>
              <Plus size={16} />
              {copy.newConversation}
            </button>
            <div className="thread-list">{currentAppState.conversations.map(renderConversationCard)}</div>
          </aside>

          <section className="chat-panel fade-up">
            <header className="chat-header">
              <div>
                <span className="eyebrow">{copy.currentConversation}</span>
                <h2>{currentConversation.title}</h2>
                <p>{currentConversation.summary || copy.handoffPrompt}</p>
                {isOpenClawTransport ? (
                  <small>
                    Gateway Session: {currentConversation.gatewaySessionKey || currentAppState.gateway.sessionKey}
                  </small>
                ) : null}
              </div>
              <button
                className="provider-switcher"
                onClick={() => (isOpenClawTransport ? setSection('settings') : setProviderManagerOpen(true))}
              >
                <span className="provider-switcher__status">{copy.currentSourceReady}</span>
                <div>
                  <strong>{isOpenClawTransport ? 'OpenClaw Gateway' : currentProvider.label}</strong>
                  <small>{isOpenClawTransport ? currentAppState.gateway.endpoint : currentProvider.model}</small>
                </div>
              </button>
            </header>

            <div className="message-stream">
              {currentConversation.messages.map((message) => (
                <article key={message.id} className={`message-bubble ${message.role}`}>
                  <span className="message-role">
                    {message.role === 'assistant'
                      ? copy.assistantName
                      : message.role === 'user'
                        ? copy.youLabel
                        : copy.systemLabel}
                  </span>
                  <p>{message.content}</p>
                  {message.attachments.length > 0 ? (
                    <div className="attachment-list">
                      {message.attachments.map((attachment) => (
                        <span key={attachment.id} className="attachment-pill">
                          <Paperclip size={14} />
                          {attachment.name}
                        </span>
                      ))}
                    </div>
                  ) : null}
                </article>
              ))}
              {isSending ? (
                <article className="message-bubble assistant">
                  <span className="message-role">{copy.assistantName}</span>
                  <p>{copy.assistantTyping}</p>
                </article>
              ) : null}
              <div ref={messageEndRef} />
            </div>

            <footer className="composer-card">
              {queuedAttachments.length > 0 ? (
                <div className="composer-attachments">
                  {queuedAttachments.map((attachment) => (
                    <button
                      key={attachment.id}
                      className="attachment-chip"
                      onClick={() => removeAttachment(attachment.id)}
                    >
                      <Paperclip size={14} />
                      <span>{attachment.name}</span>
                      <small>{copy.remove}</small>
                    </button>
                  ))}
                </div>
              ) : null}

              <div className="composer-input">
                <button className="icon-button" onClick={importFiles} aria-label={copy.importFilesAria}>
                  <Paperclip size={18} />
                </button>
                <textarea
                  value={composerText}
                  onChange={(event) => setComposerText(event.target.value)}
                  placeholder={copy.composerPlaceholder}
                  rows={3}
                />
                <button className="send-button" onClick={() => void sendMessage()} disabled={isSending}>
                  <SendHorizonal size={18} />
                </button>
              </div>

              <div className="composer-meta">
                <span>
                  {copy.transportMode}: {isOpenClawTransport ? 'OpenClaw-Compatible' : 'OpenAI-Compatible'}
                </span>
                {isOpenClawTransport ? (
                  <span>
                    {copy.sessionKey}: {currentConversation.gatewaySessionKey || currentAppState.gateway.sessionKey}
                  </span>
                ) : null}
                <span>
                  {copy.configDirectory}: {currentAppState.gateway.configDir}
                </span>
              </div>
            </footer>
          </section>
        </div>
      )
    }

    if (currentAppState.activeSection === 'models') {
      return (
        <section className="page-panel fade-up">
          <div className="page-header">
            <div>
              <span className="eyebrow">{copy.poorClawStyle}</span>
              <h2>{copy.modelsTitle}</h2>
              <p>
                {copy.modelsDescription}
                {isOpenClawTransport ? ` ${copy.modelsGatewaySuffix}` : ''}
              </p>
            </div>
            <button className="primary-button" onClick={() => openProviderManager()}>
              <Plus size={16} />
              {copy.addProvider}
            </button>
          </div>
          <div className="grid-cards">{currentAppState.providers.map(renderProviderCard)}</div>
        </section>
      )
    }

    if (currentAppState.activeSection === 'plugins') {
      return (
        <section className="page-panel fade-up">
          <div className="page-header">
            <div>
              <span className="eyebrow">Plugin Ready</span>
              <h2>{copy.pluginsTitle}</h2>
              <p>{copy.pluginsDescription}</p>
            </div>
            <button
              className="ghost-button"
              onClick={() => void window.clawNest.revealInFinder(currentAppState.gateway.pluginsDir)}
            >
              <FolderKanban size={16} />
              {copy.openPluginsDir}
            </button>
            <button className="ghost-button" onClick={() => void createStarterAssets()}>
              <PlugZap size={16} />
              {isCreatingAssets ? copy.creating : copy.createLocalTemplate}
            </button>
            <button className="ghost-button" onClick={() => void refreshStateFromDisk()}>
              <RefreshCw size={16} className={isRefreshingState ? 'spin' : ''} />
              {copy.refreshDirectory}
            </button>
          </div>
          <div className="grid-cards">
            {currentAppState.plugins.map(renderPluginCard)}
            {gatewaySnapshot?.tools.map((tool) => (
              <article key={`gateway-tool-${tool.id}`} className="feature-card">
                <div className="feature-card__header">
                  <div>
                    <span className="provider-badge">{tool.source === 'plugin' ? copy.gatewayPlugin : copy.gatewayTool}</span>
                    <h3>{tool.label}</h3>
                  </div>
                </div>
                <p>{tool.description}</p>
                <small>
                  {tool.group}
                  {tool.pluginId ? ` · ${tool.pluginId}` : ''}
                </small>
              </article>
            ))}
          </div>
        </section>
      )
    }

    if (currentAppState.activeSection === 'skills') {
      return (
        <section className="page-panel fade-up">
          <div className="page-header">
            <div>
              <span className="eyebrow">Skill Compatibility</span>
              <h2>{copy.skillsTitle}</h2>
              <p>{copy.skillsDescription}</p>
            </div>
            <button
              className="ghost-button"
              onClick={() => void window.clawNest.revealInFinder(currentAppState.gateway.skillsDir)}
            >
              <FolderKanban size={16} />
              {copy.openSkillsDir}
            </button>
            <button className="ghost-button" onClick={() => void createStarterAssets()}>
              <Plus size={16} />
              {isCreatingAssets ? copy.creating : copy.createSkillTemplate}
            </button>
            <button className="ghost-button" onClick={() => void refreshStateFromDisk()}>
              <RefreshCw size={16} className={isRefreshingState ? 'spin' : ''} />
              {copy.refreshDirectory}
            </button>
          </div>
          <div className="grid-cards">
            {currentAppState.skills.map((skill) => (
              <article key={skill.id} className="feature-card">
                <div className="feature-card__header">
                  <div>
                    <span className="provider-badge">{skill.source === 'local' ? copy.local : copy.bundled}</span>
                    <h3>{skill.name}</h3>
                  </div>
                </div>
                <p>{skill.description}</p>
                {skill.path ? <small>{skill.path}</small> : null}
              </article>
            ))}
            {gatewaySnapshot?.skills.map((skill) => (
              <article key={`gateway-skill-${skill.id}`} className="feature-card">
                <div className="feature-card__header">
                  <div>
                    <span className="provider-badge">{copy.gatewaySkill}</span>
                    <h3>{skill.name}</h3>
                  </div>
                </div>
                <p>{skill.description}</p>
                <small>
                  {skill.source}
                  {skill.eligible ? ` · ${copy.eligible}` : ` · ${copy.unavailable}`}
                </small>
              </article>
            ))}
          </div>
        </section>
      )
    }

    if (currentAppState.activeSection === 'tasks') {
      return (
        <section className="page-panel fade-up">
          <div className="page-header">
            <div>
              <span className="eyebrow">OpenClaw Compatible</span>
              <h2>{copy.tasksTitle}</h2>
              <p>{copy.tasksDescription}</p>
            </div>
          </div>
          <div className="grid-cards">
            <article className="feature-card">
              <div className="feature-card__header">
                <div>
                  <span className="provider-badge">Next</span>
                  <h3>{copy.dailyBriefing}</h3>
                </div>
              </div>
              <p>{copy.dailyBriefingDescription}</p>
            </article>
            <article className="feature-card">
              <div className="feature-card__header">
                <div>
                  <span className="provider-badge">Ready</span>
                  <h3>{copy.doubleIsolation}</h3>
                </div>
              </div>
              <p>{copy.doubleIsolationDescription}</p>
            </article>
          </div>
        </section>
      )
    }

    return (
      <section className="page-panel fade-up">
        <div className="page-header">
          <div>
            <span className="eyebrow">Workspace Settings</span>
            <h2>{copy.settingsTitle}</h2>
            <p>{copy.settingsDescription}</p>
          </div>
        </div>
        <div className="settings-form-card">
          <div className="feature-card__header">
            <div>
              <span className="provider-badge">{copy.languageLabel}</span>
              <h3>{copy.languageSectionTitle}</h3>
            </div>
          </div>
          <p>{copy.languageSectionDescription}</p>
          <div className="settings-form-grid">
            <label className="full-span">
              <span>{copy.languageLabel}</span>
              <select value={locale} onChange={(event) => updateLocale(event.target.value as AppLocale)}>
                {LOCALE_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
          </div>
        </div>
        <div className="settings-form-card">
          <div className="feature-card__header">
            <div>
              <span className="provider-badge">Gateway Runtime</span>
              <h3>{copy.gatewayRuntimeTitle}</h3>
            </div>
            <div className="provider-actions">
              <button className="ghost-button" onClick={() => void refreshGatewayStatus()}>
                <RefreshCw size={16} className={isUpdatingGatewayRuntime ? 'spin' : ''} />
                {copy.refreshStatus}
              </button>
              {gatewayStatus?.running ? (
                <button className="danger-button" onClick={() => void stopGateway()}>
                  <Square size={16} />
                  {copy.stopGateway}
                </button>
              ) : (
                <button className="primary-button" onClick={() => void startGateway()}>
                  <Play size={16} />
                  {copy.startGateway}
                </button>
              )}
            </div>
          </div>
          <div className="settings-grid compact-grid">
            <article className="setting-card compact">
              <h3>{copy.runtimeStatus}</h3>
              <p>{gatewayStatus?.running ? copy.running : copy.stopped}</p>
            </article>
            <article className="setting-card compact">
              <h3>{copy.accessUrl}</h3>
              <p>{gatewayStatus?.url ?? `http://127.0.0.1:${currentAppState.gateway.port}`}</p>
            </article>
            <article className="setting-card compact">
              <h3>{copy.startedAt}</h3>
              <p>{gatewayStatus?.startedAt ?? copy.notStartedYet}</p>
            </article>
            <article className="setting-card compact">
              <h3>{copy.lastError}</h3>
              <p>{gatewayStatus?.lastError ?? copy.none}</p>
            </article>
          </div>
        </div>
        <div className="settings-form-card">
          <div className="feature-card__header">
            <div>
              <span className="provider-badge">Gateway</span>
              <h3>{copy.gatewaySettingsTitle}</h3>
            </div>
            <div className="provider-actions">
              <button
                className="ghost-button"
                onClick={() => {
                  const settings = resolveGatewaySettingsFromDraft()
                  if (settings) {
                    void probeGateway(settings)
                  }
                }}
              >
                <Wrench size={16} className={isProbingGateway ? 'spin' : ''} />
                {copy.probeGateway}
              </button>
              <button
                className="ghost-button"
                onClick={() => {
                  const settings = resolveGatewaySettingsFromDraft()
                  if (settings) {
                    void syncGatewayCatalog(settings)
                  }
                }}
              >
                <RefreshCw size={16} className={isSyncingGateway ? 'spin' : ''} />
                {copy.syncCapabilities}
              </button>
              <button className="primary-button" onClick={saveGatewaySettings}>
                <Save size={16} />
                {copy.saveSettings}
              </button>
            </div>
          </div>
          <div className="settings-form-grid">
            <label>
              <span>{copy.transportModeLabel}</span>
              <select
                value={settingsDraft.transport}
                onChange={(event) =>
                  setSettingsDraft((current) => ({
                    ...current,
                    transport: event.target.value as GatewaySettings['transport'],
                  }))
                }
              >
                <option value="openai-compatible">OpenAI-Compatible</option>
                <option value="openclaw-compatible">OpenClaw-Compatible</option>
              </select>
            </label>
            <label>
              <span>{copy.defaultPort}</span>
              <input
                value={settingsDraft.port}
                onChange={(event) =>
                  setSettingsDraft((current) => ({
                    ...current,
                    port: event.target.value,
                  }))
                }
                placeholder="18879"
              />
            </label>
            <label className="full-span">
              <span>{copy.defaultGatewayEndpoint}</span>
              <input
                value={settingsDraft.endpoint}
                onChange={(event) =>
                  setSettingsDraft((current) => ({
                    ...current,
                    endpoint: event.target.value,
                  }))
                }
                placeholder="http://127.0.0.1"
              />
            </label>
            <label className="full-span">
              <span>{copy.canvasPath}</span>
              <input
                value={settingsDraft.canvasPath}
                onChange={(event) =>
                  setSettingsDraft((current) => ({
                    ...current,
                    canvasPath: event.target.value,
                  }))
                }
                placeholder="/__aeroclaw__"
              />
            </label>
            <label className="full-span">
              <span>Gateway Token</span>
              <input
                value={settingsDraft.authToken}
                onChange={(event) =>
                  setSettingsDraft((current) => ({
                    ...current,
                    authToken: event.target.value,
                  }))
                }
                placeholder={copy.sharedGatewayTokenPlaceholder}
              />
            </label>
            <label className="full-span">
              <span>Gateway Password</span>
              <input
                type="password"
                value={settingsDraft.password}
                onChange={(event) =>
                  setSettingsDraft((current) => ({
                    ...current,
                    password: event.target.value,
                  }))
                }
                placeholder={copy.gatewayPasswordPlaceholder}
              />
            </label>
            <label className="full-span">
              <span>{copy.defaultSessionKey}</span>
              <input
                value={settingsDraft.sessionKey}
                onChange={(event) =>
                  setSettingsDraft((current) => ({
                    ...current,
                    sessionKey: event.target.value,
                  }))
                }
                placeholder="main"
              />
            </label>
          </div>
          {gatewayProbe ? (
            <div className="settings-grid compact-grid">
              <article className="setting-card compact">
                <h3>{copy.probeResult}</h3>
                <p>{gatewayProbe.ok ? copy.connected : copy.disconnected}</p>
              </article>
              <article className="setting-card compact">
                <h3>{copy.authMode}</h3>
                <p>{gatewayProbe.authMode ?? 'none'}</p>
              </article>
              <article className="setting-card compact">
                <h3>{copy.gatewayAddress}</h3>
                <p>{gatewayProbe.gatewayUrl ?? copy.notReturnedYet}</p>
              </article>
              <article className="setting-card compact">
                <h3>{copy.checkedAt}</h3>
                <p>{gatewayProbe.checkedAt}</p>
              </article>
            </div>
          ) : null}
          {gatewaySnapshot ? (
            <div className="settings-grid compact-grid">
              <article className="setting-card compact">
                <h3>{copy.openClawSessions}</h3>
                <p>{gatewaySnapshot.sessions.length}</p>
              </article>
              <article className="setting-card compact">
                <h3>{copy.openClawSkills}</h3>
                <p>{gatewaySnapshot.skills.length}</p>
              </article>
              <article className="setting-card compact">
                <h3>{copy.openClawTools}</h3>
                <p>{gatewaySnapshot.tools.length}</p>
              </article>
              <article className="setting-card compact">
                <h3>{copy.modelCatalog}</h3>
                <p>{gatewaySnapshot.models.length}</p>
              </article>
            </div>
          ) : null}
        </div>
        <div className="settings-grid">
          <article className="setting-card">
            <h3>{copy.brandName}</h3>
            <p>{currentAppState.brandName}</p>
          </article>
          <article className="setting-card">
            <h3>{copy.configFile}</h3>
            <p>{currentAppState.gateway.configFile}</p>
          </article>
          <article className="setting-card">
            <h3>{copy.workspaceDir}</h3>
            <p>{currentAppState.gateway.workspaceDir}</p>
          </article>
          <article className="setting-card">
            <h3>{copy.defaultGateway}</h3>
            <p>
              {currentAppState.gateway.endpoint}:{currentAppState.gateway.port}
            </p>
          </article>
          <article className="setting-card">
            <h3>{copy.canvasPath}</h3>
            <p>{currentAppState.gateway.canvasPath}</p>
          </article>
          <article className="setting-card">
            <h3>{copy.defaultSessionKey}</h3>
            <p>{currentAppState.gateway.sessionKey}</p>
          </article>
          <article className="setting-card">
            <h3>{copy.separationGoal}</h3>
            <p>{copy.separationDescription}</p>
          </article>
          <article className="setting-card">
            <h3>{copy.pluginsDir}</h3>
            <p>{currentAppState.gateway.pluginsDir}</p>
            <button
              className="ghost-button inline-setting-action"
              onClick={() => void window.clawNest.revealInFinder(currentAppState.gateway.pluginsDir)}
            >
              <FolderCog size={16} />
              {copy.openDirectory}
            </button>
          </article>
          <article className="setting-card">
            <h3>{copy.skillsDir}</h3>
            <p>{currentAppState.gateway.skillsDir}</p>
            <button
              className="ghost-button inline-setting-action"
              onClick={() => void window.clawNest.revealInFinder(currentAppState.gateway.skillsDir)}
            >
              <FolderCog size={16} />
              {copy.openDirectory}
            </button>
          </article>
        </div>
      </section>
    )
  }

  return (
    <div className="app-shell">
      <aside className="primary-sidebar fade-up">
        <div className="brand-lockup">
          <div className="brand-mark">A</div>
          <div>
            <strong>{currentAppState.brandName}</strong>
            <p>{copy.sidebarTagline}</p>
          </div>
        </div>

        <button className="primary-button" onClick={createConversation}>
          <Plus size={16} />
          {copy.newConversation}
        </button>

        <nav className="primary-nav">
          {navItems.map((item) => {
            const Icon = item.icon
            const isActive = currentAppState.activeSection === item.id

            return (
              <button
                key={item.id}
                className={`nav-item ${isActive ? 'is-active' : ''}`}
                onClick={() => setSection(item.id)}
              >
                <Icon size={18} />
                <span>{item.label}</span>
              </button>
            )
          })}
        </nav>

        <div className="sidebar-footer">
          <span className="eyebrow">{copy.separatedWorkspace}</span>
          <p>{currentAppState.gateway.configDir}</p>
          <label className="sidebar-language">
            <span>{copy.languageLabel}</span>
            <select value={locale} onChange={(event) => updateLocale(event.target.value as AppLocale)}>
              {LOCALE_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
        </div>
      </aside>

      <main className="workspace-frame">{renderCurrentSection()}</main>

      {statusMessage ? (
        <div className="status-toast">
          <Save size={16} />
          <span>{statusMessage}</span>
        </div>
      ) : null}

      {providerManagerOpen && providerDraft ? (
        <div className="modal-backdrop" onClick={closeProviderManager}>
          <section className="provider-sheet" onClick={(event) => event.stopPropagation()}>
            <header className="provider-sheet__header">
              <div>
                <span className="eyebrow">{copy.providerSheetEyebrow}</span>
                <h2>{editingProvider ? copy.editProviderTitle : copy.addProviderTitle}</h2>
              </div>
              <button className="icon-button" onClick={closeProviderManager} aria-label={copy.close}>
                <Wrench size={16} />
              </button>
            </header>

            <div className="provider-sheet__grid">
              <label>
                <span>{copy.displayName}</span>
                <input
                  value={providerDraft.label}
                  onChange={(event) =>
                    setProviderDraft((current) => (current ? { ...current, label: event.target.value } : current))
                  }
                  placeholder={copy.displayNamePlaceholder}
                />
              </label>
              <label>
                <span>{copy.tokenSourceName}</span>
                <input
                  value={providerDraft.tokenSourceName}
                  onChange={(event) =>
                    setProviderDraft((current) =>
                      current ? { ...current, tokenSourceName: event.target.value } : current,
                    )
                  }
                  placeholder={copy.tokenSourcePlaceholder}
                />
              </label>
              <label className="full-span">
                <span>{copy.apiUrl}</span>
                <input
                  value={providerDraft.baseUrl}
                  onChange={(event) =>
                    setProviderDraft((current) => (current ? { ...current, baseUrl: event.target.value } : current))
                  }
                  placeholder="https://api.example.com/v1"
                />
              </label>
              <label>
                <span>{copy.apiKey}</span>
                <input
                  type="password"
                  value={providerDraft.apiKey}
                  onChange={(event) =>
                    setProviderDraft((current) => (current ? { ...current, apiKey: event.target.value } : current))
                  }
                  placeholder="sk-..."
                />
              </label>
              <label>
                <span>{copy.modelName}</span>
                <input
                  value={providerDraft.model}
                  onChange={(event) =>
                    setProviderDraft((current) => (current ? { ...current, model: event.target.value } : current))
                  }
                  placeholder="gpt-4o / qwen/qwen3-32b / deepseek-chat"
                />
              </label>
              <label className="full-span">
                <span>{copy.notes}</span>
                <textarea
                  rows={3}
                  value={providerDraft.notes}
                  onChange={(event) =>
                    setProviderDraft((current) => (current ? { ...current, notes: event.target.value } : current))
                  }
                  placeholder={copy.notesPlaceholder}
                />
              </label>
            </div>

            <footer className="provider-sheet__footer">
              <button className="ghost-button" onClick={() => void runDraftProviderTest()}>
                <RefreshCw size={16} className={testingDraftProvider ? 'spin' : ''} />
                {copy.testConnection}
              </button>
              <button className="ghost-button" onClick={closeProviderManager}>
                {copy.cancel}
              </button>
              <button className="primary-button" onClick={saveProvider}>
                {copy.save}
              </button>
            </footer>
          </section>
        </div>
      ) : null}
    </div>
  )
}

export default App
