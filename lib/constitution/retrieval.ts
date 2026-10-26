import { prisma } from '@/lib/database/client';
import {
  FALLBACK_CONSTITUTIONAL_ARTICLES,
  FALLBACK_STATUTORY_RULES,
} from './statutoryData';

export interface ConstitutionalArticleResult {
  id: string;
  articleNumber: string;
  title: string;
  part: string;
  chapter: string | null;
  content: string;
  explanation: string | null;
  keyTopics: string[];
  crossReferences: string[];
  amendmentNotes: string | null;
}

export interface StatutoryRuleResult {
  id: string;
  statuteCode: string;
  statuteName: string;
  ruleNumber: string;
  title: string;
  category: string;
  content: string;
  courtType: string | null;
  notes: string | null;
  keyTopics: string[];
  crossReferences: string[];
}

export interface ConstitutionSearchResult {
  articles: ConstitutionalArticleResult[];
  rules: StatutoryRuleResult[];
  query: string;
  totalFound: number;
}

/**
 * Searches the PostgreSQL `constitutional_articles` table by article number, title,
 * content, explanation, or key topics. Gracefully falls back to high-fidelity embedded
 * statutory data if database connection is offline or starting up.
 */
export async function searchConstitutionalArticles(
  query: string,
  limit: number = 8
): Promise<ConstitutionalArticleResult[]> {
  const cleanQuery = query.trim().toLowerCase();
  const articleNumMatch = cleanQuery.match(/(?:art(?:icle)?\.?\s*)?([0-9]+[a-z]?)/i);
  const targetNumber = articleNumMatch ? articleNumMatch[1].toUpperCase() : null;

  try {
    if (!cleanQuery) {
      return (await prisma.constitutionalArticle.findMany({
        take: limit,
        orderBy: { articleNumber: 'asc' },
      })) as ConstitutionalArticleResult[];
    }

    const tokens = cleanQuery
      .replace(/[^\w\s]/g, ' ')
      .split(/\s+/)
      .filter((t) => t.length > 2);

    const whereConditions: any[] = [];

    if (targetNumber) {
      whereConditions.push({ articleNumber: { equals: targetNumber, mode: 'insensitive' } });
      whereConditions.push({ articleNumber: { startsWith: targetNumber, mode: 'insensitive' } });
    }

    whereConditions.push(
      { title: { contains: cleanQuery, mode: 'insensitive' } },
      { content: { contains: cleanQuery, mode: 'insensitive' } },
      { explanation: { contains: cleanQuery, mode: 'insensitive' } },
      { keyTopics: { hasSome: tokens } }
    );

    for (const token of tokens.slice(0, 3)) {
      whereConditions.push(
        { title: { contains: token, mode: 'insensitive' } },
        { content: { contains: token, mode: 'insensitive' } }
      );
    }

    const articles = await prisma.constitutionalArticle.findMany({
      where: {
        OR: whereConditions,
      },
      take: Math.max(limit * 2, 20),
    });

    articles.sort((a, b) => sortArticles(a, b, targetNumber, cleanQuery));
    return articles.slice(0, limit) as ConstitutionalArticleResult[];
  } catch (err) {
    // Database connection or table unavailable -> execute in-memory retrieval on comprehensive fallback repository
    return searchArticlesInMemory(cleanQuery, targetNumber, limit);
  }
}

function sortArticles(
  a: ConstitutionalArticleResult,
  b: ConstitutionalArticleResult,
  targetNumber: string | null,
  cleanQuery: string
): number {
  if (targetNumber) {
    if (a.articleNumber.toUpperCase() === targetNumber) return -1;
    if (b.articleNumber.toUpperCase() === targetNumber) return 1;
    if (a.articleNumber.toUpperCase().startsWith(targetNumber) && !b.articleNumber.toUpperCase().startsWith(targetNumber)) return -1;
    if (!a.articleNumber.toUpperCase().startsWith(targetNumber) && b.articleNumber.toUpperCase().startsWith(targetNumber)) return 1;
  }
  const aTitleMatch = a.title.toLowerCase().includes(cleanQuery);
  const bTitleMatch = b.title.toLowerCase().includes(cleanQuery);
  if (aTitleMatch && !bTitleMatch) return -1;
  if (!aTitleMatch && bTitleMatch) return 1;

  const numA = parseInt(a.articleNumber, 10) || 0;
  const numB = parseInt(b.articleNumber, 10) || 0;
  if (numA !== numB) return numA - numB;
  return a.articleNumber.localeCompare(b.articleNumber);
}

