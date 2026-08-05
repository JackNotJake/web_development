import { fetchMatches } from '../lib/footballDataApi.js';
import { prisma } from '../prismaClient.js';
import cron from 'node-cron';

/**
 * 执行一次同步:从 Football-Data API 拉取某赛事比赛列表,
 * 遍历每场比赛 → upsert 主/客队 → upsert 比赛。
 *
 * 任何错误都会被捕获并记日志,不向上抛出,返回 { error }。
 *
 * @param {string} [competition='PL'] 赛事代码
 * @param {string} token Football-Data API token
 * @returns {Promise<{matchesSynced?: number, error?: string}>}
 */
export async function syncOnce(competition = 'PL', token) {
  try {
    const data = await fetchMatches(competition, token);
    const matches = data?.matches || [];

    for (const match of matches) {
      const homeTeam = match.homeTeam || {};
      const awayTeam = match.awayTeam || {};
      const fullTime = match.score?.fullTime || {};

      // upsert 主队(以 footballDataId 为唯一键)
      const home = await prisma.team.upsert({
        where: { footballDataId: homeTeam.id },
        create: {
          footballDataId: homeTeam.id,
          name: homeTeam.name,
          eloRating: 1500,
          crestUrl: homeTeam.crest ?? null,
        },
        update: {
          name: homeTeam.name,
          crestUrl: homeTeam.crest ?? null,
        },
      });

      // upsert 客队
      const away = await prisma.team.upsert({
        where: { footballDataId: awayTeam.id },
        create: {
          footballDataId: awayTeam.id,
          name: awayTeam.name,
          eloRating: 1500,
          crestUrl: awayTeam.crest ?? null,
        },
        update: {
          name: awayTeam.name,
          crestUrl: awayTeam.crest ?? null,
        },
      });

      // upsert 比赛(以 footballDataId 为唯一键 → 幂等)
      await prisma.match.upsert({
        where: { footballDataId: match.id },
        create: {
          footballDataId: match.id,
          competition,
          matchday: match.matchday ?? null,
          status: match.status ?? 'SCHEDULED',
          utcDate: new Date(match.utcDate),
          homeTeamId: home.id,
          awayTeamId: away.id,
          homeScore: fullTime.home ?? null,
          awayScore: fullTime.away ?? null,
        },
        update: {
          competition,
          matchday: match.matchday ?? null,
          status: match.status ?? 'SCHEDULED',
          utcDate: new Date(match.utcDate),
          homeTeamId: home.id,
          awayTeamId: away.id,
          homeScore: fullTime.home ?? null,
          awayScore: fullTime.away ?? null,
        },
      });
    }

    return { matchesSynced: matches.length };
  } catch (e) {
    console.error('[syncFootballData] syncOnce failed:', e);
    return { error: e.message };
  }
}

/**
 * 启动定时同步任务,按 cron 表达式周期性调用 syncOnce。
 *
 * @param {string} token Football-Data API token
 * @param {string} [cronExpr='* * * * *'] cron 表达式,默认每分钟
 * @returns {import('node-cron').ScheduledTask} 调度任务句柄
 */
export function startSyncJob(token, cronExpr = '* * * * *') {
  return cron.schedule(cronExpr, () => syncOnce('PL', token));
}
