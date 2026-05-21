# Clipcard Lab

A Vite + React + TypeScript prototype for validating short-video clip intent cards, local event logging, clip-interest trend aggregation, and ad-fit gate decisions.

Main repository: https://github.com/Endless-Summer137/Clipcard-Lab.git

## What It Tests

- Sample clip scenarios: 美食探店, 游戏高光, 低信息片段.
- Real video test mode for local `mp4` / `webm` uploads.
- Clip start/end selection with seconds inputs and sliders.
- Weak-assertion clip card generation based on user-entered title, description, transcript, video type, and ad candidate.
- Local `localStorage` event logging.
- Multi-metric 10-second trend buckets with `recharts`, including card generation, saves, and simulated ad clicks.
- Ad-fit gate decisions that require clear ad labeling and do not present ads as neutral AI advice.

Current MVP limitation: the app does not automatically recognize full video frames or audio. It validates the clip-card mechanism through user-entered subtitles and descriptions.

## Run

```bash
npm install
npm run dev
```

On Windows PowerShell, if `npm.ps1` is blocked by execution policy, use:

```bash
npm.cmd install
npm.cmd run dev
```
