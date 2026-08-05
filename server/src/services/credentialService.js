// credentialService.js — 凭据安全服务(keytar → OS 钥匙串)
// SPEC §7: 凭据写入 Windows Credential Manager(开发机)/ Linux Secret Service(部署);
// 绝不硬编码 / 提交 Git / 写日志或终端 history / 明文配置。
// .env 仅开发来源(明文风险),生产用平台 secret 注入到运行时进程。

import keytar from 'keytar';

/**
 * keytar 服务名 —— OS 钥匙串中区分本应用的命名空间。
 * 所有凭据以此 service + account(name) 二元组存储。
 * @constant {string}
 */
export const SERVICE_NAME = 'football-app';

/**
 * 写入 / 更新凭据到 OS 钥匙串(覆盖式)。
 * 明文 value 仅在此调用短暂流经内存,不落盘、不记日志。
 * @param {string} name 凭据名(如 FOOTBALL_DATA_TOKEN、JWT_SECRET)
 * @param {string} value 凭据明文
 * @returns {Promise<boolean>} keytar.setPassword 结果
 */
export async function setCredential(name, value) {
  return keytar.setPassword(SERVICE_NAME, name, value);
}

/**
 * 读取凭据。
 * @param {string} name 凭据名
 * @returns {Promise<string|null>} 凭据值;未设置返回 null
 */
export async function getCredential(name) {
  return keytar.getPassword(SERVICE_NAME, name);
}

/**
 * 是否已设置凭据(不回显明文)。
 * @param {string} name 凭据名
 * @returns {Promise<boolean>}
 */
export async function hasCredential(name) {
  return (await getCredential(name)) !== null;
}

/**
 * 清除凭据。
 * @param {string} name 凭据名
 * @returns {Promise<boolean>} 是否曾存在并被删除(keytar.deletePassword 语义)
 */
export async function clearCredential(name) {
  return keytar.deletePassword(SERVICE_NAME, name);
}

/**
 * 批量返回凭据状态 —— 仅 set/unset,**绝不回显明文 value**。
 * 对应 SPEC §7 `key:status` 命令输出与“查看(不回显明文)”要求。
 *
 * 设计说明:返回多行字符串(每行 `NAME: set` / `NAME: unset`)。
 * 之所以返回字符串而非结构化数组,是因为调用方(TDD 测试契约)使用
 * `toContain('set')` / `toContain('unset')` 断言,该匹配器对数组按
 * “元素全等”检查、对字符串按“子串”检查;字符串形式才能让状态关键词
 * 同时成立,且天然不携带明文。如需结构化数据,可由调用方解析本输出,
 * 或后续扩展一个独立的 listStatus() 返回 [{name,set}]。
 *
 * @param {string[]} names 凭据名列表
 * @returns {Promise<string>} 多行状态文本,不含任何凭据明文
 */
export async function maskStatus(names) {
  const lines = [];
  for (const name of names) {
    const set = (await getCredential(name)) !== null;
    lines.push(`${name}: ${set ? 'set' : 'unset'}`);
  }
  return lines.join('\n');
}
