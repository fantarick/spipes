import { BUILD_TIME_SECONDS, DIRECTIONS, DIRECTION_ORDER } from "./constants.js";
import { LEVELS } from "./levels.js";
import { clamp } from "./math.js";
import { getSelectedPiece } from "./game.js";
import { computeLayout, isInsideGrid, isObstacle } from "./layout.js";

export function resizeCanvas(canvas, ctx, layout) {
  const rect = canvas.getBoundingClientRect();
  const dpr = window.devicePixelRatio || 1;
  canvas.width = Math.max(1, Math.floor(rect.width * dpr));
  canvas.height = Math.max(1, Math.floor(rect.height * dpr));
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  layout.width = rect.width;
  layout.height = rect.height;
}

export function draw(ctx, game, layout) {
  const width = layout.width;
  const height = layout.height;
  ctx.clearRect(0, 0, width, height);
  drawBackground(ctx, width, height);
  computeLayout(layout, game.level || LEVELS[0], width, height);
  drawHud(ctx, game, layout);
  drawBoard(ctx, game, layout);
  drawFixtures(ctx, game, layout);
  drawConveyor(ctx, game, layout);
  drawOverlayMessage(ctx, game, layout);
}

function drawBackground(ctx, width, height) {
  const sky = ctx.createLinearGradient(0, 0, 0, height);
  sky.addColorStop(0, "#bdefff");
  sky.addColorStop(0.52, "#f8f4cf");
  sky.addColorStop(1, "#78c97d");
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, width, height);

  ctx.fillStyle = "#6fc46d";
  ctx.fillRect(0, height * 0.82, width, height * 0.18);

  ctx.fillStyle = "rgba(255, 255, 255, 0.72)";
  drawCloud(ctx, width * 0.2, height * 0.12, 30);
  drawCloud(ctx, width * 0.78, height * 0.16, 24);
}

function drawHud(ctx, game, layout) {
  const levelNumber = game.levelIndex + 1;
  const x = 18;
  const y = 16;
  const meterW = clamp(layout.width * 0.26, 132, 240);
  const timeRatio = game.timerRemaining / BUILD_TIME_SECONDS;

  ctx.fillStyle = "rgba(255, 253, 245, 0.88)";
  roundedRect(ctx, x, y, meterW + 240, 62, 8);
  ctx.fill();
  ctx.strokeStyle = "#243447";
  ctx.lineWidth = 3;
  ctx.stroke();

  ctx.fillStyle = "#243447";
  ctx.font = "900 17px system-ui, sans-serif";
  ctx.fillText(`Level ${levelNumber}: ${game.level.name}`, x + 14, y + 22);
  ctx.font = "800 13px system-ui, sans-serif";
  ctx.fillStyle = "#65758b";
  ctx.fillText(`${game.placedPieces} placed - ${game.discardedPieces} destroyed`, x + 14, y + 42);

  const mx = x + 190;
  const my = y + 35;
  ctx.fillStyle = "#243447";
  ctx.font = "900 16px system-ui, sans-serif";
  ctx.fillText(formatTimer(game.timerRemaining), mx, y + 22);

  ctx.fillStyle = "#dfedf5";
  roundedRect(ctx, mx, my, meterW, 12, 6);
  ctx.fill();
  ctx.fillStyle = timeRatio <= 0.18 ? "#ff6b6b" : "#7bd88f";
  roundedRect(ctx, mx, my, meterW * Math.max(0, timeRatio), 12, 6);
  ctx.fill();
  ctx.strokeStyle = "#243447";
  ctx.lineWidth = 2;
  ctx.stroke();
}

function drawBoard(ctx, game, layout) {
  const { level } = game;
  const { cell, boardX, boardY } = layout;

  ctx.save();
  if (game.invalidFlash > 0 && !game.invalidCell) {
    const shake = Math.sin(game.invalidFlash * 0.18) * 4;
    ctx.translate(shake, 0);
  }

  ctx.fillStyle = "rgba(255, 253, 245, 0.92)";
  roundedRect(ctx, boardX - 8, boardY - 8, cell * level.width + 16, cell * level.height + 16, 8);
  ctx.fill();
  ctx.strokeStyle = "#243447";
  ctx.lineWidth = 4;
  ctx.stroke();

  for (let y = 0; y < level.height; y += 1) {
    for (let x = 0; x < level.width; x += 1) {
      drawCell(ctx, game, layout, x, y);
      if (isObstacle(game, x, y)) {
        drawObstacle(ctx, layout, x, y);
      }
      const piece = game.board[y][x];
      if (piece) {
        drawPipePiece(ctx, boardX + x * cell, boardY + y * cell, cell, piece.openings, {
          water: connectedProgressForCell(game, x, y),
        });
      }
    }
  }
  drawPlacementPreview(ctx, game, layout);
  ctx.restore();
}

