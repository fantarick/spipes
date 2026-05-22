import { handleNextLevel, loadLevel, placeSelectedPiece, rotateSelectedPiece, selectConveyorPiece, startGame } from "./game.js";
import { pointInRect, pointToCell } from "./layout.js";

export function bindInput(refs, game, layout, callbacks) {
  const { canvas } = refs;

  window.addEventListener("resize", callbacks.resize);
  window.addEventListener("keydown", (event) => {
    if (event.key.toLowerCase() !== "r") return;
    if (rotateSelectedPiece(game)) callbacks.updateDom();
  });

  canvas.addEventListener("pointerdown", (event) => {
    const { x, y } = getCanvasPoint(canvas, event);
    const conveyorIndex = layout.conveyorRects.findIndex((slot) => pointInRect(x, y, slot));
    if (conveyorIndex >= 0 && selectConveyorPiece(game, layout.conveyorRects[conveyorIndex].pieceId)) {
      callbacks.updateDom();
      return;
    }

    const cell = pointToCell(game, layout, x, y);
    if (!cell || game.state !== "playing") {
      return;
    }
    if (placeSelectedPiece(game, cell.x, cell.y)) callbacks.updateDom();
  });

  canvas.addEventListener("pointermove", (event) => {
    const { x, y } = getCanvasPoint(canvas, event);
    game.hoverCell = pointToCell(game, layout, x, y);
  });

  canvas.addEventListener("pointerleave", () => {
    game.hoverCell = null;
  });

  canvas.addEventListener("contextmenu", (event) => {
    event.preventDefault();
    if (rotateSelectedPiece(game)) callbacks.updateDom();
  });

  refs.startButton.addEventListener("click", () => {
    startGame(game);
    callbacks.updateDom();
  });
  refs.rotateButton.addEventListener("click", () => {
    if (rotateSelectedPiece(game)) callbacks.updateDom();
  });
  refs.restartButton.addEventListener("click", () => {
    loadLevel(game, layout, game.levelIndex);
    callbacks.updateDom();
  });
  refs.prevButton.addEventListener("click", () => {
    loadLevel(game, layout, Math.max(0, game.levelIndex - 1), { intro: true });
    callbacks.updateDom();
  });
  refs.nextButton.addEventListener("click", () => {
    handleNextLevel(game, layout);
    callbacks.updateDom();
  });
}

function getCanvasPoint(canvas, event) {
  const rect = canvas.getBoundingClientRect();
  return {
    x: event.clientX - rect.left,
    y: event.clientY - rect.top,
  };
}
