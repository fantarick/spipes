const canvas = document.querySelector("#game");
const ctx = canvas.getContext("2d");
const statusEl = document.querySelector("#status");
const restartButton = document.querySelector("#restart");
const prevButton = document.querySelector("#prevLevel");
const nextButton = document.querySelector("#nextLevel");

const STORAGE_KEY = "spipes.highestUnlocked";
const WATER_SPEED = 0.0042;
const CONVEYOR_VISIBLE_PIECES = 7;
const CONVEYOR_SPEED = 0.055;

const DIRECTIONS = {
  up: { dx: 0, dy: -1, opposite: "down" },
  right: { dx: 1, dy: 0, opposite: "left" },
  down: { dx: 0, dy: 1, opposite: "up" },
  left: { dx: -1, dy: 0, opposite: "right" },
};

const DIRECTION_ORDER = ["up", "right", "down", "left"];

const PIECES = {
  straight: { label: "Straight", openings: { up: true, down: true } },
  elbow: { label: "Elbow", openings: { up: true, right: true } },
  tee: { label: "Tee", openings: { up: true, right: true, left: true } },
  cross: { label: "Cross", openings: { up: true, right: true, down: true, left: true } },
};

const LEVELS = [
  {
    name: "Leaky Garden",
    width: 10,
    height: 8,
    source: { x: -1, y: 3, dir: "right" },
    sink: { x: 10, y: 3, dir: "left" },
    obstacles: [
      [4, 2],
      [4, 3],
      [4, 4],
      [7, 1],
      [7, 6],
    ],
    pieceCycle: ["straight", "elbow", "straight", "tee", "elbow", "straight", "cross"],
  },
  {
    name: "Basement Bend",
    width: 10,
    height: 8,
    source: { x: -1, y: 5, dir: "right" },
    sink: { x: 10, y: 2, dir: "left" },
    obstacles: [
      [2, 4],
      [3, 4],
      [4, 4],
      [6, 2],
      [6, 3],
      [6, 4],
      [8, 5],
    ],
    pieceCycle: ["elbow", "straight", "straight", "tee", "straight", "elbow", "cross", "straight"],
  },
  {
    name: "Toolbox Trouble",
    width: 10,
    height: 8,
    source: { x: -1, y: 1, dir: "right" },
    sink: { x: 10, y: 6, dir: "left" },
    obstacles: [
      [1, 3],
      [2, 3],
      [3, 3],
      [5, 1],
      [5, 2],
      [5, 3],
      [5, 5],
      [7, 5],
      [8, 5],
    ],
    pieceCycle: ["straight", "elbow", "tee", "straight", "elbow", "cross", "straight", "tee"],
  },
  {
    name: "Pressure Alley",
    width: 10,
    height: 8,
    source: { x: -1, y: 6, dir: "right" },
    sink: { x: 10, y: 1, dir: "left" },
    obstacles: [
      [2, 1],
      [2, 2],
      [2, 3],
      [4, 5],
      [4, 6],
      [6, 1],
      [6, 2],
      [7, 4],
      [8, 4],
      [8, 5],
    ],
    pieceCycle: ["elbow", "straight", "tee", "elbow", "straight", "cross", "straight", "tee", "elbow"],
  },
  {
    name: "Grand Plumbing Finale",
    width: 10,
    height: 8,
    source: { x: -1, y: 4, dir: "right" },
    sink: { x: 10, y: 4, dir: "left" },
    obstacles: [
      [1, 1],
      [2, 1],
      [3, 2],
      [3, 3],
      [3, 4],
      [5, 0],
      [5, 1],
      [5, 6],
      [6, 6],
      [7, 3],
      [7, 4],
      [8, 2],
    ],
    pieceCycle: ["tee", "elbow", "straight", "cross", "straight", "elbow", "tee", "cross"],
  },
];

let layout = {
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

let game = createGame();
let lastTime = performance.now();

validateLevels(LEVELS);
resizeCanvas();
loadLevel(0);
requestAnimationFrame(tick);

window.addEventListener("resize", resizeCanvas);
canvas.addEventListener("pointerdown", handlePointerDown);
restartButton.addEventListener("click", () => loadLevel(game.levelIndex));
prevButton.addEventListener("click", () => loadLevel(Math.max(0, game.levelIndex - 1)));
nextButton.addEventListener("click", handleNextLevel);

function createGame() {
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
    state: "playing",
    connectedPath: [],
    waterProgress: 0,
    waterStartedAt: 0,
    highestUnlocked: getHighestUnlocked(),
    invalidFlash: 0,
    invalidCell: null,
    message: "",
  };
}

