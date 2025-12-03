import { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import ReactMarkdown from "react-markdown";
import { fetchProblem, submitCode } from "../api";
import { Problem, SubmissionResult } from "../types";
import DifficultyBadge from "../components/DifficultyBadge";
import CodeEditor from "../components/CodeEditor";
import RunResultCard from "../components/RunResultCard";

const templates: Record<string, string> = {
  cpp17: `#include <bits/stdc++.h>
using namespace std;

int main(){
    ios::sync_with_stdio(false);
    cin.tie(nullptr);
    int n;
    if(!(cin>>n)) return 0;
    vector<int> nums(n);
    for(int i = 0; i < n; i++){
        cin>>nums[i];
    }
    int target;
    cin>>target;
    unordered_map<int,int> mp;
    for(int i = 0; i < n; i++){
        int need = target - nums[i];
        if(mp.count(need)){
            cout<<mp[need]<<" "<<i<<"\\n";
            return 0;
        }
        mp[nums[i]] = i;
    }
    return 0;
}
`,
  python3: `from collections import defaultdict

def main():
    import sys
    data = sys.stdin.read().strip().split()
    if not data:
        return
    it = iter(data)
    n = int(next(it))
    nums = [int(next(it)) for _ in range(n)]
    target = int(next(it))
    pos = {}
    for idx, v in enumerate(nums):
        need = target - v
        if need in pos:
            print(pos[need], idx)
            return
        pos[v] = idx

if __name__ == "__main__":
    main()
`
};

const ProblemDetailPage = () => {
  const { id } = useParams();
  const [problem, setProblem] = useState<Problem | null>(null);
  const [language, setLanguage] = useState<"cpp17" | "python3">("cpp17");
  const [code, setCode] = useState<string>(templates.cpp17);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<SubmissionResult | null>(null);

  useEffect(() => {
    if (id) {
      fetchProblem(Number(id)).then((data) => {
        setProblem(data);
      });
    }
  }, [id]);

  useEffect(() => {
    setCode(templates[language]);
  }, [language]);

  const sampleCases = useMemo(() => problem?.testcases.filter((t) => t.is_sample) ?? [], [problem]);

  const handleRun = async (mode: "run_sample" | "submit") => {
    if (!problem) return;
    setLoading(true);
    try {
        const res = await submitCode({
            problem_id: problem.id,
            language,
            code,
            mode
        });
        setResult(res);
    } catch (err: any) {
        setResult({
            status: "ERROR",
            runtime_ms: 0,
            runtime_error: err?.message ?? "运行失败",
            compile_error: null,
            cases: []
        });
    } finally {
        setLoading(false);
    }
  };

  if (!problem) {
    return <p className="text-sm text-slate-500">加载中...</p>;
  }

  return (
    <div className="grid lg:grid-cols-2 gap-4">
      <div className="space-y-4">
        <div className="card p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-slate-500">{problem.slug}</p>
              <h1 className="text-2xl font-bold text-slate-800">{problem.title}</h1>
            </div>
            <DifficultyBadge level={problem.difficulty} />
          </div>
          <div className="mt-3 flex gap-2 flex-wrap text-xs">
            {problem.tags.map((tag) => (
              <span key={tag} className="px-2 py-1 rounded-full bg-slate-100 text-slate-700">
                {tag}
              </span>
            ))}
          </div>
        </div>
        <div className="card p-5 prose prose-slate max-w-none">
          <ReactMarkdown>{problem.content}</ReactMarkdown>
          <h4>输入说明</h4>
          <p>{problem.input_description}</p>
          <h4>输出说明</h4>
          <p>{problem.output_description}</p>
          {problem.constraints && (
            <>
              <h4>约束</h4>
              <p>{problem.constraints}</p>
            </>
          )}
          {sampleCases.length > 0 && (
            <>
              <h4>样例</h4>
              <div className="space-y-2">
                {sampleCases.map((tc) => (
                  <div key={tc.id} className="border border-slate-200 rounded-lg p-3 bg-slate-50">
                    <p className="text-xs text-slate-500 mb-1">输入</p>
                    <pre className="bg-white p-2 rounded border border-slate-200 whitespace-pre-wrap">
                      {tc.input_text}
                    </pre>
                    <p className="text-xs text-slate-500 mt-2 mb-1">输出</p>
                    <pre className="bg-white p-2 rounded border border-slate-200 whitespace-pre-wrap">
                      {tc.output_text}
                    </pre>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>
      <div className="space-y-3">
        <div className="card p-4 space-y-3">
          <div className="flex items-center gap-3">
            <select
              className="px-3 py-2 rounded-lg border border-slate-200 bg-white"
              value={language}
              onChange={(e) => setLanguage(e.target.value as "cpp17" | "python3")}
            >
              <option value="cpp17">C++17</option>
              <option value="python3">Python 3</option>
            </select>
            <div className="text-sm text-slate-500">在线编辑代码，支持基础高亮</div>
          </div>
          <CodeEditor language={language === "cpp17" ? "cpp" : "python"} value={code} onChange={setCode} />
          <div className="flex gap-3">
            <button
              className="btn bg-slate-900 text-white hover:bg-slate-800 disabled:opacity-50"
              onClick={() => handleRun("run_sample")}
              disabled={loading}
            >
              {loading ? "运行中..." : "运行样例"}
            </button>
            <button
              className="btn bg-indigo-600 text-white hover:bg-indigo-500 disabled:opacity-50"
              onClick={() => handleRun("submit")}
              disabled={loading}
            >
              {loading ? "提交中..." : "提交评测"}
            </button>
          </div>
        </div>
        <RunResultCard result={result} />
      </div>
    </div>
  );
};

export default ProblemDetailPage;
