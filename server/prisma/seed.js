// seed.js — 2026 江苏省城市足球联赛（苏超）种子数据
// 替换原有英超演示数据，提供 13 支设区市代表队、历史战绩、未来赛程与 FAQ。
// 运行：npm run db:seed（需先 npm run db:migrate 生成表）
import { prisma } from '../src/prismaClient.js';

const teams = [
  { footballDataId: 1, name: '南京队', alias: '金陵', eloRating: 1680, color: '#8B0000', secondaryColor: '#FF4444' },
  { footballDataId: 2, name: '苏州队', alias: '姑苏', eloRating: 1660, color: '#1E40AF', secondaryColor: '#60A5FA' },
  { footballDataId: 3, name: '无锡队', alias: '太湖明珠', eloRating: 1640, color: '#B45309', secondaryColor: '#FBBF24' },
  { footballDataId: 4, name: '常州队', alias: '龙城', eloRating: 1620, color: '#C2410C', secondaryColor: '#FB923C' },
  { footballDataId: 5, name: '镇江队', alias: '三山一水', eloRating: 1600, color: '#4338CA', secondaryColor: '#818CF8' },
  { footballDataId: 6, name: '扬州队', alias: '广陵', eloRating: 1580, color: '#0E7490', secondaryColor: '#22D3EE' },
  { footballDataId: 7, name: '泰州队', alias: '凤城', eloRating: 1700, color: '#BE123C', secondaryColor: '#FB7185' },
  { footballDataId: 8, name: '南通队', alias: '江海', eloRating: 1650, color: '#047857', secondaryColor: '#34D399' },
  { footballDataId: 9, name: '盐城队', alias: '湿地之都', eloRating: 1590, color: '#CA8A04', secondaryColor: '#FDE047' },
  { footballDataId: 10, name: '淮安队', alias: '运河之都', eloRating: 1570, color: '#7C3AED', secondaryColor: '#A78BFA' },
  { footballDataId: 11, name: '宿迁队', alias: '西楚', eloRating: 1610, color: '#0F766E', secondaryColor: '#2DD4BF' },
  { footballDataId: 12, name: '徐州队', alias: '彭城', eloRating: 1630, color: '#9F1239', secondaryColor: '#F43F5E' },
  { footballDataId: 13, name: '连云港队', alias: '山海之城', eloRating: 1560, color: '#0369A1', secondaryColor: '#38BDF8' },
];

const utcDate = (dateStr, timeStr = '19:40') => new Date(`${dateStr}T${timeStr}:00+08:00`);

