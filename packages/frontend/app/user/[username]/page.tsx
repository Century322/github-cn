import type { Metadata } from "next";
import Link from "next/link";
import type { GitHubUser, GitHubRepo, GitHubOrg } from "@github-cn/shared";
import { formatNumber, formatDate, LANGUAGE_COLORS } from "@github-cn/shared";
import UserPageClient from "./UserPageClient";
import { fetchJSON, proxyAvatar } from "@/lib/api";

interface UserPageProps {
  params: Promise<{ username: string }>;
}

export async function generateMetadata({ params }: UserPageProps): Promise<Metadata> {
  const { username } = await params;
  const user = await fetchJSON<GitHubUser>(`/api/user/${username}`);
  if (user) {
    return {
      title: `${user.name || user.login} - GitHub 用户 | 开源项目介绍`,
      description: user.bio || `${user.login} 的 GitHub 个人主页 - ${user.public_repos} 个公开仓库，${formatNumber(user.followers)} 关注者`,
    };
  }
  return { title: `${username} - GitHub 用户` };
}

export default async function UserPage({ params }: UserPageProps) {
  const { username } = await params;

  const [userData, reposData, orgs] = await Promise.all([
    fetchJSON<GitHubUser>(`/api/user/${username}`),
    fetchJSON<{ repos: GitHubRepo[]; has_more: boolean }>(`/api/user/${username}/repos?page=1&sort=stars`),
    fetchJSON<GitHubOrg[]>(`/api/user/${username}/orgs`),
  ]);

  if (!userData) {
    return (
      <div className="max-w-lg mx-auto text-center py-20 px-4">
        <h2 className="font-display font-bold text-2xl text-slate-800 mb-2">用户不存在</h2>
        <p className="text-sm text-slate-500">该用户可能已被删除</p>
      </div>
    );
  }

  const repos = reposData?.repos || [];
  const hasMore = reposData?.has_more || false;

  return (
    <div className="max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-1.5 text-xs text-slate-400 mb-6">
        <Link href="/" className="hover:text-blue-600 transition-colors">首页</Link>
        <span>/</span>
        <span className="text-slate-700 font-medium">{username}</span>
      </nav>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Sidebar */}
        <div className="lg:col-span-4">
          <div className="bg-white rounded-3xl border border-slate-100 p-6 shadow-xs">
            <img src={proxyAvatar(userData.avatar_url)} alt={userData.login} className="w-24 h-24 rounded-2xl border border-slate-100 mb-4" />
            <h1 className="font-display font-bold text-xl text-slate-800">{userData.name || userData.login}</h1>
            <p className="text-sm text-slate-400 mt-0.5">@{userData.login}</p>
            {userData.bio && <p className="text-sm text-slate-600 mt-3">{userData.bio}</p>}

            <div className="mt-4 space-y-2">
              {userData.company && (
                <p className="text-sm text-slate-500">{userData.company}</p>
              )}
              {userData.location && (
                <p className="text-sm text-slate-500">{userData.location}</p>
              )}
              {userData.blog && (
                <a href={userData.blog.startsWith("http") ? userData.blog : `https://${userData.blog}`} target="_blank" rel="noopener noreferrer"
                  className="text-sm text-blue-600 hover:underline block truncate">{userData.blog}</a>
              )}
              {userData.twitter_username && (
                <a href={`https://x.com/${userData.twitter_username}`} target="_blank" rel="noopener noreferrer"
                  className="text-sm text-blue-600 hover:underline block">@{userData.twitter_username}</a>
              )}
            </div>

            <div className="grid grid-cols-3 gap-3 mt-5 pt-5 border-t border-slate-100">
              <div className="text-center">
                <div className="font-bold text-slate-800 text-sm">{formatNumber(userData.followers)}</div>
                <div className="text-[10px] text-slate-400 font-semibold uppercase">关注者</div>
              </div>
              <div className="text-center">
                <div className="font-bold text-slate-800 text-sm">{formatNumber(userData.following)}</div>
                <div className="text-[10px] text-slate-400 font-semibold uppercase">关注中</div>
              </div>
              <div className="text-center">
                <div className="font-bold text-slate-800 text-sm">{userData.public_repos}</div>
                <div className="text-[10px] text-slate-400 font-semibold uppercase">仓库</div>
              </div>
            </div>
          </div>

          {/* Organizations */}
          {orgs && orgs.length > 0 && (
            <div className="bg-white rounded-3xl border border-slate-100 p-5 shadow-xs mt-6">
              <h3 className="text-sm font-bold text-slate-800 mb-3">所属组织</h3>
              <div className="flex flex-wrap gap-2">
                {orgs.map((org) => (
                  <a key={org.id} href={org.html_url} target="_blank" rel="noopener noreferrer" title={org.description || org.login}>
                    <img src={proxyAvatar(org.avatar_url)} alt={org.login} className="w-10 h-10 rounded-xl border border-slate-100 hover:scale-110 transition-transform" />
                  </a>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Repositories */}
        <div className="lg:col-span-8">
          <UserPageClient username={username} initialRepos={repos} hasMore={hasMore} />
        </div>
      </div>
    </div>
  );
}
