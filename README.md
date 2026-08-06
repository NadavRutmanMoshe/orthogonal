# Orthogonal

A grid puzzle game about projection. You are a cube in a voxel world with one
verb: collapse the world to 2D along your line of sight. Blocks far apart in
depth merge into one surface, gaps close, unreachable stairs become climbable.
Return to 3D and you land on the block nearest the camera. Choosing *which*
axis to collapse is most of the puzzle.

## Running it

There is no build step. Open `index.html`.

Double-clicking the file works. If your browser is strict about `file://`,
serve the folder instead:

    python3 -m http.server 8000
    # then open http://localhost:8000

## Checking your work

    node tools/verify.js          # solve every level, prove none are broken
    node tools/verify.js 12       # one level, with its optimal path printed

No dependencies. It runs the real game modules, not a copy.

## Shipping it

    node tools/build-single.js --vendor   # dist/orthogonal.html, one file, offline

**itch.io** - upload either this folder zipped (with `index.html` at the root)
or the single file from `dist/`. Tick "This file will be played in the browser".

**iOS / Android** - wrap with Capacitor. The whole game is static files and it
already stores progress in `localStorage`, so `npx cap add ios` over this
folder is close to all of it. See `CLAUDE.md` for what is still missing.

## Layout

    index.html         markup and the script load order
    css/style.css
    js/00-storage.js   localStorage shim
    js/01..20          the game, loaded in numeric order
    vendor/            three.js r128
    tools/             solver harness and the single-file bundler
    CLAUDE.md          the real documentation - read that one
