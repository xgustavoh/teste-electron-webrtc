const { app, BrowserWindow, ipcMain } = require("electron");
const path = require("path");
const events = require("./server/events");

function createWindow() {
  const win = new BrowserWindow({
    width: 800,
    height: 600,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
    },
  });
  win.loadFile(path.join(__dirname, "client/index.html"));
}

app.whenReady().then(() => {
  createWindow();

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});

ipcMain.handle("get-peer", events.getPeer);
ipcMain.handle("create-peer", events.createPeer);
ipcMain.handle("remove-peer", events.removePeer);
ipcMain.handle("get-framerate", events.getFramerate);
ipcMain.handle("set-framerate", events.setFramerate);

ipcMain.handle("start-record", events.startRecord);
ipcMain.handle("stop-record", events.stopRecord);
ipcMain.handle("get-record", events.getRecord);

ipcMain.handle("set-remove-description", events.setRemoteDescription);
ipcMain.handle("get-remove-description", events.getRemoteDescription);
