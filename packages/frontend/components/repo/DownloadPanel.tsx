"use client";

import { useState } from "react";
import { Download, Copy, Check, ExternalLink } from "lucide-react";

interface DownloadPanelProps {
  owner: string;
  repo: string;
  defaultBranch: string;
}

export default function DownloadPanel({ owner, repo, defaultBranch }: DownloadPanelProps) {
  const [copied, setCopied] = useState(false);
  const cloneUrl = `https://github.com/${owner}/${repo}.git`;
  const zipUrl = `https://github.com/${owner}/${repo}/archive/refs/heads/${defaultBranch}.zip`;

  const handleCopy = async () => {
    await navigator.clipboard.writeText(cloneUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-2.5">
      <button
        onClick={handleCopy}
        className="w-full flex items-center gap-2 px-4 py-2.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl text-xs font-semibold text-slate-600 transition-colors"
      >
        {copied ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
        <span className="font-mono text-[11px] truncate flex-1 text-left">{cloneUrl}</span>
        <span className="shrink-0">{copied ? "已复制" : "复制 Clone URL"}</span>
      </button>

      <a
        href={zipUrl}
        className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-semibold transition-colors shadow-xs"
      >
        <Download className="w-4 h-4" />
        <span>下载 ZIP</span>
      </a>

      <a
        href={`https://github.com/${owner}/${repo}`}
        target="_blank"
        rel="noopener noreferrer"
        className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl text-xs font-semibold text-slate-600 transition-colors"
      >
        <ExternalLink className="w-4 h-4" />
        <span>在 GitHub 查看</span>
      </a>
    </div>
  );
}
