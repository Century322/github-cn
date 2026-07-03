"use client";

import { useState } from "react";
import { Mail, Lock, User, Loader2 } from "lucide-react";

interface AuthFormProps {
  mode: "login" | "register";
  onSuccess: (token: string, user: { id: number; email: string; nickname: string | null; avatar_url: string | null }) => void;
  onSwitch: () => void;
}

export default function AuthForm({ mode, onSuccess, onSwitch }: AuthFormProps) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [nickname, setNickname] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const body = mode === "register" ? { email, password, nickname: nickname || undefined } : { email, password };
      const res = await fetch(`/api/auth/${mode}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "操作失败");
        return;
      }

      localStorage.setItem("token", data.token);
      localStorage.setItem("user", JSON.stringify(data.user));
      onSuccess(data.token, data.user);
    } catch {
      setError("网络错误，请重试");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto">
      <div className="bg-white rounded-3xl border border-slate-100 p-8 shadow-xs">
        <h2 className="font-display font-bold text-2xl text-slate-800 mb-1">
          {mode === "login" ? "登录" : "注册"}
        </h2>
        <p className="text-sm text-slate-400 mb-6">
          {mode === "login" ? "登录你的账号以使用收藏和历史功能" : "创建账号开始使用"}
        </p>

        {error && (
          <div className="mb-4 px-4 py-2.5 bg-red-50 border border-red-100 rounded-xl text-xs text-red-600">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1.5">邮箱</label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300" />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="your@email.com"
                required
                className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>

          {mode === "register" && (
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1.5">昵称</label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300" />
                <input
                  type="text"
                  value={nickname}
                  onChange={(e) => setNickname(e.target.value)}
                  placeholder="你的昵称（可选）"
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1.5">密码</label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300" />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder={mode === "register" ? "至少6位" : "你的密码"}
                required
                minLength={6}
                className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 bg-blue-600 hover:bg-blue-500 disabled:bg-blue-300 text-white rounded-xl text-sm font-semibold transition-colors flex items-center justify-center gap-2"
          >
            {loading && <Loader2 className="w-4 h-4 animate-spin" />}
            {mode === "login" ? "登录" : "注册"}
          </button>
        </form>

        <div className="mt-5 pt-5 border-t border-slate-100 text-center">
          <span className="text-xs text-slate-400">
            {mode === "login" ? "还没有账号？" : "已有账号？"}
          </span>
          <button onClick={onSwitch} className="text-xs text-blue-600 hover:underline ml-1 font-semibold">
            {mode === "login" ? "注册" : "登录"}
          </button>
        </div>
      </div>
    </div>
  );
}
