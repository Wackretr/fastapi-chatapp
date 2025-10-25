import { useEffect, useMemo, useRef, useState } from "react";
import { useConversation } from "../context/ConversationContext";

const MessageBubble = ({ role, content, createdAt }) => {
  const isSupporter = role === "supporter";
  return (
    <div
      className={`flex w-full ${
        isSupporter ? "justify-start" : "justify-end"
      }`}
    >
      <div
        className={`mt-3 max-w-xl rounded-2xl px-4 py-3 shadow-md ${
          isSupporter ? "bg-slate-800/90 text-slate-100" : "bg-brand-500 text-white"
        }`}
      >
        <p className="whitespace-pre-wrap text-sm leading-relaxed">
          {content}
        </p>
        <span className="mt-2 block text-[10px] uppercase tracking-wider opacity-70">
          {isSupporter ? "支援AI" : "対象者"}・{createdAt}
        </span>
      </div>
    </div>
  );
};

const InterviewScreen = ({ apiBase }) => {
  const { messages, appendMessage } = useConversation();
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const listRef = useRef(null);

  const conversation = useMemo(() => messages, [messages]);

  useEffect(() => {
    if (!listRef.current) {
      return;
    }
    listRef.current.scrollTop = listRef.current.scrollHeight;
  }, [conversation]);

  const sendMessage = async () => {
    const trimmed = input.trim();
    if (!trimmed) {
      return;
    }
    appendMessage("participant", trimmed);
    setInput("");
    setError("");
    setIsLoading(true);

    try {
      const response = await fetch(`${apiBase}/chat`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ message: trimmed }),
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
      const replyText = data?.response?.trim() || "応答が取得できませんでした。";
      appendMessage("supporter", replyText);
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : "不明なエラーです。");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    void sendMessage();
  };

  const handleKeyDown = (event) => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      void sendMessage();
    }
  };

  const handleTryAgain = () => {
    if (messages.at(-1)?.role === "supporter" || !messages.length) {
      return;
    }
    const lastUserMessage = messages.at(-1);
    if (!lastUserMessage || lastUserMessage.role !== "participant") {
      return;
    }
    setInput(lastUserMessage.content);
  };

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
      <section className="flex min-h-[540px] flex-col overflow-hidden rounded-2xl border border-slate-800 bg-slate-900/60 shadow-lg">
        <div className="border-b border-slate-800 px-6 py-4">
          <h2 className="text-lg font-semibold">面談チャット</h2>
          <p className="mt-1 text-xs text-slate-400">
            生成された問い返し案を参考にしながら、面談を進められます。
          </p>
          <p className="mt-3 text-[11px] text-slate-500">
            API:{" "}
            <span className="font-mono text-slate-300">
              {apiBase}
              /chat
            </span>
          </p>
        </div>
        <div
          ref={listRef}
          className="flex-1 overflow-y-auto px-6 py-6 md:px-8 md:py-8"
        >
          {conversation.map((msg) => (
            <MessageBubble
              key={msg.id}
              role={msg.role}
              content={msg.content}
              createdAt={msg.createdAt}
            />
          ))}
          {error ? (
            <div className="mt-4 rounded-md border border-red-500/60 bg-red-500/10 px-4 py-3 text-sm text-red-200">
              <p className="font-semibold">エラーが発生しました</p>
              <p className="mt-1 whitespace-pre-wrap">{error}</p>
              <button
                type="button"
                onClick={handleTryAgain}
                className="mt-3 inline-flex items-center gap-2 rounded-full border border-red-400/40 px-3 py-1 text-xs font-semibold text-red-200 hover:border-red-200 hover:text-red-50"
              >
                入力欄に復元
              </button>
            </div>
          ) : null}
        </div>
        <form
          onSubmit={handleSubmit}
          className="border-t border-slate-800 bg-slate-900/80 px-6 py-4 backdrop-blur md:px-8"
        >
          <label htmlFor="message" className="sr-only">
            メッセージ
          </label>
          <textarea
            id="message"
            name="message"
            value={input}
            onChange={(event) => setInput(event.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="対象者の発言を記録してください"
            className="h-28 w-full rounded-xl border border-slate-700 bg-slate-900/80 px-4 py-3 text-sm text-slate-50 outline-none ring-brand-400 transition focus:border-brand-400 focus:ring-2"
          />
          <div className="mt-3 flex items-center justify-between gap-4">
            <p className="text-[11px] text-slate-400">
              Shift+Enter で改行、Enter で送信します。
            </p>
            <button
              type="submit"
              disabled={isLoading || !input.trim()}
              className="inline-flex items-center gap-2 rounded-full bg-brand-500 px-5 py-2 text-sm font-semibold text-white transition hover:bg-brand-400 disabled:cursor-not-allowed disabled:bg-brand-800"
            >
              {isLoading ? "送信中..." : "支援案を生成"}
            </button>
          </div>
        </form>
      </section>

      <aside className="flex flex-col gap-6 rounded-2xl border border-slate-800 bg-slate-900/40 p-6">
        <section>
          <h3 className="text-sm font-semibold uppercase tracking-widest text-slate-400">
            面談のポイント
          </h3>
          <ul className="mt-4 space-y-2 text-xs leading-relaxed text-slate-300">
            <li>対象者の言葉をそのまま引用し、行動の背景を探ります。</li>
            <li>問い返し案は評価順に3つ表示されます。最適なものを選んでください。</li>
            <li>支援者の声かけ例も参考にしつつ、自分の言葉に言い換えましょう。</li>
          </ul>
        </section>
        <section className="rounded-xl border border-slate-800 bg-slate-900/70 p-4 text-xs text-slate-300">
          <p className="font-semibold text-slate-200">メモ</p>
          <p className="mt-2">
            面談で得た気づきや観察事項は、支援者検索や設定画面から共有できます。
          </p>
        </section>
      </aside>
    </div>
  );
};

export default InterviewScreen;
