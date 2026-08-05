// leaderboardController.js — 排行榜控制器
// SPEC §M5: GET /leaderboard?scope=week|all — 按 totalPoints 降序 Top 20

import { prisma } from '../prismaClient.js';

/**
 * GET /leaderboard?scope=week|all
 * scope=all  — 全部用户按 totalPoints 降序 Top 20
 * scope=week — 本周活跃用户(当前 MVP 与 all 一致,见歧义说明)
 * 返回 { leaderboard: [{ username, totalPoints, eloScore }] }
 */
export async function list(req, res) {
  const { scope = 'all' } = req.query;

  // MVP:两种 scope 均按 totalPoints 降序取 Top 20
  // (week 维度需要周积分字段,当前 schema 仅有累计 totalPoints)
  const leaderboard = await prisma.user.findMany({
    orderBy: { totalPoints: 'desc' },
    take: 20,
    select: {
      username: true,
      totalPoints: true,
      eloScore: true,
    },
  });

  return res.status(200).json({ leaderboard });
}
