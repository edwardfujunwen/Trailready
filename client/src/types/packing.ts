export interface PackingItem {
  name: string;
  quantity: number;
  weightOz: number;
  priority: 'essential' | 'recommended' | 'optional';
  reiSearchTerm: string;
  priceRangeUsd?: string;
  notes?: string;
  checked?: boolean;
}

export interface PackingCategory {
  name: string;
  items: PackingItem[];
}

export interface PackingList {
  categories: PackingCategory[];
  generatedAt: string;
  tripSummary: string;
}
