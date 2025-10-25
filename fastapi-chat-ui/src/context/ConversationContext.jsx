import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
} from "react";

const ConversationContext = createContext(null);

const initialConversation = [
  {
    id: "supporter-0",
    role: "supporter",
    content:
      "こんにちは。行動の背景を一緒に整理できるよう、率直に気持ちを教えてください。",
    createdAt: "準備完了",
  },
  {
    id: "participant-0",
    role: "participant",
    content:
      "この前またイライラしてコンビニでおにぎり持って出ちゃって…気づいたら外に出てて、店員さんに呼び止められた。",
    createdAt: "13:20",
  },
  {
    id: "supporter-1",
    role: "supporter",
    content:
      "話してくれてありがとう。声をかけられて止まったとき、どんな気持ちだった？",
    createdAt: "13:21",
  },
  {
    id: "participant-1",
    role: "participant",
    content:
      "もう本当に嫌になって逃げたかった。見つかったのも全部終わった感じがして、頭が真っ白だった。",
    createdAt: "13:22",
  },
];

export const ConversationProvider = ({ children }) => {
  const [messages, setMessages] = useState(() => [...initialConversation]);
  const counterRef = useRef(initialConversation.length);

  const appendMessage = useCallback(
    (role, content, options = {}) => {
      const timestamp =
        options.createdAt ||
        new Date().toLocaleTimeString("ja-JP", {
          hour: "2-digit",
          minute: "2-digit",
        });
      const message = {
        id: `${role}-${counterRef.current++}`,
        role,
        content,
        createdAt: timestamp,
      };
      setMessages((prev) => [...prev, message]);
      return message;
    },
    [setMessages],
  );

  const clearMessages = useCallback(() => {
    counterRef.current = initialConversation.length;
    setMessages([...initialConversation]);
  }, [setMessages]);

  const value = useMemo(
    () => ({
      messages,
      appendMessage,
      clearMessages,
    }),
    [messages, appendMessage, clearMessages],
  );

  return (
    <ConversationContext.Provider value={value}>
      {children}
    </ConversationContext.Provider>
  );
};

export const useConversation = () => {
  const context = useContext(ConversationContext);
  if (!context) {
    throw new Error(
      "useConversation must be used within a ConversationProvider",
    );
  }
  return context;
};
