import { describe, it, expect } from 'vitest';
import {
  searchConstitutionalArticles,
  searchStatutoryRules,
  getConstitutionAndRulesContext,
} from '@/lib/constitution/retrieval';

describe('Constitutional Articles and Statutory Rules Database', () => {
  it('should find Article 199 writ jurisdiction by number or keywords', async () => {
    const articles = await searchConstitutionalArticles('199', 5);
    expect(articles.length).toBeGreaterThan(0);
    const art199 = articles.find((a) => a.articleNumber === '199');
    expect(art199).toBeDefined();
    expect(art199?.title).toContain('Jurisdiction of High Court');
    expect(art199?.content).toContain('aggrieved party');
  });

  it('should find Fundamental Rights articles such as Article 10A and Article 4', async () => {
    const articles = await searchConstitutionalArticles('fair trial', 5);
    expect(articles.length).toBeGreaterThan(0);
    const art10A = articles.find((a) => a.articleNumber === '10A');
    expect(art10A).toBeDefined();
    expect(art10A?.title).toContain('fair trial');
  });

  it('should retrieve statutory court rules like CPC Order 39 or CrPC 497', async () => {
    const rules = await searchStatutoryRules('Order XXXIX', 5);
    expect(rules.length).toBeGreaterThan(0);
    const injunctionRule = rules.find((r) => r.ruleNumber.includes('XXXIX'));
    expect(injunctionRule).toBeDefined();
    expect(injunctionRule?.statuteName).toContain('Civil Procedure');
  });

  it('should format combined context for AI grounding with verbatim text', async () => {
    const context = await getConstitutionAndRulesContext('Article 199 stay order injunction');
    expect(context).toContain('OFFICIAL 1973 CONSTITUTION ARTICLES');
    expect(context).toContain('Article 199');
    expect(context).toContain('Order XXXIX');
  });

  it('should accurately retrieve Section 302 PPC and provide colloquial Article 302 clarification', async () => {
    const rules = await searchStatutoryRules('302', 5);
    expect(rules.length).toBeGreaterThan(0);
    const sec302 = rules.find((r) => r.ruleNumber.includes('302'));
    expect(sec302).toBeDefined();
    expect(sec302?.title).toContain('Qatl-i-Amd');
    expect(sec302?.content).toContain('death as qisas');
    expect(sec302?.content).toContain('honour');

    const context = await getConstitutionAndRulesContext('Article 302 murder punishment');
    expect(context).toContain('JUDICIAL TERMINOLOGY & STATUTORY CLARIFICATION');
    expect(context).toContain('Section 302 of the Pakistan Penal Code, 1860 (PPC)');
    expect(context).toContain('qatl-i-amd');
  }, 15000);
});
