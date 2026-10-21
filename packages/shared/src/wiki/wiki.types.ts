/**
 * @file wiki.types.ts
 * @description Types, categories, and article definitions for Atlas Logistics In-App Wiki & Knowledge Hub.
 */

export type WikiCategory =
  | "GOVERNANCE_CORREDOR"
  | "CUSTOMS_DUA"
  | "INCOTERMS_CONTRACTS"
  | "MARITIME_DEMURRAGE"
  | "AIR_CARGO_IATA"
  | "ROAD_CMR"
  | "GLOSSARY"
  | "ARCHITECTURE_ERP";

export interface WikiCategoryMeta {
  id: WikiCategory;
  name: string;
  shortDescription: string;
  icon: string;
  badgeColor: string;
}

export interface WikiArticle {
  id: string;
  slug: string;
  title: string;
  category: WikiCategory;
  tags: string[];
  summary: string;
  contentMarkdown: string;
  lastUpdated: string;
  readingTimeMinutes: number;
  author: string;
  officialRef?: string;
}

export interface WikiSearchResult {
  article: WikiArticle;
  matchedField: "title" | "summary" | "content" | "tags";
  snippet: string;
  score: number;
}

export interface GlossaryTerm {
  term: string;
  acronym?: string;
  category: string;
  definition: string;
  standardOrg?: string; // e.g. 'IATA', 'IMO', 'UNECE', 'AEAT', 'ICC'
  officialRule?: string;
}
