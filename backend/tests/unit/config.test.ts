import { describe, expect, it } from 'vitest';
import { loadConfig } from '../../src/config';

describe('production configuration', () => {
  it('fails fast when production secrets are missing', () => {
    expect(() => loadConfig({ NODE_ENV: 'production' })).toThrow(/DATABASE_URL.*JWT_SECRET/);
  });

  it('accepts explicit production settings and multiple CORS origins', () => {
    const config = loadConfig({
      NODE_ENV: 'production',
      DATABASE_URL: 'postgresql://db/smop',
      JWT_SECRET: 'a-secure-secret-that-is-at-least-32-characters',
      CORS_ORIGIN: 'https://one.example, https://two.example',
    });

    expect(config.cors.origins).toEqual(['https://one.example', 'https://two.example']);
  });
});
