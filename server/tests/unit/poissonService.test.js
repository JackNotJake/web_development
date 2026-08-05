import { describe, it, expect } from 'vitest';
import { poissonPmf, scoreMatrix, mostLikelyScore } from '../../src/services/poissonService.js';

describe('poissonService', () => {
  it('poissonPmf: λ=1.5 时 P(0)=e^-1.5', () => {
    expect(poissonPmf(0, 1.5)).toBeCloseTo(Math.exp(-1.5), 6);
    expect(poissonPmf(1, 1.5)).toBeCloseTo(1.5 * Math.exp(-1.5), 6);
  });
  it('poissonPmf: 概率和≈1(0..10)', () => {
    const sum = Array.from({length:11}, (_,k)=>poissonPmf(k,2.0)).reduce((a,b)=>a+b,0);
    expect(sum).toBeCloseTo(1, 3);
  });
  it('scoreMatrix: 形状 11x11 且概率和≈1', () => {
    const m = scoreMatrix(1.5, 1.2);
    expect(m.length).toBe(11);
    expect(m[0].length).toBe(11);
    let sum = 0; for (const r of m) for (const v of r) sum += v;
    expect(sum).toBeCloseTo(1, 2);
  });
  it('mostLikelyScore: λ主>λ客 时主队更可能赢', () => {
    const m = scoreMatrix(2.5, 0.8);
    const [h, a] = mostLikelyScore(m);
    expect(h).toBeGreaterThan(a);
  });
  it('poissonPmf: λ=0 时 P(0)=1、P(k>0)=0(冷启动验证修复)', () => {
    expect(poissonPmf(0, 0)).toBe(1);
    expect(poissonPmf(1, 0)).toBe(0);
    expect(poissonPmf(5, 0)).toBe(0);
  });
});
