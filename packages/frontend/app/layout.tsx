import type { Metadata } from "next";
import "./globals.css";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import { AuthProvider } from "@/components/auth/AuthContext";

export const metadata: Metadata = {
  title: {
    default: "GitHub 中文 - 开发者增强搜索与浏览平台",
    template: "%s | GitHub 中文",
  },
  description: "面向中国开发者的 GitHub 增强搜索平台，提供中文展示、AI 解读、快速下载",
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || "https://github-cn.dev"),
  openGraph: {
    type: "website",
    locale: "zh_CN",
    siteName: "GitHub 中文",
    title: "GitHub 中文 - 开发者增强搜索与浏览平台",
    description: "面向中国开发者的 GitHub 增强搜索平台，提供中文展示、AI 解读、快速下载",
  },
  twitter: {
    card: "summary_large_image",
    title: "GitHub 中文 - 开发者增强搜索与浏览平台",
    description: "面向中国开发者的 GitHub 增强搜索平台",
  },
  icons: {
    icon: "/favicon.svg",
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="zh-CN">
      <body className="min-h-screen bg-slate-50 flex flex-col text-slate-800 selection:bg-blue-100 selection:text-blue-900 font-sans transition-colors antialiased">
        <AuthProvider>
          <Header />
          <main className="flex-1">{children}</main>
          <Footer />
        </AuthProvider>
      </body>
    </html>
  );
}
