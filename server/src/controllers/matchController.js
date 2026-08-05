// matchController.js — 赛事浏览控制器(公开,无需鉴权)
// list:多条件过滤 + 分页,返回 { matches, page, total }
// detail:按 id 查询详情,含双方 Team(含 eloRating),不存在 → 404

import { prisma } from '../prismaClient.js';

// Team 公开字段(含 eloRating 供前端展示)
const teamSelect = {
  select: {
    id: true,
    name: true,
    eloRating: true,
    crestUrl: true,
  },
};

/**
 * 解析分页参数:page 默认 1,limit 默认 20,非法值回退默认。
 * @param {any} raw
 * @param {number} fallback
 * @param {number} max
 * @returns {number}
 */
function parsePositiveInt(raw, fallback, max) {
  const n = Number.parseInt(raw, 10);
  if (!Number.isFinite(n) || n < 1) return fallback;
  return max ? Math.min(n, max) : n;
}

/**
 * GET /matches
 * query:competition, status, dateFrom, dateTo, page(默认1), limit(默认20)
 * 返回 { matches, page, total }
 */
export async function list(req, res) {
  const { competition, status, dateFrom, dateTo } = req.query;
  const page = parsePositiveInt(req.query.page, 1);
  const limit = parsePositiveInt(req.query.limit, 20, 100);

  // 构造 where:仅写入已提供的过滤条件
  const where = {};
  if (competition) where.competition = competition;
  if (status) where.status = status;
  // utcDate 范围过滤
  if (dateFrom || dateTo) {
    where.utcDate = {};
    if (dateFrom) where.utcDate.gte = new Date(dateFrom);
    if (dateTo) where.utcDate.lte = new Date(dateTo);
  }

  const [matches, total] = await Promise.all([
    prisma.match.findMany({
      where,
      include: { homeTeam: teamSelect, awayTeam: teamSelect },
      skip: (page - 1) * limit,
      take: limit,
      orderBy: { utcDate: 'asc' },
    }),
    prisma.match.count({ where }),
  ]);

  return res.status(200).json({ matches, page, total });
}

/**
 * GET /matches/:id
 * 详情含双方 Team(eloRating)。不存在 → 404。
 */
export async function detail(req, res) {
  const { id } = req.params;
  const match = await prisma.match.findUnique({
    where: { id },
    include: { homeTeam: teamSelect, awayTeam: teamSelect },
  });
  if (!match) {
    return res.status(404).json({ error: '赛事不存在' });
  }
  return res.status(200).json(match);
}
