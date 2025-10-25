import { useMemo, useState } from "react";

const SUPPORTERS = [
  {
    id: "sp-001",
    name: "田中 里奈",
    organization: "地域若者サポートセンター",
    expertise: ["非行対応", "保護観察"],
    tags: ["女性支援", "高校生"],
    rating: 4.8,
    availability: "来週水曜 10:00〜 / オンライン対応可",
    description:
      "少年院・保護観察のケースを10年以上担当。傾聴と行動分析を得意としています。",
  },
  {
    id: "sp-002",
    name: "山本 翔",
    organization: "スクールソーシャルワーク機構",
    expertise: ["いじめ対応", "家族支援"],
    tags: ["男性支援", "学校連携"],
    rating: 4.5,
    availability: "金曜 13:00〜 面談枠あり",
    description:
      "学校・家庭・地域との連携を重視した支援が可能。保護者向けの伴走支援も提供。",
  },
  {
    id: "sp-003",
    name: "小林 愛",
    organization: "若者支援ネットワークKizuna",
    expertise: ["就労支援", "精神保健"],
    tags: ["ピアサポート", "女性支援"],
    rating: 4.9,
    availability: "月曜・木曜 午後 / 対面のみ",
    description:
      "当事者経験を活かしたピアサポートを提供。就労移行支援との接続実績多数。",
  },
];

const SupporterCard = ({ supporter }) => {
  return (
    <article className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5 shadow-sm transition hover:border-brand-500/50">
      <header className="flex flex-wrap items-baseline justify-between gap-2">
        <div>
          <h3 className="text-lg font-semibold text-slate-50">
            {supporter.name}
          </h3>
          <p className="text-xs text-slate-400">{supporter.organization}</p>
        </div>
        <span className="rounded-full bg-brand-500/20 px-3 py-1 text-xs font-semibold text-brand-200">
          評価 {supporter.rating.toFixed(1)}
        </span>
      </header>
      <p className="mt-3 text-sm leading-relaxed text-slate-200">
        {supporter.description}
      </p>
      <div className="mt-4 flex flex-wrap gap-2 text-[11px] text-slate-300">
        {supporter.expertise.map((item) => (
          <span
            key={item}
            className="rounded-full border border-slate-700 px-2 py-1"
          >
            {item}
          </span>
        ))}
      </div>
      <div className="mt-3 flex flex-wrap gap-2 text-[11px]">
        {supporter.tags.map((tag) => (
          <span
            key={tag}
            className="rounded-full bg-slate-800 px-2 py-1 text-slate-400"
          >
            #{tag}
          </span>
        ))}
      </div>
      <p className="mt-3 text-xs text-slate-400">
        面談候補: {supporter.availability}
      </p>
      <div className="mt-4 flex flex-wrap gap-2">
        <button
          type="button"
          className="inline-flex items-center gap-1 rounded-full border border-brand-500/60 px-3 py-1 text-xs font-semibold text-brand-100 transition hover:bg-brand-500/20"
        >
          詳細を見る
        </button>
        <button
          type="button"
          className="inline-flex items-center gap-1 rounded-full border border-slate-700 px-3 py-1 text-xs font-semibold text-slate-200 transition hover:border-brand-300 hover:text-brand-100"
        >
          面談希望を送る
        </button>
      </div>
    </article>
  );
};

const SupporterSearchScreen = () => {
  const [keyword, setKeyword] = useState("");
  const [selectedTag, setSelectedTag] = useState("すべて");

  const tags = useMemo(() => {
    const unique = new Set(SUPPORTERS.flatMap((item) => item.tags));
    return ["すべて", ...Array.from(unique)];
  }, []);

  const filteredSupporters = useMemo(() => {
    return SUPPORTERS.filter((supporter) => {
      const matchesKeyword =
        !keyword ||
        supporter.name.includes(keyword) ||
        supporter.organization.includes(keyword) ||
        supporter.expertise.some((item) => item.includes(keyword));
      const matchesTag =
        selectedTag === "すべて" || supporter.tags.includes(selectedTag);
      return matchesKeyword && matchesTag;
    });
  }, [keyword, selectedTag]);

  return (
    <div className="space-y-6">
      <header className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6">
        <h2 className="text-lg font-semibold text-slate-50">支援者検索</h2>
        <p className="mt-2 text-sm text-slate-300">
          キーワードとタグで支援者を絞り込み、面談の相談を行えます。
        </p>
        <div className="mt-4 flex flex-col gap-4 md:flex-row">
          <label className="flex-1 text-xs text-slate-400">
            キーワード
            <input
              type="search"
              value={keyword}
              onChange={(event) => setKeyword(event.target.value)}
              placeholder="例: 保護観察 / 非行対応"
              className="mt-1 w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-2 text-sm text-slate-100 outline-none transition focus:border-brand-400 focus:ring-1 focus:ring-brand-400"
            />
          </label>
          <label className="text-xs text-slate-400">
            タグ
            <select
              value={selectedTag}
              onChange={(event) => setSelectedTag(event.target.value)}
              className="mt-1 w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-2 text-sm text-slate-100 outline-none transition focus:border-brand-400 focus:ring-1 focus:ring-brand-400"
            >
              {tags.map((tag) => (
                <option key={tag} value={tag}>
                  {tag}
                </option>
              ))}
            </select>
          </label>
        </div>
      </header>

      <section className="grid gap-4 md:grid-cols-2">
        {filteredSupporters.length ? (
          filteredSupporters.map((supporter) => (
            <SupporterCard key={supporter.id} supporter={supporter} />
          ))
        ) : (
          <p className="rounded-2xl border border-slate-800 bg-slate-900/50 p-6 text-sm text-slate-300">
            条件に合う支援者が見つかりませんでした。キーワードやタグを変更してください。
          </p>
        )}
      </section>
    </div>
  );
};

export default SupporterSearchScreen;
