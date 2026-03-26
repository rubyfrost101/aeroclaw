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
  bootstrap: () => ipcRenderer.invoke('aeroclaw:bootstrap') as Promise<BootstrapPayload>,
  pickFiles: () => ipcRenderer.invoke('aeroclaw:pick-files') as Promise<ImportedAttachment[]>,
  revealInFinder: (targetPath: string) => ipcRenderer.invoke('aeroclaw:reveal-in-finder', targetPath),
  saveState: (state: AppState) => ipcRenderer.invoke('aeroclaw:save-state', state),
  sendChat: (request: ChatRequest) => ipcRenderer.invoke('aeroclaw:send-chat', request) as Promise<ChatResult>,
  testProvider: (provider: ModelProvider) =>
    ipcRenderer.invoke('aeroclaw:test-provider', provider) as Promise<ProviderTestResult>,
  createStarterAssets: () =>
    ipcRenderer.invoke('aeroclaw:create-starter-assets') as Promise<StarterAssetsResult>,
  getGatewayStatus: () => ipcRenderer.invoke('aeroclaw:get-gateway-status') as Promise<GatewayServiceStatus>,
  startGateway: () => ipcRenderer.invoke('aeroclaw:start-gateway') as Promise<GatewayServiceStatus>,
  stopGateway: () => ipcRenderer.invoke('aeroclaw:stop-gateway') as Promise<GatewayServiceStatus>,
}

contextBridge.exposeInMainWorld('clawNest', api)
