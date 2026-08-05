import { describe, it, expect } from 'vitest';
import { expectedScore, updateElo } from '../../src/services/eloService.js';

describe('eloService', () => {
  it('expectedScore: 同分时预期胜率为0.5', () => {
    expect(expectedScore(1500, 1500)).toBe(0.5);
  });
  it('expectedScore: 高分队伍预期胜率更高', () => {
    const we = expectedScore(1600, 1500);
    expect(we).toBeGreaterThan(0.5);
    expect(we).toBeCloseTo(0.6401, 3);
  });
  it('updateElo: 胜方加分、负方减分', () => {
    const [ra, rb] = updateElo(1500, 1500, 1, 32);
    expect(ra).toBeGreaterThan(1500);
    expect(rb).toBeLessThan(1500);
    expect(ra + rb).toBeCloseTo(3000, 5);
  });
  it('updateElo: 平局双方趋近平均', () => {
    const [ra, rb] = updateElo(1600, 1400, 0.5, 32);
    expect(ra).toBeLessThan(1600);
    expect(rb).toBeGreaterThan(1400);
  });
});
