"use client";

import React, { useState, useTransition } from "react";
import {
  Scale,
  Search,
  BookOpen,
  ShieldCheck,
  AlertTriangle,
  CheckCircle2,
  ExternalLink,
  Filter,
  Award,
  Layers,
  Sparkles,
  Send,
  Copy,
  Check,
  Cpu,
  BookMarked,
  HelpCircle,
  ChevronRight,
  Gavel,
} from "lucide-react";
import {
  searchPrecedentsAction,
  askGrokConstitutionalCounselAction,
  searchConstitutionDatabaseAction,
} from "@/lib/research/actions";
import { PrecedentCourtType, PrecedentStatus } from "@prisma/client";

interface PrecedentItem {
  id: string;
  citation: string;
  title: string;
  court: PrecedentCourtType;
  bench: string;
  benchSize: number;
  decisionYear: number;
  decisionDate: string | Date | null;
  status: PrecedentStatus;
  legalTopics: string[];
  statutoryProvisions: string[];
  headnote: string;
  summary: string;
  sourceUrl: string | null;
  effectiveAuthority: "BINDING" | "PERSUASIVE";
  authorityReasoning: string;
}

interface LegalResearchPortalProps {
  initialPrecedents?: PrecedentItem[];
  defaultTargetCourt?: PrecedentCourtType;
}

const QUICK_PROMPTS = [
  {
    label: "Section 302 PPC Qatl-i-Amd & Qisas vs Ta'zir",
    query: "Explain the structure of Section 302 PPC (often colloquially referred to as Article 302) in Pakistan, detailing the distinctions between clause (a) death as qisas, clause (b) ta'zir, clause (c), and the 2016 honour killing proviso.",
    category: "Criminal Homicide",
  },
  {
    label: "Section 489-F PPC Bounced Cheque Principles",
    query: "What are the essential ingredients to establish an offence under Section 489-F PPC (dishonestly issuing a cheque) in Pakistan, and what are valid defense grounds?",
    category: "Financial Crimes",
  },
  {
    label: "Article 199 Writ Jurisdiction & Stay Orders",
    query: "Explain the scope of High Court writ jurisdiction under Article 199 of the Constitution of Pakistan, specifically the requirements to obtain an interim injunction or stay order against state authorities.",
    category: "Constitutional Law",
  },
  {
    label: "Article 10-A Due Process & Fair Trial",
    query: "What is the constitutional standard of 'Fair Trial and Due Process' under Article 10-A of the Constitution of Pakistan as interpreted by the Supreme Court?",
    category: "Fundamental Rights",
  },
  {
    label: "Article 189 Supreme Court Precedent Binding Effect",
    query: "Explain the doctrine of binding precedent under Article 189 of the Constitution of Pakistan. When does a larger bench judgment override earlier decisions?",
    category: "Judicial Precedent",
  },
  {
    label: "Order 39 Rules 1 & 2 CPC Interim Injunction",
    query: "What are the three essential ingredients (prima facie case, balance of convenience, irreparable injury) for grant of interim temporary injunction under Order 39 Rules 1 and 2 CPC in Pakistan?",
    category: "Civil Procedure",
  },
  {
    label: "26th Constitutional Amendment Overview",
    query: "Provide a comprehensive legal summary of the 26th Constitutional Amendment of Pakistan, focusing on Constitutional Benches in the Supreme Court and High Courts and changes to judicial appointments.",
    category: "Latest Amendments",
  },
  {
    label: "Section 497/498 CrPC Bail Principles",
    query: "Summarize the principles governing grant of post-arrest and pre-arrest bail under Sections 497 and 498 CrPC in Pakistan, distinguishing between prohibitory and non-prohibitory clauses.",
    category: "Criminal Procedure",
  },
];

