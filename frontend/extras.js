(() => { // dark mode toggle + staggered list animation
  const t = localStorage.getItem("theme"); if (t) document.documentElement.dataset.theme = t;
  const b = document.createElement("button"); b.textContent = "◐"; b.title = "Dark / light";
  b.style.cssText = "width:auto;margin:0 8px 0 auto;padding:6px 12px;background:#fff3;color:#fff";
  b.onclick = () => { const cur = document.documentElement.dataset.theme || (matchMedia("(prefers-color-scheme:dark)").matches ? "dark" : "light"),
    n = cur === "dark" ? "light" : "dark"; document.documentElement.dataset.theme = n; try { localStorage.setItem("theme", n); } catch {} };
  document.querySelector("header").insertBefore(b, $("out"));
  let css = ""; for (let i = 1; i <= 10; i++) css += `#list .dev:nth-child(${i}){animation-delay:${(i-1)*.05}s}`;
  document.head.insertAdjacentHTML("beforeend", `<style>${css}</style>`);
})();
function toast(t, ok) { let c = $("toasts"); if (!c) { c = document.createElement("div"); c.id = "toasts"; document.body.appendChild(c); }
  const e = document.createElement("div"); e.className = "toast" + (ok ? " ok" : ""); e.textContent = t; c.appendChild(e); setTimeout(() => e.remove(), 3500); }
const skel = () => '<div class="sk"></div>'.repeat(4);
function beep() { try { navigator.vibrate && navigator.vibrate(80); const a = new (window.AudioContext || window.webkitAudioContext)(), o = a.createOscillator();
  o.frequency.value = 880; o.connect(a.destination); o.start(); setTimeout(() => { o.stop(); a.close(); }, 120); } catch {} }
function celebrate() { beep(); const e = document.createElement("div"); e.id = "ok"; e.innerHTML = "<i>✓</i>"; document.body.appendChild(e); setTimeout(() => e.remove(), 1000); }
function countUp() { document.querySelectorAll(".stat b").forEach(b => { const n = Number(b.textContent), t0 = performance.now();
  const f = t => { const p = Math.min(1, (t - t0) / 800); b.textContent = Math.round(n * (1 - Math.pow(1 - p, 3))); if (p < 1) requestAnimationFrame(f); }; requestAnimationFrame(f); }); }

const TS = {autorise:"Autorisé", non_autorise:"Non autorisé", bloque:"Bloqué", enregistre_temporairement:"Enregistré temporairement", a_verifier:"À vérifier", erreur:"Erreur de vérification"};
function view(i) { const d = rows.stock[i]; modal(head(d) + details(d) + `<div class="acts" style="flex-wrap:wrap"><button onclick="tasjilForm('${d.id}')">Sajalni check</button>
  <button onclick="hist('${d.id}')">History</button><button class="del" onclick="statusForm('${d.id}')">Defective / Repair</button></div>`); }
async function tasjilForm(id) { try { const c = await api(`/devices/${id}/tasjil-checks`);
  modal(`<h3>Sajalni check</h3><select id="ts">${Object.entries(TS).map(([k,v]) => `<option value="${k}">${v}</option>`).join("")}</select>
  <input id="tsrc" value="Official site (manual)" placeholder="Source"><input id="tmsg" placeholder="Reference / message (optional)">
  <button onclick="saveTasjil('${id}')">Save result</button><div id="m"></div><h4>Previous checks</h4>
  ${c.map(x => `<p><small>${fdate(x.checked_at)}</small> ${esc(TS[x.result_status])} <small>· ${esc(x.source || "")} ${esc(x.message || "")}</small></p>`).join("") || "<small>None yet</small>"}`);
} catch (e) { toast(e.message); } }
async function saveTasjil(id) { try { await api(`/devices/${id}/tasjil-checks`, { method:"POST", body:JSON.stringify({ result_status:$("ts").value, source:$("tsrc").value, message:$("tmsg").value }) });
  closeModal(); toast("Result saved", true); shell(); } catch (e) { msg($("m"), e.message); } }
async function hist(id) { try { const h = await api(`/devices/${id}/history`);
  modal(`<h3>History</h3><div class="tl">${h.map(x => `<p><small>${fdate(x.at)}</small><br>${esc(x.text)}</p>`).join("")}</div>`); } catch (e) { toast(e.message); } }
