import type { AdDecision, AdGateInput } from './types';

function hasAny(text: string, keywords: string[]) {
  return keywords.some((keyword) => text.includes(keyword));
}

export function runAdGate(input: AdGateInput): AdDecision {
  const context = [...input.tags, input.cardType, input.segmentNote, input.transcriptExcerpt].join(' ');
  const adCandidate = input.adCandidate;
  const base: Pick<AdDecision, 'disclosureRequired' | 'adLabel'> = {
    disclosureRequired: true,
    adLabel: '广告',
  };

  if (adCandidate === '无广告') {
    return {
      ...base,
      decision: 'allow',
      reason: '当前无广告候选，只记录用户意图，不展示商业模块。',
    };
  }

  if (hasAny(context, ['低信息', '信息不足']) && adCandidate === '长广告') {
    return {
      ...base,
      decision: 'reject',
      reason: '低信息片段缺少稳定意图，不能承接长广告。',
    };
  }

  if (hasAny(context, ['美食', '探店', '餐厅', '门店']) && adCandidate === '门店团购') {
    return {
      ...base,
      decision: 'allow',
      reason: '美食/探店语境与门店团购相关，但展示时必须明确标注广告，不能伪装成 AI 中立建议。',
    };
  }

  if (hasAny(context, ['游戏', '高光', '操作', '外设']) && adCandidate === '游戏外设') {
    return {
      ...base,
      decision: 'allow',
      reason: '游戏高光语境与游戏外设相关，但展示时必须明确标注广告。',
    };
  }

  if (hasAny(context, ['旅行', '风景', '景区', '出行']) && adCandidate === '景区广告') {
    const hasSpecificPlace = hasAny(context, ['地点', '地址', '路线', '城市', '门票', '景区', '出行']);
    return {
      ...base,
      decision: hasSpecificPlace ? 'allow' : 'limit',
      reason: hasSpecificPlace
        ? '片段说明明确涉及地点或出行，景区广告可展示但必须标注广告。'
        : '片段偏旅行/风景，但地点或出行意图不足，景区广告应限制展示。',
    };
  }

  return {
    ...base,
    decision: 'reject',
    reason: '广告候选与当前片段语境不相关；广告不能伪装成 AI 中立建议。',
  };
}
