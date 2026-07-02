import Link from "next/link";
import { Star, GitFork } from "lucide-react";
import { LANGUAGE_COLORS } from "@github-cn/shared";
import { formatNumber, formatDate } from "@github-cn/shared";
import type { GitHubRepo } from "@github-cn/shared";

interface RepoCardProps {
  repo: GitHubRepo;
}

export default function RepoCard({ repo }: RepoCardProps) {
  const langColor = repo.language ? LANGUAGE_COLORS[repo.language] : undefined;

  return (
    <Link href={`/repo/${repo.full_name}`} className="group block">
      <div className="bg-white rounded-2xl border border-slate-100 p-4 shadow-xs hover:shadow-lg hover:border-blue-100 transition-all duration-300 cursor-pointer flex flex-col h-full">
        <div className="flex items-start gap-3 mb-3">
          <img
            src={repo.owner.avatar_url}
            alt={repo.owner.login}
            className="w-10 h-10 rounded-xl border border-slate-100"
          />
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-slate-800 text-[15px] leading-tight truncate group-hover:text-blue-600 transition-colors">
              {repo.full_name}
            </h3>
            <p className="text-xs text-slate-400 mt-0.5 truncate">{repo.owner.login}</p>
          </div>
        </div>

        {repo.description && (
          <p className="text-xs text-slate-500 line-clamp-2 mb-3 flex-grow leading-relaxed">
            {repo.description}
          </p>
        )}

        <div className="mt-auto pt-3 border-t border-slate-50 flex items-center justify-between">
          <div className="flex items-center gap-3 text-xs text-slate-500">
            {repo.language && (
              <span className="flex items-center gap-1.5">
                <span
                  className="w-3 h-3 rounded-full inline-block"
                  style={{ backgroundColor: langColor || "#94a3b8" }}
                />
                <span>{repo.language}</span>
              </span>
            )}
            <span className="flex items-center gap-1">
              <Star className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />
              <span>{formatNumber(repo.stargazers_count)}</span>
            </span>
            <span className="flex items-center gap-1">
              <GitFork className="w-3.5 h-3.5" />
              <span>{formatNumber(repo.forks_count)}</span>
            </span>
          </div>
          <span className="text-[10px] text-slate-400">{formatDate(repo.updated_at)}</span>
        </div>
      </div>
    </Link>
  );
}
