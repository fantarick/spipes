import { DIRECTIONS, PIECES } from "./constants.js";

export const LEVELS = [
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
