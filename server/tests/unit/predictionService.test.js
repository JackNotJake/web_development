import { describe, it, expect } from 'vitest';
import { computeLambdas, toThreeWay, communityDistribution, fuseDistributions, weightFunction, forecast } from '../../src/services/predictionService.js';

describe('predictionService', () => {
  it('computeLambdas: 主队Elo高则λ主>λ客', () => {
    const { lambdaHome, lambdaAway } = computeLambdas(1600, 1400, 2.6, 0.2, 200);
    expect(lambdaHome).toBeGreaterThan(lambdaAway);
    expect(lambdaHome + lambdaAway).toBeCloseTo(2.6 * 1.1, 1);
  });
  it('computeLambdas: 钳制 λ∈[0.1,6.0]', () => {
    const r = computeLambdas(3000, 500, 2.6, 0.2, 200);
    expect(r.lambdaHome).toBeLessThanOrEqual(6.0);
    expect(r.lambdaAway).toBeGreaterThanOrEqual(0.1);
  });
  it('toThreeWay: 矩阵折叠为胜平负3档且和=1', () => {
    const m = Array.from({length:11},()=>Array(11).fill(1/121));
    const t = toThreeWay(m);
    expect(t).toHaveLength(3);
    const sum = t.reduce((a,b)=>a+b,0);
    expect(sum).toBeCloseTo(1, 2);
  });
  it('communityDistribution: 空投票Dirichlet→[1/3,1/3,1/3]', () => {
    const d = communityDistribution([]);
    expect(d).toHaveLength(3);
    expect(d[0]).toBeCloseTo(1/3, 3);
  });
  it('communityDistribution: 投票计数归一', () => {
    const d = communityDistribution([{homeScore:2,awayScore:1},{homeScore:3,awayScore:0},{homeScore:1,awayScore:1}]);
    expect(d[0]).toBeCloseTo(2/3, 3);
    expect(d[1]).toBeCloseTo(1/3, 3);
    expect(d[2]).toBeCloseTo(0, 3);
  });
  it('weightFunction: votes=0→0.7, votes≥10→0.5', () => {
    expect(weightFunction(0)).toBeCloseTo(0.7, 3);
    expect(weightFunction(10)).toBeCloseTo(0.5, 3);
    expect(weightFunction(20)).toBeCloseTo(0.5, 3);
  });
  it('fuseDistributions: w=1 时等于算法分布', () => {
    const algo = [0.5, 0.3, 0.2];
    const comm = [1/3, 1/3, 1/3];
    const f = fuseDistributions(algo, comm, 1.0);
    expect(f[0]).toBeCloseTo(0.5, 6);
  });
  it('forecast: 返回3档+最可能比分+矩阵', () => {
    const r = forecast({ homeElo:1600, awayElo:1400, baseGoals:2.6, homeAdv:0.2, eloDivisor:200, votes:[] });
    expect(r.final3).toHaveLength(3);
    expect(r.mostLikely).toHaveLength(2);
    expect(r.matrix.length).toBe(11);
    expect(r.w).toBeCloseTo(0.7, 3);
  });
});
