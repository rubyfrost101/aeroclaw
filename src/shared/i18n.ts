import type { AppLocale } from './schema'

export const LOCALE_OPTIONS: Array<{ value: AppLocale; label: string }> = [
  { value: 'en', label: 'English' },
  { value: 'zh-CN', label: '简体中文' },
  { value: 'ja', label: '日本語' },
]

export function normalizeLocale(locale?: string | null): AppLocale {
  if (locale === 'zh-CN' || locale === 'ja') {
    return locale
  }

  return 'en'
}

type UiCopy = {
  splashTitle: string
  splashLoading: string
  initFailedTitle: string
  restartPrompt: string
  nav: {
    chat: string
    models: string
    plugins: string
    skills: string
    tasks: string
    settings: string
  }
  sidebarTagline: string
  separatedWorkspace: string
  languageLabel: string
  languageUpdated: (language: string) => string
  languageSectionTitle: string
  languageSectionDescription: string
  gatewayEndpointRequired: string
  gatewayPortInvalid: string
  gatewayProbeFailed: string
  gatewaySyncSuccess: (skills: number, tools: number, sessions: number) => string
  gatewaySyncFailed: string
  newConversationTitle: string
  newConversationSummary: string
  newConversationMessage: string
  providerRequiredFields: string
  defaultTokenSourceName: string
  providerUpdated: string
  providerAdded: string
  refreshedState: string
  refreshStateFailed: string
  gatewayStatusReadFailed: string
  gatewayStarted: (url: string) => string
  gatewayStartFailed: string
  gatewayStopped: string
  gatewayStopFailed: string
  starterAssetsCreated: (count: number) => string
  starterAssetsSkipped: string
  starterAssetsFailed: string
  providerTestFailed: string
  gatewaySettingsUpdated: string
  importFilesFailed: string
  configureProviderFirst: string
  analyzeImportedFilesPrompt: string
  sendFailed: string
  failedRequestMessage: (message: string, useGateway: boolean) => string
  waitingNewTask: string
  customSource: string
  pendingApiUrl: string
  test: string
  setCurrent: string
  edit: string
  delete: string
  enabled: string
  disabled: string
  subConversations: string
  chatHeading: string
  newConversation: string
  newConversationAria: string
  currentConversation: string
  handoffPrompt: string
  assistantName: string
  youLabel: string
  systemLabel: string
  assistantTyping: string
  remove: string
  importFilesAria: string
  composerPlaceholder: string
  transportMode: string
  sessionKey: string
  configDirectory: string
  poorClawStyle: string
  modelsTitle: string
  modelsDescription: string
  modelsGatewaySuffix: string
  addProvider: string
  pluginsTitle: string
  pluginsDescription: string
  openPluginsDir: string
  creating: string
  createLocalTemplate: string
  refreshDirectory: string
  gatewayPlugin: string
  gatewayTool: string
  skillsTitle: string
  skillsDescription: string
  openSkillsDir: string
  createSkillTemplate: string
  local: string
  bundled: string
  gatewaySkill: string
  eligible: string
  unavailable: string
  tasksTitle: string
  tasksDescription: string
  dailyBriefing: string
  dailyBriefingDescription: string
  doubleIsolation: string
  doubleIsolationDescription: string
  settingsTitle: string
  settingsDescription: string
  gatewayRuntimeTitle: string
  refreshStatus: string
  stopGateway: string
  startGateway: string
  runtimeStatus: string
  running: string
  stopped: string
  accessUrl: string
  startedAt: string
  notStartedYet: string
  lastError: string
  none: string
  gatewaySettingsTitle: string
  probeGateway: string
  syncCapabilities: string
  saveSettings: string
  transportModeLabel: string
  defaultPort: string
  defaultGatewayEndpoint: string
  canvasPath: string
  sharedGatewayTokenPlaceholder: string
  gatewayPasswordPlaceholder: string
  probeResult: string
  connected: string
  disconnected: string
  authMode: string
  gatewayAddress: string
  notReturnedYet: string
  checkedAt: string
  openClawSessions: string
  openClawSkills: string
  openClawTools: string
  modelCatalog: string
  brandName: string
  configFile: string
  workspaceDir: string
  defaultGateway: string
  defaultSessionKey: string
  separationGoal: string
  separationDescription: string
  pluginsDir: string
  skillsDir: string
  openDirectory: string
  providerSheetEyebrow: string
  editProviderTitle: string
  addProviderTitle: string
  close: string
  displayName: string
  displayNamePlaceholder: string
  tokenSourceName: string
  tokenSourcePlaceholder: string
  apiUrl: string
  apiKey: string
  modelName: string
  notes: string
  notesPlaceholder: string
  testConnection: string
  cancel: string
  save: string
  currentSourceReady: string
}

type MainCopy = {
  builtinPlugins: Array<{ id: string; name: string; description: string }>
  builtinSkills: Array<{ id: string; name: string; description: string }>
  emptyAttachmentPreview: string
  truncatedPreview: (limit: number) => string
  imagePreview: string
  unsupportedFilePreview: (extension: string) => string
  localSkillDescription: (skillFile: string) => string
  localPluginDescription: string
  starterSkillContent: string
  starterPluginManifest: {
    name: string
    description: string
  }
  starterPluginReadme: string
  defaultProviderLabel: string
  defaultTokenSourceName: string
  defaultProviderNotes: string
  welcomeTitle: string
  welcomeSummary: string
  welcomeMessage: string
  attachmentBlock: (name: string, filePath: string, kind: string, preview: string) => string
  missingApiUrl: string
  missingModel: string
  requestFailed: (status: number, errorText: string) => string
  unreadableModelResponse: string
  providerTestMissingApiUrl: string
  providerTestMissingModel: string
  providerConnectedWithModel: (model: string) => string
  providerConnectedWithoutModel: (count: number, model: string) => string
  providerConnected: string
  providerModelsFailed: (status: number, detail: string) => string
  providerServiceUnavailable: string
  providerTestFailed: (message: string) => string
  providerChatProbeFailed: (status: number, detail: string) => string
  providerChatProbeSuccess: (model: string) => string
  providerChatProbeFallbackFailed: (message: string) => string
  localGatewayModeMessage: string
  filePickerTitle: string
  assistantSystemInstruction: string
}

