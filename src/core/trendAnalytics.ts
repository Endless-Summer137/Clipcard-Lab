import type { ClipEvent, TrendBucket } from './types';

export function buildTrendBuckets(videoId: string, events: ClipEvent[], bucketSize: number, videoDuration: number): TrendBucket[] {
  const safeBucketSize = Math.max(1, bucketSize);
  const bucketCount = Math.max(1, Math.ceil(videoDuration / safeBucketSize));
  const buckets = Array.from({ length: bucketCount }, (_, index) => {
    const bucketStart = index * safeBucketSize;
    return {
      bucketStart,
      bucketEnd: Math.min(videoDuration, bucketStart + safeBucketSize),
      cardGeneratedCount: 0,
      savedCount: 0,
      sharedCount: 0,
      addedToClipbookCount: 0,
      adShownCount: 0,
      adClickedCount: 0,
      deletedCount: 0,
      regeneratedCount: 0,
    } satisfies TrendBucket;
  });

  events
    .filter((event) => event.videoId === videoId)
    .forEach((event) => {
      const index = Math.min(bucketCount - 1, Math.max(0, Math.floor(event.segmentStart / safeBucketSize)));
      const bucket = buckets[index];
      if (event.eventType === 'card_generated') bucket.cardGeneratedCount += 1;
      if (event.eventType === 'card_saved') bucket.savedCount += 1;
      if (event.eventType === 'card_shared') bucket.sharedCount += 1;
      if (event.eventType === 'card_added_to_clipbook') bucket.addedToClipbookCount += 1;
      if (event.eventType === 'ad_shown') bucket.adShownCount += 1;
      if (event.eventType === 'ad_clicked') bucket.adClickedCount += 1;
      if (event.eventType === 'card_deleted') bucket.deletedCount += 1;
      if (event.eventType === 'card_regenerated') bucket.regeneratedCount += 1;
    });

  return buckets;
}