function searchArticlesInMemory(
  cleanQuery: string,
  targetNumber: string | null,
  limit: number
): ConstitutionalArticleResult[] {
  if (!cleanQuery) {
    return FALLBACK_CONSTITUTIONAL_ARTICLES.slice(0, limit);
  }

  const tokens = cleanQuery
    .replace(/[^\w\s]/g, ' ')
    .split(/\s+/)
    .filter((t) => t.length > 2);

  const matched = FALLBACK_CONSTITUTIONAL_ARTICLES.filter((art) => {
    if (targetNumber && (art.articleNumber.toUpperCase() === targetNumber || art.articleNumber.toUpperCase().startsWith(targetNumber))) {
      return true;
    }
    const titleLower = art.title.toLowerCase();
    const contentLower = art.content.toLowerCase();
    const expLower = (art.explanation || '').toLowerCase();

    if (titleLower.includes(cleanQuery) || contentLower.includes(cleanQuery) || expLower.includes(cleanQuery)) {
      return true;
    }

    return tokens.some(
      (t) =>
        titleLower.includes(t) ||
        contentLower.includes(t) ||
        art.keyTopics.some((kt) => kt.toLowerCase().includes(t))
    );
  });

  matched.sort((a, b) => sortArticles(a, b, targetNumber, cleanQuery));
  return matched.slice(0, limit);
}

/**
 * Searches the PostgreSQL `statutory_rules` table by rule number, statute name,
 * title, content, or category. Gracefully falls back to embedded statutory repository.
 */
export async function searchStatutoryRules(
  query: string,
  limit: number = 8
): Promise<StatutoryRuleResult[]> {
  const cleanQuery = query.trim().toLowerCase();
  const numMatch = cleanQuery.match(/(?:sec(?:tion)?\.?|art(?:icle)?\.?|order)?\s*([0-9]+[a-z]?)/i);
  const targetNumber = numMatch ? numMatch[1].toUpperCase() : null;

  try {
    if (!cleanQuery) {
      return (await prisma.statutoryRule.findMany({
        take: limit,
        orderBy: { statuteCode: 'asc' },
      })) as StatutoryRuleResult[];
    }

    const tokens = cleanQuery
      .replace(/[^\w\s]/g, ' ')
      .split(/\s+/)
      .filter((t) => t.length > 2);

    const whereConditions: any[] = [
      { title: { contains: cleanQuery, mode: 'insensitive' } },
      { ruleNumber: { contains: cleanQuery, mode: 'insensitive' } },
      { statuteName: { contains: cleanQuery, mode: 'insensitive' } },
      { content: { contains: cleanQuery, mode: 'insensitive' } },
      { category: { contains: cleanQuery, mode: 'insensitive' } },
      { keyTopics: { hasSome: tokens } },
    ];

    if (targetNumber) {
      whereConditions.push(
        { ruleNumber: { contains: targetNumber, mode: 'insensitive' } },
        { title: { contains: targetNumber, mode: 'insensitive' } }
      );
    }

    for (const token of tokens.slice(0, 3)) {
      whereConditions.push(
        { title: { contains: token, mode: 'insensitive' } },
        { content: { contains: token, mode: 'insensitive' } }
      );
    }

    const rules = await prisma.statutoryRule.findMany({
      where: {
        OR: whereConditions,
      },
      take: Math.max(limit * 2, 20),
    });

    rules.sort((a, b) => sortRules(a, b, targetNumber, cleanQuery));
    return rules.slice(0, limit) as StatutoryRuleResult[];
  } catch (err) {
    return searchRulesInMemory(cleanQuery, targetNumber, limit);
  }
}

function sortRules(
  a: StatutoryRuleResult,
  b: StatutoryRuleResult,
  targetNumber: string | null,
  cleanQuery: string
): number {
  if (targetNumber) {
    const aHasNum = a.ruleNumber.toUpperCase().includes(targetNumber);
    const bHasNum = b.ruleNumber.toUpperCase().includes(targetNumber);
    if (aHasNum && !bHasNum) return -1;
    if (!aHasNum && bHasNum) return 1;
  }
  const aTitleMatch = a.title.toLowerCase().includes(cleanQuery);
  const bTitleMatch = b.title.toLowerCase().includes(cleanQuery);
  if (aTitleMatch && !bTitleMatch) return -1;
  if (!aTitleMatch && bTitleMatch) return 1;
  return a.statuteCode.localeCompare(b.statuteCode);
}

