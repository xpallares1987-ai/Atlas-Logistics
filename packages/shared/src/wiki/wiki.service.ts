/**
 * @file wiki.service.ts
 * @description Search and query services for Atlas Logistics In-App Wiki & Knowledge Hub.
 */

import {
  WIKI_ARTICLES,
  WIKI_CATEGORIES_META,
  GLOSSARY_TERMS,
} from "./wiki.data.js";
import {
  WikiArticle,
  WikiCategory,
  WikiCategoryMeta,
  WikiSearchResult,
  GlossaryTerm,
} from "./wiki.types.js";

export class WikiService {
  /**
   * Returns all available Wiki articles
   */
  public static getAllArticles(): WikiArticle[] {
    return WIKI_ARTICLES;
  }

  /**
   * Retrieves an article by its URL slug
   */
  public static getArticleBySlug(slug: string): WikiArticle | undefined {
    return WIKI_ARTICLES.find((a) => a.slug === slug || a.id === slug);
  }

  /**
   * Returns all categories with active article counts
   */
  public static getCategories(): Array<
    WikiCategoryMeta & { articleCount: number }
  > {
    return WIKI_CATEGORIES_META.map((cat) => ({
      ...cat,
      articleCount: WIKI_ARTICLES.filter((a) => a.category === cat.id).length,
    }));
  }

  /**
   * Performs fuzzy multi-field search across titles, summaries, tags, and content
   */
  public static search(
    query: string,
    categoryFilter?: WikiCategory | "ALL",
  ): WikiSearchResult[] {
    const trimmed = query.trim().toLowerCase();
    let pool = WIKI_ARTICLES;

    if (categoryFilter && categoryFilter !== "ALL") {
      pool = pool.filter((a) => a.category === categoryFilter);
    }

    if (!trimmed) {
      return pool.map((article) => ({
        article,
        matchedField: "title",
        snippet: article.summary,
        score: 1,
      }));
    }

    const results: WikiSearchResult[] = [];

    for (const article of pool) {
      let score = 0;
      let matchedField: "title" | "summary" | "content" | "tags" = "summary";
      let snippet = article.summary;

      const titleLower = article.title.toLowerCase();
      const summaryLower = article.summary.toLowerCase();
      const tagsJoined = article.tags.join(" ").toLowerCase();
      const contentLower = article.contentMarkdown.toLowerCase();

      if (titleLower.includes(trimmed)) {
        score += 100;
        matchedField = "title";
        snippet = article.title;
      } else if (tagsJoined.includes(trimmed)) {
        score += 60;
        matchedField = "tags";
        snippet = `Tags: ${article.tags.filter((t) => t.toLowerCase().includes(trimmed)).join(", ")}`;
      } else if (summaryLower.includes(trimmed)) {
        score += 40;
        matchedField = "summary";
        snippet = article.summary;
      } else if (contentLower.includes(trimmed)) {
        score += 20;
        matchedField = "content";
        const idx = contentLower.indexOf(trimmed);
        const start = Math.max(0, idx - 40);
        const end = Math.min(contentLower.length, idx + trimmed.length + 60);
        snippet = `...${article.contentMarkdown.substring(start, end).replace(/\n/g, " ")}...`;
      }

      if (score > 0) {
        results.push({
          article,
          matchedField,
          snippet,
          score,
        });
      }
    }

    return results.sort((a, b) => b.score - a.score);
  }

  /**
   * Returns related articles within the same category or sharing tags
   */
  public static getRelatedArticles(
    articleId: string,
    limit: number = 3,
  ): WikiArticle[] {
    const current = WIKI_ARTICLES.find(
      (a) => a.id === articleId || a.slug === articleId,
    );
    if (!current) return [];

    return WIKI_ARTICLES.filter((a) => a.id !== current.id)
      .map((a) => {
        let affinity = 0;
        if (a.category === current.category) affinity += 5;
        const sharedTags = a.tags.filter((t) =>
          current.tags.includes(t),
        ).length;
        affinity += sharedTags * 2;
        return { article: a, affinity };
      })
      .sort((a, b) => b.affinity - a.affinity)
      .slice(0, limit)
      .map((item) => item.article);
  }

  /**
   * Returns all glossary terms, optionally filtered by keyword
   */
  public static getGlossary(searchTerm?: string): GlossaryTerm[] {
    if (!searchTerm || !searchTerm.trim()) {
      return GLOSSARY_TERMS.sort((a, b) => a.term.localeCompare(b.term));
    }
    const q = searchTerm.trim().toLowerCase();
    return GLOSSARY_TERMS.filter(
      (t) =>
        t.term.toLowerCase().includes(q) ||
        (t.acronym && t.acronym.toLowerCase().includes(q)) ||
        t.definition.toLowerCase().includes(q) ||
        t.category.toLowerCase().includes(q),
    ).sort((a, b) => a.term.localeCompare(b.term));
  }
}
