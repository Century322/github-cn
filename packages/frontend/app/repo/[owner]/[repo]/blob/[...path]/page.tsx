import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, GitBranch } from "lucide-react";
import type { GitHubContent, GitHubRepo } from "@github-cn/shared";
import { formatFileSize } from "@github-cn/shared";
import FileViewer from "@/components/repo/FileViewer";
import { fetchJSON } from "@/lib/api";

interface BlobPageProps {
  params: Promise<{ owner: string; repo: string; path: string[] }>;
  searchParams: Promise<{ ref?: string }>;
}

export async function generateMetadata({ params }: BlobPageProps): Promise<Metadata> {
  const { owner, repo, path } = await params;
  const filePath = path.join("/");
  return {
    title: `${owner}/${repo}/${filePath} - GitHub 中文解析`,
  };
}

export default async function BlobPage({ params, searchParams }: BlobPageProps) {
  const { owner, repo, path } = await params;
  const { ref } = await searchParams;
  const filePath = path.join("/");

  const repoData = await fetchJSON<GitHubRepo>(`/api/repo/${owner}/${repo}`);
  const branch = ref || repoData?.default_branch || "main";

  const fileData = await fetchJSON<GitHubContent>(
    `/api/repo/${owner}/${repo}/file/${filePath}?ref=${encodeURIComponent(branch)}`,
    1800
  );

  if (!fileData || fileData.type !== "file") {
    return (
      <div className="max-w-lg mx-auto text-center py-20 px-4">
        <h2 className="font-display font-bold text-2xl text-slate-800 mb-2">文件不存在</h2>
        <p className="text-sm text-slate-500 mb-6">该文件可能已被删除或路径错误</p>
        <Link href={`/repo/${owner}/${repo}`} className="px-4 py-2 bg-blue-600 text-white text-sm font-semibold rounded-xl hover:bg-blue-500 transition-colors">
          返回仓库
        </Link>
      </div>
    );
  }

  const pathParts = filePath.split("/");
  const dirPath = pathParts.slice(0, -1).join("/");

  return (
    <div className="max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-1.5 text-xs text-slate-400 mb-4">
        <Link href="/" className="hover:text-blue-600 transition-colors">首页</Link>
        <span>/</span>
        <Link href={`/user/${owner}`} className="hover:text-blue-600 transition-colors">{owner}</Link>
        <span>/</span>
        <Link href={`/repo/${owner}/${repo}`} className="hover:text-blue-600 transition-colors font-medium">{repo}</Link>
        <span>/</span>
        {pathParts.map((part, idx) => {
          const isLast = idx === pathParts.length - 1;
          if (isLast) {
            return <span key={idx} className="text-slate-700 font-medium">{part}</span>;
          }
          return (
            <span key={idx} className="flex items-center gap-1.5">
              <span className="text-slate-400">{part}</span>
              <span>/</span>
            </span>
          );
        })}
      </nav>

      {/* Back link + branch info */}
      <div className="flex items-center gap-3 mb-4">
        <Link href={`/repo/${owner}/${repo}`}
          className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-blue-600 transition-colors">
          <ArrowLeft className="w-3.5 h-3.5" />
          返回代码
        </Link>
        <div className="flex items-center gap-1.5 text-xs text-slate-400">
          <GitBranch className="w-3 h-3" />
          {branch}
        </div>
        <span className="text-xs text-slate-300">·</span>
        <span className="text-xs text-slate-400">{formatFileSize(fileData.size)}</span>
      </div>

      {/* File content */}
      {fileData.content ? (
        <FileViewer
          content={fileData.content}
          name={fileData.name}
          size={fileData.size}
          path={fileData.path}
          htmlUrl={fileData.html_url}
          downloadUrl={fileData.download_url}
          branch={branch}
          owner={owner}
          repo={repo}
        />
      ) : (
        <div className="p-8 text-center bg-slate-50/70 border border-slate-100 rounded-2xl">
          <p className="text-sm text-slate-500">无法获取文件内容</p>
          <a href={fileData.html_url} target="_blank" rel="noopener noreferrer"
            className="mt-3 inline-block px-4 py-2 bg-blue-600 text-white text-xs font-semibold rounded-xl hover:bg-blue-500 transition-colors">
            在 GitHub 查看
          </a>
        </div>
      )}
    </div>
  );
}
