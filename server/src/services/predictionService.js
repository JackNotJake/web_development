// predictionService.js — 预测融合服务(纯函数)
// SPEC §M3.1: Elo→λ 映射 + Poisson 矩阵 + 社区投票,融合为胜/平/负三档预测
import { scoreMatrix, mostLikelyScore } from './poissonService.js';

// λ 钳制区间
const LAMBDA_MIN = 0.1;
const LAMBDA_MAX = 6.0;

const clamp = (v, lo, hi) => Math.min(Math.max(v, lo), hi);

/**
 * Elo → 期望进球数 λ 映射(SPEC §M3.1)
 * expectedGoalDiff = (homeElo - awayElo) / eloDivisor
 * λ_home = (baseGoals/2 + expectedGoalDiff/2) * (1 + homeAdv)
 * λ_away = (baseGoals/2 - expectedGoalDiff/2) * (1 - homeAdv/2)
 * 钳制 λ ∈ [0.1, 6.0]
 * @param {number} homeElo
 * @param {number} awayElo
 * @param {number} baseGoals 联赛基准总进球
 * @param {number} homeAdv 主场优势系数
 * @param {number} eloDivisor Elo→进球差换算除数
 * @returns {{lambdaHome:number, lambdaAway:number}}
 */
export function computeLambdas(homeElo, awayElo, baseGoals, homeAdv, eloDivisor) {
  const expectedGoalDiff = (homeElo - awayElo) / eloDivisor;
  const rawHome = (baseGoals / 2 + expectedGoalDiff / 2) * (1 + homeAdv);
  const rawAway = (baseGoals / 2 - expectedGoalDiff / 2) * (1 - homeAdv / 2);
  return {
    lambdaHome: clamp(rawHome, LAMBDA_MIN, LAMBDA_MAX),
    lambdaAway: clamp(rawAway, LAMBDA_MIN, LAMBDA_MAX),
  };
}

/**
 * 将 11×11 比分概率矩阵折叠为胜/平/负三档概率
 * win  = Σ_{h>a} matrix[h][a]
 * draw = Σ_{h==a} matrix[h][a]
 * lose = Σ_{h<a} matrix[h][a]
 * @param {number[][]} matrix scoreMatrix 输出
 * @returns {[number, number, number]} [win, draw, lose]
 */
export function toThreeWay(matrix) {
  let win = 0, draw = 0, lose = 0;
  for (let h = 0; h < matrix.length; h++) {
    for (let a = 0; a < matrix[h].length; a++) {
      if (h > a) win += matrix[h][a];
      else if (h === a) draw += matrix[h][a];
      else lose += matrix[h][a];
    }
  }
  return [win, draw, lose];
}

/**
 * 社区投票分布:每条投票(homeScore,awayScore)映射胜/平/负计数后归一
 * 无投票 → Dirichlet α=1 先验 → [1/3, 1/3, 1/3]
 * @param {Array<{homeScore:number, awayScore:number}>} votes
 * @returns {[number, number, number]} [win, draw, lose]
 */
export function communityDistribution(votes) {
  if (!votes || votes.length === 0) {
    return [1 / 3, 1 / 3, 1 / 3];
  }
  let win = 0, draw = 0, lose = 0;
  for (const v of votes) {
    if (v.homeScore > v.awayScore) win += 1;
    else if (v.homeScore === v.awayScore) draw += 1;
    else lose += 1;
  }
  const n = votes.length;
  return [win / n, draw / n, lose / n];
}

/**
 * 算法/社区融合权重:votes 越多越信任社区,但权重不低于 0.5
 * w = max(0.5, 0.7 - 0.02 * min(votes, 10))
 * @param {number} votes 投票数
 * @returns {number} 算法侧权重 w ∈ [0.5, 0.7]
 */
export function weightFunction(votes) {
  return Math.max(0.5, 0.7 - 0.02 * Math.min(votes, 10));
}

/**
 * 三档分布加权融合:P_final[i] = w·algo[i] + (1−w)·comm[i]
 * @param {[number,number,number]} algo3
 * @param {[number,number,number]} comm3
 * @param {number} w 算法侧权重
 * @returns {[number,number,number]}
 */
export function fuseDistributions(algo3, comm3, w) {
  return algo3.map((a, i) => w * a + (1 - w) * comm3[i]);
}

/**
 * 完整预测:融合 Poisson 算法分布与社区投票
 * @param {{homeElo:number, awayElo:number, baseGoals:number, homeAdv:number, eloDivisor:number, votes:Array}} opts
 * @returns {{algo3:[number,number,number], community3:[number,number,number], final3:[number,number,number], mostLikely:[number,number], w:number, votes:Array, matrix:number[][], matrixSum:number}}
 */
export function forecast({ homeElo, awayElo, baseGoals, homeAdv, eloDivisor, votes }) {
  const { lambdaHome, lambdaAway } = computeLambdas(homeElo, awayElo, baseGoals, homeAdv, eloDivisor);

  const matrix = scoreMatrix(lambdaHome, lambdaAway);
  const algo3 = toThreeWay(matrix);
  const community3 = communityDistribution(votes);
  const w = weightFunction(votes ? votes.length : 0);
  const final3 = fuseDistributions(algo3, community3, w);
  const mostLikely = mostLikelyScore(matrix);

  let matrixSum = 0;
  for (const row of matrix) {
    for (const v of row) matrixSum += v;
  }

  return { algo3, community3, final3, mostLikely, w, votes, matrix, matrixSum };
}
