const { contextBridge, ipcRenderer } = require("electron")

contextBridge.exposeInMainWorld("browser", {
  navigate: v => ipcRenderer.invoke("navigate", v),
  back: () => ipcRenderer.invoke("back"),
  forward: () => ipcRenderer.invoke("forward"),
  reload: () => ipcRenderer.invoke("reload"),
  newTab: () => ipcRenderer.invoke("tab:new"),
  closeTab: i => ipcRenderer.invoke("tab:close", i),
  switchTab: i => ipcRenderer.invoke("tab:switch", i),
  onTabs: cb => ipcRenderer.on("tabs", (_, t) => cb(t))
})