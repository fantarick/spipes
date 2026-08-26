import {
  DEFAULT_BUILD_TIME_SECONDS,
  DEFAULT_CONVEYOR_SPEED,
  DEFAULT_DIFFICULTY,
  DIRECTIONS,
  PIECES,
} from "./constants.js";

export const LEVELS = [
  {
    name: "Leaky Garden",
    difficulty: "Easy",
    buildTime: 78,
    conveyorSpeed: 0.041,
    width: 10,
    height: 8,
    source: { x: -1, y: 3, dir: "right" },
    sink: { x: 10, y: 3, dir: "left" },
    obstacles: [
      [4, 2],
      [4, 4],
      [7, 1],
      [7, 6],
    ],
    pieceCycle: [
      { type: "straight", turns: 1 },
      { type: "straight", turns: 1 },
      { type: "straight", turns: 1 },
      { type: "elbow", turns: 0 },
      { type: "elbow", turns: 1 },
      { type: "straight", turns: 1 },
      { type: "straight", turns: 0 },
      { type: "straight", turns: 1 },
    ],
  },
  {
    name: "Basement Bend",
    difficulty: "Easy+",
    buildTime: 74,
    conveyorSpeed: 0.045,
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
    pieceCycle: [
      { type: "straight", turns: 1 },
      { type: "straight", turns: 1 },
      { type: "elbow", turns: 3 },
      { type: "straight", turns: 0 },
      { type: "straight", turns: 1 },
      { type: "elbow", turns: 1 },
      { type: "straight", turns: 1 },
      { type: "straight", turns: 0 },
      { type: "tee", turns: 1 },
    ],
  },
  {
    name: "Toolbox Trouble",
    difficulty: "Medium",
    buildTime: 70,
    conveyorSpeed: 0.049,
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
    pieceCycle: [
      { type: "straight", turns: 1 },
      { type: "straight", turns: 1 },
      { type: "elbow", turns: 2 },
      { type: "straight", turns: 0 },
      { type: "straight", turns: 1 },
      { type: "elbow", turns: 0 },
      { type: "straight", turns: 0 },
      { type: "straight", turns: 1 },
      { type: "elbow", turns: 2 },
      { type: "tee", turns: 0 },
    ],
  },
  {
    name: "Pressure Alley",
    difficulty: "Hard",
    buildTime: 66,
    conveyorSpeed: 0.053,
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
    pieceCycle: [
      { type: "elbow", turns: 3 },
      { type: "straight", turns: 0 },
      { type: "elbow", turns: 1 },
      { type: "straight", turns: 1 },
      { type: "straight", turns: 1 },
      { type: "elbow", turns: 3 },
      { type: "elbow", turns: 1 },
      { type: "straight", turns: 1 },
      { type: "elbow", turns: 3 },
      { type: "straight", turns: 0 },
      { type: "elbow", turns: 1 },
      { type: "tee", turns: 2 },
    ],
  },
  {
    name: "Grand Plumbing Finale",
    difficulty: "Final",
    buildTime: 64,
    conveyorSpeed: 0.056,
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
      [2, 5],
      [8, 5],
    ],
    pieceCycle: [
      { type: "straight", turns: 1 },
      { type: "elbow", turns: 2 },
      { type: "straight", turns: 0 },
      { type: "elbow", turns: 0 },
      { type: "straight", turns: 1 },
      { type: "elbow", turns: 3 },
      { type: "elbow", turns: 1 },
      { type: "straight", turns: 1 },
      { type: "elbow", turns: 2 },
      { type: "elbow", turns: 0 },
      { type: "straight", turns: 1 },
      { type: "straight", turns: 0 },
      { type: "elbow", turns: 3 },
      { type: "elbow", turns: 1 },
      { type: "tee", turns: 3 },
      { type: "cross", turns: 0 },
    ],
  },
];

export function getLevelBuildTime(level) {
  return Number.isFinite(level?.buildTime) ? level.buildTime : DEFAULT_BUILD_TIME_SECONDS;
}

export function getLevelConveyorSpeed(level) {
  return Number.isFinite(level?.conveyorSpeed) ? level.conveyorSpeed : DEFAULT_CONVEYOR_SPEED;
}

export function getLevelDifficulty(level) {
  return level?.difficulty || DEFAULT_DIFFICULTY;
}

export function getPieceCycleType(entry) {
  return typeof entry === "string" ? entry : entry?.type;
}

export function validateLevels(levels) {
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
    if ("buildTime" in level && (!Number.isFinite(level.buildTime) || level.buildTime <= 0)) {
      throw new Error(`Level ${index + 1} has an invalid build time.`);
    }
    if ("conveyorSpeed" in level && (!Number.isFinite(level.conveyorSpeed) || level.conveyorSpeed <= 0)) {
      throw new Error(`Level ${index + 1} has an invalid conveyor speed.`);
    }
    if ("difficulty" in level && typeof level.difficulty !== "string") {
      throw new Error(`Level ${index + 1} has an invalid difficulty label.`);
    }
    level.obstacles.forEach(([x, y]) => {
      if (x < 0 || y < 0 || x >= level.width || y >= level.height) {
        throw new Error(`Level ${index + 1} has an obstacle outside the board.`);
      }
    });
    if (level.pieceCycle.length === 0) {
      throw new Error(`Level ${index + 1} needs at least one conveyor piece.`);
    }
    level.pieceCycle.forEach((entry) => {
      const type = getPieceCycleType(entry);
      if (!PIECES[type]) {
        throw new Error(`Level ${index + 1} references unknown piece "${type}".`);
      }
      if (typeof entry !== "string") {
        if (!entry || typeof entry !== "object") {
          throw new Error(`Level ${index + 1} has an invalid conveyor piece.`);
        }
        if ("turns" in entry && (!Number.isInteger(entry.turns) || entry.turns < 0 || entry.turns > 3)) {
          throw new Error(`Level ${index + 1} has a piece with invalid rotation.`);
        }
      }
    });
    [level.source, level.sink].forEach((fixture) => {
      if (!DIRECTIONS[fixture.dir]) {
        throw new Error(`Level ${index + 1} has a fixture with invalid direction.`);
      }
    });
  });
}
