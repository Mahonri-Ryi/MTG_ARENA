import type { DraftPack, LogEvent } from "../types.js";

/**
 * Parser for MTG Arena's Player.log ("Detailed Logs (Plugin Support)" enabled).
 *
 * MTGA emits `[UnityCrossThreadLogger]` messages, many of which carry a JSON
 * payload either on the same line or spread across the following lines. We
 * locate a set of known markers and then read the first balanced JSON object
 * that follows the marker, which makes the parser tolerant to the exact
 * whitespace/line-wrapping MTGA uses.
 *
 * NOTE: Arena's exact event schema drifts between game updates. We support the
 * most widely documented draft formats (Premier `Draft.Notify` and Quick/bot
 * `BotDraft_DraftPack`) plus simplified match markers. New formats can be added
 * by extending `MARKERS` and `buildEvent`.
 */

interface Marker {
  token: string;
  kind: string;
}

const MARKERS: Marker[] = [
  { token: "Draft.Notify", kind: "draftPack:premier" },
  { token: "BotDraft_DraftPack", kind: "draftPack:quick" },
  { token: "Draft.MakePick", kind: "draftPick" },
  { token: "Draft.MakeHumanDraftPick", kind: "draftPick" },
  { token: "MatchStart", kind: "matchStart" },
  { token: "TurnChange", kind: "turnChange" },
  { token: "CardRevealed", kind: "cardRevealed" }
];

/** Locate the first balanced JSON object starting at/after `from`. */
function extractJson(text: string, from: number): { value: unknown; end: number } | null {
  const start = text.indexOf("{", from);
  if (start === -1) return null;

  let depth = 0;
  let inString = false;
  let escaped = false;

  for (let i = start; i < text.length; i++) {
    const ch = text[i];
    if (inString) {
      if (escaped) {
        escaped = false;
      } else if (ch === "\\") {
        escaped = true;
      } else if (ch === '"') {
        inString = false;
      }
      continue;
    }
    if (ch === '"') {
      inString = true;
    } else if (ch === "{") {
      depth++;
    } else if (ch === "}") {
      depth--;
      if (depth === 0) {
        const slice = text.slice(start, i + 1);
        try {
          return { value: JSON.parse(slice), end: i + 1 };
        } catch {
          return null;
        }
      }
    }
  }
  return null;
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" ? (value as Record<string, unknown>) : null;
}

/** Some MTGA payloads nest a stringified JSON under a `request` key. */
function unwrapRequest(obj: Record<string, unknown>): Record<string, unknown> {
  const req = obj.request;
  if (typeof req === "string") {
    try {
      const parsed = asRecord(JSON.parse(req));
      if (parsed) return parsed;
    } catch {
      /* fall through */
    }
  }
  return obj;
}

function toNumber(value: unknown): number | undefined {
  if (typeof value === "number") return value;
  if (typeof value === "string" && value.trim() !== "" && !Number.isNaN(Number(value))) {
    return Number(value);
  }
  return undefined;
}

function parseCardIdList(value: unknown): number[] {
  if (Array.isArray(value)) {
    return value.map((v) => toNumber(v)).filter((n): n is number => n !== undefined);
  }
  if (typeof value === "string") {
    return value
      .split(",")
      .map((s) => toNumber(s.trim()))
      .filter((n): n is number => n !== undefined);
  }
  return [];
}

function firstDefined<T>(...vals: T[]): T | undefined {
  return vals.find((v) => v !== undefined && v !== null);
}

function buildEvent(kind: string, payload: unknown, raw: string): LogEvent | null {
  const root = asRecord(payload);
  if (!root) return null;
  const obj = unwrapRequest(root);

  switch (kind) {
    case "draftPack:premier": {
      const draftId = String(firstDefined(obj.draftId, obj.DraftId, "") ?? "");
      const packNumber = toNumber(firstDefined(obj.SelfPack, obj.PackNumber)) ?? 1;
      const pickNumber = toNumber(firstDefined(obj.SelfPick, obj.PickNumber)) ?? 1;
      const cardIds = parseCardIdList(firstDefined(obj.PackCards, obj.CardsInPack, obj.DraftPack));
      if (cardIds.length === 0) return null;
      const pack: DraftPack = { draftId, packNumber, pickNumber, cardIds };
      return { kind: "draftPack", pack, raw };
    }
    case "draftPack:quick": {
      const draftId = String(firstDefined(obj.draftId, obj.DraftId, "") ?? "");
      const packNumber = toNumber(firstDefined(obj.PackNumber, obj.SelfPack)) ?? 1;
      const pickNumber = toNumber(firstDefined(obj.PickNumber, obj.SelfPick)) ?? 1;
      const cardIds = parseCardIdList(firstDefined(obj.DraftPack, obj.PackCards, obj.CardsInPack));
      if (cardIds.length === 0) return null;
      const pack: DraftPack = { draftId, packNumber, pickNumber, cardIds };
      return { kind: "draftPack", pack, raw };
    }
    case "draftPick": {
      const draftId = String(firstDefined(obj.DraftId, obj.draftId, "") ?? "");
      const pack = toNumber(firstDefined(obj.Pack, obj.PackNumber)) ?? 1;
      const pick = toNumber(firstDefined(obj.Pick, obj.PickNumber)) ?? 1;
      const cardId = toNumber(firstDefined(obj.GrpId, obj.CardId, obj.grpId));
      if (cardId === undefined) return null;
      return { kind: "draftPick", draftId, pack, pick, cardId, raw };
    }
    case "matchStart": {
      const matchId = String(firstDefined(obj.matchId, obj.MatchId, "") ?? "");
      const onThePlay = Boolean(firstDefined(obj.onThePlay, obj.OnThePlay, false));
      return { kind: "matchStart", matchId, onThePlay, raw };
    }
    case "turnChange": {
      const matchId = String(firstDefined(obj.matchId, obj.MatchId, "") ?? "");
      const turn = toNumber(firstDefined(obj.turn, obj.Turn)) ?? 0;
      return { kind: "turnChange", matchId, turn, raw };
    }
    case "cardRevealed": {
      const matchId = String(firstDefined(obj.matchId, obj.MatchId, "") ?? "");
      const ownerRaw = String(firstDefined(obj.owner, obj.Owner, "opponent") ?? "opponent");
      const owner = ownerRaw === "self" ? "self" : "opponent";
      const cardId = toNumber(firstDefined(obj.GrpId, obj.CardId, obj.grpId, obj.cardId));
      if (cardId === undefined) return null;
      return { kind: "cardRevealed", matchId, owner, cardId, raw };
    }
    default:
      return null;
  }
}

/** Parse a full block of log text into structured events, in order. */
export function parseLogText(text: string): LogEvent[] {
  const events: LogEvent[] = [];
  let searchFrom = 0;

  while (searchFrom < text.length) {
    // Find the earliest marker occurrence at/after searchFrom.
    let best: { index: number; marker: Marker } | null = null;
    for (const marker of MARKERS) {
      const idx = text.indexOf(marker.token, searchFrom);
      if (idx !== -1 && (best === null || idx < best.index)) {
        best = { index: idx, marker };
      }
    }
    if (!best) break;

    const json = extractJson(text, best.index + best.marker.token.length);
    if (!json) {
      searchFrom = best.index + best.marker.token.length;
      continue;
    }

    const rawStart = text.lastIndexOf("\n", best.index) + 1;
    const raw = text.slice(rawStart, json.end).trim();
    const event = buildEvent(best.marker.kind, json.value, raw);
    if (event) events.push(event);
    searchFrom = json.end;
  }

  return events;
}
