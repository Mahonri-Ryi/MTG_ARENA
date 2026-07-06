import { join } from "node:path";
import { existsSync } from "node:fs";
import { app, BrowserWindow, ipcMain, screen } from "electron";

import {
  CachedCardSource,
  Coach,
  LocalCardSource,
  ScryfallCardSource,
  parseLogText,
  sampleCards,
  sampleLogText,
  sampleRatings,
  type MatchState,
  type PickRecommendation
} from "@mtg-coach/core";
import { LogWatcher, defaultMtgaLogPath } from "@mtg-coach/core/node";

interface CoachUpdate {
  mode: "live" | "demo";
  logPath: string | null;
  committedColors: string[];
  recommendation: PickRecommendation | null;
  matchState: MatchState | null;
}

let mainWindow: BrowserWindow | null = null;
let watcher: LogWatcher | null = null;

function buildCoach(): Coach {
  // Scryfall for real card data; fall back to the bundled sample set so the
  // overlay is fully functional offline (e.g. this dev VM).
  const cards = new CachedCardSource(
    new ScryfallCardSource(),
    new LocalCardSource(sampleCards),
    sampleCards
  );
  return new Coach(cards, { ratings: sampleRatings, colorCommitmentWeight: 8 });
}

function sendUpdate(update: CoachUpdate): void {
  mainWindow?.webContents.send("coach:update", update);
}

async function runDemo(): Promise<void> {
  const coach = buildCoach();
  await coach.ingestLog(sampleLogText);
  sendUpdate({
    mode: "demo",
    logPath: null,
    committedColors: coach.committedColors,
    recommendation: coach.lastRecommendation,
    matchState: coach.matchState
  });
}

async function runLive(logPath: string): Promise<void> {
  const coach = buildCoach();
  watcher = new LogWatcher(logPath);
  const push = () =>
    sendUpdate({
      mode: "live",
      logPath,
      committedColors: coach.committedColors,
      recommendation: coach.lastRecommendation,
      matchState: coach.matchState
    });

  // Parse whatever is already in the log, then react to appended lines.
  watcher.onEvent(async (event) => {
    await coach.applyEvent(event);
    push();
  });
  await watcher.start(true);
  push();
}

async function startCoaching(): Promise<void> {
  const logPath = defaultMtgaLogPath();
  if (logPath && existsSync(logPath)) {
    await runLive(logPath);
  } else {
    // No live MTGA log on this platform: demonstrate with the sample draft.
    await runDemo();
  }
}

function createWindow(): void {
  const { workAreaSize } = screen.getPrimaryDisplay();
  const width = 440;
  const height = 680;

  mainWindow = new BrowserWindow({
    width,
    height,
    x: Math.max(0, workAreaSize.width - width - 24),
    y: 24,
    frame: false,
    transparent: true,
    resizable: true,
    alwaysOnTop: true,
    skipTaskbar: false,
    backgroundColor: "#00000000",
    title: "MTG Arena Coach",
    webPreferences: {
      preload: join(__dirname, "../preload/index.js"),
      sandbox: false
    }
  });

  mainWindow.setAlwaysOnTop(true, "screen-saver");

  if (process.env.ELECTRON_RENDERER_URL) {
    mainWindow.loadURL(process.env.ELECTRON_RENDERER_URL);
  } else {
    mainWindow.loadFile(join(__dirname, "../renderer/index.html"));
  }

  mainWindow.webContents.on("did-finish-load", () => {
    void startCoaching();
  });
}

ipcMain.handle("coach:reloadDemo", async () => {
  await runDemo();
});

// Lets the user paste a raw log blob (e.g. from the mobile companion) and get
// a recommendation without a live game running.
ipcMain.handle("coach:ingest", async (_e, text: string) => {
  const coach = buildCoach();
  await coach.ingestLog(text);
  const update: CoachUpdate = {
    mode: "demo",
    logPath: null,
    committedColors: coach.committedColors,
    recommendation: coach.lastRecommendation,
    matchState: coach.matchState
  };
  sendUpdate(update);
  return { events: parseLogText(text).length };
});

ipcMain.on("window:close", () => mainWindow?.close());

app.whenReady().then(() => {
  createWindow();
  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on("window-all-closed", () => {
  watcher?.stop();
  if (process.platform !== "darwin") app.quit();
});
