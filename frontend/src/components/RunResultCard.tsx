import { useEffect, useMemo, useState } from "react";
import { SubmissionResult } from "../types";

const statusColor: Record<string, string> = {
  AC: "text-easy",
  WA: "text-hard",
  RE: "text-hard",
  MLE: "text-hard",
  TLE: "text-medium",
  CE: "text-hard",
  OK: "text-easy",
  CUSTOM: "text-slate-600",
  UNKNOWN: "text-slate-600"
};

const caseBg: Record<string, string> = {
  AC: "bg-emerald-500",
  OK: "bg-emerald-500",
  WA: "bg-red-500",
  TLE: "bg-amber-500",
  RE: "bg-purple-500",
  MLE: "bg-purple-500",
  CE: "bg-purple-500",
  CUSTOM: "bg-slate-500"
};

const RunResultCard = ({
  result,
  loading,
  expectedCaseCount = 0
}: {
  result: SubmissionResult | null;
  loading?: boolean;
  expectedCaseCount?: number;
}) => {
  const [selectedId, setSelectedId] = useState<number | null>(null);

  useEffect(() => {
    if (result?.cases?.length) {
      setSelectedId(result.cases[0].case_id);
    } else {
      setSelectedId(null);
    }
  }, [result]);

  const selectedCase = useMemo(() => {
    if (!result || !result.cases?.length) return null;
    return result.cases.find((c) => c.case_id === selectedId) ?? result.cases[0];
  }, [result, selectedId]);

  if (!result && !loading) return null;
  const showSpinner = loading && (!result || !result.cases?.length);
  const total = result?.cases?.length ?? expectedCaseCount ?? 0;
  const passed = result?.cases?.filter((c) => c.status === "AC" || c.status === "OK").length ?? 0;
  const score = total > 0 ? Math.round((passed / total) * 100) : result?.status === "AC" ? 100 : 0;
  const placeholderCount = expectedCaseCount || result?.cases?.length || 12;
  const caseList = loading ? new Array(placeholderCount).fill(null) : result?.cases ?? [];

  return (
    <div className="card p-4 mt-4 dark:text-slate-200">
      <div className="flex items-center justify-between gap-3">
        <div className={`text-lg font-semibold ${statusColor[result?.status ?? "UNKNOWN"] || "text-slate-700"}`}>
          {loading ? "评测中..." : `结果：${result?.status ?? "未知"}`}
        </div>
        <div className="flex items-center gap-2 text-sm text-slate-500">
          {loading && <span className="w-4 h-4 border-2 border-slate-400 border-t-transparent rounded-full animate-spin" />}
          {!loading && result && <span>耗时：{result.runtime_ms.toFixed(2)} ms</span>}
          {!loading && result && total > 0 && <span>得分：{score} / 100</span>}
        </div>
      </div>
      {result?.compile_error && <pre className="mt-3 text-sm text-red-600 whitespace-pre-wrap">{result.compile_error}</pre>}
      {result?.runtime_error && <pre className="mt-3 text-sm text-orange-600 whitespace-pre-wrap">{result.runtime_error}</pre>}

      {showSpinner && (
        <div className="py-8 text-center text-slate-500 flex flex-col items-center gap-2">
          <span className="w-8 h-8 border-4 border-slate-300 border-t-transparent rounded-full animate-spin" />
          <span>正在运行全部测试用例...</span>
        </div>
      )}

      {caseList.length > 0 && (
        <>
          <div className="mt-3 flex flex-wrap gap-3">
            {caseList.map((c, idx) => {
              const caseId = c?.case_id ?? idx;
              const color = caseBg[c?.status || "UNKNOWN"] || "bg-slate-400";
              const active = caseId === selectedId;
              const tipLines: string[] = [];
              tipLines.push(`用例 #${idx + 1}`);
              if (!loading && c) {
                if (c.status === "AC" || c.status === "OK") {
                  tipLines.push("判定：Accepted");
                } else if (c.status === "WA") {
                  tipLines.push("判定：Wrong Answer");
                  if (c.error) tipLines.push(c.error);
                  tipLines.push(`输出: ${c.output_preview?.trim() || "无"}`);
                  tipLines.push(`期望: ${c.expected_preview?.trim() || "无"}`);
                } else {
                  tipLines.push(`判定：${c.status}`);
                  if (c.error) tipLines.push(c.error);
                }
              } else {
                tipLines.push("评测中...");
              }
              return (
                <div className="relative group" key={caseId}>
                  <button
                    type="button"
                    className={`w-16 h-16 rounded-lg flex items-center justify-center text-sm font-semibold text-white shadow ${color} ${
                      active ? "ring-2 ring-offset-2 ring-slate-800/50 dark:ring-white/60" : ""
                    }`}
                    onClick={() => setSelectedId(caseId)}
                    aria-label={`用例 ${idx + 1} - ${c?.status ?? "评测中"}`}
                  >
                    {loading ? (
                      <span className="w-5 h-5 border-2 border-white/70 border-t-transparent rounded-full animate-spin" />
                    ) : (
                      c?.status ?? "..."
                    )}
                  </button>
                  <div className="pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity absolute z-10 mt-2 w-56 p-3 rounded-lg bg-slate-800 text-slate-100 text-xs shadow-lg">
                    <div className="font-semibold mb-1">用例提示</div>
                    {tipLines.map((line, i) => (
                      <p key={i} className="leading-snug">
                        {line}
                      </p>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>

          {selectedCase && (
            <div className="mt-4 p-3 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-lg">
              <div className="flex justify-between text-sm">
                <div className="font-medium">
                  用例 #{result.cases.findIndex((c) => c.case_id === selectedCase.case_id) + 1}
                  <span className={`ml-2 font-semibold ${statusColor[selectedCase.status] || "text-slate-700"}`}>
                    {selectedCase.status}
                  </span>
                </div>
                <div className="text-xs text-slate-500">耗时：{selectedCase.runtime_ms.toFixed(2)} ms</div>
              </div>
              {selectedCase.error && <p className="text-xs text-red-600 mt-1">{selectedCase.error}</p>}
              <div className="grid md:grid-cols-3 gap-2 text-xs mt-2">
                <div>
                  <p className="text-slate-500 dark:text-slate-400">输入</p>
                  <pre className="whitespace-pre-wrap bg-white dark:bg-slate-950 p-2 rounded border border-slate-200 dark:border-slate-800 h-28 overflow-auto text-slate-800 dark:text-slate-200 font-mono text-xs">
                    {selectedCase.input_preview}
                  </pre>
                </div>
                <div>
                  <p className="text-slate-500 dark:text-slate-400">期望</p>
                  <pre className="whitespace-pre-wrap bg-white dark:bg-slate-950 p-2 rounded border border-slate-200 dark:border-slate-800 h-28 overflow-auto text-slate-800 dark:text-slate-200 font-mono text-xs">
                    {selectedCase.expected_preview}
                  </pre>
                </div>
                <div>
                  <p className="text-slate-500 dark:text-slate-400">输出</p>
                  <pre className="whitespace-pre-wrap bg-white dark:bg-slate-950 p-2 rounded border border-slate-200 dark:border-slate-800 h-28 overflow-auto text-slate-800 dark:text-slate-200 font-mono text-xs">
                    {selectedCase.full_output ?? selectedCase.output_preview}
                  </pre>
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default RunResultCard;
