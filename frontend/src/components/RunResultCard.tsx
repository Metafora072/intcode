import { SubmissionResult } from "../types";

const statusColor: Record<string, string> = {
  AC: "text-easy",
  WA: "text-hard",
  RE: "text-hard",
  TLE: "text-medium",
  CE: "text-hard",
  UNKNOWN: "text-slate-600"
};

const RunResultCard = ({ result }: { result: SubmissionResult | null }) => {
  if (!result) return null;
  return (
    <div className="card p-4 mt-4">
      <div className="flex items-center justify-between">
        <div className={`text-lg font-semibold ${statusColor[result.status] || "text-slate-700"}`}>
          结果：{result.status}
        </div>
        <div className="text-sm text-slate-500">耗时：{result.runtime_ms.toFixed(2)} ms</div>
      </div>
      {result.compile_error && <pre className="mt-3 text-sm text-red-600 whitespace-pre-wrap">{result.compile_error}</pre>}
      {result.runtime_error && <pre className="mt-3 text-sm text-orange-600 whitespace-pre-wrap">{result.runtime_error}</pre>}
      <div className="mt-3 space-y-2">
        {result.cases.map((c) => (
          <div key={c.case_id} className="p-3 bg-slate-50 rounded-lg border border-slate-200">
            <div className="flex justify-between text-sm">
              <span className="font-medium">用例 {c.case_id}</span>
              <span className={`font-semibold ${statusColor[c.status] || "text-slate-700"}`}>{c.status}</span>
            </div>
            {c.error && <p className="text-xs text-red-600 mt-1">{c.error}</p>}
            <div className="grid grid-cols-3 gap-2 text-xs mt-2">
              <div>
                <p className="text-slate-500">输入</p>
                <pre className="whitespace-pre-wrap bg-white p-2 rounded border border-slate-200 h-24 overflow-auto">
                  {c.input_preview}
                </pre>
              </div>
              <div>
                <p className="text-slate-500">期望</p>
                <pre className="whitespace-pre-wrap bg-white p-2 rounded border border-slate-200 h-24 overflow-auto">
                  {c.expected_preview}
                </pre>
              </div>
              <div>
                <p className="text-slate-500">输出</p>
                <pre className="whitespace-pre-wrap bg-white p-2 rounded border border-slate-200 h-24 overflow-auto">
                  {c.full_output ?? c.output_preview}
                </pre>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default RunResultCard;
