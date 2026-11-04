import assert from "node:assert/strict";
import { test } from "node:test";
import { LEVELS, validateLevels } from "../src/levels.js";
import { PIECES } from "../src/constants.js";
import { rotateOpenings, rotateOpeningsBy } from "../src/pipe.js";
import { createGame, loadLevel, updateTimer } from "../src/game.js";
import { createLayout } from "../src/layout.js";

test("all shipped levels validate and a malformed piece cycle is rejected", () => {
  assert.doesNotThrow(() => validateLevels(LEVELS));
  assert.throws(() => validateLevels([{ ...LEVELS[0], pieceCycle: ["unknown"] }]), /unknown piece/);
});

test("clockwise rotations preserve pipe shapes and do not mutate their source", () => {
  assert.deepEqual(rotateOpenings(PIECES.elbow.openings), {
    up: false, right: true, down: true, left: false,
  });
  for (const piece of Object.values(PIECES)) {
    const original = { ...piece.openings };
    const rotated = rotateOpeningsBy(piece.openings, 4);
    for (const direction of ["up", "right", "down", "left"]) {
      assert.equal(rotated[direction], Boolean(original[direction]));
    }
    assert.deepEqual(piece.openings, original);
  }
});

test("startup and a completed route survive unavailable storage", () => {
  const descriptor = Object.getOwnPropertyDescriptor(globalThis, "localStorage");
  Object.defineProperty(globalThis, "localStorage", {
    configurable: true,
    get() { throw new Error("Storage denied"); },
  });
  try {
    const game = createGame();
    const layout = createLayout();
    layout.width = 1280;
    layout.height = 720;
    loadLevel(game, layout, 0);
    // A synthetic one-cell level isolates completion from board-building UX.
    game.level = {
      width: 1, height: 1, obstacles: [],
      source: { x: -1, y: 0, dir: "right" },
      sink: { x: 1, y: 0, dir: "left" },
    };
    game.board = [[{ openings: { left: true, right: true } }]];
    game.timerRemaining = 0.001;
    assert.equal(updateTimer(game, 10), true);
    assert.equal(game.state, "won");
    assert.equal(game.highestUnlocked, 1);
    loadLevel(game, layout, 1);
    assert.equal(game.levelIndex, 1);
  } finally {
    if (descriptor) Object.defineProperty(globalThis, "localStorage", descriptor);
    else delete globalThis.localStorage;
  }
});
