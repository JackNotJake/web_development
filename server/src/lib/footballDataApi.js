import axios from 'axios';

const BASE = 'https://api.football-data.org/v4';
const CACHE_TTL = 60000; // 60s

// 内存缓存: key = competition:dateFrom:dateTo, value = { data, ts }
const cache = new Map();

/**
 * 清空缓存。
 */
export function clearCache() {
  cache.clear();
}

/**
 * 拉取某赛事的比赛列表。
 *
 * @param {string} competition 赛事代码,如 'PL'
 * @param {string} token Football-Data API token
 * @param {object} [opts]
 * @param {string} [opts.dateFrom] 起始日期(YYYY-MM-DD)
 * @param {string} [opts.dateTo] 截止日期(YYYY-MM-DD)
 * @returns {Promise<{matches: Array, competition: string}>}
 */
export async function fetchMatches(competition, token, { dateFrom, dateTo } = {}) {
  const cacheKey = `${competition}:${dateFrom}:${dateTo}`;

  // 命中且未过期 → 直接返回缓存
  const cached = cache.get(cacheKey);
  if (cached && Date.now() - cached.ts < CACHE_TTL) {
    return cached.data;
  }

  const url = `${BASE}/competitions/${competition}/matches`;
  try {
    const response = await axios.get(url, {
      headers: { 'X-Auth-Token': token },
      params: { dateFrom, dateTo },
    });
    // football-data 返回 { matches, ... };直接透传 response.data
    const data = response.data;
    cache.set(cacheKey, { data, ts: Date.now() });
    return data;
  } catch (err) {
    const status = err?.response?.status;
    if (status === 429) {
      throw new Error('Football-Data API rate limit exceeded (429). Please retry later.');
    }
    // 其他错误统一包装后抛出,保留原始上下文
    const msg = err?.response?.data?.message || err?.message || 'Unknown football-data API error';
    throw new Error(`Football-Data API request failed: ${msg}`);
  }
}

export default { fetchMatches, clearCache };
