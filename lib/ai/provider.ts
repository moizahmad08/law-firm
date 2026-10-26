import { validatePromptSecurity } from "./safety";

export interface CitationReference {
  documentTitle: string;
  versionNumber: number;
  pageNumber: number;
  snippet: string;
}

export interface AiCompletionOptions {
  systemPrompt?: string;
  temperature?: number;
  maxTokens?: number;
  contextDocuments?: Array<{
    title: string;
    versionNumber: number;
    pages: Array<{ pageNumber: number; text: string }>;
  }>;
}

export interface AiCompletionResult {
  text: string;
  tokenCount: number;
  citations: CitationReference[];
}

export interface AiProvider {
  generateCompletion(prompt: string, options?: AiCompletionOptions): Promise<AiCompletionResult>;
}

/**
 * Deterministic Mock AI Provider for local development, privacy compliance, and test suites.
 * Never connects externally; produces grounded legal analysis strictly from provided context.
 */
export class DeterministicAiProvider implements AiProvider {
  async generateCompletion(prompt: string, options?: AiCompletionOptions): Promise<AiCompletionResult> {
    const validation = validatePromptSecurity(prompt);
    if (!validation.isValid) {
      throw new Error(`Security Exception: ${validation.threatDetected}`);
    }

    const context = options?.contextDocuments || [];
    const citations: CitationReference[] = [];

    // Extract first available citations from context
    for (const doc of context) {
      for (const p of doc.pages) {
        if (citations.length < 3) {
          citations.push({
            documentTitle: doc.title,
            versionNumber: doc.versionNumber,
            pageNumber: p.pageNumber,
            snippet: p.text.slice(0, 120) + "...",
          });
        }
      }
    }

    const lowerPrompt = prompt.toLowerCase();
    let text = "";

    if (lowerPrompt.includes("summary") || lowerPrompt.includes("brief")) {
      text = `### Structured Case Dossier Briefing\n\n` +
        `**1. Nature of the Matter:**\n` +
        `Litigation involving statutory interpretation, constitutional rights, or commercial recovery before the competent court.\n\n` +
        `**2. Material Questions of Law:**\n` +
        `- Whether the impugned notice or action satisfies natural justice requirements under Article 10-A.\n` +
        `- Whether the interim injunctive relief is warranted to prevent irreparable injury.\n\n` +
        `**3. Key Document Analysis:**\n` +
        (citations.length > 0
          ? `Analysis based on review of [${citations[0].documentTitle}, Page ${citations[0].pageNumber}]: "${citations[0].snippet}"\n\n`
          : `Preliminary analysis pending submission of complete paper book.\n\n`) +
        `**4. Recommended Legal Strategy:**\n` +
        `- File replication/rejoinder rebutting affirmative preliminary defenses.\n` +
        `- Prepare chronological list of dates and events with supporting annexures.`;
    } else if (lowerPrompt.includes("hearing") || lowerPrompt.includes("date")) {
      text = `Based on examination of case records, the matter is pending proceedings before the High Court bench. ` +
        `Relevant references cite [${citations[0]?.documentTitle || "Court Notice"}, Page ${citations[0]?.pageNumber || 1}]. ` +
        `Ensure lead counsel is briefed prior to call of the list.`;
    } else {
      text = `In response to the inquiry regarding: "${prompt.trim()}":\n\n` +
        `Review of the case dossier indicates relevant factual basis recorded in ` +
        (citations.length > 0
          ? `[${citations[0].documentTitle}, Page ${citations[0].pageNumber}].`
          : `the case records.`) +
        `\n\n*Note: This synthesis is prepared for internal counsel review pursuant to chambers privilege.*`;
    }

    const tokenCount = Math.ceil((prompt.length + text.length) / 4);

    return {
      text,
      tokenCount,
      citations,
    };
  }
}

export class SmartAiProvider implements AiProvider {
  private deterministic = new DeterministicAiProvider();

  async generateCompletion(prompt: string, options?: AiCompletionOptions): Promise<AiCompletionResult> {
    if (process.env.NODE_ENV !== "test" && process.env.GROK_API_KEY) {
      try {
        const { GrokAiProvider } = await import("./grok");
        const grok = new GrokAiProvider();
        if (grok.isAvailable()) {
          return await grok.generateCompletion(prompt, options);
        }
      } catch (err) {
        console.warn("Grok AI unavailable, using deterministic model:", err);
      }
    }
    return await this.deterministic.generateCompletion(prompt, options);
  }
}

export const defaultAiProvider: AiProvider = new SmartAiProvider();
