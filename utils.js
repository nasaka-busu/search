// ---------- 隠しコマンド: ↑↑↓↓←→←→BA で逆ポーランド電卓を起動 ----------
(function(){
  const KONAMI = ["ArrowUp","ArrowUp","ArrowDown","ArrowDown","ArrowLeft","ArrowRight","ArrowLeft","ArrowRight","b","a"];
  let progress = 0;

  document.addEventListener("keydown", (e) => {
    const key = e.key.length === 1 ? e.key.toLowerCase() : e.key;
    if(key === KONAMI[progress]){
      progress++;
      if(progress === KONAMI.length){
        progress = 0;
        openRpn();
      }
    } else {
      progress = (key === KONAMI[0]) ? 1 : 0;
    }
  });

  // ---------- RPN計算エンジン ----------
  let stack = [];
  let buffer = "";

  function openRpn(){
    stack = [];
    buffer = "";
    renderStack();
    renderBuffer();
    document.getElementById("rpnOverlay").classList.add("active");
  }
  function closeRpn(){
    document.getElementById("rpnOverlay").classList.remove("active");
  }

  function renderStack(){
    const el = document.getElementById("rpnStack");
    el.innerHTML = "";
    if(stack.length === 0){
      const empty = document.createElement("div");
      empty.className = "rpn-empty";
      empty.textContent = "スタックは空です";
      el.appendChild(empty);
      return;
    }
    stack.forEach((v, i) => {
      const row = document.createElement("div");
      row.className = "rpn-row";
      row.innerHTML = `<span>${stack.length - i <= 1 ? "→" : ""} ${i}:</span><span>${formatNum(v)}</span>`;
      el.appendChild(row);
    });
  }

  function renderBuffer(){
    document.getElementById("rpnBuffer").textContent = buffer || "\u00a0";
  }

  function formatNum(n){
    if(!isFinite(n)) return "エラー";
    return Number(n.toPrecision(12)).toString();
  }

  function pushBufferIfAny(){
    if(buffer !== "" && buffer !== "-" && buffer !== "."){
      stack.push(parseFloat(buffer));
    }
    buffer = "";
  }

  function applyOp(op){
    pushBufferIfAny();
    if(stack.length < 2){
      document.getElementById("rpnBuffer").innerHTML = '<span class="rpn-error">スタックが足りません</span>';
      return;
    }
    const b = stack.pop();
    const a = stack.pop();
    let r;
    if(op === "+") r = a + b;
    else if(op === "-") r = a - b;
    else if(op === "×") r = a * b;
    else if(op === "÷") r = b === 0 ? NaN : a / b;
    stack.push(r);
    renderStack();
    renderBuffer();
  }

  function handleKey(k){
    if(k === "C"){
      stack = []; buffer = "";
    } else if(k === "⌫"){
      buffer = buffer.slice(0, -1);
    } else if(k === "Enter"){
      pushBufferIfAny();
    } else if(k === "+/-"){
      if(buffer.startsWith("-")) buffer = buffer.slice(1);
      else buffer = "-" + buffer;
    } else if(k === "."){
      if(!buffer.includes(".")) buffer += ".";
    } else if(["+","-","×","÷"].includes(k)){
      applyOp(k);
      return;
    } else {
      buffer += k;
    }
    renderStack();
    renderBuffer();
  }

  const KEYS = ["7","8","9","÷", "4","5","6","×", "1","2","3","-", "0",".","+/-","+", "C","⌫","Enter","Enter"];
  const grid = document.getElementById("rpnGrid");
  KEYS.forEach((k, idx) => {
    if(idx === 19) return; // 2つ目のEnterはスキップしてwideボタンにする
    const btn = document.createElement("button");
    btn.className = "rpn-key" + (["+","-","×","÷"].includes(k) ? " op" : "") + (k === "Enter" ? " wide" : "");
    btn.textContent = k;
    btn.onclick = () => handleKey(k);
    grid.appendChild(btn);
  });

  document.getElementById("rpnClose").addEventListener("click", closeRpn);
  document.getElementById("rpnOverlay").addEventListener("click", (e) => {
    if(e.target.id === "rpnOverlay") closeRpn();
  });
  document.addEventListener("keydown", (e) => {
    const overlay = document.getElementById("rpnOverlay");
    if(!overlay.classList.contains("active")) return;
    if(e.key === "Escape"){ closeRpn(); return; }
    if(e.key >= "0" && e.key <= "9"){ handleKey(e.key); }
    else if(e.key === "."){ handleKey("."); }
    else if(e.key === "Enter"){ handleKey("Enter"); }
    else if(e.key === "Backspace"){ handleKey("⌫"); }
    else if(e.key === "+"){ handleKey("+"); }
    else if(e.key === "-"){ handleKey("-"); }
    else if(e.key === "*"){ handleKey("×"); }
    else if(e.key === "/"){ e.preventDefault(); handleKey("÷"); }
  });
})();

