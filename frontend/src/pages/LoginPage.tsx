import { FormEvent, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { toast } from "react-hot-toast";
import { User, Lock } from "lucide-react";

const LoginPage = () => {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState<{ username?: string; password?: string }>({});
  const [loading, setLoading] = useState(false);

  const validate = () => {
    const errs: { username?: string; password?: string } = {};
    if (!username.trim()) errs.username = "请输入用户名";
    if (!password.trim()) errs.password = "请输入密码";
    setFieldErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError("");
    if (!validate()) return;
    setLoading(true);
    try {
      await login(username, password);
      toast.success(`欢迎回来，${username}!`);
      setTimeout(() => navigate("/"), 800);
    } catch (err: any) {
      const msg = err?.response?.data?.detail || "登录失败";
      setError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-64px)] flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800">
      <div className="w-full max-w-md p-8 rounded-2xl bg-white/80 dark:bg-slate-900/80 shadow-lg border border-white/60 dark:border-slate-700/60 backdrop-blur animate-fade-in">
        <h2 className="text-2xl font-semibold text-slate-800 dark:text-white mb-2 text-center">登录</h2>
        <p className="text-sm text-slate-500 dark:text-slate-300 text-center mb-6">欢迎回到 intcode，继续刷题旅程</p>
        <form className="mt-6" onSubmit={handleSubmit}>
          <div className="relative mb-10">
            <span className="pointer-events-none absolute inset-y-0 left-0 pl-3 flex items-center justify-center h-full text-slate-400">
              <User className="w-4 h-4" />
            </span>
            <input
              className="input w-full !pl-12 pr-3 py-3 rounded-xl bg-white/70 dark:bg-slate-800/80 leading-normal"
              placeholder="用户名"
              value={username}
              onChange={(e) => {
                setUsername(e.target.value);
                if (fieldErrors.username) setFieldErrors((prev) => ({ ...prev, username: undefined }));
              }}
            />
            <p className="absolute -bottom-6 left-0 text-xs text-red-600 leading-none">{fieldErrors.username || ""}</p>
          </div>
          <div className="relative mb-10">
            <span className="pointer-events-none absolute inset-y-0 left-0 pl-3 flex items-center justify-center h-full text-slate-400">
              <Lock className="w-4 h-4" />
            </span>
            <input
              className="input w-full !pl-12 pr-3 py-3 rounded-xl bg-white/70 dark:bg-slate-800/80 leading-normal"
              type="password"
              placeholder="密码"
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                if (fieldErrors.password) setFieldErrors((prev) => ({ ...prev, password: undefined }));
              }}
            />
            <p className="absolute -bottom-6 left-0 text-xs text-red-600 leading-none">{fieldErrors.password || ""}</p>
          </div>
          {error && <p className="text-sm text-red-600 mb-4">{error}</p>}
          <button
            type="submit"
            className="btn w-full bg-indigo-600 text-white hover:bg-indigo-500 disabled:opacity-50 rounded-xl py-3 mt-2"
            disabled={loading}
          >
            {loading ? "登录中..." : "登录"}
          </button>
        </form>
        <p className="text-sm text-slate-600 dark:text-slate-300 text-center mt-4">
          还没有账号？{" "}
          <Link to="/register" className="text-indigo-600 dark:text-indigo-300 hover:underline">
            去注册
          </Link>
        </p>
      </div>
    </div>
  );
};

export default LoginPage;
