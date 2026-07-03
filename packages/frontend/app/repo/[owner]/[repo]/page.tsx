import type { Metadata } from "next";
import Link from "next/link";
import { Star, GitFork, CircleDot, Eye, HardDrive } from "lucide-react";
import { LANGUAGE_COLORS } from "@github-cn/shared";
import { formatNumber, formatDate, formatFileSize } from "@github-cn/shared";
import type { GitHubRepo, GitHubRelease, GitHubContent, GitHubContributor, GitHubCommit, GitHubBranch, GitHubTag } from "@github-cn/shared";
import RepoDetailClient from "./RepoDetailClient";
import { fetchJSON, proxyAvatar } from "@/lib/api";

interface RepoPageProps {
  params: Promise<{ owner: string; repo: string }>;
}

export async function generateMetadata({ params }: RepoPageProps): Promise<Metadata> {
  const { owner, repo } = await params;
  const repoData = await fetchJSON<GitHubRepo>(`/api/repo/${owner}/${repo}`);
  if (repoData) {
    return {
      title: `${repoData.full_name} - GitHub 中文解析 | 开源项目介绍`,
      description: `${repoData.description || ""} - ${formatNumber(repoData.stargazers_count)} stars, ${repoData.language || "Unknown"} 语言。`,
    };
  }
  return { title: `${owner}/${repo} - GitHub 中文解析 | 开源项目介绍` };
}

