export type BudgetLevel = 0 | 1 | 2 | 3 | 4;

export type TriggerMode = 'short_press' | 'long_press';
export type SegmentSource = 'long_press_selection' | 'short_press_current_time' | 'default_demo_segment';
export type CardCoverSource =
  | 'trigger_frame'
  | 'segment_start'
  | 'segment_midpoint'
  | 'demo_placeholder'
  | 'none'
  | 'current_frame'
  | 'segment_start_frame'
  | 'generated_placeholder'
  | 'future_best_frame';

export type KeyframeSource =
  | 'trigger_frame'
  | 'segment_start'
  | 'segment_midpoint'
  | 'segment_end'
  | 'sampled_frame';

export interface Keyframe {
  time: number;
  image: string;
  source: KeyframeSource;
}

export type VisionProvider = 'zhipu' | 'aliyun' | 'openai' | 'mock';
export type AnalysisSource = 'vision_api' | 'rule_fallback' | 'mock_vision_fallback';
export type CardSourceType = 'user_generated' | 'seed_demo' | 'fallback';
export type VisionErrorType =
  | 'missing_api_key'
  | 'provider_overloaded'
  | 'timeout'
  | 'daily_limit'
  | 'provider_error'
  | 'network_error'
  | 'unknown';

export interface VisionAnalysis {
  confidence: 'low' | 'medium' | 'high';
  contentType: 'food' | 'game' | 'travel' | 'people' | 'low_info' | 'unknown';
  visualSummary: string;
  visibleObjects: string[];
  likelyScene: string;
  cardSuggestion: {
    shouldGenerateFullCard: boolean;
    suggestedCardType: string;
    reason: string;
  };
  limitations: string[];
}

export interface AnalyzeFramesRequest {
  videoId: string;
  videoTitle: string;
  videoDescription?: string;
  activityName?: string;
  segmentStart: number;
  segmentEnd: number;
  keyframes: Array<{
    time: number;
    image: string;
  }>;
}

export interface AnalyzeFramesResponse {
  ok: boolean;
  provider?: VisionProvider;
  visionAnalysis?: VisionAnalysis;
  error?: string;
  fallback?: boolean;
  todayCallCount?: number;
  attemptedCallCount?: number;
  successCallCount?: number;
  debug?: {
    requestedProvider?: VisionProvider;
    actualProvider?: VisionProvider;
    provider?: VisionProvider;
    hasApiKey: boolean;
    requestedModel?: string;
    actualModel?: string;
    failedModel?: string;
    errorType?: VisionErrorType;
    errorCode?: string;
    fallbackReason?: string;
    fallbackUsed?: boolean;
    retryCount?: number;
    primaryModel?: string;
    fallbackModel?: string;
    primaryTimeoutMs?: number;
    fallbackTimeoutMs?: number;
    totalElapsedMs?: number;
    primaryStatus?: 'success' | 'timeout' | 'overloaded' | 'error' | 'skipped';
    fallbackStatus?: 'success' | 'timeout' | 'overloaded' | 'error' | 'skipped';
    finalAnalysisSource?: 'vision_api' | 'rule_fallback' | 'mock_fallback';
    error?: string;
  };
}

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
  visibleTextOrOcr?: string;
  segmentFacts?: string | string[];
  keyActions?: string | string[];
  segmentOutcome?: string;
  userValue?: string;
  featuredPersonOrId?: string;
  uncertainties?: string | string[];
  budgetResult: BudgetResult;
  adDecision: AdDecision;
  sourceAuthor?: string;
  sourceVideoId?: string;
  sourceVideoUrl?: string;
  sourceType?: CardSourceType;
  coverImage?: string;
  coverFrame?: number;
  coverFrameTime?: number;
  coverSource?: CardCoverSource;
  keyframes?: Keyframe[];
  activityId?: string;
  activityName?: string;
  activityCta?: string;
  targetClipbookTemplate?: string;
  visionAnalysis?: VisionAnalysis;
  analysisSource?: AnalysisSource;
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
  sourceType?: CardSourceType;
  cardType: string;
  title: string;
  summary: string;
  saveReason: string;
  evidenceNote: string;
  adDecision: AdDecision;
  createdAt: string;
  coverImage?: string;
  coverFrame?: number;
  coverFrameTime?: number;
  coverSource?: CardCoverSource;
  keyframes?: Keyframe[];
  budgetResult?: BudgetResult;
  visionAnalysis?: VisionAnalysis;
  analysisSource?: AnalysisSource;
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
  segmentFacts?: string | string[];
  keyActions?: string | string[];
  segmentOutcome?: string;
  userValue?: string;
  visibleTextOrOcr?: string;
  featuredPersonOrId?: string;
  uncertainties?: string | string[];
  adCandidate: string;
  videoDataUrl?: string;
  videoBlobKey?: string;
  videoFileName?: string;
  authorName?: string;
  sourceVideoUrl?: string;
  activityEnabled?: boolean;
  activityId?: string;
  activityName?: string;
  activityCta?: string;
  targetClipbookTemplate?: string;
}
