import { WATER_SPEED } from "./constants.js";
import { createGame, loadLevel, tickGameEffects, updateConveyor, updateTimer } from "./game.js";
import { bindInput } from "./input.js";
import { createLayout, computeLayout } from "./layout.js";
import { LEVELS, validateLevels } from "./levels.js";
import { draw, resizeCanvas } from "./renderer.js";
import { getDomRefs, updateDom } from "./ui.js";

const refs = getDomRefs();
const layout = createLayout();
const game = createGame();
let lastTime = performance.now();

validateLevels(LEVELS);
resizeCanvas(refs.canvas, refs.ctx, layout);
loadLevel(game, layout, 0, { intro: true });
updateDom(game, refs);

bindInput(refs, game, layout, {
  resize() {
    resizeCanvas(refs.canvas, refs.ctx, layout);
    computeLayout(layout, game.level, layout.width, layout.height);
  },
  updateDom() {
    updateDom(game, refs);
  },
});

requestAnimationFrame(tick);

function tick(now) {
  const rawDelta = now - lastTime;
  const delta = Math.min(40, rawDelta);
  lastTime = now;

  computeLayout(layout, game.level, layout.width, layout.height);
  if (updateConveyor(game, layout, delta)) {
    updateDom(game, refs);
  }
  if (updateTimer(game, rawDelta)) {
    updateDom(game, refs);
  }
  tickGameEffects(game, delta);

  if (game.state === "won") {
    game.waterProgress = Math.min(1, game.waterProgress + delta * WATER_SPEED);
  }

  draw(refs.ctx, game, layout);
  requestAnimationFrame(tick);
}
