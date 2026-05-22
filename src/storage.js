import { STORAGE_KEY } from "./constants.js";
import { LEVELS } from "./levels.js";
import { clamp } from "./math.js";

export function getHighestUnlocked() {
  const saved = Number(localStorage.getItem(STORAGE_KEY));
  return Number.isFinite(saved) ? clamp(Math.floor(saved), 0, LEVELS.length - 1) : 0;
}

export function saveHighestUnlocked(index) {
  localStorage.setItem(STORAGE_KEY, String(index));
}
