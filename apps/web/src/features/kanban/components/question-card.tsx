"use client";

import { CheckIcon, Loader2Icon, MessageSquareIcon, XIcon } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { cn } from "@/lib/utils";

export interface QuestionOption {
  description: string;
  label: string;
}

export interface QuestionInfo {
  custom?: boolean;
  header: string;
  multiple?: boolean;
  options: QuestionOption[];
  question: string;
}

interface PendingQuestion {
  id: string;
  questions: QuestionInfo[];
  sessionID: string;
}

interface QuestionCardProps {
  sessionID: string;
}

export function QuestionCard({ sessionID }: QuestionCardProps) {
  const [questions, setQuestions] = useState<PendingQuestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Record<number, number[]>>({});
  const [customAnswers, setCustomAnswers] = useState<Record<number, string>>(
    {}
  );
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function fetchQuestions() {
      try {
        const res = await fetch(`/api/tasks/${sessionID}/questions`);
        const data = await res.json();
        if (!cancelled) {
          setQuestions(data.questions ?? []);
        }
      } catch {
        if (!cancelled) {
          setQuestions([]);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    fetchQuestions();
    return () => {
      cancelled = true;
    };
  }, [sessionID]);

  const handleOptionToggle = useCallback(
    (qIndex: number, oIndex: number, _multiple?: boolean) => {
      setSelected((prev) => {
        const current = prev[qIndex] ?? [];
        if (_multiple) {
          const next = current.includes(oIndex)
            ? current.filter((i) => i !== oIndex)
            : [...current, oIndex];
          return { ...prev, [qIndex]: next };
        }
        return { ...prev, [qIndex]: [oIndex] };
      });
    },
    []
  );

  const handleCustomChange = useCallback((qIndex: number, value: string) => {
    setCustomAnswers((prev) => ({ ...prev, [qIndex]: value }));
  }, []);

  const handleSubmit = useCallback(
    async (question: PendingQuestion) => {
      setSubmitting(true);
      try {
        const answers = question.questions.map((_q, qIndex) => ({
          questionIndex: qIndex,
          optionIndices: selected[qIndex] ?? [],
          customAnswer: customAnswers[qIndex] || undefined,
        }));

        await fetch(`/api/tasks/${sessionID}/questions/${question.id}/reply`, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ answers }),
        });
      } catch {
        // Error will be handled by event stream
      } finally {
        setSubmitting(false);
      }
    },
    [sessionID, selected, customAnswers]
  );

  const handleReject = useCallback(
    async (question: PendingQuestion) => {
      setSubmitting(true);
      try {
        await fetch(`/api/tasks/${sessionID}/questions/${question.id}/reject`, {
          method: "POST",
        });
      } catch {
        // Error will be handled by event stream
      } finally {
        setSubmitting(false);
      }
    },
    [sessionID]
  );

  if (loading) {
    return (
      <div className="flex items-center gap-2 rounded-xs border border-white/5 bg-white/2 px-3 py-2">
        <Loader2Icon className="size-3 animate-spin text-white/30" />
        <span className="text-[0.7rem] text-white/30">Loading question…</span>
      </div>
    );
  }

  if (questions.length === 0) {
    return null;
  }

  return (
    <div className="flex flex-col gap-2">
      {questions.map((q) =>
        q.questions.map((qi, qiIdx) => {
          const questionKey = `${q.id}-q${qiIdx}-${qi.header}`;
          return (
            <div
              className="flex flex-col gap-2 rounded-xs border border-amber-500/10 bg-amber-500/[0.03] px-3 py-2.5"
              key={questionKey}
            >
              <div className="flex items-start gap-2">
                <MessageSquareIcon className="mt-0.5 size-3 shrink-0 text-amber-400/60" />
                <div className="min-w-0 flex-1">
                  <span className="font-medium font-mono text-[0.6rem] text-amber-400/50 uppercase tracking-wider">
                    {qi.header}
                  </span>
                  <p className="mt-0.5 text-[0.72rem] text-white/60 leading-relaxed">
                    {qi.question}
                  </p>
                </div>
              </div>

              {qi.options.length > 0 && (
                <div className="flex flex-col gap-1 pl-5">
                  {qi.options.map((opt, oIdx) => {
                    const isSelected = (selected[qiIdx] ?? []).includes(oIdx);
                    return (
                      <button
                        className={cn(
                          "flex items-start gap-2 rounded-xs border px-2.5 py-1.5 text-left transition-colors",
                          isSelected
                            ? "border-amber-500/30 bg-amber-500/10"
                            : "border-white/5 bg-white/2 hover:bg-white/5"
                        )}
                        key={`${q.id}-${qi.header}-opt-${opt.label}`}
                        onClick={() =>
                          handleOptionToggle(qiIdx, oIdx, qi.multiple)
                        }
                        type="button"
                      >
                        <span
                          className={cn(
                            "mt-0.5 flex size-3.5 shrink-0 items-center justify-center rounded-sm border",
                            isSelected
                              ? "border-amber-500/50 bg-amber-500/20 text-amber-400"
                              : "border-white/10 text-transparent"
                          )}
                        >
                          <CheckIcon className="size-2.5" />
                        </span>
                        <div className="min-w-0 flex-1">
                          <span className="font-medium text-[0.7rem] text-white/70">
                            {opt.label}
                          </span>
                          {opt.description && (
                            <p className="text-[0.62rem] text-white/35">
                              {opt.description}
                            </p>
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}

              {qi.custom !== false && (
                <textarea
                  className="w-full resize-none rounded-xs border border-white/5 bg-white/2 px-2.5 py-1.5 font-mono text-[0.68rem] text-white/60 placeholder:text-white/20 focus:border-amber-500/30 focus:outline-none focus:ring-1 focus:ring-amber-500/20"
                  onChange={(e) => handleCustomChange(qiIdx, e.target.value)}
                  placeholder="Type a custom answer…"
                  rows={2}
                  value={customAnswers[qiIdx] ?? ""}
                />
              )}

              <div className="flex items-center justify-end gap-1.5 pt-0.5">
                <button
                  className={cn(
                    "flex items-center gap-1 rounded-xs border px-2.5 py-1.5 font-medium text-[0.65rem] transition-colors",
                    submitting
                      ? "cursor-not-allowed border-white/5 bg-white/5 text-white/20"
                      : "border-rose-500/15 bg-rose-500/10 text-rose-400 hover:bg-rose-500/20"
                  )}
                  disabled={submitting}
                  onClick={() => handleReject(q)}
                  title="Skip question"
                  type="button"
                >
                  <XIcon className="size-3" />
                  Skip
                </button>
                <button
                  className={cn(
                    "flex items-center gap-1 rounded-xs border px-2.5 py-1.5 font-medium text-[0.65rem] transition-colors",
                    submitting
                      ? "cursor-not-allowed border-white/5 bg-white/5 text-white/20"
                      : "border-emerald-500/15 bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20"
                  )}
                  disabled={submitting}
                  onClick={() => handleSubmit(q)}
                  title="Submit answer"
                  type="button"
                >
                  <CheckIcon className="size-3" />
                  {submitting ? "Sending" : "Answer"}
                </button>
              </div>
            </div>
          );
        })
      )}
    </div>
  );
}
