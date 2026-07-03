"use client";

import { useState, useMemo } from "react";
import { Copy, Check, FileText, ExternalLink, ChevronDown, ChevronUp, Image } from "lucide-react";
import { formatFileSize } from "@github-cn/shared";
import { proxyRawUrl } from "@/lib/api";
import hljs from "highlight.js";

const BINARY_EXTS = new Set(["exe","dll","so","dylib","bin","dat","db","sqlite","woff","woff2","ttf","otf","eot","ico","mp3","mp4","avi","mov","wmv","flv","zip","tar","gz","bz2","7z","rar","jar","war","nupkg","deb","rpm","dmg","iso","pdf","doc","docx","xls","xlsx","ppt","pptx","odt","ods","odp"]);
const IMG_EXTS = new Set(["png","jpg","jpeg","gif","svg","webp","bmp","ico"]);

function getLanguage(ext: string): string {
  const map: Record<string, string> = {
    ts: "typescript", tsx: "typescript", js: "javascript", jsx: "javascript",
    py: "python", go: "go", rs: "rust", java: "java", c: "c", cpp: "cpp",
    h: "c", hpp: "cpp", rb: "ruby", php: "php", swift: "swift", kt: "kotlin",
    scala: "scala", sh: "bash", bash: "bash", lua: "lua", r: "r", dart: "dart",
    vue: "xml", svelte: "xml", css: "css", scss: "scss", less: "less",
    html: "xml", htm: "xml", json: "json", yaml: "yaml", yml: "yaml",
    toml: "ini", sql: "sql", graphql: "graphql", md: "markdown", mdx: "markdown",
    xml: "xml", dockerfile: "dockerfile", makefile: "makefile",
  };
  return map[ext] || "plaintext";
}

interface FileViewerProps {
  content: string; // base64 encoded
  name: string;
  size: number;
  path: string;
  htmlUrl: string;
  downloadUrl: string | null;
  branch: string;
  owner: string;
  repo: string;
}

