import { FormEvent, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { toast } from "react-hot-toast";
import { User, Lock, Mail } from "lucide-react";

const RegisterPage = () => {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ username: "", email: "", password: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await register(form);
      toast.success(`欢迎，${form.username}!`);
      setTimeout(() => navigate("/"), 800);
    } catch (err: any) {
      const msg = err?.response?.data?.detail || "注册失败";
      setError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-64px)] flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800">
      <div className="w-full max-w-md p-8 rounded-2xl bg-white/80 dark:bg-slate-900/80 shadow-lg border border-white/60 dark:border-slate-700/60 backdrop-blur animate-fade-in">
        <h2 className="text-2xl font-semibold text-slate-800 dark:text-white mb-2 text-center">注册</h2>
        <p className="text-sm text-slate-500 dark:text-slate-300 text-center mb-6">创建账号，解锁你的刷题历程</p>
        <form className="space-y-4" onSubmit={handleSubmit}>
          <div className="relative">
            <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-slate-400">
              <User className="w-4 h-4" />
            </span>
            <input
              className="input w-full !pl-12 pr-3 py-3 rounded-xl bg-white/70 dark:bg-slate-800/80"
              placeholder="用户名"
              value={form.username}
              onChange={(e) => setForm({ ...form, username: e.target.value })}
            />
          </div>
          <div className="relative">
            <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-slate-400">
              <Mail className="w-4 h-4" />
            </span>
            <input
              className="input w-full !pl-12 pr-3 py-3 rounded-xl bg-white/70 dark:bg-slate-800/80"
              placeholder="邮箱"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
            />
          </div>
          <div className="relative">
            <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-slate-400">
              <Lock className="w-4 h-4" />
            </span>
            <input
              className="input w-full !pl-12 pr-3 py-3 rounded-xl bg-white/70 dark:bg-slate-800/80"
              type="password"
              placeholder="密码"
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
            />
          </div>
          {error && <p className="text-sm text-red-600">{error}</p>}
          <button
            type="submit"
            className="btn w-full bg-indigo-600 text-white hover:bg-indigo-500 disabled:opacity-50 rounded-xl py-3"
            disabled={loading}
          >
            {loading ? "注册中..." : "注册"}
          </button>
        </form>
        <p className="text-sm text-slate-600 dark:text-slate-300 text-center mt-4">
          已有账号？{" "}
          <Link to="/login" className="text-indigo-600 dark:text-indigo-300 hover:underline">
            去登录
          </Link>
        </p>
      </div>
    </div>
  );
};

export default RegisterPage;
