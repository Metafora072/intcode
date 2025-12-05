import { useMemo } from "react";
import { useAuth } from "../context/AuthContext";
import { BarChart3, Award, CheckCircle, Activity } from "lucide-react";
import { format } from "date-fns";

const getAvatar = (avatarUrl?: string | null, username?: string) => {
  if (avatarUrl) return avatarUrl;
  const seed = (username || "u").charCodeAt(0);
  const hue = (seed * 37) % 360;
  return `data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='120' height='120'%3E%3Cdefs%3E%3ClinearGradient id='g' x1='0' y1='0' x2='1' y2='1'%3E%3Cstop offset='0%' stop-color='hsl(${hue},70%25,60%25)'/%3E%3Cstop offset='100%' stop-color='hsl(${(hue + 60) % 360},70%25,50%25)'/%3E%3C/linearGradient%3E%3C/defs%3E%3Crect width='120' height='120' rx='24' fill='url(%23g)'/%3E%3Ctext x='50%25' y='54%25' font-size='48' text-anchor='middle' fill='%23fff' font-family='Inter, sans-serif' dy='.35em'%3E${(username || "U")[0].toUpperCase()}%3C/text%3E%3C/svg%3E`;
};

const ProfilePage = () => {
  const { user } = useAuth();

  const avatar = useMemo(() => getAvatar(user?.avatar_url, user?.username), [user]);
  const acceptance = user ? Math.round(user.acceptance_rate * 100) : 0;

  if (!user) {
    return <p className="text-sm text-slate-600">请登录后查看个人主页。</p>;
  }

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="card p-5 flex flex-col md:flex-row md:items-center gap-4">
        <img src={avatar} alt="avatar" className="w-20 h-20 rounded-2xl border border-slate-200 dark:border-slate-700" />
        <div className="flex-1">
          <h2 className="text-2xl font-semibold text-slate-800 dark:text-white">{user.username}</h2>
          <p className="text-sm text-slate-500 dark:text-slate-300">{user.email}</p>
          <p className="text-xs text-slate-400 mt-1">加入时间：{format(new Date(user.created_at), "yyyy-MM-dd")}</p>
        </div>
        <div className="text-sm text-slate-600 dark:text-slate-200 bg-slate-100 dark:bg-slate-800 px-3 py-2 rounded-lg">
          Rank #{user.rank}
        </div>
      </div>

      <div className="grid md:grid-cols-4 gap-3">
        <div className="card p-4 flex items-center gap-3 bg-emerald-50 dark:bg-emerald-900/30 border-emerald-100 dark:border-emerald-900">
          <CheckCircle className="text-emerald-600" />
          <div>
            <p className="text-xs text-emerald-700 dark:text-emerald-200">已通过</p>
            <p className="text-xl font-semibold text-emerald-700 dark:text-emerald-100">{user.solved_count}</p>
          </div>
        </div>
        <div className="card p-4 flex items-center gap-3 bg-indigo-50 dark:bg-indigo-900/30 border-indigo-100 dark:border-indigo-900">
          <BarChart3 className="text-indigo-600" />
          <div>
            <p className="text-xs text-indigo-700 dark:text-indigo-200">总提交</p>
            <p className="text-xl font-semibold text-indigo-700 dark:text-indigo-100">{user.submission_count}</p>
          </div>
        </div>
        <div className="card p-4 flex items-center gap-3 bg-amber-50 dark:bg-amber-900/30 border-amber-100 dark:border-amber-900">
          <Activity className="text-amber-600" />
          <div>
            <p className="text-xs text-amber-700 dark:text-amber-200">通过率</p>
            <p className="text-xl font-semibold text-amber-700 dark:text-amber-100">{acceptance}%</p>
          </div>
        </div>
        <div className="card p-4 flex items-center gap-3 bg-purple-50 dark:bg-purple-900/30 border-purple-100 dark:border-purple-900">
          <Award className="text-purple-600" />
          <div>
            <p className="text-xs text-purple-700 dark:text-purple-200">Rank</p>
            <p className="text-xl font-semibold text-purple-700 dark:text-purple-100">#{user.rank}</p>
          </div>
        </div>
      </div>

      <div className="grid md:grid-cols-3 gap-3">
        <div className="card p-4 md:col-span-2">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-lg font-semibold text-slate-800 dark:text-white">最近记录</h3>
            <span className="text-xs text-slate-500">最新 5 条</span>
          </div>
          <div className="space-y-2">
            {user.recent_submissions.length === 0 ? (
              <p className="text-sm text-slate-500">暂无提交记录</p>
            ) : (
              user.recent_submissions.map((r) => (
                <div key={r.id} className="flex items-center justify-between p-3 rounded-lg bg-slate-50 dark:bg-slate-800">
                  <div>
                    <p className="font-semibold text-slate-800 dark:text-white">{r.problem_title}</p>
                    <p className="text-xs text-slate-500">{format(new Date(r.created_at), "MM-dd HH:mm")}</p>
                  </div>
                  <span
                    className={`px-2 py-1 rounded-full text-xs ${
                      r.status === "AC"
                        ? "bg-emerald-100 text-emerald-700"
                        : "bg-amber-100 text-amber-700"
                    }`}
                  >
                    {r.status}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
        <div className="card p-4">
          <h3 className="text-lg font-semibold text-slate-800 dark:text-white mb-3">设置</h3>
          <div className="space-y-2 text-sm text-slate-600 dark:text-slate-200">
            <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
              <p className="font-semibold mb-1">修改密码</p>
              <p className="text-xs text-slate-500">暂未开放，敬请期待</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProfilePage;