export default function FileViewer({ content, name, size, path, htmlUrl, downloadUrl, branch, owner, repo }: FileViewerProps) {
  const [copied, setCopied] = useState(false);
  const [expanded, setExpanded] = useState(false);

  const ext = name.includes(".") ? name.split(".").pop()!.toLowerCase() : "";
  const isBinary = BINARY_EXTS.has(ext);
  const isImage = IMG_EXTS.has(ext);

  const decoded = useMemo(() => {
    if (isBinary || isImage) return "";
    try {
      return atob(content.replace(/\n/g, ""));
    } catch {
      return "[无法解码文件内容]";
    }
  }, [content, isBinary, isImage]);

  const lines = useMemo(() => decoded.split("\n"), [decoded]);
  const displayLines = expanded ? lines : lines.slice(0, 500);
  const language = getLanguage(ext);
  const lineCount = lines.length;

  const highlightedLines = useMemo(() => {
    if (!decoded) return [];
    try {
      const result = hljs.highlight(decoded, { language });
      return result.value.split("\n");
    } catch {
      return decoded.split("\n").map(line =>
        line.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
      );
    }
  }, [decoded, language]);

  const displayHighlighted = expanded ? highlightedLines : highlightedLines.slice(0, 500);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(decoded);
    } catch {
      const textarea = document.createElement("textarea");
      textarea.value = decoded;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand("copy");
      document.body.removeChild(textarea);
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Image preview
  if (isImage) {
    const imageUrl = proxyRawUrl(downloadUrl || `https://raw.githubusercontent.com/${owner}/${repo}/${branch}/${path}`);
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between gap-3 p-3 bg-slate-50/70 border border-slate-100 rounded-2xl">
          <div className="flex items-center gap-2">
            <Image className="w-4 h-4 text-purple-500" />
            <span className="text-sm font-medium text-slate-700">{name}</span>
            <span className="text-xs text-slate-400">{formatFileSize(size)}</span>
          </div>
          <a href={htmlUrl} target="_blank" rel="noopener noreferrer" className="p-1.5 hover:bg-slate-100 rounded-lg transition-colors text-slate-400 hover:text-slate-600">
            <ExternalLink className="w-4 h-4" />
          </a>
        </div>
        <div className="bg-white border border-slate-100 rounded-2xl p-6 flex items-center justify-center">
          <img src={imageUrl} alt={name} className="max-w-full max-h-[600px] rounded-lg" />
        </div>
      </div>
    );
  }

  // Binary file
  if (isBinary) {
    return (
      <div className="p-8 text-center bg-slate-50/70 border border-slate-100 rounded-2xl">
        <FileText className="w-12 h-12 text-slate-300 mx-auto mb-3" />
        <p className="text-sm text-slate-500 mb-1">{name}</p>
        <p className="text-xs text-slate-400 mb-4">{formatFileSize(size)} · 二进制文件不支持预览</p>
        <div className="flex items-center justify-center gap-3">
          {downloadUrl && (
            <a href={downloadUrl} className="px-4 py-2 bg-blue-600 text-white text-xs font-semibold rounded-xl hover:bg-blue-500 transition-colors">
              下载文件
            </a>
          )}
          <a href={htmlUrl} target="_blank" rel="noopener noreferrer" className="px-4 py-2 bg-white border border-slate-200 text-xs font-semibold text-slate-600 rounded-xl hover:bg-slate-50 transition-colors flex items-center gap-1.5">
            在 GitHub 查看 <ExternalLink className="w-3 h-3" />
          </a>
        </div>
      </div>
    );
  }

  // Text file
  return (
    <div className="space-y-3">
      {/* File header */}
      <div className="flex items-center justify-between gap-3 p-3 bg-slate-50/70 border border-slate-100 rounded-2xl">
        <div className="flex items-center gap-2 min-w-0">
          <FileText className="w-4 h-4 text-slate-400 shrink-0" />
          <span className="text-sm font-medium text-slate-700 truncate">{name}</span>
          <span className="text-xs text-slate-400 shrink-0">{lineCount} 行 · {formatFileSize(size)}</span>
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          <button onClick={handleCopy}
            className="px-2.5 py-1.5 bg-white hover:bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium text-slate-500 transition-colors flex items-center gap-1">
            {copied ? <Check className="w-3 h-3 text-green-500" /> : <Copy className="w-3 h-3" />}
            {copied ? "已复制" : "复制"}
          </button>
          <a href={htmlUrl} target="_blank" rel="noopener noreferrer"
            className="px-2.5 py-1.5 bg-white hover:bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium text-slate-500 transition-colors flex items-center gap-1">
            <ExternalLink className="w-3 h-3" /> GitHub
          </a>
        </div>
      </div>

      {/* Code block */}
      <div className="bg-white border border-slate-100 rounded-2xl overflow-hidden">
        <div className="overflow-x-auto text-sm">
          <table className="w-full">
            <tbody>
              {displayHighlighted.map((line, idx) => (
                <tr key={idx} className="hover:bg-slate-50/50">
                  <td className="px-3 py-0 text-right text-[11px] text-slate-300 select-none border-r border-slate-50 w-[1%] whitespace-nowrap font-mono align-top">
                    {idx + 1}
                  </td>
                  <td className="px-4 py-0 font-mono text-xs leading-6 whitespace-pre hljs text-slate-700" dangerouslySetInnerHTML={{ __html: line || "&nbsp;" }} />
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Expand/collapse for large files */}
        {lineCount > 500 && (
          <div className="border-t border-slate-100 p-3 text-center">
            <button onClick={() => setExpanded(!expanded)}
              className="text-xs text-blue-600 hover:underline flex items-center gap-1 mx-auto font-medium">
              {expanded ? (
                <><ChevronUp className="w-3 h-3" /> 收起（仅显示前 500 行）</>
              ) : (
                <><ChevronDown className="w-3 h-3" /> 显示全部 {lineCount} 行</>
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
