import { BUILD_TIME_SECONDS, CONVEYOR_SPEED, CONVEYOR_VISIBLE_PIECES, DIRECTIONS, DIRECTION_ORDER, PIECES } from "./constants.js";
import { LEVELS } from "./levels.js";
import { rotateOpenings, rotateOpeningsBy } from "./pipe.js";
import { conveyorSpacing, computeLayout, isInsideGrid, isObstacle } from "./layout.js";
import { getHighestUnlocked, saveHighestUnlocked } from "./storage.js";

export function createGame() {
  return {
    levelIndex: 0,
    level: null,
    board: [],
    conveyor: [],
    selectedPieceId: null,
    pieceCursor: 0,
    nextPieceId: 1,
    placedPieces: 0,
    discardedPieces: 0,
    timerRemaining: BUILD_TIME_SECONDS,
    state: "playing",
    connectedPath: [],
    waterProgress: 0,
    waterStartedAt: 0,
    highestUnlocked: getHighestUnlocked(),
    invalidFlash: 0,
    invalidCell: null,
    hoverCell: null,
    message: "",
  };
}

export function loadLevel(game, layout, index, options = {}) {
  const clampedIndex = Math.max(0, Math.min(index, LEVELS.length - 1, game.highestUnlocked));
  const level = LEVELS[clampedIndex];
  game.levelIndex = clampedIndex;
  game.level = level;
  computeLayout(layout, level, layout.width, layout.height);
  game.board = Array.from({ length: level.height }, () => Array(level.width).fill(null));
  game.conveyor = [];
  game.selectedPieceId = null;
  game.pieceCursor = 0;
  game.nextPieceId = 1;
  game.placedPieces = 0;
  game.discardedPieces = 0;
  game.timerRemaining = BUILD_TIME_SECONDS;
  seedConveyor(game, layout);
  game.connectedPath = [];
  game.waterProgress = 0;
  game.waterStartedAt = 0;
  game.invalidFlash = 0;
  game.invalidCell = null;
  game.hoverCell = null;
  game.message = `${level.name}: build a sealed route before the faucet opens.`;
  game.state = options.intro ? "intro" : "playing";
}

export function startGame(game) {
  game.state = "playing";
  game.message = "Pick a moving pipe and sketch the route before pressure hits.";
}

export function updateTimer(game, delta) {
  if (game.state !== "playing") return false;
  const previousSecond = Math.ceil(game.timerRemaining);
  game.timerRemaining = Math.max(0, game.timerRemaining - delta / 1000);
  if (game.timerRemaining === 0) {
    openFaucet(game);
    return true;
  }
  return Math.ceil(game.timerRemaining) !== previousSecond;
}

export function updateConveyor(game, layout, delta) {
  if (!game.level || game.state !== "playing") return false;

  const spacing = conveyorSpacing(layout);
  game.conveyor.forEach((piece) => {
    piece.x -= CONVEYOR_SPEED * delta;
  });

  const beforeCount = game.conveyor.length;
  game.conveyor = game.conveyor.filter((piece) => piece.x + layout.conveyorSlot > layout.conveyorLeft);
  const removedCount = beforeCount - game.conveyor.length;
  let changed = false;
  if (removedCount > 0) {
    game.discardedPieces += removedCount;
    if (!game.conveyor.some((piece) => piece.id === game.selectedPieceId)) {
      game.selectedPieceId = null;
    }
    changed = true;
  }

  let rightmost = game.conveyor.reduce((max, piece) => Math.max(max, piece.x), layout.conveyorLeft - spacing);
  while (rightmost < layout.conveyorRight - spacing) {
    rightmost += spacing;
    game.conveyor.push(nextConveyorPiece(game, rightmost));
  }
  return changed;
}

export function rotateSelectedPiece(game) {
  if (game.state !== "playing") return false;
  const selected = getSelectedPiece(game);
  if (!selected) {
    game.message = "Select a pipe first, then rotate it.";
    return true;
  }
  selected.openings = rotateOpenings(selected.openings);
  game.message = "Pipe rotated. Line it up with the route.";
  return true;
}

export function selectConveyorPiece(game, pieceId) {
  if (game.state !== "playing") return false;
  game.selectedPieceId = pieceId;
  game.message = "Piece selected. Place it before it rolls away.";
  return true;
}

export function placeSelectedPiece(game, x, y) {
  const selectedIndex = game.conveyor.findIndex((piece) => piece.id === game.selectedPieceId);
  if (selectedIndex < 0) {
    flashInvalid(game, x, y, "Select a moving piece first.");
    return true;
  }
  if (!canPlaceAt(game, x, y)) {
    flashInvalid(game, x, y);
    return true;
  }

  const [piece] = game.conveyor.splice(selectedIndex, 1);
  game.selectedPieceId = null;
  game.board[y][x] = piece;
  game.placedPieces += 1;

  const inspection = inspectWaterNetwork(game);
  if (isNetworkReady(inspection)) {
    game.connectedPath = inspection.path;
    game.message = "Route sealed. Hold it until the faucet opens.";
  } else if (isBoardFull(game)) {
    game.state = "lost";
    game.message = "The board is full before a sealed route is ready.";
  } else {
    game.message = "Keep building. Open pipe ends will leak when the faucet opens.";
  }

  return true;
}

export function tickGameEffects(game, delta) {
  if (game.invalidFlash > 0) {
    game.invalidFlash = Math.max(0, game.invalidFlash - delta);
  }
}

export function getSelectedPiece(game) {
  return game.conveyor.find((piece) => piece.id === game.selectedPieceId) || null;
}

