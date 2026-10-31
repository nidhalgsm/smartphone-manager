import { createClient } from "@supabase/supabase-js";
export const sb = createClient(import.meta.env.VITE_SUPABASE_URL, import.meta.env.VITE_SUPABASE_ANON_KEY);
const API = import.meta.env.VITE_API_URL;
// No forced logout: the token is refreshed automatically; several devices can stay signed in.
export async function api(path, opts = {}) {
  const call = async () => { const { data } = await sb.auth.getSession(); if (!data.session) throw new Error("Session ended");
    return fetch(API + path, { ...opts, headers: { "Content-Type": "application/json", Authorization: "Bearer " + data.session.access_token } }); };
  let r = await call();
  if (r.status === 401) { await sb.auth.refreshSession(); r = await call(); if (r.status === 401) { await sb.auth.signOut(); throw new Error("Session expired"); } }
  const j = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(typeof j.detail === "string" ? j.detail : Array.isArray(j.detail) ? j.detail.map(x => x.msg.replace("Value error, ", "")).join("; ") : "Request failed");
  return j;
}
export const fmt = n => n == null ? "—" : Number(n).toFixed(3) + " TND";
export const fdate = s => s ? new Date(s).toLocaleString("fr-FR", { timeZone: "Africa/Tunis" }) : "—";
export const SAJ = { autorise: "Autorisé", non_autorise: "Non autorisé", bloque: "Bloqué" };
export const RES = { autorise: "Autorisé", non_autorise: "Non autorisé", bloque: "Bloqué", enregistre_temporairement: "Enregistré temporairement", a_verifier: "À vérifier", erreur: "Erreur de vérification" };
export const CAT = { tunisien: "Tunisien", parallele: "Parallèle" };
export const COLORS = "Black,White,Silver,Gray,Space Gray,Graphite,Gold,Rose Gold,Champagne,Blue,Navy Blue,Sky Blue,Ice Blue,Midnight,Starlight,Green,Mint,Olive,Forest Green,Red,Crimson,Burgundy,Pink,Purple,Deep Purple,Lavender,Violet,Yellow,Orange,Coral,Bronze,Copper,Brown,Beige,Cream,Titanium,Natural Titanium,Desert Titanium,Blue Titanium,Teal,Turquoise,Cyan,Magenta,Lime,Aurora,Cosmic Orange,Phantom Black,Iceberg Blue".split(",");
const esc = s => String(s ?? "").replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
export function printReceipt(d) {
  const s = d.sale || {}, r = (k, v) => `<tr><th>${k}</th><td>${esc(v)}</td></tr>`, w = window.open("", "_blank");
  if (!w) return alert("Allow pop-ups to print");
  w.document.write(`<!doctype html><title>Receipt</title><link href="https://fonts.googleapis.com/css2?family=Montserrat:wght@400;600;900&display=swap" rel="stylesheet">
  <style>body{font:15px Gotham,Montserrat,Arial,sans-serif;margin:32px}table{border-collapse:collapse;width:100%}td,th{border:1px solid #999;padding:9px;text-align:left}th{width:35%}.l{border-bottom:1px solid #000;display:inline-block;width:200px}</style>
  <div style="text-align:center;margin-bottom:18px"><div style="font:900 72px Montserrat,Arial;letter-spacing:12px;line-height:1">NSI</div><div style="font:600 15px Montserrat,Arial;letter-spacing:3px;margin-top:8px">NIDHAL SERVICES INFORMATIQUES</div></div>
  <h2 style="text-align:center;margin:0 0 4px">Receipt / Warranty</h2><p style="text-align:center">Date: ${fdate(s.sale_date)}</p>
  <table>${r("Client", s.client_name)}${r("Model", d.model)}${r("Color", d.color)}${r("RAM / ROM", (d.ram || "—") + " / " + (d.rom || "—") + " GB")}${r("IMEI 1", d.imei1)}${r("IMEI 2", d.imei2)}${r("Serial Number", d.serial_number)}<tr><th>Price</th><td>&nbsp;</td></tr></table>
  <p style="margin-top:50px">Seller signature: <span class="l"></span> &nbsp; Customer signature: <span class="l"></span></p>`);
  w.document.close(); w.focus(); setTimeout(() => w.print(), 700);
}
