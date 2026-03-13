import type { VaultId } from '../types/vault.types';

export class VaultIdGenerator {
  static generate(): VaultId {
    const date = new Date();
    const dateStr = date.toISOString().slice(0, 10).replace(/-/g, '');
    const random = Math.random().toString(36).substring(2, 8);
    return { value: `vault-${dateStr}-${random}` };
  }

  static isValid(id: string): boolean {
    const pattern = /^vault-\d{8}-[a-z0-9]{6}$/;
    return pattern.test(id);
  }
}
