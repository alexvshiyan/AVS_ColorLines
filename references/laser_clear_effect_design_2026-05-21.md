# Laser Sweep + Pop + Score Burst Design

This checkpoint adds a stronger line-clear moment without changing Color Lines rules or scoring. The effect is implemented as a short state-driven sequence around the existing `resolveClears` pipeline.

| Phase | Duration | UI State | Purpose |
|---|---:|---|---|
| Lock-on glow | 0–120ms | Cleared cells enter `cell-clearing` and pulse brighter | Make the detected line immediately visible |
| Laser sweep | 120–340ms | Direction-specific sweep classes render cyan/amber beam overlays | Show a mechanical arcade scanner moving along the line |
| Pop + score burst | 340–520ms | Marbles shrink/flash out while `+N` floats from the cleared cluster | Give the clear a reward moment before board state changes |

Implementation notes:

- Preserve existing gameplay semantics by delaying only the visual board removal; scoring and next-ball progression still happen after clear completion.
- Replace bare `clearingCells: Position[]` with structured clear effect state containing cells, direction per cell, phase, score burst metadata, and gained score.
- Detect line groups with direction metadata while still deduplicating overlapping cells for scoring/removal.
- Render a small absolute-positioned score burst inside `.board-grid` using row/column percentage coordinates.
- Keep controls blocked while `clearingCells.length > 0`, matching current behavior.
- Add a short zap/spark Web Audio sound before the existing clear reward feedback and keep it behind the existing sound toggle.