function loadLevel(index) {
  const clampedIndex = Math.max(0, Math.min(index, LEVELS.length - 1, game.highestUnlocked));
  const level = LEVELS[clampedIndex];
  game.levelIndex = clampedIndex;
  game.level = level;
  computeLayout(layout.width, layout.height);
  game.board = Array.from({ length: level.height }, () => Array(level.width).fill(null));
  game.conveyor = [];
  game.selectedPieceId = null;
  game.pieceCursor = 0;
  game.nextPieceId = 1;
  game.placedPieces = 0;
  game.discardedPieces = 0;
  seedConveyor();
  game.state = "playing";
  game.connectedPath = [];
  game.waterProgress = 0;
  game.waterStartedAt = 0;
  game.invalidFlash = 0;
  game.invalidCell = null;
  game.message = `${level.name}: grab pieces before they leave the belt.`;
  updateDom();
}

function seedConveyor() {
  const spacing = conveyorSpacing();
  const startX = layout.conveyorLeft + spacing * 0.2;
  while (game.conveyor.length < CONVEYOR_VISIBLE_PIECES) {
    game.conveyor.push(nextConveyorPiece(startX + game.conveyor.length * spacing));
  }
}

function nextConveyorPiece(x) {
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

function resizeCanvas() {
  const rect = canvas.getBoundingClientRect();
  const dpr = window.devicePixelRatio || 1;
  canvas.width = Math.max(1, Math.floor(rect.width * dpr));
  canvas.height = Math.max(1, Math.floor(rect.height * dpr));
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  layout.width = rect.width;
  layout.height = rect.height;
}

function tick(now) {
  const delta = Math.min(40, now - lastTime);
  lastTime = now;
  computeLayout(layout.width, layout.height);
  updateConveyor(delta);
  if (game.invalidFlash > 0) {
    game.invalidFlash = Math.max(0, game.invalidFlash - delta);
  }
  if (game.state === "won") {
    game.waterProgress = Math.min(1, game.waterProgress + delta * WATER_SPEED);
  }
  draw();
  requestAnimationFrame(tick);
}

function handlePointerDown(event) {
  const rect = canvas.getBoundingClientRect();
  const x = event.clientX - rect.left;
  const y = event.clientY - rect.top;

  const conveyorIndex = layout.conveyorRects.findIndex((slot) => pointInRect(x, y, slot));
  if (conveyorIndex >= 0 && game.state === "playing") {
    game.selectedPieceId = layout.conveyorRects[conveyorIndex].pieceId;
    game.message = "Piece selected. Place it before it rolls away.";
    updateDom();
    return;
  }

  const cell = pointToCell(x, y);
  if (!cell || game.state !== "playing") {
    return;
  }
  placeSelectedPiece(cell.x, cell.y);
}

function placeSelectedPiece(x, y) {
  const selectedIndex = game.conveyor.findIndex((piece) => piece.id === game.selectedPieceId);
  if (selectedIndex < 0) {
    flashInvalid(x, y, "Select a moving piece first.");
    return;
  }
  if (!canPlaceAt(x, y)) {
    flashInvalid(x, y);
    return;
  }

  const [piece] = game.conveyor.splice(selectedIndex, 1);
  game.selectedPieceId = null;
  game.board[y][x] = piece;
  game.placedPieces += 1;

  const path = findConnectedPath();
  if (path.length > 0) {
    game.connectedPath = path;
    game.state = "won";
    game.waterProgress = 0;
    game.waterStartedAt = performance.now();
    game.message =
      game.levelIndex === LEVELS.length - 1
        ? "All pipes connected. Spipes is watertight!"
        : "Water is flowing. Next level unlocked.";
    unlockLevel(game.levelIndex + 1);
  } else if (isBoardFull()) {
    game.state = "lost";
    game.message = "The board is full. Restart and leave yourself more room.";
  } else {
    game.message = "Keep building. Unused pieces are destroyed when they leave the belt.";
  }

  updateDom();
}

function updateConveyor(delta) {
  if (!game.level || game.state !== "playing") return;

  const spacing = conveyorSpacing();
  game.conveyor.forEach((piece) => {
    piece.x -= CONVEYOR_SPEED * delta;
  });

  const beforeCount = game.conveyor.length;
  game.conveyor = game.conveyor.filter((piece) => piece.x + layout.conveyorSlot > layout.conveyorLeft);
  const removedCount = beforeCount - game.conveyor.length;
  if (removedCount > 0) {
    game.discardedPieces += removedCount;
    if (!game.conveyor.some((piece) => piece.id === game.selectedPieceId)) {
      game.selectedPieceId = null;
    }
    updateDom();
  }

  let rightmost = game.conveyor.reduce((max, piece) => Math.max(max, piece.x), layout.conveyorLeft - spacing);
  while (rightmost < layout.conveyorRight - spacing) {
    rightmost += spacing;
    game.conveyor.push(nextConveyorPiece(rightmost));
  }
}

function conveyorSpacing() {
  return layout.conveyorSlot + layout.conveyorGap;
}

function canPlaceAt(x, y) {
  return isInsideGrid(x, y) && !game.board[y][x] && !isObstacle(x, y);
}

function isBoardFull() {
  for (let y = 0; y < game.level.height; y += 1) {
    for (let x = 0; x < game.level.width; x += 1) {
      if (!game.board[y][x] && !isObstacle(x, y)) return false;
    }
  }
  return true;
}

function flashInvalid(x, y, message = "That spot is blocked.") {
  game.invalidFlash = 280;
  game.invalidCell = isInsideGrid(x, y) ? { x, y } : null;
  game.message = message;
  updateDom();
}

function findConnectedPath() {
  const { level } = game;
  const start = {
    x: level.source.x + DIRECTIONS[level.source.dir].dx,
    y: level.source.y + DIRECTIONS[level.source.dir].dy,
  };
  if (!isInsideGrid(start.x, start.y)) return [];

  const startPiece = game.board[start.y][start.x];
  if (!startPiece || !startPiece.openings[DIRECTIONS[level.source.dir].opposite]) return [];

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

      if (next.x === level.sink.x && next.y === level.sink.y && dir === DIRECTIONS[level.sink.dir].opposite) {
        return current.path;
      }

      if (!isInsideGrid(next.x, next.y)) continue;
      const nextPiece = game.board[next.y][next.x];
      if (!nextPiece || !nextPiece.openings[DIRECTIONS[dir].opposite]) continue;

      const key = cellKey(next.x, next.y);
      if (visited.has(key)) continue;
      visited.add(key);
      queue.push({ ...next, path: [...current.path, { ...next }] });
    }
  }

  return [];
}

