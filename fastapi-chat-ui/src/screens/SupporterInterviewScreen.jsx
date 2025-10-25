import { useEffect, useMemo, useRef, useState } from "react";
import { useConversation } from "../context/ConversationContext";

const parseSuggestions = (rawText) => {
  if (!rawText) {
    return [];
  }
  return rawText
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line, idx) => {
      const match =
        line.match(
          /^(?<rank>\d+)\.\s*\[評価:(?<score>\d)\]\s*問い返し:\s*(?<question>.+?)\s*\|\s*理由:\s*(?<reason>.+)$/u,
        ) ?? {};
      const { rank, score, question, reason } = match.groups || {};
      return {
        id: `suggestion-${idx}`,
        raw: line,
        rank: Number(rank) || idx + 1,
        score: Number(score) || null,
        question: question?.trim() || line,
        reason: reason?.trim() || "",
      };
    });
};

const SupporterMessageBubble = ({ role, content, createdAt }) => {
  const isSupporter = role === "supporter";
  return (
    <div
      className={`flex w-full ${isSupporter ? "justify-end" : "justify-start"}`}
    >
      <div
        className={`mt-3 max-w-xl rounded-2xl px-4 py-3 shadow-md ${
          isSupporter
            ? "bg-brand-500 text-white"
            : "bg-slate-800/90 text-slate-100"
        }`}
      >
        <p className="whitespace-pre-wrap text-sm leading-relaxed">
          {content}
        </p>
        <span className="mt-2 block text-[10px] uppercase tracking-wider opacity-70">
          {isSupporter ? "支援者" : "当事者"}・{createdAt}
        </span>
      </div>
    </div>
  );
};

