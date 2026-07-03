import SearchBox from "@/components/search/SearchBox";
import TrendingSection from "@/components/home/TrendingSection";

export default function HomePage() {
  return (
    <>
      {/* Hero Search */}
      <section className="bg-white border-b border-slate-100/80 py-10 sm:py-14 px-4">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="font-display font-bold text-3xl sm:text-5xl text-slate-900 tracking-tight leading-tight mb-3">
            搜索 GitHub 开源项目
          </h2>
          <p className="text-slate-500 text-sm sm:text-base mb-8 max-w-xl mx-auto">
            中文增强浏览，比 GitHub 更易用，更懂中国开发者
          </p>
          <SearchBox />
        </div>
      </section>

      {/* Main Content */}
      <div className="max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <TrendingSection />
      </div>
    </>
  );
}
