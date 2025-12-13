import { useEffect, useMemo, useState } from "react";
import { toast } from "react-hot-toast";
import { Trash2 } from "lucide-react";
import { addTestcase, createProblem, deleteUser, fetchProblems, fetchUsers, importTestcasesZip } from "../api";
import CodeEditor from "../components/CodeEditor";
import { Problem, UserSummary } from "../types";
import { useAuth } from "../context/AuthContext";

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

type FormState = {
  slug: string;
  title: string;
  difficulty: string;
  tags: string;
  content: string;
  input_description: string;
  output_description: string;
  constraints: string;
  is_spj: boolean;
  spj_code: string;
};

const AdminPage = () => {
  const [problems, setProblems] = useState<Problem[]>([]);
  const [mainTab, setMainTab] = useState<"problems" | "dev">("problems");
  const [activeTab, setActiveTab] = useState<"create" | "cases">("create");
  const [problemId, setProblemId] = useState<number | null>(null);
  const [form, setForm] = useState<FormState>({
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
  const [caseForm, setCaseForm] = useState<{
    case_no: string;
    is_sample: boolean;
    score_weight: string;
    input_file: File | null;
    output_file: File | null;
  }>({ case_no: "", is_sample: true, score_weight: "", input_file: null, output_file: null });
  const [zipFile, setZipFile] = useState<File | null>(null);
  const [msg, setMsg] = useState("");
  const { user } = useAuth();
  const [users, setUsers] = useState<UserSummary[]>([]);
  const [usersLoading, setUsersLoading] = useState(false);

  const loadProblems = async () => {
    const data = await fetchProblems({ limit: 100, offset: 0 });
    setProblems(data.items);
  };

  const loadUsers = async () => {
    setUsersLoading(true);
    try {
      const data = await fetchUsers();
      setUsers(data);
    } finally {
      setUsersLoading(false);
    }
  };

  useEffect(() => {
    if (user?.is_admin) {
      loadProblems();
      loadUsers();
    }
  }, [user]);

  const resetForm = () =>
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

  const handleCreate = async () => {
    await createProblem({
      ...form,
      tags: form.tags
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean)
    });
    setMsg("题目创建成功");
    resetForm();
    loadProblems();
    setActiveTab("cases");
  };

  const handleAddCase = async () => {
    if (!problemId) return;
    if (!caseForm.input_file || !caseForm.output_file) {
      toast.error("请上传输入/输出文件");
      return;
    }
    await addTestcase(problemId, {
      case_no: caseForm.case_no ? Number(caseForm.case_no) : undefined,
      is_sample: caseForm.is_sample,
      score_weight: caseForm.score_weight ? Number(caseForm.score_weight) : undefined,
      input_file: caseForm.input_file,
      output_file: caseForm.output_file
    });
    setCaseForm({ case_no: "", is_sample: true, score_weight: "", input_file: null, output_file: null });
    setMsg("用例已添加");
    loadProblems();
  };

  const handleImportZip = async () => {
    if (!problemId || !zipFile) {
      toast.error("请选择题目与 ZIP 包");
      return;
    }
    await importTestcasesZip(problemId, { zip: zipFile, strategy: "overwrite" });
    toast.success("ZIP 导入完成");
    setZipFile(null);
    loadProblems();
  };

  const selectedProblemTitle = useMemo(
    () => problems.find((p) => p.id === problemId)?.title || "选择题目",
    [problems, problemId]
  );

  if (!user) {
    return <p className="text-sm text-slate-600">请先登录管理员账号。</p>;
  }

  if (!user.is_admin) {
    return <p className="text-sm text-slate-600">当前账号没有管理员权限。</p>;
  }

  return (
    <div className="space-y-6">
      <div className="bg-white/60 dark:bg-slate-800/60 backdrop-blur rounded-xl border border-slate-200 dark:border-slate-700 p-2 shadow-sm flex gap-2 text-sm font-medium">
        <button
          className={`px-4 py-2 rounded-lg ${
            mainTab === "problems" ? "bg-indigo-600 text-white" : "text-slate-700 dark:text-slate-200"
          }`}
          onClick={() => setMainTab("problems")}
        >
          题目管理
        </button>
        <button
          className={`px-4 py-2 rounded-lg ${
            mainTab === "dev" ? "bg-indigo-600 text-white" : "text-slate-700 dark:text-slate-200"
          }`}
          onClick={() => setMainTab("dev")}
        >
          Developer Console
        </button>
      </div>

      {mainTab === "problems" && (
        <div className="bg-white/60 dark:bg-slate-800/60 backdrop-blur rounded-xl border border-slate-200 dark:border-slate-700 p-2 shadow-sm flex gap-2 text-sm font-medium">
          <button
            className={`px-4 py-2 rounded-lg ${activeTab === "create" ? "bg-indigo-600 text-white" : "text-slate-700 dark:text-slate-200"}`}
            onClick={() => setActiveTab("create")}
          >
            新建题目
          </button>
          <button
            className={`px-4 py-2 rounded-lg ${activeTab === "cases" ? "bg-indigo-600 text-white" : "text-slate-700 dark:text-slate-200"}`}
            onClick={() => setActiveTab("cases")}
          >
            管理测试用例
          </button>
        </div>
      )}

      {mainTab === "dev" ? (
        <div className="card bg-white/70 dark:bg-slate-800/70 backdrop-blur border border-slate-200 dark:border-slate-700 shadow-sm p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-100">Developer Console · 用户硬删除</h3>
            <span className="px-3 py-1 rounded-full text-xs bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200">
              共 {users.length} 人
            </span>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="text-left text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-slate-700">
                  <th className="py-2 pr-2">ID</th>
                  <th className="py-2 pr-2">头像</th>
                  <th className="py-2 pr-2">用户名</th>
                  <th className="py-2 pr-2">邮箱</th>
                  <th className="py-2 pr-2">角色</th>
                  <th className="py-2 pr-2">提交数</th>
                  <th className="py-2 pr-2">已解</th>
                  <th className="py-2 pr-2">加入时间</th>
                  <th className="py-2 pr-2 text-right">操作</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                {usersLoading ? (
                  <tr>
                    <td colSpan={9} className="py-4 text-center text-slate-500">
                      加载中...
                    </td>
                  </tr>
                ) : (
                  users.map((u) => (
                    <tr key={u.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/60">
                      <td className="py-2 pr-2 text-slate-700 dark:text-slate-200">{u.id}</td>
                      <td className="py-2 pr-2">
                        {u.avatar_url ? (
                          <img src={u.avatar_url} alt={u.username} className="w-8 h-8 rounded-full border border-slate-200 dark:border-slate-700" />
                        ) : (
                          <div className="w-8 h-8 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center font-bold">
                            {u.username[0]?.toUpperCase()}
                          </div>
                        )}
                      </td>
                      <td className="py-2 pr-2 text-slate-800 dark:text-slate-100">{u.username}</td>
                      <td className="py-2 pr-2 text-slate-500 dark:text-slate-400">{u.email}</td>
                      <td className="py-2 pr-2">
                        <span
                          className={`px-2 py-1 rounded-full text-xs ${
                            u.is_admin ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-700"
                          }`}
                        >
                          {u.is_admin ? "管理员" : "用户"}
                        </span>
                      </td>
                      <td className="py-2 pr-2 text-slate-700 dark:text-slate-200">{u.submission_count}</td>
                      <td className="py-2 pr-2 text-slate-700 dark:text-slate-200">{u.solved_count}</td>
                      <td className="py-2 pr-2 text-slate-500 dark:text-slate-400">
                        {new Date(u.created_at).toLocaleDateString()}
                      </td>
                      <td className="py-2 pr-2 text-right">
                        <button
                          className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs bg-red-50 text-red-600 hover:bg-red-100 border border-red-200"
                          onClick={async () => {
                            const ok = window.confirm(
                              `警告：此操作不可逆！\\n\\n将从数据库中永久删除：\\n1. 用户名：${u.username}\\n2. 注册邮箱：${u.email}\\n3. 该用户的所有提交记录\\n\\n确定要继续吗？`
                            );
                            if (!ok) return;
                            try {
                              await deleteUser(u.id);
                              toast.success("删除成功");
                              loadUsers();
                            } catch (err: any) {
                              const msg = err?.response?.data?.detail || "删除失败";
                              toast.error(msg);
                            }
                          }}
                        >
                          <Trash2 className="w-4 h-4" />
                          删除
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      ) : activeTab === "create" ? (
        <div className="card bg-white/70 dark:bg-slate-800/70 backdrop-blur border border-slate-200 dark:border-slate-700 shadow-sm p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-100">创建新题目</h3>
            {msg && <span className="text-sm text-emerald-500">{msg}</span>}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Slug</label>
              <input
                className="input w-full"
                placeholder="two-sum"
                value={form.slug}
                onChange={(e) => setForm({ ...form, slug: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">标题</label>
              <input
                className="input w-full"
                placeholder="两数之和"
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">难度</label>
              <select
                className="input w-full"
                value={form.difficulty}
                onChange={(e) => setForm({ ...form, difficulty: e.target.value })}
              >
                <option value="EASY">EASY</option>
                <option value="MEDIUM">MEDIUM</option>
                <option value="HARD">HARD</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">标签（逗号分隔）</label>
            <input
              className="input w-full"
              placeholder="数组, 哈希表"
              value={form.tags}
              onChange={(e) => setForm({ ...form, tags: e.target.value })}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">题目描述</label>
              <textarea
                className="input h-40"
                placeholder="支持 Markdown"
                value={form.content}
                onChange={(e) => setForm({ ...form, content: e.target.value })}
              />
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">输入说明</label>
              <textarea
                className="input"
                value={form.input_description}
                onChange={(e) => setForm({ ...form, input_description: e.target.value })}
              />
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">输出说明</label>
              <textarea
                className="input"
                value={form.output_description}
                onChange={(e) => setForm({ ...form, output_description: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">约束</label>
              <textarea
                className="input font-mono h-28"
                value={form.constraints}
                onChange={(e) => setForm({ ...form, constraints: e.target.value })}
              />
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">是否启用 SPJ</label>
              <label className="text-sm text-slate-600 dark:text-slate-400 inline-flex items-center gap-2">
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
                启用特殊判题（Python）
              </label>
              {form.is_spj && (
                <div className="space-y-2">
                  <p className="text-sm text-slate-600 dark:text-slate-400">实现 check(input_str, user_output_str)</p>
                  <div className="h-64 rounded-lg border border-slate-200 dark:border-slate-700 overflow-hidden">
                    <CodeEditor
                      language="python"
                      value={form.spj_code || ""}
                      onChange={(code) => setForm((prev) => ({ ...prev, spj_code: code }))}
                      theme="vs-dark"
                      height="100%"
                    />
                  </div>
                </div>
              )}
            </div>
          </div>

          <button className="btn bg-indigo-600 text-white hover:bg-indigo-500" onClick={handleCreate}>
            保存题目
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="card bg-white/70 dark:bg-slate-800/70 backdrop-blur border border-slate-200 dark:border-slate-700 shadow-sm p-6 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-100">测试用例管理</h3>
              {msg && <span className="text-sm text-emerald-500">{msg}</span>}
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">选择题目</label>
                <select
                  className="input w-full"
                  value={problemId ?? ""}
                  onChange={(e) => setProblemId(Number(e.target.value))}
                >
                  <option value="">请选择</option>
                  {problems.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.title}
                    </option>
                  ))}
                </select>
                <p className="text-xs text-slate-500 mt-1">当前：{selectedProblemTitle}</p>
              </div>
              <div className="flex items-center gap-3 mt-5 md:mt-0">
                <div className="flex items-center gap-2">
                  <label className="text-sm text-slate-700 dark:text-slate-300">Case #</label>
                  <input
                    className="input w-24"
                    placeholder="自动"
                    value={caseForm.case_no}
                    onChange={(e) => setCaseForm({ ...caseForm, case_no: e.target.value })}
                  />
                </div>
                <div className="flex items-center gap-2">
                  <label className="text-sm text-slate-700 dark:text-slate-300">权重</label>
                  <input
                    className="input w-20"
                    placeholder="-"
                    value={caseForm.score_weight}
                    onChange={(e) => setCaseForm({ ...caseForm, score_weight: e.target.value })}
                  />
                </div>
                <label className="text-sm text-slate-700 dark:text-slate-300 inline-flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={caseForm.is_sample}
                    onChange={(e) => setCaseForm({ ...caseForm, is_sample: e.target.checked })}
                  />
                  设为样例
                </label>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">输入文件 (.in)</label>
                <input
                  type="file"
                  accept=".in,.txt"
                  onChange={(e) => setCaseForm({ ...caseForm, input_file: e.target.files?.[0] ?? null })}
                  className="input"
                />
                {caseForm.input_file && <p className="text-xs text-slate-500 mt-1">{caseForm.input_file.name}</p>}
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">输出文件 (.out)</label>
                <input
                  type="file"
                  accept=".out,.txt"
                  onChange={(e) => setCaseForm({ ...caseForm, output_file: e.target.files?.[0] ?? null })}
                  className="input"
                />
                {caseForm.output_file && <p className="text-xs text-slate-500 mt-1">{caseForm.output_file.name}</p>}
              </div>
            </div>
            <button className="btn bg-slate-900 text-white hover:bg-slate-800" onClick={handleAddCase}>
              添加用例
            </button>
            <div className="mt-4 border-t border-dashed border-slate-200 dark:border-slate-700 pt-4">
              <div className="flex items-center gap-3">
                <input
                  type="file"
                  accept=".zip"
                  onChange={(e) => setZipFile(e.target.files?.[0] ?? null)}
                  className="input"
                />
                <button className="btn bg-indigo-600 text-white hover:bg-indigo-500" onClick={handleImportZip}>
                  批量导入 ZIP
                </button>
              </div>
              <p className="text-xs text-slate-500 mt-1">ZIP 内按 1.in/1.out 结构导入，默认覆盖同号用例。</p>
            </div>
          </div>

          <div className="card bg-white/70 dark:bg-slate-800/70 backdrop-blur border border-slate-200 dark:border-slate-700 shadow-sm p-6">
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-md font-semibold text-slate-800 dark:text-slate-100">题目列表</h4>
              <span className="text-xs text-slate-500">共 {problems.length} 道</span>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="text-left text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-slate-700">
                    <th className="py-2">ID</th>
                    <th className="py-2">标题</th>
                    <th className="py-2">Slug</th>
                    <th className="py-2">难度</th>
                    <th className="py-2 text-right">操作</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                  {problems.map((p) => (
                    <tr key={p.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/70">
                      <td className="py-2 pr-2 text-slate-700 dark:text-slate-200">{p.id}</td>
                      <td className="py-2 pr-2 text-slate-800 dark:text-slate-100">{p.title}</td>
                      <td className="py-2 pr-2 text-slate-500 dark:text-slate-400">{p.slug}</td>
                      <td className="py-2 pr-2">
                        <span className="px-2 py-1 rounded-full bg-slate-100 dark:bg-slate-700/60 text-slate-700 dark:text-slate-200 text-xs">
                          {p.difficulty}
                        </span>
                      </td>
                      <td className="py-2 text-right">
                        <button className="text-sm text-indigo-600 dark:text-indigo-400 hover:underline">编辑</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminPage;
