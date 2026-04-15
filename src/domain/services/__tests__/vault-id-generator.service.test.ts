import { describe, it, expect } from 'vitest';
import { VaultIdGenerator } from '../vault-id-generator.service';

describe('VaultIdGenerator', () => {
  it('should generate a valid ID', () => {
    const id = VaultIdGenerator.generate();

    expect(id.value).toBeDefined();
    expect(typeof id.value).toBe('string');
    expect(VaultIdGenerator.isValid(id.value)).toBe(true);
  });

  it('should generate ID with correct format', () => {
    const id = VaultIdGenerator.generate();
    const pattern = /^vault-\d{8}-[a-z0-9]{6}$/;

    expect(pattern.test(id.value)).toBe(true);
  });

  it('should generate unique IDs', () => {
    const ids = new Set<string>();
    for (let i = 0; i < 100; i++) {
      const id = VaultIdGenerator.generate();
      ids.add(id.value);
    }

    expect(ids.size).toBe(100);
  });

  it('should include current date in ID', () => {
    const id = VaultIdGenerator.generate();
    const now = new Date();
    const dateStr = now.toISOString().slice(0, 10).replace(/-/g, '');

    expect(id.value).toContain(dateStr);
  });

  it('should validate correct ID format', () => {
    expect(VaultIdGenerator.isValid('vault-20260312-abc123')).toBe(true);
    expect(VaultIdGenerator.isValid('vault-20250101-xyz789')).toBe(true);
  });

  it('should reject invalid ID formats', () => {
    expect(VaultIdGenerator.isValid('invalid-id')).toBe(false);
    expect(VaultIdGenerator.isValid('vault-20260312')).toBe(false);
    expect(VaultIdGenerator.isValid('vault-20260312-abc')).toBe(false);
    expect(VaultIdGenerator.isValid('vault-20260312-abc12345')).toBe(false);
    expect(VaultIdGenerator.isValid('Vault-20260312-abc123')).toBe(false);
    expect(VaultIdGenerator.isValid('')).toBe(false);
  });
});
