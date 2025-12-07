import { FormEvent, useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import isEmail from "validator/lib/isEmail";
import { toast } from "react-hot-toast";
import { User, Lock, Mail, Hash } from "lucide-react";

import { sendVerificationCode } from "../api";
import { useAuth } from "../context/AuthContext";

const usernameRegex = /^[a-zA-Z0-9_]+$/;

const RegisterPage = () => {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ username: "", email: "", password: "", verification_code: "" });
  const [errors, setErrors] = useState<{ username?: string; email?: string; password?: string; code?: string }>({});
  const [loading, setLoading] = useState(false);
  const [sendingCode, setSendingCode] = useState(false);
  const [countdown, setCountdown] = useState(0);

  useEffect(() => {
    if (!countdown) return;
    const timer = setTimeout(() => setCountdown((v) => v - 1), 1000);
    return () => clearTimeout(timer);
  }, [countdown]);

  const validateUsername = (val: string) => {
    if (!val.trim()) return "请输入用户名";
    if (!usernameRegex.test(val)) return "用户名只能包含字母、数字或下划线";
    return "";
  };

  const validateEmail = (val: string) => {
    if (!val.trim()) return "请输入邮箱";
    if (!isEmail(val)) return "请输入合法的邮箱地址";
    return "";
  };

  const validatePassword = (val: string) => {
    if (!val.trim()) return "请输入密码";
    if (val.length < 8) return "密码长度至少 8 位";
    return "";
  };

  const validateCode = (val: string) => {
    if (!val.trim()) return "请输入验证码";
    if (!/^[0-9]{6}$/.test(val)) return "验证码为 6 位数字";
    return "";
  };

  const validateAll = () => {
    const usernameError = validateUsername(form.username);
    const emailError = validateEmail(form.email);
    const passwordError = validatePassword(form.password);
    const codeError = validateCode(form.verification_code);
    setErrors({
      username: usernameError || undefined,
      email: emailError || undefined,
      password: passwordError || undefined,
      code: codeError || undefined
    });
    return !(usernameError || emailError || passwordError || codeError);
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!validateAll()) return;
    setLoading(true);
    try {
      await register(form);
      toast.success(`欢迎，${form.username}!`);
      setTimeout(() => navigate("/"), 800);
    } catch (err: any) {
      const msg = err?.response?.data?.detail || "注册失败";
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleSendCode = async () => {
    const emailError = validateEmail(form.email);
    if (emailError) {
      setErrors((prev) => ({ ...prev, email: emailError }));
      return;
    }
    setSendingCode(true);
    try {
      await sendVerificationCode(form.email, "register");
      toast.success("验证码已发送，请查看邮箱或控制台");
      setCountdown(60);
    } catch (err: any) {
      const msg = err?.response?.data?.detail || "发送验证码失败";
      toast.error(msg);
    } finally {
      setSendingCode(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-64px)] flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800">
      <div className="w-full max-w-md p-8 rounded-2xl bg-white/80 dark:bg-slate-900/80 shadow-lg border border-white/60 dark:border-slate-700/60 backdrop-blur animate-fade-in">
        <h2 className="text-2xl font-semibold text-slate-800 dark:text-white mb-2 text-center">注册</h2>
        <p className="text-sm text-slate-500 dark:text-slate-300 text-center mb-6">创建账号，解锁你的刷题历程</p>
        <form className="mt-6" onSubmit={handleSubmit}>
          <div className="relative mb-10">
            <span className="pointer-events-none absolute inset-y-0 left-0 pl-3 flex items-center justify-center h-full text-slate-400">
              <User className="w-4 h-4" />
            </span>
            <input
              className="input w-full !pl-12 pr-3 py-3 rounded-xl bg-white/70 dark:bg-slate-800/80 leading-normal"
              placeholder="用户名"
              value={form.username}
              onChange={(e) => setForm({ ...form, username: e.target.value })}
            />
            <p className="absolute -bottom-6 left-0 text-xs text-red-600 leading-none">{errors.username || ""}</p>
          </div>
          <div className="relative mb-10">
            <span className="pointer-events-none absolute inset-y-0 left-0 pl-3 flex items-center justify-center h-full text-slate-400">
              <Mail className="w-4 h-4" />
            </span>
            <input
              className="input w-full !pl-12 pr-3 py-3 rounded-xl bg-white/70 dark:bg-slate-800/80 leading-normal"
              placeholder="邮箱"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
            />
            <p className="absolute -bottom-6 left-0 text-xs text-red-600 leading-none">{errors.email || ""}</p>
          </div>
          <div className="relative mb-10">
            <span className="pointer-events-none absolute inset-y-0 left-0 pl-3 flex items-center justify-center h-full text-slate-400">
              <Lock className="w-4 h-4" />
            </span>
            <input
              className="input w-full !pl-12 pr-3 py-3 rounded-xl bg-white/70 dark:bg-slate-800/80 leading-normal"
              type="password"
              placeholder="密码（至少 8 位）"
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
            />
            <p className="absolute -bottom-6 left-0 text-xs text-red-600 leading-none">{errors.password || ""}</p>
          </div>
          <div className="relative mb-10">
            <span className="pointer-events-none absolute inset-y-0 left-0 pl-3 flex items-center justify-center h-full text-slate-400">
              <Hash className="w-4 h-4" />
            </span>
            <input
              className="input w-full !pl-12 pr-28 py-3 rounded-xl bg-white/70 dark:bg-slate-800/80 leading-normal"
              placeholder="验证码"
              value={form.verification_code}
              onChange={(e) => setForm({ ...form, verification_code: e.target.value })}
            />
            <div className="absolute inset-y-0 right-1 flex items-center h-full">
              <button
                type="button"
                className="btn px-3 py-1.5 text-xs rounded-lg bg-indigo-600 text-white hover:bg-indigo-500 disabled:opacity-60 flex items-center justify-center leading-none"
                onClick={handleSendCode}
                disabled={sendingCode || countdown > 0}
              >
                {countdown > 0 ? `${countdown}s` : sendingCode ? "发送中..." : "获取验证码"}
              </button>
            </div>
            <p className="absolute -bottom-6 left-0 text-xs text-red-600 leading-none">{errors.code || ""}</p>
          </div>
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
