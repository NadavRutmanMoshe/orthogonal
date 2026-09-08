# The composer — solution-first level generation

> Moved out of `CLAUDE.md`, verbatim. `CLAUDE.md` keeps the one-line
> invariants; this file keeps the reasoning behind them. Read it before
> *redesigning* the thing it describes, not before editing it.
> `docs/HISTORY.md` has what was tried and dropped.

## The composer

You dictate a move sequence; the level is built to fit it.

1. **Synthesize** — walk the sequence forward, adding the least geometry each
   move requires. The key insight: a 2D move only constrains the *silhouette*,
   so the bridge block can sit at **any depth**. That free choice is invisible to
   the sequence and becomes the puzzle in 3D. Depths are picked randomly.
2. **Replay** — check the finished geometry actually admits the sequence.
3. **Prove** — run BFS. If anything shorter exists, the sequence is not forced.
4. **Repair** — trace the shortcut, find a square only *it* stands on, fill it.
5. **Reroll** — up to 150 seeds.

**Measured success rate: 59%** on reversal-free random sequences, 14% if you
allow sequences that double back — *a sequence that reverses direction can
never be forced*, because returning where you came from means a shorter route
always exists. The composer warns about this. Highest-leverage dials in
`synthesize()`: the depth-choice heuristic (currently `lastDepth ± 2..6`) and
the step-up probabilities (0.25 in 3D, 0.3 in 2D). Two hypotheses that were
tested and failed, plus where this sits in the PCG literature, are in
`docs/HISTORY.md`.

---

