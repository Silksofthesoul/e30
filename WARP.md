# WARP.md

This file provides guidance to WARP (warp.dev) when working with code in this repository.

## Overview

This is a small, self-contained browser project (no build system, no package manager). The app renders a responsive grid ("matrix") of cells that fills the viewport, with cell colors driven by random values from a finite library.

The JavaScript is structured around a simple dependency registry (`$dep`) and a few core classes:
- `js/utils/dep.js` exposes a global `$dep` instance and shorthands `$export` / `$import` for registering and consuming dependencies.
- `js/mixins/Logs.js` defines a `Logs` helper with a static `log` method, used for lightweight lifecycle logging.
- `js/classes/Base.js` provides a base class that wires in logging and a `name` property for subclasses.
- `js/classes/Scene.js` represents the root scene container, manages child components, and appends its root element to `document.body`.
- `js/classes/Cell.js` represents a single matrix cell, responsible for creating/updating its own DOM element and applying CSS modifier classes based on its numeric `value`.
- `js/classes/Matrix.js` owns a 2D array of `Cell` instances, generates random values from a configurable `lib` of numbers, manages a root `div.matrix` element, and computes CSS `--cell-size` so the grid fills the viewport.
- `js/utils/type.js` provides primitive type helpers (`int`, `float`, `str`) exported through `$dep`.
- `js/utils/rnd.js` depends on `type.js` helpers (via `$dep.import`) and exports random helpers (`rndInt`, `rndFromArray`).
- `js/utils/fn.js` currently exports `altQueue`, a small functional helper for chaining predicates/handlers.
- `js/index.js` is the main entry: it imports `Scene`, `Matrix`, and random helpers from `$dep`, constructs a scene, creates a matrix sized to the current window, appends it to the scene, renders it, and re-creates/re-renders the matrix on `resize`.

The CSS under `css/` (e.g. `styles.css`, `matrix.css`, `scene.css`, `variables.css`) controls layout, cell sizing via the `--cell-size` custom property, and color mapping for matrix cells.

`index.html` is the single HTML entry point. It:
- Loads styles from `./css/styles.css`.
- Loads JS in a specific order via `<script defer>` tags so that `$dep`, utilities, mixins, and classes are registered before `js/index.js` executes.
- Contains only a comment placeholder in `<body>`; all DOM content is created dynamically by `Scene`/`Matrix`/`Cell`.

## Running and developing

There is no build, lint, or test tooling configured in this repo. Development workflows are simple:

### Open the app in a browser

From this directory (`/var/www/silksofthesoul-ru/src/projects/e30`):

- Using a simple HTTP server (Python 3 installed by default on most systems):
  - `python3 -m http.server 8000`
  - Then open `http://localhost:8000/` in your browser.

Any static file server that serves `index.html` from the repo root will work. Avoid opening `index.html` via the `file://` protocol if you later introduce XHR/fetch or stricter security features.

### Live editing

Because all scripts are plain ES5-style modules loaded via `<script>` tags and a custom `$dep` registry, you can:
- Edit JS or CSS files under `js/` and `css/`.
- Refresh the browser page to see changes.

There is no hot-reload setup; if you add one (e.g. via a dev server or bundler), document it here.

## Architectural notes for future changes

- **Global dependency registry (`$dep`)**: All shared JS functionality flows through `js/utils/dep.js`. New classes/utilities should register themselves via `$dep.export({ Name })` and consume dependencies via `$dep.import(['Name'])` or the `$import` shorthand. Respect this pattern to keep modules decoupled from script load order.
- **Class hierarchy**:
  - Inherit from `Base` for new visual components that need logging and a `name` field.
  - Follow the pattern from `Scene`, `Matrix`, and `Cell`: each class owns its root DOM element and exposes it via an `element` getter.
- **Scene composition**:
  - `Scene.append(key, instance)` manages a keyed collection of children (like layers). Re-using keys replaces existing instances and removes their DOM nodes.
  - If you introduce additional visual components (e.g. overlays, HUDs), attach them to the `Scene` with distinct keys and implement a `render()` method on each.
