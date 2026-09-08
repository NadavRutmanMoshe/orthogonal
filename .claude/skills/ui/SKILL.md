---
name: ui
description: Make a visual change to Orthogonal's chrome (HUD, buttons, panels, map, home screen, cards) cheaply — the screen-to-file map, the one CSS file to edit, and the screenshot loop that checks it. Use for any "make X look like Y" request, or a list of them.
---

# UI change, the cheap way

The expensive way is reading `js/10-render.js`, the whole stylesheet and the
design docs to move a button. None of that is needed. Do this instead:

1. **Read `docs/UI.md`** (one file, ~10KB). It says which CSS file and
   which builder function each screen has, the tokens, the body classes,
   and the decisions on that screen that must not be undone.
2. **Shoot the screen before touching it**:
   `node tools/shot.js <screen> --tag before`, then Read the PNG. If the
   request came with the owner's screenshot, compare against that.
3. **Open only the CSS file named** (and the builder in `js/16-panels.js`,
   `js/12-play.js` or `index.html` if the markup itself changes). Grep
   `css/` for the selector first; do not read files to find it.
4. **Edit.** Keep the language: lit caps with a lip, tokens not literals,
   `color-mix` off `--player`/`--sec` rather than a hard-coded hue, 12px
   minimum type, phone-width panels. Prefer changing a token or a class
   over adding a new rule; check a new class name against `docs/UI.md`'s
   collision list.
5. **Shoot again**: `node tools/shot.js <screen> --tag after`, Read it, and
   fix what is wrong *before* reporting. Then the same screen `--small`
   (the owner's narrow phone), and `flat:2` if the change touches the HUD
   or anything the `body.flat` tokens flip.
6. `node --check js/<file>` for any JS touched. `node tools/verify.js` only
   if a level or a rule changed, which a UI change should not.
7. **One commit per item** with a one-line message naming the screen, so
   the owner can revert any single change. For a list of items, work
   through them in order in one session and show one before/after pair
   per item at the end, not a running commentary.

If a change needs a decision recorded in `docs/design/chrome.md` reversed,
say so in one sentence and do it anyway unless it would break a rule in
`CLAUDE.md`; the owner asked for the change and the doc is the memory of
why it used to be otherwise. Update the line in `docs/UI.md` when done.

Do not: read `docs/design/*` up front, read `js/10-render.js` for a chrome
change, restructure the CSS split, or rename classes that `syncHud()` sets.
