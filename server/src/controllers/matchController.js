// matchController.js — 赛事浏览控制器(公开,无需鉴权)
// list:多条件过滤 + 分页,返回 { matches, page, total }
// detail:按 id 查询详情,含双方 Team(含 eloRating),不存在 → 404

import { prisma } from '../prismaClient.js';

// Team 公开字段(含 eloRating/alias/color 供前端展示)
const teamSelect = {
  select: {
    id: true,
    name: true,
    alias: true,
    eloRating: true,
    crestUrl: true,
    color: true,
    secondaryColor: true,
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
 * 详情含双方 Team(eloRating) 及各自近期战绩。不存在 → 404。
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

  const [homeRecent, awayRecent] = await Promise.all([
    prisma.match.findMany({
      where: {
        status: 'FINISHED',
        OR: [{ homeTeamId: match.homeTeamId }, { awayTeamId: match.homeTeamId }],
        id: { not: id },
      },
      orderBy: { utcDate: 'desc' },
      take: 5,
      include: { homeTeam: teamSelect, awayTeam: teamSelect },
    }),
    prisma.match.findMany({
      where: {
        status: 'FINISHED',
        OR: [{ homeTeamId: match.awayTeamId }, { awayTeamId: match.awayTeamId }],
        id: { not: id },
      },
      orderBy: { utcDate: 'desc' },
      take: 5,
      include: { homeTeam: teamSelect, awayTeam: teamSelect },
    }),
  ]);

  return res.status(200).json({ ...match, homeRecent, awayRecent });
}

/**
 * GET /teams
 * 返回所有球队概览，含近期战绩统计。
 */
export async function teams(req, res) {
  const teams = await prisma.team.findMany({
    orderBy: { eloRating: 'desc' },
    select: {
      id: true,
      name: true,
      alias: true,
      eloRating: true,
      crestUrl: true,
      color: true,
      secondaryColor: true,
    },
  });

  const matches = await prisma.match.findMany({
    where: { status: 'FINISHED' },
    include: { homeTeam: { select: { id: true } }, awayTeam: { select: { id: true } } },
  });

  const stats = new Map();
  for (const t of teams) {
    stats.set(t.id, { played: 0, won: 0, drawn: 0, lost: 0, gf: 0, ga: 0, points: 0 });
  }

  for (const m of matches) {
    const home = stats.get(m.homeTeamId);
    const away = stats.get(m.awayTeamId);
    if (!home || !away) continue;

    home.played += 1;
    away.played += 1;
    home.gf += m.homeScore ?? 0;
    home.ga += m.awayScore ?? 0;
    away.gf += m.awayScore ?? 0;
    away.ga += m.homeScore ?? 0;

    if (m.homeScore > m.awayScore) {
      home.won += 1;
      home.points += 3;
      away.lost += 1;
    } else if (m.homeScore < m.awayScore) {
      away.won += 1;
      away.points += 3;
      home.lost += 1;
    } else {
      home.drawn += 1;
      away.drawn += 1;
      home.points += 1;
      away.points += 1;
    }
  }

  const result = teams.map((t) => ({ ...t, record: stats.get(t.id) }));
  return res.status(200).json({ teams: result });
}

/**
 * GET /teams/:id
 * 球队详情 + 近期战绩。
 */
export async function teamDetail(req, res) {
  const { id } = req.params;
  const team = await prisma.team.findUnique({
    where: { id },
    select: {
      id: true,
      name: true,
      alias: true,
      eloRating: true,
      crestUrl: true,
      color: true,
      secondaryColor: true,
    },
  });
  if (!team) {
    return res.status(404).json({ error: '球队不存在' });
  }

  const recentMatches = await prisma.match.findMany({
    where: {
      status: 'FINISHED',
      OR: [{ homeTeamId: id }, { awayTeamId: id }],
    },
    orderBy: { utcDate: 'desc' },
    take: 5,
    include: { homeTeam: teamSelect, awayTeam: teamSelect },
  });

  return res.status(200).json({ team, recentMatches });
}

/**
 * GET /faqs
 * 常见问题列表。
 */
export async function faqs(req, res) {
  const faqs = await prisma.faq.findMany({ orderBy: { order: 'asc' } });
  return res.status(200).json({ faqs });
}
