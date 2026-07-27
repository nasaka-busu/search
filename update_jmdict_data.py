#!/usr/bin/env python3
"""
JMdict常用語データの更新スクリプト
------------------------------------
scriptin/jmdict-simplified の最新リリースから jmdict-eng-common
(JMdict常用語のみの英語版JSON) を取得し、本アプリ用のコンパクトな
jmdict_data.js を再生成します。

JMdict/EDICTのライセンス(CC BY-SA 4.0)では、データを利用するWWWサーバー等は
定期的に最新版へ更新することが求められています(目安: 月1回以上)。
このスクリプトを定期実行(cronなど)することでその要件を満たせます。

使い方:
    pip install requests
    python3 update_jmdict_data.py

出力:
    ./jmdict_data.js  (jmdict_search.html と同じフォルダに置く)
"""

import json
import re
import sys
import zipfile
import io
import urllib.request

REPO = "scriptin/jmdict-simplified"
ASSET_NAME_PATTERN = re.compile(r"^jmdict-eng-common-.*\.json\.zip$")
OUTPUT_JS = "jmdict_data.js"


def get_latest_asset_url():
    api_url = f"https://api.github.com/repos/{REPO}/releases/latest"
    req = urllib.request.Request(api_url, headers={"User-Agent": "jmdict-update-script"})
    with urllib.request.urlopen(req) as res:
        release = json.load(res)
    for asset in release.get("assets", []):
        if ASSET_NAME_PATTERN.match(asset["name"]):
            return asset["browser_download_url"], release.get("tag_name", "")
    raise RuntimeError("common-only JSON asset not found in latest release")


def download_and_extract(url):
    req = urllib.request.Request(url, headers={"User-Agent": "jmdict-update-script"})
    with urllib.request.urlopen(req) as res:
        zip_bytes = res.read()
    with zipfile.ZipFile(io.BytesIO(zip_bytes)) as zf:
        json_name = [n for n in zf.namelist() if n.endswith(".json")][0]
        with zf.open(json_name) as f:
            return json.load(f)


def map_pos(tags):
    if not tags:
        return "その他"
    for t in tags:
        if t == "exp":
            return "表現・慣用句"
    for t in tags:
        if t.startswith("adj"):
            return "形容詞"
    for t in tags:
        if t.startswith("v") or t == "aux-v":
            return "動詞"
    for t in tags:
        if t.startswith("adv"):
            return "副詞"
    for t in tags:
        if t == "int":
            return "感動詞"
    for t in tags:
        if t == "prt":
            return "助詞"
    for t in tags:
        if t == "conj":
            return "接続詞"
    for t in tags:
        if t == "pn":
            return "代名詞"
    for t in tags:
        if t in ("pref", "n-pref"):
            return "接頭辞"
    for t in tags:
        if t in ("suf", "n-suf"):
            return "接尾辞"
    for t in tags:
        if t.startswith("n"):
            return "名詞"
    return "その他"


def convert(words):
    out = []
    for w in words:
        kanji_list = w.get("kanji", [])
        kana_list = w.get("kana", [])
        if not kana_list:
            continue
        kana_common = [k for k in kana_list if k.get("common")]
        reading = (kana_common[0] if kana_common else kana_list[0])["text"]

        if kanji_list:
            kanji_common = [k for k in kanji_list if k.get("common")]
            headword = (kanji_common[0] if kanji_common else kanji_list[0])["text"]
        else:
            headword = reading

        senses = w.get("sense", [])
        pos_tags, meanings = [], []
        for s in senses[:3]:
            pos_tags.extend(s.get("partOfSpeech", []))
            for g in s.get("gloss", []):
                if g.get("lang") == "eng" and g.get("text") and g["text"] not in meanings:
                    meanings.append(g["text"])
            if len(meanings) >= 4:
                break
        out.append({"k": headword, "r": reading, "p": map_pos(pos_tags), "m": meanings[:4]})
    return out


def main():
    print("最新リリースを確認中...")
    url, tag = get_latest_asset_url()
    print(f"取得元: {url} (release: {tag})")

    print("ダウンロード & 展開中...")
    raw = download_and_extract(url)
    words = raw["words"]
    print(f"エントリ数: {len(words)}")

    print("変換中...")
    compact = convert(words)

    with open(OUTPUT_JS, "w", encoding="utf-8") as f:
        f.write("const JMDICT_DATA = ")
        json.dump(compact, f, ensure_ascii=False, separators=(",", ":"))
        f.write(";\n")

    print(f"完了: {OUTPUT_JS} を更新しました ({len(compact)} 語, dictDate={raw.get('dictDate')})")


if __name__ == "__main__":
    try:
        main()
    except Exception as e:
        print(f"エラー: {e}", file=sys.stderr)
        sys.exit(1)