// 2026 赛季未来赛程（摘自 suchao.crazy-thursday.com）
const futureSchedule = [
  { id: 101, matchday: 10, home: 3, away: 9, venue: '宜兴市体育中心体育场', date: utcDate('2026-08-08') },
  { id: 102, matchday: 10, home: 7, away: 13, venue: '泰州体育公园体育场', date: utcDate('2026-08-08') },
  { id: 103, matchday: 10, home: 12, away: 4, venue: '徐州奥体中心体育场', date: utcDate('2026-08-08') },
  { id: 104, matchday: 11, home: 8, away: 5, venue: '南通体育会展中心体育场', date: utcDate('2026-08-15') },
  { id: 105, matchday: 11, home: 11, away: 2, venue: '宿迁奥体中心体育场', date: utcDate('2026-08-15') },
  { id: 106, matchday: 11, home: 1, away: 6, venue: '南京奥体中心体育场', date: utcDate('2026-08-15') },
  { id: 107, matchday: 12, home: 2, away: 1, venue: '苏州市体育中心体育场', date: utcDate('2026-08-22') },
  { id: 108, matchday: 12, home: 5, away: 12, venue: '镇江市体育会展中心体育场', date: utcDate('2026-08-22') },
  { id: 109, matchday: 12, home: 7, away: 10, venue: '泰州体育公园体育场', date: utcDate('2026-08-22') },
  { id: 110, matchday: 13, home: 6, away: 11, venue: '扬州体育公园体育场', date: utcDate('2026-08-29') },
  { id: 111, matchday: 13, home: 4, away: 3, venue: '常州奥体中心体育场', date: utcDate('2026-08-29') },
  { id: 112, matchday: 13, home: 10, away: 13, venue: '淮安市体育中心体育场', date: utcDate('2026-08-29') },
  { id: 113, matchday: 14, home: 13, away: 8, venue: '连云港市体育中心体育场', date: utcDate('2026-09-05') },
  { id: 114, matchday: 14, home: 9, away: 12, venue: '盐城奥体中心体育场', date: utcDate('2026-09-05') },
  { id: 115, matchday: 14, home: 1, away: 7, venue: '南京奥体中心体育场', date: utcDate('2026-09-05') },
  { id: 116, matchday: 15, home: 11, away: 7, venue: '宿迁奥体中心体育场', date: utcDate('2026-09-12') },
  { id: 117, matchday: 15, home: 9, away: 8, venue: '盐城奥体中心体育场', date: utcDate('2026-09-12') },
  { id: 118, matchday: 15, home: 1, away: 5, venue: '南京奥体中心体育场', date: utcDate('2026-09-12') },
  { id: 119, matchday: 15, home: 3, away: 6, venue: '江阴市体育中心体育场', date: utcDate('2026-09-12') },
  { id: 120, matchday: 15, home: 12, away: 10, venue: '徐州奥体中心体育场', date: utcDate('2026-09-12') },
  { id: 121, matchday: 15, home: 4, away: 2, venue: '常州奥体中心体育场', date: utcDate('2026-09-12') },
  { id: 122, matchday: 16, home: 2, away: 12, venue: '昆山奥体中心足球场', date: utcDate('2026-09-19') },
  { id: 123, matchday: 16, home: 8, away: 3, venue: '南通体育会展中心体育场', date: utcDate('2026-09-19') },
  { id: 124, matchday: 16, home: 5, away: 13, venue: '镇江市体育会展中心体育场', date: utcDate('2026-09-19') },
  { id: 125, matchday: 16, home: 6, away: 4, venue: '扬州体育公园体育场', date: utcDate('2026-09-19') },
];

