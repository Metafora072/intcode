import { useEffect, useState } from "react";
import { getSubmission, listSubmissions } from "../api";
import { SubmissionCaseResult, SubmissionSummary } from "../types";
import { useAuth } from "../context/AuthContext";

const SubmissionsPage = () => {
  const [subs, setSubs] = useState<SubmissionSummary[]>([]);
  const [selected, setSelected] = useState<any>(null);
  const { user } = useAuth();

  const load = async () => {
    const params: Record<string, any> = {};
    if (user && !user.is_admin) {
      params.user_id = user.id;
    }
    const data = await listSubmissions(params);
    setSubs(data);
  };

  useEffect(() => {
    if (user) {
      load();
    }
  }, [user]);

  const showDetail = async (id: number) => {
    const data = await getSubmission(id);
    setSelected(data);
  };

  if (!user) {
    return <p className="text-sm text-slate-600">请先登录后查看提交记录。</p>;
  }

  return (
    <div className="grid md:grid-cols-2 gap-4">
      <div className="card p-4">
        <h3 className="text-lg font-semibold mb-3">提交记录</h3>
        <div className="space-y-2">
          {subs.map((s) => (
            <div
              key={s.id}
              className="p-3 rounded-lg border border-slate-200 hover:bg-slate-50 cursor-pointer"
              onClick={() => showDetail(s.id)}
            >
              <div className="flex justify-between text-sm">
                <span>#{s.id} · 题目 {s.problem_id}</span>
                <span className="font-semibold">{s.status}</span>
              </div>
              <p className="text-xs text-slate-500">
                {s.language} · {new Date(s.created_at).toLocaleString()} · {s.runtime_ms.toFixed(2)} ms
              </p>
            </div>
          ))}
        </div>
      </div>
      <div className="card p-4">
        <h3 className="text-lg font-semibold mb-3">详情</h3>
        {!selected ? (
          <p className="text-sm text-slate-500">点击左侧记录查看详情</p>
        ) : (
          <div className="space-y-2 text-sm">
            <p>
              状态：<span className="font-semibold">{selected.status}</span>
            </p>
            <p>代码：</p>
            <pre className="bg-slate-50 p-3 rounded border border-slate-200 whitespace-pre-wrap max-h-48 overflow-auto">
              {selected.code}
            </pre>
            <p className="font-semibold mt-2">用例结果</p>
            <div className="space-y-2">
              {selected.cases?.map((c: SubmissionCaseResult) => (
                <div key={c.case_id} className="p-2 bg-slate-50 rounded border border-slate-200">
                  <div className="flex justify-between">
                    <span>用例 {c.case_id}</span>
                    <span className="font-semibold">{c.status}</span>
                  </div>
                  {c.error && <p className="text-xs text-red-600">{c.error}</p>}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default SubmissionsPage;
