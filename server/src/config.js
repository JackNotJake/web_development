// config.js — 运行时配置加载
// JWT_SECRET 优先从环境读取;开发环境回退到固定密钥并告警(生产必须注入)。

/**
 * 获取 JWT 签名密钥。
 * 优先使用 process.env.JWT_SECRET;未设置时回退到开发密钥并打印告警。
 * @returns {string} JWT 密钥
 */
export function getJwtSecret() {
  if (process.env.JWT_SECRET) {
    return process.env.JWT_SECRET;
  }
  console.warn(
    '[config] JWT_SECRET 未设置,使用开发回退密钥。切勿在生产环境使用。'
  );
  return 'dev-secret-change-in-prod';
}

export const PORT = process.env.PORT || 3000;
