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
  bootstrap: () => ipcRenderer.invoke('clawnest:bootstrap') as Promise<BootstrapPayload>,
  pickFiles: () => ipcRenderer.invoke('clawnest:pick-files') as Promise<ImportedAttachment[]>,
  revealInFinder: (targetPath: string) => ipcRenderer.invoke('clawnest:reveal-in-finder', targetPath),
  saveState: (state: AppState) => ipcRenderer.invoke('clawnest:save-state', state),
  sendChat: (request: ChatRequest) => ipcRenderer.invoke('clawnest:send-chat', request) as Promise<ChatResult>,
  testProvider: (provider: ModelProvider) =>
    ipcRenderer.invoke('clawnest:test-provider', provider) as Promise<ProviderTestResult>,
  createStarterAssets: () =>
    ipcRenderer.invoke('clawnest:create-starter-assets') as Promise<StarterAssetsResult>,
  getGatewayStatus: () => ipcRenderer.invoke('clawnest:get-gateway-status') as Promise<GatewayServiceStatus>,
  startGateway: () => ipcRenderer.invoke('clawnest:start-gateway') as Promise<GatewayServiceStatus>,
  stopGateway: () => ipcRenderer.invoke('clawnest:stop-gateway') as Promise<GatewayServiceStatus>,
}

contextBridge.exposeInMainWorld('clawNest', api)
