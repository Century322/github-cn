import Link from "next/link";
import { GitBranch } from "lucide-react";

export default function Header() {
  return (
    <header className="bg-white border-b border-slate-100 sticky top-0 z-30 shadow-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3.5 flex items-center justify-between gap-4">
        <Link href="/" className="flex items-center gap-3">
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center shadow-md shadow-black/15 isolation-isolate border border-slate-200"
            style={{ background: "linear-gradient(135deg, #1e293b 50%, #3b82f6 50%)" }}
          >
            <GitBranch className="w-5 h-5 text-white" />
          </div>
          <h1 className="font-display font-bold text-slate-900 text-lg sm:text-xl tracking-tight leading-tight">
            GitHub 中文
          </h1>
        </Link>

        <nav className="hidden sm:flex items-center gap-6 text-sm font-medium text-slate-500">
          <Link href="/" className="hover:text-slate-900 transition-colors">
            首页
          </Link>
          <Link href="/admin" className="hover:text-slate-900 transition-colors">
            统计
          </Link>
        </nav>
      </div>
    </header>
  );
}
