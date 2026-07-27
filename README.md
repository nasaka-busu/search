# 辞書 — JMdict検索

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

## ライセンス表記

- 辞書データ: JMdict/EDICT — © The Electronic Dictionary Research and Development Group (EDRDG),
  [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/)
  （[公式ライセンスページ](https://www.edrdg.org/edrdg/licence.html) /
  [プロジェクトページ](https://www.edrdg.org/wiki/index.php/JMdict-EDICT_Dictionary_Project)）
- JSON変換: [jmdict-simplified](https://github.com/scriptin/jmdict-simplified)
- 本アプリ自体（`index.html` / `update_jmdict_data.py` 等）の再配布時も、
  上記表記とライセンスページへのリンクをそのまま保持してください。
