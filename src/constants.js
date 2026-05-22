export const STORAGE_KEY = "spipes.highestUnlocked";
export const WATER_SPEED = 0.0042;
export const CONVEYOR_VISIBLE_PIECES = 7;
export const CONVEYOR_SPEED = 0.055;
export const BUILD_TIME_SECONDS = 60;

export const DIRECTIONS = {
  up: { dx: 0, dy: -1, opposite: "down" },
  right: { dx: 1, dy: 0, opposite: "left" },
  down: { dx: 0, dy: 1, opposite: "up" },
  left: { dx: -1, dy: 0, opposite: "right" },
};

export const DIRECTION_ORDER = ["up", "right", "down", "left"];

export const PIECES = {
  straight: { label: "Straight", openings: { up: true, down: true } },
  elbow: { label: "Elbow", openings: { up: true, right: true } },
  tee: { label: "Tee", openings: { up: true, right: true, left: true } },
  cross: { label: "Cross", openings: { up: true, right: true, down: true, left: true } },
};
