import type { Metadata } from "next";
import { MapPin, Link as LinkIcon, Building } from "lucide-react";
import { formatNumber } from "@github-cn/shared";
import type { GitHubUser, GitHubRepo } from "@github-cn/shared";
import RepoCard from "@/components/repo/RepoCard";

interface UserPageProps {
  params: Promise<{ username: string }>;
}

async function fetchUser(username: string): Promise<GitHubUser> {
  const res = await fetch(`${process.env.BACKEND_URL || "http://localhost:3001"}/api/user/${username}`, {
    next: { revalidate: 1800 },
  });
  if (!res.ok) throw new Error("用户不存在");
  return res.json();
}

async function fetchUserRepos(username: string): Promise<GitHubRepo[]> {
  try {
    const res = await fetch(`${process.env.BACKEND_URL || "http://localhost:3001"}/api/user/${username}/repos`, {
      next: { revalidate: 1800 },
    });
    if (!res.ok) return [];
    return res.json();
  } catch {
    return [];
  }
}

export async function generateMetadata({ params }: UserPageProps): Promise<Metadata> {
  const { username } = await params;
  try {
    const user = await fetchUser(username);
    return {
      title: `${user.name || user.login} - GitHub 用户 | GitHub 中文`,
      description: user.bio || `${user.login} 的 GitHub 个人主页，${user.public_repos} 个公开仓库`,
    };
  } catch {
    return { title: `${username} - GitHub 用户 | GitHub 中文` };
  }
}

export default async function UserPage({ params }: UserPageProps) {
  const { username } = await params;
  const user = await fetchUser(username);
  const repos = await fetchUserRepos(username);

  return (
    <div className="max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* User Header */}
      <div className="bg-white rounded-3xl border border-slate-100 p-6 shadow-xs mb-8">
        <div className="flex flex-col sm:flex-row items-start gap-5">
          <img
            src={user.avatar_url}
            alt={user.login}
            className="w-20 h-20 rounded-2xl border border-slate-100"
          />
          <div className="flex-1 min-w-0">
            <h1 className="font-display font-bold text-2xl text-slate-900 tracking-tight">
              {user.name || user.login}
            </h1>
            <a
              href={user.html_url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-blue-600 hover:underline"
            >
              @{user.login}
            </a>

            {user.bio && <p className="text-sm text-slate-600 mt-2">{user.bio}</p>}

            <div className="flex flex-wrap items-center gap-4 mt-3 text-xs text-slate-500">
              {user.company && (
                <span className="flex items-center gap-1">
                  <Building className="w-3.5 h-3.5" />
                  {user.company}
                </span>
              )}
              {user.location && (
                <span className="flex items-center gap-1">
                  <MapPin className="w-3.5 h-3.5" />
                  {user.location}
                </span>
              )}
              {user.blog && (
                <a href={user.blog.startsWith("http") ? user.blog : `https://${user.blog}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 hover:text-blue-600 transition-colors">
                  <LinkIcon className="w-3.5 h-3.5" />
                  {user.blog.replace(/^https?:\/\//, "")}
                </a>
              )}
            </div>

            <div className="flex items-center gap-4 mt-4 text-xs text-slate-500">
              <span><strong className="text-slate-800">{formatNumber(user.followers)}</strong> 关注者</span>
              <span><strong className="text-slate-800">{formatNumber(user.following)}</strong> 关注中</span>
              <span><strong className="text-slate-800">{user.public_repos}</strong> 仓库</span>
            </div>
          </div>
        </div>
      </div>

      {/* Repos */}
      <h2 className="text-lg font-bold text-slate-800 mb-4">公开仓库</h2>
      {repos.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {repos.map((repo) => (
            <RepoCard key={repo.id} repo={repo} />
          ))}
        </div>
      ) : (
        <div className="bg-white border border-slate-100 rounded-3xl p-12 text-center">
          <p className="text-sm text-slate-400">没有公开仓库</p>
        </div>
      )}
    </div>
  );
}