export function countFreeCells(game) {
  let free = 0;
  for (let y = 0; y < game.level.height; y += 1) {
    for (let x = 0; x < game.level.width; x += 1) {
      if (!game.board[y][x] && !isObstacle(game, x, y)) free += 1;
    }
  }
  return free;
}

export function handleNextLevel(game, layout) {
  if (game.state === "won" && game.levelIndex < LEVELS.length - 1) {
    loadLevel(game, layout, game.levelIndex + 1);
    return;
  }
  loadLevel(game, layout, Math.min(game.highestUnlocked, game.levelIndex + 1));
}

function seedConveyor(game, layout) {
  const spacing = conveyorSpacing(layout);
  const startX = layout.conveyorLeft + spacing * 0.2;
  while (game.conveyor.length < CONVEYOR_VISIBLE_PIECES) {
    game.conveyor.push(nextConveyorPiece(game, startX + game.conveyor.length * spacing));
  }
}

function nextConveyorPiece(game, x) {
  const cycle = game.level.pieceCycle;
  const cursor = game.pieceCursor;
  const type = cycle[cursor % cycle.length];
  const rotation = Math.floor(cursor / cycle.length) % 4;
  game.pieceCursor += 1;

  return {
    id: game.nextPieceId++,
    type,
    x,
    openings: rotateOpeningsBy(PIECES[type].openings, rotation),
  };
}

function openFaucet(game) {
  const inspection = inspectWaterNetwork(game);
  game.connectedPath = inspection.path;
  game.waterProgress = 0;
  game.waterStartedAt = performance.now();

  if (isNetworkReady(inspection)) {
    game.state = "won";
    game.message =
      game.levelIndex === LEVELS.length - 1
        ? "Pressure holds. Spipes is watertight!"
        : "Pressure holds. Next level unlocked.";
    unlockLevel(game, game.levelIndex + 1);
  } else {
    game.state = "lost";
    if (!inspection.hasSourcePiece) {
      game.message = "The faucet opened, but no pipe was attached to the inlet.";
    } else if (!inspection.reachesSink) {
      game.message = "The faucet opened, but the water never reached the outlet.";
    } else {
      game.message = "Pressure collapsed through an open pipe end.";
    }
  }
}

function isNetworkReady(inspection) {
  return inspection.hasSourcePiece && inspection.reachesSink && inspection.leaks.length === 0;
}

function canPlaceAt(game, x, y) {
  return isInsideGrid(game, x, y) && !game.board[y][x] && !isObstacle(game, x, y);
}

function isBoardFull(game) {
  for (let y = 0; y < game.level.height; y += 1) {
    for (let x = 0; x < game.level.width; x += 1) {
      if (!game.board[y][x] && !isObstacle(game, x, y)) return false;
    }
  }
  return true;
}

function flashInvalid(game, x, y, message = "That spot is blocked.") {
  game.invalidFlash = 280;
  game.invalidCell = isInsideGrid(game, x, y) ? { x, y } : null;
  game.message = message;
}

function inspectWaterNetwork(game) {
  const { level } = game;
  const start = {
    x: level.source.x + DIRECTIONS[level.source.dir].dx,
    y: level.source.y + DIRECTIONS[level.source.dir].dy,
  };
  const result = {
    hasSourcePiece: false,
    reachesSink: false,
    leaks: [],
    path: [],
  };
  if (!isInsideGrid(game, start.x, start.y)) {
    result.leaks.push({ x: level.source.x, y: level.source.y, dir: level.source.dir });
    return result;
  }

  const startPiece = game.board[start.y][start.x];
  if (!startPiece || !startPiece.openings[DIRECTIONS[level.source.dir].opposite]) {
    result.leaks.push({ x: start.x, y: start.y, dir: DIRECTIONS[level.source.dir].opposite });
    return result;
  }
  result.hasSourcePiece = true;

  const queue = [{ ...start, path: [{ ...start }] }];
  const visited = new Set([cellKey(start.x, start.y)]);

  while (queue.length > 0) {
    const current = queue.shift();
    const piece = game.board[current.y][current.x];

    for (const dir of DIRECTION_ORDER) {
      if (!piece.openings[dir]) continue;
      const next = {
        x: current.x + DIRECTIONS[dir].dx,
        y: current.y + DIRECTIONS[dir].dy,
      };

      if (next.x === level.source.x && next.y === level.source.y && dir === DIRECTIONS[level.source.dir].opposite) {
        continue;
      }

      if (next.x === level.sink.x && next.y === level.sink.y && dir === DIRECTIONS[level.sink.dir].opposite) {
        result.reachesSink = true;
        if (result.path.length === 0) {
          result.path = current.path;
        }
        continue;
      }

      if (!isInsideGrid(game, next.x, next.y) || isObstacle(game, next.x, next.y)) {
        result.leaks.push({ x: current.x, y: current.y, dir });
        continue;
      }
      const nextPiece = game.board[next.y][next.x];
      if (!nextPiece || !nextPiece.openings[DIRECTIONS[dir].opposite]) {
        result.leaks.push({ x: current.x, y: current.y, dir });
        continue;
      }

      const key = cellKey(next.x, next.y);
      if (visited.has(key)) continue;
      visited.add(key);
      queue.push({ ...next, path: [...current.path, { ...next }] });
    }
  }

  return result;
}

function unlockLevel(game, index) {
  const nextHighest = Math.min(LEVELS.length - 1, index);
  if (nextHighest > game.highestUnlocked) {
    game.highestUnlocked = nextHighest;
    saveHighestUnlocked(nextHighest);
  }
}

function cellKey(x, y) {
  return `${x},${y}`;
}
