import { FormEvent, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

const LoginPage = () => {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await login(username, password);
      navigate("/");
    } catch (err: any) {
      setError(err?.response?.data?.detail || "登录失败");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto card p-6 space-y-4">
      <h2 className="text-xl font-semibold text-slate-800">登录</h2>
      <form className="space-y-3" onSubmit={handleSubmit}>
        <input className="input" placeholder="用户名" value={username} onChange={(e) => setUsername(e.target.value)} />
        <input
          className="input"
          type="password"
          placeholder="密码"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        {error && <p className="text-sm text-red-600">{error}</p>}
        <button
          type="submit"
          className="btn w-full bg-indigo-600 text-white hover:bg-indigo-500 disabled:opacity-50"
          disabled={loading}
        >
          {loading ? "登录中..." : "登录"}
        </button>
      </form>
      <p className="text-sm text-slate-600">
        还没有账号？ <Link to="/register" className="text-indigo-600 hover:underline">去注册</Link>
      </p>
    </div>
  );
};

export default LoginPage;
