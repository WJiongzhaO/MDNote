import type { VaultPath, ValidationResult } from '../types/vault.types';

export class VaultPathValidator {
  private isValidWindowsPath(path: string): boolean {
    return /^[a-zA-Z]:[/\\]/.test(path) || /^\\\\/.test(path);
  }

  private hasInvalidCharsInPath(path: string): boolean {
    if (this.isValidWindowsPath(path)) {
      const pathWithoutDrive = path.replace(/^[a-zA-Z]:/, '');
      const invalidChars = /[<>:"|?*]/;
      return invalidChars.test(pathWithoutDrive);
    }
    
    const invalidChars = /[<>:"|?*]/;
    return invalidChars.test(path);
  }

  validate(path: VaultPath): ValidationResult {
    const errors: string[] = [];

    if (!path.value || path.value.trim() === '') {
      errors.push('路径不能为空');
    }

    if (path.value.length > 260) {
      errors.push('路径长度不能超过260个字符');
    }

    if (this.hasInvalidCharsInPath(path.value)) {
      errors.push('路径包含无效字符');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  validateName(name: string): ValidationResult {
    const errors: string[] = [];

    if (!name || name.trim() === '') {
      errors.push('名称不能为空');
    }

    if (name.length > 100) {
      errors.push('名称长度不能超过100个字符');
    }

    const invalidNameChars = /[<>:"/\\|?*]/;
    if (invalidNameChars.test(name)) {
      errors.push('名称包含无效字符');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  validateDescription(description: string): ValidationResult {
    const errors: string[] = [];

    if (description && description.length > 500) {
      errors.push('描述长度不能超过500个字符');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }
}
