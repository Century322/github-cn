"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { proxyAvatar } from "@/lib/api";
import { Folder, File, FileCode, FileText, GitBranch, Users, Clock, Download, Copy, Check, ExternalLink, Tag, Star, Scale, LinkIcon, CircleDot, GitPullRequest, Loader2, Heart } from "lucide-react";
import { formatNumber, formatDate, formatFileSize, LANGUAGE_COLORS } from "@github-cn/shared";
import type { GitHubRepo, GitHubRelease, GitHubContent, GitHubContributor, GitHubCommit, GitHubBranch, GitHubTag, GitHubIssue, GitHubPullRequest } from "@github-cn/shared";
import ReadmeRenderer from "@/components/repo/ReadmeRenderer";
import ReleaseList from "@/components/repo/ReleaseList";
import { useAuth } from "@/components/auth/AuthContext";

type TabType = "code" | "issues" | "pulls" | "commits" | "releases";

const CODE_EXTS = new Set(["ts","tsx","js","jsx","py","go","rs","java","c","cpp","h","hpp","rb","php","swift","kt","scala","sh","bash","lua","r","dart","vue","svelte","css","scss","less","html","htm","json","yaml","yml","toml","sql","graphql","prisma","zig","nim","ex","exs","hs","ml","clj","erl","sol","move","cairo"]);
const DOC_EXTS = new Set(["md","mdx","txt","rst","adoc","pdf"]);
const IMG_EXTS = new Set(["png","jpg","jpeg","gif","svg","ico","webp","bmp"]);

function getFileIcon(name: string, type: string) {
  if (type === "dir") return <Folder className="w-4 h-4 text-blue-500 shrink-0" />;
  const ext = name.includes(".") ? name.split(".").pop()!.toLowerCase() : "";
  if (CODE_EXTS.has(ext)) return <FileCode className="w-4 h-4 text-slate-400 shrink-0" />;
  if (DOC_EXTS.has(ext)) return <FileText className="w-4 h-4 text-amber-400 shrink-0" />;
  if (IMG_EXTS.has(ext)) return <FileText className="w-4 h-4 text-purple-400 shrink-0" />;
  return <File className="w-4 h-4 text-slate-300 shrink-0" />;
}

interface Props {
  owner: string;
  repo: string;
  repoData: GitHubRepo;
  readmeContent: string | null;
  releases: GitHubRelease[];
  initialContents: GitHubContent[];
  contributors: GitHubContributor[];
  branches: GitHubBranch[];
  tags: GitHubTag[];
  commits: GitHubCommit[];
}

