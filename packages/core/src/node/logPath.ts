import { homedir, platform } from "node:os";
import { join } from "node:path";

/**
 * Best-effort default location of MTG Arena's Player.log per platform.
 *
 * Real installs: Windows/macOS are the supported MTGA desktop platforms. On
 * Linux (e.g. this dev VM, or Wine/Proton) there is no canonical path, so we
 * fall back to the `MTGA_LOG_PATH` environment variable.
 */
export function defaultMtgaLogPath(): string | undefined {
  const override = process.env.MTGA_LOG_PATH;
  if (override) return override;

  const home = homedir();
  switch (platform()) {
    case "win32":
      return join(
        process.env.APPDATA ?? join(home, "AppData", "Roaming"),
        "..",
        "LocalLow",
        "Wizards Of The Coast",
        "MTGA",
        "Player.log"
      );
    case "darwin":
      return join(home, "Library", "Logs", "Wizards Of The Coast", "MTGA", "Player.log");
    default:
      return undefined;
  }
}
