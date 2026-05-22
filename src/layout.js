import { CONVEYOR_VISIBLE_PIECES } from "./constants.js";
import { clamp } from "./math.js";

export function createLayout() {
  return {
    width: 0,
    height: 0,
    cell: 0,
    boardX: 0,
    boardY: 0,
    conveyorY: 0,
    conveyorSlot: 0,
    conveyorGap: 0,
    conveyorLeft: 0,
    conveyorRight: 0,
    conveyorRects: [],
  };
}

export function computeLayout(layout, level, width, height) {
  const padding = clamp(width * 0.032, 14, 30);
  const hudHeight = clamp(height * 0.11, 68, 92);
  const conveyorHeight = clamp(height * 0.2, 116, 156);
  const sideSpace = clamp(width * 0.12, 54, 112);
  const availableW = width - padding * 2 - sideSpace;
  const availableH = height - hudHeight - conveyorHeight - padding * 2;
  const cell = Math.floor(Math.max(24, Math.min(availableW / level.width, availableH / level.height)));
  const boardW = cell * level.width;
  const boardH = cell * level.height;

  layout.cell = cell;
  layout.boardX = (width - boardW) / 2;
  layout.boardY = hudHeight + Math.max(4, (availableH - boardH) / 2);
  layout.conveyorY = height - conveyorHeight + 18;
  layout.conveyorSlot = clamp((width - 48) / CONVEYOR_VISIBLE_PIECES, 42, 72);
  layout.conveyorGap = clamp(layout.conveyorSlot * 0.28, 12, 20);
  layout.conveyorLeft = 18;
  layout.conveyorRight = width - 18;
}

export function conveyorSpacing(layout) {
  return layout.conveyorSlot + layout.conveyorGap;
}

export function pointToCell(game, layout, x, y) {
  const gx = Math.floor((x - layout.boardX) / layout.cell);
  const gy = Math.floor((y - layout.boardY) / layout.cell);
  if (!isInsideGrid(game, gx, gy)) return null;
  return { x: gx, y: gy };
}

export function pointInRect(x, y, rect) {
  return x >= rect.x && y >= rect.y && x <= rect.x + rect.width && y <= rect.y + rect.height;
}

export function isInsideGrid(game, x, y) {
  return game.level && x >= 0 && y >= 0 && x < game.level.width && y < game.level.height;
}

export function isObstacle(game, x, y) {
  return game.level.obstacles.some(([ox, oy]) => ox === x && oy === y);
}