function drawPlacementPreview(ctx, game, layout) {
  const selected = getSelectedPiece(game);
  const cell = game.hoverCell;
  if (!selected || !cell || game.state !== "playing") return;

  const { boardX, boardY } = layout;
  const px = boardX + cell.x * layout.cell;
  const py = boardY + cell.y * layout.cell;
  const valid = canPlaceAt(game, cell.x, cell.y);

  ctx.save();
  ctx.globalAlpha = valid ? 0.66 : 0.38;
  ctx.fillStyle = valid ? "#fff7bf" : "#ffb3b3";
  roundedRect(ctx, px + 3, py + 3, layout.cell - 6, layout.cell - 6, 7);
  ctx.fill();
  drawPipePiece(ctx, px, py, layout.cell, selected.openings, { water: 0, preview: true });
  ctx.globalAlpha = 1;
  ctx.strokeStyle = valid ? "#118ab2" : "#ef476f";
  ctx.lineWidth = 4;
  roundedRect(ctx, px + 3, py + 3, layout.cell - 6, layout.cell - 6, 7);
  ctx.stroke();
  ctx.restore();
}

function drawCell(ctx, game, layout, x, y) {
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

function drawObstacle(ctx, layout, x, y) {
  const { cell, boardX, boardY } = layout;
  const px = boardX + x * cell;
  const py = boardY + y * cell;

  ctx.fillStyle = "#b77955";
  roundedRect(ctx, px + cell * 0.14, py + cell * 0.22, cell * 0.72, cell * 0.62, 7);
  ctx.fill();
  ctx.strokeStyle = "#77442e";
  ctx.lineWidth = Math.max(2, cell * 0.04);
  ctx.stroke();

  ctx.fillStyle = "#f9c86a";
  roundedRect(ctx, px + cell * 0.23, py + cell * 0.1, cell * 0.54, cell * 0.2, 6);
  ctx.fill();
  ctx.strokeStyle = "#77442e";
  ctx.stroke();
}

function drawFixtures(ctx, game, layout) {
  const { cell, boardX, boardY } = layout;
  const sourceX = boardX - cell * 0.85;
  const sourceY = boardY + game.level.source.y * cell + cell * 0.5;
  const sinkX = boardX + game.level.width * cell + cell * 0.85;
  const sinkY = boardY + game.level.sink.y * cell + cell * 0.5;

  drawFaucet(ctx, sourceX, sourceY, cell);
  drawOutlet(ctx, sinkX, sinkY, cell);
}

function drawFaucet(ctx, x, y, cell) {
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
  roundedRect(ctx, x - cell * 0.22, y - cell * 0.58, cell * 0.44, cell * 0.16, 5);
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

function drawOutlet(ctx, x, y, cell) {
  ctx.save();
  ctx.fillStyle = "#5a6b7d";
  roundedRect(ctx, x - cell * 0.68, y - cell * 0.26, cell * 0.9, cell * 0.52, 7);
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

function drawConveyor(ctx, game, layout) {
  const width = layout.width;
  const slot = layout.conveyorSlot;
  const total = layout.conveyorRight - layout.conveyorLeft;
  const startX = layout.conveyorLeft;
  const y = layout.conveyorY;

  layout.conveyorRects = [];

  ctx.fillStyle = "rgba(255, 253, 245, 0.9)";
  roundedRect(ctx, Math.max(10, startX - 16), y - 16, Math.min(width - 20, total + 32), slot + 46, 8);
  ctx.fill();
  ctx.strokeStyle = "#243447";
  ctx.lineWidth = 3;
  ctx.stroke();

  drawConveyorBelt(ctx, startX - 6, y + slot * 0.5, total + 12, slot * 0.42);

  game.conveyor.forEach((piece) => {
    const x = piece.x;
    if (x > layout.conveyorRight || x + slot < layout.conveyorLeft) return;
    layout.conveyorRects.push({ x, y, width: slot, height: slot, pieceId: piece.id });

    ctx.fillStyle = piece.id === game.selectedPieceId ? "#fff1a8" : "#ffffff";
    roundedRect(ctx, x, y, slot, slot, 8);
    ctx.fill();
    ctx.strokeStyle = piece.id === game.selectedPieceId ? "#ef476f" : "#243447";
    ctx.lineWidth = piece.id === game.selectedPieceId ? 4 : 2;
    ctx.stroke();

    drawPipePiece(ctx, x + 4, y + 4, slot - 8, piece.openings, { water: 0, preview: true });
  });

  ctx.fillStyle = "#243447";
  ctx.font = "900 13px system-ui, sans-serif";
  ctx.textAlign = "center";
  ctx.fillText("CONVEYOR BELT", width / 2, y + slot + 27);
  ctx.textAlign = "start";
}

function drawConveyorBelt(ctx, x, y, width, height) {
  ctx.save();
  ctx.fillStyle = "#485766";
  roundedRect(ctx, x, y - height * 0.5, width, height, height * 0.5);
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

function drawOverlayMessage(ctx, game, layout) {
  if (game.state === "playing") return;
  const width = layout.width;
  const panelW = Math.min(width - 32, 480);
  const panelH = 96;
  const x = (width - panelW) / 2;
  const y = Math.max(20, layout.boardY + layout.cell * game.level.height * 0.5 - panelH * 0.5);

  ctx.fillStyle = "rgba(255, 253, 245, 0.94)";
  roundedRect(ctx, x, y, panelW, panelH, 8);
  ctx.fill();
  ctx.strokeStyle = game.state === "won" ? "#118ab2" : "#ef476f";
  ctx.lineWidth = 4;
  ctx.stroke();

  ctx.fillStyle = "#243447";
  ctx.textAlign = "center";
  ctx.font = "900 25px system-ui, sans-serif";
  ctx.fillText(game.state === "won" ? "Pressure holds!" : "Pressure failed", width / 2, y + 38);
  ctx.font = "700 15px system-ui, sans-serif";
  ctx.fillStyle = "#65758b";
  wrapText(ctx, game.message, width / 2, y + 64, panelW - 36, 20);
  ctx.textAlign = "start";
}

function drawPipePiece(ctx, x, y, size, openings, options = {}) {
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
  drawPipeSegments(ctx, centerX, centerY, size, openings);
  ctx.stroke();

  ctx.strokeStyle = "#ffd166";
  ctx.lineWidth = pipeW * 0.72;
  drawPipeSegments(ctx, centerX, centerY, size, openings);
  ctx.stroke();

  if (options.water > 0) {
    ctx.strokeStyle = "#1fa6ff";
    ctx.lineWidth = waterW;
    drawPipeSegments(ctx, centerX, centerY, size, openings, options.water);
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

function drawPipeSegments(ctx, centerX, centerY, size, openings, progress = 1) {
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

function connectedProgressForCell(game, x, y) {
  if (game.state !== "won") return 0;
  const index = game.connectedPath.findIndex((cell) => cell.x === x && cell.y === y);
  if (index < 0) return 0;
  const pathLength = Math.max(1, game.connectedPath.length);
  return clamp(game.waterProgress * pathLength - index, 0, 1);
}

function canPlaceAt(game, x, y) {
  return isInsideGrid(game, x, y) && !game.board[y][x] && !isObstacle(game, x, y);
}

function formatTimer(seconds) {
  const wholeSeconds = Math.max(0, Math.ceil(seconds));
  const minutes = Math.floor(wholeSeconds / 60);
  const remainingSeconds = String(wholeSeconds % 60).padStart(2, "0");
  return `${minutes}:${remainingSeconds}`;
}

function roundedRect(ctx, x, y, width, height, radius) {
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

function drawCloud(ctx, x, y, scale) {
  ctx.beginPath();
  ctx.arc(x, y, scale * 0.55, 0, Math.PI * 2);
  ctx.arc(x + scale * 0.48, y - scale * 0.18, scale * 0.68, 0, Math.PI * 2);
  ctx.arc(x + scale * 1.04, y, scale * 0.5, 0, Math.PI * 2);
  ctx.fill();
}

function wrapText(ctx, text, x, y, maxWidth, lineHeight) {
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
