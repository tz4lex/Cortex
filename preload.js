const { contextBridge, ipcRenderer } = require("electron")
contextBridge.exposeInMainWorld("electronAPI", {
  navigate: (u) => ipcRenderer.invoke("navigate", u),
  back: () => ipcRenderer.invoke("back"),
  forward: () => ipcRenderer.invoke("forward"),
  reload: () => ipcRenderer.invoke("reload"),
  newTab: () => ipcRenderer.invoke("tab:new"),
  switchTab: (i) => ipcRenderer.invoke("tab:switch", i),
  closeTab: (i) => ipcRenderer.invoke("tab:close", i),
  refreshFilters: () => ipcRenderer.invoke("filters:refresh"),
  onTabs: (cb) => ipcRenderer.on("tabs", (e, tabs) => cb(tabs)),
  onFullScreen: (cb) => ipcRenderer.on("fullscreen", (e, f) => cb(f))
})
