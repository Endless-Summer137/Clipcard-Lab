# Clipcard Lab Progress

## 2026-05-21

- Created the local Vite + React + TypeScript prototype for validating clip intent cards.
- Added Tailwind CSS, `recharts`, and `lucide-react`.
- Implemented sample scene mode for 美食探店, 游戏高光, and 低信息片段.
- Added real video test mode for local `mp4` / `webm` upload, HTML5 video preview, clip time controls, user-entered transcript/description, light-card fallback, event logging, heatmap aggregation, and ad-fit gate decisions.
- Added durable repository workflow rules in `WORKFLOW.md`.
- Replaced the creator heatmap bar chart with a multi-metric “片段兴趣趋势图” line chart for card generation, saves, ad clicks, and optional share/delete/regeneration fields.
- Added an analysis budget gate for real videos, including Level 0-4 budget display, cost hints, audio-dependency prompts, and local canvas key-frame extraction.

## Validation

- `npm.cmd install` completed successfully.
- `npm.cmd run build` completed successfully after the real video test mode update.
- In-app browser verification passed for upload-mode UI, light-card generation, heatmap visibility, and no console errors.
- `npm.cmd run build` completed successfully after replacing the bar chart with the multi-metric line chart.
- `npm.cmd run build` completed successfully after adding the analysis budget gate and key-frame extraction workflow.

## Current Repository Agreement

- Treat `https://github.com/Endless-Summer137/Clipcard-Lab.git` as the project main repository.
- Keep repository workflow rules in `WORKFLOW.md`.
- Keep future handoff state, design decisions, validation, and next steps in this file.
