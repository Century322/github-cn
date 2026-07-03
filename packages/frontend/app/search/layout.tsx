import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "搜索 GitHub 仓库、用户、代码",
  description: "搜索 GitHub 上的开源项目、开发者、代码片段，中文增强浏览体验",
};

export default function SearchLayout({ children }: { children: React.ReactNode }) {
  return children;
}
