import type { AiGraphMetadataRepository } from '../../domain/repositories/ai-graph-metadata.repository.interface';
import type { AiGraphBuildRecord } from '../../domain/types/ai-knowledge-graph.types';

export class LocalStorageAiGraphMetadataRepository implements AiGraphMetadataRepository {
  private readonly storageKey = 'mdnote-ai-graph-build-records';

  async saveRecord(record: AiGraphBuildRecord): Promise<void> {
    const records = this.getAllRecords();
    records[record.docId] = record;

    try {
      localStorage.setItem(this.storageKey, JSON.stringify(records));
    } catch (error) {
      console.error('Error saving AI graph build record to localStorage:', error);
      throw new Error('Failed to save AI graph build record to local storage');
    }
  }

  async getRecord(docId: string): Promise<AiGraphBuildRecord | null> {
    const records = this.getAllRecords();
    return records[docId] ?? null;
  }

  private getAllRecords(): Record<string, AiGraphBuildRecord> {
    try {
      const stored = localStorage.getItem(this.storageKey);
      if (!stored) {
        return {};
      }

      const parsed = JSON.parse(stored);
      return parsed && typeof parsed === 'object' && !Array.isArray(parsed)
        ? parsed as Record<string, AiGraphBuildRecord>
        : {};
    } catch (error) {
      console.error('Error loading AI graph build records from localStorage:', error);
      return {};
    }
  }
}
