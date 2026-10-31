import { createContext, useContext, useEffect, useRef, useState } from "react";
import { sb, api, fmt, fdate, SAJ, RES, CAT, COLORS, printReceipt } from "./lib.js";

const FR = { "Dashboard": "Tableau de bord", "Stock": "Stock", "Add phone": "Ajouter un téléphone", "Sell": "Vendre", "Sold phones": "Téléphones vendus", "Tasjil Sajalni": "Tasjil Sajalni",
  "Sign in": "Connexion", "Sign out": "Déconnexion", "Password": "Mot de passe", "Wrong email or password": "E-mail ou mot de passe incorrect", "Stock, sales and Sajalni checks in one place.": "Stock, ventes et contrôles Sajalni au même endroit.",
  "Search": "Rechercher", "Save": "Enregistrer", "Saved": "Enregistré", "Cancel": "Annuler", "Edit phone": "Modifier le téléphone", "Model": "Modèle", "Supplier": "Fournisseur", "Notes": "Notes", "From": "Du", "To": "Au", "All types": "Tous types",
  "Welcome": "Bienvenue", "Total stock value (purchase price)": "Valeur du stock (prix d'achat)", "Revenue": "Chiffre d'affaires", "Margin": "Marge", "Sold": "Vendus", "In stock": "En stock", "Stock split": "Répartition du stock",
  "Latest sales": "Dernières ventes", "Scan to sell": "Scanner pour vendre", "Review": "Examiner", "phones blocked in stock": "téléphones bloqués en stock", "Find phone": "Chercher le téléphone", "Confirm sale": "Confirmer la vente",
  "Client name": "Nom du client", "Sale price TND": "Prix de vente TND", "Scan or type IMEI / Serial Number": "Scanner ou saisir IMEI / N° de série", "Page": "Page", "Buy": "Achat", "Type & supplier": "Type et fournisseur",
  "Color (pick or type)": "Couleur (choisir ou saisir)", "Purchase price TND": "Prix d'achat TND", "Expected sale TND": "Prix de vente prévu TND", "Sajalni status: not checked": "Statut Sajalni : non vérifié", "Sale recorded": "Vente enregistrée",
  "Open sajalni.tn": "Ouvrir sajalni.tn", "Check on Sajalni": "Vérifier sur Sajalni", "Copy": "Copier", "All": "Tous", "To check": "À vérifier", "Authorised": "Autorisés", "Blocked": "Bloqués", "Temporarily registered": "Enregistrés temp.",
  "Record result": "Enregistrer le résultat", "Source": "Source", "Reference / message (optional)": "Référence / message (facultatif)", "Receipt": "Reçu", "Close": "Fermer", "Delete": "Supprimer", "Sale": "Vente", "Date": "Date", "Phone": "Téléphone", "IMEI / S/N": "IMEI / N° de série", "Actions": "Actions" };
const Ctx = createContext(); const useC = () => useContext(Ctx);
const specs = x => [x.ram && x.ram + " GB RAM", x.rom && x.rom + " GB", x.color].filter(Boolean).join(" · ") || "—";
const Badge = ({ s }) => s ? <span className={"b b-" + s}>{{ autorise: "✅", non_autorise: "⚠️", bloque: "⛔", enregistre_temporairement: "⏳", a_verifier: "🔎", erreur: "❗" }[s]} {RES[s]}</span> : <small>—</small>;
const Modal = ({ children, onClose }) => <div className="ov" onClick={onClose}><div className="box" onClick={e => e.stopPropagation()}>{children}</div></div>;
function useCount(n) { const [v, setV] = useState(0);
  useEffect(() => { let r, t0 = performance.now(); const f = t => { const p = Math.min(1, (t - t0) / 900); setV(Math.round(n * (1 - (1 - p) ** 3))); if (p < 1) r = requestAnimationFrame(f); }; r = requestAnimationFrame(f); return () => cancelAnimationFrame(r); }, [n]); return v; }

