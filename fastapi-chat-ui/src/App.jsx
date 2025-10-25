import { useEffect, useMemo, useState } from "react";
import InterviewScreen from "./screens/InterviewScreen";
import SupporterSearchScreen from "./screens/SupporterSearchScreen";
import SettingsScreen from "./screens/SettingsScreen";
import SupporterInterviewScreen from "./screens/SupporterInterviewScreen";
import { ConversationProvider } from "./context/ConversationContext";

const API_BASE =
  (typeof import.meta !== "undefined" &&
    import.meta.env &&
    import.meta.env.VITE_API_BASE) ||
  "http://localhost:8000";

const ROLE_TABS = [
  {
    id: "participant",
    label: "当事者モード",
    description: "面談を受ける当事者として利用",
  },
  {
    id: "supporter",
    label: "支援者モード",
    description: "支援者として返神を使い回答",
  },
];

const PARTICIPANT_NAV_ITEMS = [
  {
    id: "interview",
    label: "面談画面",
    description: "AI との面談チャットで問い返し案を確認します。",
  },
  {
    id: "search",
    label: "支援者検索",
    description: "ケースに合う支援者を探し、面談を依頼できます。",
  },
  {
    id: "settings",
    label: "設定",
    description: "プロフィールや通知方法を編集します。",
  },
];

const App = () => {
  const [activeRole, setActiveRole] = useState("participant");
  const [activeTab, setActiveTab] = useState("interview");

  const roleNavItems = useMemo(
    () =>
      activeRole === "participant"
        ? PARTICIPANT_NAV_ITEMS
        : [
            {
              id: "supporter-interview",
              label: "面談画面",
              description: "返神候補を確認しながら当事者へ問い返します。",
            },
          ],
    [activeRole],
  );

  useEffect(() => {
    if (!roleNavItems.some((item) => item.id === activeTab)) {
      setActiveTab(roleNavItems[0]?.id ?? "");
    }
  }, [roleNavItems, activeTab]);

  const renderActiveScreen = () => {
    if (activeRole === "supporter") {
      return <SupporterInterviewScreen apiBase={API_BASE} />;
    }
    switch (activeTab) {
      case "search":
        return <SupporterSearchScreen />;
      case "settings":
        return <SettingsScreen />;
      case "interview":
      default:
        return <InterviewScreen apiBase={API_BASE} />;
    }
  };

  return (
    <ConversationProvider>
      <div className="min-h-screen bg-slate-950 text-slate-100">
        <header className="border-b border-slate-800 bg-slate-900/70 backdrop-blur">
          <div className="mx-auto flex max-w-6xl flex-col gap-6 px-6 py-8 md:flex-row md:items-center md:justify-between">
            <div className="space-y-2">
              <h1 className="text-2xl font-semibold tracking-tight text-slate-50">
                BRANQ&amp;A Lite / 面談デモ
            </h1>
            <p className="max-w-2xl text-sm text-slate-300">
              当事者・支援者それぞれの面談画面を行き来しながら、返神を使う流れを体験できます。
            </p>
            <p className="text-[11px] text-slate-500">
              現在のAPIエンドポイント:{" "}
              <span className="font-mono text-slate-200">
                {API_BASE}
                /chat
              </span>
            </p>
          </div>
          <div className="flex flex-col gap-3">
            <div className="flex flex-wrap gap-2">
              {ROLE_TABS.map((role) => {
                const isActiveRole = role.id === activeRole;
                return (
                  <button
                    key={role.id}
                    type="button"
                    onClick={() => setActiveRole(role.id)}
                    className={`flex min-w-[140px] flex-col rounded-2xl border px-4 py-3 text-left transition ${
                      isActiveRole
                        ? "border-brand-400 bg-brand-500/20 text-brand-100"
                        : "border-slate-700 bg-slate-900/60 text-slate-200 hover:border-brand-500/60 hover:text-brand-100"
                    }`}
                  >
                    <span className="text-sm font-semibold">{role.label}</span>
                    <span className="mt-1 text-[11px] text-slate-400">
                      {role.description}
                    </span>
                  </button>
                );
              })}
            </div>
            <nav className="flex flex-wrap gap-2">
              {roleNavItems.map((item) => {
                const isActive = item.id === activeTab;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setActiveTab(item.id)}
                    aria-current={isActive ? "page" : undefined}
                    aria-label={item.label}
                    className={`flex min-w-[120px] flex-col rounded-2xl border px-4 py-3 text-left transition ${
                      isActive
                        ? "border-brand-400 bg-brand-500/20 text-brand-100"
                        : "border-slate-700 bg-slate-900/60 text-slate-200 hover:border-brand-500/60 hover:text-brand-100"
                    }`}
                  >
                    <span className="text-sm font-semibold">{item.label}</span>
                    <span className="mt-1 text-[11px] text-slate-400">
                      {item.description}
                    </span>
                  </button>
                );
              })}
            </nav>
          </div>
        </div>
        </header>

        <main className="mx-auto max-w-6xl px-6 py-8">{renderActiveScreen()}</main>
      </div>
    </ConversationProvider>
  );
};

export default App;
