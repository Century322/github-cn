"use client";

import { useState } from "react";
import AuthForm from "@/components/auth/AuthForm";
import { useAuth } from "@/components/auth/AuthContext";
import { useRouter } from "next/navigation";

export default function AuthPage() {
  const [mode, setMode] = useState<"login" | "register">("login");
  const { login } = useAuth();
  const router = useRouter();

  const handleSuccess = () => {
    router.push("/");
  };

  return (
    <div className="min-h-[60vh] flex items-center justify-center py-12 px-4">
      <div className="w-full max-w-md">
        <AuthForm mode={mode} onSuccess={handleSuccess} onSwitch={() => setMode(mode === "login" ? "register" : "login")} />
      </div>
    </div>
  );
}
