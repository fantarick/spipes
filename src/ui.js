import { LEVELS } from "./levels.js";
import { getSelectedPiece, countFreeCells } from "./game.js";

export function getDomRefs() {
  const canvas = document.querySelector("#game");
  return {
    canvas,
    ctx: canvas.getContext("2d"),
    statusEl: document.querySelector("#status"),
    restartButton: document.querySelector("#restart"),
    prevButton: document.querySelector("#prevLevel"),
    nextButton: document.querySelector("#nextLevel"),
    rotateButton: document.querySelector("#rotate"),
    startScreen: document.querySelector("#startScreen"),
    startButton: document.querySelector("#startGame"),
  };
}

export function updateDom(game, refs) {
  refs.statusEl.textContent = `Level ${game.levelIndex + 1}/${LEVELS.length} - ${formatTimer(
    game.timerRemaining,
  )} to faucet - ${countFreeCells(game)} free cells`;
  refs.startScreen.hidden = game.state !== "intro";
  refs.prevButton.disabled = game.levelIndex <= 0;
  refs.nextButton.disabled = game.levelIndex >= Math.min(game.highestUnlocked, LEVELS.length - 1);
  refs.rotateButton.disabled = game.state !== "playing" || !getSelectedPiece(game);
}

export function formatTimer(seconds) {
  const wholeSeconds = Math.max(0, Math.ceil(seconds));
  const minutes = Math.floor(wholeSeconds / 60);
  const remainingSeconds = String(wholeSeconds % 60).padStart(2, "0");
  return `${minutes}:${remainingSeconds}`;
}