export default async function RepoPage({ params }: RepoPageProps) {
  const { owner, repo } = await params;

  const [repoData, readmeContent, releases, contents, languages, contributors, branches, tags, commits] = await Promise.all([
    fetchJSON<GitHubRepo>(`/api/repo/${owner}/${repo}`, 1800),
    fetchJSON<{ content: string }>(`/api/repo/${owner}/${repo}/readme`, 3600),
    fetchJSON<GitHubRelease[]>(`/api/repo/${owner}/${repo}/releases`, 3600),
    fetchJSON<GitHubContent[]>(`/api/repo/${owner}/${repo}/contents`, 1800),
    fetchJSON<Record<string, number>>(`/api/repo/${owner}/${repo}/languages`, 1800),
    fetchJSON<GitHubContributor[]>(`/api/repo/${owner}/${repo}/contributors`, 1800),
    fetchJSON<GitHubBranch[]>(`/api/repo/${owner}/${repo}/branches`, 1800),
    fetchJSON<GitHubTag[]>(`/api/repo/${owner}/${repo}/tags`, 1800),
    fetchJSON<GitHubCommit[]>(`/api/repo/${owner}/${repo}/commits`, 1800),
  ]);

  if (!repoData) {
    return (
      <div className="max-w-lg mx-auto text-center py-20 px-4">
        <h2 className="font-display font-bold text-2xl text-slate-800 mb-2">仓库不存在</h2>
        <p className="text-sm text-slate-500 mb-6">该仓库可能已被删除或设为私有</p>
        <Link href="/" className="px-4 py-2 bg-blue-600 text-white text-sm font-semibold rounded-xl hover:bg-blue-500 transition-colors">
          返回首页
        </Link>
      </div>
    );
  }

  const langEntries = Object.entries(languages || {});
  const langTotal = langEntries.reduce((sum, [, v]) => sum + v, 0);
  const langPercentages = langEntries.map(([name, bytes]) => ({
    name,
    bytes,
    percentage: langTotal > 0 ? (bytes / langTotal) * 100 : 0,
    color: LANGUAGE_COLORS[name] || "#94a3b8",
  }));

  return (
    <div className="max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-1.5 text-xs text-slate-400 mb-4">
        <Link href="/" className="hover:text-blue-600 transition-colors">首页</Link>
        <span>/</span>
        <Link href={`/user/${owner}`} className="hover:text-blue-600 transition-colors">{owner}</Link>
        <span>/</span>
        <span className="text-slate-700 font-medium">{repo}</span>
      </nav>

      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-2">
          <img src={proxyAvatar(repoData.owner.avatar_url)} alt={repoData.owner.login} className="w-10 h-10 rounded-xl border border-slate-100" onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} />
          <div>
            <Link href={`/user/${repoData.owner.login}`} className="text-sm text-blue-600 hover:underline">{repoData.owner.login}</Link>
            <h1 className="font-display font-bold text-2xl sm:text-3xl text-slate-900 tracking-tight leading-tight">
              {repoData.name}
              {repoData.archived && <span className="ml-2 text-xs font-semibold px-2 py-0.5 bg-amber-50 text-amber-700 rounded-full">已归档</span>}
              {repoData.private && <span className="ml-2 text-xs font-semibold px-2 py-0.5 bg-slate-100 text-slate-600 rounded-full">Private</span>}
              {repoData.fork && repoData.parent && (
                <span className="ml-2 text-xs font-semibold px-2 py-0.5 bg-blue-50 text-blue-700 rounded-full inline-flex items-center gap-1">
                  <GitFork className="w-3 h-3" /> Forked from <Link href={`/repo/${repoData.parent.full_name}`} className="hover:underline">{repoData.parent.full_name}</Link>
                </span>
              )}
            </h1>
          </div>
        </div>

        {repoData.description && <p className="text-slate-600 mt-3 max-w-3xl">{repoData.description}</p>}

        {/* Stats Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-3 mt-5">
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
            <span className="text-[10px] uppercase text-slate-400 font-semibold tracking-wider">Issues & PRs</span>
            <div className="flex items-center gap-1 mt-0.5">
              <span className="font-bold text-slate-800 text-base">{formatNumber(repoData.open_issues_count)}</span>
              <CircleDot className="w-4 h-4 text-green-500" />
            </div>
          </div>
          <div className="bg-slate-50/70 p-3 rounded-2xl flex flex-col justify-center border border-slate-100/50">
            <span className="text-[10px] uppercase text-slate-400 font-semibold tracking-wider">Watchers</span>
            <div className="flex items-center gap-1 mt-0.5">
              <span className="font-bold text-slate-800 text-base">{formatNumber(repoData.subscribers_count)}</span>
              <Eye className="w-4 h-4 text-slate-400" />
            </div>
          </div>
          <div className="bg-slate-50/70 p-3 rounded-2xl flex flex-col justify-center border border-slate-100/50">
            <span className="text-[10px] uppercase text-slate-400 font-semibold tracking-wider">大小</span>
            <div className="flex items-center gap-1 mt-0.5">
              <span className="font-bold text-slate-800 text-base">{formatFileSize(repoData.size * 1024)}</span>
              <HardDrive className="w-4 h-4 text-slate-400" />
            </div>
          </div>
          <div className="bg-slate-50/70 p-3 rounded-2xl flex flex-col justify-center border border-slate-100/50">
            <span className="text-[10px] uppercase text-slate-400 font-semibold tracking-wider">Last Update</span>
            <span className="font-bold text-slate-800 text-base mt-0.5">{formatDate(repoData.updated_at)}</span>
          </div>
        </div>
      </div>

      {/* Language Bar */}
      {langPercentages.length > 0 && (
        <div className="mb-6">
          <div className="flex h-2 rounded-full overflow-hidden bg-slate-100">
            {langPercentages.map((lang) => (
              <div key={lang.name} style={{ width: `${lang.percentage}%`, backgroundColor: lang.color }} className="h-full first:rounded-l-full last:rounded-r-full" />
            ))}
          </div>
          <div className="flex flex-wrap gap-3 mt-2">
            {langPercentages.slice(0, 6).map((lang) => (
              <span key={lang.name} className="flex items-center gap-1.5 text-xs text-slate-500">
                <span className="w-3 h-3 rounded-full inline-block shrink-0" style={{ backgroundColor: lang.color }} />
                <span className="font-medium text-slate-700">{lang.name}</span>
                <span>{lang.percentage.toFixed(1)}%</span>
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Main Content */}
      <RepoDetailClient
        owner={owner}
        repo={repo}
        repoData={repoData}
        readmeContent={readmeContent?.content || null}
        releases={releases || []}
        initialContents={contents || []}
        contributors={contributors || []}
        branches={branches || []}
        tags={tags || []}
        commits={commits || []}
      />
    </div>
  );
}
