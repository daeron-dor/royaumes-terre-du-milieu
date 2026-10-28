import assert from 'node:assert/strict';
import test from 'node:test';
import { publicRequest, PROFILE_KEY } from './realm/public-api.ts';

test('public views switch without credentials and retain command headers', async () => {
  const originalFetch = globalThis.fetch;
  const originalStorage = Object.getOwnPropertyDescriptor(globalThis, 'sessionStorage');
  let profile: string | null = null;
  Object.defineProperty(globalThis, 'sessionStorage', {
    configurable: true,
    value: {
      getItem: (key: string) => (key === PROFILE_KEY ? profile : null),
    },
  });
  const selected: (string | null)[] = [];
  globalThis.fetch = async (_url, options) => {
    const headers = new Headers(options?.headers);
    selected.push(headers.get('X-Realm-Profile'));
    assert.equal(headers.get('Authorization'), null);
    if (options?.method === 'POST') assert.equal(headers.get('Content-Type'), 'application/json');
    return new Response('{}');
  };
  try {
    await publicRequest('/api/game');
    profile = 'gm';
    await publicRequest('/api/accounts');
    profile = 'player';
    await publicRequest('/api/game', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: '{}',
    });
    assert.deepEqual(selected, [null, 'gm', 'player']);
  } finally {
    globalThis.fetch = originalFetch;
    if (originalStorage) Object.defineProperty(globalThis, 'sessionStorage', originalStorage);
    else Reflect.deleteProperty(globalThis, 'sessionStorage');
  }
});
