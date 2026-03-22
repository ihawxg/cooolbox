export type SortField =
  | 'relevance'
  | 'name'
  | 'revenue'
  | 'founded_year'
  | 'company_type'
  | 'size'
  | 'country'
  | 'net_income';

export type SortDirection = 'asc' | 'desc';

export interface SortConfig {
  field: SortField;
  direction: SortDirection;
}

export interface FilterState {
  industries: string[];
  revenueRange: [number, number];
  sizes: string[];
  companyType: string | null;
}

export const SORT_LABELS: Record<SortField, string> = {
  relevance: 'Relevance',
  name: 'Name',
  revenue: 'Revenue',
  founded_year: 'Founded',
  company_type: 'Type',
  size: 'Size',
  country: 'Country',
  net_income: 'Net Income',
};

export const SORT_FIELDS: SortField[] = [
  'relevance', 'name', 'revenue', 'founded_year', 'size', 'country', 'company_type', 'net_income',
];