function Scan({ onCode }) { // camera barcode scan (Chrome on Android over HTTPS); USB scanners just type into the field
  const [on, setOn] = useState(false), v = useRef();
  useEffect(() => { if (!on) return; let stop = false, st;
    (async () => { try { if (!("BarcodeDetector" in window)) throw 0; const det = new BarcodeDetector();
      st = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } }); v.current.srcObject = st; await v.current.play();
      while (!stop) { const r = await det.detect(v.current).catch(() => []); if (r.length) { navigator.vibrate?.(80); onCode(r[0].rawValue.trim()); setOn(false); return; } await new Promise(r => setTimeout(r, 200)); }
    } catch { alert("Camera scan needs Chrome on Android (HTTPS). Use a USB scanner or type the code."); setOn(false); } })();
    return () => { stop = true; st && st.getTracks().forEach(x => x.stop()); }; }, [on]);
  return <><button type="button" className="ico" title="Scan" onClick={() => setOn(true)}>📷</button>
    {on && <div className="ov"><video ref={v} playsInline muted /><button className="pill w" onClick={() => setOn(false)}>✕</button></div>}</>;
}

function Login() {
  const { t } = useC(); const [em, setEm] = useState(""), [pw, setPw] = useState(""), [err, setErr] = useState(""), [busy, setBusy] = useState(false);
  const go = async e => { e.preventDefault(); setBusy(true); setErr(""); const { error } = await sb.auth.signInWithPassword({ email: em, password: pw }); setBusy(false);
    if (error) setErr(/fetch|network/i.test(error.message) ? "Cannot reach the server" : "Wrong email or password"); };
  return <div className="login"><Prefs />
    <form className="card lcard" onSubmit={go}><h1>📱 SmartStock <span>TN</span></h1><p className="mut">{t("Stock, sales and Sajalni checks in one place.")}</p>
      <input type="email" placeholder="Email" autoComplete="username" value={em} onChange={e => setEm(e.target.value)} required />
      <input type="password" placeholder={t("Password")} autoComplete="current-password" value={pw} onChange={e => setPw(e.target.value)} required />
      <button className="pill" disabled={busy} style={{ width: "100%", marginTop: 8 }}>{t("Sign in")}</button>{err && <div className="msg">{t(err)}</div>}</form>
    <div className="stage"><div className="float"><div className="phone"><div className="f fr"><div className="scr"><div><b>NSI</b><br /><small>SmartStock</small></div></div></div>
      <div className="f bk"><i /></div><div className="f sd sl" /><div className="f sd sr" /></div></div></div></div>;
}
function Prefs() { const { lang, setLang, theme, setTheme } = useC();
  return <div className="prefs"><button className="ico" onClick={() => setLang(lang === "fr" ? "en" : "fr")}>{lang === "fr" ? "EN" : "FR"}</button>
    <button className="ico" onClick={() => setTheme(theme === "dark" ? "light" : "dark")}>◐</button></div>; }

const NAV = [["dash", "📊", "Dashboard"], ["stock", "📦", "Stock"], ["add", "➕", "Add phone"], ["sell", "💰", "Sell"], ["sold", "🧾", "Sold phones"], ["tasjil", "🛡️", "Tasjil Sajalni"]];
function Shell({ session }) {
  const { t } = useC(); const [page, setPage] = useState("dash"), [arg, setArg] = useState(null), [q, setQ] = useState("");
  const go = (p, a = null) => { setPage(p); setArg(a); };
  const view = { dash: <Dashboard go={go} session={session} />, stock: <List key={"s" + arg} kind="stock" go={go} q0={arg} />, sold: <List kind="sold" go={go} />,
    add: <div className="card" style={{ maxWidth: 760 }}><PhoneForm onSaved={() => go("stock")} /></div>, sell: <Sell key={arg} pre={arg} />, tasjil: <Tasjil go={go} /> }[page];
  return <div className="app"><aside className="rail"><div className="logo">📱 SmartStock</div>
    {NAV.map(([k, e, l]) => <button key={k} className={k === page ? "on" : ""} onClick={() => go(k)}><span>{e}</span><em>{t(l)}</em></button>)}</aside>
    <main><div className="top"><h1>{t(NAV.find(n => n[0] === page)[2])}</h1>
      <input placeholder={t("Search") + "…"} value={q} onChange={e => setQ(e.target.value)} onKeyDown={e => e.key === "Enter" && q && go("stock", q)} />
      <Prefs /><button className="pill g" onClick={() => sb.auth.signOut()}>{t("Sign out")}</button></div>{view}</main></div>;
}

