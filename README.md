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
- `src/core/clipbookTemplateStore.ts`: local clipbook template images, natural image size metadata, and percentage-based slot configuration.
- `src/core/clipbookPlacementStore.ts`: local per-template slot-to-card placement persistence.

Page responsibilities are intentionally split:

- `DemoFeedPage`: user-facing short-video feed demo. It calls the core modules and shows the generated card result, not the internal gates.
- `ProfilePage`: short-video-style personal homepage with creator-center and card entrances.
- `UserSubPageShell`: shared light app-page shell for profile subpages such as my cards, clipbook, dresser, and creator center.
- `CreatorCenter`: phone-width creator subpage with trend summaries, lightweight insights, and a summarized ad-fit status.
- `InternalLab`: shows budget/ad/card-engine internals for explanation and review.
- `MyCardsPage`: light themed three-column card library with card detail view.
- `ClipbookPage`: light themed clipbook template demo with FPS, landscape, and blank-book templates.
- `DresserPage`: placeholder card dresser entrance for future color and sticker editing.

## Page URLs

- `/?page=demo`: clean short-video feed demo.
- `/?page=profile`: personal homepage demo.
- `/?page=creator`: creator center.
- `/?page=cards`: my cards.
- `/?page=clipbook`: card clipbook.
- `/?page=dresser`: card dresser placeholder.
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
- Level 0 / Level 1 / Level 2 card generation differences for waiting-to-complete cards, lightweight moment cards, and standard segment cards.
- Local `localStorage` card persistence and event logging.
- Collectible ClipCard card visuals with themed mini cards, detail view, fixed ad disclosure area, and scrollable card content.
- Cover-style card thumbnails that use saved video-frame covers when available and fall back to soft light-card surfaces for low-information clips.
- A basic card clipbook flow with selectable templates, percentage-based card slots, placed-card removal, placeholder share/publish actions, and disabled duplicate placement in the card picker.
- Clipbook card selection reads the same `cardStore` source as the my-cards grid, so saved cards can be placed into any template slot.
- Dev-only clipbook template image upload plus numeric `x/y/w/h` slot adjustment for configuring custom template layouts.
- Uploaded clipbook template images render complete in the editor using their original aspect ratio, with slots anchored to the template image coordinate system.
- A card dresser placeholder that keeps sticker/color customization separate from the clipbook editor.
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
