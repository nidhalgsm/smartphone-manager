const NAV = [["dash","📊","Dashboard"],["stock","📦","Stock"],["add","➕","Add phone"],["sell","💰","Sell"],["sold","🧾","Sold phones"],["tasjil","🛡️","Tasjil Sajalni"],["tools","🧰","Tools"],["home","📈","Summary"]];
const navTo = t => { tab = t; shell(); };
function shell() {
  app.innerHTML = `<aside id="side">${NAV.map(([k,e,l]) => `<button class="${k===tab?"on":""}" title="${l}" onclick="navTo('${k}')"><span>${e}</span><em>${l}</em></button>`).join("")}</aside><main id="v"></main>`;
  ({ dash:dashView, stock:() => listView("stock"), sold:() => listView("sold"), add:addView, sell:sellView, tasjil:tasjilView, tools:toolsView, home:homeView })[tab]();
}
const copyText = t => { try { navigator.clipboard.writeText(t); } catch {} };
const openSajalni = () => window.open("https://sajalni.tn", "_blank", "noopener");
function sellWith(d) { tab = "sell"; shell(); $("code").value = d.imei1 || d.serial_number || ""; findDevice(); }
const sellFrom = i => sellWith(rows.stock[i]);
const chips = () => `<div class="chips">${[["","All types"],["tunisien","Tunisien"],["parallele","Parallèle"]].map(([v,l]) =>
  `<button class="${(S.stock.cat||"")===v?"on":""}" onclick="S.stock.cat='${v}';S.stock.page=1;listView('stock')">${l}</button>`).join("")}<button onclick="exportCsv('stock')">⬇️ Export stock.csv</button></div>`;

const cell = (l, a, b) => `<div class="c"><span class="l">${l}</span>${a}<small>${b || ""}</small></div>`;
function card(d, kind, i) {
  const id = `<code>${esc(d.imei1 || "—")}</code>`, sn = `S/N ${esc(d.serial_number || "—")}${d.imei2 ? " · IMEI 2 " + esc(d.imei2) : ""}`;
  const typ = `<b class="t-${d.category}">${CAT[d.category]}</b>`, sup = esc(d.supplier_name || "—"), saj = badge(d.sajalni_status) || "<small>Not checked</small>";
  if (kind === "sold") { const s = d.sale || {}, m = s.sale_price != null && d.purchase_price != null ? fmt(s.sale_price - d.purchase_price) : "—";
    return `<div class="dev r ${d.category}">${cell("Model", `<b>${esc(d.model || "—")}</b>`, "Sold " + fdate(s.sale_date))}${cell("IMEI 1 / S/N", id, sn)}${cell("Type & supplier", typ, sup)}${cell("Sajalni", saj)}
    ${cell("Sale / margin", `<b class="pr">${fmt(s.sale_price)}</b>`, "Margin: " + m)}<div class="c acts"><button title="Receipt PDF" onclick="receipt(${i})">🧾</button>
    <button title="History" onclick="hist('${d.id}')">🕘</button><button title="Return / defective" onclick="statusForm('${d.id}')">↩️</button></div></div>`; }
  return `<div class="dev r ${d.category}">${cell("Model", `<b>${esc(d.model || "—")}</b>`, "Added " + fdate(d.created_at).split(" ")[0])}${cell("IMEI 1 / S/N", id, sn)}${cell("Type & supplier", typ, sup)}${cell("Sajalni", saj)}
  ${cell("Price", `<b class="pr">${fmt(d.expected_sale_price)}</b>`, "Buy: " + fmt(d.purchase_price))}<div class="c acts"><button class="sell" onclick="sellFrom(${i})">💰 Sell</button>
  <button title="Read" onclick="view(${i})">👁️</button><button title="Edit" onclick="editDev(${i})">✏️</button><button title="Delete" onclick="delDev(${i})">🗑️</button></div></div>`;
}

async function dashView() { $("v").innerHTML = skel();
  try { const [s, sl, ss] = await Promise.all([api("/dashboard/summary"), api("/sales?page_size=5"), sbc.auth.getSession()]);
    const name = (ss.data.session.user.email || "").split("@")[0], tot = s.tunisien + s.parallele || 1;
    $("v").innerHTML = `<div class="hero"><h2>👋 Welcome, ${esc(name)}</h2><p><small>Your shop at a glance, live from your database.</small></p>
    <div class="acts"><button class="sell" onclick="navTo('add')">➕ New phone</button><button onclick="navTo('sell')">💰 Scan to sell</button><button onclick="navTo('tasjil')">🛡️ Sajalni</button></div></div>
    ${s.blocked_in_stock ? `<div class="alert"><span>⛔ ${s.blocked_in_stock} phone(s) in stock are flagged Bloqué on Sajalni.</span><button onclick="navTo('tasjil')">Review</button></div>` : ""}
    <div class="stats"><div class="stat">📱 In stock<b>${s.in_stock}</b><small>${s.tunisien} Tunisien · ${s.parallele} Parallèle</small></div>
    <div class="stat">🛒 Sales<b>${s.sold}</b><small>completed</small></div>
    <div class="stat">💼 Stock value (TND)<b>${s.stock_value_tnd.toFixed(0)}</b><small>at purchase price</small></div>
    <div class="stat">📈 Revenue (TND)<b>${s.revenue_tnd.toFixed(0)}</b><small>Margin: ${s.gross_margin_tnd.toFixed(0)} TND</small></div></div>
    <h4>📊 Stock split</h4><div class="bar"><i style="width:${s.tunisien / tot * 100}%"></i><u></u></div><small>🟢 Tunisien ${s.tunisien} · 🟠 Parallèle ${s.parallele}</small>
    <h4>🧾 Latest sales</h4>${sl.items.map(d => { const x = d.sale || {}; return `<div class="dev ${d.category}"><b>${esc(d.model || "—")}</b><span class="pr" style="float:right">${fmt(x.sale_price)}</span><br><small>IMEI ${esc(d.imei1 || "—")} · ${fdate(x.sale_date)}</small></div>`; }).join("") || "<small>No sales yet.</small>"}`;
    countUp(); } catch (e) { msg($("v"), e.message); } }

