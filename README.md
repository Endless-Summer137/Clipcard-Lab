# Clipcard Lab

A Vite + React + TypeScript prototype for validating short-video clip intent cards, local event logging, clip-interest trend aggregation, and ad-fit gate decisions.

Main repository: https://github.com/Endless-Summer137/Clipcard-Lab.git

## Architecture

The app separates shared mechanism logic from page-level demos:

- `src/core/budgetGate.ts`: analysis budget and minimum necessary audio-window strategy.
- `src/core/adGate.ts`: ad-fit decision and mandatory ad disclosure metadata.
- `src/core/cardEngine.ts`: local rule-based clip-card generation, with an input shape ready for future AI APIs.
- `src/core/cardStore.ts`: local `localStorage` card persistence.
- `src/core/eventStore.ts`: local `localStorage` user event logging.
- `src/core/trendAnalytics.ts`: video-time bucket aggregation for creator trend charts.

Page responsibilities are intentionally split:

- `DemoFeedPage`: user-facing short-video feed demo. It calls the core modules and shows the generated card result, not the internal gates.
- `ProfilePage`: short-video-style personal homepage with creator-center and card entrances.
- `CreatorCenter`: reads stored cards/events and shows creator-facing trend summaries.
- `InternalLab`: shows budget/ad/card-engine internals for explanation and review.
- `MyCardsPage` and `ClipbookPage`: placeholders for future card library and clipbook flows.

## Page URLs

- `/?page=demo`: clean short-video feed demo.
- `/?page=profile`: personal homepage demo.
- `/?page=creator`: creator center.
- `/?page=cards`: my cards.
- `/?page=clipbook`: card clipbook.
- `/?page=admin&dev=1`: hidden demo-material configuration page.
- `/?page=internal&dev=1`: internal mechanism lab.

Add `dev=1` to show the development navigation bar. `Ctrl+U` opens `?page=admin&dev=1`; `Esc` returns from admin config to `?page=demo&dev=1`.

## What It Tests

- Sample clip scenarios: 美食探店, 游戏高光, 旅行风景, 低信息片段.
- Real video test mode for local `mp4` / `webm` uploads through the hidden demo-material configuration mode.
- Clip start/end selection with seconds inputs and demo defaults.
- Analysis budget gate that chooses Level 0 / Level 1 / Level 2 / Level 3 / Level 4 before future media analysis.
- Minimum necessary audio-window strategy for each card-generating budget level, with Level 4 reserved for audio/subtitle-led high-information clips.
- Weak-assertion clip card generation based on user-entered title, description, tags, transcript, segment note, and ad candidate.
- Local `localStorage` card persistence and event logging.
- Multi-metric 10-second trend buckets with `recharts`, including card generation, saves, shares, clipbook adds, and ad clicks.
- Ad-fit gate decisions that require clear ad labeling and do not present ads as neutral AI advice.
- A shared-core architecture so the short-video feed, creator center, internal lab, future card library, and future clipbook use the same card, event, trend, budget, and ad logic.

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
