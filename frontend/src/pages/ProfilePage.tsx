import { ChangeEvent, FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "react-hot-toast";
import { format } from "date-fns";
import { BarChart3, Award, CheckCircle, Activity, Edit3, Upload, Lock, Hash } from "lucide-react";

import { resetPasswordApi, sendVerificationCode, uploadAvatarApi } from "../api";
import AvatarCropModal from "../components/AvatarCropModal";
import { useAuth } from "../context/AuthContext";

const getAvatar = (avatarUrl?: string | null, username?: string) => {
  if (avatarUrl) return avatarUrl;
  const seed = (username || "u").charCodeAt(0);
  const hue = (seed * 37) % 360;
  return `data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='120' height='120'%3E%3Cdefs%3E%3ClinearGradient id='g' x1='0' y1='0' x2='1' y2='1'%3E%3Cstop offset='0%' stop-color='hsl(${hue},70%25,60%25)'/%3E%3Cstop offset='100%' stop-color='hsl(${(hue + 60) % 360},70%25,50%25)'/%3E%3C/linearGradient%3E%3C/defs%3E%3Crect width='120' height='120' rx='24' fill='url(%23g)'/%3E%3Ctext x='50%25' y='54%25' font-size='48' text-anchor='middle' fill='%23fff' font-family='Inter, sans-serif' dy='.35em'%3E${(username || "U")[0].toUpperCase()}%3C/text%3E%3C/svg%3E`;
};

const ProfilePage = () => {
  const { user, refreshProfile } = useAuth();
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [avatarUploading, setAvatarUploading] = useState(false);
  const [resetForm, setResetForm] = useState({ code: "", newPassword: "" });
  const [resetErrors, setResetErrors] = useState<{ code?: string; password?: string }>({});
  const [resetSending, setResetSending] = useState(false);
  const [resetCountdown, setResetCountdown] = useState(0);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const avatar = useMemo(() => getAvatar(user?.avatar_url, user?.username), [user]);
  const acceptance = user ? Math.round(user.acceptance_rate * 100) : 0;

  useEffect(() => {
    if (!resetCountdown) return;
    const timer = setTimeout(() => setResetCountdown((v) => v - 1), 1000);
    return () => clearTimeout(timer);
  }, [resetCountdown]);

  useEffect(() => {
    return () => {
      if (preview) URL.revokeObjectURL(preview);
    };
  }, [preview]);

  if (!user) {
    return <p className="text-sm text-slate-600">请登录后查看个人主页。</p>;
  }

  const handlePickAvatar = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const url = URL.createObjectURL(file);
    setAvatarFile(file);
    setPreview(url);
  };

  const handleAvatarConfirm = async (blob: Blob) => {
    if (!blob) return;
    setAvatarUploading(true);
    try {
      const uploadFile = new File([blob], avatarFile?.name || "avatar.png", {
        type: blob.type || avatarFile?.type || "image/png"
      });
      await uploadAvatarApi(uploadFile);
      toast.success("头像已更新");
      await refreshProfile();
    } catch (err: any) {
      const msg = err?.response?.data?.detail || "上传头像失败";
      toast.error(msg);
    } finally {
      setAvatarUploading(false);
      setPreview(null);
      setAvatarFile(null);
    }
  };

  const validateReset = () => {
    const errors: { code?: string; password?: string } = {};
    if (!resetForm.code.trim()) errors.code = "请输入验证码";
    if (resetForm.code && !/^[0-9]{6}$/.test(resetForm.code)) errors.code = "验证码应为 6 位数字";
    if (!resetForm.newPassword.trim()) errors.password = "请输入新密码";
    if (resetForm.newPassword.length > 0 && resetForm.newPassword.length < 8) errors.password = "密码长度至少 8 位";
    setResetErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSendResetCode = async () => {
    setResetSending(true);
    try {
      await sendVerificationCode(user.email, "reset");
      toast.success("验证码已发送到邮箱");
      setResetCountdown(60);
    } catch (err: any) {
      const msg = err?.response?.data?.detail || "发送验证码失败";
      toast.error(msg);
    } finally {
      setResetSending(false);
    }
  };

  const handleResetPassword = async (e: FormEvent) => {
    e.preventDefault();
    if (!validateReset()) return;
    try {
      await resetPasswordApi({ email: user.email, code: resetForm.code, new_password: resetForm.newPassword });
      toast.success("密码已重置，请使用新密码登录");
      setResetForm({ code: "", newPassword: "" });
    } catch (err: any) {
      const msg = err?.response?.data?.detail || "重置密码失败";
      toast.error(msg);
    }
  };

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="card p-5 flex flex-col md:flex-row md:items-center gap-4">
        <div className="relative w-20 h-20">
          <img
            src={avatar}
            alt="avatar"
            className="w-20 h-20 rounded-2xl border border-slate-200 dark:border-slate-700 object-cover"
          />
          <button
            type="button"
            onClick={handlePickAvatar}
            className="absolute inset-0 bg-black/50 text-white text-xs opacity-0 hover:opacity-100 rounded-2xl flex items-center justify-center gap-1 transition"
          >
            <Edit3 className="w-4 h-4" /> 编辑
          </button>
          <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleFileChange} />
        </div>
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
        <form className="card p-4 space-y-3" onSubmit={handleResetPassword}>
          <h3 className="text-lg font-semibold text-slate-800 dark:text-white mb-1">修改密码</h3>
          <div className="text-xs text-slate-500 dark:text-slate-400">邮箱验证码验证后可重置密码</div>
          <div className="space-y-2">
            <label className="text-xs text-slate-500 dark:text-slate-400">邮箱</label>
            <div className="relative">
              <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-slate-400">
                <Upload className="w-4 h-4" />
              </span>
              <input
                disabled
                value={user.email}
                className="input w-full !pl-12 pr-3 py-3 rounded-xl bg-slate-100 dark:bg-slate-800/60 text-slate-500"
              />
            </div>
          </div>
          <div className="space-y-2">
            <label className="text-xs text-slate-500 dark:text-slate-400">验证码</label>
            <div className="relative">
              <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-slate-400">
                <Hash className="w-4 h-4" />
              </span>
              <input
                className="input w-full !pl-12 pr-28 py-3 rounded-xl bg-white/70 dark:bg-slate-800/80"
                placeholder="邮箱验证码"
                value={resetForm.code}
                onChange={(e) => setResetForm((prev) => ({ ...prev, code: e.target.value }))}
              />
              <button
                type="button"
                className="absolute right-2 top-1/2 -translate-y-1/2 px-3 py-2 text-xs rounded-lg bg-indigo-600 text-white disabled:opacity-60"
                onClick={handleSendResetCode}
                disabled={resetSending || resetCountdown > 0}
              >
                {resetCountdown > 0 ? `${resetCountdown}s` : resetSending ? "发送中..." : "获取验证码"}
              </button>
            </div>
            {resetErrors.code && <p className="text-xs text-red-600">{resetErrors.code}</p>}
          </div>
          <div className="space-y-2">
            <label className="text-xs text-slate-500 dark:text-slate-400">新密码</label>
            <div className="relative">
              <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-slate-400">
                <Lock className="w-4 h-4" />
              </span>
              <input
                className="input w-full !pl-12 pr-3 py-3 rounded-xl bg-white/70 dark:bg-slate-800/80"
                type="password"
                placeholder="至少 8 位"
                value={resetForm.newPassword}
                onChange={(e) => setResetForm((prev) => ({ ...prev, newPassword: e.target.value }))}
              />
            </div>
            {resetErrors.password && <p className="text-xs text-red-600">{resetErrors.password}</p>}
          </div>
          <button type="submit" className="btn w-full bg-indigo-600 text-white hover:bg-indigo-500 rounded-xl py-3">
            保存密码
          </button>
        </form>
      </div>
      <AvatarCropModal
        isOpen={!!preview}
        imageSrc={preview}
        loading={avatarUploading}
        onClose={() => {
          setPreview(null);
          setAvatarFile(null);
        }}
        onConfirm={handleAvatarConfirm}
      />
    </div>
  );
};

export default ProfilePage;
