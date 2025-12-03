import { Route, Routes, Link } from "react-router-dom";
import { useEffect, useState } from "react";
import ProblemListPage from "./ProblemListPage";
import ProblemDetailPage from "./ProblemDetailPage";
import AdminPage from "./AdminPage";
import SubmissionsPage from "./SubmissionsPage";

const App = () => {
  const [dark, setDark] = useState<boolean>(() => window.localStorage.getItem("intcode-theme") === "dark");

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
            <Link to="/admin" className="hover:text-slate-900 dark:hover:text-white">
              题目管理
            </Link>
            <Link to="/submissions" className="hover:text-slate-900 dark:hover:text-white">
              提交记录
            </Link>
          </nav>
          <button
            className="px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 text-sm text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
            onClick={() => setDark((v) => !v)}
          >
            {dark ? "浅色" : "深色"}
          </button>
        </div>
      </header>
      <main className="max-w-6xl mx-auto px-4 py-6">
        <Routes>
          <Route path="/" element={<ProblemListPage />} />
          <Route path="/problems/:id" element={<ProblemDetailPage theme={dark ? "vs-dark" : "vs-light"} />} />
          <Route path="/admin" element={<AdminPage />} />
          <Route path="/submissions" element={<SubmissionsPage />} />
        </Routes>
      </main>
    </div>
  );
};

export default App;