function Dashboard({ go, session }) {
  const { t, notify } = useC(); const [s, setS] = useState(null), [sl, setSl] = useState([]);
  useEffect(() => { Promise.all([api("/dashboard/summary"), api("/sales?page_size=5")]).then(([a, b]) => { setS(a); setSl(b.items); }).catch(e => notify(e.message)); }, []);
  const v = useCount(s?.stock_value_tnd || 0), rev = useCount(s?.revenue_tnd || 0), ins = useCount(s?.in_stock || 0);
  if (!s) return <div className="bento">{[1, 2, 3].map(i => <div key={i} className="card sk" />)}</div>;
  const name = (session.user.email || "").split("@")[0], tot = (s.tunisien + s.parallele) || 1, L = n => Math.round(n).toLocaleString("fr-FR");
  return <div className="bento">
    <div className="card span2 hero"><small className="mut">👋 {t("Welcome")}, {name}</small><div className="big">{L(v)} <small>TND</small></div><small className="mut">{t("Total stock value (purchase price)")}</small>
      <div className="mini"><div><small>{t("Revenue")}</small><b>{L(rev)}</b></div><div><small>{t("Margin")}</small><b className="up">+{L(s.gross_margin_tnd)}</b></div><div><small>{t("Sold")}</small><b>{s.sold}</b></div></div>
      <div className="acts"><button className="pill" onClick={() => go("add")}>➕ {t("Add phone")}</button><button className="pill w" onClick={() => go("sell")}>💰 {t("Scan to sell")}</button></div><div className="orb" /></div>
    <div className="card"><h3>{t("Stock split")}</h3><div className="ring" style={{ "--p": Math.round(s.tunisien / tot * 100) + "%" }}><div><b>{ins}</b><small>{t("In stock")}</small></div></div>
      <div className="leg"><span><i className="d1" />Tunisien {s.tunisien}</span><span><i className="d2" />Parallèle {s.parallele}</span></div></div>
    <div className="card span2"><h3>🧾 {t("Latest sales")}</h3><div className="scroll"><table className="tbl"><tbody>{sl.map((d, i) => <tr key={d.id} style={{ animationDelay: i * 60 + "ms" }}>
      <td><b>{d.model || "—"}</b><br /><small>{d.imei1}</small></td><td>{d.sale?.client_name || "—"}</td><td className="pr"><b>{fmt(d.sale?.sale_price)}</b></td></tr>)}</tbody></table></div></div>
    <div className="card"><h3>🛡️ Sajalni</h3><div className="big" style={{ color: s.blocked_in_stock ? "var(--bad)" : "var(--ok)" }}>{s.blocked_in_stock}</div><small className="mut">{t("phones blocked in stock")}</small><br />
      <button className="pill g" style={{ marginTop: 10 }} onClick={() => go("tasjil")}>{t("Review")}</button></div></div>;
}

