import { describe, it, expect } from 'vitest';
import { scorePrediction } from '../../src/services/settlementService.js';

describe('settlementService', () => {
  it('完全命中 +3', () => {
    expect(scorePrediction(2, 1, 2, 1)).toBe(3);
    expect(scorePrediction(0, 0, 0, 0)).toBe(3);
  });
  it('每队各±1(非完全命中)+1', () => {
    expect(scorePrediction(2, 1, 2, 0)).toBe(1); // 主队差0、客队差1
    expect(scorePrediction(1, 0, 2, 1)).toBe(1); // 主队差1、客队差1
    expect(scorePrediction(2, 0, 1, 1)).toBe(1); // 主队差1、客队差1(冷启动反例)
  });
  it('其他 0', () => {
    expect(scorePrediction(3, 0, 0, 0)).toBe(0);  // 主队差3
    expect(scorePrediction(2, 2, 0, 0)).toBe(0);  // 双方差2
    expect(scorePrediction(1, 0, 0, 3)).toBe(0);  // 客队差3
  });
  it('参数顺序: scorePrediction(actualHome, actualAway, predHome, predAway)', () => {
    // 明确参数顺序:实际在前、预测在后
    expect(scorePrediction(1, 1, 1, 1)).toBe(3);
    expect(scorePrediction(1, 1, 2, 2)).toBe(1); // 各差1
  });
});
