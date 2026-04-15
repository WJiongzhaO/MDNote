import { describe, it, expect } from 'vitest';
import { VaultPathValidator } from '../vault-path-validator.service';

describe('VaultPathValidator', () => {
  const validator = new VaultPathValidator();

  describe('validate', () => {
    it('should validate a correct path', () => {
      const result = validator.validate({ value: '/valid/path/to/vault' });

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should validate a Windows path with drive letter', () => {
      const result = validator.validate({ value: 'C:\\Users\\test\\vault' });

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should validate a Windows path with forward slashes', () => {
      const result = validator.validate({ value: 'D:/Users/test/vault' });

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should validate a UNC path', () => {
      const result = validator.validate({ value: '\\\\server\\share\\vault' });

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should reject empty path', () => {
      const result = validator.validate({ value: '' });

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('路径不能为空');
    });

    it('should reject whitespace-only path', () => {
      const result = validator.validate({ value: '   ' });

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('路径不能为空');
    });

    it('should reject path with invalid characters', () => {
      const result = validator.validate({ value: '/path/with<invalid>/chars' });

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('路径包含无效字符');
    });

    it('should reject Windows path with invalid characters after drive letter', () => {
      const result = validator.validate({ value: 'C:\\path\\with<invalid>\\chars' });

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('路径包含无效字符');
    });

    it('should reject path longer than 260 characters', () => {
      const longPath = '/a'.repeat(150);
      const result = validator.validate({ value: longPath });

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('路径长度不能超过260个字符');
    });
  });

  describe('validateName', () => {
    it('should validate a correct name', () => {
      const result = validator.validateName('Valid Vault Name');

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should reject empty name', () => {
      const result = validator.validateName('');

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('名称不能为空');
    });

    it('should reject whitespace-only name', () => {
      const result = validator.validateName('   ');

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('名称不能为空');
    });

    it('should reject name longer than 100 characters', () => {
      const longName = 'a'.repeat(101);
      const result = validator.validateName(longName);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('名称长度不能超过100个字符');
    });

    it('should reject name with invalid characters', () => {
      const result = validator.validateName('Invalid<Name>');

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('名称包含无效字符');
    });

    it('should accept name with 100 characters', () => {
      const name = 'a'.repeat(100);
      const result = validator.validateName(name);

      expect(result.isValid).toBe(true);
    });
  });

  describe('validateDescription', () => {
    it('should validate a correct description', () => {
      const result = validator.validateDescription('Valid description');

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should allow empty description', () => {
      const result = validator.validateDescription('');

      expect(result.isValid).toBe(true);
    });

    it('should reject description longer than 500 characters', () => {
      const longDesc = 'a'.repeat(501);
      const result = validator.validateDescription(longDesc);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('描述长度不能超过500个字符');
    });

    it('should accept description with 500 characters', () => {
      const desc = 'a'.repeat(500);
      const result = validator.validateDescription(desc);

      expect(result.isValid).toBe(true);
    });
  });
});
