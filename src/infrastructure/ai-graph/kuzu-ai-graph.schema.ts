export const KUZU_SCHEMA_STATEMENTS = [
  'CREATE NODE TABLE IF NOT EXISTS Document(docId STRING PRIMARY KEY, title STRING, contentHash STRING, updatedAt STRING);',
  'CREATE NODE TABLE IF NOT EXISTS Entity(entityId STRING PRIMARY KEY, name STRING, normalizedName STRING, type STRING, description STRING, createdAt STRING, updatedAt STRING);',
  'CREATE REL TABLE IF NOT EXISTS MENTIONS(FROM Document TO Entity, sourceDocId STRING, sourceChunkId STRING, anchorJson STRING);',
  'CREATE REL TABLE IF NOT EXISTS RELATES(FROM Entity TO Entity, relationId STRING, relationType STRING, description STRING, sourceDocId STRING, sourceChunkId STRING);'
];
