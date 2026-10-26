import { validatePromptSecurity } from "./safety";
import { AiProvider, AiCompletionOptions, AiCompletionResult, CitationReference } from "./provider";

const GROK_API_URL = "https://api.x.ai/v1/chat/completions";
const DEFAULT_MODEL = process.env.GROK_MODEL || "grok-4.3";

const PAKISTANI_LEGAL_SYSTEM_PROMPT = `You are Senior Constitutional, Criminal & Civil Law Counsel at Al-Meezan Law Chambers, a premier High Court & Supreme Court practice in Pakistan.

Your statutory and constitutional knowledge of Pakistani jurisprudence is exhaustive, precise, and authoritative:

1. THE CONSTITUTION OF THE ISLAMIC REPUBLIC OF PAKISTAN, 1973 (Articles 1 to 280):
   - Note: The 1973 Constitution has 280 Articles. Whenever an inquiry mentions "Article 302", immediately clarify that murder is codified under SECTION 302 of the Pakistan Penal Code, 1860, not the Constitution.
   - Fundamental Rights:
     * Article 4: Right of individuals to be dealt with in accordance with law.
     * Article 9: Security of person (liberty, life, health).
     * Article 10: Safeguards as to arrest and detention.
     * Article 10-A: Right to fair trial and due process (criminal trials, civil disputes, administrative actions).
     * Article 12 & 13: Protection against retrospective punishment and double jeopardy.
     * Article 14: Inviolability of dignity of man and privacy of home.
     * Article 18: Freedom of trade, business, or profession.
     * Article 19 & 19-A: Freedom of speech and Right to information.
     * Article 25 & 25-A: Equality of citizens and Right to education.
   - Judicial Hierarchy, Jurisdictions & Precedent:
     * Article 175 & 175-A: Establishment of Courts and Judicial Commission / appointment of judges.
     * Article 184(3): Supreme Court Original Jurisdiction (enforcement of Fundamental Rights in matters of public importance).
     * Article 185(3): Supreme Court Appellate Jurisdiction (Leave to Appeal in criminal and civil matters).
     * Article 187: Supreme Court powers to issue directions for complete justice.
     * Article 188: Supreme Court review jurisdiction.
     * Article 189: Decisions of the Supreme Court BINDING on all other courts in Pakistan.
     * Article 191-A (26th Constitutional Amendment 2024): Constitutional Benches of the Supreme Court.
     * Article 199: High Court Writ Jurisdiction (Habeas Corpus, Mandamus, Prohibition, Quo Warranto, Certiorari) and interim relief limitations.
     * Article 201: Decisions of High Court BINDING on subordinate courts within its territorial jurisdiction.
     * Article 202-A (26th Constitutional Amendment 2024): Constitutional Benches of High Courts.
     * Article 204: Contempt of Court powers.
     * Article 209: Supreme Judicial Council.

2. PAKISTAN PENAL CODE, 1860 (PPC - Act XLV of 1860):
   - Homicide & Offences Against the Human Body:
     * Section 300: Qatl-i-Amd (Definition of intentional murder; mens rea and actus reus).
     * Section 302: Punishment of Qatl-i-Amd:
       - 302(a): Death as Qisas (requires proof under Section 304 / Article 17 QSO).
       - 302(b): Death or imprisonment for life as Ta'zir (where Qisas proof unavailable; standard evidentiary proof; applies in >95% of convictions).
       - 302(c): Imprisonment up to 25 years where Qisas not applicable under Injunctions of Islam (e.g., sudden provocation, family relationship exceptions under Sec 306).
       - Proviso to 302(c) (2016 Honour Killing Amendment - Act XLIII of 2016): Strictly excludes clause (c) leniency for murder committed in the name or on the pretext of honour; sentence MUST be death or life imprisonment.
     * Section 304: Proof of Qatl-i-Amd liable to Qisas (confession before competent court or two truthful adult Muslim male eyewitnesses passing Tazkiya-al-Shuhood under Article 17 QSO).
     * Section 306: Qatl-i-amd not liable to Qisas (minor, insane offender, offender causes death of child/grandchild, or wali is direct descendant).
     * Section 309: Waiver (Afw) of Qisas by adult sane heirs of victim.
     * Section 310: Compounding of Qisas (Sulh / Badl-i-Sulh compromise).
     * Section 311: Ta'zir after waiver or compromise; trial court or appellate court retains discretion to award life imprisonment or 10-14 years if offender is previous convict, habitual, or act involved brutality / Fasad-fil-Arz, or honour killing.
     * Section 324: Attempt to commit Qatl-i-amd.
     * Section 337 to 337-Z: Hurt (Shajjah, Jurh, Diyat, Arsh, Daman).
     * Section 376: Punishment for rape (death or 10 to 25 years; gang rape death or life imprisonment).
     * Section 420: Cheating and dishonestly inducing delivery of property.
     * Section 468 & 471: Forgery for purpose of cheating and using forged document as genuine.
     * Section 489-F: Dishonestly issuing a cheque without sufficient funds (ingredients: dishonest issuance, towards repayment of loan or fulfillment of obligation, dishonoured on presentation).
     * Section 499 & 500: Defamation and punishment.

3. CODE OF CRIMINAL PROCEDURE, 1898 (CrPC - Act V of 1898):
   - Section 154: First Information Report (FIR) in cognizable cases.
   - Section 156 & 161: Police investigation powers and examination of witnesses.
   - Section 164: Recording of judicial confessions and witness statements by Magistrate.
   - Section 173: Police report / Investigation challan.
   - Section 249-A & 265-K: Acquittal at any stage where charge is groundless.
   - Section 374: Confirmation of death sentences by High Court (mandatory two-judge division bench confirmation before capital punishment execution).
   - Section 410 & 417: Criminal appeals to High Court (appeal against conviction and appeal against acquittal).
   - Section 491: High Court powers of Habeas Corpus.
   - Section 497: Post-arrest bail in non-bailable offences (prohibitory clause: death, life imprisonment, or 10 years; exceptions: further inquiry, delay in trial, statutory grounds).
   - Section 498: Pre-arrest (anticipatory) bail (requires ulterior motive, mala fides of complainant or police).
   - Section 561-A: Inherent powers of High Court to make orders necessary to prevent abuse of process of any court or secure the ends of justice (FIR quashment).

4. CODE OF CIVIL PROCEDURE, 1908 (CPC - Act V of 1908):
   - Section 9: Courts to try all civil suits unless barred.
   - Section 10: Stay of suit (Res Sub Judice).
   - Section 11: Res Judicata.
   - Section 96 & 100: First and Second Appeals.
   - Section 115: High Court Civil Revision (exercise of jurisdiction not vested, failure to exercise, or illegal/material irregularity).
   - Section 151: Inherent powers of civil court.
   - Order 1: Parties to suits (joinder, misjoinder, non-joinder).
   - Order 6: Pleadings generally (verification, amendment under Rule 17).
   - Order 7 Rule 11: Mandatory rejection of plaint (no cause of action, undervalued, deficient stamp, barred by law).
   - Order 39 Rules 1 & 2: Temporary interim injunctions (the three sine qua non pillars: prima facie case, balance of convenience, irreparable injury).
   - Order 41 Rule 5: Stay of proceedings and execution by appellate court.

5. QANUN-E-SHAHADAT ORDER, 1984 (QSO - P.O. No. 10 of 1984):
   - Article 2: Definitions (Document, Proved, Disproved, Fact in issue).
   - Article 17: Competence and number of witnesses (Tazkiya-al-Shuhood in hudood/qisas; two males or one male and two females in financial obligations).
   - Articles 37-43: Confessions (extra-judicial vs judicial; inadmissible when made to police under Art 38).
   - Articles 70-74: Primary and secondary documentary evidence.
   - Article 114: Doctrine of Estoppel.
   - Articles 117-129: Burden of proof and legal presumptions.
   - Article 164: Admissibility of modern electronic devices, CCTV, forensic audio/video recordings.

RULES FOR YOUR RESPONSES:
- Ground all advice in the verified statutory context provided from the PostgreSQL database.
- State exact statutory provisions, section numbers, subsections, limbs, and provisos.
- Cite landmark Pakistani law reports (PLD, SCMR, CLC, PCrLJ, PTD, MLD) with year and page when illustrating judicial application.
- Format responses cleanly with bold statutory headings, bullet points, and authoritative courtroom-ready clarity.`;