const SupporterInterviewScreen = ({ apiBase }) => {
  const { messages, appendMessage } = useConversation();
  const [input, setInput] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [isFetchingSuggestions, setIsFetchingSuggestions] = useState(false);
  const [suggestions, setSuggestions] = useState([]);
  const [error, setError] = useState("");
  const listRef = useRef(null);

  const latestParticipantMessage = useMemo(
    () =>
      [...messages]
        .reverse()
        .find((message) => message.role === "participant") || null,
    [messages],
  );

  useEffect(() => {
    if (!listRef.current) {
      return;
    }
    listRef.current.scrollTop = listRef.current.scrollHeight;
  }, [messages]);

  const fetchSuggestions = async () => {
    if (!latestParticipantMessage) {
      setError("当事者の最新メッセージが見つかりません。");
      return;
    }
    setIsFetchingSuggestions(true);
    setError("");
    try {
      const response = await fetch(`${apiBase}/chat_rag`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          message: latestParticipantMessage.content,
          kadai_type: "未指定",
          user_name: "対象者",
        }),
      });
      if (!response.ok) {
        const text = await response.text();
        throw new Error(
          `API Error ${response.status}${
            text ? `: ${text.slice(0, 160)}` : ""
          }`,
        );
      }
      const data = await response.json();
      const parsed = parseSuggestions(data?.response);
      setSuggestions(parsed);
      if (parsed.length > 0) {
        setInput(parsed[0].question);
      }
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : "不明なエラーです。");
      setSuggestions([]);
    } finally {
      setIsFetchingSuggestions(false);
    }
  };

  const handleSend = async (event) => {
    event.preventDefault();
    const trimmed = input.trim();
    if (!trimmed) {
      return;
    }
    setIsSending(true);
    setError("");
    appendMessage("supporter", trimmed);
    setInput("");
    try {
      const acknowledgment = await fetch(`${apiBase}/chat`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          message: `支援者が次の問い返しを送信: ${trimmed}`,
        }),
      });
      if (!acknowledgment.ok) {
        console.warn("Acknowledgment request failed.");
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsSending(false);
    }
  };

  const handleUseSuggestion = (suggestion) => {
    setInput(suggestion.question);
  };

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
      <section className="flex min-h-[540px] flex-col overflow-hidden rounded-2xl border border-slate-800 bg-slate-900/60 shadow-lg">
        <div className="border-b border-slate-800 px-6 py-4">
          <h2 className="text-lg font-semibold">面談チャット（支援者）</h2>
          <p className="mt-1 text-xs text-slate-400">
            当事者からの最新メッセージを踏まえ、返神の候補を確認して応答できます。
          </p>
          <p className="mt-3 text-[11px] text-slate-500">
            API:{" "}
            <span className="font-mono text-slate-300">
              {apiBase}
              /chat_rag
            </span>
          </p>
        </div>
        <div
          ref={listRef}
          className="flex-1 overflow-y-auto px-6 py-6 md:px-8 md:py-8"
        >
          {messages.map((message) => (
            <SupporterMessageBubble
              key={message.id}
              role={message.role}
              content={message.content}
              createdAt={message.createdAt}
            />
          ))}
          {error ? (
            <div className="mt-4 rounded-md border border-red-500/60 bg-red-500/10 px-4 py-3 text-sm text-red-200">
              <p className="font-semibold">エラーが発生しました</p>
              <p className="mt-1 whitespace-pre-wrap">{error}</p>
            </div>
          ) : null}
        </div>
        <form
          onSubmit={handleSend}
          className="border-t border-slate-800 bg-slate-900/80 px-6 py-4 backdrop-blur md:px-8"
        >
          <label htmlFor="supporter-message" className="sr-only">
            メッセージ
          </label>
          <textarea
            id="supporter-message"
            name="supporter-message"
            value={input}
            onChange={(event) => setInput(event.target.value)}
            placeholder="問い返しや声かけを入力してください"
            className="h-28 w-full rounded-xl border border-slate-700 bg-slate-900/80 px-4 py-3 text-sm text-slate-50 outline-none ring-brand-400 transition focus:border-brand-400 focus:ring-2"
          />
          <div className="mt-3 flex flex-wrap items-center justify-between gap-4">
            <button
              type="button"
              onClick={fetchSuggestions}
              disabled={isFetchingSuggestions}
              className="inline-flex items-center gap-2 rounded-full border border-brand-400/70 px-4 py-2 text-xs font-semibold text-brand-100 transition hover:border-brand-300 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isFetchingSuggestions ? "返神を取得中..." : "返神を取得"}
            </button>
            <button
              type="submit"
              disabled={isSending || !input.trim()}
              className="inline-flex items-center gap-2 rounded-full bg-brand-500 px-5 py-2 text-sm font-semibold text-white transition hover:bg-brand-400 disabled:cursor-not-allowed disabled:bg-brand-800"
            >
              {isSending ? "送信中..." : "この内容で回答"}
            </button>
          </div>
        </form>
      </section>

      <aside className="flex flex-col gap-6 rounded-2xl border border-slate-800 bg-slate-900/40 p-6">
        <section>
          <h3 className="text-sm font-semibold uppercase tracking-widest text-slate-400">
            返神候補
          </h3>
          {suggestions.length === 0 ? (
            <p className="mt-3 text-xs text-slate-300">
              最新の当事者メッセージに基づく問い合わせ案を取得するとここに表示されます。
            </p>
          ) : (
            <ul className="mt-4 space-y-3">
              {suggestions.map((suggestion) => (
                <li
                  key={suggestion.id}
                  className="rounded-xl border border-slate-700 bg-slate-900/70 p-4 text-sm text-slate-200"
                >
                  <div className="flex items-center justify-between text-xs text-slate-400">
                    <span>評価: {suggestion.score ?? "―"}</span>
                    <span>順位: {suggestion.rank}</span>
                  </div>
                  <p className="mt-2 font-semibold text-slate-100">
                    {suggestion.question}
                  </p>
                  {suggestion.reason ? (
                    <p className="mt-2 text-xs text-slate-300">
                      理由: {suggestion.reason}
                    </p>
                  ) : null}
                  <div className="mt-3 flex justify-end">
                    <button
                      type="button"
                      onClick={() => handleUseSuggestion(suggestion)}
                      className="rounded-full border border-brand-400/70 px-3 py-1 text-xs font-semibold text-brand-100 transition hover:border-brand-200"
                    >
                      この案を入力
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
        <section className="rounded-xl border border-slate-800 bg-slate-900/70 p-4 text-xs text-slate-300">
          <p className="font-semibold text-slate-200">進行のポイント</p>
          <ul className="mt-2 list-disc space-y-1 pl-5">
            <li>評価が高い案を優先しつつ、本人の状況に合わせて言葉を選びます。</li>
            <li>問い返し後は沈黙を恐れず、当事者の反応を待ちましょう。</li>
            <li>面談を終える際は次のステップやフォロー方法を共有します。</li>
          </ul>
        </section>
      </aside>
    </div>
  );
};

export default SupporterInterviewScreen;
