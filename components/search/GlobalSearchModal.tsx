"use client";

import React, { useState, useEffect, useRef, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  Search,
  X,
  FileText,
  Users,
  Building,
  ArrowRight,
  ShieldAlert,
  Loader2,
  CornerDownLeft,
} from "lucide-react";
import { searchLitigationAction } from "@/lib/search/actions";
import { SearchResultItem } from "@/lib/search/global-search";

interface GlobalSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
}

type FilterTab = "ALL" | "CASE" | "PARTY" | "CLIENT";

export function GlobalSearchModal({ isOpen, onClose }: GlobalSearchModalProps) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResultItem[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [activeTab, setActiveTab] = useState<FilterTab>("ALL");
  const [isPending, startTransition] = useTransition();
  const inputRef = useRef<HTMLInputElement>(null);

  // Focus input when opened
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => {
        inputRef.current?.focus();
      }, 50);
    } else {
      setQuery("");
      setResults([]);
      setSelectedIndex(0);
    }
  }, [isOpen]);

  // Debounced search on query change
  useEffect(() => {
    if (!isOpen) return;

    const trimmed = query.trim();
    if (trimmed.length < 2) {
      setResults([]);
      return;
    }

    const timer = setTimeout(() => {
      startTransition(async () => {
        try {
          const resp = await searchLitigationAction(trimmed);
          setResults(resp.results || []);
          setSelectedIndex(0);
        } catch {
          setResults([]);
        }
      });
    }, 200);

    return () => clearTimeout(timer);
  }, [query, isOpen]);

  // Global Ctrl+K / Cmd+K / Esc keyboard listeners
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        if (isOpen) {
          onClose();
        }
      }

      if (!isOpen) return;

      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
      } else if (e.key === "ArrowDown") {
        e.preventDefault();
        setSelectedIndex((prev) => (filteredResults.length === 0 ? 0 : (prev + 1) % filteredResults.length));
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setSelectedIndex((prev) => (filteredResults.length === 0 ? 0 : (prev - 1 + filteredResults.length) % filteredResults.length));
      } else if (e.key === "Enter") {
        e.preventDefault();
        if (filteredResults[selectedIndex]) {
          handleSelect(filteredResults[selectedIndex]);
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  });

  const filteredResults = results.filter((r) => {
    if (activeTab === "ALL") return true;
    return r.type === activeTab;
  });

  const handleSelect = (item: SearchResultItem) => {
    onClose();
    if (item.url) {
      router.push(item.url);
    }
  };

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="global-search-heading"
      className="fixed inset-0 z-50 flex items-start justify-center pt-16 sm:pt-24 px-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="w-full max-w-2xl bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[80vh]">
        {/* Top Input Bar */}
        <div className="relative flex items-center px-4 py-3 border-b border-slate-800 bg-slate-950/50">
          <Search className="w-5 h-5 text-slate-400 mr-3 flex-shrink-0" />
          <input
            ref={inputRef}
            id="global-search-heading"
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search cases, case numbers, parties, or clients..."
            className="w-full bg-transparent text-sm sm:text-base text-white placeholder-slate-500 focus:outline-none"
          />
          {isPending && <Loader2 className="w-4 h-4 text-amber-400 animate-spin mr-2" />}
          {query && (
            <button
              onClick={() => setQuery("")}
              className="p-1 text-slate-500 hover:text-slate-300 rounded"
              title="Clear search"
            >
              <X className="w-4 h-4" />
            </button>
          )}
          <kbd className="hidden sm:inline-block ml-2 text-[10px] font-mono text-slate-500 bg-slate-800 px-2 py-0.5 rounded border border-slate-700">
            ESC
          </kbd>
        </div>

        {/* Filter Tabs */}
        {results.length > 0 && (
          <div className="flex items-center space-x-1 px-4 py-2 border-b border-slate-800/80 bg-slate-900/60 text-xs">
            {(
              [
                { id: "ALL", label: `All (${results.length})` },
                { id: "CASE", label: `Cases (${results.filter((r) => r.type === "CASE").length})` },
                { id: "PARTY", label: `Parties (${results.filter((r) => r.type === "PARTY").length})` },
                { id: "CLIENT", label: `Clients (${results.filter((r) => r.type === "CLIENT").length})` },
              ] as const
            ).map((tab) => (
              <button
                key={tab.id}
                onClick={() => {
                  setActiveTab(tab.id);
                  setSelectedIndex(0);
                }}
                className={`px-2.5 py-1 rounded-lg font-medium transition-colors ${
                  activeTab === tab.id
                    ? "bg-amber-400/20 text-amber-300 border border-amber-400/30"
                    : "text-slate-400 hover:text-slate-200 hover:bg-slate-800"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        )}

        {/* Results Body */}
        <div className="overflow-y-auto flex-1 p-2 space-y-1">
          {query.trim().length >= 2 && filteredResults.length === 0 && !isPending && (
            <div className="p-8 text-center text-slate-400">
              <ShieldAlert className="w-8 h-8 text-slate-500 mx-auto mb-2" />
              <p className="text-sm font-medium text-slate-300">No matching litigation records found</p>
              <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                All searches run under strict Row-Level Security. Restricted cases and unassigned matters are isolated from unauthorized queries.
              </p>
            </div>
          )}

          {query.trim().length < 2 && (
            <div className="p-8 text-center text-slate-500">
              <p className="text-xs font-mono">
                Type at least 2 characters to search across Pakistani High Courts, Supreme Court matters, and Chambers clients.
              </p>
            </div>
          )}

          {filteredResults.map((item, index) => {
            const isSelected = index === selectedIndex;
            return (
              <div
                key={`${item.type}-${item.id}-${index}`}
                onClick={() => handleSelect(item)}
                onMouseEnter={() => setSelectedIndex(index)}
                className={`flex items-center justify-between p-3 rounded-xl cursor-pointer transition-colors ${
                  isSelected
                    ? "bg-amber-400/10 border border-amber-400/30"
                    : "hover:bg-slate-800/60 border border-transparent"
                }`}
              >
                <div className="flex items-start space-x-3 min-w-0 flex-1">
                  <div
                    className={`p-2 rounded-lg mt-0.5 ${
                      item.type === "CASE"
                        ? "bg-blue-500/10 text-blue-400"
                        : item.type === "PARTY"
                        ? "bg-purple-500/10 text-purple-400"
                        : "bg-emerald-500/10 text-emerald-400"
                    }`}
                  >
                    {item.type === "CASE" ? (
                      <FileText className="w-4 h-4" />
                    ) : item.type === "PARTY" ? (
                      <Users className="w-4 h-4" />
                    ) : (
                      <Building className="w-4 h-4" />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center space-x-2">
                      <span className="text-sm font-semibold text-white truncate">
                        {item.title}
                      </span>
                      {item.badge && (
                        <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">
                          {item.badge}
                        </span>
                      )}
                    </div>
                    <p
                      className="text-xs text-slate-400 truncate mt-0.5"
                      dangerouslySetInnerHTML={{ __html: item.subtitle }}
                    />
                  </div>
                </div>

                <div className="flex items-center space-x-2 pl-3">
                  {isSelected && (
                    <span className="hidden sm:flex items-center text-[10px] text-amber-400 font-mono">
                      Jump <CornerDownLeft className="w-3 h-3 ml-1" />
                    </span>
                  )}
                  <ArrowRight className={`w-4 h-4 text-slate-500 ${isSelected ? "text-amber-400" : ""}`} />
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer info */}
        <div className="px-4 py-2 border-t border-slate-800 bg-slate-950/60 flex items-center justify-between text-[11px] text-slate-500 font-mono">
          <div className="flex items-center space-x-3">
            <span>&uarr;&darr; Navigate</span>
            <span>&crarr; Select</span>
            <span>ESC Close</span>
          </div>
          <span className="text-emerald-400/80">RLS-Enforced Isolation</span>
        </div>
      </div>
    </div>
  );
}
