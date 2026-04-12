import type OpenAI from 'openai';
import type {
  AiGraphExtractedEntity,
  AiGraphExtractedRelation,
  AiGraphExtractor,
  AiGraphExtractionResult
} from '../../domain/services/ai-graph-extractor.interface';
import type { AiGraphProviderConfig } from '../../domain/types/ai-knowledge-graph.types';
import { createOpenAICompatibleClient } from './openai-compatible-provider.factory';

const JSON_SYSTEM_PROMPT = [
  'You are an AI knowledge graph extractor.',
  'Return valid JSON only.',
  'The JSON object must contain "entities" and "relations" arrays.',
  'Each entity must include "name" and "type".',
  'Each relation must include "source", "target", and "type".',
  'Do not include markdown fences or any non-JSON text.'
].join(' ');

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function readString(value: unknown): string | undefined {
  if (typeof value !== 'string') {
    return undefined;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

function readMetadata(value: unknown): Record<string, unknown> | undefined {
  return isRecord(value) ? value : undefined;
}

function normalizeEntities(value: unknown): AiGraphExtractedEntity[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.flatMap(item => {
    if (!isRecord(item)) {
      return [];
    }

    const name = readString(item.name) ?? readString(item.entity);
    const type = readString(item.type) ?? readString(item.entityType) ?? readString(item.category);

    if (!name || !type) {
      return [];
    }

    return [{
      name,
      type,
      description: readString(item.description),
      metadata: readMetadata(item.metadata)
    }];
  });
}

function normalizeRelations(value: unknown): AiGraphExtractedRelation[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.flatMap(item => {
    if (!isRecord(item)) {
      return [];
    }

    const source = readString(item.source) ?? readString(item.from);
    const target = readString(item.target) ?? readString(item.to);
    const type = readString(item.type) ?? readString(item.relation) ?? readString(item.name);

    if (!source || !target || !type) {
      return [];
    }

    return [{
      source,
      target,
      type,
      name: type,
      description: readString(item.description),
      metadata: readMetadata(item.metadata)
    }];
  });
}

function parseExtractionResult(content: string): AiGraphExtractionResult {
  const parsed = JSON.parse(content) as unknown;

  if (!isRecord(parsed)) {
    throw new Error('AI provider did not return a JSON object.');
  }

  const entities = normalizeEntities(parsed.entities ?? parsed.nodes);
  const relations = normalizeRelations(parsed.relations ?? parsed.relationships ?? parsed.edges);

  return { entities, relations };
}

export class OpenAICompatibleExtractor implements AiGraphExtractor {
  private readonly client: OpenAI;

  constructor(
    private readonly config: AiGraphProviderConfig,
    client?: OpenAI
  ) {
    this.client = client ?? createOpenAICompatibleClient(config);
  }

  async extractEntitiesAndRelations(markdown: string): Promise<AiGraphExtractionResult> {
    const response = await this.client.chat.completions.create({
      model: this.config.model,
      temperature: this.config.temperature,
      max_tokens: this.config.maxTokens,
      response_format: { type: 'json_object' },
      messages: [
        {
          role: 'system',
          content: JSON_SYSTEM_PROMPT
        },
        {
          role: 'user',
          content: [
            'Extract the key entities and relations from the following Markdown.',
            'Return JSON only.',
            'Markdown:',
            markdown
          ].join('\n\n')
        }
      ]
    });

    const content = response.choices[0]?.message?.content;
    if (typeof content !== 'string' || content.trim().length === 0) {
      throw new Error('AI provider returned an empty JSON response.');
    }

    return parseExtractionResult(content);
  }
}
