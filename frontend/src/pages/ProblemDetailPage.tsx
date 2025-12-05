import { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import ReactMarkdown from "react-markdown";
import { Panel, PanelGroup, PanelResizeHandle } from "react-resizable-panels";
import rehypeKatex from "rehype-katex";
import remarkMath from "remark-math";
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

interface Props {
  theme: "vs-light" | "vs-dark";
}

const ProblemDetailPage = ({ theme }: Props) => {
  const { id } = useParams();
  const [problem, setProblem] = useState<Problem | null>(null);
  const [language, setLanguage] = useState<"cpp17" | "python3">("cpp17");
  const [code, setCode] = useState<string>(templates.cpp17);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<SubmissionResult | null>(null);
  const [customInput, setCustomInput] = useState("");
  const [bottomTab, setBottomTab] = useState<"custom" | "result">("result");
  const [viewMode, setViewMode] = useState<"problem" | "result">("problem");
  const [runMode, setRunMode] = useState<"run_sample" | "submit" | "custom">("run_sample");

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

  const handleRun = async (mode: "run_sample" | "submit" | "custom") => {
    if (!problem) return;
    setRunMode(mode);
    if (mode === "submit") {
      setViewMode("result");
      setResult(null);
      setBottomTab("result");
    }
    setLoading(true);
    try {
      const res = await submitCode({
        problem_id: problem.id,
        language,
        code,
        mode,
        custom_input: mode === "custom" ? customInput : undefined
      });
      setResult(res);
      setBottomTab("result");
      if (mode === "submit") {
        setViewMode("result");
      }
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
    <div className="h-full">
      <PanelGroup direction="horizontal" className="h-full gap-2">
        <Panel defaultSize={45} minSize={25} className="border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden">
          <div className="relative h-full">
            <div
              className={`absolute inset-0 overflow-y-auto p-5 space-y-4 bg-white dark:bg-slate-900 transition-opacity duration-300 ${
                viewMode === "problem" ? "opacity-100" : "opacity-0 pointer-events-none"
              }`}
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-slate-500">{problem.slug}</p>
                  <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-100">{problem.title}</h1>
                </div>
                <DifficultyBadge level={problem.difficulty} />
              </div>
            <div className="flex gap-2 flex-wrap text-xs">
              {problem.is_spj && (
                <span className="px-2 py-1 rounded-full bg-orange-100 text-orange-700 dark:bg-orange-900 dark:text-orange-100">
                  SPJ
                </span>
              )}
              {problem.tags.map((tag) => (
                <span key={tag} className="px-2 py-1 rounded-full bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200">
                  {tag}
                </span>
              ))}
              </div>
              <div className="prose prose-slate dark:prose-invert max-w-none">
                <ReactMarkdown remarkPlugins={[remarkMath]} rehypePlugins={[rehypeKatex]}>
                  {problem.content}
                </ReactMarkdown>
                <h4>输入说明</h4>
                <p>{problem.input_description}</p>
                <h4>输出说明</h4>
                <p>{problem.output_description}</p>
                {problem.constraints && (
                  <>
                    <h4>约束</h4>
                    <ReactMarkdown remarkPlugins={[remarkMath]} rehypePlugins={[rehypeKatex]}>
                      {problem.constraints}
                    </ReactMarkdown>
                  </>
                )}
                {sampleCases.length > 0 && (
                  <>
                    <h4>样例</h4>
                    <div className="space-y-3">
                      {sampleCases.map((tc) => (
                        <div key={tc.id} className="border border-slate-200 dark:border-slate-700 rounded-lg p-3 bg-slate-50 dark:bg-slate-800">
                          <div className="flex justify-between items-center">
                            <span className="text-sm font-medium text-slate-700 dark:text-slate-100">样例 #{tc.id}</span>
                            <div className="flex gap-2">
                              <button
                                className="btn border border-slate-200 dark:border-slate-600 text-xs hover:bg-slate-100 dark:hover:bg-slate-700"
                                onClick={() => navigator.clipboard.writeText(tc.input_text)}
                              >
                                复制输入
                              </button>
                              <button
                                className="btn border border-slate-200 dark:border-slate-600 text-xs hover:bg-slate-100 dark:hover:bg-slate-700"
                                onClick={() => navigator.clipboard.writeText(tc.output_text)}
                              >
                                复制输出
                              </button>
                            </div>
                          </div>
                          <div className="mt-2 grid md:grid-cols-2 gap-3">
                            <div>
                              <p className="text-xs text-slate-500 mb-1">输入</p>
                              <pre className="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-50 font-mono font-medium p-2 rounded border border-slate-200 dark:border-slate-700 whitespace-pre-wrap text-sm leading-relaxed">
                                {tc.input_text}
                              </pre>
                            </div>
                            <div>
                              <p className="text-xs text-slate-500 mb-1">输出</p>
                              <pre className="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-50 font-mono font-medium p-2 rounded border border-slate-200 dark:border-slate-700 whitespace-pre-wrap text-sm leading-relaxed">
                                {tc.output_text}
                              </pre>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </div>
            </div>

            <div
              className={`absolute inset-0 overflow-y-auto p-5 space-y-4 bg-white dark:bg-slate-900 transition-opacity duration-300 ${
                viewMode === "result" ? "opacity-100" : "opacity-0 pointer-events-none"
              }`}
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-slate-500">提交评测结果</p>
                  <h2 className="text-xl font-semibold text-slate-800 dark:text-slate-100">Two Sum</h2>
                </div>
                <button className="btn border border-slate-200 dark:border-slate-600 text-sm" onClick={() => setViewMode("problem")}>
                  返回题面
                </button>
              </div>
              <RunResultCard
                result={result}
                loading={runMode === "submit" && loading}
                expectedCaseCount={problem.testcases.length}
              />
            </div>
          </div>
        </Panel>
        <PanelResizeHandle className="w-2 bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 transition-colors" />
        <Panel defaultSize={55} minSize={35} className="border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden">
          <div className="h-full flex flex-col bg-white dark:bg-slate-900">
            <div className="flex items-center gap-3 px-4 py-2 border-b border-slate-200 dark:border-slate-700">
              <select
                className="px-3 py-2 rounded-lg border border-slate-200 bg-white dark:bg-slate-800 dark:border-slate-700 dark:text-slate-100"
                value={language}
                onChange={(e) => setLanguage(e.target.value as "cpp17" | "python3")}
              >
                <option value="cpp17">C++17</option>
                <option value="python3">Python 3</option>
              </select>
              <div className="text-sm text-slate-500 dark:text-slate-300">Ctrl/Cmd+Enter 运行样例</div>
              <div className="ml-auto flex gap-2">
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
            <div className="flex-1 min-h-0 px-4 pb-2">
              <CodeEditor
                language={language === "cpp17" ? "cpp" : "python"}
                value={code}
                onChange={setCode}
                theme={theme}
                onRunShortcut={() => handleRun("run_sample")}
                height="100%"
              />
            </div>
            <div className="border-t border-slate-200 dark:border-slate-700">
              {viewMode === "problem" ? (
                <>
                  <div className="flex items-center gap-4 px-4 py-2 text-sm">
                    <button
                      className={`px-2 py-1 rounded ${bottomTab === "result" ? "bg-slate-200 dark:bg-slate-800" : ""}`}
                      onClick={() => setBottomTab("result")}
                    >
                      运行结果
                    </button>
                    <button
                      className={`px-2 py-1 rounded ${bottomTab === "custom" ? "bg-slate-200 dark:bg-slate-800" : ""}`}
                      onClick={() => setBottomTab("custom")}
                    >
                      自测输入
                    </button>
                  </div>
                  <div className="h-64 px-4 pb-4 overflow-hidden">
                    {bottomTab === "custom" ? (
                      <div className="flex flex-col h-full gap-2">
                        <textarea
                          className="input flex-1 w-full"
                          placeholder="在此粘贴你的测试输入..."
                          value={customInput}
                          onChange={(e) => setCustomInput(e.target.value)}
                        />
                        <div className="flex items-center gap-3">
                          <button
                            className="btn bg-emerald-600 text-white hover:bg-emerald-500 disabled:opacity-50"
                            onClick={() => handleRun("custom")}
                            disabled={loading || !customInput.trim()}
                          >
                            {loading ? "运行中..." : "自测运行"}
                          </button>
                          <p className="text-xs text-slate-500">仅编译并用上方输入运行，不计入提交记录</p>
                        </div>
                      </div>
                    ) : (
                      <div className="h-full overflow-auto">
                        <RunResultCard result={result} loading={runMode === "submit" && loading} />
                      </div>
                    )}
                  </div>
                </>
              ) : (
                <div className="p-4 text-sm text-slate-500">结果已在左侧展示，如需继续查看题面请点击“返回题面”。</div>
              )}
            </div>
          </div>
        </Panel>
      </PanelGroup>
    </div>
  );
};

export default ProblemDetailPage;
