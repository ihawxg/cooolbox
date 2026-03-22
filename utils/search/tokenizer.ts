import { Token, RangeOperator } from '@/types/search';

const RANGE_OPERATORS: RangeOperator[] = ['>=', '<=', '>', '<'];

const KNOWN_FIELDS = new Set([
  'name',
  'country',
  'industry',
  'founded_year',
  'company_type',
  'size',
  'ceo_name',
  'headquarters',
  'revenue',
  'net_income',
  'ticker',
]);

export function tokenize(input: string): Token[] {
  const trimmed = input.trim();
  if (!trimmed) return [];

  const tokens: Token[] = [];
  const segments = splitPreservingQuotes(trimmed);

  for (const segment of segments) {
    const token = parseSegment(segment);
    if (token) tokens.push(token);
  }

  return tokens;
}

function splitPreservingQuotes(input: string): string[] {
  const segments: string[] = [];
  let current = '';
  let inQuote = false;

  for (const char of input) {
    if (char === '"') {
      if (inQuote) {
        current += '"';
        segments.push(current);
        current = '';
        inQuote = false;
      } else {
        if (current.trim()) {
          segments.push(current.trim());
        }
        current = '"';
        inQuote = true;
      }
    } else if (char === ' ' && !inQuote) {
      if (current.trim()) {
        segments.push(current.trim());
      }
      current = '';
    } else {
      current += char;
    }
  }

  if (current.trim()) {
    if (inQuote) {
      const text = current.replace(/^"/, '').trim();
      if (text) segments.push(text);
    } else {
      segments.push(current.trim());
    }
  }

  return segments;
}

function parseSegment(segment: string): Token | null {
  if (segment.startsWith('"') && segment.endsWith('"') && segment.length > 2) {
    const value = segment.slice(1, -1);
    if (!value.trim()) return null;
    return { type: 'exact_match', value };
  }

  for (const op of RANGE_OPERATORS) {
    const idx = segment.indexOf(op);
    if (idx > 0) {
      const field = segment.slice(0, idx).toLowerCase();
      const rawValue = segment.slice(idx + op.length);
      const numValue = Number(rawValue);

      if (KNOWN_FIELDS.has(field) && !Number.isNaN(numValue) && rawValue !== '') {
        return { type: 'range_query', field, operator: op, value: numValue };
      }
    }
  }

  const colonIdx = segment.indexOf(':');
  if (colonIdx > 0 && colonIdx < segment.length - 1) {
    const field = segment.slice(0, colonIdx).toLowerCase();
    const value = segment.slice(colonIdx + 1);

    if (KNOWN_FIELDS.has(field)) {
      return { type: 'field_match', field, value };
    }
  }

  return { type: 'free_text', value: segment };
}
