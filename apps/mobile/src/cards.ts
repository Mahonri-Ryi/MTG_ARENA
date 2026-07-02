import {
  CachedCardSource,
  LocalCardSource,
  ScryfallCardSource,
  sampleCards,
  type CardSource
} from "@mtg-coach/core";

let shared: CardSource | undefined;

/**
 * The card source used across the app: real card data + images from Scryfall,
 * with the bundled sample set as an offline fallback so imports still resolve
 * common cards without a network connection.
 */
export function getCardSource(): CardSource {
  if (!shared) {
    shared = new CachedCardSource(
      new ScryfallCardSource(),
      new LocalCardSource(sampleCards),
      sampleCards
    );
  }
  return shared;
}
