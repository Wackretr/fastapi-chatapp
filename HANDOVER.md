# 引き継ぎノート（BRANQ&A Lite）

## プロジェクト概要
- FastAPI（バックエンド）と Vite＋React（フロントエンド）で構築する面談支援アプリのデモ実装です。
- 当事者・支援者双方の面談画面を同一リポジトリ内で確認できるようにし、支援者は AI が提示する「返神」候補を利用できます。
- 以降の開発では、別フロントアプリ化や本格的なリアルタイム同期・ユーザー管理を拡張していく想定です。

## 現在の進捗
- `/chat` および `/chat_rag` が評価順 3 案を返すように FastAPI プロンプトを調整済み。
- フロントエンドに当事者モード／支援者モードの切替タブを追加。支援者画面では返神候補パネルを表示し、候補を入力欄へ反映する操作が可能。
- `ConversationContext` を新設し、当事者と支援者の画面で会話ログを共有できるようにしたため、デモ中に双方の発言が同期して表示されます。
- Vitest によるスモールテストは pass（`npm test -- --run`）。React の `act` 警告は未解消のため改善余地あり。

## 起動・動作確認
### バックエンド
```bash
poetry install
poetry run uvicorn fastapi_chatapp.main:app --reload --host 0.0.0.0 --port 8000
```

### フロントエンド
```bash
cd fastapi-chat-ui
npm install
npm run dev
```
- ブラウザで `http://localhost:5173/` を開くとデモ画面が表示されます。
- 当事者モードの textarea から送信 → 支援者モードに切替 → 履歴共有や返神候補の動作を確認できます。

## 主要ファイル
- `fastapi_chatapp/main.py` : API エンドポイント（/chat, /chat_rag ほか）。Prompts 更新済み。
- `fastapi-chat-ui/src/App.jsx` : モード切替タブと画面全体のルーティング。
- `fastapi-chat-ui/src/context/ConversationContext.jsx` : 会話状態共有のための React Context。
- `fastapi-chat-ui/src/screens/InterviewScreen.jsx` : 当事者向け面談画面。
- `fastapi-chat-ui/src/screens/SupporterInterviewScreen.jsx` : 支援者向け面談画面（返神取得 UI）。
- `HANDOVER.md`, `INSTRUCTIONS.md` : 現在の資料一式。

## 環境変数／機密情報
- `.env`（未同梱）で `OPENAI_API_KEY`, `OPENAI_MODEL`, `QA_XLSX_PATH`, `HIKITSUGI_MD_PATH` を設定。
- CORS 許可ドメインは `CORS_ALLOW_ORIGINS`（カンマ区切り）および必要に応じて `CORS_ALLOW_ORIGIN_REGEX` で上書き可能。デフォルトは `http://localhost:5173` と `https://fastapi-chat-ui.vercel.app`。
- フロント側で API ベース URL を切り替える場合は `.env.local` に `VITE_API_BASE` を設定。

## Render デプロイ手順
1. `render.yaml` が Blueprint としてリポジトリ直下にあるため、Render ダッシュボードで **New ➜ Blueprint** を選択し、このリポジトリを指定する。
 2. 生成されるサービス:
   - **fastapi-chatapp-backend**（Web Service / Python）  
     Build: `poetry install` / Start: `poetry run uvicorn fastapi_chatapp.main:app --host 0.0.0.0 --port $PORT`  
     `OPENAI_API_KEY` は Dashboard で Secret として入力。`CORS_ALLOW_ORIGINS` には `https://fastapi-chatapp-frontend.onrender.com` が事前設定されているので、独自ドメインを使う場合はここを更新する。
   - **fastapi-chatapp-frontend**（Static Site）  
     Build: `cd fastapi-chat-ui && npm install && npm run build` / Publish: `fastapi-chat-ui/dist`  
     `VITE_API_BASE` にはデフォルトで `https://fastapi-chatapp-backend.onrender.com` を設定。バックエンドの URL を変更した場合は手動で更新する。
3. デプロイ完了後、フロントの公開 URL（例: `https://fastapi-chatapp-frontend.onrender.com`）でチャット UI、バックエンドの Web Service URL で API が利用可能。必要ならば Render 側で Custom Domain、Auto Deploy 設定を有効にする。

## 未対応・TODO
- React テストの `act` 警告解消（`userEvent` 操作後に `await act(async () => …)` または `waitFor` を適用）。
- バックエンド／フロント間で実際のリアルタイム通信（WebSocket や SSE）の導入。
- 会話履歴の永続化（現在はメモリ内）。FastAPI 側にメッセージ保存 API を追加し、Context からフェッチする仕組みへ移行。
- 支援者検索・設定画面のダミーデータを実 API へ差し替え。
- 面談評価・返神使用回数の管理、新規 API の設計と実装。
- 管理者向けダッシュボード、AI 応答評価フローは未着手。

## 注意事項
- 会話共有はフロント内で擬似的に同期しているだけなので、デモ以外の用途ではバックエンドと整合するよう要再設計。
- `langchain-community` を含む依存は Poetry に追加済み。環境差異がある場合は `poetry lock --no-update` で再現可能なロックファイルを保持してください。
- 既存の Excel/Markdown データ（`fastapi_chatapp/data`）が無い場合、RAG 機能はダミー応答になります。

---
引き継ぎ担当: （記入者名を追記してください）
