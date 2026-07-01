import type { Card } from "../types.js";
import type { RatingsMap } from "../draft/engine.js";
import cardsJson from "./cards.sample.json";
import ratingsJson from "./ratings.sample.json";

/** A small, offline-friendly card database used for demos and tests. */
export const sampleCards = cardsJson as Card[];

/** Illustrative win-rate-style ratings (0-100) keyed by card name. */
export const sampleRatings = ratingsJson as RatingsMap;

/**
 * A synthetic MTGA Player.log snippet in the real event formats the parser
 * understands. Used to demonstrate the overlay end-to-end without a live game.
 */
export const sampleLogText = [
  '[UnityCrossThreadLogger]Draft.Notify {"draftId":"demo-draft-1","SelfPack":1,"SelfPick":1,"PackCards":"90001,90002,90003,90004,90005,90006,90007,90008,90009,90010,90011,90012,90013,90014,90015"}',
  '[UnityCrossThreadLogger]==> Draft.MakePick {"id":101,"request":"{\\"DraftId\\":\\"demo-draft-1\\",\\"GrpId\\":90006,\\"Pack\\":1,\\"Pick\\":1}"}',
  '[UnityCrossThreadLogger]Draft.Notify {"draftId":"demo-draft-1","SelfPack":1,"SelfPick":2,"PackCards":"90001,90002,90003,90004,90005,90007,90008,90009,90010,90011,90012,90013,90014,90015"}',
  '[UnityCrossThreadLogger]==> Draft.MakePick {"id":102,"request":"{\\"DraftId\\":\\"demo-draft-1\\",\\"GrpId\\":90001,\\"Pack\\":1,\\"Pick\\":2}"}',
  '[UnityCrossThreadLogger]Draft.Notify {"draftId":"demo-draft-1","SelfPack":1,"SelfPick":3,"PackCards":"90002,90003,90004,90005,90007,90008,90009,90010,90011,90012,90013,90014,90015"}',
  '[UnityCrossThreadLogger]==> Draft.MakePick {"id":103,"request":"{\\"DraftId\\":\\"demo-draft-1\\",\\"GrpId\\":90002,\\"Pack\\":1,\\"Pick\\":3}"}',
  '[UnityCrossThreadLogger]Draft.Notify {"draftId":"demo-draft-1","SelfPack":1,"SelfPick":4,"PackCards":"90003,90004,90005,90007,90008,90009,90010,90011,90012,90013,90014,90015"}',
  '[UnityCrossThreadLogger]MatchStart {"matchId":"demo-match-1","onThePlay":true}',
  '[UnityCrossThreadLogger]TurnChange {"matchId":"demo-match-1","turn":1}',
  '[UnityCrossThreadLogger]CardRevealed {"matchId":"demo-match-1","owner":"opponent","GrpId":90010}'
].join("\n");
