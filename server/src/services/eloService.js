// eloService.js — Elo 评级服务(纯函数)
// SPEC: 初始 1500;新Elo = 旧Elo + K×(实际−预期),K=20-40(此处默认 32);
// 预期胜率 We = 1/(1+10^((Rb−Ra)/400))

export const K = 32;

/**
 * 计算预期胜率(主队 A 视角)
 * @param {number} ra 评分 A
 * @param {number} rb 评分 B
 * @returns {number} We,A∈(0,1)
 */
export function expectedScore(ra, rb) {
  return 1 / (1 + Math.pow(10, (rb - ra) / 400));
}

/**
 * 更新双方 Elo 评分(零和:加和守恒,因四舍五入可能差 1)
 * @param {number} ra 评分 A
 * @param {number} rb 评分 B
 * @param {number} result A 视角实际得分:1=胜 0.5=平 0=负
 * @param {number} [k=K] K 因子
 * @returns {[number, number]} [newRa, newRb] 已四舍五入
 */
export function updateElo(ra, rb, result, k = K) {
  const we = expectedScore(ra, rb);
  const newRa = ra + k * (result - we);
  // B 视角:实际=1−result,预期=1−we
  const newRb = rb + k * ((1 - result) - (1 - we));
  return [Math.round(newRa), Math.round(newRb)];
}
