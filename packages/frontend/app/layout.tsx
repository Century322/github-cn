import type { Metadata } from "next";
import "./globals.css";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";

export const metadata: Metadata = {
  title: "GitHub 中文 - 开发者增强搜索与浏览平台",
  description: "面向中国开发者的 GitHub 增强搜索平台，提供中文展示、AI 解读、快速下载",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="zh-CN">
      <body className="min-h-screen bg-slate-50 flex flex-col text-slate-800 selection:bg-blue-100 selection:text-blue-900 font-sans transition-colors antialiased">
        <Header />
        <main className="flex-1">{children}</main>
        <Footer />
      </body>
    </html>
  );
}
