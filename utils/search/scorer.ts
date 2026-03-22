import { CompanyRecord } from '@/types/company';
import { Token, RangeOperator } from '@/types/search';

export function scoreCompany(record: CompanyRecord, tokens: Token[]): number {
  let total = 0;

  for (const token of tokens) {
    const tokenScore = scoreToken(record, token);
    if (tokenScore === 0) return 0;
    total += tokenScore;
  }

  return total;
}

function scoreToken(record: CompanyRecord, token: Token): number {
  switch (token.type) {
    case 'exact_match':
      return scoreExactMatch(record, token.value);
    case 'free_text':
      return scoreFreeText(record, token.value);
    case 'field_match':
      return scoreFieldMatch(record, token.field, token.value);
    case 'range_query':
      return scoreRangeQuery(record, token.field, token.operator, token.value);
  }
}

function getSearchableFields(record: CompanyRecord): string[] {
  const fields = [
    record.name,
    record.industry,
    record.country,
    record.ceo_name,
    record.headquarters,
    record.company_type,
    record.size,
    String(record.founded_year),
  ];

  if (record.stock_info) {
    fields.push(record.stock_info.ticker, record.stock_info.exchange);
  }

  return fields;
}

function scoreExactMatch(record: CompanyRecord, phrase: string): number {
  const lower = phrase.toLowerCase();
  const fields = getSearchableFields(record);

  for (const field of fields) {
    if (field.toLowerCase().includes(lower)) {
      return 100;
    }
  }

  return 0;
}

function scoreFreeText(record: CompanyRecord, term: string): number {
  const lower = term.toLowerCase();
  const fields = getSearchableFields(record);
  let best = 0;

  for (const field of fields) {
    const fieldLower = field.toLowerCase();

    if (fieldLower === lower) return 100;

    if (fieldLower.startsWith(lower)) {
      best = Math.max(best, 75);
      if (best >= 75) continue;
    }

    const words = fieldLower.split(/[\s,]+/);
    if (best < 70 && words.some((w) => w.startsWith(lower))) {
      best = 70;
      continue;
    }

    if (best < 50 && fieldLower.includes(lower)) {
      best = 50;
      continue;
    }

    if (best < 25 && lower.length >= 3 && lower.length <= 12) {
      const maxDist = lower.length <= 5 ? 1 : 2;
      for (const word of words) {
        if (Math.abs(word.length - lower.length) > maxDist) continue;
        if (levenshtein(word, lower) <= maxDist) {
          best = 25;
          break;
        }
      }
    }
  }

  return best;
}

function getFieldValue(record: CompanyRecord, field: string): string | number | null {
  const latestFinancial = record.financials[0] ?? null;

  switch (field) {
    case 'name':
      return record.name;
    case 'country':
      return record.country;
    case 'industry':
      return record.industry;
    case 'founded_year':
      return record.founded_year;
    case 'company_type':
      return record.company_type;
    case 'size':
      return record.size;
    case 'ceo_name':
      return record.ceo_name;
    case 'headquarters':
      return record.headquarters;
    case 'revenue':
      return latestFinancial?.revenue ?? null;
    case 'net_income':
      return latestFinancial?.net_income ?? null;
    case 'ticker':
      return record.stock_info?.ticker ?? null;
    default:
      return null;
  }
}

function scoreFieldMatch(record: CompanyRecord, field: string, value: string): number {
  const fieldValue = getFieldValue(record, field);
  if (fieldValue === null) return 0;

  const fieldStr = String(fieldValue).toLowerCase();
  const valueStr = value.toLowerCase();

  if (fieldStr === valueStr) return 80;
  if (fieldStr.includes(valueStr)) return 60;

  return 0;
}

function scoreRangeQuery(
  record: CompanyRecord,
  field: string,
  operator: RangeOperator,
  value: number
): number {
  const fieldValue = getFieldValue(record, field);
  if (fieldValue === null) return 0;

  const num = typeof fieldValue === 'number' ? fieldValue : Number(fieldValue);
  if (Number.isNaN(num)) return 0;

  return compareNumeric(num, operator, value) ? 80 : 0;
}

function compareNumeric(actual: number, operator: RangeOperator, target: number): boolean {
  switch (operator) {
    case '>':
      return actual > target;
    case '<':
      return actual < target;
    case '>=':
      return actual >= target;
    case '<=':
      return actual <= target;
  }
}

export function levenshtein(a: string, b: string): number {
  const m = a.length;
  const n = b.length;

  if (m === 0) return n;
  if (n === 0) return m;
  if (a === b) return 0;

  if (m < n) return levenshtein(b, a);

  let prev = Array.from({ length: n + 1 }, (_, i) => i);
  let curr = new Array<number>(n + 1);

  for (let i = 1; i <= m; i++) {
    curr[0] = i;
    for (let j = 1; j <= n; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      curr[j] = Math.min(
        prev[j] + 1,
        curr[j - 1] + 1,
        prev[j - 1] + cost
      );
    }
    [prev, curr] = [curr, prev];
  }

  return prev[n];
}
