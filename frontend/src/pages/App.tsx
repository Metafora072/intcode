import { Route, Routes, Link } from "react-router-dom";
import ProblemListPage from "./ProblemListPage";
import ProblemDetailPage from "./ProblemDetailPage";
import AdminPage from "./AdminPage";
import SubmissionsPage from "./SubmissionsPage";

const App = () => {
  return (
    <div className="min-h-screen">
      <header className="sticky top-0 bg-white/90 backdrop-blur border-b border-slate-200 z-10">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
          <Link to="/" className="text-xl font-bold text-slate-800">
            intcode
          </Link>
          <nav className="flex gap-4 text-sm font-medium text-slate-600">
            <Link to="/" className="hover:text-slate-900">
              题库
            </Link>
            <Link to="/admin" className="hover:text-slate-900">
              题目管理
            </Link>
            <Link to="/submissions" className="hover:text-slate-900">
              提交记录
            </Link>
          </nav>
        </div>
      </header>
      <main className="max-w-6xl mx-auto px-4 py-6">
        <Routes>
          <Route path="/" element={<ProblemListPage />} />
          <Route path="/problems/:id" element={<ProblemDetailPage />} />
          <Route path="/admin" element={<AdminPage />} />
          <Route path="/submissions" element={<SubmissionsPage />} />
        </Routes>
      </main>
    </div>
  );
};

export default App;