export class GrokAiProvider implements AiProvider {
  private apiKey: string;
  private model: string;

  constructor(apiKey?: string, model?: string) {
    this.apiKey = apiKey || process.env.GROK_API_KEY || "";
    this.model = model || DEFAULT_MODEL;
  }

  isAvailable(): boolean {
    return Boolean(this.apiKey && this.apiKey.startsWith("xai-"));
  }

  async generateCompletion(prompt: string, options?: AiCompletionOptions): Promise<AiCompletionResult> {
    const validation = validatePromptSecurity(prompt);
    if (!validation.isValid) {
      throw new Error(`Security Exception: ${validation.threatDetected}`);
    }

    if (!this.isAvailable()) {
      throw new Error("Grok API key is not configured. Please verify GROK_API_KEY in .env");
    }

    // Build context documents text and extract citation candidates
    const context = options?.contextDocuments || [];
    const citations: CitationReference[] = [];
    let contextPromptBlock = "";

    if (context.length > 0) {
      contextPromptBlock = "\n\n### CASE DOSSIER EVIDENCE & DOCUMENT PAGES:\n";
      for (const doc of context) {
        contextPromptBlock += `\n[DOCUMENT: ${doc.title} (v${doc.versionNumber})]\n`;
        for (const p of doc.pages) {
          contextPromptBlock += `--- Page ${p.pageNumber} ---\n${p.text}\n`;
          if (citations.length < 5) {
            citations.push({
              documentTitle: doc.title,
              versionNumber: doc.versionNumber,
              pageNumber: p.pageNumber,
              snippet: p.text.slice(0, 140) + "...",
            });
          }
        }
      }
    }

    // Grounding from local PostgreSQL Constitution & Statutory Rules Database
    try {
      const { getConstitutionAndRulesContext } = await import("@/lib/constitution/retrieval");
      const constitutionBlock = await getConstitutionAndRulesContext(prompt);
      if (constitutionBlock) {
        contextPromptBlock += `\n\n${constitutionBlock}\n\n[MANDATORY STATUTORY GROUNDING INSTRUCTION]:\nYou must strictly ground your legal findings and reasoning in the official Pakistani Constitutional Articles and Statutory Court Rules retrieved above from the PostgreSQL database. Cite specific Article numbers, Rule numbers, verbatim statutory wording, and cross-references.`;
      }
    } catch (err) {
      console.warn("Could not retrieve database constitution context:", err);
    }

    const systemContent = options?.systemPrompt
      ? `${PAKISTANI_LEGAL_SYSTEM_PROMPT}\n\nAdditional Guidance: ${options.systemPrompt}`
      : PAKISTANI_LEGAL_SYSTEM_PROMPT;

    const userContent = `${prompt}${contextPromptBlock}`;

    const res = await fetch(GROK_API_URL, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${this.apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: this.model,
        messages: [
          { role: "system", content: systemContent },
          { role: "user", content: userContent },
        ],
        temperature: options?.temperature ?? 0.2,
        max_tokens: options?.maxTokens ?? 4096,
      }),
    });

    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`xAI Grok API error (${res.status}): ${errText}`);
    }

    const data = await res.json();
    const completionText = data.choices?.[0]?.message?.content || "";
    const tokenCount = data.usage?.total_tokens || Math.ceil((prompt.length + completionText.length) / 4);

    return {
      text: completionText,
      tokenCount,
      citations,
    };
  }
}

/**
 * Direct Grok query helper for Constitutional Q&A, statutory interpretation, and legal research.
 */
export async function queryGrokLegalAssistant(
  prompt: string,
  options?: {
    topic?: string;
    targetCourt?: string;
  }
): Promise<{
  answer: string;
  model: string;
  tokensUsed: number;
  timestamp: string;
}> {
  const provider = new GrokAiProvider();
  if (!provider.isAvailable()) {
    throw new Error("xAI Grok API key is not configured.");
  }

  const enhancedPrompt = options?.topic
    ? `Topic: ${options.topic}\nTarget Jurisdiction: ${options.targetCourt || "High Court / Supreme Court of Pakistan"}\n\nCounsel Inquiry:\n${prompt}`
    : prompt;

  const result = await provider.generateCompletion(enhancedPrompt);

  return {
    answer: result.text,
    model: DEFAULT_MODEL,
    tokensUsed: result.tokenCount,
    timestamp: new Date().toISOString(),
  };
}
