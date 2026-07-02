import type { Metadata } from "next";
import { Star, GitFork, CircleDot, Clock, Scale, Sparkles } from "lucide-react";
import { LANGUAGE_COLORS } from "@github-cn/shared";
import { formatNumber, formatDate } from "@github-cn/shared";
import type { GitHubRepo, GitHubRelease } from "@github-cn/shared";
import ReadmeRenderer from "@/components/repo/ReadmeRenderer";
import DownloadPanel from "@/components/repo/DownloadPanel";
import ReleaseList from "@/components/repo/ReleaseList";

interface RepoPageProps {
  params: Promise<{ owner: string; repo: string }>;
}

async function fetchRepo(owner: string, repo: string): Promise<GitHubRepo> {
  const res = await fetch(`${process.env.BACKEND_URL || "http://localhost:3001"}/api/repo/${owner}/${repo}`, {
    next: { revalidate: 1800 },
  });
  if (!res.ok) throw new Error("仓库不存在");
  return res.json();
}

async function fetchReadme(owner: string, repo: string): Promise<string | null> {
  try {
    const res = await fetch(`${process.env.BACKEND_URL || "http://localhost:3001"}/api/repo/${owner}/${repo}/readme`, {
      next: { revalidate: 3600 },
    });
    if (!res.ok) return null;
    const data = await res.json();
    return data.content;
  } catch {
    return null;
  }
}

async function fetchReleases(owner: string, repo: string): Promise<GitHubRelease[]> {
  try {
    const res = await fetch(`${process.env.BACKEND_URL || "http://localhost:3001"}/api/repo/${owner}/${repo}/releases`, {
      next: { revalidate: 3600 },
    });
    if (!res.ok) return [];
    return res.json();
  } catch {
    return [];
  }
}

export async function generateMetadata({ params }: RepoPageProps): Promise<Metadata> {
  const { owner, repo } = await params;
  try {
    const repoData = await fetchRepo(owner, repo);
    return {
      title: `${repoData.full_name} - GitHub 中文解析 | 开源项目介绍`,
      description: `${repoData.description || ""} - ${formatNumber(repoData.stargazers_count)} stars, ${repoData.language || "Unknown"} 语言。`,
      openGraph: {
        title: `${repoData.full_name} - GitHub 中文解析`,
        description: repoData.description || undefined,
        type: "article",
      },
    };
  } catch {
    return {
      title: `${owner}/${repo} - GitHub 中文解析 | 开源项目介绍`,
    };
  }
}