// 历史战绩（用于分析页“近期战绩”和积分榜），时间设定在 2026 年 7 月
const pastMatches = [
  { id: 201, matchday: 9, home: 2, away: 3, venue: '苏州市体育中心体育场', date: utcDate('2026-07-27'), homeScore: 0, awayScore: 1 },
  { id: 202, matchday: 9, home: 12, away: 10, venue: '徐州奥体中心体育场', date: utcDate('2026-07-27'), homeScore: 1, awayScore: 3 },
  { id: 203, matchday: 9, home: 9, away: 5, venue: '盐城奥体中心体育场', date: utcDate('2026-07-27'), homeScore: 2, awayScore: 0 },
  { id: 204, matchday: 9, home: 1, away: 11, venue: '南京奥体中心体育场', date: utcDate('2026-07-27'), homeScore: 3, awayScore: 1 },
  { id: 205, matchday: 9, home: 7, away: 8, venue: '泰州体育公园体育场', date: utcDate('2026-07-27'), homeScore: 2, awayScore: 1 },
  { id: 206, matchday: 8, home: 4, away: 6, venue: '常州奥体中心体育场', date: utcDate('2026-07-20'), homeScore: 2, awayScore: 4 },
  { id: 207, matchday: 8, home: 13, away: 9, venue: '连云港市体育中心体育场', date: utcDate('2026-07-20'), homeScore: 0, awayScore: 0 },
  { id: 208, matchday: 8, home: 10, away: 1, venue: '淮安市体育中心体育场', date: utcDate('2026-07-20'), homeScore: 1, awayScore: 2 },
  { id: 209, matchday: 8, home: 5, away: 7, venue: '镇江市体育会展中心体育场', date: utcDate('2026-07-20'), homeScore: 0, awayScore: 2 },
  { id: 210, matchday: 8, home: 11, away: 12, venue: '宿迁奥体中心体育场', date: utcDate('2026-07-20'), homeScore: 2, awayScore: 1 },
  { id: 211, matchday: 7, home: 3, away: 13, venue: '江阴市体育中心体育场', date: utcDate('2026-07-13'), homeScore: 1, awayScore: 0 },
  { id: 212, matchday: 7, home: 8, away: 4, venue: '南通体育会展中心体育场', date: utcDate('2026-07-13'), homeScore: 2, awayScore: 1 },
  { id: 213, matchday: 7, home: 6, away: 9, venue: '扬州体育公园体育场', date: utcDate('2026-07-13'), homeScore: 1, awayScore: 1 },
  { id: 214, matchday: 7, home: 1, away: 5, venue: '南京奥体中心体育场', date: utcDate('2026-07-13'), homeScore: 2, awayScore: 0 },
  { id: 215, matchday: 7, home: 2, away: 11, venue: '苏州市体育中心体育场', date: utcDate('2026-07-13'), homeScore: 1, awayScore: 1 },
  { id: 216, matchday: 6, home: 12, away: 3, venue: '徐州奥体中心体育场', date: utcDate('2026-07-06'), homeScore: 0, awayScore: 1 },
  { id: 217, matchday: 6, home: 7, away: 6, venue: '泰州体育公园体育场', date: utcDate('2026-07-06'), homeScore: 3, awayScore: 0 },
  { id: 218, matchday: 6, home: 9, away: 2, venue: '盐城奥体中心体育场', date: utcDate('2026-07-06'), homeScore: 1, awayScore: 2 },
  { id: 219, matchday: 6, home: 10, away: 8, venue: '淮安市体育中心体育场', date: utcDate('2026-07-06'), homeScore: 0, awayScore: 2 },
  { id: 220, matchday: 6, home: 13, away: 4, venue: '连云港市体育中心体育场', date: utcDate('2026-07-06'), homeScore: 1, awayScore: 1 },
  { id: 221, matchday: 5, home: 5, away: 10, venue: '镇江市体育会展中心体育场', date: utcDate('2026-06-29'), homeScore: 2, awayScore: 1 },
  { id: 222, matchday: 5, home: 11, away: 9, venue: '宿迁奥体中心体育场', date: utcDate('2026-06-29'), homeScore: 1, awayScore: 0 },
  { id: 223, matchday: 5, home: 4, away: 1, venue: '常州奥体中心体育场', date: utcDate('2026-06-29'), homeScore: 1, awayScore: 2 },
  { id: 224, matchday: 5, home: 6, away: 8, venue: '扬州体育公园体育场', date: utcDate('2026-06-29'), homeScore: 0, awayScore: 1 },
  { id: 225, matchday: 5, home: 3, away: 7, venue: '宜兴市体育中心体育场', date: utcDate('2026-06-29'), homeScore: 1, awayScore: 1 },
  { id: 226, matchday: 4, home: 2, away: 5, venue: '苏州市体育中心体育场', date: utcDate('2026-06-22'), homeScore: 2, awayScore: 0 },
  { id: 227, matchday: 4, home: 12, away: 6, venue: '徐州奥体中心体育场', date: utcDate('2026-06-22'), homeScore: 1, awayScore: 0 },
  { id: 228, matchday: 4, home: 1, away: 13, venue: '南京奥体中心体育场', date: utcDate('2026-06-22'), homeScore: 2, awayScore: 0 },
  { id: 229, matchday: 4, home: 8, away: 11, venue: '南通体育会展中心体育场', date: utcDate('2026-06-22'), homeScore: 2, awayScore: 2 },
  { id: 230, matchday: 4, home: 9, away: 10, venue: '盐城奥体中心体育场', date: utcDate('2026-06-22'), homeScore: 3, awayScore: 1 },
];

