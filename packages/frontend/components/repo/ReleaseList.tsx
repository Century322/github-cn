"use client";

import { useState } from "react";
import { Tag, Download, ExternalLink, ChevronDown, ChevronUp } from "lucide-react";
import { formatDate, formatFileSize } from "@github-cn/shared";
import type { GitHubRelease } from "@github-cn/shared";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

interface ReleaseListProps {
  releases: GitHubRelease[];
  repoFullName?: string;
}

function trackDownload(repoFullName: string, downloadType: string) {
  fetch("/api/download", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ repo_full_name: repoFullName, download_type: downloadType }),
  }).catch(() => {});
}

function ReleaseBody({ body }: { body: string }) {
  const [expanded, setExpanded] = useState(false);
  if (!body) return null;
  const shouldTruncate = body.length > 500;
  return (
    <div className="mt-3">
      <div className={`prose prose-slate prose-sm max-w-none text-xs ${!expanded && shouldTruncate ? "line-clamp-4" : ""}`}>
        <ReactMarkdown remarkPlugins={[remarkGfm]}>{expanded || !shouldTruncate ? body : body.slice(0, 500) + "..."}</ReactMarkdown>
      </div>
      {shouldTruncate && (
        <button onClick={() => setExpanded(!expanded)} className="mt-1 text-xs text-blue-600 hover:underline flex items-center gap-1">
          {expanded ? <><ChevronUp className="w-3 h-3" /> 收起</> : <><ChevronDown className="w-3 h-3" /> 展开全文</>}
        </button>
      )}
    </div>
  );
}

export default function ReleaseList({ releases, repoFullName }: ReleaseListProps) {
  if (releases.length === 0) {
    return (
      <div className="text-center py-6">
        <p className="text-sm text-slate-400">暂无 Release 版本</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {releases.map((release) => (
        <div
          key={release.id}
          className="p-4 bg-slate-50/50 rounded-2xl border border-slate-100/60"
        >
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <Tag className="w-4 h-4 text-blue-600" />
                <span className="font-semibold text-sm text-slate-800">
                  {release.name || release.tag_name}
                </span>
                {release.prerelease && (
                  <span className="text-[10px] font-semibold px-2 py-0.5 bg-amber-50 text-amber-700 rounded-full">
                    预发布
                  </span>
                )}
              </div>
              <p className="text-[11px] text-slate-400 mt-1">
                {formatDate(release.published_at)}
              </p>
            </div>
            <a
              href={release.html_url}
              target="_blank"
              rel="noopener noreferrer"
              className="p-1.5 hover:bg-slate-100 rounded-lg transition-colors text-slate-400 hover:text-slate-600"
            >
              <ExternalLink className="w-4 h-4" />
            </a>
          </div>

          <ReleaseBody body={release.body || ""} />

          {release.assets.length > 0 && (
            <div className="mt-3 space-y-1.5">
              {release.assets.slice(0, 5).map((asset) => (
                <a
                  key={asset.id}
                  href={asset.browser_download_url}
                  onClick={() => repoFullName && trackDownload(repoFullName, `release-${asset.name}`)}
                  className="flex items-center gap-2 px-3 py-1.5 bg-white hover:bg-slate-50 border border-slate-100 rounded-lg text-xs text-slate-600 transition-colors group"
                >
                  <Download className="w-3.5 h-3.5 text-slate-400 group-hover:text-blue-500" />
                  <span className="truncate flex-1">{asset.name}</span>
                  <span className="text-[10px] text-slate-400 shrink-0">
                    {formatFileSize(asset.size)}
                  </span>
                </a>
              ))}
              <div className="flex gap-2 pt-1">
                <a
                  href={release.zipball_url}
                  onClick={() => repoFullName && trackDownload(repoFullName, "release-source-zip")}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-white hover:bg-slate-50 border border-slate-100 rounded-lg text-xs text-slate-500 transition-colors"
                >
                  <Download className="w-3 h-3" />
                  Source code (zip)
                </a>
                <a
                  href={release.tarball_url}
                  onClick={() => repoFullName && trackDownload(repoFullName, "release-source-tar.gz")}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-white hover:bg-slate-50 border border-slate-100 rounded-lg text-xs text-slate-500 transition-colors"
                >
                  <Download className="w-3 h-3" />
                  Source code (tar.gz)
                </a>
              </div>
            </div>
          )}
          {release.assets.length === 0 && (
            <div className="mt-3 flex gap-2">
              <a
                href={release.zipball_url}
                onClick={() => repoFullName && trackDownload(repoFullName, "release-source-zip")}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-white hover:bg-slate-50 border border-slate-100 rounded-lg text-xs text-slate-500 transition-colors"
              >
                <Download className="w-3 h-3" />
                Source code (zip)
              </a>
              <a
                href={release.tarball_url}
                onClick={() => repoFullName && trackDownload(repoFullName, "release-source-tar.gz")}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-white hover:bg-slate-50 border border-slate-100 rounded-lg text-xs text-slate-500 transition-colors"
              >
                <Download className="w-3 h-3" />
                Source code (tar.gz)
              </a>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