function searchRulesInMemory(
  cleanQuery: string,
  targetNumber: string | null,
  limit: number
): StatutoryRuleResult[] {
  if (!cleanQuery) {
    return FALLBACK_STATUTORY_RULES.slice(0, limit);
  }

  const tokens = cleanQuery
    .replace(/[^\w\s]/g, ' ')
    .split(/\s+/)
    .filter((t) => t.length > 2);

  const matched = FALLBACK_STATUTORY_RULES.filter((r) => {
    if (targetNumber && (r.ruleNumber.toUpperCase().includes(targetNumber) || r.title.toUpperCase().includes(targetNumber))) {
      return true;
    }
    const titleLower = r.title.toLowerCase();
    const contentLower = r.content.toLowerCase();
    const ruleNumLower = r.ruleNumber.toLowerCase();
    const statNameLower = r.statuteName.toLowerCase();

    if (
      titleLower.includes(cleanQuery) ||
      contentLower.includes(cleanQuery) ||
      ruleNumLower.includes(cleanQuery) ||
      statNameLower.includes(cleanQuery)
    ) {
      return true;
    }

    return tokens.some(
      (t) =>
        titleLower.includes(t) ||
        contentLower.includes(t) ||
        r.keyTopics.some((kt) => kt.toLowerCase().includes(t))
    );
  });

  matched.sort((a, b) => sortRules(a, b, targetNumber, cleanQuery));
  return matched.slice(0, limit);
}

/**
 * Aggregates constitutional articles and statutory court rules from the database
 * formatted as a rich textual context block to ground AI responses.
 */
export async function getConstitutionAndRulesContext(query: string): Promise<string> {
  const [articles, rules] = await Promise.all([
    searchConstitutionalArticles(query, 6),
    searchStatutoryRules(query, 4),
  ]);

  if (articles.length === 0 && rules.length === 0) {
    return '';
  }

  const sections: string[] = [];

  // Check for colloquial "Article 302"
  if (query.match(/(?:art(?:icle)?\.?\s*)?302\b/i)) {
    sections.push(
      `> **[JUDICIAL TERMINOLOGY & STATUTORY CLARIFICATION]**:\n` +
      `> Under Pakistani law, the Constitution of the Islamic Republic of Pakistan, 1973 consists of Articles 1 to 280. The phrase "Article 302" is a widespread layperson/colloquial expression referring to **Section 302 of the Pakistan Penal Code, 1860 (PPC)**, which defines punishments for *qatl-i-amd* (intentional murder). In your advice, explicitly state this distinction so the user understands that murder is codified under the Penal Code (PPC), not the Constitution.`
    );
  }

  if (articles.length > 0) {
    sections.push('### OFFICIAL 1973 CONSTITUTION ARTICLES (GROUNDED IN LOCAL DATABASE):');
    articles.forEach((art) => {
      sections.push(
        `**Article ${art.articleNumber}: ${art.title}** (${art.part}${art.chapter ? ' - ' + art.chapter : ''})\n` +
          `• Content: "${art.content}"\n` +
          (art.explanation ? `• Legal Explanation: ${art.explanation}\n` : '') +
          (art.crossReferences?.length ? `• Cross References: ${art.crossReferences.join(', ')}\n` : '') +
          (art.amendmentNotes ? `• Amendment History: ${art.amendmentNotes}\n` : '')
      );
    });
  }

  if (rules.length > 0) {
    sections.push('### STATUTORY RULES & COURT REGULATIONS (GROUNDED IN LOCAL DATABASE):');
    rules.forEach((rule) => {
      sections.push(
        `**${rule.statuteName} - ${rule.ruleNumber}: ${rule.title}** (Category: ${rule.category}${rule.courtType ? ' | ' + rule.courtType : ''})\n` +
          `• Text: "${rule.content}"\n` +
          (rule.notes ? `• Judicial Practice Notes: ${rule.notes}\n` : '') +
          (rule.crossReferences?.length ? `• Cross References: ${rule.crossReferences.join(', ')}\n` : '')
      );
    });
  }

  return sections.join('\n\n');
}