export default function RepoDetailClient({
  owner, repo, repoData, readmeContent, releases, initialContents, contributors, branches, tags, commits: initialCommits,
}: Props) {
  const router = useRouter();
  const { user, token } = useAuth();
  const [isFavorited, setIsFavorited] = useState(false);
  const [activeTab, setActiveTab] = useState<TabType>("code");
  const [currentBranch, setCurrentBranch] = useState(repoData.default_branch);
  const [showBranchDropdown, setShowBranchDropdown] = useState(false);
  const [contents, setContents] = useState<GitHubContent[]>(initialContents);
  const [currentPath, setCurrentPath] = useState("");
  const [copied, setCopied] = useState(false);
  const [readme, setReadme] = useState<string | null>(readmeContent);
  const [commits, setCommits] = useState<GitHubCommit[]>(initialCommits);
  const [loading, setLoading] = useState(false);
  const [branchTab, setBranchTab] = useState<"branches" | "tags">("branches");
  const [branchSearch, setBranchSearch] = useState("");
  const [issues, setIssues] = useState<GitHubIssue[] | null>(null);
  const [pulls, setPulls] = useState<GitHubPullRequest[] | null>(null);
  const [issueState, setIssueState] = useState<"open" | "closed">("open");
  const [pullState, setPullState] = useState<"open" | "closed">("open");
  const [issuesLoading, setIssuesLoading] = useState(false);
  const [pullsLoading, setPullsLoading] = useState(false);
  const [issuePage, setIssuePage] = useState(1);
  const [pullPage, setPullPage] = useState(1);
  const [commitPage, setCommitPage] = useState(1);
  const [issueHasMore, setIssueHasMore] = useState(false);
  const [pullHasMore, setPullHasMore] = useState(false);
  const [commitHasMore, setCommitHasMore] = useState(initialCommits.length >= 10);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const branchDropdownRef = useRef<HTMLDivElement>(null);

  const cloneUrl = `https://github.com/${owner}/${repo}.git`;
  const zipUrl = `/api/proxy/archive?owner=${encodeURIComponent(owner)}&repo=${encodeURIComponent(repo)}&branch=${encodeURIComponent(currentBranch)}`;
  const repoFullName = `${owner}/${repo}`;

  useEffect(() => {
    if (!token) return;
    fetch(`/api/auth/favorites`, { headers: { Authorization: `Bearer ${token}` } })
      .then(res => res.ok ? res.json() : [])
      .then((favs: { repo_full_name: string }[]) => setIsFavorited(favs.some(f => f.repo_full_name === repoFullName)))
      .catch(() => {});
    fetch(`/api/auth/history`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({ repo_full_name: repoFullName }),
    }).catch(() => {});
  }, [token, repoFullName]);

  const toggleFavorite = async () => {
    if (!token) { router.push("/auth"); return; }
    try {
      if (isFavorited) {
        await fetch(`/api/auth/favorites/${encodeURIComponent(repoFullName)}`, {
          method: "DELETE", headers: { Authorization: `Bearer ${token}` },
        });
        setIsFavorited(false);
      } else {
        await fetch(`/api/auth/favorites`, {
          method: "POST", headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
          body: JSON.stringify({ repo_full_name: repoFullName }),
        });
        setIsFavorited(true);
      }
    } catch { /* ignore */ }
  };

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (branchDropdownRef.current && !branchDropdownRef.current.contains(e.target as Node)) {
        setShowBranchDropdown(false);
      }
    }
    if (showBranchDropdown) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [showBranchDropdown]);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(cloneUrl);
    } catch {
      const textarea = document.createElement("textarea");
      textarea.value = cloneUrl;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand("copy");
      document.body.removeChild(textarea);
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const navigateToPath = async (path: string) => {
    setLoading(true);
    try {
      const refParam = currentBranch !== repoData.default_branch ? `&ref=${encodeURIComponent(currentBranch)}` : "";
      const contentsPath = path ? `/${path}` : "";
      const res = await fetch(`/api/repo/${owner}/${repo}/contents${contentsPath}?t=${Date.now()}${refParam}`);
      if (res.ok) {
        const data = await res.json();
        setContents(Array.isArray(data) ? data : [data]);
        setCurrentPath(path);
      }
    } catch { setErrorMsg("路径加载失败"); } finally { setLoading(false); }
  };

  const switchBranch = async (branch: string) => {
    setCurrentBranch(branch);
    setShowBranchDropdown(false);
    setBranchSearch("");
    setLoading(true);
    setErrorMsg(null);
    const t = Date.now();
    try {
      const [contentsRes, readmeRes, commitsRes] = await Promise.all([
        fetch(`/api/repo/${owner}/${repo}/contents?ref=${encodeURIComponent(branch)}&t=${t}`),
        fetch(`/api/repo/${owner}/${repo}/readme?ref=${encodeURIComponent(branch)}&t=${t}`),
        fetch(`/api/repo/${owner}/${repo}/commits?sha=${encodeURIComponent(branch)}&t=${t}`),
      ]);
      if (contentsRes.ok) { const data = await contentsRes.json(); setContents(Array.isArray(data) ? data : [data]); setCurrentPath(""); }
      if (readmeRes.ok) { const data = await readmeRes.json(); setReadme(data.content || null); } else { setReadme(null); }
      if (commitsRes.ok) { const data = await commitsRes.json(); setCommits(Array.isArray(data) ? data : []); }
    } catch { setErrorMsg("分支切换失败"); } finally { setLoading(false); }
  };

  const handleTabChange = (tab: TabType) => {
    setActiveTab(tab);
    if (tab === "issues" && !issues) fetchIssues(issueState);
    if (tab === "pulls" && !pulls) fetchPulls(pullState);
  };

  const fetchIssues = async (state: "open" | "closed", page: number = 1) => {
    setIssueState(state);
    setIssuesLoading(true);
    try {
      const res = await fetch(`/api/repo/${owner}/${repo}/issues?state=${state}&page=${page}&t=${Date.now()}`);
      if (res.ok) {
        const data = await res.json();
        const newItems = data.items || [];
        if (page === 1) {
          setIssues(newItems);
        } else {
          setIssues(prev => prev ? [...prev, ...newItems] : newItems);
        }
        setIssueHasMore(data.has_more || false);
        setIssuePage(page);
      }
    } catch { /* silent */ } finally { setIssuesLoading(false); }
  };

  const fetchPulls = async (state: "open" | "closed", page: number = 1) => {
    setPullState(state);
    setPullsLoading(true);
    try {
      const res = await fetch(`/api/repo/${owner}/${repo}/pulls?state=${state}&page=${page}&t=${Date.now()}`);
      if (res.ok) {
        const data = await res.json();
        const newItems = data.items || [];
        if (page === 1) {
          setPulls(newItems);
        } else {
          setPulls(prev => prev ? [...prev, ...newItems] : newItems);
        }
        setPullHasMore(data.has_more || false);
        setPullPage(page);
      }
    } catch { /* silent */ } finally { setPullsLoading(false); }
  };

  const pathParts = currentPath ? currentPath.split("/") : [];

  const tabs = [
    { type: "code" as TabType, label: "代码", icon: FileCode },
    { type: "issues" as TabType, label: "Issues", icon: CircleDot },
    { type: "pulls" as TabType, label: "Pull Requests", icon: GitPullRequest },
    { type: "commits" as TabType, label: "Commits", icon: Clock },
    { type: "releases" as TabType, label: "Releases", icon: Tag },
  ];

  return (
    <>
      {/* Action Buttons */}
      <div className="flex flex-wrap items-center gap-2 mb-6">
        <button onClick={toggleFavorite}
          className={`px-4 py-2 rounded-xl text-xs font-semibold transition-colors flex items-center gap-1.5 ${
            isFavorited
              ? "bg-red-50 text-red-600 border border-red-200 hover:bg-red-100"
              : "bg-white hover:bg-slate-50 border border-slate-200 text-slate-600"
          }`}>
          <Heart className={`w-3.5 h-3.5 ${isFavorited ? "fill-current" : ""}`} />
          {isFavorited ? "已收藏" : "收藏"}
        </button>
        <a href={`https://github.com/${owner}/${repo}`} target="_blank" rel="noopener noreferrer"
          className="px-4 py-2 bg-white hover:bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-600 transition-colors flex items-center gap-1.5">
          <Star className="w-3.5 h-3.5" /> Star on GitHub <ExternalLink className="w-3 h-3 text-slate-400" />
        </a>
        <button onClick={handleCopy}
          className="px-4 py-2 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl text-xs font-semibold text-slate-600 transition-colors flex items-center gap-1.5">
          {copied ? <Check className="w-3.5 h-3.5 text-green-500" /> : <Copy className="w-3.5 h-3.5" />}
          {copied ? "已复制" : "Clone URL"}
        </button>
        <button onClick={() => {
          fetch("/api/download", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ repo_full_name: `${owner}/${repo}`, download_type: "zip", branch: currentBranch }),
          }).catch(() => {});
          window.open(zipUrl, "_blank");
        }}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-semibold transition-colors shadow-xs flex items-center gap-1.5">
          <Download className="w-3.5 h-3.5" /> ZIP 下载
        </button>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1 mb-6 border-b border-slate-100 overflow-x-auto">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          return (
            <button key={tab.type} onClick={() => handleTabChange(tab.type)}
              className={`flex items-center gap-1.5 px-4 py-3 text-sm font-semibold border-b-2 transition-colors whitespace-nowrap ${
                activeTab === tab.type
                  ? "border-blue-600 text-blue-600"
                  : "border-transparent text-slate-400 hover:text-slate-600"
              }`}>
              <Icon className="w-4 h-4" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {errorMsg && (
        <div className="mb-4 px-4 py-2.5 bg-red-50 border border-red-100 rounded-xl text-xs text-red-600 flex items-center justify-between">
          <span>{errorMsg}</span>
          <button onClick={() => setErrorMsg(null)} className="text-red-400 hover:text-red-600 ml-2">✕</button>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Main */}
        <div className="lg:col-span-8">
          {activeTab === "code" && (
            <>
              {/* Branch Selector + Path */}
              <div className="flex items-center gap-2 mb-4">
                <div className="relative" ref={branchDropdownRef}>
                  <button onClick={() => setShowBranchDropdown(!showBranchDropdown)}
                    className="flex items-center gap-1.5 px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
                    aria-expanded={showBranchDropdown} aria-haspopup="listbox">
                    <GitBranch className="w-3.5 h-3.5" />
                    {currentBranch}
                  </button>
                  {showBranchDropdown && (
                    <div className="absolute top-full left-0 mt-1 w-64 bg-white rounded-xl border border-slate-100 shadow-xl z-20">
                      <div className="flex border-b border-slate-100">
                        <button onClick={() => { setBranchTab("branches"); setBranchSearch(""); }}
                          className={`flex-1 px-3 py-2 text-xs font-semibold transition-colors ${branchTab === "branches" ? "text-blue-600 border-b-2 border-blue-600" : "text-slate-400"}`}>
                          Branches
                        </button>
                        <button onClick={() => { setBranchTab("tags"); setBranchSearch(""); }}
                          className={`flex-1 px-3 py-2 text-xs font-semibold transition-colors ${branchTab === "tags" ? "text-blue-600 border-b-2 border-blue-600" : "text-slate-400"}`}>
                          Tags
                        </button>
                      </div>
                      {((branchTab === "branches" ? branches : tags).length > 10) && (
                        <div className="px-3 py-2 border-b border-slate-100">
                          <input type="text" value={branchSearch} onChange={(e) => setBranchSearch(e.target.value)}
                            placeholder={`搜索${branchTab === "branches" ? "分支" : "标签"}...`}
                            className="w-full px-2 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500" />
                        </div>
                      )}
                      <div className="max-h-56 overflow-y-auto">
                        {(branchTab === "branches" ? branches : tags)
                          .filter((item) => !branchSearch || item.name.toLowerCase().includes(branchSearch.toLowerCase()))
                          .map((item) => (
                          <button key={item.name} onClick={() => switchBranch(item.name)} role="option"
                            aria-selected={item.name === currentBranch}
                            className={`w-full text-left px-4 py-2 text-xs hover:bg-slate-50 transition-colors ${
                              item.name === currentBranch ? "text-blue-600 font-semibold bg-blue-50" : "text-slate-600"
                            }`}>
                            {item.name}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Path Breadcrumb */}
                <div className="flex items-center gap-1 text-xs text-slate-400 overflow-x-auto">
                  <button onClick={() => navigateToPath("")} className="hover:text-blue-600 transition-colors font-semibold text-slate-600">
                    {repo}
                  </button>
                  {pathParts.map((part, idx) => {
                    const partPath = pathParts.slice(0, idx + 1).join("/");
                    const isLast = idx === pathParts.length - 1;
                    return (
                      <span key={idx} className="flex items-center gap-1">
                        <span>/</span>
                        <button onClick={() => navigateToPath(partPath)}
                          className={`hover:text-blue-600 transition-colors ${isLast ? "font-semibold text-slate-700" : ""}`}>
                          {part}
                        </button>
                      </span>
                    );
                  })}
                </div>
              </div>

              {/* Latest Commit Info */}
              {commits.length > 0 && (
                <div className="flex items-center gap-2 px-4 py-2 bg-slate-50/70 border border-slate-100 rounded-t-2xl text-xs text-slate-500">
                  {commits[0].author ? (
                    <img src={proxyAvatar(commits[0].author.avatar_url)} alt="" className="w-5 h-5 rounded-md" onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} />
                  ) : (
                    <div className="w-5 h-5 rounded-md bg-slate-200" />
                  )}
                  <span className="font-medium text-slate-600">{commits[0].author?.login || commits[0].commit.author.name}</span>
                  <span className="truncate flex-1">{commits[0].commit.message.split("\n")[0]}</span>
                  <span className="shrink-0">{formatDate(commits[0].commit.author.date)}</span>
                </div>
              )}

              {/* File Browser */}
              <div className={`bg-white border border-slate-100 shadow-xs overflow-hidden mb-6 ${commits.length > 0 ? "rounded-t-none rounded-b-2xl" : "rounded-2xl"}`}>
                {loading ? (
                  <div className="divide-y divide-slate-50">
                    {[...Array(5)].map((_, i) => (
                      <div key={i} className="flex items-center gap-3 px-4 py-2.5">
                        <div className="w-4 h-4 skeleton-shimmer rounded" />
                        <div className="h-4 skeleton-shimmer rounded flex-1 max-w-[200px]" />
                      </div>
                    ))}
                  </div>
                ) : contents.length > 0 ? (
                  <div className="divide-y divide-slate-50">
                    {contents
                      .sort((a, b) => {
                        if (a.type === "dir" && b.type !== "dir") return -1;
                        if (a.type !== "dir" && b.type === "dir") return 1;
                        return a.name.localeCompare(b.name);
                      })
                      .map((item) => (
                        <button key={item.path} onClick={() => {
                          if (item.type === "dir") navigateToPath(item.path);
                          else router.push(`/repo/${owner}/${repo}/blob/${currentBranch}/${item.path}`);
                        }}
                          className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-slate-50 transition-colors text-left">
                          {getFileIcon(item.name, item.type)}
                          <span className="text-sm text-slate-700 flex-1 truncate">{item.name}</span>
                          {item.type === "file" && (
                            <span className="text-[10px] text-slate-400 shrink-0">{formatFileSize(item.size)}</span>
                          )}
                        </button>
                      ))}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <p className="text-sm text-slate-400">此目录为空</p>
                  </div>
                )}
              </div>

              {/* README */}
              <div className="bg-white rounded-2xl border border-slate-100 p-6 shadow-xs">
                <h2 className="text-lg font-bold text-slate-800 mb-4">README</h2>
                {readme ? (
                  <ReadmeRenderer content={readme} owner={owner} repo={repo} branch={currentBranch} />
                ) : (
                  <div className="text-center py-12">
                    <p className="text-sm text-slate-400">该仓库没有 README 文件</p>
                  </div>
                )}
              </div>
            </>
          )}

          {activeTab === "issues" && (
            <div className="bg-white rounded-2xl border border-slate-100 p-6 shadow-xs">
              <div className="flex items-center gap-2 mb-4">
                <h2 className="text-lg font-bold text-slate-800">Issues</h2>
                <div className="flex gap-1 ml-auto">
                  <button onClick={() => fetchIssues("open")}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${issueState === "open" ? "bg-green-50 text-green-700" : "text-slate-400 hover:bg-slate-50"}`}>
                    Open
                  </button>
                  <button onClick={() => fetchIssues("closed")}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${issueState === "closed" ? "bg-purple-50 text-purple-700" : "text-slate-400 hover:bg-slate-50"}`}>
                    Closed
                  </button>
                </div>
              </div>
              {issuesLoading ? (
                <div className="space-y-3">
                  {[...Array(5)].map((_, i) => (<div key={i} className="h-14 skeleton-shimmer rounded-xl" />))}
                </div>
              ) : issues && issues.length > 0 ? (
                <div className="space-y-1">
                  {issues.map((issue) => (
                    <div key={issue.id} className="flex items-start gap-3 p-3 hover:bg-slate-50 rounded-xl transition-colors">
                      <span className={`mt-0.5 shrink-0 ${issue.state === "open" ? "text-green-600" : "text-purple-600"}`}>
                        <CircleDot className="w-4 h-4" />
                      </span>
                      <div className="flex-1 min-w-0">
                        <a href={issue.html_url} target="_blank" rel="noopener noreferrer"
                          className="text-sm font-medium text-slate-700 hover:text-blue-600 transition-colors">
                          {issue.title}
                        </a>
                        <div className="flex items-center gap-2 mt-1 flex-wrap">
                          {issue.labels.map((label) => (
                            <span key={label.id} className="px-2 py-0.5 text-[10px] font-medium rounded-full border"
                              style={{ borderColor: `#${label.color}`, color: `#${label.color}`, backgroundColor: `#${label.color}15` }}>
                              {label.name}
                            </span>
                          ))}
                          <span className="text-[11px] text-slate-400">
                            #{issue.number} · {issue.user?.login} 打开于 {formatDate(issue.created_at)}
                          </span>
                        </div>
                      </div>
                      {issue.comments > 0 && (
                        <span className="text-[11px] text-slate-400 shrink-0 flex items-center gap-0.5">
                          {issue.comments}
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-slate-400 text-center py-8">暂无 {issueState === "open" ? "开启" : "关闭"}的 Issue</p>
              )}
              {issueHasMore && !issuesLoading && issues && issues.length > 0 && (
                <div className="mt-4 text-center">
                  <button onClick={() => fetchIssues(issueState, issuePage + 1)}
                    className="px-4 py-2 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl text-xs font-semibold text-slate-600 transition-colors flex items-center gap-1.5 mx-auto">
                    <Loader2 className="w-3 h-3" /> 加载更多
                  </button>
                </div>
              )}
            </div>
          )}

          {activeTab === "pulls" && (
            <div className="bg-white rounded-2xl border border-slate-100 p-6 shadow-xs">
              <div className="flex items-center gap-2 mb-4">
                <h2 className="text-lg font-bold text-slate-800">Pull Requests</h2>
                <div className="flex gap-1 ml-auto">
                  <button onClick={() => fetchPulls("open")}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${pullState === "open" ? "bg-green-50 text-green-700" : "text-slate-400 hover:bg-slate-50"}`}>
                    Open
                  </button>
                  <button onClick={() => fetchPulls("closed")}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${pullState === "closed" ? "bg-purple-50 text-purple-700" : "text-slate-400 hover:bg-slate-50"}`}>
                    Closed
                  </button>
                </div>
              </div>
              {pullsLoading ? (
                <div className="space-y-3">
                  {[...Array(5)].map((_, i) => (<div key={i} className="h-14 skeleton-shimmer rounded-xl" />))}
                </div>
              ) : pulls && pulls.length > 0 ? (
                <div className="space-y-1">
                  {pulls.map((pr) => {
                    const isMerged = pr.state === "closed" && pr.merged_at;
                    return (
                      <div key={pr.id} className="flex items-start gap-3 p-3 hover:bg-slate-50 rounded-xl transition-colors">
                        <span className={`mt-0.5 shrink-0 ${isMerged ? "text-violet-600" : pr.state === "open" ? "text-green-600" : "text-red-500"}`}>
                          <GitPullRequest className="w-4 h-4" />
                        </span>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <a href={pr.html_url} target="_blank" rel="noopener noreferrer"
                              className="text-sm font-medium text-slate-700 hover:text-blue-600 transition-colors">
                              {pr.title}
                            </a>
                            {pr.draft && (
                              <span className="px-1.5 py-0.5 text-[10px] font-medium bg-slate-100 text-slate-500 rounded">Draft</span>
                            )}
                          </div>
                          <span className="text-[11px] text-slate-400">
                            #{pr.number} · {pr.user?.login} {isMerged ? "合并于" : "打开于"} {formatDate(isMerged ? pr.merged_at! : pr.created_at)}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="text-sm text-slate-400 text-center py-8">暂无 {pullState === "open" ? "开启" : "关闭"}的 Pull Request</p>
              )}
              {pullHasMore && !pullsLoading && pulls && pulls.length > 0 && (
                <div className="mt-4 text-center">
                  <button onClick={() => fetchPulls(pullState, pullPage + 1)}
                    className="px-4 py-2 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl text-xs font-semibold text-slate-600 transition-colors flex items-center gap-1.5 mx-auto">
                    <Loader2 className="w-3 h-3" /> 加载更多
                  </button>
                </div>
              )}
            </div>
          )}

          {activeTab === "commits" && (
            <div className="bg-white rounded-2xl border border-slate-100 p-6 shadow-xs">
              <h2 className="text-lg font-bold text-slate-800 mb-4">最近提交</h2>
              {commits.length > 0 ? (
                <div className="space-y-3">
                  {commits.map((commit) => (
                    <div key={commit.sha} className="flex items-start gap-3 p-3 bg-slate-50/50 rounded-xl">
                      {commit.author ? (
                        <img src={proxyAvatar(commit.author.avatar_url)} alt={commit.author.login} className="w-8 h-8 rounded-lg border border-slate-100 mt-0.5" onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} />
                      ) : (
                        <div className="w-8 h-8 rounded-lg bg-slate-200 mt-0.5" />
                      )}
                      <div className="flex-1 min-w-0">
                        <a href={commit.html_url} target="_blank" rel="noopener noreferrer"
                          className="text-sm font-medium text-slate-700 hover:text-blue-600 transition-colors line-clamp-2">
                          {commit.commit.message.split("\n")[0]}
                        </a>
                        <p className="text-xs text-slate-400 mt-1">
                          <span className="font-medium text-slate-500">{commit.author?.login || commit.commit.author.name}</span>
                          {" "}提交于 {formatDate(commit.commit.author.date)}
                        </p>
                      </div>
                      <a href={commit.html_url} target="_blank" rel="noopener noreferrer"
                        className="text-[10px] font-mono text-slate-400 hover:text-blue-600 transition-colors shrink-0">
                        {commit.sha.slice(0, 7)}
                      </a>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-slate-400 text-center py-8">暂无提交记录</p>
              )}
              {commitHasMore && commits.length > 0 && (
                <div className="mt-4 text-center">
                  <button onClick={async () => {
                    const nextPage = commitPage + 1;
                    const sha = currentBranch !== repoData.default_branch ? currentBranch : undefined;
                    const shaParam = sha ? `&sha=${encodeURIComponent(sha)}` : "";
                    try {
                      const res = await fetch(`/api/repo/${owner}/${repo}/commits?page=${nextPage}${shaParam}&t=${Date.now()}`);
                      if (res.ok) {
                        const data = await res.json();
                        const newCommits = Array.isArray(data) ? data : [];
                        setCommits(prev => [...prev, ...newCommits]);
                        setCommitHasMore(newCommits.length >= 10);
                        setCommitPage(nextPage);
                      }
                    } catch { /* silent */ }
                  }}
                    className="px-4 py-2 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl text-xs font-semibold text-slate-600 transition-colors flex items-center gap-1.5 mx-auto">
                    <Loader2 className="w-3 h-3" /> 加载更多
                  </button>
                </div>
              )}
            </div>
          )}

          {activeTab === "releases" && (
            <div className="bg-white rounded-2xl border border-slate-100 p-6 shadow-xs">
              <h2 className="text-lg font-bold text-slate-800 mb-4">Releases</h2>
              <ReleaseList releases={releases} repoFullName={`${owner}/${repo}`} />
            </div>
          )}
        </div>

        {/* Sidebar */}
        <div className="lg:col-span-4 space-y-6">
          {/* About */}
          <div className="bg-white rounded-2xl border border-slate-100 p-5 shadow-xs">
            <h3 className="text-sm font-bold text-slate-800 mb-3">关于</h3>
            <div className="space-y-2.5">
              {repoData.language && (
                <div className="flex items-center gap-2 text-sm text-slate-600">
                  <span className="w-3 h-3 rounded-full inline-block shrink-0" style={{ backgroundColor: LANGUAGE_COLORS[repoData.language] || "#94a3b8" }} />
                  <span>{repoData.language}</span>
                </div>
              )}
              {repoData.license && (
                <div className="flex items-center gap-2 text-sm text-slate-600">
                  <Scale className="w-4 h-4 text-slate-400" />
                  <span>{repoData.license.name}</span>
                </div>
              )}
              {repoData.homepage && (
                <div className="flex items-center gap-2 text-sm">
                  <LinkIcon className="w-4 h-4 text-slate-400 shrink-0" />
                  <a href={repoData.homepage} target="_blank" rel="noopener noreferrer"
                    className="text-blue-600 hover:underline truncate">{repoData.homepage.replace(/^https?:\/\//, "")}</a>
                </div>
              )}
              <div className="flex items-center gap-2 text-sm text-slate-600">
                <Clock className="w-4 h-4 text-slate-400" />
                <span>创建于 {formatDate(repoData.created_at)}</span>
              </div>
              <a href={`https://github.com/${owner}/${repo}`} target="_blank" rel="noopener noreferrer"
                className="flex items-center gap-2 text-sm text-blue-600 hover:underline">
                <ExternalLink className="w-4 h-4" />
                <span>在 GitHub 查看</span>
              </a>
            </div>

            {repoData.topics && repoData.topics.length > 0 && (
              <div className="mt-4 flex flex-wrap gap-1.5">
                {repoData.topics.map((topic) => (
                  <span key={topic} className="px-2.5 py-1 bg-blue-50 text-blue-700 text-[11px] font-medium rounded-full">{topic}</span>
                ))}
              </div>
            )}
          </div>

          {/* Releases Summary */}
          {releases.length > 0 && (
            <div className="bg-white rounded-2xl border border-slate-100 p-5 shadow-xs">
              <h3 className="text-sm font-bold text-slate-800 mb-3 flex items-center gap-1.5">
                <Tag className="w-4 h-4" />
                Releases ({releases.length})
              </h3>
              <button onClick={() => setActiveTab("releases")} className="w-full text-left">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold text-slate-700">{releases[0].tag_name}</span>
                  {releases[0].prerelease && (
                    <span className="px-1.5 py-0.5 text-[10px] font-medium bg-amber-50 text-amber-700 rounded">Pre-release</span>
                  )}
                  {releases[0].draft && (
                    <span className="px-1.5 py-0.5 text-[10px] font-medium bg-slate-100 text-slate-500 rounded">Draft</span>
                  )}
                </div>
                <p className="text-xs text-slate-400 mt-1">发布于 {formatDate(releases[0].published_at)}</p>
              </button>
            </div>
          )}

          {/* Contributors */}
          {contributors.length > 0 && (
            <div className="bg-white rounded-2xl border border-slate-100 p-5 shadow-xs">
              <h3 className="text-sm font-bold text-slate-800 mb-3">
                <Users className="w-4 h-4 inline mr-1.5" />
                贡献者 ({contributors.length > 20 ? "20+" : contributors.length})
              </h3>
              <div className="flex flex-wrap gap-2">
                {contributors.slice(0, 20).map((c) => (
                  <Link key={c.id} href={`/user/${c.login}`} title={`${c.login} (${formatNumber(c.contributions)} 次贡献)`}
                    className="focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 rounded-lg">
                    <img src={proxyAvatar(c.avatar_url)} alt={c.login} className="w-9 h-9 rounded-xl border border-slate-100 hover:scale-110 transition-transform" onError={(e) => { (e.target as HTMLImageElement).src = `data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 36 36"><rect fill="%23e2e8f0" width="36" height="36" rx="8"/><text x="50%" y="54%" text-anchor="middle" dy=".1em" fill="%2394a3b8" font-size="16" font-family="sans-serif">${c.login[0]?.toUpperCase() || "?"}</text></svg>`; }} />
                  </Link>
                ))}
              </div>
            </div>
          )}

        </div>
      </div>
    </>
  );
}
