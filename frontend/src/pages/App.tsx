import { Route, Routes, Link, useNavigate, useLocation } from "react-router-dom";
import { useEffect, useState } from "react";
import { Toaster } from "react-hot-toast"; // Ensure Toaster is here
import ProblemListPage from "./ProblemListPage";
import ProblemDetailPage from "./ProblemDetailPage";
import AdminPage from "./AdminPage";
import SubmissionsPage from "./SubmissionsPage";
import LoginPage from "./LoginPage";
import RegisterPage from "./RegisterPage";
import ProfilePage from "./ProfilePage";
import { useAuth } from "../context/AuthContext";

const App = () => {
  const [dark, setDark] = useState<boolean>(() => window.localStorage.getItem("intcode-theme") === "dark");
  const { user, logout } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const isIDE = location.pathname.startsWith("/problems/");

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

  const handleLogout = () => {
    logout();
    setMenuOpen(false);
    navigate("/");
  };

  return (
    <div className="flex flex-col h-screen bg-slate-50 dark:bg-slate-950 transition-colors duration-300">
      <Toaster position="top-center" />
      <header className="sticky top-0 bg-white/90 dark:bg-slate-900/90 backdrop-blur border-b border-slate-200 dark:border-slate-700 z-10">
        <div className="w-full px-6 py-3 flex items-center justify-between">
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
          
          <div className="flex items-center gap-3">
            <button
              className="px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 text-sm text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
              onClick={() => setDark((v) => !v)}
            >
              {dark ? "浅色" : "深色"}
            </button>

            {user ? (
              <div className="relative">
                <button
                  className="flex items-center gap-2 text-sm font-medium text-slate-700 dark:text-slate-200 hover:text-indigo-600"
                  onClick={() => setMenuOpen(!menuOpen)}
                >
                  {user.avatar_url ? (
                    <img src={user.avatar_url} className="w-8 h-8 rounded-full border border-slate-200" alt="avatar" />
                  ) : (
                    <div className="w-8 h-8 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center font-bold">
                      {user.username[0].toUpperCase()}
                    </div>
                  )}
                  <span>{user.username}</span>
                </button>
                {menuOpen && (
                  <div className="absolute right-0 mt-2 w-48 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-xl z-20 py-1 overflow-hidden">
                    <div className="px-4 py-2 border-b border-slate-100 dark:border-slate-800">
                      <p className="text-xs text-slate-500">已登录为</p>
                      <p className="text-sm font-semibold truncate">{user.email}</p>
                    </div>
                    <Link
                      to="/profile"
                      onClick={() => setMenuOpen(false)}
                      className="block px-4 py-2 text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800"
                    >
                      个人主页
                    </Link>
                    <button
                      onClick={handleLogout}
                      className="block w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20"
                    >
                      退出登录
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <div className="flex gap-2">
                <Link to="/login" className="btn bg-transparent border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 text-sm">
                  登录
                </Link>
                <Link to="/register" className="btn bg-indigo-600 text-white text-sm hover:bg-indigo-500">
                  注册
                </Link>
              </div>
            )}
          </div>
        </div>
      </header>
      <main className={`flex-1 relative w-full ${isIDE ? "overflow-hidden" : "overflow-y-auto"}`}>
        <div className={isIDE ? "h-full" : "w-full max-w-screen-2xl mx-auto px-4 py-6"}>
          <Routes>
            <Route path="/" element={<ProblemListPage />} />
            <Route path="/problems/:id" element={<ProblemDetailPage theme={dark ? "vs-dark" : "vs-light"} />} />
            <Route path="/admin" element={<AdminPage />} />
            <Route path="/submissions" element={<SubmissionsPage />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />
            <Route path="/profile" element={<ProfilePage />} />
          </Routes>
        </div>
      </main>
    </div>
  );
};

export default App;