// ---------- 隠しコマンド: 入力欄の外で "shakkan" と打つと単位変換ツールを起動 ----------
(function(){
  const TRIGGER = "shakkan";
  let buffer = "";

  document.addEventListener("keydown", (e) => {
    const tag = (e.target.tagName || "").toLowerCase();
    if(tag === "input" || tag === "select" || tag === "textarea" || e.target.isContentEditable) return;
    if(e.key.length !== 1) return;
    buffer = (buffer + e.key.toLowerCase()).slice(-TRIGGER.length);
    if(buffer === TRIGGER){
      buffer = "";
      openUnitConverter();
    }
  });

  // ---------- 単位カテゴリと換算係数(基準単位に対する倍率) ----------
  const CATEGORIES = {
    length: {
      label: "長さ",
      units: {
        mm:    { label: "ミリメートル", factor: 0.001 },
        cm:    { label: "センチメートル", factor: 0.01 },
        m:     { label: "メートル", factor: 1 },
        km:    { label: "キロメートル", factor: 1000 },
        inch:  { label: "インチ", factor: 0.0254 },
        feet:  { label: "フィート", factor: 0.3048 },
        yard:  { label: "ヤード", factor: 0.9144 },
        mile:  { label: "マイル", factor: 1609.344 },
        sun:   { label: "寸", tag: "尺貫法", factor: 0.0303030303 },
        shaku: { label: "尺", tag: "尺貫法", factor: 0.303030303 },
        ken:   { label: "間", tag: "尺貫法", factor: 1.81818182 },
        jou:   { label: "丈", tag: "尺貫法", factor: 3.03030303 },
        cho:   { label: "町", tag: "尺貫法", factor: 109.090909 },
        ri:    { label: "里", tag: "尺貫法", factor: 3927.27273 },
      }
    },
    mass: {
      label: "重さ",
      units: {
        mg:    { label: "ミリグラム", factor: 0.001 },
        g:     { label: "グラム", factor: 1 },
        kg:    { label: "キログラム", factor: 1000 },
        t:     { label: "トン", factor: 1000000 },
        oz:    { label: "オンス", factor: 28.349523125 },
        lb:    { label: "ポンド", factor: 453.59237 },
        monme: { label: "匁", tag: "尺貫法", factor: 3.75 },
        kin:   { label: "斤", tag: "尺貫法", factor: 600 },
        kan:   { label: "貫", tag: "尺貫法", factor: 3750 },
      }
    },
    area: {
      label: "面積",
      units: {
        cm2:   { label: "平方センチメートル", factor: 0.0001 },
        m2:    { label: "平方メートル", factor: 1 },
        a:     { label: "アール", factor: 100 },
        ha:    { label: "ヘクタール", factor: 10000 },
        km2:   { label: "平方キロメートル", factor: 1000000 },
        acre:  { label: "エーカー", factor: 4046.8564224 },
        tsubo: { label: "坪", tag: "尺貫法", factor: 3.30578512 },
        se:    { label: "畝", tag: "尺貫法", factor: 99.1735537 },
        tan:   { label: "反", tag: "尺貫法", factor: 991.735537 },
        cho2:  { label: "町(面積)", tag: "尺貫法", factor: 9917.35537 },
      }
    },
    volume: {
      label: "体積",
      units: {
        mL:    { label: "ミリリットル", factor: 0.001 },
        L:     { label: "リットル", factor: 1 },
        m3:    { label: "立方メートル", factor: 1000 },
        galUS: { label: "ガロン(米)", factor: 3.785411784 },
        galUK: { label: "ガロン(英)", factor: 4.54609 },
        go:    { label: "合", tag: "尺貫法", factor: 0.180390693 },
        sho:   { label: "升", tag: "尺貫法", factor: 1.80390693 },
        to:    { label: "斗", tag: "尺貫法", factor: 18.0390693 },
        koku:  { label: "石", tag: "尺貫法", factor: 180.390693 },
      }
    },
    temperature: {
      label: "温度",
      special: true,
      units: {
        c: { label: "摂氏(°C)" },
        f: { label: "華氏(°F)" },
        k: { label: "ケルビン(K)" },
      }
    }
  };

  let currentCat = "length";
  let currentFrom = "m";

  function openUnitConverter(){
    renderTabs();
    setCategory(currentCat);
    document.getElementById("unitOverlay").classList.add("active");
    document.getElementById("unitValue").focus();
  }
  function closeUnitConverter(){
    document.getElementById("unitOverlay").classList.remove("active");
  }

  function renderTabs(){
    const tabs = document.getElementById("unitTabs");
    tabs.innerHTML = "";
    Object.keys(CATEGORIES).forEach(key => {
      const btn = document.createElement("button");
      btn.className = "unit-tab" + (key === currentCat ? " active" : "");
      btn.textContent = CATEGORIES[key].label;
      btn.onclick = () => setCategory(key);
      tabs.appendChild(btn);
    });
  }

  function setCategory(key){
    currentCat = key;
    const cat = CATEGORIES[key];
    currentFrom = Object.keys(cat.units)[0];
    renderTabs();

    const fromSel = document.getElementById("unitFrom");
    fromSel.innerHTML = "";
    Object.entries(cat.units).forEach(([code, u]) => {
      const opt = document.createElement("option");
      opt.value = code;
      opt.textContent = u.label + (u.tag ? `(${u.tag})` : "");
      fromSel.appendChild(opt);
    });
    fromSel.value = currentFrom;
    fromSel.onchange = () => { currentFrom = fromSel.value; computeAndRender(); };

    computeAndRender();
  }

  function tempToCelsius(v, unit){
    if(unit === "c") return v;
    if(unit === "f") return (v - 32) * 5 / 9;
    if(unit === "k") return v - 273.15;
  }
  function celsiusTo(v, unit){
    if(unit === "c") return v;
    if(unit === "f") return v * 9 / 5 + 32;
    if(unit === "k") return v + 273.15;
  }

  function formatNum(n){
    if(!isFinite(n)) return "―";
    const rounded = Number(n.toPrecision(10));
    return rounded.toLocaleString("ja-JP", { maximumFractionDigits: 8 });
  }

  function computeAndRender(){
    const cat = CATEGORIES[currentCat];
    const raw = document.getElementById("unitValue").value;
    const value = raw === "" ? null : parseFloat(raw);
    const list = document.getElementById("unitResults");
    list.innerHTML = "";

    Object.entries(cat.units).forEach(([code, u]) => {
      const row = document.createElement("div");
      row.className = "unit-row" + (code === currentFrom ? " origin" : "");

      let outStr = "―";
      if(value !== null && !isNaN(value)){
        let out;
        if(cat.special){
          out = celsiusTo(tempToCelsius(value, currentFrom), code);
        } else {
          const baseValue = value * cat.units[currentFrom].factor;
          out = baseValue / u.factor;
        }
        outStr = formatNum(out);
      }

      row.innerHTML = `
        <span class="unit-name">${u.label}${u.tag ? `<span class="unit-tag">${u.tag}</span>` : ""}</span>
        <span class="unit-value">${outStr}</span>
      `;
      list.appendChild(row);
    });
  }

  document.getElementById("unitValue").addEventListener("input", computeAndRender);
  document.getElementById("unitClose").addEventListener("click", closeUnitConverter);
  document.getElementById("unitOverlay").addEventListener("click", (e) => {
    if(e.target.id === "unitOverlay") closeUnitConverter();
  });
  document.addEventListener("keydown", (e) => {
    if(!document.getElementById("unitOverlay").classList.contains("active")) return;
    if(e.key === "Escape") closeUnitConverter();
  });
})();

