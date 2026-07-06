import { DraftEngine, type DraftEngineOptions } from "./draft/engine";
import { parseLogText } from "./log/parser";
import type { CardSource, LogEvent, MatchState, PickRecommendation } from "./types";

/**
 * High-level orchestrator that turns a stream of parsed log events into the
 * things the overlay renders: the current pick recommendation and a distilled
 * match state. Both the desktop and mobile apps drive their UI from this.
 */
export class Coach {
  private readonly engine: DraftEngine;
  private match: MatchState | null = null;

  constructor(
    private readonly cards: CardSource,
    engineOptions: DraftEngineOptions = {}
  ) {
    this.engine = new DraftEngine(engineOptions);
  }

  get committedColors(): string[] {
    return this.engine.committedColors();
  }

  get matchState(): MatchState | null {
    return this.match;
  }

  get lastRecommendation(): PickRecommendation | null {
    return this.latest;
  }

  private latest: PickRecommendation | null = null;

  /**
   * Apply a single parsed log event, updating internal draft/match state.
   * Returns the current pick recommendation (unchanged for non-pack events).
   */
  async applyEvent(event: LogEvent): Promise<PickRecommendation | null> {
    switch (event.kind) {
      case "draftPick": {
        const card = await this.cards.getByArenaId(event.cardId);
        if (card) this.engine.registerPick(card);
        break;
      }
      case "draftPack": {
        const packCards = await this.cards.getManyByArenaId(event.pack.cardIds);
        this.latest = this.engine.recommend(event.pack, packCards);
        break;
      }
      case "matchStart":
        this.match = {
          matchId: event.matchId,
          turn: 0,
          onThePlay: event.onThePlay,
          opponentRevealed: [],
          playerLibrary: []
        };
        break;
      case "turnChange":
        if (this.match) this.match.turn = event.turn;
        break;
      case "cardRevealed": {
        if (this.match && event.owner === "opponent") {
          const card = await this.cards.getByArenaId(event.cardId);
          if (card) this.match.opponentRevealed.push(card.name);
        }
        break;
      }
    }
    return this.latest;
  }

  /**
   * Ingest a block of raw log text, updating internal draft/match state, and
   * return the latest pick recommendation if a pack was seen (else null).
   */
  async ingestLog(text: string): Promise<PickRecommendation | null> {
    for (const event of parseLogText(text)) {
      await this.applyEvent(event);
    }
    return this.latest;
  }
}
