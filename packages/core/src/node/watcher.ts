import { watch, type FSWatcher } from "node:fs";
import { open, stat } from "node:fs/promises";

import { parseLogText } from "../log/parser.js";
import type { LogEvent } from "../types.js";

export type LogEventHandler = (event: LogEvent) => void;

/**
 * Tails an MTGA Player.log file and emits parsed events as new content is
 * appended. Reads only the newly-written bytes on each change so it scales to
 * the large, ever-growing logs MTGA produces.
 */
export class LogWatcher {
  private watcher?: FSWatcher;
  private offset = 0;
  private readonly handlers = new Set<LogEventHandler>();
  private pending = Promise.resolve();

  constructor(private readonly filePath: string) {}

  onEvent(handler: LogEventHandler): () => void {
    this.handlers.add(handler);
    return () => this.handlers.delete(handler);
  }

  /**
   * Start watching. When `fromStart` is true the existing file contents are
   * parsed first (useful for demos / catching up), otherwise we begin at EOF.
   */
  async start(fromStart = false): Promise<void> {
    try {
      const info = await stat(this.filePath);
      this.offset = fromStart ? 0 : info.size;
    } catch {
      this.offset = 0;
    }

    if (fromStart) await this.readNew();

    this.watcher = watch(this.filePath, () => {
      this.pending = this.pending.then(() => this.readNew()).catch(() => {});
    });
  }

  stop(): void {
    this.watcher?.close();
    this.watcher = undefined;
  }

  private async readNew(): Promise<void> {
    let info;
    try {
      info = await stat(this.filePath);
    } catch {
      return;
    }
    // Handle log rotation / truncation.
    if (info.size < this.offset) this.offset = 0;
    if (info.size === this.offset) return;

    const length = info.size - this.offset;
    const handle = await open(this.filePath, "r");
    try {
      const buffer = Buffer.alloc(length);
      await handle.read(buffer, 0, length, this.offset);
      this.offset = info.size;
      const text = buffer.toString("utf8");
      for (const event of parseLogText(text)) {
        for (const handler of this.handlers) handler(event);
      }
    } finally {
      await handle.close();
    }
  }
}
