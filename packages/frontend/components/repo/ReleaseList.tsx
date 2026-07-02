import { Tag, Download, ExternalLink } from "lucide-react";
import { formatDate, formatFileSize } from "@github-cn/shared";
import type { GitHubRelease } from "@github-cn/shared";

interface ReleaseListProps {
  releases: GitHubRelease[];
}

export default function ReleaseList({ releases }: ReleaseListProps) {
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

          {release.assets.length > 0 && (
            <div className="mt-3 space-y-1.5">
              {release.assets.slice(0, 5).map((asset) => (
                <a
                  key={asset.id}
                  href={asset.browser_download_url}
                  className="flex items-center gap-2 px-3 py-1.5 bg-white hover:bg-slate-50 border border-slate-100 rounded-lg text-xs text-slate-600 transition-colors group"
                >
                  <Download className="w-3.5 h-3.5 text-slate-400 group-hover:text-blue-500" />
                  <span className="truncate flex-1">{asset.name}</span>
                  <span className="text-[10px] text-slate-400 shrink-0">
                    {formatFileSize(asset.size)}
                  </span>
                </a>
              ))}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