// ---------- Tasjil Sajalni ----------
let TJ = { f:"all", q:"", items:[], last:{} };
const tjState = d => (TJ.last[d.id] ? TJ.last[d.id].result_status : d.sajalni_status) || "a_verifier";
const grp = s => ["bloque","non_autorise"].includes(s) ? "bloque" : s === "autorise" ? "autorise" : s === "enregistre_temporairement" ? "temp" : "a_verifier";
async function tasjilView() { $("v").innerHTML = skel();
  try { const [r, l] = await Promise.all([api("/devices?status=in_stock&category=parallele&page_size=50"), api("/tasjil/last")]); TJ.items = r.items; TJ.last = l; tjRender(); }
  catch (e) { msg($("v"), e.message); } }
function tjRender() {
  const cnt = g => TJ.items.filter(d => grp(tjState(d)) === g).length;
  const list = TJ.items.map((d, i) => [d, i]).filter(([d]) => (TJ.f === "all" || grp(tjState(d)) === TJ.f) && (!TJ.q || [d.model, d.imei1, d.serial_number].join(" ").toLowerCase().includes(TJ.q.toLowerCase())));
  $("v").innerHTML = `<div class="hero"><h2>🛡️ Tasjil Sajalni (سجلني)</h2><p><small>Guided check: the IMEI is copied, sajalni.tn opens in a new window, then you record the result here. Nothing is marked verified without your result.</small></p>
  <div class="acts"><button class="go sell" style="background:var(--pine)" onclick="openSajalni()">↗️ Open sajalni.tn</button></div></div>
  <div class="stats"><div class="stat">🔎 To check<b>${cnt("a_verifier")}</b></div><div class="stat">✅ Authorised<b>${cnt("autorise")}</b></div><div class="stat">⏳ Temporarily registered<b>${cnt("temp")}</b></div><div class="stat">⛔ Blocked / not authorised<b>${cnt("bloque")}</b></div></div>
  <input id="tq" type="search" placeholder="Search model or IMEI" value="${esc(TJ.q)}" style="margin-top:12px">
  <div class="chips">${[["all","All"],["a_verifier","To check"],["autorise","Authorised"],["bloque","Blocked"]].map(([k,l]) => `<button class="${TJ.f===k?"on":""}" onclick="TJ.f='${k}';tjRender()">${l}</button>`).join("")}</div>
  <div class="tjgrid">${list.map(([d, i]) => { const l = TJ.last[d.id], s = tjState(d);
    return `<div class="dev tj parallele"><div class="top"><div><b>${esc(d.model || "—")}</b><br><small>Supplier: ${esc(d.supplier_name || "—")} • ${fmt(d.expected_sale_price)}</small></div><span class="b b-${s}">${TS[s]}</span></div>
    <div class="imei"><div><small>IMEI 1</small><code>${esc(d.imei1 || d.serial_number || "—")}</code></div><button onclick="copyText('${esc(d.imei1 || d.serial_number || "")}');toast('Copied',true)">📋 Copy</button></div>
    <small>${l ? "Last check: " + fdate(l.checked_at) : "No official Sajalni check recorded yet."}</small>
    <div class="acts"><button onclick="hist('${d.id}')">🕘 History (${l ? l.n : 0})</button><button class="sell" onclick="sellWith(TJ.items[${i}])">💰 Sell</button><button class="go" onclick="verifySajalni(${i})">↗️ Check on Sajalni</button></div></div>`; }).join("") || "<small>No phones match.</small>"}</div>`;
  $("tq").oninput = e => { TJ.q = e.target.value; clearTimeout(window.tt); window.tt = setTimeout(tjRender, 300); };
}
function verifySajalni(i) { const d = TJ.items[i]; openSajalni(); copyText(d.imei1 || d.serial_number || "");
  toast("IMEI copied. Paste it on Sajalni, then record the result.", true); setTimeout(() => tasjilForm(d.id), 400); }

tab = "dash"; if (document.querySelector("nav,#side")) shell();
