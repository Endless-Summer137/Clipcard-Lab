# ClipCard 活动手账

把活动视频里的精彩片段，做成可分享的主题手账。

## 在线体验

点击这里体验：

[https://endless-summer137.github.io/Clipcard-Lab/](https://endless-summer137.github.io/Clipcard-Lab/)

说明：

- 在线体验版使用默认 demo 素材。
- 不需要本地安装。
- 不需要 API key。
- 视觉分析接口不可用时，会自动使用 fallback 生成卡片。

## 本地运行

```bash
npm install
npm run dev
```

On Windows PowerShell, if `npm.ps1` is blocked by execution policy, use:

```bash
npm.cmd install
npm.cmd run dev
```

## 隐藏配置页

本地开发时可通过：

`?page=admin&dev=1`

进入隐藏素材配置页。

## API 说明

GitHub Pages 在线演示版只部署静态前端，不部署 `/api/analyze-frames` 后端。在线版会在接口不可用时自动 fallback，仍可完成基础演示流程。

如需本地测试视觉模型，请在本机创建 `.env`：

```env
VISION_PROVIDER=zhipu
ZHIPU_MODEL=glm-4.6v-flash
ZHIPU_FALLBACK_MODELS=glm-4v-flash
ZHIPU_API_KEY=your_key_here
```

`.env` 是有意不上传/不呈现，用于保护 API key；不要提交 `.env`、API key、token 或私人账号信息。

Main repository: https://github.com/Endless-Summer137/Clipcard-Lab.git

## Architecture

The app separates shared mechanism logic from page-level demos:

- `src/core/budgetGate.ts`: analysis budget, route selection, and minimum necessary frame/audio strategy.
- `src/core/adGate.ts`: ad-fit decision and mandatory ad disclosure metadata.
- `src/core/cardEngine.ts`: local rule-based clip-card generation, with an input shape ready for future AI APIs.
- `src/core/cardStore.ts`: local `localStorage` card persistence under `clipcard.cards`, with older-card and source-attribution normalization.
- `src/core/videoBlobStore.ts`: IndexedDB storage for uploaded demo video blobs, keeping localStorage metadata-only.
- `src/core/videoFrameCapture.ts`: local canvas-based video-frame capture for compressed card cover images.
- `src/core/eventStore.ts`: local `localStorage` user event logging.
- `src/core/trendAnalytics.ts`: video-time bucket aggregation for creator trend charts.
- `src/core/clipbookTemplateStore.ts`: local clipbook template images under `clipcard_clipbook_templates`, natural image size metadata, and percentage-based slot configuration.
- `src/core/clipbookStore.ts`: local saved clipbook instances under `clipcard_clipbooks`, with title, template metadata, slot card ids, and timestamps.
- `src/core/clipbookPlacementStore.ts`: local per-template slot-to-card placement persistence.

Page responsibilities are intentionally split:

- `DemoFeedPage`: user-facing short-video feed demo. It keeps the right rail as ordinary video actions, then exposes ClipCard only through activity capsules on activity-enabled videos.
- `useClipCards`: shared hook for reading, refreshing, saving, and deleting cards from one card store.
- `ProfilePage`: short-video-style personal homepage with creator-center and card entrances.
- `UserSubPageShell`: shared light app-page shell for profile subpages such as my cards, clipbook, dresser, and creator center.
- `CardThumbnail`, `CardQuickPreview`, and `CardDetailView`: shared card presentation components for thumbnail grids, feed quick preview, and full card reading with source-video attribution.
- `CreatorCenter`: phone-width creator subpage with trend summaries, lightweight insights, and a summarized ad-fit status.
- `InternalLab`: shows budget/ad/card-engine internals for explanation and review.
- `MyCardsPage`: light themed three-column card library with card detail view.
- `ClipbookPage`: light themed card clipbook home, saved clipbook detail view, and new clipbook editor for FPS, landscape, and blank-book templates.
- `DresserPage`: placeholder card dresser entrance for future color and sticker editing.

## Page URLs

- `/?page=demo`: clean short-video feed demo.
- `/?page=profile`: personal homepage demo.
- `/?page=creator`: creator center.
- `/?page=cards`: my cards.
- `/?page=clipbook`: card clipbook home with saved clipbooks and new-template entry.
- `/?page=clipbook&template=fps`: FPS clipbook editor.
- `/?page=clipbook&template=landscape`: landscape clipbook editor.
- `/?page=clipbook&template=blank`: blank-book clipbook editor.
- `/?page=dresser`: card dresser placeholder.
- `/?page=admin&dev=1`: hidden demo-material configuration page.
- `/?page=internal&dev=1`: internal mechanism lab.

Add `dev=1` to show the development navigation bar. `Ctrl+Shift+U` opens `?page=admin&dev=1`; `Esc` returns from admin config to `?page=demo&dev=1`.

## Default Demo Assets

Default demo data is committed in `src/demo/defaultDemoData.ts`, and the media files live under `public/demo-assets`.

- Videos:
  - `public/demo-assets/videos/food.mp4`: food activity video for `#分享你的美食搭子`.
  - `public/demo-assets/videos/game.mp4`: game highlight activity video for `#游戏高能操作时刻`.
  - `public/demo-assets/videos/city.mp4`: non-activity city/travel video, intentionally without a ClipCard activity capsule.
- Templates:
  - `public/demo-assets/templates/fps-template.png`: FPS 高光册.
  - `public/demo-assets/templates/scenery-template.png`: 风景灵感册.
  - `public/demo-assets/templates/blank-book-template.png`: 空白书.
- Asset license notes live in `public/demo-assets/ASSET_LICENSE.md`.

The app prefers locally uploaded hidden-config videos stored in IndexedDB when `videoBlobKey` exists. If no local upload exists, it falls back to the committed `public/demo-assets` files. Clearing localStorage and IndexedDB still leaves a working demo because the repository defaults are enough to run the three-video feed and the three template previews.

Hidden config remains available at `/?page=admin&dev=1` or `Ctrl+Shift+U`. It can edit the demo metadata and upload replacement local videos for the current browser session/storage. To reset the demo metadata, use the admin page clear action or run `localStorage.removeItem('clipcard-lab-demo-feed-inputs-v1')` in the browser console; to reset uploaded videos, clear the browser IndexedDB database named `clipcard_video_blobs`.

Vision API keys are optional. The project intentionally does not upload or display `.env`; this is not an unfinished setup. `.env` is ignored so API keys stay local. The intended vision provider is Zhipu BigModel with `VISION_PROVIDER=zhipu`, primary model `ZHIPU_MODEL=glm-4.6v-flash`, and fallback model `ZHIPU_FALLBACK_MODELS=glm-4v-flash` when the primary model is unavailable, overloaded, or times out. Without `.env` or provider keys, `/api/analyze-frames` falls back to local/mock analysis so the prototype remains demoable. Do not commit `.env`, API keys, tokens, or private account credentials.

## What It Tests

- Sample clip scenarios: 美食探店, 游戏高光, 旅行风景, 低信息片段.
- Activity-entry scenarios: `#分享你的美食搭子` and `#游戏高能操作时刻` show bottom-left activity capsules, while the travel demo intentionally has no ClipCard entry.
- Real video test mode for local `mp4` / `webm` uploads through the hidden demo-material configuration mode.
- Uploaded demo videos are stored as IndexedDB Blobs, while localStorage keeps only metadata such as `videoBlobKey` and file name.
- Demo default segment fields named `defaultSegmentStart` / `defaultSegmentEnd`, used only as fallback when no real user-triggered segment is available.
- Short-press segment generation from the current video time when a real video is available, with `segmentSource` stored on every generated card.
- Real uploaded-video frame capture for card covers, falling back to segment start, segment midpoint, or a compact demo placeholder when capture is unavailable.
- Analysis budget gate that starts from trigger mode and segment duration, then revises the level with title, description, tags, transcript, platform signals, and visual signals.
- Budget routes for scene-first, visual-step-first, transcript-first, OCR-first, motion/audio-first, and low-information clips.
- Minimum necessary frame/audio strategy for Level 0-3, with OCR / transcript / visual-step needs exposed for the internal mechanism page.
- Weak-assertion clip card generation based on user-entered title, description, tags, transcript, segment note, and ad candidate.
- Level 0 / Level 1 / Level 2 card generation differences for waiting-to-complete cards, lightweight moment cards, and standard segment cards.
- Local `localStorage` card persistence and event logging, including source author, source video, jump URL, and segment time fields.
- Shared card reads through `useClipCards`, with `clipcard.cards` as the unified card storage key and `clipcard_clipbooks` as the saved clipbook storage key.
- Collectible ClipCard card visuals with themed mini cards, detail view source area, fixed ad disclosure area, and scrollable card content.
- A light activity quick-preview card after tapping an activity capsule, with `加入活动手账`, share, and full-card actions.
- A one-per-card personal reflection field in `CardDetailView`, editable and deletable by the user and persisted in `cardStore`.
- Cover-style card thumbnails that use saved video-frame or demo-placeholder covers when available and fall back to soft light-card surfaces for low-information clips.
- A saved card clipbook flow with a `我的手账` home, template-style 9:16 clipbook covers, new-template entry, draft slot placement, `保存手账`, saved clipbook detail, source-video list, album/share placeholders, publish-preview modal, and disabled duplicate placement in the card picker.
- Clipbook card selection reads the same `cardStore` source as the my-cards grid, so saved cards can be placed into any template slot.
- Dev-only clipbook template image upload plus numeric `x/y/w/h` slot adjustment for configuring custom template layouts.
- Uploaded clipbook template images render complete in the editor using their original aspect ratio, with slots anchored to the template image coordinate system.
- A card dresser placeholder that keeps sticker/color customization separate from the clipbook editor.
- Multi-metric 10-second trend buckets with `recharts`, including card generation, saves, shares, clipbook adds, and ad clicks.
- Ad-fit gate decisions that require clear ad labeling and do not present ads as neutral AI advice.
- A shared-core architecture so the short-video feed, creator center, internal lab, future card library, and future clipbook use the same card, event, trend, budget, and ad logic.

Current MVP limitation: the GitHub Pages build is a static frontend demo. It can capture demo video frames and generate cards with local fallback rules, but it does not deploy the optional local `/api/analyze-frames` backend, and it does not do audio transcription, OCR, or platform API integration.
