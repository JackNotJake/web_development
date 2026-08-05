// settlementService.js — 结算服务(纯函数)
// SPEC 结算规则(每队各±1 解读,非 margin 解读):
//   - 完全命中实际比分 → +3
//   - 每队预测进球与实际之差均 ≤1(但不完全命中)→ +1
//   - 其他 → 0
// 例:实际(2,0)、预测(1,1)→ |2-1|≤1 且 |0-1|≤1 → +1

/**
 * 计算单个预测的结算得分
 *
 * 参数顺序:实际比分在前,预测比分在后。
 *
 * 规则:
 *   1. 若实际比分与预测比分完全一致 → 返回 3
 *   2. 否则,若每队预测进球与实际之差的绝对值均 ≤1 → 返回 1
 *      (即 |actualHome - predHome| <= 1 且 |actualAway - predAway| <= 1)
 *   3. 其他情况 → 返回 0
 *
 * @param {number} actualHome 实际主队进球数
 * @param {number} actualAway 实际客队进球数
 * @param {number} predHome   预测主队进球数
 * @param {number} predAway   预测客队进球数
 * @returns {number} 结算得分:3 / 1 / 0
 */
export function scorePrediction(actualHome, actualAway, predHome, predAway) {
  // 规则 1:完全命中
  if (actualHome === predHome && actualAway === predAway) {
    return 3;
  }
  // 规则 2:每队各±1(非完全命中)
  if (Math.abs(actualHome - predHome) <= 1 && Math.abs(actualAway - predAway) <= 1) {
    return 1;
  }
  // 规则 3:其他
  return 0;
}
