import {
  CachedCardSource,
  LocalCardSource,
  ScryfallCardSource,
  sampleCards,
  type CardSource
} from "@mtg-coach/core";

let shared: CardSource | undefined;
let scryfall: ScryfallCardSource | undefined;

/** Direct Scryfall access for the collection browser (sets + card search). */
export function getScryfall(): ScryfallCardSource {
  if (!scryfall) scryfall = new ScryfallCardSource();
  return scryfall;
}

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
