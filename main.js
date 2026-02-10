const { app, BrowserWindow, BrowserView, ipcMain, globalShortcut, session } = require("electron")
const { ElectronBlocker } = require("@cliqz/adblocker-electron")
const { autoUpdater } = require("electron-updater")
const fetch = require("cross-fetch")
const path = require("path")

app.setName("Cortex")
app.disableHardwareAcceleration()

let win
let tabs = []
let activeTab = 0

const BAR_HEIGHT = 96
const PARTITION = "persist:cortex"

function normalize(input) {
  input = input.trim()
  if (/^https?:\/\//i.test(input)) return input
  if (input.includes(".") && !input.includes(" ")) return "https://" + input
  return "https://www.google.com/search?q=" + encodeURIComponent(input)
}

async function createWindow() {
  win = new BrowserWindow({
    width: 1200,
    height: 800,
    title: "Cortex",
    icon: path.join(__dirname, "assets/icon.png"),
    backgroundColor: "#0b0d12",
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      sandbox: true
    }
  })

  const blocker = await ElectronBlocker.fromLists(
    fetch,
    [
      "https://easylist.to/easylist/easylist.txt",
      "https://easylist.to/easylist/easyprivacy.txt"
    ],
    {
      path: path.join(app.getPath("userData"), "adblocker.bin"),
      enableCompression: true
    }
  )

  blocker.enableBlockingInSession(session.fromPartition(PARTITION))

  session.fromPartition(PARTITION).setPermissionRequestHandler((_, p, cb) => {
    if (p === "fullscreen" || p === "pointerLock") return cb(true)
    cb(false)
  })

  createTab("https://www.google.com")
  win.loadFile("index.html")

  win.on("resize", resizeTabs)
}

function createTab(url) {
  const view = new BrowserView({
    webPreferences: {
      partition: PARTITION,
      contextIsolation: true,
      sandbox: true,
      backgroundThrottling: true
    }
  })

  view.webContents.loadURL(url)
  view.webContents.on("did-navigate", sendTabs)
  view.webContents.on("did-navigate-in-page", sendTabs)
  view.webContents.on("enter-html-full-screen", () => win.setFullScreen(true))
  view.webContents.on("leave-html-full-screen", () => win.setFullScreen(false))

  tabs.push(view)
  setActiveTab(tabs.length - 1)
}

function setActiveTab(index) {
  if (!tabs[index]) return

  tabs.forEach((t, i) => {
    t.webContents.setBackgroundThrottling(i !== index)
  })

  win.setBrowserView(null)
  activeTab = index
  win.setBrowserView(tabs[activeTab])
  resizeTabs()
  sendTabs()
}

function closeTab(index) {
  if (!tabs[index]) return

  if (index === activeTab) win.setBrowserView(null)

  try {
    tabs[index].webContents.destroy()
  } catch {}

  tabs.splice(index, 1)
  activeTab = Math.max(0, activeTab - 1)

  if (tabs[activeTab]) win.setBrowserView(tabs[activeTab])

  resizeTabs()
  sendTabs()
}

function resizeTabs() {
  if (!tabs[activeTab]) return
  const b = win.getContentBounds()
  tabs[activeTab].setBounds({
    x: 0,
    y: BAR_HEIGHT,
    width: b.width,
    height: b.height - BAR_HEIGHT
  })
}

function sendTabs() {
  win.webContents.send("tabs", tabs.map((t, i) => ({
    id: i,
    url: t.webContents.getURL(),
    active: i === activeTab
  })))
}

ipcMain.handle("tab:new", () => createTab("https://www.google.com"))
ipcMain.handle("tab:switch", (_, i) => setActiveTab(i))
ipcMain.handle("tab:close", (_, i) => closeTab(i))
ipcMain.handle("navigate", (_, v) => tabs[activeTab].webContents.loadURL(normalize(v)))
ipcMain.handle("back", () => tabs[activeTab].webContents.canGoBack() && tabs[activeTab].webContents.goBack())
ipcMain.handle("forward", () => tabs[activeTab].webContents.canGoForward() && tabs[activeTab].webContents.goForward())
ipcMain.handle("reload", () => tabs[activeTab].webContents.reloadIgnoringCache())

app.whenReady().then(() => {
  createWindow()
  globalShortcut.register("F11", () => win.setFullScreen(!win.isFullScreen()))
  autoUpdater.checkForUpdatesAndNotify()
})

app.on("before-quit", () => {
  tabs.forEach(t => {
    try {
      t.webContents.destroy()
    } catch {}
  })
})

app.on("window-all-closed", () => {
  app.quit()
})