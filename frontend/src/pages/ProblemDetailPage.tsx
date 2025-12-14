import { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import ReactMarkdown from "react-markdown";
import { Panel, PanelGroup, PanelResizeHandle } from "react-resizable-panels";
import rehypeKatex from "rehype-katex";
import remarkMath from "remark-math";
import {
  addTestcase,
  deleteTestcaseApi,
  fetchProblem,
  fetchUserCode,
  saveUserCode,
  submitCode,
  updateTestcaseApi,
  downloadTestcaseFile
} from "../api";
import { Problem, SubmissionResult, TestCase } from "../types";
import DifficultyBadge from "../components/DifficultyBadge";
import CodeEditor from "../components/CodeEditor";
import RunResultCard from "../components/RunResultCard";
import { useAuth } from "../context/AuthContext";

const templates: Record<string, string> = {
  cpp17: `#include <bits/stdc++.h>
using namespace std;

int main(){
    ios::sync_with_stdio(false);
    cin.tie(nullptr);
    // TODO: 读取输入并完成题解
    return 0;
}
`,
  python3: `def main():
    import sys
    data = sys.stdin.read().strip().split()
    # TODO: 读取输入并完成题解

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
  const [bottomTab, setBottomTab] = useState<"custom" | "result">("custom");
  const [viewMode, setViewMode] = useState<"problem" | "result">("problem");
  const [runMode, setRunMode] = useState<"run_sample" | "submit" | "custom">("run_sample");
  const { user } = useAuth();
  const [managing, setManaging] = useState(false);
  const [newCaseForm, setNewCaseForm] = useState<{
    case_no: string;
    is_sample: boolean;
    input_file: File | null;
    output_file: File | null;
  }>({ case_no: "", is_sample: false, input_file: null, output_file: null });
  const [updatingCase, setUpdatingCase] = useState<{ [id: number]: { input_file: File | null; output_file: File | null } }>({});
  const [managedCases, setManagedCases] = useState<TestCase[]>([]);
  const [codeLoaded, setCodeLoaded] = useState(false);
  const [lastSaved, setLastSaved] = useState("");

  useEffect(() => {
    if (id) {
      setCodeLoaded(false);
      setLastSaved("");
      setLanguage("cpp17");
      setCode(templates.cpp17);
      fetchProblem(Number(id)).then((data) => {
        setProblem(data);
      });
    }
  }, [id]);

  useEffect(() => {
    const loadSaved = async () => {
      if (!problem || !user) {
        setCodeLoaded(true);
        return;
      }
      try {
        const saved = await fetchUserCode(problem.id);
        if (saved.code) {
          const lang = saved.language === "python3" ? "python3" : "cpp17";
          setLanguage(lang);
          setCode(saved.code);
          setLastSaved(saved.code);
        } else {
          setLastSaved(templates[language]);
        }
      } catch {
        // ignore load error, keep defaults
      } finally {
        setCodeLoaded(true);
      }
    };
    loadSaved();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [problem?.id, user]);

  useEffect(() => {
    if (!user || !problem || !codeLoaded) return;
    if (code === lastSaved) return;
    const timer = setTimeout(async () => {
      try {
        await saveUserCode(problem.id, { code, language });
        setLastSaved(code);
      } catch {
        // ignore auto-save errors
      }
    }, 1200);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [code, language, codeLoaded, user, problem?.id]);

  const sampleCases = useMemo(() => problem?.testcases.filter((t) => t.is_sample) ?? [], [problem]);
  useEffect(() => {
    if (problem) {
      setManagedCases(problem.testcases);
    }
  }, [problem]);
  const reloadProblem = async () => {
    if (!id) return;
    const data = await fetchProblem(Number(id));
    setProblem(data);
  };

  const handleRun = async (mode: "run_sample" | "submit" | "custom") => {
    if (!problem) return;
    if (!user) {
      setResult({
        status: "ERROR",
        runtime_ms: 0,
        compile_error: null,
        runtime_error: "请先登录后再运行/提交代码",
        cases: []
      });
      setBottomTab("result");
      return;
    }
    setRunMode(mode);
    if (mode === "submit") {
      setViewMode("result");
      setResult(null);
      setBottomTab("result");
    }
    setLoading(true);
    try {
      if (user) {
        await saveUserCode(problem.id, { code, language });
        setLastSaved(code);
      }
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

  const handleUpdateCase = async (tc: TestCase) => {
    const files = updatingCase[tc.id || -1] || { input_file: null, output_file: null };
    await updateTestcaseApi(tc.id!, {
      case_no: tc.case_no,
      is_sample: tc.is_sample,
      input_file: files.input_file || undefined,
      output_file: files.output_file || undefined
    });
    setUpdatingCase((prev) => ({ ...prev, [tc.id!]: { input_file: null, output_file: null } }));
    await reloadProblem();
  };

  const handleAddCase = async () => {
    if (!problem) return;
    if (!newCaseForm.input_file || !newCaseForm.output_file) {
      return;
    }
    await addTestcase(problem.id, {
      case_no: newCaseForm.case_no ? Number(newCaseForm.case_no) : undefined,
      is_sample: newCaseForm.is_sample,
      input_file: newCaseForm.input_file,
      output_file: newCaseForm.output_file
    });
    setNewCaseForm({ case_no: "", is_sample: false, input_file: null, output_file: null });
    await reloadProblem();
  };

  const handleDownloadCase = async (testcaseId: number, kind: "in" | "out") => {
    try {
      const { blob, filename } = await downloadTestcaseFile(testcaseId, kind);
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch {
      window.alert("下载失败，请确认已登录并稍后再试");
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
                <div className="flex items-center gap-2">
                  <DifficultyBadge level={problem.difficulty} />
                  {user?.is_admin && (
                    <button
                      className="btn border border-indigo-200 text-indigo-600 bg-indigo-50 dark:border-indigo-800 dark:text-indigo-200 dark:bg-indigo-900/20 text-xs"
                      onClick={() => setManaging((v) => !v)}
                    >
                      {managing ? "收起用例管理" : "管理测试用例"}
                    </button>
                  )}
                </div>
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
                      {sampleCases.map((tc, idx) => (
                        <div key={tc.id} className="border border-slate-200 dark:border-slate-700 rounded-lg p-3 bg-slate-50 dark:bg-slate-800">
                          <div className="flex justify-between items-center">
                            <span className="text-sm font-medium text-slate-700 dark:text-slate-100">样例 #{idx + 1}</span>
                            <div className="flex gap-2">
                              <button
                                className="btn border border-slate-200 dark:border-slate-600 text-xs hover:bg-slate-100 dark:hover:bg-slate-700"
                                onClick={() => navigator.clipboard.writeText(tc.input_text || "")}
                              >
                                复制输入
                              </button>
                              <button
                                className="btn border border-slate-200 dark:border-slate-600 text-xs hover:bg-slate-100 dark:hover:bg-slate-700"
                                onClick={() => navigator.clipboard.writeText(tc.output_text || "")}
                              >
                                复制输出
                              </button>
                            </div>
                          </div>
                          <div className="mt-2 grid md:grid-cols-2 gap-3">
                            <div>
                              <p className="text-xs text-slate-500 mb-1">输入</p>
                              <pre className="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-50 font-mono font-medium p-2 rounded border border-slate-200 dark:border-slate-700 whitespace-pre-wrap text-sm leading-relaxed">
                                {tc.input_text || ""}
                              </pre>
                            </div>
                            <div>
                              <p className="text-xs text-slate-500 mb-1">输出</p>
                              <pre className="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-50 font-mono font-medium p-2 rounded border border-slate-200 dark:border-slate-700 whitespace-pre-wrap text-sm leading-relaxed">
                                {tc.output_text || ""}
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
                  <h2 className="text-xl font-semibold text-slate-800 dark:text-slate-100">{problem.title}</h2>
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
          {managing && user?.is_admin ? (
            <div className="h-full flex flex-col bg-white dark:bg-slate-900 p-4 gap-3">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-100">测试用例管理</h3>
                <button className="btn text-xs border border-slate-200 dark:border-slate-700" onClick={() => setManaging(false)}>
                  关闭
                </button>
              </div>
              <div className="flex-1 min-h-0 overflow-y-auto space-y-2">
                {managedCases.map((tc) => (
                  <div key={tc.id} className="p-3 rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800">
                    <div className="flex items-center justify-between">
                      <div className="text-sm text-slate-800 dark:text-slate-100">Case #{tc.case_no}</div>
                      <div className="flex gap-2">
                        <button
                          type="button"
                          className="text-xs text-indigo-600 hover:underline"
                          onClick={() => handleDownloadCase(tc.id!, "in")}
                        >
                          下载输入
                        </button>
                        <button
                          type="button"
                          className="text-xs text-indigo-600 hover:underline"
                          onClick={() => handleDownloadCase(tc.id!, "out")}
                        >
                          下载输出
                        </button>
                      </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mt-2">
                      <label className="text-xs text-slate-500">
                        新输入
                        <input
                          type="file"
                          accept=".in,.txt"
                          className="input mt-1"
                          onChange={(e) =>
                            setUpdatingCase((prev) => ({
                              ...prev,
                              [tc.id!]: { ...(prev[tc.id!] || { output_file: null }), input_file: e.target.files?.[0] ?? null }
                            }))
                          }
                        />
                      </label>
                      <label className="text-xs text-slate-500">
                        新输出
                        <input
                          type="file"
                          accept=".out,.txt"
                          className="input mt-1"
                          onChange={(e) =>
                            setUpdatingCase((prev) => ({
                              ...prev,
                              [tc.id!]: { ...(prev[tc.id!] || { input_file: null }), output_file: e.target.files?.[0] ?? null }
                            }))
                          }
                        />
                      </label>
                    </div>
                    <div className="flex items-center gap-3 mt-2 text-xs text-slate-600 dark:text-slate-300">
                      <label className="inline-flex items-center gap-1">
                        <input
                          type="checkbox"
                          checked={tc.is_sample}
                          onChange={(e) =>
                            setManagedCases((prev) =>
                              prev.map((item) => (item.id === tc.id ? { ...item, is_sample: e.target.checked } : item))
                            )
                          }
                        />
                        样例
                      </label>
                      <button className="btn text-xs bg-slate-900 text-white" onClick={() => handleUpdateCase(tc)}>
                        保存
                      </button>
                      <button
                        className="btn text-xs bg-red-600 text-white hover:bg-red-500"
                        onClick={async () => {
                          const ok = window.confirm("确定删除该用例吗？此操作不可撤销。");
                          if (!ok) return;
                          await deleteTestcaseApi(tc.id!);
                          await reloadProblem();
                        }}
                      >
                        删除
                      </button>
                    </div>
                  </div>
                ))}
              </div>
              <div className="border-t border-dashed border-slate-200 dark:border-slate-700 pt-3">
                <p className="text-sm font-medium text-slate-700 dark:text-slate-200 mb-2">新增用例</p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  <input
                    className="input"
                    placeholder="Case 编号(可选)"
                    value={newCaseForm.case_no}
                    onChange={(e) => setNewCaseForm((prev) => ({ ...prev, case_no: e.target.value }))}
                  />
                  <label className="text-xs text-slate-600 dark:text-slate-300 inline-flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={newCaseForm.is_sample}
                      onChange={(e) => setNewCaseForm((prev) => ({ ...prev, is_sample: e.target.checked }))}
                    />
                    设为样例
                  </label>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mt-2">
                  <input
                    type="file"
                    accept=".in,.txt"
                    className="input"
                    onChange={(e) => setNewCaseForm((prev) => ({ ...prev, input_file: e.target.files?.[0] ?? null }))}
                  />
                  <input
                    type="file"
                    accept=".out,.txt"
                    className="input"
                    onChange={(e) => setNewCaseForm((prev) => ({ ...prev, output_file: e.target.files?.[0] ?? null }))}
                  />
                </div>
                <div className="mt-2">
                  <button className="btn bg-indigo-600 text-white text-xs" onClick={handleAddCase}>
                    上传新增用例
                  </button>
                </div>
              </div>
            </div>
          ) : (
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
                <div className="text-sm text-slate-500 dark:text-slate-300">Ctrl/Cmd+Enter 运行样例（自动保存草稿）</div>
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
                        className={`px-2 py-1 rounded ${
                          bottomTab === "result"
                            ? "bg-slate-200 dark:bg-slate-700 text-slate-900 dark:text-slate-100"
                            : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200"
                        }`}
                        onClick={() => setBottomTab("result")}
                      >
                        运行结果
                      </button>
                      <button
                        className={`px-2 py-1 rounded ${
                          bottomTab === "custom"
                            ? "bg-slate-200 dark:bg-slate-700 text-slate-900 dark:text-slate-100"
                            : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200"
                        }`}
                        onClick={() => setBottomTab("custom")}
                      >
                        自测输入
                      </button>
                    </div>
                    <div className="h-64 px-4 pb-4 overflow-hidden">
                      {bottomTab === "custom" ? (
                        <div className="flex flex-col h-full gap-2">
                          <textarea
                            className="input flex-1 w-full bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-700"
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
          )}
        </Panel>
      </PanelGroup>
    </div>
  );
};

export default ProblemDetailPage;
