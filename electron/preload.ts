import { contextBridge, ipcRenderer } from 'electron'
import type {
  AppState,
  BootstrapPayload,
  ChatRequest,
  ChatResult,
  DesktopApi,
  GatewayServiceStatus,
  ImportedAttachment,
  ModelProvider,
  ProviderTestResult,
  StarterAssetsResult,
} from '../src/shared/schema'

const api: DesktopApi = {
  bootstrap: () => ipcRenderer.invoke('novaclaw:bootstrap') as Promise<BootstrapPayload>,
  pickFiles: () => ipcRenderer.invoke('novaclaw:pick-files') as Promise<ImportedAttachment[]>,
  revealInFinder: (targetPath: string) => ipcRenderer.invoke('novaclaw:reveal-in-finder', targetPath),
  saveState: (state: AppState) => ipcRenderer.invoke('novaclaw:save-state', state),
  sendChat: (request: ChatRequest) => ipcRenderer.invoke('novaclaw:send-chat', request) as Promise<ChatResult>,
  testProvider: (provider: ModelProvider) =>
    ipcRenderer.invoke('novaclaw:test-provider', provider) as Promise<ProviderTestResult>,
  createStarterAssets: () =>
    ipcRenderer.invoke('novaclaw:create-starter-assets') as Promise<StarterAssetsResult>,
  getGatewayStatus: () => ipcRenderer.invoke('novaclaw:get-gateway-status') as Promise<GatewayServiceStatus>,
  startGateway: () => ipcRenderer.invoke('novaclaw:start-gateway') as Promise<GatewayServiceStatus>,
  stopGateway: () => ipcRenderer.invoke('novaclaw:stop-gateway') as Promise<GatewayServiceStatus>,
}

contextBridge.exposeInMainWorld('clawNest', api)
