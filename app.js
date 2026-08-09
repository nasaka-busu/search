// ---------- JMdict実データの読み込み ----------
// REMOTE_DATA_URL を設定すると、ページを開くたびにそのURLから最新データを取得しようとします。
// 空のままなら常に同梱データ(jmdict_data.js / ビルド時点)を使います。
// 設定する場合は、CORSヘッダー(Access-Control-Allow-Origin)を返せる場所にJSONを置く必要があります。
// 例: 自分のGitHubリポジトリに変換済みJSONを置き、raw.githubusercontent.com のURLを指定する。
const REMOTE_DATA_URL = ""; // 例: "https://raw.githubusercontent.com/<user>/<repo>/main/jmdict_compact.json"

let DATA = [];
const POS_LIST = ["名詞","動詞","形容詞","副詞","感動詞","助詞","接続詞","代名詞","接頭辞","接尾辞","表現・慣用句","その他"];

let conditions = []; // {id, type: 'reading'|'pos', matchType, value}
let idCounter = 0;
let mode = "and";

function normalize(raw){
  return raw.map(e => ({ kanji: e.k, reading: e.r, pos: e.p, meanings: e.m }));
}

async function loadData(){
  const sourceLabel = document.getElementById("dataSourceLabel");
  const countLabel = document.getElementById("wordCountLabel");
  const setSource = (text) => { if(sourceLabel) sourceLabel.textContent = text; };
  const setCount = (text) => { if(countLabel) countLabel.textContent = text; };

  setCount("読み込み中…");

  try{
    if(REMOTE_DATA_URL){
      try{
        setSource("オンラインの最新データを取得中…");
        const res = await fetch(REMOTE_DATA_URL, { cache: "no-store" });
        if(!res.ok) throw new Error("HTTP " + res.status);
        const json = await res.json();
        DATA = normalize(json);
        setSource("オンラインデータ（取得日時: " + new Date().toLocaleString("ja-JP") + "）を使用中。");
      }catch(err){
        console.warn("リモートデータの取得に失敗、同梱データを使用します:", err);
        DATA = normalize(JMDICT_DATA);
        setSource("オンライン取得に失敗したため、同梱データ（ビルド時点）を使用中。");
      }
    } else {
      DATA = normalize(JMDICT_DATA);
      setSource("同梱データ（ビルド時点の常用語スナップショット）を使用中。定期的な更新については後述の更新スクリプトを利用してください。");
    }
  } finally {
    // sourceLabel の有無に関わらず、必ず単語数の表示を更新する
    setCount(DATA.length + " 語");
  }
}

function addCondition(){
  conditions.push({ id: idCounter++, type: "reading", matchType: "starts", value: "", count: 2, operator: "eq" });
  renderConditions();
  runSearch();
}

function removeCondition(id){
  conditions = conditions.filter(c => c.id !== id);
  renderConditions();
  runSearch();
}

function updateCondition(id, patch){
  const c = conditions.find(c => c.id === id);
  Object.assign(c, patch);
  renderConditions();
  runSearch();
}

// テキスト・数値の入力欄用: DOM(入力欄そのもの)を作り直さずに値だけ更新する。
// renderConditions()を呼ぶとinput要素が再生成されてフォーカスが外れ、
// IME変換中の文字が確定されてしまう(「き」が「ｋ」で止まる)ため、ここでは呼ばない。
let searchDebounceTimer = null;
function updateConditionValue(condition, patch){
  Object.assign(condition, patch);
  clearTimeout(searchDebounceTimer);
  searchDebounceTimer = setTimeout(runSearch, 80);
}