export default async function RepoPage({ params }: RepoPageProps) {
  const { owner, repo } = await params;
  const repoData = await fetchRepo(owner, repo);
  const readmeContent = await fetchReadme(owner, repo);
  const releases = await fetchReleases(owner, repo);
  const langColor = repoData.language ? LANGUAGE_COLORS[repoData.language] : undefined;

  return (
    <div className="max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <img
            src={repoData.owner.avatar_url}
            alt={repoData.owner.login}
            className="w-10 h-10 rounded-xl border border-slate-100"
          />
          <div>
            <a href={`/user/${repoData.owner.login}`} className="text-sm text-blue-600 hover:underline">
              {repoData.owner.login}
            </a>
            <h1 className="font-display font-bold text-2xl sm:text-3xl text-slate-900 tracking-tight leading-tight">
              {repoData.name}
            </h1>
          </div>
        </div>

        {repoData.description && (
          <p className="text-slate-600 mt-3 max-w-3xl">{repoData.description}</p>
        )}

        {/* Stats Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-5">
          <div className="bg-slate-50/70 p-3 rounded-2xl flex flex-col justify-center border border-slate-100/50">
            <span className="text-[10px] uppercase text-slate-400 font-semibold tracking-wider">Stars</span>
            <div className="flex items-center gap-1 mt-0.5">
              <span className="font-bold text-slate-800 text-base">{formatNumber(repoData.stargazers_count)}</span>
              <Star className="w-4 h-4 text-amber-500 fill-amber-500" />
            </div>
          </div>

          <div className="bg-slate-50/70 p-3 rounded-2xl flex flex-col justify-center border border-slate-100/50">
            <span className="text-[10px] uppercase text-slate-400 font-semibold tracking-wider">Forks</span>
            <div className="flex items-center gap-1 mt-0.5">
              <span className="font-bold text-slate-800 text-base">{formatNumber(repoData.forks_count)}</span>
              <GitFork className="w-4 h-4 text-slate-400" />
            </div>
          </div>

          <div className="bg-slate-50/70 p-3 rounded-2xl flex flex-col justify-center border border-slate-100/50">
            <span className="text-[10px] uppercase text-slate-400 font-semibold tracking-wider">Issues</span>
            <div className="flex items-center gap-1 mt-0.5">
              <span className="font-bold text-slate-800 text-base">{formatNumber(repoData.open_issues_count)}</span>
              <CircleDot className="w-4 h-4 text-green-500" />
            </div>
          </div>

          <div className="bg-slate-50/70 p-3 rounded-2xl flex flex-col justify-center border border-slate-100/50">
            <span className="text-[10px] uppercase text-slate-400 font-semibold tracking-wider">Last Update</span>
            <span className="font-bold text-slate-800 text-sm mt-0.5">{formatDate(repoData.updated_at)}</span>
          </div>
        </div>
      </div>

      {/* Main Content: README + Sidebar */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* README */}
        <div className="lg:col-span-7">
          <div className="bg-white rounded-3xl border border-slate-100 p-6 shadow-xs">
            <h2 className="text-lg font-bold text-slate-800 mb-4">README</h2>
            {readmeContent ? (
              <ReadmeRenderer
                content={readmeContent}
                owner={owner}
                repo={repo}
                branch={repoData.default_branch}
              />
            ) : (
              <div className="text-center py-12">
                <p className="text-sm text-slate-400">该仓库没有 README 文件</p>
              </div>
            )}
          </div>
        </div>

        {/* Sidebar */}
        <div className="lg:col-span-5 space-y-6">
          {/* About */}
          <div className="bg-white rounded-3xl border border-slate-100 p-5 shadow-xs">
            <h3 className="text-sm font-bold text-slate-800 mb-3">关于</h3>

            <div className="space-y-2.5">
              {repoData.language && (
                <div className="flex items-center gap-2 text-sm text-slate-600">
                  <span
                    className="w-3 h-3 rounded-full inline-block shrink-0"
                    style={{ backgroundColor: langColor || "#94a3b8" }}
                  />
                  <span>{repoData.language}</span>
                </div>
              )}

              {repoData.license && (
                <div className="flex items-center gap-2 text-sm text-slate-600">
                  <Scale className="w-4 h-4 text-slate-400" />
                  <span>{repoData.license.name}</span>
                </div>
              )}

              <div className="flex items-center gap-2 text-sm text-slate-600">
                <Clock className="w-4 h-4 text-slate-400" />
                <span>创建于 {formatDate(repoData.created_at)}</span>
              </div>
            </div>

            {repoData.topics && repoData.topics.length > 0 && (
              <div className="mt-4 flex flex-wrap gap-1.5">
                {repoData.topics.map((topic) => (
                  <span
                    key={topic}
                    className="px-2.5 py-1 bg-blue-50 text-blue-700 text-[11px] font-medium rounded-full"
                  >
                    {topic}
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Download */}
          <div className="bg-white rounded-3xl border border-slate-100 p-5 shadow-xs">
            <h3 className="text-sm font-bold text-slate-800 mb-3">下载</h3>
            <DownloadPanel owner={owner} repo={repo} defaultBranch={repoData.default_branch} />
          </div>

          {/* Releases */}
          <div className="bg-white rounded-3xl border border-slate-100 p-5 shadow-xs">
            <h3 className="text-sm font-bold text-slate-800 mb-3">Releases</h3>
            <ReleaseList releases={releases} />
          </div>

          {/* AI Placeholder */}
          <div className="bg-white rounded-3xl border border-dashed border-slate-200 p-5">
            <div className="flex items-center gap-2 mb-2">
              <Sparkles className="w-4 h-4 text-slate-300 animate-pulse-slow" />
              <h3 className="text-sm font-bold text-slate-400">AI 分析</h3>
            </div>
            <p className="text-xs text-slate-300">
              AI 驱动的项目解读、技术栈分析、代码结构解析即将上线...
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
