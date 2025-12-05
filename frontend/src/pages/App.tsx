import { Route, Routes, Link, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import ProblemListPage from "./ProblemListPage";
import ProblemDetailPage from "./ProblemDetailPage";
import AdminPage from "./AdminPage";
import SubmissionsPage from "./SubmissionsPage";
import LoginPage from "./LoginPage";
import RegisterPage from "./RegisterPage";
import { useAuth } from "../context/AuthContext";
import ProfilePage from "./ProfilePage";
import { Toaster, toast } from "react-hot-toast";

const App = () => {
  const [dark, setDark] = useState<boolean>(() => window.localStorage.getItem("intcode-theme") === "dark");
  const { user, logout } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const root = document.documentElement;
    if (dark) {
      root.classList.add("dark");
      window.localStorage.setItem("intcode-theme", "dark");
    } else {
      root.classList.remove("dark");
      window.localStorage.setItem("intcode-theme", "light");
    }
  }, [dark]);

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 bg-white/90 dark:bg-slate-900/90 backdrop-blur border-b border-slate-200 dark:border-slate-700 z-10">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
          <Link to="/" className="text-xl font-bold text-slate-800 dark:text-white">
            intcode
          </Link>
          <nav className="flex gap-4 text-sm font-medium text-slate-600 dark:text-slate-200">
            <Link to="/" className="hover:text-slate-900 dark:hover:text-white">
              题库
            </Link>
            {user?.is_admin && (
              <Link to="/admin" className="hover:text-slate-900 dark:hover:text-white">
                题目管理
              </Link>
            )}
            <Link to="/submissions" className="hover:text-slate-900 dark:hover:text-white">
              提交记录
            </Link>
          </nav>
          <div className="flex items-center gap-3 relative">
            {user ? (
              <div className="relative flex items-center gap-2">
                <button
                  onClick={() => navigate("/profile")}
                  className="flex items-center gap-2 px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 text-sm text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
                  title="个人主页"
                >
                  <span className="w-7 h-7 rounded-full bg-gradient-to-br from-indigo-500 to-purple-500 text-white flex items-center justify-center text-xs font-semibold">
                    {user.username[0].toUpperCase()}
                  </span>
                  {user.username}
                </button>
                <button
                  onClick={() => setMenuOpen((v) => !v)}
                  className="px-2 py-2 rounded-lg border border-slate-200 dark:border-slate-700 text-sm text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
                  aria-label="用户菜单"
                >
                  ▾
                </button>
                {menuOpen && (
                  <div className="absolute right-0 mt-12 w-40 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-lg z-20">
                    <button
                      onClick={() => {
                        setMenuOpen(false);
                        navigate("/profile");
                      }}
                      className="w-full text-left px-4 py-2 text-sm hover:bg-slate-100 dark:hover:bg-slate-800"
                    >
                      我的主页
                    </button>
                    <button
                      onClick={() => {
                        setMenuOpen(false);
                        navigate("/submissions");
                      }}
                      className="w-full text-left px-4 py-2 text-sm hover:bg-slate-100 dark:hover:bg-slate-800"
                    >
                      我的提交
                    </button>
                    <button
                      onClick={() => {
                        setMenuOpen(false);
                        logout();
                        toast("已退出登录");
                        navigate("/");
                      }}
                      className="w-full text-left px-4 py-2 text-sm hover:bg-slate-100 dark:hover:bg-slate-800"
                    >
                      退出
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <>
                <Link
                  to="/login"
                  className="px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 text-sm text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
                >
                  登录
                </Link>
                <Link
                  to="/register"
                  className="px-3 py-2 rounded-lg bg-indigo-600 text-white text-sm hover:bg-indigo-500"
                >
                  注册
                </Link>
              </>
            )}
            <button
              className="px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 text-sm text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
              onClick={() => setDark((v) => !v)}
            >
              {dark ? "浅色" : "深色"}
            </button>
          </div>
        </div>
      </header>
      <main className="h-[calc(100vh-64px)] px-4 py-4" onClick={() => setMenuOpen(false)}>
        <Routes>
          <Route path="/" element={<ProblemListPage />} />
          <Route path="/problems/:id" element={<ProblemDetailPage theme={dark ? "vs-dark" : "vs-light"} />} />
          <Route path="/admin" element={<AdminPage />} />
          <Route path="/submissions" element={<SubmissionsPage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/profile" element={<ProfilePage />} />
        </Routes>
      </main>
      <Toaster position="top-center" />
    </div>
  );
};

export default App;
