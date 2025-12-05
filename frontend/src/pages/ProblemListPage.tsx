import { useEffect, useMemo, useState } from "react";
import { BarChart3, Flame, Shuffle, Target, TrendingUp } from "lucide-react";
import { fetchProblems } from "../api";
import { Problem } from "../types";
import DifficultyBadge from "../components/DifficultyBadge";

const mockAcceptance = () => (60 + Math.random() * 30).toFixed(1) + "%";

const ProblemListPage = () => {
  const [problems, setProblems] = useState<Problem[]>([]);
  const [keyword, setKeyword] = useState("");
  const [difficulty, setDifficulty] = useState<string>("");
  const [tag, setTag] = useState<string>("");
  const [page, setPage] = useState(0);
  const pageSize = 12;
  const [hasMore, setHasMore] = useState(true);
  const [totalCount, setTotalCount] = useState(0);
  const [allTags, setAllTags] = useState<string[]>([]);

  const mergeTags = (items: Problem[]) => {
    setAllTags((prev) => {
      const next = new Set(prev);
      items.forEach((p) => p.tags.forEach((t) => next.add(t)));
      return Array.from(next).sort();
    });
  };

  const load = async (targetPage = page) => {
    const data = await fetchProblems({
      keyword: keyword || undefined,
      difficulty: difficulty || undefined,
      tag: tag || undefined,
      limit: pageSize,
      offset: targetPage * pageSize
    });
    setProblems(data.items);
    setTotalCount(data.total);
    setHasMore((targetPage + 1) * pageSize < data.total);
    mergeTags(data.items);
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, tag, difficulty]);

  useEffect(() => {
    const loadAllTags = async () => {
      const data = await fetchProblems({ limit: 100, offset: 0 });
      mergeTags(data.items);
    };
    loadAllTags();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const solved = useMemo(() => Math.min(10, problems.length), [problems.length]);
  const progressTotal = useMemo(() => Math.max(20, problems.length + 10), [problems.length]);
  const trendingTags = useMemo(() => {
    const tagCount: Record<string, number> = {};
    problems.forEach((p) => p.tags.forEach((t) => (tagCount[t] = (tagCount[t] || 0) + 1)));
    return Object.entries(tagCount)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 6)
      .map(([tag, count]) => ({ tag, count }));
  }, [problems]);

  const randomPick = () => {
    if (!problems.length) return;
    const pick = problems[Math.floor(Math.random() * problems.length)];
    window.location.href = `/problems/${pick.id}`;
  };

  return (
    <div className="h-full grid grid-cols-4 gap-4">
      <div className="col-span-3 space-y-4">
        <div className="card shadow-sm p-4 flex items-center gap-3">
          <div className="flex items-center gap-2 flex-1">
            <div className="flex items-center px-3 py-2 bg-slate-100 rounded-lg text-slate-600">
              <svg className="w-4 h-4 mr-2" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M9 3.5a5.5 5.5 0 1 1 2.735 4.724l-4.76 4.76a.75.75 0 1 1-1.06-1.06l4.76-4.76A5.5 5.5 0 0 1 9 3.5Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              <input
                className="bg-transparent outline-none text-sm"
                placeholder="搜索题目标题..."
                value={keyword}
                onChange={(e) => setKeyword(e.target.value)}
              />
            </div>
            <select
              className="px-3 py-2 rounded-lg border border-slate-200 bg-white text-sm"
              value={difficulty}
              onChange={(e) => setDifficulty(e.target.value)}
            >
              <option value="">全部难度</option>
              <option value="EASY">EASY</option>
              <option value="MEDIUM">MEDIUM</option>
              <option value="HARD">HARD</option>
            </select>
            <select
              className="px-3 py-2 rounded-lg border border-slate-200 bg-white text-sm"
              value={tag}
              onChange={(e) => setTag(e.target.value)}
            >
              <option value="">全部标签</option>
              {allTags.map((tagName) => (
                <option key={tagName} value={tagName}>
                  {tagName}
                </option>
              ))}
            </select>
            <button
              onClick={() => {
                setPage(0);
                load(0);
              }}
              className="btn bg-slate-900 text-white hover:bg-slate-800 text-sm px-3"
            >
              搜索
            </button>
          </div>
          <button onClick={randomPick} className="btn border border-slate-200 bg-white hover:bg-slate-100 flex items-center gap-2 text-sm">
            <Shuffle size={16} />
            随机刷一题
          </button>
        </div>

        <div className="card overflow-hidden">
          <div className="grid grid-cols-6 px-4 py-3 text-xs font-semibold text-slate-500 bg-slate-50 border-b border-slate-200">
            <div>状态</div>
            <div>标题</div>
            <div>标签</div>
            <div>难度</div>
            <div className="text-right col-span-2">通过率</div>
          </div>
          <div>
            {problems.length === 0 ? (
              <p className="text-sm text-slate-500 p-4">暂无题目</p>
            ) : (
              <div>
                {problems.map((p, idx) => (
                  <a
                    key={p.id}
                    href={`/problems/${p.id}`}
                    className={`grid grid-cols-6 px-4 py-3 text-sm items-center ${
                      idx % 2 === 0 ? "bg-white" : "bg-slate-50"
                    } hover:bg-slate-100 transition-colors`}
                  >
                    <div className="flex items-center gap-2 text-slate-500">
                      <Target size={16} />
                    </div>
                    <div>
                      <div className="font-semibold text-slate-800 hover:text-indigo-600">{p.title}</div>
                      <p className="text-xs text-slate-500">{p.slug}</p>
                    </div>
                    <div className="flex flex-wrap gap-2 text-xs">
                      {p.tags.length === 0 ? (
                        <span className="text-slate-400">无</span>
                      ) : (
                        p.tags.map((tagName) => (
                          <span
                            key={tagName}
                            className="px-2 py-1 rounded-full bg-slate-100 text-slate-700 border border-slate-200"
                          >
                            {tagName}
                          </span>
                        ))
                      )}
                    </div>
                    <div>
                      <DifficultyBadge level={p.difficulty} />
                    </div>
                    <div className="text-right text-slate-600 col-span-2">{mockAcceptance()}</div>
                  </a>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="flex justify-center items-center gap-3">
          <button
            className="btn border border-slate-200 hover:bg-slate-100 disabled:opacity-50 text-sm"
            onClick={() => setPage((p) => Math.max(0, p - 1))}
            disabled={page === 0}
          >
            上一页
          </button>
          <span className="text-sm text-slate-600">
            第 {page + 1} / {Math.max(1, Math.ceil(totalCount / pageSize) || 1)} 页
          </span>
          <button
            className="btn border border-slate-200 hover:bg-slate-100 disabled:opacity-50 text-sm"
            onClick={() => setPage((p) => p + 1)}
            disabled={!hasMore}
          >
            下一页
          </button>
        </div>
      </div>

      <div className="col-span-1 space-y-4">
        <div className="card p-4 bg-gradient-to-br from-indigo-500 to-slate-900 text-white shadow-md">
          <div className="flex items-center gap-2 text-sm">
            <Flame size={16} />
            本日挑战
          </div>
          <h3 className="mt-2 text-lg font-bold">两数之和 (Two Sum)</h3>
          <p className="text-sm text-indigo-100 mt-1">今日热度题目，尝试用 O(n) 解法击败 90% 用户。</p>
          <a href="/problems/1" className="inline-block mt-3 px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-sm hover:bg-white/20">
            去挑战
          </a>
        </div>

        <div className="card p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-slate-700">
              <BarChart3 size={16} />
              进度
            </div>
            <span className="text-xs text-slate-500">近一周</span>
          </div>
          <div className="mt-3">
            <div className="flex justify-between text-sm text-slate-600">
              <span>已解决</span>
              <span className="font-semibold text-slate-800">
                {solved}/{progressTotal}
              </span>
            </div>
            <div className="mt-2 h-2 rounded-full bg-slate-100 overflow-hidden">
              <div className="h-full bg-indigo-500" style={{ width: `${Math.min(100, (solved / progressTotal) * 100)}%` }} />
            </div>
          </div>
          <div className="mt-3 text-xs text-slate-500">保持每日 1 题，轻松冲击目标。</div>
        </div>

        <div className="card p-4 shadow-sm">
          <div className="flex items-center gap-2 text-slate-700">
            <TrendingUp size={16} />
            热门标签
          </div>
          <div className="mt-3 space-y-2">
            {trendingTags.length === 0 ? (
              <p className="text-sm text-slate-500">暂无标签</p>
            ) : (
              trendingTags.map((t) => (
                <div key={t.tag} className="flex items-center justify-between text-sm">
                  <span className="px-2 py-1 rounded-full bg-slate-100 text-slate-700">{t.tag}</span>
                  <span className="text-xs text-slate-500">{t.count} 题</span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProblemListPage;
