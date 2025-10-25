import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import App from "./App";

describe("App", () => {
  beforeEach(() => {
    global.fetch = vi.fn();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("renders the initial assistant message and disabled submit button", () => {
    render(<App />);

    expect(
      screen.getByText("BRANQ&A Lite / 面談デモ"),
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        "こんにちは。行動の背景を一緒に整理できるよう、率直に気持ちを教えてください。",
      ),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "支援案を生成" }),
    ).toBeDisabled();
  });

  it("switches to supporter search screen via navigation", async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.click(screen.getByRole("button", { name: "支援者検索" }));

    expect(await screen.findByLabelText("キーワード")).toBeInTheDocument();
    expect(await screen.findByText("田中 里奈")).toBeInTheDocument();
  });

  it("enables the submit button when the textarea has content", async () => {
    const user = userEvent.setup();
    render(<App />);

    const textarea = screen.getByLabelText("メッセージ");
    await user.type(textarea, "テストメッセージ");

    await waitFor(() =>
      expect(
        screen.getByRole("button", { name: "支援案を生成" }),
      ).toBeEnabled(),
    );
  });

  it("allows switching to supporter mode and shows suggestion panel placeholder", async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.click(
      screen.getByRole("button", { name: /支援者モード/ }),
    );

    expect(
      screen.getByText("面談チャット（支援者）"),
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        "最新の当事者メッセージに基づく問い合わせ案を取得するとここに表示されます。",
      ),
    ).toBeInTheDocument();
  });

  it("sends a message and shows the assistant response when the API succeeds", async () => {
    const user = userEvent.setup();
    global.fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ response: "テスト応答" }),
    });

    render(<App />);

    await user.type(screen.getByLabelText("メッセージ"), "テストメッセージ");
    await user.click(screen.getByRole("button", { name: "支援案を生成" }));

    await waitFor(() => expect(global.fetch).toHaveBeenCalledTimes(1));
    expect(global.fetch).toHaveBeenCalledWith(
      "http://localhost:8000/chat",
      expect.objectContaining({
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: "テストメッセージ" }),
      }),
    );

    expect(await screen.findByText("テストメッセージ")).toBeInTheDocument();
    expect(await screen.findByText("テスト応答")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "支援案を生成" }),
    ).toBeDisabled();
    expect(screen.getByLabelText("メッセージ")).toHaveValue("");
  });

  it("restores the last user message when the API fails", async () => {
    const user = userEvent.setup();
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    global.fetch.mockResolvedValueOnce({
      ok: false,
      status: 500,
      text: async () => "エラー詳細",
    });

    render(<App />);

    await user.type(screen.getByLabelText("メッセージ"), "テストメッセージ");
    await user.click(screen.getByRole("button", { name: "支援案を生成" }));

    expect(
      await screen.findByText("エラーが発生しました"),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "支援案を生成" }),
    ).toBeDisabled();
    expect(screen.getByLabelText("メッセージ")).toHaveValue("");

    await user.click(screen.getByRole("button", { name: "入力欄に復元" }));

    expect(screen.getByLabelText("メッセージ")).toHaveValue("テストメッセージ");
    await waitFor(() =>
      expect(
        screen.getByRole("button", { name: "支援案を生成" }),
      ).toBeEnabled(),
    );
    consoleSpy.mockRestore();
  });
});
