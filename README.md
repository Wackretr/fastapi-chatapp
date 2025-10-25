# fastapi-chatapp

FastAPI（バックエンド）＋ Vite/React（フロントエンド）で構成された面談支援デモです。  
ローカル実行と Render へのデプロイ手順を以下にまとめています。

## ローカルセットアップ

```bash
poetry install
poetry run uvicorn fastapi_chatapp.main:app --reload --host 0.0.0.0 --port 8000

cd fastapi-chat-ui
npm install
npm run dev
```

ブラウザで `http://localhost:5173/` を開き、当事者／支援者タブを切り替えて動作確認できます。必要な環境変数は `.env`（バックエンド）と `fastapi-chat-ui/.env` に設定してください。

## Render へのデプロイ

`render.yaml` に Render Blueprint を定義済みです。GitHub リポジトリを Render に接続し、以下の手順でデプロイします。

1. Render ダッシュボードで **New ➜ Blueprint** を選択し、このリポジトリを指定して `render.yaml` を読み込む。
2. 2 つのサービスが作成されます。
   - **fastapi-chatapp-backend（Web Service / Python）**  
     - Build: `poetry install`  
     - Start: `poetry run uvicorn fastapi_chatapp.main:app --host 0.0.0.0 --port $PORT`  
     - 環境変数：`OPENAI_API_KEY`（Dashboard 上で入力）、`OPENAI_MODEL`（任意）、`QA_XLSX_PATH`, `HIKITSUGI_MD_PATH`, `CORS_ALLOW_ORIGINS`（フロント URL）。
   - **fastapi-chatapp-frontend（Static Site）**  
     - Build: `cd fastapi-chat-ui && npm install && npm run build`  
     - Publish: `fastapi-chat-ui/dist`  
     - 環境変数：`VITE_API_BASE`（バックエンド URL を Blueprint で連携済み）。
3. Blueprint ではフロント URL を `https://fastapi-chatapp-frontend.onrender.com` としてバックエンドの `CORS_ALLOW_ORIGINS` に設定しています。独自ドメインを割り当てる場合は Render ダッシュボードで同環境変数を更新してください。
4. デプロイ完了後、フロントの `VITE_API_BASE` にはバックエンドの公開 URL が自動で注入されるため、ブラウザから直接 API 呼び出しが行えます。

参考: `.env.example` と `render.yaml` の環境変数キーが揃っているので、ローカル／本番の双方で同じ変数名を利用できます。
