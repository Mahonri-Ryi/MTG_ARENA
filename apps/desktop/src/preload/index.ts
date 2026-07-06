import { contextBridge, ipcRenderer } from "electron";

export interface CoachApi {
  onUpdate: (cb: (update: unknown) => void) => () => void;
  reloadDemo: () => Promise<void>;
  ingest: (text: string) => Promise<{ events: number }>;
  close: () => void;
}

const api: CoachApi = {
  onUpdate: (cb) => {
    const listener = (_e: unknown, update: unknown) => cb(update);
    ipcRenderer.on("coach:update", listener);
    return () => ipcRenderer.removeListener("coach:update", listener);
  },
  reloadDemo: () => ipcRenderer.invoke("coach:reloadDemo"),
  ingest: (text: string) => ipcRenderer.invoke("coach:ingest", text),
  close: () => ipcRenderer.send("window:close")
};

contextBridge.exposeInMainWorld("coach", api);
