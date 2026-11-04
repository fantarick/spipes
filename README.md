# Spipes

Spipes is a browser puzzle game built with plain HTML, CSS, and JavaScript modules.

## Run locally

Open `index.html` through a small local server so JavaScript modules load correctly:

```powershell
.\scripts\dev-server.ps1
```

Then visit:

```text
http://localhost:8000/
```

## GitHub Pages

The project is designed to be published directly from the `main` branch root.

## Progress storage

Unlocked levels are saved in the browser's `localStorage` when available. If
browser policy blocks storage or a write fails, the game keeps progress in memory
for the current page session. That fallback is lost on reload; persistent saves
continue to use the existing `spipes.highestUnlocked` key. Invalid saved values
are bounded to the available levels, and stale saves cannot lower session progress.

## Tests

Run the dependency-free suite with Node.js 22 (also verified on 18.20.4):

```bash
node --experimental-default-type=module --test tests/*.test.mjs
```

The suite covers blocked/unavailable storage, failed reads and writes, persistence,
progress bounds, level validation, pipe rotation, and game completion without
storage. It does not replace manual browser, touch or layout checks.

The Game checks workflow runs on pull requests and pushes to `main`, with read-only
repository permissions and no deployment. The Pages workflow remains separate.
