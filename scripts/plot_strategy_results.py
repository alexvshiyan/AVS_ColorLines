import json
from pathlib import Path

import matplotlib.pyplot as plt

results_path = Path('/tmp/colorlines_strategy_results.json')
out_dir = Path('/home/ubuntu/colorlines-game/analysis')
out_dir.mkdir(parents=True, exist_ok=True)

with results_path.open() as f:
    data = json.load(f)

summary = data['summary']
strategies = [row['strategy'] for row in summary]
avg_scores = [row['avgScore'] for row in summary]
median_scores = [row['medianScore'] for row in summary]
avg_moves = [row['avgMoves'] for row in summary]

plt.style.use('seaborn-v0_8-whitegrid')
fig, ax = plt.subplots(figsize=(10, 5.8))
colors = ['#ffcc33' if s == 'line_builder' else '#5bd3ff' if s == 'spawn_aware' else '#9aa4b2' for s in strategies]
bars = ax.bar(strategies, avg_scores, color=colors, edgecolor='#20242c', linewidth=1.2)
ax.plot(strategies, median_scores, color='#ff4d6d', marker='o', linewidth=2.0, label='Median score')
ax.set_title('Color Lines Strategy Simulation: Average Score by Strategy', fontsize=14, weight='bold')
ax.set_ylabel('Score')
ax.set_xlabel('Strategy')
ax.tick_params(axis='x', rotation=25)
ax.legend()
for bar, row in zip(bars, summary):
    ax.text(bar.get_x() + bar.get_width() / 2, bar.get_height() + 5, f"{row['avgScore']:.0f}\n{row['avgMoves']:.0f} moves", ha='center', va='bottom', fontsize=9)
fig.tight_layout()
fig.savefig(out_dir / 'strategy_scores.png', dpi=160)

markdown_lines = [
    '| Strategy | Games | Avg Score | Median | P75 | P90 | Max | Avg Moves | Avg Empty Before Turn | Avg Legal Moves Before Turn | Game Over Rate |',
    '|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|',
]
for row in summary:
    markdown_lines.append(
        f"| {row['strategy']} | {row['games']} | {row['avgScore']:.1f} | {row['medianScore']} | {row['p75Score']} | {row['p90Score']} | {row['maxScore']} | {row['avgMoves']:.1f} | {row['avgEmptyCellsBeforeTurn']:.1f} | {row['avgLegalMovesBeforeTurn']:.0f} | {row['gameOverRate']:.0%} |"
    )
(out_dir / 'strategy_results_table.md').write_text('\n'.join(markdown_lines) + '\n')
print('\n'.join(markdown_lines))
print(f"\nSaved chart to {out_dir / 'strategy_scores.png'}")
