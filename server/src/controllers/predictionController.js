// predictionController.js — 预测提交 / 预测融合结果控制器
// SPEC §M3+M5: 提交预测(SCHEDULED 校验 + upsert)、forecast 算法预测、prediction-final 融合预测

import { z } from 'zod';
import { prisma } from '../prismaClient.js';
import { forecast } from '../services/predictionService.js';

// 预测入参校验:homeScore / awayScore 非负整数
const predictionSchema = z.object({
  homeScore: z.number().int().min(0),
  awayScore: z.number().int().min(0),
});

/**
 * POST /matches/:matchId/predictions(鉴权)
 * - 未登录 → 401
 * - 参数非法 → 400
 * - 比赛不存在 → 404
 * - 比赛 status !== SCHEDULED → 409
 * - upsert(userId+matchId 唯一,重复即更新)→ 201 { prediction }
 */
export async function create(req, res) {
  if (!req.user) {
    return res.status(401).json({ error: '未提供认证令牌' });
  }

  const parsed = predictionSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: '请求参数无效', details: parsed.error.issues });
  }

  const { homeScore, awayScore } = parsed.data;
  const { matchId } = req.params;
  const { userId } = req.user;

  const match = await prisma.match.findUnique({ where: { id: matchId } });
  if (!match) {
    return res.status(404).json({ error: '比赛不存在' });
  }
  if (match.status !== 'SCHEDULED') {
    return res.status(409).json({ error: '比赛已开始或已结束,无法提交预测' });
  }

  const prediction = await prisma.prediction.upsert({
    where: { userId_matchId: { userId, matchId } },
    create: { userId, matchId, homeScore, awayScore },
    update: { homeScore, awayScore, createdAt: new Date() },
  });

  return res.status(201).json({ prediction });
}

/**
 * GET /matches/:id/my-prediction(鉴权)
 * 返回当前登录用户对该场比赛的最新预测；未预测则 prediction 为 null。
 */
export async function getMyPrediction(req, res) {
  if (!req.user) {
    return res.status(401).json({ error: '未提供认证令牌' });
  }

  const { id } = req.params;
  const { userId } = req.user;

  const prediction = await prisma.prediction.findUnique({
    where: { userId_matchId: { userId, matchId: id } },
  });

  return res.status(200).json({ prediction });
}

/**
 * GET /matches/:id/forecast(公开)
 * 查询比赛(含两队 Elo)+ 该比赛所有社区投票,调 forecast 返回算法预测结果。
 */
export async function getForecast(req, res) {
  const { id } = req.params;

  const match = await prisma.match.findUnique({
    where: { id },
    include: { homeTeam: true, awayTeam: true },
  });
  if (!match) {
    return res.status(404).json({ error: '比赛不存在' });
  }

  const votes = await prisma.prediction.findMany({
    where: { matchId: id },
    select: { homeScore: true, awayScore: true },
  });

  const result = forecast({
    homeElo: match.homeTeam.eloRating,
    awayElo: match.awayTeam.eloRating,
    baseGoals: 2.6,
    homeAdv: 0.2,
    eloDivisor: 200,
    votes,
  });

  return res.status(200).json(result);
}

/**
 * GET /matches/:id/prediction-final(公开)
 * 返回融合预测结果(final3 等三档概率)。
 */
export async function getPredictionFinal(req, res) {
  const { id } = req.params;

  const match = await prisma.match.findUnique({
    where: { id },
    include: { homeTeam: true, awayTeam: true },
  });
  if (!match) {
    return res.status(404).json({ error: '比赛不存在' });
  }

  const votes = await prisma.prediction.findMany({
    where: { matchId: id },
    select: { homeScore: true, awayScore: true },
  });

  const result = forecast({
    homeElo: match.homeTeam.eloRating,
    awayElo: match.awayTeam.eloRating,
    baseGoals: 2.6,
    homeAdv: 0.2,
    eloDivisor: 200,
    votes,
  });

  return res.status(200).json(result);
}
