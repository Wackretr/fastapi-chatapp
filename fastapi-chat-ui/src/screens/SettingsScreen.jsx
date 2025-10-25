import { useState } from "react";

const SettingsScreen = () => {
  const [profile, setProfile] = useState({
    displayName: "山田 太郎",
    kana: "やまだ たろう",
    email: "taro@example.com",
    notifyByEmail: true,
    notifyByLine: false,
    shareTranscript: true,
  });
  const [note, setNote] = useState(
    "面談記録は支援チーム内で共有されます。共有先の更新があれば通知します。",
  );

  const handleChange = (field) => (event) => {
    const value =
      event.target.type === "checkbox"
        ? event.target.checked
        : event.target.value;
    setProfile((prev) => ({ ...prev, [field]: value }));
  };

  const handleSave = (event) => {
    event.preventDefault();
    // TODO: 設定保存APIと連携する
    // 現状はダミーのためコンソール出力のみ
    console.info("設定を保存しました", profile, note);
  };

  return (
    <form
      onSubmit={handleSave}
      className="space-y-6 rounded-2xl border border-slate-800 bg-slate-900/60 p-6"
    >
      <header>
        <h2 className="text-lg font-semibold text-slate-50">設定</h2>
        <p className="mt-2 text-sm text-slate-300">
          当事者プロフィールと通知設定を管理します。変更内容は支援チームに共有されます。
        </p>
      </header>

      <section className="space-y-4">
        <h3 className="text-sm font-semibold text-slate-200">プロフィール</h3>
        <div className="grid gap-4 md:grid-cols-2">
          <label className="text-xs text-slate-400">
            表示名
            <input
              type="text"
              value={profile.displayName}
              onChange={handleChange("displayName")}
              className="mt-1 w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-2 text-sm text-slate-100 outline-none transition focus:border-brand-400 focus:ring-1 focus:ring-brand-400"
            />
          </label>
          <label className="text-xs text-slate-400">
            ふりがな
            <input
              type="text"
              value={profile.kana}
              onChange={handleChange("kana")}
              className="mt-1 w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-2 text-sm text-slate-100 outline-none transition focus:border-brand-400 focus:ring-1 focus:ring-brand-400"
            />
          </label>
          <label className="md:col-span-2 text-xs text-slate-400">
            連絡用メールアドレス
            <input
              type="email"
              value={profile.email}
              onChange={handleChange("email")}
              className="mt-1 w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-2 text-sm text-slate-100 outline-none transition focus:border-brand-400 focus:ring-1 focus:ring-brand-400"
            />
          </label>
        </div>
      </section>

      <section className="space-y-3">
        <h3 className="text-sm font-semibold text-slate-200">通知設定</h3>
        <label className="flex items-center gap-3 text-sm text-slate-300">
          <input
            type="checkbox"
            checked={profile.notifyByEmail}
            onChange={handleChange("notifyByEmail")}
            className="h-4 w-4 rounded border border-slate-700 bg-slate-950"
          />
          メールで面談予定の更新を受け取る
        </label>
        <label className="flex items-center gap-3 text-sm text-slate-300">
          <input
            type="checkbox"
            checked={profile.notifyByLine}
            onChange={handleChange("notifyByLine")}
            className="h-4 w-4 rounded border border-slate-700 bg-slate-950"
          />
          LINE アカウントへ速報通知を送る
        </label>
        <label className="flex items-center gap-3 text-sm text-slate-300">
          <input
            type="checkbox"
            checked={profile.shareTranscript}
            onChange={handleChange("shareTranscript")}
            className="h-4 w-4 rounded border border-slate-700 bg-slate-950"
          />
          面談ログを自動で担当支援者と共有する
        </label>
      </section>

      <section className="space-y-2">
        <h3 className="text-sm font-semibold text-slate-200">共有メモ</h3>
        <textarea
          value={note}
          onChange={(event) => setNote(event.target.value)}
          rows={4}
          className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm text-slate-100 outline-none transition focus:border-brand-400 focus:ring-1 focus:ring-brand-400"
        />
        <p className="text-[11px] text-slate-400">
          支援者検索画面で支援者と共有される自己紹介や配慮事項を記載してください。
        </p>
      </section>

      <footer className="flex justify-end">
        <button
          type="submit"
          className="inline-flex items-center gap-2 rounded-full bg-brand-500 px-6 py-2 text-sm font-semibold text-white transition hover:bg-brand-400"
        >
          変更を保存
        </button>
      </footer>
    </form>
  );
};

export default SettingsScreen;
