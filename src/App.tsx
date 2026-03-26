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
  Square,
  Sparkles,
  PlugZap,
  Wrench,
} from 'lucide-react'
import './App.css'
import type {
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
        const message = error instanceof Error ? error.message : '初始化失败'
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
        const message = error instanceof Error ? error.message : '保存状态失败'
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

    void syncGatewayCatalog(appState.gateway, true)
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
          <h1>准备你的独立 Claw 工作台</h1>
          <p>正在加载会话、模型源、技能目录与本地配置。</p>
        </div>
      </div>
    )
  }

  if (!appState || !activeConversation || !activeProvider) {
    return (
      <div className="splash-screen">
        <div className="splash-card">
          <span className="splash-badge">AeroClaw</span>
          <h1>客户端初始化失败</h1>
          <p>{statusMessage ?? '请重新启动应用。'}</p>
        </div>
      </div>
    )
  }

  const currentAppState = appState
  const currentConversation = activeConversation
  const currentProvider = activeProvider
  const isOpenClawTransport = currentAppState.gateway.transport === 'openclaw-compatible'

  const navItems: Array<{
    id: MainSection
    label: string
    icon: typeof Sparkles
  }> = [
    { id: 'chat', label: '对话', icon: Sparkles },
    { id: 'models', label: '模型', icon: BrainCircuit },
    { id: 'plugins', label: '插件', icon: Blocks },
    { id: 'skills', label: '技能', icon: Bot },
    { id: 'tasks', label: '定时任务', icon: Clock3 },
    { id: 'settings', label: '设置', icon: Settings },
  ]

  function buildConversationGatewaySessionKey() {
    return `aeroclaw:${crypto.randomUUID()}`
  }

  function resolveGatewaySettingsFromDraft() {
    const port = Number.parseInt(settingsDraft.port, 10)
    if (!settingsDraft.endpoint.trim()) {
      setStatusMessage('请填写网关地址。')
      return null
    }

    if (!Number.isFinite(port) || port <= 0) {
      setStatusMessage('请填写有效端口。')
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
      const message = error instanceof Error ? error.message : '网关探测失败'
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
        setStatusMessage(
          `已同步 OpenClaw 能力：${snapshot.skills.length} 个技能、${snapshot.tools.length} 个工具、${snapshot.sessions.length} 个会话。`,
        )
      }
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : '同步 OpenClaw 能力失败'
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

  function createConversation() {
    const now = new Date().toISOString()
    const conversation: ConversationThread = {
      id: crypto.randomUUID(),
      title: '新对话',
      summary: '准备开始新的任务',
      createdAt: now,
      updatedAt: now,
      gatewaySessionKey: isOpenClawTransport ? buildConversationGatewaySessionKey() : undefined,
      messages: [
        {
          id: crypto.randomUUID(),
          role: 'assistant',
          content:
            '新会话已经创建好了。你可以直接提问，也可以先导入一个文件，让我先读材料再帮你分析。',
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

  function saveProvider() {
    if (!providerDraft) {
      return
    }

    if (!providerDraft.label.trim() || !providerDraft.model.trim() || !providerDraft.baseUrl.trim()) {
      setStatusMessage('请至少填写名称、模型名和 API URL。')
      return
    }

    const normalizedProvider = {
      ...providerDraft,
      label: providerDraft.label.trim(),
      model: providerDraft.model.trim(),
      baseUrl: providerDraft.baseUrl.trim().replace(/\/$/, ''),
      tokenSourceName: providerDraft.tokenSourceName.trim() || '自定义 token 源',
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

    setProviderManagerOpen(false)
    setEditingProvider(null)
    setProviderDraft(null)
    setStatusMessage(editingProvider ? '模型源已更新。' : '新的模型源已添加。')
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
      setStatusMessage('已重新加载本地配置、插件与技能目录。')
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : '刷新本地状态失败'
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
      const message = error instanceof Error ? error.message : '读取网关状态失败'
      setStatusMessage(message)
    }
  }

  async function startGateway() {
    setIsUpdatingGatewayRuntime(true)
    try {
      const status = await window.clawNest.startGateway()
      setGatewayStatus(status)
      setStatusMessage(`网关已启动：${status.url}`)
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : '启动网关失败'
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
      setStatusMessage('网关已停止。')
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : '停止网关失败'
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
        result.created.length > 0
          ? `已生成 ${result.created.length} 个本地模板文件。`
          : '本地模板已经存在，没有重复覆盖。',
      )
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : '生成模板失败'
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
      const message = error instanceof Error ? error.message : '模型源测试失败'
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
      const message = error instanceof Error ? error.message : '模型源测试失败'
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

    setStatusMessage('独立网关设置已更新。')
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
      const message = error instanceof Error ? error.message : '导入文件失败'
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
      setStatusMessage('请先在右上角配置一个可用的模型源。')
      setProviderManagerOpen(true)
      return
    }

    const now = new Date().toISOString()
    const userPrompt = prompt || '请先阅读并分析我导入的文件，再给出结构化结论。'
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

          const nextTitle =
            conversation.title === '新对话'
              ? userPrompt.slice(0, 18) || queuedAttachments[0]?.name || '新对话'
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
      const message = error instanceof Error ? error.message : '发送失败'
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
                      content:
                        `这次请求没有成功发出去：${message}\n\n` +
                        (isOpenClawTransport
                          ? '你可以先检查设置页里的 OpenClaw Gateway 地址、认证信息和 sessionKey，然后再试一次。'
                          : '你可以检查右上角模型源里的 API URL、API Key 和模型名是否正确，然后再试一次。'),
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
        <p>{conversation.summary || '等待新的任务'}</p>
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
          <span className="provider-badge">{provider.tokenSourceName || '自定义源'}</span>
          <h3>{provider.label}</h3>
          <p>{provider.model}</p>
          <small>{provider.baseUrl || '等待配置 API URL'}</small>
        </div>
        {checkResult ? (
          <p className={`provider-health ${checkResult.ok ? 'is-ok' : 'is-error'}`}>{checkResult.message}</p>
        ) : null}
        <div className="provider-actions">
          <button className="ghost-button" onClick={() => void runProviderTest(provider)}>
            <RefreshCw size={16} className={isTesting ? 'spin' : ''} />
            测试
          </button>
          <button className="ghost-button" onClick={() => selectProvider(provider.id)}>
            设为当前
          </button>
          <button className="ghost-button" onClick={() => openProviderManager(provider)}>
            编辑
          </button>
          {currentAppState.providers.length > 1 ? (
            <button className="danger-button" onClick={() => deleteProvider(provider.id)}>
              删除
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
            <span className="provider-badge">{plugin.source === 'builtin' ? 'Built-in' : 'Local'}</span>
            <h3>{plugin.name}</h3>
          </div>
          <button
            className={`toggle-button ${plugin.enabled ? 'is-on' : ''}`}
            onClick={() => togglePlugin(plugin.id)}
          >
            {plugin.enabled ? '已启用' : '已关闭'}
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
                <span className="eyebrow">二级会话</span>
                <h2>对话</h2>
              </div>
              <button className="icon-button" onClick={createConversation} aria-label="新增对话">
                <Plus size={18} />
              </button>
            </div>
            <button className="primary-button" onClick={createConversation}>
              <Plus size={16} />
              新增对话
            </button>
            <div className="thread-list">{currentAppState.conversations.map(renderConversationCard)}</div>
          </aside>

          <section className="chat-panel fade-up">
            <header className="chat-header">
              <div>
                <span className="eyebrow">当前会话</span>
                <h2>{currentConversation.title}</h2>
                <p>{currentConversation.summary || '把问题、文件和任务交给我。'}</p>
                {isOpenClawTransport ? (
                  <small>Gateway Session: {currentConversation.gatewaySessionKey || currentAppState.gateway.sessionKey}</small>
                ) : null}
              </div>
              <button
                className="provider-switcher"
                onClick={() => (isOpenClawTransport ? setSection('settings') : setProviderManagerOpen(true))}
              >
                <span className="provider-switcher__status">READY</span>
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
                    {message.role === 'assistant' ? 'AeroClaw' : message.role === 'user' ? '你' : '系统'}
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
                  <span className="message-role">AeroClaw</span>
                  <p>正在调用当前模型源并整理回答，请稍等。</p>
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
                      <small>移除</small>
                    </button>
                  ))}
                </div>
              ) : null}

              <div className="composer-input">
                <button className="icon-button" onClick={importFiles} aria-label="导入文件">
                  <Paperclip size={18} />
                </button>
                <textarea
                  value={composerText}
                  onChange={(event) => setComposerText(event.target.value)}
                  placeholder="给 AeroClaw 发送任务，或先导入文件让我读材料。"
                  rows={3}
                />
                <button className="send-button" onClick={() => void sendMessage()} disabled={isSending}>
                  <SendHorizonal size={18} />
                </button>
              </div>

              <div className="composer-meta">
                <span>
                  传输模式：{isOpenClawTransport ? 'OpenClaw-Compatible' : 'OpenAI-Compatible'}
                </span>
                {isOpenClawTransport ? (
                  <span>SessionKey：{currentConversation.gatewaySessionKey || currentAppState.gateway.sessionKey}</span>
                ) : null}
                <span>配置目录：{currentAppState.gateway.configDir}</span>
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
              <span className="eyebrow">PoorClaw 风格</span>
              <h2>模型与 Token 源</h2>
              <p>
                这里统一管理自定义 endpoint、模型名、API Key 和默认切换入口。
                {isOpenClawTransport ? ' 当前聊天已切到 OpenClaw Gateway 模式，模型配置由远端网关决定。' : ''}
              </p>
            </div>
            <button className="primary-button" onClick={() => openProviderManager()}>
              <Plus size={16} />
              新增模型源
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
              <h2>插件集成</h2>
              <p>先内置几类常用插件入口，同时为本地插件目录保留扩展位。</p>
            </div>
            <button
              className="ghost-button"
              onClick={() => void window.clawNest.revealInFinder(currentAppState.gateway.pluginsDir)}
            >
              <FolderKanban size={16} />
              打开插件目录
            </button>
            <button className="ghost-button" onClick={() => void createStarterAssets()}>
              <PlugZap size={16} />
              {isCreatingAssets ? '生成中' : '生成本地模板'}
            </button>
            <button className="ghost-button" onClick={() => void refreshStateFromDisk()}>
              <RefreshCw size={16} className={isRefreshingState ? 'spin' : ''} />
              刷新目录
            </button>
          </div>
          <div className="grid-cards">
            {currentAppState.plugins.map(renderPluginCard)}
            {gatewaySnapshot?.tools.map((tool) => (
              <article key={`gateway-tool-${tool.id}`} className="feature-card">
                <div className="feature-card__header">
                  <div>
                    <span className="provider-badge">{tool.source === 'plugin' ? 'Gateway Plugin' : 'Gateway Tool'}</span>
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
              <h2>技能目录</h2>
              <p>默认使用独立的 `~/.aeroclaw/skills`，与 `openclaw` 完全分离，可并行共存。</p>
            </div>
            <button
              className="ghost-button"
              onClick={() => void window.clawNest.revealInFinder(currentAppState.gateway.skillsDir)}
            >
              <FolderKanban size={16} />
              打开技能目录
            </button>
            <button className="ghost-button" onClick={() => void createStarterAssets()}>
              <Plus size={16} />
              {isCreatingAssets ? '生成中' : '生成技能模板'}
            </button>
            <button className="ghost-button" onClick={() => void refreshStateFromDisk()}>
              <RefreshCw size={16} className={isRefreshingState ? 'spin' : ''} />
              刷新目录
            </button>
          </div>
          <div className="grid-cards">
            {currentAppState.skills.map((skill) => (
              <article key={skill.id} className="feature-card">
                <div className="feature-card__header">
                  <div>
                    <span className="provider-badge">{skill.source === 'local' ? 'Local' : 'Bundled'}</span>
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
                    <span className="provider-badge">Gateway Skill</span>
                    <h3>{skill.name}</h3>
                  </div>
                </div>
                <p>{skill.description}</p>
                <small>
                  {skill.source}
                  {skill.eligible ? ' · eligible' : ' · unavailable'}
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
              <h2>定时任务</h2>
              <p>任务中心已预留，后续可以直接对接兼容网关，把自动化、频道任务和工作流都收进来。</p>
            </div>
          </div>
          <div className="grid-cards">
            <article className="feature-card">
              <div className="feature-card__header">
                <div>
                  <span className="provider-badge">Next</span>
                  <h3>每日情报整理</h3>
                </div>
              </div>
              <p>后续可直接把计划任务、频道消息、插件流程绑定到单独网关上运行。</p>
            </article>
            <article className="feature-card">
              <div className="feature-card__header">
                <div>
                  <span className="provider-badge">Ready</span>
                  <h3>双开隔离</h3>
                </div>
              </div>
              <p>`openclaw` 和 `AeroClaw` 未来可以分别连接不同端口和不同工作目录，避免相互污染。</p>
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
            <h2>设置</h2>
            <p>这里保留独立品牌名、独立目录、独立网关地址，确保它和 `openclaw` 能同时安装使用。</p>
          </div>
        </div>
        <div className="settings-form-card">
          <div className="feature-card__header">
            <div>
              <span className="provider-badge">Gateway Runtime</span>
              <h3>本地独立网关</h3>
            </div>
            <div className="provider-actions">
              <button className="ghost-button" onClick={() => void refreshGatewayStatus()}>
                <RefreshCw size={16} className={isUpdatingGatewayRuntime ? 'spin' : ''} />
                刷新状态
              </button>
              {gatewayStatus?.running ? (
                <button className="danger-button" onClick={() => void stopGateway()}>
                  <Square size={16} />
                  停止网关
                </button>
              ) : (
                <button className="primary-button" onClick={() => void startGateway()}>
                  <Play size={16} />
                  启动网关
                </button>
              )}
            </div>
          </div>
          <div className="settings-grid compact-grid">
            <article className="setting-card compact">
              <h3>运行状态</h3>
              <p>{gatewayStatus?.running ? '运行中' : '未启动'}</p>
            </article>
            <article className="setting-card compact">
              <h3>访问地址</h3>
              <p>{gatewayStatus?.url ?? `http://127.0.0.1:${currentAppState.gateway.port}`}</p>
            </article>
            <article className="setting-card compact">
              <h3>启动时间</h3>
              <p>{gatewayStatus?.startedAt ?? '尚未启动'}</p>
            </article>
            <article className="setting-card compact">
              <h3>最近错误</h3>
              <p>{gatewayStatus?.lastError ?? '无'}</p>
            </article>
          </div>
        </div>
        <div className="settings-form-card">
          <div className="feature-card__header">
            <div>
              <span className="provider-badge">Gateway</span>
              <h3>独立网关设置</h3>
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
                探测网关
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
                同步能力
              </button>
              <button className="primary-button" onClick={saveGatewaySettings}>
                <Save size={16} />
                保存设置
              </button>
            </div>
          </div>
          <div className="settings-form-grid">
            <label>
              <span>传输模式</span>
              <select
                value={settingsDraft.transport}
                onChange={(event) =>
                  setSettingsDraft((current) => ({
                    ...current,
                    transport: event.target.value as 'openai-compatible' | 'openclaw-compatible',
                  }))
                }
              >
                <option value="openai-compatible">OpenAI-Compatible</option>
                <option value="openclaw-compatible">OpenClaw-Compatible</option>
              </select>
            </label>
            <label>
              <span>默认端口</span>
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
              <span>默认网关地址</span>
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
              <span>Canvas 路径</span>
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
                placeholder="OpenClaw 共享 token，可为空"
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
                placeholder="如你的网关使用密码模式，在这里填写"
              />
            </label>
            <label className="full-span">
              <span>默认 SessionKey</span>
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
                <h3>探测结果</h3>
                <p>{gatewayProbe.ok ? '已连通' : '未连通'}</p>
              </article>
              <article className="setting-card compact">
                <h3>认证方式</h3>
                <p>{gatewayProbe.authMode ?? 'none'}</p>
              </article>
              <article className="setting-card compact">
                <h3>网关地址</h3>
                <p>{gatewayProbe.gatewayUrl ?? '尚未返回'}</p>
              </article>
              <article className="setting-card compact">
                <h3>检查时间</h3>
                <p>{gatewayProbe.checkedAt}</p>
              </article>
            </div>
          ) : null}
          {gatewaySnapshot ? (
            <div className="settings-grid compact-grid">
              <article className="setting-card compact">
                <h3>OpenClaw 会话</h3>
                <p>{gatewaySnapshot.sessions.length}</p>
              </article>
              <article className="setting-card compact">
                <h3>OpenClaw 技能</h3>
                <p>{gatewaySnapshot.skills.length}</p>
              </article>
              <article className="setting-card compact">
                <h3>OpenClaw 工具</h3>
                <p>{gatewaySnapshot.tools.length}</p>
              </article>
              <article className="setting-card compact">
                <h3>模型目录</h3>
                <p>{gatewaySnapshot.models.length}</p>
              </article>
            </div>
          ) : null}
        </div>
        <div className="settings-grid">
          <article className="setting-card">
            <h3>品牌名</h3>
            <p>{currentAppState.brandName}</p>
          </article>
          <article className="setting-card">
            <h3>配置文件</h3>
            <p>{currentAppState.gateway.configFile}</p>
          </article>
          <article className="setting-card">
            <h3>工作目录</h3>
            <p>{currentAppState.gateway.workspaceDir}</p>
          </article>
          <article className="setting-card">
            <h3>默认网关</h3>
            <p>
              {currentAppState.gateway.endpoint}:{currentAppState.gateway.port}
            </p>
          </article>
          <article className="setting-card">
            <h3>Canvas 路径</h3>
            <p>{currentAppState.gateway.canvasPath}</p>
          </article>
          <article className="setting-card">
            <h3>默认 SessionKey</h3>
            <p>{currentAppState.gateway.sessionKey}</p>
          </article>
          <article className="setting-card">
            <h3>独立目标</h3>
            <p>与 `openclaw` 目录、网关名、配置文件名全部分开。</p>
          </article>
          <article className="setting-card">
            <h3>插件目录</h3>
            <p>{currentAppState.gateway.pluginsDir}</p>
            <button
              className="ghost-button inline-setting-action"
              onClick={() => void window.clawNest.revealInFinder(currentAppState.gateway.pluginsDir)}
            >
              <FolderCog size={16} />
              打开目录
            </button>
          </article>
          <article className="setting-card">
            <h3>技能目录</h3>
            <p>{currentAppState.gateway.skillsDir}</p>
            <button
              className="ghost-button inline-setting-action"
              onClick={() => void window.clawNest.revealInFinder(currentAppState.gateway.skillsDir)}
            >
              <FolderCog size={16} />
              打开目录
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
            <p>独立的 macOS Claw 客户端</p>
          </div>
        </div>

        <button className="primary-button" onClick={createConversation}>
          <Plus size={16} />
          新对话
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
          <span className="eyebrow">Separated Workspace</span>
          <p>{currentAppState.gateway.configDir}</p>
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
        <div className="modal-backdrop" onClick={() => setProviderManagerOpen(false)}>
          <section className="provider-sheet" onClick={(event) => event.stopPropagation()}>
            <header className="provider-sheet__header">
              <div>
                <span className="eyebrow">Custom API Endpoint</span>
                <h2>{editingProvider ? '编辑模型源' : '新增模型源'}</h2>
              </div>
              <button className="icon-button" onClick={() => setProviderManagerOpen(false)} aria-label="关闭">
                <Wrench size={16} />
              </button>
            </header>

            <div className="provider-sheet__grid">
              <label>
                <span>显示名称</span>
                <input
                  value={providerDraft.label}
                  onChange={(event) =>
                    setProviderDraft((current) => (current ? { ...current, label: event.target.value } : current))
                  }
                  placeholder="例如：自定义 Qwen"
                />
              </label>
              <label>
                <span>Token 源名</span>
                <input
                  value={providerDraft.tokenSourceName}
                  onChange={(event) =>
                    setProviderDraft((current) =>
                      current ? { ...current, tokenSourceName: event.target.value } : current,
                    )
                  }
                  placeholder="例如：NVIDIA / SiliconFlow / 自建网关"
                />
              </label>
              <label className="full-span">
                <span>API URL</span>
                <input
                  value={providerDraft.baseUrl}
                  onChange={(event) =>
                    setProviderDraft((current) => (current ? { ...current, baseUrl: event.target.value } : current))
                  }
                  placeholder="https://api.example.com/v1"
                />
              </label>
              <label>
                <span>API Key</span>
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
                <span>模型名</span>
                <input
                  value={providerDraft.model}
                  onChange={(event) =>
                    setProviderDraft((current) => (current ? { ...current, model: event.target.value } : current))
                  }
                  placeholder="gpt-4o / qwen/qwen3-32b / deepseek-chat"
                />
              </label>
              <label className="full-span">
                <span>备注</span>
                <textarea
                  rows={3}
                  value={providerDraft.notes}
                  onChange={(event) =>
                    setProviderDraft((current) => (current ? { ...current, notes: event.target.value } : current))
                  }
                  placeholder="可选：记录这个 token 源的用途、限额或适配说明。"
                />
              </label>
            </div>

            <footer className="provider-sheet__footer">
              <button className="ghost-button" onClick={() => void runDraftProviderTest()}>
                <RefreshCw size={16} className={testingDraftProvider ? 'spin' : ''} />
                测试连接
              </button>
              <button className="ghost-button" onClick={() => setProviderManagerOpen(false)}>
                取消
              </button>
              <button className="primary-button" onClick={saveProvider}>
                保存
              </button>
            </footer>
          </section>
        </div>
      ) : null}
    </div>
  )
}

export default App