function List({ kind, go, q0 = "" }) {
  const { t, notify } = useC(), sold = kind === "sold", [f, setF] = useState({ page: 1, q: q0 || "", cat: "", from: "", to: "" }), [d, setD] = useState(null), [m, setM] = useState(null), [n, setN] = useState(0);
  const set = o => setF(x => ({ ...x, page: 1, ...o }));
  useEffect(() => { setD(null); const id = setTimeout(async () => { try {
    const p = new URLSearchParams({ page: f.page, page_size: 10 }); if (!sold) p.set("status", "in_stock"); if (f.q) p.set("q", f.q); if (f.cat && !sold) p.set("category", f.cat); if (f.from) p.set("date_from", f.from); if (f.to) p.set("date_to", f.to);
    const r = await api((sold ? "/sales?" : "/devices?") + p), pages = Math.max(1, Math.ceil(r.total / 10)); if (f.page > pages) return setF(x => ({ ...x, page: pages })); setD(r); } catch (e) { notify(e.message); } }, f.q ? 250 : 0);
    return () => clearTimeout(id); }, [f, n]);
  const del = async x => { if (!confirm(`${t("Delete")} "${x.model || x.imei1}"?`)) return; try { await api("/devices/" + x.id, { method: "DELETE" }); setN(n + 1); } catch (e) { notify(e.message); } };
  const pages = d ? Math.max(1, Math.ceil(d.total / 10)) : 1;
  const read = x => [["Color", x.color], ["RAM / ROM", (x.ram || "—") + " / " + (x.rom || "—") + " GB"], ["IMEI 2", x.imei2], ["S/N", x.serial_number], ["Supplier", x.supplier_name], ["Purchase", fmt(x.purchase_price)], ["Expected", fmt(x.expected_sale_price)], ["Sajalni", SAJ[x.sajalni_status]], ["Notes", x.notes]];
  return <div className="card"><div className="bar"><input className="grow" placeholder={t("Search") + " IMEI, S/N, model…"} value={f.q} onChange={e => set({ q: e.target.value })} />
    {!sold && ["", "tunisien", "parallele"].map(c => <button key={c} className={"pill " + (f.cat === c ? "on" : "g")} onClick={() => set({ cat: c })}>{c ? CAT[c] : t("All types")}</button>)}
    <input type="date" title={t("From")} value={f.from} onChange={e => set({ from: e.target.value })} /><input type="date" title={t("To")} value={f.to} onChange={e => set({ to: e.target.value })} />
    {!sold && <button className="pill" onClick={() => go("add")}>➕ {t("Add phone")}</button>}</div>
    <div className="scroll"><table className="tbl"><thead><tr><th>{t("Phone")}</th><th>{t("IMEI / S/N")}</th><th>{t("Type & supplier")}</th><th>Sajalni</th><th>{sold ? t("Sale") : "Prix"}</th><th /></tr></thead>
      <tbody>{!d ? <tr><td colSpan="6">…</td></tr> : d.items.map((x, i) => { const s = x.sale || {}; return <tr key={x.id} style={{ animationDelay: i * 40 + "ms" }}>
        <td><b>{x.model || "—"}</b><br /><small>{sold ? fdate(s.sale_date) + (s.client_name ? " · 👤 " + s.client_name : "") : specs(x)}</small></td>
        <td><code>{x.imei1 || "—"}</code><br /><small>S/N {x.serial_number || "—"}</small></td>
        <td><b className={"t-" + x.category}>{CAT[x.category]}</b><br /><small>{x.supplier_name || "—"}</small></td><td><Badge s={x.sajalni_status} /></td>
        <td>{sold ? <><b className="pr">{fmt(s.sale_price)}</b><br /><small>{t("Margin")}: {s.sale_price != null && x.purchase_price != null ? fmt(s.sale_price - x.purchase_price) : "—"}</small></>
          : <><b className="pr">{fmt(x.expected_sale_price)}</b><br /><small>{t("Buy")}: {fmt(x.purchase_price)}</small></>}</td>
        <td><div className="acts">{sold ? <button className="pill w" onClick={() => printReceipt(x)}>🧾 {t("Receipt")}</button> : <>
          <button className="pill w" onClick={() => go("sell", x.imei1 || x.serial_number)}>💰</button><button className="ico" onClick={() => setM({ t: "read", x })}>👁️</button>
          <button className="ico" onClick={() => setM({ t: "edit", x })}>✏️</button><button className="ico" onClick={() => del(x)}>🗑️</button></>}</div></td></tr>; })}</tbody></table></div>
    {d && !d.items.length && <p className="mut">—</p>}
    <div className="pager"><button className="pill g" disabled={f.page <= 1} onClick={() => setF({ ...f, page: f.page - 1 })}>←</button><span>{t("Page")} {f.page} / {pages} · {d?.total ?? 0}</span>
      <button className="pill g" disabled={f.page >= pages} onClick={() => setF({ ...f, page: f.page + 1 })}>→</button></div>
    {m?.t === "read" && <Modal onClose={() => setM(null)}><h3>{m.x.model}</h3><dl>{read(m.x).map(([k, v]) => <><dt key={k}>{k}</dt><dd>{v || "—"}</dd></>)}</dl><button className="pill g" onClick={() => setM(null)}>{t("Close")}</button></Modal>}
    {m?.t === "edit" && <Modal onClose={() => setM(null)}><h3>{t("Edit phone")}</h3><PhoneForm init={m.x} onSaved={() => { setM(null); setN(n + 1); }} /></Modal>}</div>;
}