function draw() {
  const width = layout.width;
  const height = layout.height;
  ctx.clearRect(0, 0, width, height);
  drawBackground(width, height);
  computeLayout(width, height);
  drawHud();
  drawBoard();
  drawFixtures();
  drawConveyor();
  drawOverlayMessage();
}

function computeLayout(width, height) {
  const level = game.level || LEVELS[0];
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

function drawBackground(width, height) {
  const sky = ctx.createLinearGradient(0, 0, 0, height);
  sky.addColorStop(0, "#bdefff");
  sky.addColorStop(0.52, "#f8f4cf");
  sky.addColorStop(1, "#78c97d");
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, width, height);

  ctx.fillStyle = "#6fc46d";
  ctx.fillRect(0, height * 0.82, width, height * 0.18);

  ctx.fillStyle = "rgba(255, 255, 255, 0.72)";
  drawCloud(width * 0.2, height * 0.12, 30);
  drawCloud(width * 0.78, height * 0.16, 24);
}

function drawHud() {
  const levelNumber = game.levelIndex + 1;
  const freeCells = countFreeCells();
  const x = 18;
  const y = 16;
  const meterW = clamp(layout.width * 0.26, 132, 240);
  const freeRatio = freeCells / countPlayableCells();

  ctx.fillStyle = "rgba(255, 253, 245, 0.88)";
  roundedRect(x, y, meterW + 210, 50, 8);
  ctx.fill();
  ctx.strokeStyle = "#243447";
  ctx.lineWidth = 3;
  ctx.stroke();

  ctx.fillStyle = "#243447";
  ctx.font = "900 17px system-ui, sans-serif";
  ctx.fillText(`Level ${levelNumber}: ${game.level.name}`, x + 14, y + 22);
  ctx.font = "800 13px system-ui, sans-serif";
  ctx.fillStyle = "#65758b";
  ctx.fillText(`${game.placedPieces} placed · ${game.discardedPieces} destroyed`, x + 14, y + 41);

  const mx = x + 190;
  const my = y + 28;
  ctx.fillStyle = "#dfedf5";
  roundedRect(mx, my, meterW, 12, 6);
  ctx.fill();
  ctx.fillStyle = freeRatio <= 0.25 ? "#ff6b6b" : "#7bd88f";
  roundedRect(mx, my, meterW * Math.max(0, freeRatio), 12, 6);
  ctx.fill();
  ctx.strokeStyle = "#243447";
  ctx.lineWidth = 2;
  ctx.stroke();
}

