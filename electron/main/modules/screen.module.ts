import {
  BrowserWindow,
  screen,
  shell,
  systemPreferences,
  nativeTheme,
} from "electron";
import { platform } from "node:os";
import { app } from "electron";

export const screenModule = {
  // Contrôles de fenêtre
  minimize: async () => {
    const win = BrowserWindow.getFocusedWindow();
    if (win) win.minimize();
    return { success: true };
  },

  maximize: async () => {
    const win = BrowserWindow.getFocusedWindow();
    if (win) {
      if (win.isMaximized()) {
        win.unmaximize();
      } else {
        win.maximize();
      }
    }
    return { success: true };
  },

  close: async () => {
    const win = BrowserWindow.getFocusedWindow();
    if (win) win.close();
    return { success: true };
  },

  isMaximized: async () => {
    const win = BrowserWindow.getFocusedWindow();
    return { isMaximized: win ? win.isMaximized() : false };
  },

  // Informations système
  getSystemInfo: async () => {
    const displays = screen.getAllDisplays();
    const primaryDisplay = screen.getPrimaryDisplay();

    return {
      platform: platform(),
      isMac: process.platform === "darwin",
      isWindows: process.platform === "win32",
      isLinux: process.platform === "linux",
      isDevelopment:
        process.env.NODE_ENV === "development" ||
        !!process.env.VITE_DEV_SERVER_URL,
      isProduction: process.env.NODE_ENV === "production",
      screenSize: {
        width: primaryDisplay.size.width,
        height: primaryDisplay.size.height,
      },
      displayCount: displays.length,
      displays: displays.map((d) => ({
        id: d.id,
        bounds: d.bounds,
        workArea: d.workArea,
        scaleFactor: d.scaleFactor,
        colorDepth: d.colorDepth,
        size: d.size,
      })),
      theme: nativeTheme.shouldUseDarkColors ? "dark" : "light",
      appVersion: app.getVersion(),
      appName: app.getName(),
    };
  },

  // Contrôles de fenêtre spécifiques
  toggleFullScreen: async () => {
    const win = BrowserWindow.getFocusedWindow();
    if (win) {
      win.setFullScreen(!win.isFullScreen());
    }
    return { success: true };
  },

  isFullScreen: async () => {
    const win = BrowserWindow.getFocusedWindow();
    return { isFullScreen: win ? win.isFullScreen() : false };
  },

  // Open external links
  openExternal: async (_: any, url: string) => {
    await shell.openExternal(url);
    return { success: true };
  },

  // Dev tools (only in development)
  toggleDevTools: async () => {
    const win = BrowserWindow.getFocusedWindow();
    if (
      win &&
      (process.env.NODE_ENV === "development" ||
        !!process.env.VITE_DEV_SERVER_URL)
    ) {
      win.webContents.toggleDevTools();
    }
    return { success: true };
  },

  reload: async () => {
    const win = BrowserWindow.getFocusedWindow();
    if (win) win.reload();
    return { success: true };
  },

  // Get window state
  getWindowState: async () => {
    const win = BrowserWindow.getFocusedWindow();
    if (!win) return null;

    const [x, y] = win.getPosition();
    const [width, height] = win.getSize();

    return {
      x,
      y,
      width,
      height,
      isMaximized: win.isMaximized(),
      isFullScreen: win.isFullScreen(),
      isMinimized: win.isMinimized(),
      isVisible: win.isVisible(),
      isFocused: win.isFocused(),
    };
  },

  // Set window position and size
  setWindowBounds: async (
    _: any,
    bounds: { x?: number; y?: number; width?: number; height?: number },
  ) => {
    const win = BrowserWindow.getFocusedWindow();
    if (win) {
      const currentBounds = win.getBounds();
      win.setBounds({
        x: bounds.x ?? currentBounds.x,
        y: bounds.y ?? currentBounds.y,
        width: bounds.width ?? currentBounds.width,
        height: bounds.height ?? currentBounds.height,
      });
    }
    return { success: true };
  },

  OpneExternalLink: async (link: string) => {
    await shell.openExternal(link);
  },
};

// Exporter pour le manifest
export default screenModule;
