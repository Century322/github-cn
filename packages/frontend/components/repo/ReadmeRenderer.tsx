"use client";

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeHighlight from "rehype-highlight";
import "highlight.js/styles/github.css";
import { proxyRawUrl } from "@/lib/api";

interface ReadmeRendererProps {
  content: string;
  owner: string;
  repo: string;
  branch: string;
}

export default function ReadmeRenderer({ content, owner, repo, branch }: ReadmeRendererProps) {
  const baseUrl = `https://raw.githubusercontent.com/${owner}/${repo}/${branch}`;

  function resolveUrl(raw: string): string {
    if (!raw) return raw;
    if (raw.startsWith("http") || raw.startsWith("mailto:") || raw.startsWith("#")) return raw;
    try {
      return new URL(raw, baseUrl + "/").href;
    } catch {
      return raw.startsWith("/") ? `${baseUrl}${raw}` : `${baseUrl}/${raw}`;
    }
  }

  return (
    <div className="prose prose-slate prose-sm max-w-none">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[rehypeHighlight]}
        components={{
          img: ({ src, alt, ...props }) => {
            const resolvedSrc = resolveUrl(typeof src === "string" ? src : "");
            return (
              <img
                src={proxyRawUrl(resolvedSrc)}
                alt={alt || ""}
                loading="lazy"
                className="max-w-full rounded-lg"
                {...props}
              />
            );
          },
          a: ({ href, children, ...props }) => {
            const hrefStr = typeof href === "string" ? href : "";
            const resolvedHref = resolveUrl(hrefStr);
            const isAnchor = hrefStr.startsWith("#");
            return (
              <a
                href={resolvedHref}
                {...(isAnchor ? {} : { target: "_blank", rel: "noopener noreferrer" })}
                {...props}
              >
                {children}
              </a>
            );
          },
          pre: ({ children, ...props }) => (
            <pre className="bg-slate-50 rounded-xl p-4 overflow-x-auto text-sm" {...props}>
              {children}
            </pre>
          ),
          code: ({ children, className, ...props }) => {
            const isInline = !className;
            return isInline ? (
              <code className="bg-slate-100 text-slate-700 px-1.5 py-0.5 rounded-md text-xs font-mono" {...props}>
                {children}
              </code>
            ) : (
              <code className={className} {...props}>
                {children}
              </code>
            );
          },
          table: ({ children, ...props }) => (
            <div className="overflow-x-auto rounded-xl border border-slate-200">
              <table className="min-w-full" {...props}>
                {children}
              </table>
            </div>
          ),
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}
