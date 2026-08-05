// poissonService.js — 泊松比分概率矩阵服务(纯函数)
// SPEC: P(X=k)=(λ^k·e^−λ)/k!,生成比分概率矩阵(0-10 球),取最高概率为模型预测

const MAX_GOALS = 10;

/**
 * 阶乘(递归,仅用于小整数 ≤10)
 * @param {number} n
 * @returns {number}
 */
function factorial(n) {
  return n <= 1 ? 1 : n * factorial(n - 1);
}

/**
 * 泊松分布概率质量函数
 * @param {number} k 进球数(非负整数)
 * @param {number} lambda 期望进球数(>0)
 * @returns {number} P(X=k);非法入参返回 0
 */
export function poissonPmf(k, lambda) {
  if (k < 0 || lambda < 0) return 0;
  // λ=0 时:确定性地 0 球,P(0)=1,P(k>0)=0(冷启动验证修复)
  if (lambda === 0) return k === 0 ? 1 : 0;
  return (Math.pow(lambda, k) * Math.exp(-lambda)) / factorial(k);
}

/**
 * 生成 11x11 比分概率矩阵(主队 0-10 × 客队 0-10)
 * 主客进球独立: P(h,a) = P_home(h) × P_away(a)
 * @param {number} lambdaHome 主队期望进球
 * @param {number} lambdaAway 客队期望进球
 * @returns {number[][]} matrix[h][a]
 */
export function scoreMatrix(lambdaHome, lambdaAway) {
  const m = [];
  for (let h = 0; h <= MAX_GOALS; h++) {
    const row = [];
    for (let a = 0; a <= MAX_GOALS; a++) {
      row.push(poissonPmf(h, lambdaHome) * poissonPmf(a, lambdaAway));
    }
    m.push(row);
  }
  return m;
}

/**
 * 取概率最高的比分
 * @param {number[][]} matrix scoreMatrix 输出
 * @returns {[number, number]} [homeGoals, awayGoals]
 */
export function mostLikelyScore(matrix) {
  let best = [0, 0], bestP = -1;
  for (let h = 0; h < matrix.length; h++) {
    for (let a = 0; a < matrix[h].length; a++) {
      if (matrix[h][a] > bestP) {
        bestP = matrix[h][a];
        best = [h, a];
      }
    }
  }
  return best;
}