function renderConditions(){
  const wrap = document.getElementById("conditions");
  wrap.innerHTML = "";
  conditions.forEach((c, i) => {
    if(i > 0){
      const div = document.createElement("div");
      div.className = "and-divider";
      div.textContent = mode === "and" ? "－ かつ －" : "－ または －";
      wrap.appendChild(div);
    }
    const row = document.createElement("div");
    row.className = "condition";
    row.dataset.index = "条件 " + (i + 1);

    // 種類セレクト
    const typeSel = document.createElement("select");
    [["reading","読み(かな)"], ["pos","品詞"]].forEach(([v,l]) => {
      const opt = document.createElement("option");
      opt.value = v; opt.textContent = l;
      if(c.type === v) opt.selected = true;
      typeSel.appendChild(opt);
    });
    typeSel.onchange = e => updateCondition(c.id, {
      type: e.target.value,
      matchType: "starts",
      value: e.target.value === "pos" ? POS_LIST[0] : "",
      count: 2,
      operator: "eq"
    });
    row.appendChild(typeSel);

    if(c.type === "reading"){
      const matchSel = document.createElement("select");
      [["starts","前方一致"], ["ends","後方一致"], ["contains","部分一致"], ["length","文字数"], ["count","文字の出現回数"]].forEach(([v,l]) => {
        const opt = document.createElement("option");
        opt.value = v; opt.textContent = l;
        if(c.matchType === v) opt.selected = true;
        matchSel.appendChild(opt);
      });
      matchSel.onchange = e => {
        const newType = e.target.value;
        const textTypes = ["starts", "ends", "contains"];
        const patch = { matchType: newType };
        if(textTypes.includes(newType) && textTypes.includes(c.matchType)){
          // 前方一致・後方一致・部分一致はどれも同じ「文字列」を扱うため、値を保持する
        } else if(newType === "count"){
          patch.value = "";
          patch.count = 2;
          patch.operator = "eq";
        } else {
          // 文字数(length)への切替、またはlength/countからの切替は値の意味が変わるためリセット
          patch.value = "";
        }
        updateCondition(c.id, patch);
      };
      row.appendChild(matchSel);

      if(c.matchType === "count"){
        const charInput = document.createElement("input");
        charInput.type = "text";
        charInput.placeholder = "例: あ";
        charInput.value = c.value;
        charInput.style.width = "80px";
        charInput.oninput = e => updateConditionValue(c, { value: e.target.value });
        row.appendChild(charInput);

        const opSel = document.createElement("select");
        [["eq","ちょうど"], ["gte","以上"]].forEach(([v,l]) => {
          const opt = document.createElement("option");
          opt.value = v; opt.textContent = l;
          if(c.operator === v) opt.selected = true;
          opSel.appendChild(opt);
        });
        opSel.onchange = e => updateCondition(c.id, { operator: e.target.value });
        row.appendChild(opSel);

        const countInput = document.createElement("input");
        countInput.type = "number";
        countInput.min = "1";
        countInput.value = c.count;
        countInput.style.width = "70px";
        countInput.oninput = e => updateConditionValue(c, { count: e.target.value });
        row.appendChild(countInput);

        const unit = document.createElement("span");
        unit.style.color = "var(--ink-dim)";
        unit.style.fontSize = "13px";
        unit.textContent = "回";
        row.appendChild(unit);
      } else {
        const input = document.createElement("input");
        if(c.matchType === "length"){
          input.type = "number";
          input.min = "1";
          input.placeholder = "例: 4";
        } else {
          input.type = "text";
          input.placeholder = "例: あ";
        }
        input.value = c.value;
        input.oninput = e => updateConditionValue(c, { value: e.target.value });
        row.appendChild(input);
      }
    } else {
      const posSel = document.createElement("select");
      POS_LIST.forEach(p => {
        const opt = document.createElement("option");
        opt.value = p; opt.textContent = p;
        if(c.value === p) opt.selected = true;
        posSel.appendChild(opt);
      });
      posSel.onchange = e => updateCondition(c.id, { value: e.target.value });
      if(!c.value) c.value = POS_LIST[0];
      posSel.value = c.value;
      row.appendChild(posSel);
    }

    const removeBtn = document.createElement("button");
    removeBtn.className = "remove-btn";
    removeBtn.textContent = "×";
    removeBtn.onclick = () => removeCondition(c.id);
    row.appendChild(removeBtn);

    wrap.appendChild(row);
  });
}

function conditionMatches(entry, c){
  if(c.type === "reading"){
    const v = (c.value || "").trim();
    if(!v) return true;
    const r = entry.reading;
    if(c.matchType === "starts") return r.startsWith(v);
    if(c.matchType === "ends") return r.endsWith(v);
    if(c.matchType === "contains") return r.includes(v);
    if(c.matchType === "length") return r.length === Number(v);
    if(c.matchType === "count"){
      const occ = countOccurrences(r, v);
      return c.operator === "gte" ? occ >= Number(c.count) : occ === Number(c.count);
    }
  } else if(c.type === "pos"){
    if(!c.value) return true;
    return entry.pos === c.value;
  }
  return true;
}

