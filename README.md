# 字引 — JMdict検索

JMdict（EDRDG, CC BY-SA 4.0）常用語データを使った、条件組み合わせ検索アプリです。
GitHub Pagesでの公開と、データの週次自動更新に対応しています。

## ファイル構成

```
index.html                 検索アプリ本体
jmdict_data.js              JMdict常用語データ(同梱・ビルド時点のスナップショット)
update_jmdict_data.py       JMdictの最新データを取得してjmdict_data.jsを再生成するスクリプト
.github/workflows/
  update-jmdict-data.yml    毎週日曜(UTC)に自動でデータを更新するGitHub Actions
```

## 公開手順（GitHub Pages）

1. このフォルダの中身をそのままGitHubリポジトリのルートにpushする
   ```bash
   git init
   git add .
   git commit -m "initial commit"
   git branch -M main
   git remote add origin https://github.com/<your-account>/<your-repo>.git
   git push -u origin main
   ```
2. リポジトリの **Settings → Pages** を開く
3. **Build and deployment → Source** を `Deploy from a branch` にする
4. **Branch** を `main` / `/ (root)` に設定して Save
5. 数分後、`https://<your-account>.github.io/<your-repo>/` でアプリが公開される

## データの自動更新について

- `.github/workflows/update-jmdict-data.yml` が **毎週日曜18:00 UTC** に自動実行され、
  JMdictの最新リリースを取得して `jmdict_data.js` を更新・コミット・プッシュします。
- Actionsタブから `Run workflow` で手動実行することもできます。
- JMdict/EDICTのライセンス(CC BY-SA 4.0)では、辞書データを配信するWebサーバーは
  定期的（目安：月1回以上）に最新版へ更新することが求められています。週次更新はこの条件を満たします。
- Actionsが正しく動くには、リポジトリの **Settings → Actions → General → Workflow permissions**
  で `Read and write permissions` を選択しておく必要があります（コミット・プッシュのため）。

## ローカルでの動作確認

`index.html` と `jmdict_data.js` を同じフォルダに置いてブラウザで `index.html` を開くだけで動作します
（サーバー不要）。手動でデータを更新したい場合は次を実行してください。

```bash
python3 update_jmdict_data.py
```

## ライセンス表記

- 辞書データ: JMdict/EDICT — © The Electronic Dictionary Research and Development Group (EDRDG),
  [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/)
  （[公式ライセンスページ](https://www.edrdg.org/edrdg/licence.html) /
  [プロジェクトページ](https://www.edrdg.org/wiki/index.php/JMdict-EDICT_Dictionary_Project)）
- JSON変換: [jmdict-simplified](https://github.com/scriptin/jmdict-simplified)
- 本アプリ自体（`index.html` / `update_jmdict_data.py` 等）の再配布時も、
  上記表記とライセンスページへのリンクをそのまま保持してください。
