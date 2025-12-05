import { useEffect, useState } from "react";
import { addTestcase, createProblem, fetchProblems } from "../api";
import CodeEditor from "../components/CodeEditor";
import { Problem } from "../types";

const defaultSpj = `def check(input_str, user_output_str):
    try:
        lines = input_str.strip().split('\\n')
        n = int(lines[0])
        nums = list(map(int, lines[1].split()))
        target = int(lines[2])
        user_indices = list(map(int, user_output_str.strip().split()))
        if len(user_indices) != 2:
            return False
        i, j = user_indices
        if i < 0 or i >= n or j < 0 or j >= n or i == j:
            return False
        return nums[i] + nums[j] == target
    except Exception:
        return False
`;

const AdminPage = () => {
  const [problems, setProblems] = useState<Problem[]>([]);
  const [problemId, setProblemId] = useState<number | null>(null);
  const [form, setForm] = useState({
    slug: "",
    title: "",
    difficulty: "EASY",
    tags: "",
    content: "",
    input_description: "",
    output_description: "",
    constraints: "",
    is_spj: false,
    spj_code: ""
  });
  const [caseForm, setCaseForm] = useState({ input_text: "", output_text: "", is_sample: true });
  const [msg, setMsg] = useState("");

  const loadProblems = async () => {
    const data = await fetchProblems();
    setProblems(data);
  };

  useEffect(() => {
    loadProblems();
  }, []);

  const handleCreate = async () => {
    await createProblem({
      ...form,
      tags: form.tags.split(",").map((t) => t.trim()).filter(Boolean)
    });
    setMsg("题目创建成功");
    setForm({
      slug: "",
      title: "",
      difficulty: "EASY",
      tags: "",
      content: "",
      input_description: "",
      output_description: "",
      constraints: "",
      is_spj: false,
      spj_code: ""
    });
    loadProblems();
  };

  const handleAddCase = async () => {
    if (!problemId) return;
    await addTestcase(problemId, caseForm);
    setCaseForm({ input_text: "", output_text: "", is_sample: true });
    setMsg("用例已添加");
    loadProblems();
  };

  return (
    <div className="grid md:grid-cols-2 gap-4">
      <div className="card p-4 space-y-3">
        <h3 className="text-lg font-semibold">新建题目</h3>
        <input className="input" placeholder="slug" value={form.slug} onChange={(e) => setForm({ ...form, slug: e.target.value })} />
        <input className="input" placeholder="标题" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
        <select className="input" value={form.difficulty} onChange={(e) => setForm({ ...form, difficulty: e.target.value })}>
          <option value="EASY">EASY</option>
          <option value="MEDIUM">MEDIUM</option>
          <option value="HARD">HARD</option>
        </select>
        <input className="input" placeholder="标签，逗号分隔" value={form.tags} onChange={(e) => setForm({ ...form, tags: e.target.value })} />
        <textarea className="input h-24" placeholder="题目描述 markdown" value={form.content} onChange={(e) => setForm({ ...form, content: e.target.value })} />
        <textarea className="input" placeholder="输入说明" value={form.input_description} onChange={(e) => setForm({ ...form, input_description: e.target.value })} />
        <textarea className="input" placeholder="输出说明" value={form.output_description} onChange={(e) => setForm({ ...form, output_description: e.target.value })} />
        <textarea className="input" placeholder="约束" value={form.constraints} onChange={(e) => setForm({ ...form, constraints: e.target.value })} />
        <label className="text-sm text-slate-600 inline-flex items-center gap-2">
          <input
            type="checkbox"
            checked={form.is_spj}
            onChange={(e) =>
              setForm((prev) => ({
                ...prev,
                is_spj: e.target.checked,
                spj_code: e.target.checked && !prev.spj_code ? defaultSpj : prev.spj_code
              }))
            }
          />
          启用特殊判题（SPJ）
        </label>
        {form.is_spj && (
          <div className="space-y-2">
            <p className="text-sm text-slate-600">SPJ 代码（Python，需实现 check(input_str, user_output_str)）</p>
            <div className="h-64">
              <CodeEditor
                language="python"
                value={form.spj_code || ""}
                onChange={(code) => setForm((prev) => ({ ...prev, spj_code: code }))}
                theme="vs-light"
                height="100%"
              />
            </div>
          </div>
        )}
        <button className="btn bg-indigo-600 text-white hover:bg-indigo-500" onClick={handleCreate}>
          保存
        </button>
      </div>
      <div className="card p-4 space-y-3">
        <h3 className="text-lg font-semibold">管理用例</h3>
        <select className="input" value={problemId ?? ""} onChange={(e) => setProblemId(Number(e.target.value))}>
          <option value="">选择题目</option>
          {problems.map((p) => (
            <option key={p.id} value={p.id}>
              {p.title}
            </option>
          ))}
        </select>
        <textarea
          className="input h-24"
          placeholder="输入"
          value={caseForm.input_text}
          onChange={(e) => setCaseForm({ ...caseForm, input_text: e.target.value })}
        />
        <textarea
          className="input h-24"
          placeholder="输出"
          value={caseForm.output_text}
          onChange={(e) => setCaseForm({ ...caseForm, output_text: e.target.value })}
        />
        <label className="text-sm text-slate-600 inline-flex items-center gap-2">
          <input
            type="checkbox"
            checked={caseForm.is_sample}
            onChange={(e) => setCaseForm({ ...caseForm, is_sample: e.target.checked })}
          />
          是否样例
        </label>
        <button className="btn bg-slate-900 text-white hover:bg-slate-800" onClick={handleAddCase}>
          添加用例
        </button>
        {msg && <p className="text-sm text-emerald-600">{msg}</p>}
      </div>
    </div>
  );
};

export default AdminPage;
