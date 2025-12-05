import { FormEvent, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

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
      navigate("/");
    } catch (err: any) {
      setError(err?.response?.data?.detail || "注册失败");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto card p-6 space-y-4">
      <h2 className="text-xl font-semibold text-slate-800">注册</h2>
      <form className="space-y-3" onSubmit={handleSubmit}>
        <input
          className="input"
          placeholder="用户名"
          value={form.username}
          onChange={(e) => setForm({ ...form, username: e.target.value })}
        />
        <input
          className="input"
          placeholder="邮箱"
          value={form.email}
          onChange={(e) => setForm({ ...form, email: e.target.value })}
        />
        <input
          className="input"
          type="password"
          placeholder="密码"
          value={form.password}
          onChange={(e) => setForm({ ...form, password: e.target.value })}
        />
        {error && <p className="text-sm text-red-600">{error}</p>}
        <button
          type="submit"
          className="btn w-full bg-indigo-600 text-white hover:bg-indigo-500 disabled:opacity-50"
          disabled={loading}
        >
          {loading ? "注册中..." : "注册"}
        </button>
      </form>
      <p className="text-sm text-slate-600">
        已有账号？ <Link to="/login" className="text-indigo-600 hover:underline">去登录</Link>
      </p>
    </div>
  );
};

export default RegisterPage;
