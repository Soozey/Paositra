export interface TransactionReferenceParts {
  lot: string;
  module: string;
  type: string;
  entity: string;
  sequence: number;
  occurredAt?: Date;
}

export interface TransactionReferenceFormat {
  separator?: string;
  sequenceLength?: number;
}

function normalizeSegment(value: string) {
  const normalized = value
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

  if (!normalized) {
    throw new Error("Transaction reference segments must not be empty.");
  }

  return normalized;
}

function formatTimestamp(date: Date) {
  const year = date.getUTCFullYear().toString().padStart(4, "0");
  const month = (date.getUTCMonth() + 1).toString().padStart(2, "0");
  const day = date.getUTCDate().toString().padStart(2, "0");
  const hour = date.getUTCHours().toString().padStart(2, "0");
  const minute = date.getUTCMinutes().toString().padStart(2, "0");
  const second = date.getUTCSeconds().toString().padStart(2, "0");
  return `${year}${month}${day}${hour}${minute}${second}`;
}

export function buildTransactionReference(
  parts: TransactionReferenceParts,
  format: TransactionReferenceFormat = {}
) {
  if (!Number.isInteger(parts.sequence) || parts.sequence < 1) {
    throw new Error("Transaction reference sequence must be a positive integer.");
  }

  const separator = format.separator ?? "-";
  const sequenceLength = format.sequenceLength ?? 6;
  const occurredAt = parts.occurredAt ?? new Date();

  return [
    normalizeSegment(parts.lot),
    normalizeSegment(parts.module),
    normalizeSegment(parts.type),
    formatTimestamp(occurredAt),
    normalizeSegment(parts.entity),
    parts.sequence.toString().padStart(sequenceLength, "0")
  ].join(separator);
}