- **Matrix and cell rendering**:
  - `Matrix.initData()` constructs a 2D array of `Cell` instances; `gen()` assigns random `value`s using `rndFromArray(this.lib)`.
  - `Matrix.render()` is responsible for:
    - Computing `cellSize` based on `window.innerWidth/innerHeight` and `width/height`.
    - Setting `--cell-size` on the `.matrix` element.
    - Building row elements (`.matrix__row`) and delegating cell DOM creation/updating to `Cell.render(rowEl)`.
    - On each render pass, computing a `clickable` flag for every `Cell` based on its 4-neighbours (up/down/left/right). Cells that have at least one neighbour with the same `value` are marked clickable and get a `matrix__cell--clickable` modifier (cursor: `pointer`); isolated cells keep the default cursor and do not trigger cluster removal.
  - `Cell.render(parentEl)` handles:
    - Lazily creating its `.matrix__cell` element.
    - Resetting its `className` and adding a modifier like `matrix__cell--m-<value>` when `value` is non-null.
    - Applying state-driven modifiers: `matrix__cell--hidden` for logically removed cells, `matrix__cell--clickable` for cells that are part of a cluster, and transform styles used by fall/disappear animations.
- **Cluster detection and removal**:
  - `Matrix.hideConnectedCells(x, y, { auto })` flood-fills (DFS) from the clicked cell across 4-neighbours, collecting a connected component of same-value cells.
  - Components of size `< 2` are treated as singletons and ignored (no effect on click).
  - For valid components, `Matrix.animateClusterDisappearance(toHide, { auto })` orchestrates a two-phase update:
    - First, all cells in the cluster are animated: each one, with a small staggered delay, moves slightly downward and fades out (using `opacity` + `transform` transitions).
    - After the animation completes, those cells are marked `hidden` with `value = null`, then `applyGravity()` is invoked to drop remaining cells and a separate falling animation is triggered.
  - `Matrix.animating` guards against re-entrancy so user clicks and auto-steps are ignored while disappear/fall animations are in progress.
- **Gravity and falling animation**:
  - `Matrix.applyGravity()` compacts each column bottom-up: non-hidden cells are copied down to the lowest available `writeY`, their previous positions are cleared (`hidden = true`, `value = null`), and a per-cell `fallDistance` is recorded (how many rows it fell).
  - In `Matrix.render()`, cells with `fallDistance > 0` are first drawn offset upward by `fallDistance * cellSize`. Then, with a small stagger per row and using the existing `transform` transition, each cell “falls” down, briefly squashes to `scale(0.85)` and springs back to `scale(1)`, creating a cascading, bouncy fall effect from bottom to top.
- **Auto-play and user interaction (js/index.js)**:
  - `js/index.js` wires a `Scene` and `Matrix`, and configures timing for auto-play:
    - `AUTO_START_DELAY` (~5s) — delay after matrix (or resize/re-init) before auto-play starts if the user does not clear any cluster.
    - `AUTO_STEP_INTERVAL_MIN`/`AUTO_STEP_INTERVAL_MAX` — random delay between auto-steps (auto cluster clears), making auto-play timing feel organic.
    - `AUTO_REINIT_DELAY` — delay before the matrix is re-initialized when no more clusters are available.
  - `Matrix.findAnyCluster()` searches the grid in a randomized order (shuffled indices) and returns a random connected component of size ≥ 2.
  - Auto-play loop (`runAutoStep` + timers):
    - Finds a random cluster, clears it via `hideConnectedCells(x, y, { auto: true })`, and schedules the next auto-step after a random interval.
    - When no clusters remain, schedules a re-initialization (`reinitMatrix`), which creates a new `Matrix`, reattaches behaviours, and restarts the idle timer for potential auto-play.
  - User clears vs auto clears are distinguished via the `auto` flag passed into `hideConnectedCells` and then into `onClusterCleared({ auto })`. User-triggered clears pause auto-play and restart the 5s idle timer; if the user “gets tired” and stops clicking, auto-play eventually resumes automatically.

When extending functionality (animations, interactions, different data sources), reuse these responsibilities: Matrix for grid-level logic (including cluster/auto-play state machines and animations), Cell for per-cell presentation, Scene for high-level layout and composition.
