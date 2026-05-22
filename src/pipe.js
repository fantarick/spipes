export function rotateOpenings(openings) {
  return {
    up: Boolean(openings.left),
    right: Boolean(openings.up),
    down: Boolean(openings.right),
    left: Boolean(openings.down),
  };
}

export function rotateOpeningsBy(openings, turns) {
  let rotated = { ...openings };
  for (let i = 0; i < turns; i += 1) {
    rotated = rotateOpenings(rotated);
  }
  return rotated;
}
