import { useEffect, useState } from "react";
import { fetchProblems } from "../api";
import ProblemCard from "../components/ProblemCard";
import { Problem } from "../types";

const ProblemListPage = () => {
  const [problems, setProblems] = useState<Problem[]>([]);
  const [keyword, setKeyword] = useState("");
  const [difficulty, setDifficulty] = useState<string>("");
  const [page, setPage] = useState(0);
  const pageSize = 10;
  const [hasMore, setHasMore] = useState(true);

  const load = async () => {
    const data = await fetchProblems({
      keyword: keyword || undefined,
      difficulty: difficulty || undefined,
      limit: pageSize,
      offset: page * pageSize
    });
    setProblems(data);
    setHasMore(data.length === pageSize);
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page]);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-3 items-center">
        <input
          className="px-3 py-2 rounded-lg border border-slate-200 bg-white"
          placeholder="搜索标题..."
          value={keyword}
          onChange={(e) => setKeyword(e.target.value)}
        />
        <select
          className="px-3 py-2 rounded-lg border border-slate-200 bg-white"
          value={difficulty}
          onChange={(e) => setDifficulty(e.target.value)}
        >
          <option value="">全部难度</option>
          <option value="EASY">EASY</option>
          <option value="MEDIUM">MEDIUM</option>
          <option value="HARD">HARD</option>
        </select>
        <button onClick={load} className="btn bg-slate-900 text-white hover:bg-slate-800">
          搜索
        </button>
      </div>
      <div className="flex items-center gap-2 text-sm text-slate-600">
        <button
          className="btn border border-slate-200 hover:bg-slate-100 disabled:opacity-50"
          onClick={() => setPage((p) => Math.max(0, p - 1))}
          disabled={page === 0}
        >
          上一页
        </button>
        <span>第 {page + 1} 页</span>
        <button
          className="btn border border-slate-200 hover:bg-slate-100 disabled:opacity-50"
          onClick={() => setPage((p) => p + 1)}
          disabled={!hasMore}
        >
          下一页
        </button>
      </div>
      {problems.length === 0 ? (
        <p className="text-slate-500 text-sm">暂无题目</p>
      ) : (
        <div className="grid md:grid-cols-2 gap-4">
          {problems.map((p) => (
            <ProblemCard key={p.id} problem={p} />
          ))}
        </div>
      )}
    </div>
  );
};

export default ProblemListPage;
