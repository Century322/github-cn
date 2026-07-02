import { GitBranch } from "lucide-react";

export default function Footer() {
  return (
    <footer className="bg-white border-t border-slate-100 mt-16 py-12 text-xs text-slate-400 font-medium">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col md:flex-row justify-between items-center gap-6">
        <div className="text-center md:text-left space-y-1">
          <div className="flex items-center gap-2 justify-center md:justify-start">
            <GitBranch className="w-4 h-4 text-slate-500" />
            <span className="font-bold text-slate-700 text-sm">GitHub 中文</span>
          </div>
          <p>
            © {new Date().getFullYear()} 面向中国开发者的 GitHub 增强搜索平台。数据来源于 GitHub 公开 API。
          </p>
        </div>
        <div className="flex gap-4 text-slate-400 text-xs shrink-0 font-semibold">
          <a
            href="https://github.com"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-slate-600 transition-colors"
          >
            GitHub
          </a>
          <span>·</span>
          <a
            href="https://docs.github.com/rest"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-slate-600 transition-colors"
          >
            GitHub API
          </a>
        </div>
      </div>
    </footer>
  );
}
