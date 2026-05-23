export type BudgetLevel = 0 | 1 | 2 | 3 | 4;

export type AudioWindowStrategy =
  | 'none'
  | '3s_around_frame'
  | '12s_around_3_frames'
  | '20s_around_5_frames'
  | 'full_segment_or_transcript_first';

export type CostLevel = 'none' | 'low' | 'medium' | 'high';

export interface BudgetGateInput {
  videoId: string;
  tags: string[];
  segmentStart: number;
  segmentEnd: number;
  transcriptExcerpt: string;
  segmentNote: string;
}

export interface BudgetResult {
  level: BudgetLevel;
  frameCount: 0 | 1 | 3 | 5;
  audioWindowStrategy: AudioWindowStrategy;
  costLevel: CostLevel;
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
  transcriptExcerpt: string;
  segmentNote: string;
  budgetResult: BudgetResult;
  adDecision: AdDecision;
  coverImage?: string;
  coverFrame?: number;
  coverSource?: 'current_frame' | 'segment_start_frame' | 'generated_placeholder' | 'future_best_frame';
}

export interface SegmentCard {
  cardId: string;
  videoId: string;
  segmentStart: number;
  segmentEnd: number;
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
}
