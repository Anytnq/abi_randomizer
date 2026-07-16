/* Single shared store instance (Planungs.md 7 state model). Views that need
   cross-view state (Wheel reading Squad's map results, Squad Command
   Center) import this instead of each holding their own copy. */

import { createStore } from "./store.js";

export const appStore = createStore({
  route: "hub",
  squad: {
    active: false,
    isLeader: false,
    code: null,
    playerId: null,
    playerName: null,
    mapValues: [],
  },
});