// ---------- 隠しコマンド: Ctrl+Alt+H でハッシュ生成ツールを開閉 ----------
(function(){
  document.addEventListener("keydown", (e) => {
    const key = e.key.toLowerCase();
    if(e.ctrlKey && e.altKey && key === "h"){
      e.preventDefault();
      toggleHashTool();
    }
  });

  const ALGOS = ["SHA-1", "SHA-256", "SHA-384", "SHA-512"];
  let hashDebounce = null;

  function openHashTool(){
    document.getElementById("hashOverlay").classList.add("active");
    document.getElementById("hashInput").focus();
    computeAndRenderHashes();
  }
  function closeHashTool(){
    document.getElementById("hashOverlay").classList.remove("active");
  }
  function toggleHashTool(){
    const overlay = document.getElementById("hashOverlay");
    if(overlay.classList.contains("active")) closeHashTool();
    else openHashTool();
  }

  async function digestHex(algo, text){
    const enc = new TextEncoder().encode(text);
    const buf = await crypto.subtle.digest(algo, enc);
    return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, "0")).join("");
  }

  async function computeAndRenderHashes(){
    const text = document.getElementById("hashInput").value;
    const list = document.getElementById("hashResults");

    if(text === ""){
      list.innerHTML = '<div class="hash-empty">文字列を入力するとハッシュ値が表示されます</div>';
      return;
    }

    if(!(window.crypto && window.crypto.subtle)){
      list.innerHTML = '<div class="hash-empty">この環境ではWeb Crypto APIが利用できません(HTTPS、またはlocalhost経由での表示が必要です)</div>';
      return;
    }

    try{
      const results = await Promise.all(ALGOS.map(algo => digestHex(algo, text)));
      list.innerHTML = "";
      ALGOS.forEach((algo, i) => {
        const row = document.createElement("div");
        row.className = "hash-row";
        row.innerHTML = `
          <div class="hash-row-head">
            <span class="hash-algo">${algo}</span>
            <button class="hash-copy" data-hash="${results[i]}">コピー</button>
          </div>
          <div class="hash-value">${results[i]}</div>
        `;
        list.appendChild(row);
      });
      list.querySelectorAll(".hash-copy").forEach(btn => {
        btn.addEventListener("click", async () => {
          try{
            await navigator.clipboard.writeText(btn.dataset.hash);
            btn.textContent = "コピー済";
            btn.classList.add("copied");
            setTimeout(() => { btn.textContent = "コピー"; btn.classList.remove("copied"); }, 1200);
          }catch(err){
            console.warn("クリップボードへのコピーに失敗しました:", err);
          }
        });
      });
    }catch(err){
      list.innerHTML = '<div class="hash-empty">ハッシュの計算に失敗しました</div>';
    }
  }

  document.getElementById("hashInput").addEventListener("input", () => {
    clearTimeout(hashDebounce);
    hashDebounce = setTimeout(computeAndRenderHashes, 120);
  });
  document.getElementById("hashClose").addEventListener("click", closeHashTool);
  document.getElementById("hashOverlay").addEventListener("click", (e) => {
    if(e.target.id === "hashOverlay") closeHashTool();
  });
  document.addEventListener("keydown", (e) => {
    if(!document.getElementById("hashOverlay").classList.contains("active")) return;
    if(e.key === "Escape") closeHashTool();
  });
})();

