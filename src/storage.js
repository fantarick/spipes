import { STORAGE_KEY } from "./constants.js";
import { LEVELS } from "./levels.js";
import { clamp } from "./math.js";

let sessionHighestUnlocked = 0;

function normalizeProgress(value) {
  const number = Number(value);
  return Number.isFinite(number) ? clamp(Math.floor(number), 0, LEVELS.length - 1) : 0;
}

export function getHighestUnlocked() {
  try {
    const saved = normalizeProgress(localStorage.getItem(STORAGE_KEY));
    sessionHighestUnlocked = Math.max(sessionHighestUnlocked, saved);
  } catch {
    // Storage can be denied by browser policy; keep this session playable.
  }
  return sessionHighestUnlocked;
}

export function saveHighestUnlocked(index) {
  sessionHighestUnlocked = Math.max(getHighestUnlocked(), normalizeProgress(index));
  try {
    localStorage.setItem(STORAGE_KEY, String(sessionHighestUnlocked));
  } catch {
    // A failed write must not lose an unlock or interrupt the game loop.
  }
}
