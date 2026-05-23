import type { AnalyzeFramesRequest, VisionAnalysis } from '../../core/types';

function includesAny(text: string, keywords: string[]) {
  return keywords.some((keyword) => text.includes(keyword));
}

export async function analyzeFrames(input: AnalyzeFramesRequest): Promise<VisionAnalysis> {
  const text = [input.videoId, input.videoTitle, input.videoDescription ?? '', input.activityName ?? ''].join(' ').toLowerCase();
  const hasFrames = input.keyframes.some((frame) => frame.image?.startsWith('data:image/'));

  if (!hasFrames) {
    return {
      confidence: 'low',
      contentType: 'low_info',
      visualSummary: '当前没有可用关键帧，无法做可靠视觉判断。',
      visibleObjects: [],
      likelyScene: '低信息片段',
      cardSuggestion: {
        shouldGenerateFullCard: false,
        suggestedCardType: '待补充片段',
        reason: '缺少可分析的关键帧，应保守保存为待补充片段。',
      },
      limitations: ['mock 仅基于关键帧是否存在和标题/活动信息估计，没有分析音频、字幕、OCR 或完整视频。'],
    };
  }

  if (includesAny(text, ['demo_food', '美食', '探店', 'food', '汤', '餐', '店'])) {
    return {
      confidence: 'medium',
      contentType: 'food',
      visualSummary: '关键帧可能呈现餐食或门店氛围，适合保存为活动片段卡。',
      visibleObjects: ['餐食', '餐具', '店内环境'],
      likelyScene: '美食探店或就餐场景',
      cardSuggestion: {
        shouldGenerateFullCard: true,
        suggestedCardType: '美食探店卡',
        reason: '标题、活动和关键帧方向都指向美食/探店内容，可以生成主题卡片。',
      },
      limitations: ['mock 未真正识别图像细节，仅用于本地流程跑通。', '没有分析音频、字幕、OCR 或完整视频。'],
    };
  }

  if (includesAny(text, ['demo_game', '游戏', '高光', 'game', '团战', '操作'])) {
    return {
      confidence: 'medium',
      contentType: 'game',
      visualSummary: '关键帧可能对应游戏高光或操作复盘片段。',
      visibleObjects: ['游戏画面', '操作界面', '高光瞬间'],
      likelyScene: '游戏高光场景',
      cardSuggestion: {
        shouldGenerateFullCard: true,
        suggestedCardType: '游戏高光卡',
        reason: '活动和标题都指向游戏高能操作，适合整理为高光卡。',
      },
      limitations: ['mock 未真正识别游戏 UI 或动作细节。', '没有分析音频、字幕、OCR 或完整视频。'],
    };
  }

  if (includesAny(text, ['demo_travel', '旅行', '风景', '城市', 'travel', '景'])) {
    return {
      confidence: 'medium',
      contentType: 'travel',
      visualSummary: '关键帧可能呈现城市、风景或旅行灵感片段。',
      visibleObjects: ['城市风景', '道路或建筑', '自然环境'],
      likelyScene: '旅行风景场景',
      cardSuggestion: {
        shouldGenerateFullCard: true,
        suggestedCardType: '旅行灵感卡',
        reason: '标题和简介更接近风景/出行灵感，可生成轻量旅行卡。',
      },
      limitations: ['mock 未真正定位地点或识别景物细节。', '没有分析音频、字幕、OCR 或完整视频。'],
    };
  }

  return {
    confidence: 'low',
    contentType: 'unknown',
    visualSummary: '关键帧信息方向不够明确，建议保守保存。',
    visibleObjects: [],
    likelyScene: '未知场景',
    cardSuggestion: {
      shouldGenerateFullCard: false,
      suggestedCardType: '待补充片段',
      reason: '标题、活动和关键帧线索不足，不能确定卡片类型。',
    },
    limitations: ['mock 未真正分析图像细节。', '没有分析音频、字幕、OCR 或完整视频。'],
  };
}