function countPlayableCells() {
  return game.level.width * game.level.height - game.level.obstacles.length;
}

function countFreeCells() {
  let free = 0;
  for (let y = 0; y < game.level.height; y += 1) {
    for (let x = 0; x < game.level.width; x += 1) {
      if (!game.board[y][x] && !isObstacle(x, y)) free += 1;
    }
  }
  return free;
}

function drawBoard() {
  const { level } = game;
  const { cell, boardX, boardY } = layout;

  ctx.save();
  if (game.invalidFlash > 0 && !game.invalidCell) {
    const shake = Math.sin(game.invalidFlash * 0.18) * 4;
    ctx.translate(shake, 0);
  }

  ctx.fillStyle = "rgba(255, 253, 245, 0.92)";
  roundedRect(boardX - 8, boardY - 8, cell * level.width + 16, cell * level.height + 16, 8);
  ctx.fill();
  ctx.strokeStyle = "#243447";
  ctx.lineWidth = 4;
  ctx.stroke();

  for (let y = 0; y < level.height; y += 1) {
    for (let x = 0; x < level.width; x += 1) {
      drawCell(x, y);
      if (isObstacle(x, y)) {
        drawObstacle(x, y);
      }
      const piece = game.board[y][x];
      if (piece) {
        drawPipePiece(boardX + x * cell, boardY + y * cell, cell, piece.openings, {
          water: connectedProgressForCell(x, y),
        });
      }
    }
  }
  ctx.restore();
}

function drawCell(x, y) {
  const { cell, boardX, boardY } = layout;
  const px = boardX + x * cell;
  const py = boardY + y * cell;
  const isInvalid =
    game.invalidFlash > 0 && game.invalidCell && game.invalidCell.x === x && game.invalidCell.y === y;

  ctx.fillStyle = (x + y) % 2 === 0 ? "#eef9e8" : "#e3f4dc";
  ctx.fillRect(px, py, cell, cell);
  ctx.strokeStyle = isInvalid ? "#ff6b6b" : "rgba(36, 52, 71, 0.18)";
  ctx.lineWidth = isInvalid ? 4 : 1;
  ctx.strokeRect(px + 0.5, py + 0.5, cell - 1, cell - 1);
}

function drawObstacle(x, y) {
  const { cell, boardX, boardY } = layout;
  const px = boardX + x * cell;
  const py = boardY + y * cell;

  ctx.fillStyle = "#b77955";
  roundedRect(px + cell * 0.14, py + cell * 0.22, cell * 0.72, cell * 0.62, 7);
  ctx.fill();
  ctx.strokeStyle = "#77442e";
  ctx.lineWidth = Math.max(2, cell * 0.04);
  ctx.stroke();

  ctx.fillStyle = "#f9c86a";
  roundedRect(px + cell * 0.23, py + cell * 0.1, cell * 0.54, cell * 0.2, 6);
  ctx.fill();
  ctx.strokeStyle = "#77442e";
  ctx.stroke();
}

function drawFixtures() {
  const { cell, boardX, boardY } = layout;
  const sourceX = boardX - cell * 0.85;
  const sourceY = boardY + game.level.source.y * cell + cell * 0.5;
  const sinkX = boardX + game.level.width * cell + cell * 0.85;
  const sinkY = boardY + game.level.sink.y * cell + cell * 0.5;

  drawFaucet(sourceX, sourceY, cell);
  drawOutlet(sinkX, sinkY, cell);
}

