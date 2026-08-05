import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockStore = {};
vi.mock('keytar', () => ({
  default: {
    setPassword: vi.fn(async (service, account, password) => { mockStore[account] = password; return true; }),
    getPassword: vi.fn(async (service, account) => mockStore[account] ?? null),
    deletePassword: vi.fn(async (service, account) => { const had = account in mockStore; delete mockStore[account]; return had; }),
  },
}));

import { setCredential, getCredential, hasCredential, clearCredential, maskStatus, SERVICE_NAME } from '../../src/services/credentialService.js';

describe('credentialService', () => {
  beforeEach(() => { for (const k of Object.keys(mockStore)) delete mockStore[k]; });

  it('setCredential + getCredential 往返', async () => {
    await setCredential('FOOTBALL_DATA_TOKEN', 'secret-xyz');
    expect(await getCredential('FOOTBALL_DATA_TOKEN')).toBe('secret-xyz');
  });
  it('hasCredential: 未设置返回 false,设置后 true', async () => {
    expect(await hasCredential('MISSING')).toBe(false);
    await setCredential('JWT_SECRET', 's');
    expect(await hasCredential('JWT_SECRET')).toBe(true);
  });
  it('clearCredential: 清除后 hasCredential 变 false', async () => {
    await setCredential('FOOTBALL_DATA_TOKEN', 't');
    expect(await clearCredential('FOOTBALL_DATA_TOKEN')).toBe(true);
    expect(await hasCredential('FOOTBALL_DATA_TOKEN')).toBe(false);
  });
  it('maskStatus: 不回显明文,只显示 set/unset', async () => {
    await setCredential('FOOTBALL_DATA_TOKEN', 'very-secret-value');
    const status = await maskStatus(['FOOTBALL_DATA_TOKEN', 'MISSING_ONE']);
    expect(status).toContain('set');
    expect(status).toContain('unset');
    expect(status).not.toContain('very-secret-value');
    // 返回结构化数组也行,只要不含明文
  });
  it('getCredential 未设置返回 null', async () => {
    expect(await getCredential('NOT_SET')).toBe(null);
  });
});