const faqs = [
  { question: '「苏超」和江苏省城市足球联赛是什么关系？', answer: '「苏超」是球迷与媒体对江苏省城市足球联赛的俗称，正式公告与文件以「江苏省城市足球联赛」为准。' },
  { question: '2026 赛季苏超大概什么时间比赛？', answer: '2026 赛季常规赛往往在 4 月中旬前后揭幕，赛历延续至秋末；具体每一轮开球日、电视转播与直播平台以主办方当期公告为准。' },
  { question: '2026 赛季有哪些文化亮点？', answer: '联赛已发布 2026 专属吉祥物「苏嘟嘟」，并推出联赛主题曲《热烈盛开》。十三城主客场球衣融入城市符号，周边发售以官方商城信息为准。' },
  { question: '赛制怎么理解？有多少支球队？', answer: '联赛固定为江苏省 13 个设区市各一队，共 13 支球队。常规赛多为单循环主客场，前八名晋级淘汰赛。' },
  { question: '关于 VAR、U22 等政策怎么查？', answer: '此类条款属于竞赛规则范畴，请查阅江苏省足协公开发布的 2026 竞赛规程与通知，本站 FAQ 仅作导读。' },
  { question: '网上说的「比赛第一，友谊第十四」是什么？', answer: '这是苏超火爆出圈期间的球迷调侃梗，形容城市德比火药味十足，并非官方口号。文明观赛、尊重对手与裁判仍是赛场底线。' },
  { question: '首届苏超冠军是谁？对 2026 意味着什么？', answer: '2025 首届联赛决赛中，泰州队战胜南通队夺冠，决赛在南京奥体中心举行。2026 赛季各队将以新的积分与淘汰赛程再度冲击锦标。' },
];

async function main() {
  console.log('[seed] 清空旧数据...');
  await prisma.prediction.deleteMany();
  await prisma.discussion.deleteMany();
  await prisma.match.deleteMany();
  await prisma.team.deleteMany();
  await prisma.faq.deleteMany();

  console.log('[seed] 写入 13 支球队...');
  const teamMap = new Map();
  for (const t of teams) {
    const row = await prisma.team.create({
      data: {
        footballDataId: t.footballDataId,
        name: t.name,
        alias: t.alias,
        eloRating: t.eloRating,
        color: t.color,
        secondaryColor: t.secondaryColor,
      },
    });
    teamMap.set(t.footballDataId, row.id);
  }

  console.log('[seed] 写入历史战绩...');
  for (const m of pastMatches) {
    await prisma.match.create({
      data: {
        footballDataId: m.id,
        competition: '2026 江苏省城市足球联赛',
        matchday: m.matchday,
        status: 'FINISHED',
        utcDate: m.date,
        homeTeamId: teamMap.get(m.home),
        awayTeamId: teamMap.get(m.away),
        homeScore: m.homeScore,
        awayScore: m.awayScore,
        venue: m.venue,
        settled: true,
      },
    });
  }

  console.log('[seed] 写入未来赛程...');
  for (const m of futureSchedule) {
    await prisma.match.create({
      data: {
        footballDataId: m.id,
        competition: '2026 江苏省城市足球联赛',
        matchday: m.matchday,
        status: 'SCHEDULED',
        utcDate: m.date,
        homeTeamId: teamMap.get(m.home),
        awayTeamId: teamMap.get(m.away),
        venue: m.venue,
      },
    });
  }

  console.log('[seed] 写入 FAQ...');
  for (let i = 0; i < faqs.length; i++) {
    await prisma.faq.create({
      data: { ...faqs[i], order: i },
    });
  }

  console.log('[seed] 完成：13 支球队 + 30 场历史战绩 + 25 场未来赛程 + 7 条 FAQ。');
}

main()
  .catch((e) => {
    console.error('[seed] 失败:', e);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
