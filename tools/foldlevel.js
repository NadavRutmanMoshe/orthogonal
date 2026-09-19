"use strict";
/* THE FOLD TUTORIAL, RE-SKINNED AS FIRE - one copy, for every tool that
 * points a camera at it.
 *
 * It was written inside tools/video.js and is now wanted by tools/shot.js
 * too, for the store set's opening pair (the same board in the volume and in
 * the plane, which is the one image that explains the game without words).
 * Two copies of a board drift exactly the way the two copies of the studio
 * wordmark would have if tools/logo.js had redrawn it instead of
 * photographing the real one, so this is the same rule as tools/playwright.js:
 * when a second tool wants it, it moves to a file of its own.
 *
 * WHY THIS BOARD. It is the clearest statement of the verb in the whole game:
 * two platforms, a gap between them that cannot be walked, and a spur off in
 * depth that is only reachable once depth stops existing. Every later level
 * is that idea with something on top.
 *
 * WHY FIRE. PROLOGUE, where it actually lives, is the greyest palette in the
 * game - the same finding that took the app icon off slate (tools/icon.js).
 * `theme` is a SECTIONS index and levelTheme() reads SECTIONS[theme].theme,
 * so 2 is II FIRE and that is the whole re-skin.
 *
 * NOT `tutorial:true`, which the real one is: that would bring the coach, the
 * ghost hand and the guided lock, and a promo wants the board.
 *
 * THE THEME ONLY APPLIES IF IT PLAYS AS A CUSTOM LEVEL. enterPlay() picks the
 * world with applyTheme(playSource==="builtin" ? themeForLevel(lvIndex)
 * : levelTheme(L)), so as a builtin the level's own theme is ignored and the
 * INDEX decides - and index -1 gives PROLOGUE's slate, which is the exact
 * palette this was re-skinned to get away from. Both tools play it with
 * playSource="library", which is what a custom level plays as, and a custom
 * level is what this is.
 */
const FOLD_LEVEL={
  name:"00 - First Fold",
  hint:"The gap is not crossable. The gap is not the point.",
  start:[0,1,0], goal:[4,1,0], rotate:false, theme:2,
  blocks:[[0,0,-1],[0,0,0],[0,0,1],[1,0,-1],[1,0,0],[1,0,1],
          [2,0,-1],[2,0,0],[2,0,1],[4,0,1],[4,0,0],[4,0,-1],
          [3,0,3],[3,0,4],[3,0,5]]
};

module.exports={FOLD_LEVEL};