// ---------- 隠しコマンド: Ctrl+Alt+I でIPv4⇔IPv6変換ツールを開閉 ----------
(function(){
  document.addEventListener("keydown", (e) => {
    const key = e.key.toLowerCase();
    if(e.ctrlKey && e.altKey && key === "i"){
      e.preventDefault();
      toggleIpTool();
    }
  });

  const TABS = { toV6: "IPv4 → IPv6", toV4: "IPv6 → IPv4" };
  let currentTab = "toV6";

  function openIpTool(){
    renderIpTabs();
    document.getElementById("ipOverlay").classList.add("active");
    document.getElementById("ipValue").focus();
    computeAndRenderIp();
  }
  function closeIpTool(){
    document.getElementById("ipOverlay").classList.remove("active");
  }
  function toggleIpTool(){
    const overlay = document.getElementById("ipOverlay");
    if(overlay.classList.contains("active")) closeIpTool();
    else openIpTool();
  }

  function renderIpTabs(){
    const tabs = document.getElementById("ipTabs");
    tabs.innerHTML = "";
    Object.entries(TABS).forEach(([key, label]) => {
      const btn = document.createElement("button");
      btn.className = "unit-tab" + (key === currentTab ? " active" : "");
      btn.textContent = label;
      btn.onclick = () => {
        currentTab = key;
        document.getElementById("ipValue").value = "";
        document.getElementById("ipValue").placeholder = key === "toV6" ? "例: 192.168.1.1" : "例: ::ffff:192.168.1.1";
        renderIpTabs();
        computeAndRenderIp();
      };
      tabs.appendChild(btn);
    });
  }

  // ---------- IPv4 → IPv6 ----------
  function parseIPv4(ip){
    const m = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/.exec((ip || "").trim());
    if(!m) return null;
    const parts = m.slice(1, 5).map(Number);
    if(parts.some(p => p < 0 || p > 255)) return null;
    return parts;
  }
  function hexGroup(a, b){
    return ((a << 8) | b).toString(16); // 先頭ゼロは付けない(RFC 5952の正規表記に合わせる)
  }
  function ipv4ToRepresentations(parts){
    const [a, b, c, d] = parts;
    const dotted = `${a}.${b}.${c}.${d}`;
    const hex1 = hexGroup(a, b);
    const hex2 = hexGroup(c, d);
    return [
      { label: "IPv4-mapped(RFC 4291)", value: `::ffff:${dotted}` },
      { label: "IPv4-mapped(16進表記)", value: `::ffff:${hex1}:${hex2}` },
      { label: "IPv4-compatible(廃止)", value: `::${dotted}` },
      { label: "6to4(RFC 3056)", value: `2002:${hex1}:${hex2}::` },
      { label: "NAT64(RFC 6052)", value: `64:ff9b::${dotted}` },
    ];
  }

  // ---------- IPv6 → IPv4 (既知のパターンから抽出) ----------
  function ipv6ToIPv4(input){
    const v = (input || "").trim().toLowerCase();
    let m;
    if((m = /^::ffff:(\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3})$/.exec(v))){
      return { label: "IPv4-mapped", value: m[1] };
    }
    if((m = /^::ffff:([0-9a-f]{1,4}):([0-9a-f]{1,4})$/.exec(v))){
      return { label: "IPv4-mapped(16進表記)", value: hexPairToDotted(m[1], m[2]) };
    }
    if((m = /^64:ff9b::(\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3})$/.exec(v))){
      return { label: "NAT64", value: m[1] };
    }
    if((m = /^::(\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3})$/.exec(v))){
      return { label: "IPv4-compatible(廃止)", value: m[1] };
    }
    if((m = /^2002:([0-9a-f]{1,4}):([0-9a-f]{1,4}):{1,2}$/.exec(v))){
      return { label: "6to4", value: hexPairToDotted(m[1], m[2]) };
    }
    return null;
  }
  function hexPairToDotted(h1, h2){
    const n1 = parseInt(h1, 16), n2 = parseInt(h2, 16);
    return [(n1 >> 8) & 0xff, n1 & 0xff, (n2 >> 8) & 0xff, n2 & 0xff].join(".");
  }

  function computeAndRenderIp(){
    const raw = document.getElementById("ipValue").value;
    const results = document.getElementById("ipResults");
    const hint = document.getElementById("ipHint");
    results.innerHTML = "";

    if(raw.trim() === ""){
      hint.textContent = currentTab === "toV6" ? "IPv4アドレスを入力してください(例: 192.168.1.1)" : "IPv6アドレスを入力してください";
      return;
    }

    if(currentTab === "toV6"){
      const parts = parseIPv4(raw);
      if(!parts){
        hint.textContent = "IPv4アドレスの形式が正しくありません";
        return;
      }
      hint.textContent = "\u00a0";
      ipv4ToRepresentations(parts).forEach(r => {
        const row = document.createElement("div");
        row.className = "unit-row";
        row.innerHTML = `<span class="unit-name">${r.label}</span><span class="unit-value">${r.value}</span>`;
        results.appendChild(row);
      });
    } else {
      const found = ipv6ToIPv4(raw);
      if(!found){
        hint.textContent = "既知のIPv4埋め込み形式(mapped/compatible/6to4/NAT64)を検出できませんでした";
        return;
      }
      hint.textContent = "\u00a0";
      const row = document.createElement("div");
      row.className = "unit-row origin";
      row.innerHTML = `<span class="unit-name">${found.label}として検出</span><span class="unit-value">${found.value}</span>`;
      results.appendChild(row);
    }
  }

  document.getElementById("ipValue").addEventListener("input", computeAndRenderIp);
  document.getElementById("ipClose").addEventListener("click", closeIpTool);
  document.getElementById("ipOverlay").addEventListener("click", (e) => {
    if(e.target.id === "ipOverlay") closeIpTool();
  });
  document.addEventListener("keydown", (e) => {
    if(!document.getElementById("ipOverlay").classList.contains("active")) return;
    if(e.key === "Escape") closeIpTool();
  });
})();