function statusForm(id) { modal(`<h3>Change status</h3><select id="st"><option value="in_stock">Back to stock</option><option value="repair">Repair list</option><option value="defective">Defective</option></select>
  <input id="rs" placeholder="Reason (required)"><button onclick="saveStatus('${id}')">Save</button><div id="m"></div>`); }
async function saveStatus(id) { try { await api(`/devices/${id}/status`, { method:"POST", body:JSON.stringify({ status:$("st").value, reason:$("rs").value }) });
  closeModal(); toast("Status updated", true); shell(); } catch (e) { msg($("m"), e.message); } }

function printWin(title, body) { const w = window.open("", "_blank"); if (!w) return toast("Allow pop-ups to print");
  w.document.write(`<!doctype html><title>${title}</title><style>body{font:15px system-ui;margin:32px}h1{margin:0 0 6px}table{border-collapse:collapse;width:100%}td,th{border:1px solid #999;padding:8px;text-align:left;font-size:14px}.s td,.s th{font-size:9px;padding:3px}.l{border-bottom:1px solid #000;display:inline-block;width:200px}</style>${body}`);
  w.document.close(); w.focus(); setTimeout(() => w.print(), 300); }
function receipt(i) { const d = rows.sold[i], s = d.sale || {};
  printWin("Receipt", `<h1>Receipt / Warranty</h1><p>Date: ${fdate(s.sale_date)}</p><table><tr><th>Model</th><td>${esc(d.model)}</td></tr><tr><th>IMEI 1</th><td>${esc(d.imei1)}</td></tr>
  <tr><th>IMEI 2</th><td>${esc(d.imei2)}</td></tr><tr><th>Serial Number</th><td>${esc(d.serial_number)}</td></tr><tr><th>Price</th><td>&nbsp;</td></tr></table>
  <p style="margin-top:50px">Seller signature: <span class="l"></span> &nbsp; Customer signature: <span class="l"></span></p>`); }

const FN = { stock:"stock", sales:"ventes", tasjil:"tasjil" };
async function exportCsv(k) { try { const r = await api("/export/" + k); if (!r.length) return toast("Nothing to export"); const h = Object.keys(r[0]);
  const q = (v, c) => /imei|serial/.test(c) && v ? `="${v}"` : `"${String(v ?? "").replace(/"/g, '""')}"`;
  const csv = "\ufeff" + [h.join(","), ...r.map(x => h.map(c => q(x[c], c)).join(","))].join("\n");
  const a = document.createElement("a"); a.href = URL.createObjectURL(new Blob([csv], { type:"text/csv" })); a.download = FN[k] + ".csv"; a.click(); } catch (e) { toast(e.message); } }
async function exportPrint(k) { try { const r = await api("/export/" + k); if (!r.length) return toast("Nothing to export"); const h = Object.keys(r[0]);
  printWin(FN[k], `<h1>${FN[k]}</h1><table class="s"><tr>${h.map(c => `<th>${c}</th>`).join("")}</tr>${r.map(x => `<tr>${h.map(c => `<td>${esc(x[c])}</td>`).join("")}</tr>`).join("")}</table>`); } catch (e) { toast(e.message); } }

async function toolsView() { $("v").innerHTML = skel();
  try { const [a, r, d] = await Promise.all([api("/alerts?days=30"), api("/devices?status=repair&page_size=50"), api("/devices?status=defective&page_size=50")]);
    const L = (t, arr, f) => `<h4>${t} (${arr.length})</h4>` + (arr.map(x => `<div class="dev ${x.category}">${head(x)}${f ? f(x) : ""}</div>`).join("") || "<small>Nothing here</small>");
    const chk = x => `<div class="acts"><button onclick="tasjilForm('${x.id}')">Record check</button></div>`;
    const back = x => `<br><small>${esc(x.status_reason || "")}</small><div class="acts"><button onclick="statusForm('${x.id}')">Change status</button></div>`;
    $("v").innerHTML = L("Parallel phones never checked", a.never, chk) + L("Old or unclear Sajalni checks", a.old, chk) +
      L("Slow movers (30+ days in stock)", a.slow, x => `<br><small>${x.days} days in stock</small>`) + L("Repair list", r.items, back) + L("Defective", d.items, back) +
      `<h4>Exports</h4>` + ["stock","sales","tasjil"].map(k => `<div class="row"><button onclick="exportCsv('${k}')">${FN[k]}.csv</button><button class="x" onclick="exportPrint('${k}')">Print / PDF</button></div>`).join("");
  } catch (e) { msg($("v"), e.message); } }
