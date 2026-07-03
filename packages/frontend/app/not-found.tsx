import Link from "next/link";
import SearchBox from "@/components/search/SearchBox";

export default function NotFound() {
  return (
    <div className="max-w-2xl mx-auto text-center py-20 px-4">
      <div className="text-8xl font-display font-bold text-slate-100 mb-4">404</div>
      <h2 className="font-display font-bold text-2xl text-slate-800 mb-2">页面不存在</h2>
      <p className="text-sm text-slate-500 mb-8">你访问的页面可能已被删除或地址输入有误</p>
      <div className="max-w-md mx-auto mb-6">
        <SearchBox />
      </div>
      <Link href="/" className="px-5 py-2.5 bg-blue-600 text-white text-sm font-semibold rounded-xl hover:bg-blue-500 transition-colors inline-block">
        返回首页
      </Link>
    </div>
  );
}
