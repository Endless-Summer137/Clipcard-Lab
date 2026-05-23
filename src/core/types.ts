export type BudgetLevel = 0 | 1 | 2 | 3 | 4;

export type TriggerMode = 'short_press' | 'long_press';
export type SegmentSource = 'long_press_selection' | 'short_press_current_time' | 'default_demo_segment';

export type BudgetRoute =
  | 'visual_scene_first'
  | 'visual_step_first'
  | 'transcript_first'
  | 'ocr_first'
  | 'motion_audio_first'
  | 'low_info';

export type AudioStrategy =
  | 'none'
  | '3s_around_trigger'
  | '12s_around_3_frames'
  | '20s_around_5_frames';

export type AudioWindowStrategy =
  | AudioStrategy
  | '3s_around_frame'
  | 'full_segment_or_transcript_first';

export type CostLevel = 'none' | 'low' | 'medium' | 'high';

export interface PlatformSignals {
  favoriteCount?: number;
  likeCount?: number;
  commentCount?: number;
  shareCount?: number;
  collectRate?: number;
}

export interface VisualSignals {
  hasTextOnScreen?: boolean;
  hasGameUI?: boolean;
  hasHandsOrTools?: boolean;
  hasStepLikeMotion?: boolean;
  hasStableScene?: boolean;
  isBlurryOrLowInfo?: boolean;
}

export interface BudgetGateInput {
  videoId: string;
  triggerMode: TriggerMode;
  videoTitle: string;
  videoDescription: string;
  tags: string[];
  segmentStart: number;
  segmentEnd: number;
  transcriptExcerpt?: string;
  segmentNote?: string;
  platformSignals?: PlatformSignals;
  visualSignals?: VisualSignals;
}

export interface BudgetResult {
  level: BudgetLevel;
  route: BudgetRoute;
  frameCount: 0 | 1 | 3 | 5;
  audioStrategy: AudioStrategy;
  audioWindowStrategy: AudioWindowStrategy;
  costLevel: CostLevel;
  needsTranscript: boolean;
  needsOCR: boolean;
  needsVisualStepAnalysis: boolean;
  needsTranscriptOrAudio: boolean;
  reason: string;
}

export type AdDecisionValue = 'allow' | 'limit' | 'reject';

export interface AdGateInput {
  videoId: string;
  tags: string[];
  cardType: string;
  segmentNote: string;
  transcriptExcerpt: string;
  adCandidate: string;
}

export interface AdDecision {
  decision: AdDecisionValue;
  reason: string;
  disclosureRequired: true;
  adLabel: '广告';
}

export interface CardEngineInput {
  videoId: string;
  videoTitle: string;
  videoDescription: string;
  tags: string[];
  segmentStart: number;
  segmentEnd: number;
  segmentSource: SegmentSource;
  transcriptExcerpt: string;
  segmentNote: string;
  budgetResult: BudgetResult;
  adDecision: AdDecision;
  sourceAuthor?: string;
  sourceVideoId?: string;
  sourceVideoUrl?: string;
  coverImage?: string;
  coverFrame?: number;
  coverSource?: 'current_frame' | 'segment_start_frame' | 'generated_placeholder' | 'future_best_frame';
  activityId?: string;
  activityName?: string;
  activityCta?: string;
  targetClipbookTemplate?: string;
}

export interface SegmentCard {
  cardId: string;
  videoId: string;
  segmentStart: number;
  segmentEnd: number;
  segmentSource: SegmentSource;
  sourceVideoTitle: string;
  sourceAuthor?: string;
  sourceVideoId?: string;
  sourceVideoUrl?: string;
  cardType: string;
  title: string;
  summary: string;
  saveReason: string;
  evidenceNote: string;
  adDecision: AdDecision;
  createdAt: string;
  coverImage?: string;
  coverFrame?: number;
  coverSource?: 'current_frame' | 'segment_start_frame' | 'generated_placeholder' | 'future_best_frame';
  activityId?: string;
  activityName?: string;
  activityCta?: string;
  targetClipbookTemplate?: string;
  personalReflection?: {
    text: string;
    updatedAt: string;
  };
}

export type ClipEventType =
  | 'card_generated'
  | 'card_saved'
  | 'card_shared'
  | 'card_added_to_clipbook'
  | 'ad_shown'
  | 'ad_clicked'
  | 'card_deleted'
  | 'card_regenerated';

export interface ClipEvent {
  eventId: string;
  eventType: ClipEventType;
  videoId: string;
  cardId?: string;
  segmentStart: number;
  segmentEnd: number;
  timestamp: string;
  metadata?: Record<string, unknown>;
}

export interface TrendBucket {
  bucketStart: number;
  bucketEnd: number;
  cardGeneratedCount: number;
  savedCount: number;
  sharedCount: number;
  addedToClipbookCount: number;
  adShownCount: number;
  adClickedCount: number;
  deletedCount: number;
  regeneratedCount: number;
}

export interface DemoVideoInput {
  videoId: string;
  videoTitle: string;
  videoDescription: string;
  tags: string[];
  defaultSegmentStart: number;
  defaultSegmentEnd: number;
  transcriptExcerpt: string;
  segmentNote: string;
  adCandidate: string;
  videoDataUrl?: string;
  authorName?: string;
  sourceVideoUrl?: string;
  activityEnabled?: boolean;
  activityId?: string;
  activityName?: string;
  activityCta?: string;
  targetClipbookTemplate?: string;
}