const uiCopy: Record<AppLocale, UiCopy> = {
  en: {
    splashTitle: 'Preparing your standalone Claw workspace',
    splashLoading: 'Loading conversations, model sources, skills, and local settings.',
    initFailedTitle: 'Client initialization failed',
    restartPrompt: 'Please restart the app.',
    nav: {
      chat: 'Chats',
      models: 'Models',
      plugins: 'Plugins',
      skills: 'Skills',
      tasks: 'Tasks',
      settings: 'Settings',
    },
    sidebarTagline: 'A standalone macOS Claw client',
    separatedWorkspace: 'Separated Workspace',
    languageLabel: 'Language',
    languageUpdated: (language) => `Language switched to ${language}.`,
    languageSectionTitle: 'Display Language',
    languageSectionDescription: 'AeroClaw can switch between English, Simplified Chinese, and Japanese.',
    gatewayEndpointRequired: 'Please enter a gateway endpoint.',
    gatewayPortInvalid: 'Please enter a valid port.',
    gatewayProbeFailed: 'Gateway probe failed',
    gatewaySyncSuccess: (skills, tools, sessions) =>
      `Synced OpenClaw capabilities: ${skills} skills, ${tools} tools, ${sessions} sessions.`,
    gatewaySyncFailed: 'Failed to sync OpenClaw capabilities',
    newConversationTitle: 'New Chat',
    newConversationSummary: 'Ready for a new task',
    newConversationMessage:
      'Your new conversation is ready. Ask a question directly, or import a file first so I can read the material before helping.',
    providerRequiredFields: 'Please fill in at least the display name, model name, and API URL.',
    defaultTokenSourceName: 'Custom token source',
    providerUpdated: 'Model source updated.',
    providerAdded: 'New model source added.',
    refreshedState: 'Reloaded local configuration, plugins, and skills.',
    refreshStateFailed: 'Failed to refresh local state',
    gatewayStatusReadFailed: 'Failed to read gateway status',
    gatewayStarted: (url) => `Gateway started: ${url}`,
    gatewayStartFailed: 'Failed to start gateway',
    gatewayStopped: 'Gateway stopped.',
    gatewayStopFailed: 'Failed to stop gateway',
    starterAssetsCreated: (count) => `Created ${count} local starter files.`,
    starterAssetsSkipped: 'Starter files already exist, so nothing was overwritten.',
    starterAssetsFailed: 'Failed to create starter files',
    providerTestFailed: 'Model source test failed',
    gatewaySettingsUpdated: 'Standalone gateway settings updated.',
    importFilesFailed: 'Failed to import files',
    configureProviderFirst: 'Please configure a working model source from the top-right corner first.',
    analyzeImportedFilesPrompt: 'Please read and analyze my imported files first, then give me a structured conclusion.',
    sendFailed: 'Failed to send message',
    failedRequestMessage: (message, useGateway) =>
      `This request did not go through: ${message}\n\n` +
      (useGateway
        ? 'Check the OpenClaw Gateway endpoint, authentication, and session key in Settings, then try again.'
        : 'Check the API URL, API key, and model name in the model source panel, then try again.'),
    waitingNewTask: 'Waiting for a new task',
    customSource: 'Custom Source',
    pendingApiUrl: 'Waiting for API URL',
    test: 'Test',
    setCurrent: 'Set Current',
    edit: 'Edit',
    delete: 'Delete',
    enabled: 'Enabled',
    disabled: 'Disabled',
    subConversations: 'Sub-conversations',
    chatHeading: 'Chats',
    newConversation: 'New Chat',
    newConversationAria: 'Create conversation',
    currentConversation: 'Current conversation',
    handoffPrompt: 'Hand me your question, file, or task.',
    assistantName: 'AeroClaw',
    youLabel: 'You',
    systemLabel: 'System',
    assistantTyping: 'Calling the active model source and preparing the reply. One moment.',
    remove: 'Remove',
    importFilesAria: 'Import files',
    composerPlaceholder: 'Send a task to AeroClaw, or import files first so I can read the material.',
    transportMode: 'Transport Mode',
    sessionKey: 'SessionKey',
    configDirectory: 'Config Directory',
    poorClawStyle: 'PoorClaw Style',
    modelsTitle: 'Models and Token Sources',
    modelsDescription: 'Manage custom endpoints, model names, API keys, and the default switch target here.',
    modelsGatewaySuffix: 'The current chat is using OpenClaw Gateway mode, so model selection is controlled by the remote gateway.',
    addProvider: 'Add Model Source',
    pluginsTitle: 'Plugin Integrations',
    pluginsDescription: 'AeroClaw ships with a few common plugin entry points and keeps room for local plugins.',
    openPluginsDir: 'Open Plugins Directory',
    creating: 'Creating',
    createLocalTemplate: 'Create Starter Templates',
    refreshDirectory: 'Refresh Directory',
    gatewayPlugin: 'Gateway Plugin',
    gatewayTool: 'Gateway Tool',
    skillsTitle: 'Skills Directory',
    skillsDescription: 'AeroClaw uses its own `~/.aeroclaw/skills` directory so it can coexist with `openclaw` safely.',
    openSkillsDir: 'Open Skills Directory',
    createSkillTemplate: 'Create Skill Template',
    local: 'Local',
    bundled: 'Bundled',
    gatewaySkill: 'Gateway Skill',
    eligible: 'eligible',
    unavailable: 'unavailable',
    tasksTitle: 'Scheduled Tasks',
    tasksDescription:
      'The task center is reserved for future gateway automation, channel jobs, and workflow orchestration.',
    dailyBriefing: 'Daily Briefing Digest',
    dailyBriefingDescription:
      'Later we can bind scheduled jobs, channel messages, and plugin flows to a dedicated gateway.',
    doubleIsolation: 'Dual Workspace Isolation',
    doubleIsolationDescription:
      '`openclaw` and `AeroClaw` can use different ports and work directories so they do not interfere with each other.',
    settingsTitle: 'Settings',
    settingsDescription:
      'This app keeps its own brand, directories, and gateway address so it can be installed alongside `openclaw`.',
    gatewayRuntimeTitle: 'Standalone Local Gateway',
    refreshStatus: 'Refresh Status',
    stopGateway: 'Stop Gateway',
    startGateway: 'Start Gateway',
    runtimeStatus: 'Runtime Status',
    running: 'Running',
    stopped: 'Stopped',
    accessUrl: 'Access URL',
    startedAt: 'Started At',
    notStartedYet: 'Not started yet',
    lastError: 'Last Error',
    none: 'None',
    gatewaySettingsTitle: 'Standalone Gateway Settings',
    probeGateway: 'Probe Gateway',
    syncCapabilities: 'Sync Capabilities',
    saveSettings: 'Save Settings',
    transportModeLabel: 'Transport Mode',
    defaultPort: 'Default Port',
    defaultGatewayEndpoint: 'Default Gateway Endpoint',
    canvasPath: 'Canvas Path',
    sharedGatewayTokenPlaceholder: 'Shared OpenClaw token, optional',
    gatewayPasswordPlaceholder: 'If your gateway uses password mode, enter it here',
    probeResult: 'Probe Result',
    connected: 'Connected',
    disconnected: 'Disconnected',
    authMode: 'Auth Mode',
    gatewayAddress: 'Gateway Address',
    notReturnedYet: 'Not returned yet',
    checkedAt: 'Checked At',
    openClawSessions: 'OpenClaw Sessions',
    openClawSkills: 'OpenClaw Skills',
    openClawTools: 'OpenClaw Tools',
    modelCatalog: 'Model Catalog',
    brandName: 'Brand Name',
    configFile: 'Config File',
    workspaceDir: 'Workspace Directory',
    defaultGateway: 'Default Gateway',
    defaultSessionKey: 'Default SessionKey',
    separationGoal: 'Isolation Goal',
    separationDescription: 'Keep the directory names, gateway name, and config file names separate from `openclaw`.',
    pluginsDir: 'Plugins Directory',
    skillsDir: 'Skills Directory',
    openDirectory: 'Open Directory',
    providerSheetEyebrow: 'Custom API Endpoint',
    editProviderTitle: 'Edit Model Source',
    addProviderTitle: 'Add Model Source',
    close: 'Close',
    displayName: 'Display Name',
    displayNamePlaceholder: 'Example: Custom Qwen',
    tokenSourceName: 'Token Source Name',
    tokenSourcePlaceholder: 'Example: NVIDIA / SiliconFlow / Self-hosted Gateway',
    apiUrl: 'API URL',
    apiKey: 'API Key',
    modelName: 'Model Name',
    notes: 'Notes',
    notesPlaceholder: 'Optional: record what this token source is for, its limits, or compatibility notes.',
    testConnection: 'Test Connection',
    cancel: 'Cancel',
    save: 'Save',
    currentSourceReady: 'READY',
  },
  'zh-CN': {
    splashTitle: '准备你的独立 Claw 工作台',
    splashLoading: '正在加载会话、模型源、技能目录与本地配置。',
    initFailedTitle: '客户端初始化失败',
    restartPrompt: '请重新启动应用。',
    nav: {
      chat: '对话',
      models: '模型',
      plugins: '插件',
      skills: '技能',
      tasks: '定时任务',
      settings: '设置',
    },
    sidebarTagline: '独立的 macOS Claw 客户端',
    separatedWorkspace: '隔离工作区',
    languageLabel: '语言',
    languageUpdated: (language) => `语言已切换为 ${language}。`,
    languageSectionTitle: '界面语言',
    languageSectionDescription: 'AeroClaw 目前支持英文、简体中文和日文切换。',
    gatewayEndpointRequired: '请填写网关地址。',
    gatewayPortInvalid: '请填写有效端口。',
    gatewayProbeFailed: '网关探测失败',
    gatewaySyncSuccess: (skills, tools, sessions) =>
      `已同步 OpenClaw 能力：${skills} 个技能、${tools} 个工具、${sessions} 个会话。`,
    gatewaySyncFailed: '同步 OpenClaw 能力失败',
    newConversationTitle: '新对话',
    newConversationSummary: '准备开始新的任务',
    newConversationMessage: '新会话已经创建好了。你可以直接提问，也可以先导入一个文件，让我先读材料再帮你分析。',
    providerRequiredFields: '请至少填写名称、模型名和 API URL。',
    defaultTokenSourceName: '自定义 token 源',
    providerUpdated: '模型源已更新。',
    providerAdded: '新的模型源已添加。',
    refreshedState: '已重新加载本地配置、插件与技能目录。',
    refreshStateFailed: '刷新本地状态失败',
    gatewayStatusReadFailed: '读取网关状态失败',
    gatewayStarted: (url) => `网关已启动：${url}`,
    gatewayStartFailed: '启动网关失败',
    gatewayStopped: '网关已停止。',
    gatewayStopFailed: '停止网关失败',
    starterAssetsCreated: (count) => `已生成 ${count} 个本地模板文件。`,
    starterAssetsSkipped: '本地模板已经存在，没有重复覆盖。',
    starterAssetsFailed: '生成模板失败',
    providerTestFailed: '模型源测试失败',
    gatewaySettingsUpdated: '独立网关设置已更新。',
    importFilesFailed: '导入文件失败',
    configureProviderFirst: '请先在右上角配置一个可用的模型源。',
    analyzeImportedFilesPrompt: '请先阅读并分析我导入的文件，再给出结构化结论。',
    sendFailed: '发送失败',
    failedRequestMessage: (message, useGateway) =>
      `这次请求没有成功发出去：${message}\n\n` +
      (useGateway
        ? '你可以先检查设置页里的 OpenClaw Gateway 地址、认证信息和 sessionKey，然后再试一次。'
        : '你可以检查右上角模型源里的 API URL、API Key 和模型名是否正确，然后再试一次。'),
    waitingNewTask: '等待新的任务',
    customSource: '自定义源',
    pendingApiUrl: '等待配置 API URL',
    test: '测试',
    setCurrent: '设为当前',
    edit: '编辑',
    delete: '删除',
    enabled: '已启用',
    disabled: '已关闭',
    subConversations: '二级会话',
    chatHeading: '对话',
    newConversation: '新增对话',
    newConversationAria: '新增对话',
    currentConversation: '当前会话',
    handoffPrompt: '把问题、文件和任务交给我。',
    assistantName: 'AeroClaw',
    youLabel: '你',
    systemLabel: '系统',
    assistantTyping: '正在调用当前模型源并整理回答，请稍等。',
    remove: '移除',
    importFilesAria: '导入文件',
    composerPlaceholder: '给 AeroClaw 发送任务，或先导入文件让我读材料。',
    transportMode: '传输模式',
    sessionKey: 'SessionKey',
    configDirectory: '配置目录',
    poorClawStyle: 'PoorClaw 风格',
    modelsTitle: '模型与 Token 源',
    modelsDescription: '这里统一管理自定义 endpoint、模型名、API Key 和默认切换入口。',
    modelsGatewaySuffix: '当前聊天已切到 OpenClaw Gateway 模式，模型配置由远端网关决定。',
    addProvider: '新增模型源',
    pluginsTitle: '插件集成',
    pluginsDescription: '先内置几类常用插件入口，同时为本地插件目录保留扩展位。',
    openPluginsDir: '打开插件目录',
    creating: '生成中',
    createLocalTemplate: '生成本地模板',
    refreshDirectory: '刷新目录',
    gatewayPlugin: '网关插件',
    gatewayTool: '网关工具',
    skillsTitle: '技能目录',
    skillsDescription: '默认使用独立的 `~/.aeroclaw/skills`，与 `openclaw` 完全分离，可并行共存。',
    openSkillsDir: '打开技能目录',
    createSkillTemplate: '生成技能模板',
    local: '本地',
    bundled: '内置',
    gatewaySkill: '网关技能',
    eligible: '可用',
    unavailable: '不可用',
    tasksTitle: '定时任务',
    tasksDescription: '任务中心已预留，后续可以直接对接兼容网关，把自动化、频道任务和工作流都收进来。',
    dailyBriefing: '每日情报整理',
    dailyBriefingDescription: '后续可直接把计划任务、频道消息、插件流程绑定到单独网关上运行。',
    doubleIsolation: '双开隔离',
    doubleIsolationDescription: '`openclaw` 和 `AeroClaw` 未来可以分别连接不同端口和不同工作目录，避免相互污染。',
    settingsTitle: '设置',
    settingsDescription: '这里保留独立品牌名、独立目录、独立网关地址，确保它和 `openclaw` 能同时安装使用。',
    gatewayRuntimeTitle: '本地独立网关',
    refreshStatus: '刷新状态',
    stopGateway: '停止网关',
    startGateway: '启动网关',
    runtimeStatus: '运行状态',
    running: '运行中',
    stopped: '未启动',
    accessUrl: '访问地址',
    startedAt: '启动时间',
    notStartedYet: '尚未启动',
    lastError: '最近错误',
    none: '无',
    gatewaySettingsTitle: '独立网关设置',
    probeGateway: '探测网关',
    syncCapabilities: '同步能力',
    saveSettings: '保存设置',
    transportModeLabel: '传输模式',
    defaultPort: '默认端口',
    defaultGatewayEndpoint: '默认网关地址',
    canvasPath: 'Canvas 路径',
    sharedGatewayTokenPlaceholder: 'OpenClaw 共享 token，可为空',
    gatewayPasswordPlaceholder: '如你的网关使用密码模式，在这里填写',
    probeResult: '探测结果',
    connected: '已连通',
    disconnected: '未连通',
    authMode: '认证方式',
    gatewayAddress: '网关地址',
    notReturnedYet: '尚未返回',
    checkedAt: '检查时间',
    openClawSessions: 'OpenClaw 会话',
    openClawSkills: 'OpenClaw 技能',
    openClawTools: 'OpenClaw 工具',
    modelCatalog: '模型目录',
    brandName: '品牌名',
    configFile: '配置文件',
    workspaceDir: '工作目录',
    defaultGateway: '默认网关',
    defaultSessionKey: '默认 SessionKey',
    separationGoal: '独立目标',
    separationDescription: '与 `openclaw` 目录、网关名、配置文件名全部分开。',
    pluginsDir: '插件目录',
    skillsDir: '技能目录',
    openDirectory: '打开目录',
    providerSheetEyebrow: '自定义 API Endpoint',
    editProviderTitle: '编辑模型源',
    addProviderTitle: '新增模型源',
    close: '关闭',
    displayName: '显示名称',
    displayNamePlaceholder: '例如：自定义 Qwen',
    tokenSourceName: 'Token 源名',
    tokenSourcePlaceholder: '例如：NVIDIA / SiliconFlow / 自建网关',
    apiUrl: 'API URL',
    apiKey: 'API Key',
    modelName: '模型名',
    notes: '备注',
    notesPlaceholder: '可选：记录这个 token 源的用途、限额或适配说明。',
    testConnection: '测试连接',
    cancel: '取消',
    save: '保存',
    currentSourceReady: 'READY',
  },
  ja: {
    splashTitle: '独立した Claw ワークスペースを準備しています',
    splashLoading: '会話、モデルソース、スキル、ローカル設定を読み込んでいます。',
    initFailedTitle: 'クライアントの初期化に失敗しました',
    restartPrompt: 'アプリを再起動してください。',
    nav: {
      chat: '会話',
      models: 'モデル',
      plugins: 'プラグイン',
      skills: 'スキル',
      tasks: '定期タスク',
      settings: '設定',
    },
    sidebarTagline: '独立した macOS Claw クライアント',
    separatedWorkspace: '分離ワークスペース',
    languageLabel: '言語',
    languageUpdated: (language) => `表示言語を ${language} に切り替えました。`,
    languageSectionTitle: '表示言語',
    languageSectionDescription: 'AeroClaw は英語、簡体字中国語、日本語を切り替えられます。',
    gatewayEndpointRequired: 'ゲートウェイのエンドポイントを入力してください。',
    gatewayPortInvalid: '有効なポートを入力してください。',
    gatewayProbeFailed: 'ゲートウェイの確認に失敗しました',
    gatewaySyncSuccess: (skills, tools, sessions) =>
      `OpenClaw の機能を同期しました: スキル ${skills} 件、ツール ${tools} 件、セッション ${sessions} 件。`,
    gatewaySyncFailed: 'OpenClaw 機能の同期に失敗しました',
    newConversationTitle: '新しい会話',
    newConversationSummary: '新しいタスクの準備ができました',
    newConversationMessage:
      '新しい会話を作成しました。すぐに質問することも、先にファイルを読み込ませてから相談することもできます。',
    providerRequiredFields: '表示名、モデル名、API URL を少なくとも入力してください。',
    defaultTokenSourceName: 'カスタムトークンソース',
    providerUpdated: 'モデルソースを更新しました。',
    providerAdded: '新しいモデルソースを追加しました。',
    refreshedState: 'ローカル設定、プラグイン、スキルを再読み込みしました。',
    refreshStateFailed: 'ローカル状態の更新に失敗しました',
    gatewayStatusReadFailed: 'ゲートウェイ状態の取得に失敗しました',
    gatewayStarted: (url) => `ゲートウェイを起動しました: ${url}`,
    gatewayStartFailed: 'ゲートウェイの起動に失敗しました',
    gatewayStopped: 'ゲートウェイを停止しました。',
    gatewayStopFailed: 'ゲートウェイの停止に失敗しました',
    starterAssetsCreated: (count) => `ローカルのスターターファイルを ${count} 件生成しました。`,
    starterAssetsSkipped: 'スターターファイルは既に存在するため、上書きしませんでした。',
    starterAssetsFailed: 'スターターファイルの生成に失敗しました',
    providerTestFailed: 'モデルソースの接続テストに失敗しました',
    gatewaySettingsUpdated: '独立ゲートウェイ設定を更新しました。',
    importFilesFailed: 'ファイルの読み込みに失敗しました',
    configureProviderFirst: '右上から利用可能なモデルソースを先に設定してください。',
    analyzeImportedFilesPrompt: 'まず読み込んだファイルを読んで分析し、そのうえで構造化した結論を返してください。',
    sendFailed: '送信に失敗しました',
    failedRequestMessage: (message, useGateway) =>
      `今回のリクエストは送信できませんでした: ${message}\n\n` +
      (useGateway
        ? '設定画面で OpenClaw Gateway のアドレス、認証情報、SessionKey を確認してから再試行してください。'
        : '右上のモデルソースで API URL、API Key、モデル名が正しいか確認してから再試行してください。'),
    waitingNewTask: '新しいタスクを待機中',
    customSource: 'カスタムソース',
    pendingApiUrl: 'API URL 未設定',
    test: 'テスト',
    setCurrent: '現在に設定',
    edit: '編集',
    delete: '削除',
    enabled: '有効',
    disabled: '無効',
    subConversations: 'サブ会話',
    chatHeading: '会話',
    newConversation: '新しい会話',
    newConversationAria: '会話を追加',
    currentConversation: '現在の会話',
    handoffPrompt: '質問、ファイル、タスクをここに渡してください。',
    assistantName: 'AeroClaw',
    youLabel: 'あなた',
    systemLabel: 'システム',
    assistantTyping: '現在のモデルソースを呼び出して回答を整理しています。少しお待ちください。',
    remove: '削除',
    importFilesAria: 'ファイルを読み込む',
    composerPlaceholder: 'AeroClaw にタスクを送るか、先にファイルを読み込ませて内容を読ませてください。',
    transportMode: '転送モード',
    sessionKey: 'SessionKey',
    configDirectory: '設定ディレクトリ',
    poorClawStyle: 'PoorClaw スタイル',
    modelsTitle: 'モデルとトークンソース',
    modelsDescription: 'カスタム endpoint、モデル名、API Key、デフォルト切り替え先をここで管理します。',
    modelsGatewaySuffix: '現在の会話は OpenClaw Gateway モードなので、モデル設定はリモート側で管理されます。',
    addProvider: 'モデルソースを追加',
    pluginsTitle: 'プラグイン連携',
    pluginsDescription: 'よく使う入口をいくつか内蔵しつつ、ローカルプラグイン用の拡張余地も残しています。',
    openPluginsDir: 'プラグインディレクトリを開く',
    creating: '生成中',
    createLocalTemplate: 'スターターテンプレートを生成',
    refreshDirectory: 'ディレクトリを更新',
    gatewayPlugin: 'Gateway Plugin',
    gatewayTool: 'Gateway Tool',
    skillsTitle: 'スキルディレクトリ',
    skillsDescription: 'AeroClaw は `~/.aeroclaw/skills` を使うため、`openclaw` と安全に共存できます。',
    openSkillsDir: 'スキルディレクトリを開く',
    createSkillTemplate: 'スキルテンプレートを生成',
    local: 'ローカル',
    bundled: '内蔵',
    gatewaySkill: 'Gateway Skill',
    eligible: '利用可能',
    unavailable: '利用不可',
    tasksTitle: '定期タスク',
    tasksDescription: '将来的なゲートウェイ自動化、チャネル処理、ワークフロー連携のための領域です。',
    dailyBriefing: '毎日の情報整理',
    dailyBriefingDescription: '今後は定期ジョブ、チャネルメッセージ、プラグインフローを専用ゲートウェイに束ねられます。',
    doubleIsolation: '二重分離',
    doubleIsolationDescription:
      '`openclaw` と `AeroClaw` は別のポートと作業ディレクトリを使えるので、互いに干渉しません。',
    settingsTitle: '設定',
    settingsDescription:
      '独立したブランド、ディレクトリ、ゲートウェイアドレスを保持し、`openclaw` と並行利用できるようにしています。',
    gatewayRuntimeTitle: 'ローカル独立ゲートウェイ',
    refreshStatus: '状態を更新',
    stopGateway: 'ゲートウェイ停止',
    startGateway: 'ゲートウェイ起動',
    runtimeStatus: '実行状態',
    running: '稼働中',
    stopped: '停止中',
    accessUrl: 'アクセス URL',
    startedAt: '起動時刻',
    notStartedYet: 'まだ起動していません',
    lastError: '直近のエラー',
    none: 'なし',
    gatewaySettingsTitle: '独立ゲートウェイ設定',
    probeGateway: 'ゲートウェイ確認',
    syncCapabilities: '機能を同期',
    saveSettings: '設定を保存',
    transportModeLabel: '転送モード',
    defaultPort: 'デフォルトポート',
    defaultGatewayEndpoint: 'デフォルトゲートウェイ',
    canvasPath: 'Canvas パス',
    sharedGatewayTokenPlaceholder: '共有 OpenClaw トークン。任意です',
    gatewayPasswordPlaceholder: 'ゲートウェイがパスワード方式ならここに入力してください',
    probeResult: '確認結果',
    connected: '接続済み',
    disconnected: '未接続',
    authMode: '認証方式',
    gatewayAddress: 'ゲートウェイアドレス',
    notReturnedYet: 'まだ返っていません',
    checkedAt: '確認時刻',
    openClawSessions: 'OpenClaw セッション',
    openClawSkills: 'OpenClaw スキル',
    openClawTools: 'OpenClaw ツール',
    modelCatalog: 'モデル一覧',
    brandName: 'ブランド名',
    configFile: '設定ファイル',
    workspaceDir: '作業ディレクトリ',
    defaultGateway: 'デフォルトゲートウェイ',
    defaultSessionKey: 'デフォルト SessionKey',
    separationGoal: '分離方針',
    separationDescription: '`openclaw` とディレクトリ名、ゲートウェイ名、設定ファイル名を分離します。',
    pluginsDir: 'プラグインディレクトリ',
    skillsDir: 'スキルディレクトリ',
    openDirectory: 'ディレクトリを開く',
    providerSheetEyebrow: 'カスタム API Endpoint',
    editProviderTitle: 'モデルソースを編集',
    addProviderTitle: 'モデルソースを追加',
    close: '閉じる',
    displayName: '表示名',
    displayNamePlaceholder: '例: Custom Qwen',
    tokenSourceName: 'トークンソース名',
    tokenSourcePlaceholder: '例: NVIDIA / SiliconFlow / 自前 Gateway',
    apiUrl: 'API URL',
    apiKey: 'API Key',
    modelName: 'モデル名',
    notes: 'メモ',
    notesPlaceholder: '任意: このトークンソースの用途、上限、互換性メモを残せます。',
    testConnection: '接続テスト',
    cancel: 'キャンセル',
    save: '保存',
    currentSourceReady: 'READY',
  },
}