export function LegalResearchPortal({
  initialPrecedents = [],
  defaultTargetCourt = PrecedentCourtType.HIGH_COURT_SINDH,
}: LegalResearchPortalProps) {
  const [activeTab, setActiveTab] = useState<"grok_ai" | "constitution" | "precedents">("grok_ai");
  const [isPending, startTransition] = useTransition();

  // Grok AI State
  const [grokQuestion, setGrokQuestion] = useState("");
  const [grokTopic, setGrokTopic] = useState("Constitution of Pakistan, 1973");
  const [grokTargetCourt, setGrokTargetCourt] = useState("High Court / Supreme Court of Pakistan");
  const [grokLoading, setGrokLoading] = useState(false);
  const [grokAnswer, setGrokAnswer] = useState<string | null>(null);
  const [grokTokens, setGrokTokens] = useState<number | null>(null);
  const [grokModel, setGrokModel] = useState<string | null>(null);
  const [grokError, setGrokError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  // Constitution & Statutory Rules Database State
  const [constQuery, setConstQuery] = useState("");
  const [constFilter, setConstFilter] = useState("ALL");
  const [constArticles, setConstArticles] = useState<any[]>([]);
  const [constRules, setConstRules] = useState<any[]>([]);
  const [constLoading, setConstLoading] = useState(false);
  const [selectedConstItem, setSelectedConstItem] = useState<any | null>(null);
  const [copiedConst, setCopiedConst] = useState(false);

  // Precedents State
  const [query, setQuery] = useState("");
  const [courtFilter, setCourtFilter] = useState<string>("");
  const [targetCourt, setTargetCourt] = useState<PrecedentCourtType>(defaultTargetCourt);
  const [precedents, setPrecedents] = useState<PrecedentItem[]>(initialPrecedents);
  const [hasResearchGaps, setHasResearchGaps] = useState(false);
  const [gapNotice, setGapNotice] = useState<string | undefined>();
  const [selectedPrecedent, setSelectedPrecedent] = useState<PrecedentItem | null>(
    initialPrecedents[0] || null
  );

  // Load initial constitution data on tab switch
  React.useEffect(() => {
    if (activeTab === "constitution" && constArticles.length === 0 && constRules.length === 0) {
      loadConstitutionData();
    }
  }, [activeTab]);

  const loadConstitutionData = async (searchParam?: string) => {
    setConstLoading(true);
    try {
      const res = await searchConstitutionDatabaseAction({ query: searchParam || constQuery });
      if (res.success) {
        setConstArticles(res.articles || []);
        setConstRules(res.rules || []);
        if ((res.articles?.length || 0) > 0) {
          setSelectedConstItem(res.articles![0]);
        } else if ((res.rules?.length || 0) > 0) {
          setSelectedConstItem(res.rules![0]);
        }
      }
    } catch (err) {
      console.error("Failed to load constitution database records:", err);
    } finally {
      setConstLoading(false);
    }
  };

  const handleAskGrokAboutArticle = (item: any) => {
    const isArt = Boolean(item.articleNumber);
    const itemTitle = isArt
      ? `Article ${item.articleNumber}: ${item.title}`
      : `${item.statuteName} - ${item.ruleNumber}: ${item.title}`;
    const prompt = `Please provide a courtroom litigation analysis and judicial interpretation of ${itemTitle} under Pakistani jurisprudence. Cite relevant Supreme Court and High Court precedents, explain essential legal prerequisites, and provide practical litigation strategy.`;
    
    setGrokQuestion(prompt);
    setActiveTab("grok_ai");
    handleAskGrok(prompt);
  };

  const handleAskGrok = async (customQuestion?: string) => {
    const questionToAsk = customQuestion || grokQuestion;
    if (!questionToAsk.trim()) return;

    setGrokLoading(true);
    setGrokError(null);
    setGrokAnswer(null);

    try {
      const res = await askGrokConstitutionalCounselAction({
        question: questionToAsk,
        topic: grokTopic,
        targetCourt: grokTargetCourt,
      });

      if (res.success && res.answer) {
        setGrokAnswer(res.answer);
        setGrokTokens(res.tokensUsed || null);
        setGrokModel(res.model || "grok-4.3");
      } else {
        setGrokError(res.error || "Failed to receive answer from Grok AI.");
      }
    } catch (err: any) {
      setGrokError(err.message || "An unexpected error occurred while consulting Grok AI.");
    } finally {
      setGrokLoading(false);
    }
  };

  const handleCopy = () => {
    if (!grokAnswer) return;
    navigator.clipboard.writeText(grokAnswer);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSearchPrecedents = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    startTransition(async () => {
      const res = await searchPrecedentsAction({
        query: query.trim() || undefined,
        court: (courtFilter as PrecedentCourtType) || undefined,
        targetCourtType: targetCourt,
      });

      if (res.success && res.results) {
        setPrecedents(res.results as any);
        setHasResearchGaps(res.hasResearchGaps || false);
        setGapNotice(res.gapNotice);
        if (res.results.length > 0) {
          setSelectedPrecedent(res.results[0] as any);
        } else {
          setSelectedPrecedent(null);
        }
      }
    });
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="p-6 rounded-2xl bg-gradient-to-r from-amber-500/15 via-slate-900 to-blue-500/15 border border-amber-500/20 shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-center space-x-3.5">
          <div className="w-12 h-12 rounded-xl bg-amber-400/10 border border-amber-400/30 flex items-center justify-center shrink-0 shadow-inner">
            <Scale className="w-6 h-6 text-amber-400" />
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-lg font-bold text-white tracking-tight">
                Pakistani Legal Research &amp; Constitutional Intelligence
              </h1>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30 flex items-center gap-1">
                <Sparkles className="w-3 h-3 text-amber-400" />
                Powered by xAI Grok
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-1">
              Constitution of Pakistan 1973, Supreme Court &amp; High Court Articles, 26th Amendment, Statutory Codes, and Articles 189 &amp; 201 Precedents.
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-2 text-xs bg-slate-950/80 px-3.5 py-2 rounded-xl border border-slate-800">
          <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
          <span className="text-slate-300 font-medium">Pakistani Law Reports Verified</span>
        </div>
      </div>

      {/* Mode Selector Pill Bar */}
      <div className="bg-slate-900/90 p-1.5 rounded-2xl border border-slate-800 shadow-lg flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-2">
        <button
          onClick={() => setActiveTab("grok_ai")}
          className={`flex-1 py-2.5 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer ${
            activeTab === "grok_ai"
              ? "bg-amber-500 text-slate-950 shadow-lg shadow-amber-500/20"
              : "text-slate-400 hover:text-white hover:bg-slate-800/80"
          }`}
        >
          <Sparkles className="w-4 h-4 text-amber-400 shrink-0" />
          <span>Grok AI Legal Counsel</span>
          <span className="hidden lg:inline-block px-1.5 py-0.2 bg-slate-950/40 text-slate-900 rounded text-[10px]">
            Live Q&amp;A
          </span>
        </button>

        <button
          onClick={() => setActiveTab("constitution")}
          className={`flex-1 py-2.5 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer ${
            activeTab === "constitution"
              ? "bg-amber-500 text-slate-950 shadow-lg shadow-amber-500/20"
              : "text-slate-400 hover:text-white hover:bg-slate-800/80"
          }`}
        >
          <Gavel className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>1973 Constitution &amp; Rules Database</span>
          <span className="hidden lg:inline-block px-1.5 py-0.2 bg-slate-950/40 text-slate-900 rounded text-[10px]">
            Grounded
          </span>
        </button>

        <button
          onClick={() => setActiveTab("precedents")}
          className={`flex-1 py-2.5 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer ${
            activeTab === "precedents"
              ? "bg-amber-500 text-slate-950 shadow-lg shadow-amber-500/20"
              : "text-slate-400 hover:text-white hover:bg-slate-800/80"
          }`}
        >
          <BookOpen className="w-4 h-4 text-blue-400 shrink-0" />
          <span>Precedent Hierarchy</span>
          <span className="hidden lg:inline-block px-1.5 py-0.2 bg-slate-950/40 text-slate-900 rounded text-[10px]">
            Art. 189 &amp; 201
          </span>
        </button>
      </div>

      {/* TAB 1: Grok AI Constitutional & Legal Counsel */}
      {activeTab === "grok_ai" && (
        <div className="space-y-6">
          {/* Inquiry Input Card */}
          <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 shadow-xl space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800 pb-3">
              <div>
                <h2 className="text-sm font-bold text-white flex items-center gap-2">
                  <Cpu className="w-4 h-4 text-amber-400" />
                  <span>Consult Grok on Pakistani Law &amp; Constitution</span>
                </h2>
                <p className="text-xs text-slate-400 mt-0.5">
                  Ask specific questions regarding constitutional articles, stay applications, writ grounds, statutory sections, or case law interpretations.
                </p>
              </div>

              <div className="flex items-center space-x-2 text-xs">
                <span className="text-slate-500">Focus:</span>
                <select
                  value={grokTopic}
                  onChange={(e) => setGrokTopic(e.target.value)}
                  className="bg-slate-950 border border-slate-800 text-amber-300 rounded-lg px-2.5 py-1 text-xs focus:outline-none focus:border-amber-400"
                >
                  <option value="Constitution of Pakistan, 1973">Constitution of Pakistan</option>
                  <option value="Civil Procedure Code 1908 (CPC)">Civil Procedure (CPC)</option>
                  <option value="Criminal Procedure Code 1898 (CrPC)">Criminal Procedure (CrPC)</option>
                  <option value="Qanun-e-Shahadat Order 1984 (QSO)">Evidence (QSO)</option>
                  <option value="Specific Relief Act 1877">Specific Relief Act</option>
                  <option value="Corporate & Commercial Law">Corporate / Commercial</option>
                </select>
              </div>
            </div>

            {/* Quick Prompt Chips */}
            <div>
              <span className="text-[11px] font-semibold text-slate-400 block mb-2">
                Quick Pakistani Constitutional &amp; Legal Topics:
              </span>
              <div className="flex flex-wrap gap-2">
                {QUICK_PROMPTS.map((qp, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => {
                      setGrokQuestion(qp.query);
                      handleAskGrok(qp.query);
                    }}
                    className="px-3 py-1.5 rounded-xl bg-slate-950 border border-slate-800 hover:border-amber-500/50 hover:bg-slate-800/60 text-slate-300 hover:text-white text-xs transition-all text-left flex items-center gap-1.5 group cursor-pointer"
                  >
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-400 group-hover:scale-125 transition-transform" />
                    <span>{qp.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Custom Question Textarea */}
            <div className="space-y-3 pt-2">
              <div className="relative">
                <textarea
                  rows={4}
                  value={grokQuestion}
                  onChange={(e) => setGrokQuestion(e.target.value)}
                  placeholder="Enter your legal inquiry (e.g. 'What are the essential grounds to challenge an arbitrary executive notification under Article 199(1)(a)(ii) of the Constitution? Cite relevant case law.')"
                  className="w-full bg-slate-950 border border-slate-800 focus:border-amber-400 rounded-xl p-3.5 text-xs text-white placeholder-slate-500 focus:outline-none transition-colors"
                />
              </div>

              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center space-x-2 text-[11px] text-slate-500">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Integrated with xAI Grok Reasoning &bull; Specialized Pakistani Legal System Prompt</span>
                </div>

                <button
                  type="button"
                  disabled={grokLoading || !grokQuestion.trim()}
                  onClick={() => handleAskGrok()}
                  className="inline-flex items-center space-x-2 px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-slate-950 font-bold text-xs transition-all shadow-lg shadow-amber-500/20 cursor-pointer self-end"
                >
                  {grokLoading ? (
                    <>
                      <span className="w-4 h-4 border-2 border-slate-950 border-t-transparent rounded-full animate-spin" />
                      <span>Consulting Grok AI...</span>
                    </>
                  ) : (
                    <>
                      <Send className="w-4 h-4" />
                      <span>Analyze with Grok AI</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Error Message */}
            {grokError && (
              <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-start space-x-2">
                <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                <span>{grokError}</span>
              </div>
            )}
          </div>

          {/* Grok Answer Display */}
          {grokAnswer && (
            <div className="p-6 rounded-2xl bg-slate-900 border border-amber-500/30 shadow-2xl space-y-4 animate-fade-in">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800 pb-3">
                <div className="flex items-center space-x-2">
                  <div className="p-1.5 rounded-lg bg-amber-500/10 text-amber-400 border border-amber-500/30">
                    <Gavel className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-white">Grok Legal Counsel Opinion</h3>
                    <div className="flex items-center space-x-2 text-[11px] text-slate-400">
                      <span>Model: {grokModel || "grok-4.20-0309-non-reasoning"}</span>
                      {grokTokens && <span>&bull; {grokTokens} tokens</span>}
                      <span>&bull; High Court &amp; Supreme Court Practice</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center space-x-2">
                  <button
                    onClick={handleCopy}
                    className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700 transition-colors cursor-pointer"
                  >
                    {copied ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-400" />
                        <span className="text-emerald-400">Copied!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5 text-slate-400" />
                        <span>Copy Opinion</span>
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* Formatted Opinion Content */}
              <div className="prose prose-invert max-w-none text-xs leading-relaxed text-slate-200 whitespace-pre-wrap font-sans bg-slate-950/70 p-5 rounded-xl border border-slate-800/80">
                {grokAnswer}
              </div>

              <div className="p-3 rounded-xl bg-slate-950/50 border border-slate-800/60 text-[11px] text-slate-400 flex items-center justify-between">
                <span>
                  <strong>Advocate Practice Note:</strong> Review statutory references and verify citation with official law reports before submission in court pleadings.
                </span>
                <span className="font-mono text-amber-400">Al-Meezan Law Chambers</span>
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB 2: 1973 Constitution & Statutory Rules Database */}
      {activeTab === "constitution" && (
        <div className="space-y-6">
          {/* Search & Filter Bar */}
          <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 shadow-md space-y-3">
            <div className="flex flex-col md:flex-row items-center gap-3">
              <div className="relative flex-1 w-full">
                <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={constQuery}
                  onChange={(e) => {
                    setConstQuery(e.target.value);
                    loadConstitutionData(e.target.value);
                  }}
                  placeholder="Search Article number (e.g. '199', '184', '10A', '4') or Rule (e.g. 'Order 39', '497 CrPC')..."
                  className="w-full bg-slate-950 border border-slate-800 text-slate-100 placeholder-slate-500 text-xs rounded-xl pl-9 pr-4 py-2.5 focus:outline-none focus:border-amber-400"
                />
              </div>

              <div className="flex items-center space-x-2 w-full md:w-auto">
                <select
                  value={constFilter}
                  onChange={(e) => setConstFilter(e.target.value)}
                  className="bg-slate-950 border border-slate-800 text-slate-300 text-xs rounded-xl px-3 py-2.5 focus:outline-none focus:border-amber-400 w-full md:w-auto"
                >
                  <option value="ALL">All Database Provisions ({constArticles.length + constRules.length})</option>
                  <option value="ARTICLES">All 1973 Constitution Articles ({constArticles.length})</option>
                  <option value="FUNDAMENTAL">Part II: Fundamental Rights (Art 8-28)</option>
                  <option value="JUDICATURE">Part VII: The Judicature &amp; Writs (Art 175-212)</option>
                  <option value="FEDERATION">Part III &amp; V: Federation, Parliament, CCI</option>
                  <option value="RULES">All Court Rules &amp; Regulations ({constRules.length})</option>
                  <option value="PPC">PPC 1860 (Penal Code &amp; Homicide)</option>
                  <option value="CPC">CPC 1908 (Civil Injunctions &amp; Procedure)</option>
                  <option value="CRPC">CrPC 1898 (Bail, FIR &amp; Quashment)</option>
                  <option value="QSO">Qanun-e-Shahadat 1984 (Evidence)</option>
                  <option value="SCR">Supreme Court Rules 1980</option>
                </select>

                <button
                  onClick={() => loadConstitutionData()}
                  className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold shrink-0 transition-colors"
                >
                  Refresh
                </button>
              </div>
            </div>

            {/* Quick Filter Badges */}
            <div className="flex flex-wrap items-center gap-1.5 pt-1">
              <span className="text-[10px] uppercase font-bold text-slate-500 mr-1">Quick Browse:</span>
              {[
                { label: "Sec. 302 PPC (Murder)", query: "302" },
                { label: "Sec. 324 PPC (Attempt)", query: "324" },
                { label: "Sec. 489-F PPC (Cheques)", query: "489-F" },
                { label: "Art. 199 (Writs)", query: "199" },
                { label: "Art. 184(3) (SC Original)", query: "184" },
                { label: "Art. 10A (Fair Trial)", query: "10A" },
                { label: "Art. 4 (Rule of Law)", query: "4" },
                { label: "Art. 25 (Equality)", query: "25" },
                { label: "Art. 191A (26th Amend)", query: "191A" },
                { label: "CPC Order 39 (Injunctions)", query: "Order XXXIX" },
                { label: "CrPC 154 (FIR)", query: "154" },
                { label: "CrPC 497 (Bail)", query: "497" },
                { label: "CrPC 561-A (Quashment)", query: "561-A" },
                { label: "QSO 114 (Estoppel)", query: "114" },
              ].map((badge, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => {
                    setConstQuery(badge.query);
                    loadConstitutionData(badge.query);
                  }}
                  className="px-2.5 py-1 rounded-lg bg-slate-950 border border-slate-800 text-[11px] text-slate-300 hover:text-amber-400 hover:border-amber-400/40 transition-colors cursor-pointer"
                >
                  {badge.label}
                </button>
              ))}
            </div>

            {/* Judicial Notice Banner for Colloquial Queries like "Article 302" */}
            {constQuery.match(/(?:art(?:icle)?\.?\s*)?302\b/i) && (
              <div className="mt-3 p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
                <div className="text-xs">
                  <h4 className="font-bold text-amber-300">
                    Judicial Notice: "Article 302" vs Section 302 PPC
                  </h4>
                  <p className="text-slate-300 mt-1 leading-relaxed text-[11px]">
                    Under Pakistani jurisprudence, the Constitution of Pakistan (1973) contains Articles 1 to 280. 
                    The widely cited phrase <strong>"Article 302"</strong> is a colloquialism for <strong>Section 302 of the Pakistan Penal Code, 1860 (PPC)</strong>, 
                    which codifies murder (<em>qatl-i-amd</em>), capital retribution (<em>qisas</em>), and discretionary punishment (<em>ta&apos;zir</em>). 
                    Our database below accurately displays Section 302 PPC and related provisions.
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Master-Detail Layout */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Left Column: List of Provisions */}
            <div className="lg:col-span-5 space-y-3 max-h-[750px] overflow-y-auto pr-1">
              {constLoading ? (
                <div className="p-8 text-center text-slate-400 text-xs bg-slate-900 rounded-2xl border border-slate-800">
                  <div className="w-5 h-5 border-2 border-amber-400 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                  Querying official 1973 Constitution and Statutory Rules from database...
                </div>
              ) : (
                (() => {
                  // Filter list
                  const combinedItems: any[] = [];
                  if (constFilter === "ALL" || constFilter === "ARTICLES" || constFilter === "FUNDAMENTAL" || constFilter === "JUDICATURE" || constFilter === "FEDERATION") {
                    const filteredArticles = constArticles.filter((a) => {
                      if (constFilter === "FUNDAMENTAL") return a.part.includes("Fundamental Rights");
                      if (constFilter === "JUDICATURE") return a.part.includes("Judicature");
                      if (constFilter === "FEDERATION") return a.part.includes("Federation") || a.part.includes("Provinces");
                      return true;
                    });
                    combinedItems.push(...filteredArticles);
                  }

                  if (constFilter === "ALL" || constFilter === "RULES" || constFilter === "PPC" || constFilter === "CPC" || constFilter === "CRPC" || constFilter === "QSO" || constFilter === "SCR") {
                    const filteredRules = constRules.filter((r) => {
                      if (constFilter === "PPC") return r.statuteCode === "PPC_1860";
                      if (constFilter === "CPC") return r.statuteCode === "CPC_1908";
                      if (constFilter === "CRPC") return r.statuteCode === "CRPC_1898";
                      if (constFilter === "QSO") return r.statuteCode === "QSO_1984";
                      if (constFilter === "SCR") return r.statuteCode === "SCR_1980";
                      return true;
                    });
                    combinedItems.push(...filteredRules);
                  }

                  if (combinedItems.length === 0) {
                    return (
                      <div className="p-8 text-center text-slate-400 text-xs bg-slate-900 rounded-2xl border border-slate-800">
                        No articles or statutory rules found matching "{constQuery}". Try another keyword or article number.
                      </div>
                    );
                  }

                  return combinedItems.map((item, idx) => {
                    const isArticle = Boolean(item.articleNumber);
                    const isSelected = selectedConstItem && (
                      isArticle
                        ? selectedConstItem.articleNumber === item.articleNumber
                        : selectedConstItem.ruleNumber === item.ruleNumber && selectedConstItem.statuteCode === item.statuteCode
                    );

                    return (
                      <div
                        key={idx}
                        onClick={() => setSelectedConstItem(item)}
                        className={`p-4 rounded-xl border transition-all cursor-pointer ${
                          isSelected
                            ? "bg-amber-500/10 border-amber-500/40 shadow-md shadow-amber-500/5"
                            : "bg-slate-900/90 border-slate-800/80 hover:bg-slate-800/50 hover:border-slate-700"
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2 mb-1.5">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                              isArticle
                                ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                                : "bg-blue-500/20 text-blue-300 border border-blue-500/30"
                            }`}
                          >
                            {isArticle ? `Article ${item.articleNumber}` : `${item.statuteCode.replace('_', ' ')} ${item.ruleNumber}`}
                          </span>
                          <span className="text-[10px] text-slate-400 truncate max-w-[140px]">
                            {isArticle ? item.part.split(':')[0] : item.category}
                          </span>
                        </div>
                        <h3 className="text-xs font-bold text-white line-clamp-1 mb-1">
                          {item.title}
                        </h3>
                        <p className="text-[11px] text-slate-400 line-clamp-2 leading-relaxed">
                          {item.content}
                        </p>
                      </div>
                    );
                  });
                })()
              )}
            </div>

            {/* Right Column: Full Statutory Provision Detail View */}
            <div className="lg:col-span-7">
              {selectedConstItem ? (
                <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 shadow-xl space-y-5">
                  {/* Item Header */}
                  <div className="border-b border-slate-800 pb-4 space-y-2">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span
                        className={`px-2.5 py-1 rounded-lg text-xs font-bold tracking-wide ${
                          selectedConstItem.articleNumber
                            ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/40"
                            : "bg-blue-500/20 text-blue-300 border border-blue-500/40"
                        }`}
                      >
                        {selectedConstItem.articleNumber
                          ? `Constitution of Pakistan, 1973 - Article ${selectedConstItem.articleNumber}`
                          : `${selectedConstItem.statuteName} - ${selectedConstItem.ruleNumber}`}
                      </span>

                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => {
                            navigator.clipboard.writeText(
                              `${selectedConstItem.articleNumber ? `Constitution of Pakistan (1973) - Article ${selectedConstItem.articleNumber}` : `${selectedConstItem.statuteName} - ${selectedConstItem.ruleNumber}`}\n` +
                              `${selectedConstItem.title}\n\n` +
                              `${selectedConstItem.content}\n\n` +
                              (selectedConstItem.explanation ? `Explanation: ${selectedConstItem.explanation}` : '')
                            );
                            setCopiedConst(true);
                            setTimeout(() => setCopiedConst(false), 2000);
                          }}
                          className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium flex items-center gap-1.5 transition-colors cursor-pointer"
                        >
                          {copiedConst ? (
                            <>
                              <Check className="w-3.5 h-3.5 text-emerald-400" />
                              <span className="text-emerald-400">Copied</span>
                            </>
                          ) : (
                            <>
                              <Copy className="w-3.5 h-3.5 text-slate-400" />
                              <span>Copy Statutory Text</span>
                            </>
                          )}
                        </button>

                        <button
                          onClick={() => handleAskGrokAboutArticle(selectedConstItem)}
                          className="px-3 py-1.5 rounded-lg bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 text-xs font-bold flex items-center gap-1.5 shadow-md shadow-amber-500/20 transition-all cursor-pointer"
                        >
                          <Sparkles className="w-3.5 h-3.5 text-slate-950" />
                          <span>Analyze with Grok AI</span>
                        </button>
                      </div>
                    </div>

                    <h2 className="text-base font-bold text-white tracking-tight">
                      {selectedConstItem.title}
                    </h2>
                    <div className="flex flex-wrap gap-2 text-xs text-slate-400">
                      {selectedConstItem.part && (
                        <span className="px-2 py-0.5 bg-slate-950 rounded text-slate-400 border border-slate-800">
                          {selectedConstItem.part}
                        </span>
                      )}
                      {selectedConstItem.chapter && (
                        <span className="px-2 py-0.5 bg-slate-950 rounded text-slate-400 border border-slate-800">
                          {selectedConstItem.chapter}
                        </span>
                      )}
                      {selectedConstItem.category && (
                        <span className="px-2 py-0.5 bg-slate-950 rounded text-slate-400 border border-slate-800">
                          Category: {selectedConstItem.category}
                        </span>
                      )}
                      {selectedConstItem.courtType && (
                        <span className="px-2 py-0.5 bg-slate-950 rounded text-slate-400 border border-slate-800">
                          Jurisdiction: {selectedConstItem.courtType}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Verbatim Content */}
                  <div className="space-y-1.5">
                    <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider flex items-center justify-between">
                      <span>Verbatim Statutory Text (Local Database Record):</span>
                      <span className="text-emerald-400 font-mono text-[10px] flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                        Grounded &amp; Verified
                      </span>
                    </span>
                    <div className="text-xs text-slate-200 bg-slate-950 p-4 rounded-xl border border-slate-800 leading-relaxed font-sans whitespace-pre-wrap select-text">
                      {selectedConstItem.content}
                    </div>
                  </div>

                  {/* Legal Explanation / Notes */}
                  {(selectedConstItem.explanation || selectedConstItem.notes) && (
                    <div className="space-y-1.5">
                      <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider block">
                        Legal Doctrine &amp; Judicial Practice Explanation:
                      </span>
                      <div className="text-xs text-slate-300 bg-slate-950/70 p-4 rounded-xl border border-slate-800/80 leading-relaxed">
                        {selectedConstItem.explanation || selectedConstItem.notes}
                      </div>
                    </div>
                  )}

                  {/* Amendment Notes if available */}
                  {selectedConstItem.amendmentNotes && (
                    <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-300">
                      <strong>Constitutional History:</strong> {selectedConstItem.amendmentNotes}
                    </div>
                  )}

                  {/* Key Topics & Cross References */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-slate-800">
                    {selectedConstItem.keyTopics?.length > 0 && (
                      <div>
                        <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider block mb-1.5">
                          Key Legal Doctrines:
                        </span>
                        <div className="flex flex-wrap gap-1.5">
                          {selectedConstItem.keyTopics.map((topic: string, i: number) => (
                            <span
                              key={i}
                              className="px-2 py-0.5 rounded-md bg-slate-950 border border-slate-800 text-[11px] text-slate-300"
                            >
                              {topic}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    {selectedConstItem.crossReferences?.length > 0 && (
                      <div>
                        <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider block mb-1.5">
                          Cross References:
                        </span>
                        <div className="flex flex-wrap gap-1.5">
                          {selectedConstItem.crossReferences.map((ref: string, i: number) => (
                            <span
                              key={i}
                              onClick={() => {
                                setConstQuery(ref);
                                loadConstitutionData(ref);
                              }}
                              className="px-2 py-0.5 rounded-md bg-amber-500/10 border border-amber-500/20 text-[11px] text-amber-300 hover:bg-amber-500/20 cursor-pointer transition-colors"
                            >
                              {ref}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div className="p-12 text-center rounded-2xl bg-slate-900 border border-slate-800 text-slate-500 text-xs">
                  Select an article or statutory rule from the left column to view full text and legal explanation.
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: Precedent Hierarchy Database (Articles 189 & 201) */}
      {activeTab === "precedents" && (
        <div className="space-y-6">
          {/* Search & Hierarchy Filter Bar */}
          <form
            onSubmit={handleSearchPrecedents}
            className="p-4 rounded-2xl bg-slate-900 border border-slate-800 shadow-md flex flex-col md:flex-row items-center gap-3"
          >
            <div className="relative flex-1 w-full">
              <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search citation (e.g. '2024 SCMR 150', 'PLD'), statutory section, or legal issue..."
                className="w-full bg-slate-950 border border-slate-800 text-slate-100 placeholder-slate-500 text-xs rounded-xl pl-9 pr-4 py-2.5 focus:outline-none focus:border-amber-400"
              />
            </div>

            <div className="flex items-center space-x-2 w-full md:w-auto">
              <select
                value={courtFilter}
                onChange={(e) => setCourtFilter(e.target.value)}
                className="bg-slate-950 border border-slate-800 text-slate-300 text-xs rounded-xl px-3 py-2.5 focus:outline-none focus:border-amber-400"
              >
                <option value="">All Precedent Courts</option>
                <option value="SUPREME_COURT">Supreme Court of Pakistan</option>
                <option value="HIGH_COURT_SINDH">High Court of Sindh</option>
                <option value="HIGH_COURT_LAHORE">Lahore High Court</option>
                <option value="HIGH_COURT_ISLAMABAD">Islamabad High Court</option>
                <option value="HIGH_COURT_PESHAWAR">Peshawar High Court</option>
                <option value="HIGH_COURT_BALOCHISTAN">Balochistan High Court</option>
              </select>

              <div className="flex items-center space-x-1.5 text-xs text-slate-400 shrink-0">
                <span>Evaluating for:</span>
                <select
                  value={targetCourt}
                  onChange={(e) => setTargetCourt(e.target.value as any)}
                  className="bg-slate-950 border border-slate-800 text-amber-300 text-xs rounded-xl px-2.5 py-2.5 focus:outline-none focus:border-amber-400 font-semibold"
                >
                  <option value="HIGH_COURT_SINDH">High Court of Sindh</option>
                  <option value="HIGH_COURT_LAHORE">Lahore High Court</option>
                  <option value="SUPREME_COURT">Supreme Court</option>
                  <option value="HIGH_COURT_ISLAMABAD">Islamabad High Court</option>
                  <option value="HIGH_COURT_PESHAWAR">Peshawar High Court</option>
                  <option value="HIGH_COURT_BALOCHISTAN">Balochistan High Court</option>
                </select>
              </div>

              <button
                type="submit"
                disabled={isPending}
                className="px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs transition-colors shadow-md disabled:opacity-50 cursor-pointer"
              >
                {isPending ? "Searching..." : "Research"}
              </button>
            </div>
          </form>

          {/* Research Gap Alert */}
          {hasResearchGaps && (
            <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-200 text-xs flex items-start space-x-3">
              <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
              <div>
                <span className="font-bold">Constitutional Research Gap Warning: </span>
                <span>{gapNotice}</span>
              </div>
            </div>
          )}

          {/* Two-Column Precedent Explorer */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Left 5 Cols: Results List */}
            <div className="lg:col-span-5 space-y-3">
              <div className="flex items-center justify-between text-xs text-slate-400 px-1">
                <span>Showing {precedents.length} Precedent Authorities</span>
                <span className="font-mono text-[11px]">Evaluated for {targetCourt.replace(/_/g, " ")}</span>
              </div>

              {precedents.length === 0 ? (
                <div className="p-8 text-center rounded-2xl bg-slate-900 border border-slate-800 text-slate-500 text-xs">
                  No legal precedents found matching your search parameters.
                </div>
              ) : (
                precedents.map((p) => {
                  const isSelected = selectedPrecedent?.id === p.id;
                  const isBinding = p.effectiveAuthority === "BINDING";

                  return (
                    <div
                      key={p.id}
                      onClick={() => setSelectedPrecedent(p)}
                      className={`p-4 rounded-2xl border transition-all cursor-pointer ${
                        isSelected
                          ? "bg-slate-900 border-amber-400/80 shadow-lg shadow-amber-400/5 ring-1 ring-amber-400/50"
                          : "bg-slate-900/60 border-slate-800 hover:border-slate-700 hover:bg-slate-900"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2 mb-1.5">
                        <span className="font-mono text-xs font-bold text-amber-400">
                          {p.citation}
                        </span>
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                            isBinding
                              ? "bg-emerald-500/10 text-emerald-300 border-emerald-500/20"
                              : "bg-amber-500/10 text-amber-300 border-amber-500/20"
                          }`}
                        >
                          {p.effectiveAuthority}
                        </span>
                      </div>

                      <h4 className="text-xs font-semibold text-slate-100 line-clamp-2 mb-1.5">
                        {p.title}
                      </h4>

                      <div className="flex flex-wrap items-center gap-2 text-[11px] text-slate-400 mb-2">
                        <span>{p.court.replace(/_/g, " ")}</span>
                        <span>&bull;</span>
                        <span>{p.bench}</span>
                        <span>&bull;</span>
                        <span>{p.decisionYear}</span>
                      </div>

                      {p.statutoryProvisions.length > 0 && (
                        <div className="flex flex-wrap gap-1">
                          {p.statutoryProvisions.slice(0, 3).map((s, idx) => (
                            <span
                              key={idx}
                              className="px-1.5 py-0.2 rounded bg-slate-950 border border-slate-800 text-[10px] font-mono text-slate-300"
                            >
                              {s}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>

            {/* Right 7 Cols: Detailed Authority Dossier */}
            <div className="lg:col-span-7">
              {selectedPrecedent ? (
                <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 shadow-xl space-y-5">
                  <div className="border-b border-slate-800 pb-4">
                    <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                      <span className="font-mono text-base font-bold text-amber-400">
                        {selectedPrecedent.citation}
                      </span>
                      <div className="flex items-center space-x-2">
                        <span
                          className={`px-2.5 py-0.5 rounded-full text-xs font-bold border ${
                            selectedPrecedent.effectiveAuthority === "BINDING"
                              ? "bg-emerald-500/10 text-emerald-300 border-emerald-500/20"
                              : "bg-amber-500/10 text-amber-300 border-amber-500/20"
                          }`}
                        >
                          {selectedPrecedent.effectiveAuthority} AUTHORITY
                        </span>
                        <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-slate-800 text-slate-300 border border-slate-700">
                          {selectedPrecedent.status}
                        </span>
                      </div>
                    </div>

                    <h3 className="text-sm font-bold text-slate-100">
                      {selectedPrecedent.title}
                    </h3>

                    <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-400 mt-2">
                      <span>Court: <strong>{selectedPrecedent.court.replace(/_/g, " ")}</strong></span>
                      <span>Bench: <strong>{selectedPrecedent.bench}</strong></span>
                      <span>Year: <strong>{selectedPrecedent.decisionYear}</strong></span>
                    </div>
                  </div>

                  {/* Constitutional Authority Reasoning */}
                  <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 text-xs space-y-1">
                    <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider block">
                      Constitutional Precedential Basis:
                    </span>
                    <p className="text-slate-300 font-medium">{selectedPrecedent.authorityReasoning}</p>
                  </div>

                  {/* Statutory Provisions */}
                  {selectedPrecedent.statutoryProvisions.length > 0 && (
                    <div>
                      <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider block mb-1.5">
                        Statutory Provisions Interpreted:
                      </span>
                      <div className="flex flex-wrap gap-1.5">
                        {selectedPrecedent.statutoryProvisions.map((s, idx) => (
                          <span
                            key={idx}
                            className="px-2 py-0.5 rounded-md bg-slate-950 border border-slate-800 text-xs font-mono text-amber-300"
                          >
                            {s}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Legal Ratio & Headnote */}
                  <div className="space-y-2">
                    <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider block">
                      Legal Ratio &amp; Headnote:
                    </span>
                    <div className="text-xs text-slate-300 bg-slate-950 p-4 rounded-xl border border-slate-800 leading-relaxed whitespace-pre-wrap font-sans">
                      {selectedPrecedent.headnote}
                    </div>
                  </div>

                  {/* Summary */}
                  <div className="space-y-1.5">
                    <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider block">
                      Chambers Practice Summary:
                    </span>
                    <div className="text-xs text-slate-400 leading-relaxed">
                      {selectedPrecedent.summary}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="p-12 text-center rounded-2xl bg-slate-900 border border-slate-800 text-slate-500 text-xs">
                  Select a precedent from the left column to view full case ratio, bench composition, and authority analysis.
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