function PhoneForm({ init = {}, onSaved }) {
  const { t, notify } = useC(); const [f, setF] = useState({ category: "tunisien", imei1: "", imei2: "", serial_number: "", model: "", supplier_name: "", color: "", ram: "", rom: "", purchase_price: "", expected_sale_price: "", sajalni_status: "", notes: "",
    ...Object.fromEntries(Object.entries(init).filter(([, v]) => v != null)) });
  const b = k => ({ value: f[k] ?? "", onChange: e => setF(x => ({ ...x, [k]: e.target.value })) });
  const fld = (k, ph, scan) => <div className="row"><input placeholder={ph} inputMode={/imei/.test(k) ? "numeric" : undefined} {...b(k)} />{scan && <Scan onCode={c => setF(x => ({ ...x, [k]: c }))} />}</div>;
  const num = k => f[k] === "" || f[k] == null ? null : +f[k];
  const save = async e => { e.preventDefault(); const body = { ...f, ram: num("ram"), rom: num("rom"), purchase_price: num("purchase_price"), expected_sale_price: num("expected_sale_price"), sajalni_status: f.sajalni_status || null };
    try { await api(init.id ? "/devices/" + init.id : "/devices", { method: init.id ? "PATCH" : "POST", body: JSON.stringify(body) }); notify(t("Saved"), true); onSaved(); } catch (er) { notify(er.message); } };
  return <form onSubmit={save} className="grid2">
    <select className="full" {...b("category")}><option value="tunisien">Smartphone Tunisien</option><option value="parallele">Smartphone Parallèle</option></select>
    {fld("imei1", "IMEI 1 (15)", 1)}{fld("imei2", "IMEI 2", 1)}<div className="full">{fld("serial_number", "Serial Number", 1)}</div>{fld("model", t("Model"))}{fld("supplier_name", t("Supplier"))}
    <div className="row"><div><input list="colors" placeholder={t("Color (pick or type)")} {...b("color")} /><datalist id="colors">{COLORS.map(c => <option key={c} value={c} />)}</datalist></div>
      <input type="color" title="Pick any color" onChange={e => setF(x => ({ ...x, color: e.target.value }))} /></div>
    <div className="row"><select {...b("ram")}><option value="">RAM</option>{[2, 3, 4, 6, 8, 12, 16].map(x => <option key={x} value={x}>{x} GB</option>)}</select>
      <select {...b("rom")}><option value="">ROM</option>{[32, 64, 128, 256, 512].map(x => <option key={x} value={x}>{x} GB</option>)}</select></div>
    <input type="number" step="0.001" placeholder={t("Purchase price TND")} {...b("purchase_price")} /><input type="number" step="0.001" placeholder={t("Expected sale TND")} {...b("expected_sale_price")} />
    <select className="full" {...b("sajalni_status")}><option value="">{t("Sajalni status: not checked")}</option>{Object.entries(SAJ).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select>
    <textarea className="full" placeholder={t("Notes")} {...b("notes")} /><button className="pill full">{t("Save")}</button></form>;
}

function Sell({ pre }) {
  const { t, notify } = useC(); const [code, setCode] = useState(pre || ""), [dev, setDev] = useState(null), [price, setPrice] = useState(""), [client, setClient] = useState(""), [ok, setOk] = useState(false);
  const find = async c => { try { const x = await api("/devices/lookup/" + encodeURIComponent((c ?? code).trim())); if (x.status !== "in_stock") throw new Error("This phone is already sold"); setDev(x); setPrice(x.expected_sale_price ?? ""); } catch (e) { setDev(null); notify(e.message); } };
  useEffect(() => { if (pre) find(pre); }, []);
  const sell = async () => { if (["non_autorise", "bloque"].includes(dev.sajalni_status) && !confirm(`Sajalni: ${SAJ[dev.sajalni_status]}. Sell anyway?`)) return; if (!price && !confirm("No price entered. Sell anyway?")) return;
    try { await api("/sales", { method: "POST", body: JSON.stringify({ device_id: dev.id, sale_price: price ? +price : null, client_name: client }) }); notify(t("Sale recorded"), true); setOk(true); setDev(null); setCode(""); setClient(""); setTimeout(() => setOk(false), 1200); } catch (e) { notify(e.message); } };
  return <div className="card" style={{ maxWidth: 640 }}><div className="row"><input autoFocus value={code} placeholder={t("Scan or type IMEI / Serial Number")} onChange={e => setCode(e.target.value)} onKeyDown={e => e.key === "Enter" && find()} />
    <Scan onCode={c => { setCode(c); find(c); }} /></div><button className="pill" style={{ marginTop: 8 }} onClick={() => find()}>{t("Find phone")}</button>
    {dev && <div className="found"><b>{dev.model || "—"}</b> <Badge s={dev.sajalni_status} /><br /><small>{specs(dev)} · IMEI {dev.imei1}</small>
      <input type="number" step="0.001" placeholder={t("Sale price TND")} value={price} onChange={e => setPrice(e.target.value)} /><input placeholder={t("Client name")} value={client} onChange={e => setClient(e.target.value)} />
      <button className="pill" onClick={sell}>{t("Confirm sale")}</button></div>}{ok && <div className="check">✓</div>}</div>;
}

function Tasjil() {
  const { t, notify } = useC(); const [d, setD] = useState(null), [last, setLast] = useState({}), [fl, setFl] = useState("all"), [m, setM] = useState(null), [n, setN] = useState(0), [src, setSrc] = useState("Official site (manual)"), [res, setRes] = useState("autorise"), [msg, setMsg] = useState("");
  useEffect(() => { Promise.all([api("/devices?status=in_stock&category=parallele&page_size=50"), api("/tasjil/last")]).then(([r, l]) => { setD(r.items); setLast(l); }).catch(e => notify(e.message)); }, [n]);
  const st = x => (last[x.id]?.result_status || x.sajalni_status) || "a_verifier";
  const g = s => ["bloque", "non_autorise"].includes(s) ? "bloque" : s === "autorise" ? "autorise" : s === "enregistre_temporairement" ? "temp" : "a_verifier";
  const check = x => { window.open("https://sajalni.tn", "_blank", "noopener"); navigator.clipboard?.writeText(x.imei1 || x.serial_number || ""); notify("IMEI copied. Paste it on Sajalni, then record the result.", true); setTimeout(() => setM(x), 400); };
  const save = async () => { try { await api(`/devices/${m.id}/tasjil-checks`, { method: "POST", body: JSON.stringify({ result_status: res, source: src, message: msg }) }); setM(null); setMsg(""); setN(n + 1); notify(t("Saved"), true); } catch (e) { notify(e.message); } };
  if (!d) return <div className="bento"><div className="card sk" /></div>;
  const cnt = k => d.filter(x => g(st(x)) === k).length;
  return <><div className="bento" style={{ marginBottom: 14 }}>{[["a_verifier", "🔎 " + t("To check")], ["autorise", "✅ " + t("Authorised")], ["temp", "⏳ " + t("Temporarily registered")], ["bloque", "⛔ " + t("Blocked")]].map(([k, l]) =>
      <div key={k} className="card"><small className="mut">{l}</small><div className="big">{cnt(k)}</div></div>)}</div>
    <div className="bar"><button className="pill" onClick={() => window.open("https://sajalni.tn", "_blank", "noopener")}>↗️ {t("Open sajalni.tn")}</button>
      {[["all", t("All")], ["a_verifier", t("To check")], ["autorise", t("Authorised")], ["bloque", t("Blocked")]].map(([k, l]) => <button key={k} className={"pill " + (fl === k ? "on" : "g")} onClick={() => setFl(k)}>{l}</button>)}</div>
    <div className="tj">{d.filter(x => fl === "all" || g(st(x)) === fl).map(x => <div className="card" key={x.id}><div className="row"><b>{x.model || "—"}</b><Badge s={st(x)} /></div>
      <small>{x.supplier_name || "—"} · {fmt(x.expected_sale_price)}</small><div className="imei"><code>{x.imei1 || x.serial_number}</code><button className="ico" onClick={() => navigator.clipboard?.writeText(x.imei1 || "")}>📋</button></div>
      <small>{last[x.id] ? fdate(last[x.id].checked_at) : "—"}</small><div className="acts" style={{ marginTop: 10 }}><button className="pill" onClick={() => check(x)}>↗️ {t("Check on Sajalni")}</button></div></div>)}</div>
    {m && <Modal onClose={() => setM(null)}><h3>{m.model}</h3><select value={res} onChange={e => setRes(e.target.value)}>{Object.entries(RES).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select>
      <input value={src} onChange={e => setSrc(e.target.value)} placeholder={t("Source")} /><input value={msg} onChange={e => setMsg(e.target.value)} placeholder={t("Reference / message (optional)")} /><button className="pill" onClick={save}>{t("Record result")}</button></Modal>}</>;
}

export default function App() {
  const [session, setSession] = useState(undefined), [lang, setLang] = useState(localStorage.getItem("lang") || "en"), [theme, setTheme] = useState(localStorage.getItem("theme") || "dark"), [toast, setToast] = useState(null);
  useEffect(() => { sb.auth.getSession().then(({ data }) => setSession(data.session)); const { data: { subscription } } = sb.auth.onAuthStateChange((_, s) => setSession(s)); return () => subscription.unsubscribe(); }, []);
  useEffect(() => { document.documentElement.dataset.theme = theme; localStorage.setItem("theme", theme); }, [theme]);
  useEffect(() => { document.documentElement.lang = lang; localStorage.setItem("lang", lang); }, [lang]);
  const notify = (m, ok) => { setToast({ m, ok }); setTimeout(() => setToast(null), 3200); };
  if (session === undefined) return null;
  return <Ctx.Provider value={{ t: s => lang === "fr" ? FR[s] || s : s, lang, setLang, theme, setTheme, notify }}>{session ? <Shell session={session} /> : <Login />}{toast && <div className={"toast" + (toast.ok ? " ok" : "")}>{toast.m}</div>}</Ctx.Provider>;
}