const mainCopy: Record<AppLocale, MainCopy> = {
  en: {
    builtinPlugins: [
      {
        id: 'builtin-file-inspector',
        name: 'File Insight',
        description: 'After you upload text, spreadsheets, PDFs, or documents, AeroClaw highlights key points, summaries, and follow-ups first.',
      },
      {
        id: 'builtin-web-brief',
        name: 'Web Brief',
        description: 'A reserved plugin entry for future browser automation and web collection workflows.',
      },
      {
        id: 'builtin-spreadsheet-analyst',
        name: 'Spreadsheet Analyst',
        description: 'Provides a structured preview for CSV and Excel files so you can continue analysis naturally.',
      },
    ],
    builtinSkills: [
      {
        id: 'bundled-chat-ops',
        name: 'Conversation Orchestration',
        description: 'Helps break complex goals into sub-conversations and execution steps.',
      },
      {
        id: 'bundled-file-analysis',
        name: 'File Analysis',
        description: 'Extracts text from imported files and injects it into the current conversation context.',
      },
      {
        id: 'bundled-gateway-ready',
        name: 'Gateway Compatibility',
        description: 'Keeps an OpenClaw-compatible gateway path ready while staying fully separate in name and directories.',
      },
    ],
    emptyAttachmentPreview: 'The file was imported, but no usable text content was extracted.',
    truncatedPreview: (limit) => `[Content truncated. Only the first ${limit} characters are kept for analysis]`,
    imagePreview: 'This is an image file. The current version keeps the file metadata and can connect OCR or vision plugins later.',
    unsupportedFilePreview: (extension) =>
      `Deep parsing for ${extension || 'this file type'} is not built in yet, so AeroClaw will pass the file name and path to the model as reference.`,
    localSkillDescription: (skillFile) => `Local skill loaded from ${skillFile}.`,
    localPluginDescription: 'Extension discovered from the local plugins directory.',
    starterSkillContent: `# Starter Analysis Skill

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
    starterPluginManifest: {
      name: 'Starter Bridge',
      description: 'A local AeroClaw plugin placeholder for future gateway or workflow integrations.',
    },
    starterPluginReadme: `# Starter Bridge

This folder is a starter local plugin for AeroClaw.

Use it to describe:
- what the plugin should do
- which local service or gateway it talks to
- what inputs and outputs it expects

AeroClaw discovers this folder from ~/.aeroclaw/plugins and keeps it separate from openclaw directories.
`,
    defaultProviderLabel: 'Custom OpenAI-Compatible',
    defaultTokenSourceName: 'Custom token source',
    defaultProviderNotes: 'Replace the API URL, API key, and model name with your own source after installation.',
    welcomeTitle: 'Welcome to AeroClaw',
    welcomeSummary: 'Separate directories, separate gateway, ready once you add your token source',
    welcomeMessage:
      'This is your standalone `AeroClaw` workspace. It uses different configuration, plugin, and skill directories from `openclaw`, so both apps can be installed and run at the same time.\n\n' +
      'You can configure a custom token source from the top-right corner and start chatting right away, or import files first so I can analyze them with you.',
    attachmentBlock: (name, filePath, kind, preview) =>
      `### Imported File: ${name}\nPath: ${filePath}\nType: ${kind}\nPreview:\n${preview}`,
    missingApiUrl: 'The current model source is missing an API URL.',
    missingModel: 'The current model source is missing a model name.',
    requestFailed: (status, errorText) => `Model request failed (${status}): ${errorText}`,
    unreadableModelResponse: 'The model response did not include readable content.',
    providerTestMissingApiUrl: 'Missing API URL.',
    providerTestMissingModel: 'Missing model name.',
    providerConnectedWithModel: (model) => `Connection succeeded and ${model} was found in the model list.`,
    providerConnectedWithoutModel: (count, model) =>
      `Connection succeeded and ${count} models were returned, but ${model} was not listed directly.`,
    providerConnected: 'Connection succeeded and the endpoint is reachable.',
    providerModelsFailed: (status, detail) => `Connection failed (${status}): ${detail || 'Unable to access /models'}`,
    providerServiceUnavailable: 'Unable to reach the model service',
    providerTestFailed: (message) => `Connection failed: ${message}`,
    providerChatProbeFailed: (status, detail) =>
      `Connection failed (${status}): ${detail || 'chat/completions probe failed'}`,
    providerChatProbeSuccess: (model) => `Connection succeeded. ${model} passed the chat endpoint probe.`,
    providerChatProbeFallbackFailed: (message) => `Connection failed: ${message}`,
    localGatewayModeMessage:
      'This is AeroClaw standalone local gateway mode. Start the local gateway to access the compatible endpoints.',
    filePickerTitle: 'Import files for AeroClaw to analyze',
    assistantSystemInstruction:
      'You are AeroClaw, a standalone macOS AI workspace compatible with OpenAI-style APIs. Answer in English unless the user clearly asks otherwise. Summarize attached files faithfully and call out uncertainty.',
  },
  'zh-CN': {
    builtinPlugins: [
      {
        id: 'builtin-file-inspector',
        name: '文件洞察',
        description: '上传文本、表格、PDF 或文档后，优先整理重点、摘要和待确认项。',
      },
      {
        id: 'builtin-web-brief',
        name: '网页速读',
        description: '为后续接入浏览器自动化和网页采集预留插件入口。',
      },
      {
        id: 'builtin-spreadsheet-analyst',
        name: '表格分析师',
        description: '针对 CSV / Excel 提供结构化预览，方便继续提问分析。',
      },
    ],
    builtinSkills: [
      {
        id: 'bundled-chat-ops',
        name: '对话编排',
        description: '帮助你把复杂目标拆成多个二级对话与执行步骤。',
      },
      {
        id: 'bundled-file-analysis',
        name: '文件分析',
        description: '导入文件时自动提取文本内容，并注入本轮对话上下文。',
      },
      {
        id: 'bundled-gateway-ready',
        name: '兼容网关',
        description: '预留 OpenClaw-compatible 网关接入位，但目录与名称完全独立。',
      },
    ],
    emptyAttachmentPreview: '文件已导入，但没有提取到可用文本内容。',
    truncatedPreview: (limit) => `[内容已截断，仅保留前 ${limit} 个字符用于分析]`,
    imagePreview: '这是一个图片文件。当前版本先保留文件元信息，后续可继续接入 OCR / 视觉分析插件。',
    unsupportedFilePreview: (extension) =>
      `暂未内置 ${extension || '该类型'} 文件的深度解析，会把文件名和路径一起提供给模型参考。`,
    localSkillDescription: (skillFile) => `来自 ${skillFile} 的本地技能。`,
    localPluginDescription: '来自本地插件目录的扩展。',
    starterSkillContent: `# Starter Analysis Skill

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
    starterPluginManifest: {
      name: 'Starter Bridge',
      description: 'A local AeroClaw plugin placeholder for future gateway or workflow integrations.',
    },
    starterPluginReadme: `# Starter Bridge

This folder is a starter local plugin for AeroClaw.

Use it to describe:
- what the plugin should do
- which local service or gateway it talks to
- what inputs and outputs it expects

AeroClaw discovers this folder from ~/.aeroclaw/plugins and keeps it separate from openclaw directories.
`,
    defaultProviderLabel: '自定义 OpenAI-Compatible',
    defaultTokenSourceName: '自定义 token 源',
    defaultProviderNotes: '安装后只需要换成你自己的 API URL、API Key 和模型名即可使用。',
    welcomeTitle: '欢迎使用 AeroClaw',
    welcomeSummary: '独立目录、独立网关、安装后配 token 即可用',
    welcomeMessage:
      '这是你的独立 `AeroClaw` 工作台。它和 `openclaw` 使用不同的配置目录、插件目录和技能目录，所以可以同时安装、同时运行。\n\n' +
      '你现在可以先在右上角配置一个自定义 token 源，然后直接聊天；也可以先导入文件，让我根据文档内容再帮你分析。',
    attachmentBlock: (name, filePath, kind, preview) =>
      `### 导入文件：${name}\n路径：${filePath}\n类型：${kind}\n内容预览：\n${preview}`,
    missingApiUrl: '当前模型源缺少 API URL。',
    missingModel: '当前模型源缺少模型名。',
    requestFailed: (status, errorText) => `模型请求失败 (${status})：${errorText}`,
    unreadableModelResponse: '模型响应中没有可读内容。',
    providerTestMissingApiUrl: '缺少 API URL。',
    providerTestMissingModel: '缺少模型名。',
    providerConnectedWithModel: (model) => `连接成功，模型列表里已找到 ${model}。`,
    providerConnectedWithoutModel: (count, model) => `连接成功，拉取到 ${count} 个模型，但未直接看到 ${model}。`,
    providerConnected: '连接成功，接口可访问。',
    providerModelsFailed: (status, detail) => `连接失败 (${status})：${detail || '无法访问 /models'}`,
    providerServiceUnavailable: '无法访问模型服务',
    providerTestFailed: (message) => `连接失败：${message}`,
    providerChatProbeFailed: (status, detail) =>
      `连接失败 (${status})：${detail || 'chat/completions 探测失败'}`,
    providerChatProbeSuccess: (model) => `连接成功，${model} 已通过对话接口探测。`,
    providerChatProbeFallbackFailed: (message) => `连接失败：${message}`,
    localGatewayModeMessage: '当前是 AeroClaw 的独立本地网关模式。启动本地网关后即可访问兼容接口。',
    filePickerTitle: '导入文件给 AeroClaw 分析',
    assistantSystemInstruction:
      'You are AeroClaw, a standalone macOS AI workspace compatible with OpenAI-style APIs. Answer in Chinese unless the user clearly asks otherwise. Summarize attached files faithfully and call out uncertainty.',
  },
  ja: {
    builtinPlugins: [
      {
        id: 'builtin-file-inspector',
        name: 'ファイル洞察',
        description: 'テキスト、表計算、PDF、文書を読み込んだあと、要点、要約、確認事項を優先して整理します。',
      },
      {
        id: 'builtin-web-brief',
        name: 'Web 要約',
        description: '今後のブラウザ自動化や Web 収集のための予約プラグイン入口です。',
      },
      {
        id: 'builtin-spreadsheet-analyst',
        name: '表計算アナリスト',
        description: 'CSV / Excel に対して構造化プレビューを提供し、そのまま分析を続けやすくします。',
      },
    ],
    builtinSkills: [
      {
        id: 'bundled-chat-ops',
        name: '会話オーケストレーション',
        description: '複雑な目標をサブ会話と実行ステップに分解するのを助けます。',
      },
      {
        id: 'bundled-file-analysis',
        name: 'ファイル分析',
        description: '読み込んだファイルからテキストを抽出し、現在の会話コンテキストに注入します。',
      },
      {
        id: 'bundled-gateway-ready',
        name: '互換ゲートウェイ',
        description: 'OpenClaw 互換のゲートウェイ経路を確保しつつ、名称とディレクトリは完全に分離します。',
      },
    ],
    emptyAttachmentPreview: 'ファイルは読み込まれましたが、利用できるテキストは抽出できませんでした。',
    truncatedPreview: (limit) => `[内容を切り詰めました。解析には先頭 ${limit} 文字のみを使用します]`,
    imagePreview: 'これは画像ファイルです。現在はメタ情報のみ保持し、今後 OCR や画像解析プラグインに接続できます。',
    unsupportedFilePreview: (extension) =>
      `${extension || 'この種類の'} ファイルの詳細解析はまだ内蔵していないため、ファイル名とパスをモデルへの参考情報として渡します。`,
    localSkillDescription: (skillFile) => `${skillFile} から読み込まれたローカルスキルです。`,
    localPluginDescription: 'ローカルプラグインディレクトリから見つかった拡張です。',
    starterSkillContent: `# Starter Analysis Skill

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
    starterPluginManifest: {
      name: 'Starter Bridge',
      description: '将来の gateway や workflow 連携のための AeroClaw ローカルプラグイン雛形です。',
    },
    starterPluginReadme: `# Starter Bridge

This folder is a starter local plugin for AeroClaw.

Use it to describe:
- what the plugin should do
- which local service or gateway it talks to
- what inputs and outputs it expects

AeroClaw discovers this folder from ~/.aeroclaw/plugins and keeps it separate from openclaw directories.
`,
    defaultProviderLabel: 'カスタム OpenAI-Compatible',
    defaultTokenSourceName: 'カスタムトークンソース',
    defaultProviderNotes: 'インストール後に API URL、API Key、モデル名をあなた自身のものへ置き換えてください。',
    welcomeTitle: 'AeroClaw へようこそ',
    welcomeSummary: 'ディレクトリもゲートウェイも分離され、トークンソースを追加すれば使えます',
    welcomeMessage:
      'これはあなた専用の独立した `AeroClaw` ワークスペースです。`openclaw` とは設定、プラグイン、スキルの各ディレクトリが異なるため、両方を同時にインストールして実行できます。\n\n' +
      '右上でカスタムトークンソースを設定してすぐに会話を始めることも、先にファイルを読み込ませて分析させることもできます。',
    attachmentBlock: (name, filePath, kind, preview) =>
      `### 読み込みファイル: ${name}\nパス: ${filePath}\n種類: ${kind}\nプレビュー:\n${preview}`,
    missingApiUrl: '現在のモデルソースに API URL がありません。',
    missingModel: '現在のモデルソースにモデル名がありません。',
    requestFailed: (status, errorText) => `モデルリクエストに失敗しました (${status}): ${errorText}`,
    unreadableModelResponse: 'モデル応答に読める内容がありませんでした。',
    providerTestMissingApiUrl: 'API URL がありません。',
    providerTestMissingModel: 'モデル名がありません。',
    providerConnectedWithModel: (model) => `接続に成功し、モデル一覧で ${model} を確認できました。`,
    providerConnectedWithoutModel: (count, model) =>
      `接続には成功し ${count} 件のモデルが取得できましたが、${model} は一覧に直接見つかりませんでした。`,
    providerConnected: '接続に成功し、エンドポイントへ到達できました。',
    providerModelsFailed: (status, detail) => `接続失敗 (${status}): ${detail || '/models にアクセスできませんでした'}`,
    providerServiceUnavailable: 'モデルサービスにアクセスできません',
    providerTestFailed: (message) => `接続失敗: ${message}`,
    providerChatProbeFailed: (status, detail) =>
      `接続失敗 (${status}): ${detail || 'chat/completions の確認に失敗しました'}`,
    providerChatProbeSuccess: (model) => `接続に成功し、${model} は対話エンドポイントの確認を通過しました。`,
    providerChatProbeFallbackFailed: (message) => `接続失敗: ${message}`,
    localGatewayModeMessage:
      '現在は AeroClaw の独立ローカルゲートウェイモードです。互換エンドポイントにアクセスするにはローカルゲートウェイを起動してください。',
    filePickerTitle: 'AeroClaw に分析させるファイルを読み込む',
    assistantSystemInstruction:
      'You are AeroClaw, a standalone macOS AI workspace compatible with OpenAI-style APIs. Answer in Japanese unless the user clearly asks otherwise. Summarize attached files faithfully and call out uncertainty.',
  },
}

export function getUiCopy(locale: AppLocale): UiCopy {
  return uiCopy[normalizeLocale(locale)]
}

export function getMainCopy(locale: AppLocale): MainCopy {
  return mainCopy[normalizeLocale(locale)]
}
