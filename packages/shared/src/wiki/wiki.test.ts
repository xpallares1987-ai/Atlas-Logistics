import { describe, it, expect } from "vitest";
import { WikiService } from "./wiki.service.js";
import { WIKI_ARTICLES, GLOSSARY_TERMS } from "./wiki.data.js";

describe("WikiService & In-App Knowledge Base", () => {
  it("should return all articles with valid properties", () => {
    const articles = WikiService.getAllArticles();
    expect(articles.length).toBeGreaterThanOrEqual(7);
    for (const a of articles) {
      expect(a.id).toBeTruthy();
      expect(a.slug).toBeTruthy();
      expect(a.title).toBeTruthy();
      expect(a.contentMarkdown).toBeTruthy();
      expect(a.category).toBeTruthy();
      expect(a.readingTimeMinutes).toBeGreaterThan(0);
    }
  });

  it("should find article by slug", () => {
    const article = WikiService.getArticleBySlug(
      "corredor-oficial-customer01-normativa",
    );
    expect(article).toBeDefined();
    expect(article?.title).toContain("Corredor Oficial");
    expect(article?.category).toBe("GOVERNANCE_CORREDOR");
  });

  it("should compute category counts properly", () => {
    const categories = WikiService.getCategories();
    expect(categories.length).toBeGreaterThan(0);
    const corredorCat = categories.find((c) => c.id === "GOVERNANCE_CORREDOR");
    expect(corredorCat).toBeDefined();
    expect(corredorCat?.articleCount).toBeGreaterThan(0);
  });

  it("should perform search by query", () => {
    const results = WikiService.search("26.500");
    expect(results.length).toBeGreaterThan(0);
    const topResult = results[0];
    expect(topResult.article.slug).toBe(
      "corredor-oficial-customer01-normativa",
    );
  });

  it("should search for customs DUA terms", () => {
    const results = WikiService.search("Casilla 46");
    expect(results.length).toBeGreaterThan(0);
    expect(
      results.some((r) => r.article.slug === "guia-casillas-dua-sad-54"),
    ).toBe(true);
  });

  it("should search for IATA Modulo-7", () => {
    const results = WikiService.search("Modulo-7");
    expect(results.length).toBeGreaterThan(0);
    expect(
      results.some(
        (r) => r.article.slug === "iata-modulo-7-peso-tasable-volumetrico",
      ),
    ).toBe(true);
  });

  it("should filter glossary terms", () => {
    const all = WikiService.getGlossary();
    expect(all.length).toBe(GLOSSARY_TERMS.length);

    const degResults = WikiService.getGlossary("DEG");
    expect(degResults.length).toBeGreaterThan(0);
    expect(degResults[0].term).toContain("DEG");
  });

  it("should get related articles", () => {
    const related = WikiService.getRelatedArticles(
      "art-customer01-corredor-oficial",
      2,
    );
    expect(related.length).toBeLessThanOrEqual(2);
  });
});