function countOccurrences(str, sub){
  if(!sub) return 0;
  let count = 0, pos = 0;
  while((pos = str.indexOf(sub, pos)) !== -1){
    count++;
    pos += sub.length;
  }
  return count;
}

function highlightReading(entry){
  const readingConds = conditions.filter(c => c.type === "reading" && c.matchType !== "length" && c.value);
  if(readingConds.length === 0) return entry.reading;
  // 出現回数条件があれば、該当箇所を全てハイライト
  const countCond = readingConds.find(c => c.matchType === "count" && entry.reading.includes(c.value));
  if(countCond){
    return entry.reading.split(countCond.value).join("<mark>" + countCond.value + "</mark>");
  }
  for(const c of readingConds){
    const idx = entry.reading.indexOf(c.value);
    if(idx !== -1){
      return entry.reading.slice(0, idx)
        + "<mark>" + entry.reading.slice(idx, idx + c.value.length) + "</mark>"
        + entry.reading.slice(idx + c.value.length);
    }
  }
  return entry.reading;
}

const MAX_DISPLAY_RESULTS = 200;

// 読み(かな)を五十音順に並べるためのコレーター(単純なUnicode順だと濁音・拗音などの並びがずれるため)
const kanaCollator = new Intl.Collator("ja", { usage: "sort", sensitivity: "variant" });

function runSearch(){
  const active = conditions.filter(c => c.type === "pos" ? c.value : (c.value !== "" && c.value !== null));
  let results;
  if(active.length === 0){
    results = DATA;
  } else if(mode === "and"){
    results = DATA.filter(e => active.every(c => conditionMatches(e, c)));
  } else {
    results = DATA.filter(e => active.some(c => conditionMatches(e, c)));
  }

  results = results.slice().sort((a, b) => kanaCollator.compare(a.reading, b.reading));

  const countLabel = document.getElementById("resultCount");
  const list = document.getElementById("resultList");
  list.innerHTML = "";

  if(results.length === 0){
    countLabel.textContent = "0 件";
    const empty = document.createElement("div");
    empty.className = "empty-state";
    empty.textContent = "条件に一致する語彙が見つかりませんでした。条件を見直してください。";
    list.appendChild(empty);
    return;
  }

  const isTruncated = results.length > MAX_DISPLAY_RESULTS;
  countLabel.textContent = results.length + " 件" + (isTruncated ? `（先頭${MAX_DISPLAY_RESULTS}件を表示中）` : "");

  // 大量のDOM操作を一度にまとめて反映するため、DocumentFragmentに積んでから1回でappendする
  const frag = document.createDocumentFragment();
  const toRender = isTruncated ? results.slice(0, MAX_DISPLAY_RESULTS) : results;
  toRender.forEach(e => {
    const card = document.createElement("div");
    card.className = "entry";
    card.innerHTML = `
      <span class="kanji">${e.kanji}</span>
      <span class="reading">${highlightReading(e)}</span>
      <span class="pos">${e.pos}</span>
      <span class="meanings">${e.meanings.join(" / ")}</span>
    `;
    frag.appendChild(card);
  });
  list.appendChild(frag);

  if(isTruncated){
    const note = document.createElement("div");
    note.className = "empty-state";
    note.textContent = `他に ${results.length - MAX_DISPLAY_RESULTS} 件あります。条件を追加すると絞り込めます。`;
    list.appendChild(note);
  }
}

document.getElementById("addCondition").addEventListener("click", addCondition);

document.querySelectorAll(".mode-btn").forEach(btn => {
  btn.addEventListener("click", () => {
    mode = btn.dataset.mode;
    document.querySelectorAll(".mode-btn").forEach(b => b.classList.toggle("active", b === btn));
    renderConditions();
    runSearch();
  });
});

(async function init(){
  await loadData();
  // 初期状態は条件なし(全件表示、上限200件まで)からスタートする
  renderConditions();
  runSearch();
})();