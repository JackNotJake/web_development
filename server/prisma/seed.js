// seed.js — 演示种子数据
// 在无 Football-Data API token 时,提供可演示的英超样例球队与比赛,
// 使应用开箱即用(便于课程演示/评审)。幂等:以 footballDataId 为键 upsert。
//
// 运行:npm run db:seed(需先 npm run db:migrate 生成表)
import { prisma } from '../src/prismaClient.js';

// 样例英超球队(footballDataId 使用 9xxxx 段避免与真实 API id 冲突)
const teams = [
  { footballDataId: 90001, name: 'Manchester City', eloRating: 1850 },
  { footballDataId: 90002, name: 'Arsenal', eloRating: 1820 },
  { footballDataId: 90003, name: 'Liverpool', eloRating: 1800 },
  { footballDataId: 90004, name: 'Manchester United', eloRating: 1720 },
  { footballDataId: 90005, name: 'Chelsea', eloRating: 1750 },
  { footballDataId: 90006, name: 'Tottenham Hotspur', eloRating: 1740 },
];

// 样例比赛:若干未开始 + 若干已结束
const now = Date.now();
const days = (n) => new Date(now + n * 86400000);
const matches = [
  { id: 91001, home: 90001, away: 90002, status: 'SCHEDULED', date: days(2), homeScore: null, awayScore: null },
  { id: 91002, home: 90003, away: 90004, status: 'SCHEDULED', date: days(3), homeScore: null, awayScore: null },
  { id: 91003, home: 90005, away: 90006, status: 'SCHEDULED', date: days(4), homeScore: null, awayScore: null },
  { id: 91004, home: 90002, away: 90003, status: 'SCHEDULED', date: days(5), homeScore: null, awayScore: null },
  { id: 91005, home: 90001, away: 90004, status: 'FINISHED', date: days(-3), homeScore: 2, awayScore: 1 },
  { id: 91006, home: 90005, away: 90002, status: 'FINISHED', date: days(-5), homeScore: 1, awayScore: 1 },
];

async function main() {
  console.log('[seed] 写入球队...');
  const teamMap = new Map();
  for (const t of teams) {
    const row = await prisma.team.upsert({
      where: { footballDataId: t.footballDataId },
      create: { footballDataId: t.footballDataId, name: t.name, eloRating: t.eloRating },
      update: { name: t.name, eloRating: t.eloRating },
    });
    teamMap.set(t.footballDataId, row.id);
  }

  console.log('[seed] 写入比赛...');
  for (const m of matches) {
    await prisma.match.upsert({
      where: { footballDataId: m.id },
      create: {
        footballDataId: m.id,
        competition: 'PL',
        matchday: 1,
        status: m.status,
        utcDate: m.date,
        homeTeamId: teamMap.get(m.home),
        awayTeamId: teamMap.get(m.away),
        homeScore: m.homeScore,
        awayScore: m.awayScore,
      },
      update: {
        status: m.status,
        utcDate: m.date,
        homeTeamId: teamMap.get(m.home),
        awayTeamId: teamMap.get(m.away),
        homeScore: m.homeScore,
        awayScore: m.awayScore,
      },
    });
  }

  console.log('[seed] 完成:6 支球队 + 6 场比赛。');
}

main()
  .catch((e) => {
    console.error('[seed] 失败:', e);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
