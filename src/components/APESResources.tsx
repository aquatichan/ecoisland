// @ts-nocheck
import React from "react";
import { ArrowLeft, Lightbulb, Globe2, ExternalLink, ClipboardList, PieChart } from "lucide-react";

type Resources = {
  tips_and_tricks: string[];
  helpful_websites: { name: string; note?: string; url?: string }[];
  exam_structure?: {
    multiple_choice: { questions: number; minutes: number; weight: string; note?: string };
    free_response: { questions: number; minutes: number; weight: string; types: string[]; note?: string };
  };
  unit_weights?: { unit: number; title: string; examWeight: string }[];
};

export default function APESResources({ resources, onExit }: { resources: Resources | null; onExit: () => void }) {
  return (
    <div className="page-root">
      <div className="max-w-4xl mx-auto">
        <button onClick={onExit} className="flex items-center gap-2 mb-6 text-sm font-medium" style={{ color: "var(--text-faint)" }}>
          <ArrowLeft className="w-4 h-4" /> Back to Dashboard
        </button>

        <h1 className="text-3xl md:text-4xl font-black mb-2" style={{ letterSpacing: "-0.03em", color: "var(--text-primary)" }}>
          Study Resources
        </h1>
        <p className="text-base mb-8" style={{ color: "var(--text-muted)" }}>
          Exam structure, proven tips, and outside resources to round out your prep.
        </p>

        {!resources ? (
          <div className="eco-card p-10 text-center" style={{ color: "var(--text-muted)" }}>Couldn't load resources.</div>
        ) : (
          <div className="space-y-6">
            {resources.exam_structure && (
              <div className="eco-card p-6">
                <h2 className="font-black text-lg mb-4 flex items-center gap-2" style={{ color: "var(--text-primary)" }}>
                  <PieChart className="w-5 h-5" style={{ color: "#8b5cf6" }} /> Exam Structure
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="p-4 rounded-xl" style={{ background: "var(--bg-subtle)", border: "1.5px solid var(--border-card)" }}>
                    <p className="font-bold text-sm mb-1" style={{ color: "var(--text-secondary)" }}>Multiple Choice</p>
                    <p className="text-sm" style={{ color: "var(--text-muted)" }}>
                      {resources.exam_structure.multiple_choice.questions} questions · {resources.exam_structure.multiple_choice.minutes} min · {resources.exam_structure.multiple_choice.weight}
                    </p>
                    {resources.exam_structure.multiple_choice.note && (
                      <p className="text-xs mt-2" style={{ color: "var(--text-faint)" }}>{resources.exam_structure.multiple_choice.note}</p>
                    )}
                  </div>
                  <div className="p-4 rounded-xl" style={{ background: "var(--bg-subtle)", border: "1.5px solid var(--border-card)" }}>
                    <p className="font-bold text-sm mb-1" style={{ color: "var(--text-secondary)" }}>Free Response</p>
                    <p className="text-sm" style={{ color: "var(--text-muted)" }}>
                      {resources.exam_structure.free_response.questions} questions · {resources.exam_structure.free_response.minutes} min · {resources.exam_structure.free_response.weight}
                    </p>
                    <ul className="text-xs mt-2 space-y-0.5 list-disc list-inside" style={{ color: "var(--text-faint)" }}>
                      {resources.exam_structure.free_response.types?.map((t, i) => <li key={i}>{t}</li>)}
                    </ul>
                  </div>
                </div>
              </div>
            )}

            {resources.unit_weights && (
              <div className="eco-card p-6">
                <h2 className="font-black text-lg mb-4 flex items-center gap-2" style={{ color: "var(--text-primary)" }}>
                  <ClipboardList className="w-5 h-5" style={{ color: "#f59e0b" }} /> Unit Exam Weights
                </h2>
                <div className="space-y-2">
                  {resources.unit_weights.map(u => (
                    <div key={u.unit} className="flex items-center justify-between py-2" style={{ borderBottom: "1px solid var(--border-card)" }}>
                      <span className="text-sm" style={{ color: "var(--text-secondary)" }}>Unit {u.unit} — {u.title}</span>
                      <span className="text-sm font-bold" style={{ color: "#00c896" }}>{u.examWeight}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="eco-card p-6">
              <h2 className="font-black text-lg mb-4 flex items-center gap-2" style={{ color: "var(--text-primary)" }}>
                <Lightbulb className="w-5 h-5" style={{ color: "#eab308" }} /> Tips & Tricks
              </h2>
              <ul className="space-y-3">
                {resources.tips_and_tricks.map((tip, i) => (
                  <li key={i} className="flex gap-3 text-sm leading-relaxed" style={{ color: "var(--text-body)" }}>
                    <span className="flex-shrink-0 font-black" style={{ color: "#00c896" }}>{i + 1}.</span>
                    {tip}
                  </li>
                ))}
              </ul>
            </div>

            <div className="eco-card p-6">
              <h2 className="font-black text-lg mb-4 flex items-center gap-2" style={{ color: "var(--text-primary)" }}>
                <Globe2 className="w-5 h-5" style={{ color: "#06b6d4" }} /> Helpful Websites
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {resources.helpful_websites.map((site, i) => {
                  const content = (
                    <>
                      <p className="font-bold text-sm flex items-center gap-1.5" style={{ color: "var(--text-secondary)" }}>
                        {site.name} {site.url && <ExternalLink className="w-3 h-3 flex-shrink-0" />}
                      </p>
                      {site.note && <p className="text-xs mt-1" style={{ color: "var(--text-faint)" }}>{site.note}</p>}
                    </>
                  );
                  return site.url ? (
                    <a key={i} href={site.url} target="_blank" rel="noopener noreferrer" className="p-4 rounded-xl transition-colors hover:opacity-80" style={{ background: "var(--bg-subtle)", border: "1.5px solid var(--border-card)" }}>
                      {content}
                    </a>
                  ) : (
                    <div key={i} className="p-4 rounded-xl" style={{ background: "var(--bg-subtle)", border: "1.5px solid var(--border-card)" }}>
                      {content}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