function drawFaucet(x, y, cell) {
  ctx.save();
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.strokeStyle = "#4c93a8";
  ctx.lineWidth = cell * 0.22;
  ctx.beginPath();
  ctx.moveTo(x - cell * 0.34, y - cell * 0.28);
  ctx.lineTo(x + cell * 0.08, y - cell * 0.28);
  ctx.quadraticCurveTo(x + cell * 0.32, y - cell * 0.28, x + cell * 0.32, y);
  ctx.lineTo(x + cell * 0.7, y);
  ctx.stroke();

  ctx.fillStyle = "#ef476f";
  roundedRect(x - cell * 0.22, y - cell * 0.58, cell * 0.44, cell * 0.16, 5);
  ctx.fill();
  ctx.strokeStyle = "#243447";
  ctx.lineWidth = 2;
  ctx.stroke();

  ctx.fillStyle = "#1fa6ff";
  ctx.beginPath();
  ctx.ellipse(x + cell * 0.55, y + cell * 0.22, cell * 0.12, cell * 0.18, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function drawOutlet(x, y, cell) {
  ctx.save();
  ctx.fillStyle = "#5a6b7d";
  roundedRect(x - cell * 0.68, y - cell * 0.26, cell * 0.9, cell * 0.52, 7);
  ctx.fill();
  ctx.strokeStyle = "#243447";
  ctx.lineWidth = 3;
  ctx.stroke();

  ctx.fillStyle = "#222f3d";
  ctx.beginPath();
  ctx.ellipse(x - cell * 0.46, y, cell * 0.24, cell * 0.28, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = "rgba(31, 166, 255, 0.9)";
  ctx.beginPath();
  ctx.ellipse(x - cell * 0.46, y, cell * 0.11, cell * 0.15, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function drawConveyor() {
  const width = layout.width;
  const slot = layout.conveyorSlot;
  const total = layout.conveyorRight - layout.conveyorLeft;
  const startX = layout.conveyorLeft;
  const y = layout.conveyorY;

  layout.conveyorRects = [];

  ctx.fillStyle = "rgba(255, 253, 245, 0.9)";
  roundedRect(Math.max(10, startX - 16), y - 16, Math.min(width - 20, total + 32), slot + 46, 8);
  ctx.fill();
  ctx.strokeStyle = "#243447";
  ctx.lineWidth = 3;
  ctx.stroke();

  drawConveyorBelt(startX - 6, y + slot * 0.5, total + 12, slot * 0.42);

  game.conveyor.forEach((piece) => {
    const x = piece.x;
    if (x > layout.conveyorRight || x + slot < layout.conveyorLeft) return;
    layout.conveyorRects.push({ x, y, width: slot, height: slot, pieceId: piece.id });

    ctx.fillStyle = piece.id === game.selectedPieceId ? "#fff1a8" : "#ffffff";
    roundedRect(x, y, slot, slot, 8);
    ctx.fill();
    ctx.strokeStyle = piece.id === game.selectedPieceId ? "#ef476f" : "#243447";
    ctx.lineWidth = piece.id === game.selectedPieceId ? 4 : 2;
    ctx.stroke();

    drawPipePiece(x + 4, y + 4, slot - 8, piece.openings, { water: 0, preview: true });
  });

  ctx.fillStyle = "#243447";
  ctx.font = "900 13px system-ui, sans-serif";
  ctx.textAlign = "center";
  ctx.fillText("CONVEYOR BELT", width / 2, y + slot + 27);
  ctx.textAlign = "start";
}

function drawConveyorBelt(x, y, width, height) {
  ctx.save();
  ctx.fillStyle = "#485766";
  roundedRect(x, y - height * 0.5, width, height, height * 0.5);
  ctx.fill();
  ctx.strokeStyle = "#243447";
  ctx.lineWidth = 2;
  ctx.stroke();

  ctx.strokeStyle = "rgba(255, 255, 255, 0.35)";
  ctx.lineWidth = 3;
  for (let mark = x + 18; mark < x + width; mark += 34) {
    ctx.beginPath();
    ctx.moveTo(mark, y - height * 0.28);
    ctx.lineTo(mark - 12, y + height * 0.28);
    ctx.stroke();
  }

  ctx.fillStyle = "#ef476f";
  ctx.beginPath();
  ctx.moveTo(x - 12, y);
  ctx.lineTo(x + 4, y - 9);
  ctx.lineTo(x + 4, y + 9);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

function drawOverlayMessage() {
  if (game.state === "playing") return;
  const width = layout.width;
  const panelW = Math.min(width - 32, 480);
  const panelH = 96;
  const x = (width - panelW) / 2;
  const y = Math.max(20, layout.boardY + layout.cell * game.level.height * 0.5 - panelH * 0.5);

  ctx.fillStyle = "rgba(255, 253, 245, 0.94)";
  roundedRect(x, y, panelW, panelH, 8);
  ctx.fill();
  ctx.strokeStyle = game.state === "won" ? "#118ab2" : "#ef476f";
  ctx.lineWidth = 4;
  ctx.stroke();

  ctx.fillStyle = "#243447";
  ctx.textAlign = "center";
  ctx.font = "900 25px system-ui, sans-serif";
  ctx.fillText(game.state === "won" ? "Connected!" : "No room left", width / 2, y + 38);
  ctx.font = "700 15px system-ui, sans-serif";
  ctx.fillStyle = "#65758b";
  wrapText(game.message, width / 2, y + 64, panelW - 36, 20);
  ctx.textAlign = "start";
}

function drawPipePiece(x, y, size, openings, options = {}) {
  const centerX = x + size / 2;
  const centerY = y + size / 2;
  const radius = size * 0.18;
  const pipeW = size * 0.34;
  const waterW = pipeW * 0.42;

  ctx.save();
  ctx.lineCap = "round";
  ctx.lineJoin = "round";

  ctx.strokeStyle = options.preview ? "#ca8a27" : "#b9771f";
  ctx.lineWidth = pipeW;
  drawPipeSegments(centerX, centerY, size, openings);
  ctx.stroke();

  ctx.strokeStyle = "#ffd166";
  ctx.lineWidth = pipeW * 0.72;
  drawPipeSegments(centerX, centerY, size, openings);
  ctx.stroke();

  if (options.water > 0) {
    ctx.strokeStyle = "#1fa6ff";
    ctx.lineWidth = waterW;
    drawPipeSegments(centerX, centerY, size, openings, options.water);
    ctx.stroke();
  }

  ctx.fillStyle = "#ffe9a8";
  ctx.beginPath();
  ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = "#b9771f";
  ctx.lineWidth = Math.max(1.5, size * 0.035);
  ctx.stroke();
  ctx.restore();
}

function drawPipeSegments(centerX, centerY, size, openings, progress = 1) {
  const segmentLength = size * 0.36;
  const dirs = DIRECTION_ORDER.filter((dir) => openings[dir]);
  const visibleCount = Math.ceil(dirs.length * progress);

  ctx.beginPath();
  dirs.slice(0, visibleCount).forEach((dir, index) => {
    const localProgress = index === visibleCount - 1 ? clamp(progress * dirs.length - index, 0, 1) : 1;
    const endX = centerX + DIRECTIONS[dir].dx * segmentLength * localProgress;
    const endY = centerY + DIRECTIONS[dir].dy * segmentLength * localProgress;
    ctx.moveTo(centerX, centerY);
    ctx.lineTo(endX, endY);
  });
}

function connectedProgressForCell(x, y) {
  if (game.state !== "won") return 0;
  const index = game.connectedPath.findIndex((cell) => cell.x === x && cell.y === y);
  if (index < 0) return 0;
  const pathLength = Math.max(1, game.connectedPath.length);
  return clamp(game.waterProgress * pathLength - index, 0, 1);
}

function rotateOpenings(openings) {
  return {
    up: Boolean(openings.left),
    right: Boolean(openings.up),
    down: Boolean(openings.right),
    left: Boolean(openings.down),
  };
}

function rotateOpeningsBy(openings, turns) {
  let rotated = { ...openings };
  for (let i = 0; i < turns; i += 1) {
    rotated = rotateOpenings(rotated);
  }
  return rotated;
}

function isInsideGrid(x, y) {
  return game.level && x >= 0 && y >= 0 && x < game.level.width && y < game.level.height;
}

function isObstacle(x, y) {
  return game.level.obstacles.some(([ox, oy]) => ox === x && oy === y);
}

function pointToCell(x, y) {
  const { boardX, boardY, cell } = layout;
  const gx = Math.floor((x - boardX) / cell);
  const gy = Math.floor((y - boardY) / cell);
  if (!isInsideGrid(gx, gy)) return null;
  return { x: gx, y: gy };
}

function pointInRect(x, y, rect) {
  return x >= rect.x && y >= rect.y && x <= rect.x + rect.width && y <= rect.y + rect.height;
}

function cellKey(x, y) {
  return `${x},${y}`;
}

function updateDom() {
  statusEl.textContent = `Level ${game.levelIndex + 1}/${LEVELS.length} · ${countFreeCells()} free cells`;
  prevButton.disabled = game.levelIndex <= 0;
  nextButton.disabled = game.levelIndex >= Math.min(game.highestUnlocked, LEVELS.length - 1);
}

function handleNextLevel() {
  if (game.state === "won" && game.levelIndex < LEVELS.length - 1) {
    loadLevel(game.levelIndex + 1);
    return;
  }
  loadLevel(Math.min(game.highestUnlocked, game.levelIndex + 1));
}

function unlockLevel(index) {
  const nextHighest = Math.min(LEVELS.length - 1, index);
  if (nextHighest > game.highestUnlocked) {
    game.highestUnlocked = nextHighest;
    localStorage.setItem(STORAGE_KEY, String(nextHighest));
  }
}

function getHighestUnlocked() {
  const saved = Number(localStorage.getItem(STORAGE_KEY));
  return Number.isFinite(saved) ? clamp(Math.floor(saved), 0, LEVELS.length - 1) : 0;
}

function validateLevels(levels) {
  levels.forEach((level, index) => {
    const required = ["width", "height", "source", "sink", "obstacles", "pieceCycle"];
    required.forEach((key) => {
      if (!(key in level)) {
        throw new Error(`Level ${index + 1} is missing "${key}".`);
      }
    });
    if (level.width <= 0 || level.height <= 0) {
      throw new Error(`Level ${index + 1} has invalid dimensions.`);
    }
    level.obstacles.forEach(([x, y]) => {
      if (x < 0 || y < 0 || x >= level.width || y >= level.height) {
        throw new Error(`Level ${index + 1} has an obstacle outside the board.`);
      }
    });
    if (level.pieceCycle.length === 0) {
      throw new Error(`Level ${index + 1} needs at least one conveyor piece.`);
    }
    level.pieceCycle.forEach((type) => {
      if (!PIECES[type]) {
        throw new Error(`Level ${index + 1} references unknown piece "${type}".`);
      }
    });
    [level.source, level.sink].forEach((fixture) => {
      if (!DIRECTIONS[fixture.dir]) {
        throw new Error(`Level ${index + 1} has a fixture with invalid direction.`);
      }
    });
  });
}

function roundedRect(x, y, width, height, radius) {
  const r = Math.min(radius, width / 2, height / 2);
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + width - r, y);
  ctx.quadraticCurveTo(x + width, y, x + width, y + r);
  ctx.lineTo(x + width, y + height - r);
  ctx.quadraticCurveTo(x + width, y + height, x + width - r, y + height);
  ctx.lineTo(x + r, y + height);
  ctx.quadraticCurveTo(x, y + height, x, y + height - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
}

function drawCloud(x, y, scale) {
  ctx.beginPath();
  ctx.arc(x, y, scale * 0.55, 0, Math.PI * 2);
  ctx.arc(x + scale * 0.48, y - scale * 0.18, scale * 0.68, 0, Math.PI * 2);
  ctx.arc(x + scale * 1.04, y, scale * 0.5, 0, Math.PI * 2);
  ctx.fill();
}

function wrapText(text, x, y, maxWidth, lineHeight) {
  const words = text.split(" ");
  let line = "";
  let currentY = y;
  words.forEach((word) => {
    const testLine = `${line}${word} `;
    if (ctx.measureText(testLine).width > maxWidth && line.length > 0) {
      ctx.fillText(line.trim(), x, currentY);
      line = `${word} `;
      currentY += lineHeight;
    } else {
      line = testLine;
    }
  });
  ctx.fillText(line.trim(), x, currentY);
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}
