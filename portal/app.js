"use strict";

/* ===== Configuração (troque aqui ao vender para outra pessoa) ===== */
const DONO = "Diego";
const CHAVE_LOCAL = "portal-canais-senha";
const CORES_EXTRA = ["#c98500", "#d55181", "#008300", "#9085e9", "#e66767"]; // canais 4+, ordem fixa

/* ===== utilidades ===== */
const $ = (s, el = document) => el.querySelector(s);
const $$ = (s, el = document) => [...el.querySelectorAll(s)];
const num = (n) => (n == null || isNaN(n) ? "—" : Math.round(n).toLocaleString("pt-BR"));
const dec = (n, c = 1) => (n == null || isNaN(n) ? "—" : n.toLocaleString("pt-BR", { minimumFractionDigits: c, maximumFractionDigits: c }));
const real = (n) => (n == null || isNaN(n) ? "—" : n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" }));
const pct = (n) => (n == null ? "—" : dec(n) + "%");
const dataCurta = (s) => new Date(s).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });
const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const espera = (ms) => new Promise((r) => setTimeout(r, ms));
const calmo = matchMedia("(prefers-reduced-motion: reduce)").matches;
const diaISO = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

let D = null;
let dias = 28;
let filtroVideo = "";
let ordemVideos = { campo: "publicado", desc: true };

/* ===================================================================
   FUNDO ANIMADO DA ENTRADA (rede de pontos que lembra dados fluindo)
   =================================================================== */
(function fundo() {
  const cv = $("#fundo");
  const ctx = cv.getContext("2d");
  let L, A, pts = [], rato = { x: -999, y: -999 }, rodando = true;
  const dpr = Math.min(2, devicePixelRatio || 1);
  function medir() {
    L = cv.clientWidth; A = cv.clientHeight;
    cv.width = L * dpr; cv.height = A * dpr; ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const n = Math.round(Math.min(90, (L * A) / 14000));
    pts = Array.from({ length: n }, () => ({
      x: Math.random() * L, y: Math.random() * A,
      vx: (Math.random() - .5) * .25, vy: (Math.random() - .5) * .25, r: Math.random() * 1.4 + .4,
    }));
  }
  function quadro() {
    if (!rodando) return;
    ctx.clearRect(0, 0, L, A);
    for (const p of pts) {
      if (!calmo) { p.x += p.vx; p.y += p.vy; }
      if (p.x < 0 || p.x > L) p.vx *= -1;
      if (p.y < 0 || p.y > A) p.vy *= -1;
      const dx = rato.x - p.x, dy = rato.y - p.y, d = Math.hypot(dx, dy);
      if (d < 160 && !calmo) { p.x -= dx * .004; p.y -= dy * .004; }
    }
    for (let i = 0; i < pts.length; i++) {
      for (let j = i + 1; j < pts.length; j++) {
        const a = pts[i], b = pts[j], d = Math.hypot(a.x - b.x, a.y - b.y);
        if (d < 130) {
          ctx.strokeStyle = `rgba(130,143,255,${(1 - d / 130) * .16})`;
          ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
        }
      }
    }
    for (const p of pts) {
      ctx.fillStyle = "rgba(208,214,224,.55)";
      ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, 7); ctx.fill();
    }
    if (!calmo) requestAnimationFrame(quadro);
  }
  medir(); quadro();
  addEventListener("resize", () => { medir(); if (calmo) quadro(); });
  addEventListener("pointermove", (e) => { rato = { x: e.clientX, y: e.clientY }; });
  window.pararFundo = () => { rodando = false; };
})();

/* ===================================================================
   SENHA E DESCRIPTOGRAFIA
   =================================================================== */
const b64 = (s) => Uint8Array.from(atob(s), (c) => c.charCodeAt(0));

async function abrir(senha) {
  const r = await fetch("data/dados.enc.json?t=" + Date.now(), { cache: "no-store" });
  if (!r.ok) throw new Error("sem-dados");
  const pacote = await r.json();
  const base = await crypto.subtle.importKey("raw", new TextEncoder().encode(senha), "PBKDF2", false, ["deriveKey"]);
  const chave = await crypto.subtle.deriveKey(
    { name: "PBKDF2", salt: b64(pacote.sal), iterations: pacote.iter, hash: "SHA-256" },
    base, { name: "AES-GCM", length: 256 }, false, ["decrypt"]);
  const claro = await crypto.subtle.decrypt({ name: "AES-GCM", iv: b64(pacote.iv) }, chave, b64(pacote.dados));
  return JSON.parse(new TextDecoder().decode(claro));
}
const guardar = (s) => { try { localStorage.setItem(CHAVE_LOCAL, s); } catch (e) {} };
const lembrada = () => { try { return localStorage.getItem(CHAVE_LOCAL); } catch (e) { return null; } };
const esquecer = () => { try { localStorage.removeItem(CHAVE_LOCAL); sessionStorage.removeItem(CHAVE_LOCAL); } catch (e) {} };
const sessao = (s) => { try { sessionStorage.setItem(CHAVE_LOCAL, s); } catch (e) {} };

const form = $("#form-senha");
$("#ver-senha").addEventListener("click", (e) => {
  const campo = $("#campo-senha");
  const ver = campo.type === "password";
  campo.type = ver ? "text" : "password";
  e.currentTarget.classList.toggle("ligado", ver);
  e.currentTarget.setAttribute("aria-label", ver ? "Esconder senha" : "Mostrar senha");
  campo.focus();
});

form.addEventListener("submit", async (e) => {
  e.preventDefault();
  const senha = $("#campo-senha").value;
  $("#erro-senha").hidden = true;
  form.classList.remove("treme");
  form.classList.add("carregando");
  const [res] = await Promise.allSettled([abrir(senha), espera(650)]);
  form.classList.remove("carregando");
  if (res.status === "rejected") {
    void form.offsetWidth;
    form.classList.add("treme");
    $("#erro-senha").textContent = res.reason?.message === "sem-dados" ? "Ainda não há dados publicados." : "Senha errada. Tente de novo.";
    $("#erro-senha").hidden = false;
    $("#campo-senha").select();
    return;
  }
  D = res.value;
  if ($("#lembrar").checked) guardar(senha);
  sessao(senha);
  form.classList.add("aberto");               // cadeado abre
  await espera(calmo ? 0 : 520);
  $("#tela-senha").classList.add("saindo");   // cofre se afasta
  $("#cortina").classList.add("ativa");       // clarão roxo
  await espera(calmo ? 0 : 520);
  mostrarPainel();
});

$("#sair").addEventListener("click", () => { esquecer(); location.reload(); });

function mostrarPainel() {
  window.pararFundo?.();
  $("#tela-senha").hidden = true;
  $("#painel").hidden = false;
  scrollTo(0, 0);
  preparar();
}

/* ===================================================================
   CÁLCULOS
   =================================================================== */
function corDe(id, i) {
  const css = getComputedStyle(document.documentElement).getPropertyValue("--c-" + id).trim();
  return css || CORES_EXTRA[Math.max(0, i - 3) % CORES_EXTRA.length];
}
function janela(desloc = 0) {
  const fim = new Date(); fim.setHours(0, 0, 0, 0); fim.setDate(fim.getDate() - desloc * dias);
  const ini = new Date(fim); ini.setDate(ini.getDate() - (dias - 1));
  const lista = [];
  for (let d = new Date(ini); d <= fim; d.setDate(d.getDate() + 1)) lista.push(diaISO(d));
  return { ini, fim: new Date(fim.getTime() + 864e5 - 1), lista };
}
function temDados(desloc) {
  const { ini } = janela(desloc);
  return D.canais.some((c) => (c.youtube?.diario || []).some((x) => new Date(x.d + "T12:00:00") <= ini));
}

function resumo(c, desloc = 0) {
  const { ini, fim, lista } = janela(desloc);
  const yt = c.youtube || {};
  const dentro = (s) => { const t = new Date(s); return t >= ini && t <= fim; };
  const mapa = Object.fromEntries((yt.diario || []).map((x) => [x.d, x]));
  const diario = lista.map((d) => mapa[d] || { d, views: 0, minutos: 0, inscritos: 0 });
  const videos = yt.videos || [];
  const comRet = videos.filter((v) => v.retencao != null);
  const comCtr = videos.filter((v) => v.ctr != null);
  const vendas = D.vendas.filter((s) => s.canal === c.id && dentro(s.data));
  const ok = vendas.filter((s) => s.situacao === "ok");
  const vendasDia = Object.fromEntries(lista.map((d) => [d, 0]));
  const receitaDia = Object.fromEntries(lista.map((d) => [d, 0]));
  ok.forEach((s) => { const d = diaISO(new Date(s.data)); if (d in vendasDia) { vendasDia[d]++; receitaDia[d] += s.liquido; } });
  const views = diario.reduce((a, x) => a + x.views, 0);
  const receita = ok.reduce((a, s) => a + s.liquido, 0);
  return {
    views,
    horas: diario.reduce((a, x) => a + x.minutos, 0) / 60,
    inscritos: diario.reduce((a, x) => a + x.inscritos, 0),
    publicados: videos.filter((v) => v.status !== "agendado" && dentro(v.publicado)).length,
    agendados: videos.filter((v) => v.status === "agendado").length,
    retencao: comRet.length ? comRet.reduce((a, v) => a + v.retencao, 0) / comRet.length : null,
    ctr: comCtr.length ? comCtr.reduce((a, v) => a + v.ctr, 0) / comCtr.length : null,
    vendas: ok.length,
    devolvidas: vendas.filter((s) => s.situacao === "devolvida").length,
    receita,
    porMil: views ? (ok.length / views) * 1000 : null,
    rpm: views ? (receita / views) * 1000 : null,
    seo: videos.length ? videos.reduce((a, v) => a + (v.seo?.nota ?? 0), 0) / videos.length : null,
    serie: {
      views: diario.map((x) => x.views), horas: diario.map((x) => x.minutos / 60), inscritos: diario.map((x) => x.inscritos),
      vendas: lista.map((d) => vendasDia[d]), receita: lista.map((d) => receitaDia[d]),
    },
    dias: lista,
    conectado: yt.conectado,
  };
}
const somaSeries = (rs, k) => rs[0].serie[k].map((_, i) => rs.reduce((a, r) => a + r.serie[k][i], 0));

/* ===================================================================
   ANIMAÇÕES DO PAINEL
   =================================================================== */
function contar(el, alvo, fmt, dur = 1100) {
  if (alvo == null || isNaN(alvo) || calmo) { el.textContent = fmt(alvo); return; }
  const t0 = performance.now();
  const passo = (t) => {
    const p = Math.min(1, (t - t0) / dur);
    const e = 1 - Math.pow(1 - p, 4);
    el.textContent = fmt(alvo * e);
    if (p < 1) requestAnimationFrame(passo);
  };
  requestAnimationFrame(passo);
}

const observador = "IntersectionObserver" in window ? new IntersectionObserver((ents) => {
  ents.forEach((e) => { if (e.isIntersecting) { e.target.classList.add("visivel"); observador.unobserve(e.target); } });
}, { threshold: .08 }) : null;
function revelar() {
  $$(".surge:not(.visivel)").forEach((el, i) => {
    if (!observador) return el.classList.add("visivel");
    el.style.transitionDelay = Math.min(i, 4) * 60 + "ms";
    observador.observe(el);
  });
}

function spark(valores, cor, { altura = 42, id }) {
  const L = 200, n = valores.length;
  const max = Math.max(1e-9, ...valores);
  const x = (i) => (i * L) / Math.max(1, n - 1);
  const y = (v) => altura - 4 - (v / max) * (altura - 10);
  const d = valores.map((v, i) => `${i ? "L" : "M"}${x(i).toFixed(1)},${y(v).toFixed(1)}`).join("");
  return `<svg viewBox="0 0 ${L} ${altura}" preserveAspectRatio="none" aria-hidden="true">
    <defs><linearGradient id="g${id}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${cor}" stop-opacity=".28"/><stop offset="1" stop-color="${cor}" stop-opacity="0"/></linearGradient></defs>
    <path class="area-serie" d="${d}L${L},${altura}L0,${altura}Z" fill="url(#g${id})"/>
    <path class="linha-serie" pathLength="1" style="--comp:1" d="${d}" fill="none" stroke="${cor}" stroke-width="1.6" stroke-linejoin="round"/>
  </svg>`;
}

function delta(atual, anterior, temAnterior) {
  if (!temAnterior || anterior == null || atual == null) return "";
  if (!anterior) return atual ? `<span class="delta sobe">novo</span>` : "";
  const v = ((atual - anterior) / anterior) * 100;
  if (Math.abs(v) < 0.5) return `<span class="delta igual">0%</span>`;
  return `<span class="delta ${v > 0 ? "sobe" : "desce"}">${v > 0 ? "▲" : "▼"} ${dec(Math.abs(v), 0)}%</span>`;
}

/* ===================================================================
   MONTAGEM DO PAINEL
   =================================================================== */
const ponto = (c) => `<span class="ponto" style="background:${c.cor}"></span>`;
const nomeCanal = (c) => `<span class="canal-nome">${ponto(c)}${esc(c.nicho)}</span>`;

function preparar() {
  D.canais.forEach((c, i) => (c.cor = corDe(c.id, i)));
  statusAtualizacao();
  setInterval(statusAtualizacao, 60000);
  if (D.avisos?.length) {
    $("#avisos").hidden = false;
    $("#avisos").innerHTML = "<b>Falta conectar ou deu erro</b><ul>" + D.avisos.map((a) => `<li>${esc(a)}</li>`).join("") + "</ul>";
  }
  montarFiltros();
  $$(".periodo button").forEach((b) => (b.onclick = () => {
    dias = +b.dataset.dias;
    $$(".periodo button").forEach((x) => x.classList.toggle("ativo", x === b));
    moverMarcador();
    desenhar();
  }));
  requestAnimationFrame(moverMarcador);
  desenhar();
  let t; addEventListener("resize", () => { clearTimeout(t); t = setTimeout(() => { moverMarcador(); graficoViews(D.canais.map((c) => [c, resumo(c)]), false); }, 120); });
}

function moverMarcador() {
  const b = $(".periodo button.ativo"), m = $(".periodo-marcador");
  if (!b) return;
  m.style.width = b.offsetWidth + "px";
  m.style.transform = `translateX(${b.offsetLeft}px)`;
}

function statusAtualizacao() {
  const min = Math.round((Date.now() - new Date(D.atualizado)) / 60000);
  const quando = min < 1 ? "agora" : min < 60 ? `há ${min} min` : min < 1440 ? `há ${Math.round(min / 60)} h` : `há ${Math.round(min / 1440)} dias`;
  $("#atualizado").textContent = (D.demo ? "Dados de exemplo · " : "Atualizado ") + quando;
  $("#status-ao-vivo").classList.toggle("demo", !!D.demo);
}

function desenhar() {
  const linhas = D.canais.map((c) => [c, resumo(c)]);
  const anteriores = D.canais.map((c) => resumo(c, 1));
  const temAnt = temDados(1);
  cabecalho(linhas, anteriores, temAnt);
  kpis(linhas, anteriores, temAnt);
  cardsCanais(linhas);
  tabelaCanais(linhas);
  graficoViews(linhas, true);
  graficoReceita(linhas);
  videosTabela(true);
  vendasTabela();
  revelar();
}

function cabecalho(linhas, ant, temAnt) {
  const h = new Date().getHours();
  const ola = h < 5 ? "Boa madrugada" : h < 12 ? "Bom dia" : h < 18 ? "Boa tarde" : "Boa noite";
  $("#sobrancelha").textContent = `${D.canais.length} canais · últimos ${dias} dias`;
  $("#saudacao").textContent = `${ola}, ${DONO}.`;
  const views = linhas.reduce((a, [, r]) => a + r.views, 0);
  const vendas = linhas.reduce((a, [, r]) => a + r.vendas, 0);
  const receita = linhas.reduce((a, [, r]) => a + r.receita, 0);
  const viewsAnt = ant.reduce((a, r) => a + r.views, 0);
  const lider = [...linhas].sort((a, b) => b[1].receita - a[1].receita)[0];
  let frase = `Seus canais somaram <b>${num(views)} visualizações</b> e <b>${num(vendas)} vendas</b> (${real(receita)} líquido)`;
  if (temAnt && viewsAnt) {
    const v = ((views - viewsAnt) / viewsAnt) * 100;
    frase += `, ${v >= 0 ? "alta" : "queda"} de <b>${dec(Math.abs(v), 0)}%</b> nas views contra os ${dias} dias anteriores`;
  }
  if (lider && lider[1].receita > 0) frase += `. Quem mais vendeu foi <b>${esc(lider[0].nicho)}</b>`;
  $("#resumo").innerHTML = frase + ".";
}

function kpis(linhas, ant, temAnt) {
  const rs = linhas.map(([, r]) => r);
  const soma = (arr, k) => arr.reduce((a, r) => a + (r[k] || 0), 0);
  const porMil = (arr) => (soma(arr, "views") ? (soma(arr, "vendas") / soma(arr, "views")) * 1000 : null);
  const cards = [
    ["Visualizações", soma(rs, "views"), soma(ant, "views"), num, "views", "#828fff"],
    ["Horas assistidas", soma(rs, "horas"), soma(ant, "horas"), num, "horas", "#828fff"],
    ["Inscritos ganhos", soma(rs, "inscritos"), soma(ant, "inscritos"), num, "inscritos", "#828fff"],
    ["Vendas do e-book", soma(rs, "vendas"), soma(ant, "vendas"), num, "vendas", "#27a644"],
    ["Faturamento líquido", soma(rs, "receita"), soma(ant, "receita"), real, "receita", "#27a644"],
    ["Vendas por mil views", porMil(rs), porMil(ant), (n) => dec(n, 2), "vendas", "#27a644"],
  ];
  $("#kpis").innerHTML = cards.map(([rot, , , , k, cor], i) => `
    <div class="kpi surge" data-i="${i}">
      <div class="rot"><span>${rot}</span><span class="d"></span></div>
      <div class="val">—</div>
      <div class="spark">${spark(somaSeries(rs, k), cor, { id: "k" + i })}</div>
    </div>`).join("");
  $$("#kpis .kpi").forEach((el, i) => {
    const [, val, valAnt, fmt] = cards[i];
    el.style.transitionDelay = i * 55 + "ms";
    $(".d", el).innerHTML = delta(val, valAnt, temAnt);
    contar($(".val", el), val, fmt);
  });
}

function cardsCanais(linhas) {
  $("#canais-cards").style.setProperty("--n", Math.min(4, linhas.length));
  $("#canais-cards").innerHTML = linhas.map(([c, r], i) => `
    <article class="canal-card surge" style="--cor:${c.cor};transition-delay:${i * 80}ms">
      <div class="canal-topo">
        <div class="avatar">${esc((c.nicho || "?")[0])}</div>
        <div><b>${esc(c.nome)}</b><small>${esc(c.nicho)} · ${num(c.youtube?.inscritos)} inscritos</small></div>
        <span class="selo-status ${r.conectado ? "ok" : ""}">${r.conectado ? "● conectado" : "não conectado"}</span>
      </div>
      <div class="canal-numeros">
        <div><span>Views</span><strong data-v="${r.views}" data-f="num">—</strong></div>
        <div><span>Vendas</span><strong data-v="${r.vendas}" data-f="num">—</strong></div>
        <div><span>Líquido</span><strong data-v="${r.receita}" data-f="real">—</strong></div>
      </div>
      <div class="canal-spark">${spark(r.serie.views, c.cor, { altura: 46, id: "c" + i })}</div>
    </article>`).join("");
  $$("#canais-cards strong[data-v]").forEach((el) => contar(el, +el.dataset.v, el.dataset.f === "real" ? real : num, 1300));
}

function tabelaCanais(linhas) {
  const cols = [
    ["Views", "views", num, true], ["Horas", "horas", num, true], ["Inscritos", "inscritos", num, true],
    ["Vídeos no ar", "publicados", num, true], ["Agendados", "agendados", num, null],
    ["Retenção", "retencao", pct, true], ["CTR capa", "ctr", pct, true],
    ["Vendas", "vendas", num, true], ["Devoluções", "devolvidas", num, false],
    ["Líquido", "receita", real, true], ["Vendas/mil", "porMil", (n) => dec(n, 2), true],
    ["R$/mil views", "rpm", real, true], ["SEO", "seo", (n) => (n == null ? "—" : dec(n) + "/10"), true],
  ];
  const melhor = {};
  cols.forEach(([, k, , maior]) => {
    if (maior == null || linhas.length < 2) return;
    const todos = linhas.map(([, r]) => r[k]).filter((v) => v != null);
    if (new Set(todos).size < 2) return;
    const vals = todos.filter((v) => v !== 0);
    if (vals.length) melhor[k] = maior ? Math.max(...vals) : Math.min(...todos);
  });
  $("#tab-canais").innerHTML =
    `<thead><tr><th>Canal</th>${cols.map(([t]) => `<th class="n">${t}</th>`).join("")}</tr></thead><tbody>` +
    linhas.map(([c, r], i) => `<tr class="linha-entra" style="animation-delay:${i * 70}ms"><td>${nomeCanal(c)}</td>` +
      cols.map(([, k, f]) => `<td class="n${melhor[k] != null && r[k] === melhor[k] ? " melhor" : ""}">${f(r[k])}</td>`).join("") + "</tr>").join("") +
    "</tbody>";
}

/* ---------- gráfico de linhas com área, mira e dica ---------- */
function graficoViews(linhas, animar) {
  const caixa = $("#graf-views");
  const L = Math.max(320, caixa.clientWidth || 700), A = 280, m = { t: 14, r: 104, b: 28, l: 46 };
  const dias_ = linhas[0][1].dias;
  const series = linhas.map(([c, r]) => ({ c, v: r.serie.views }));
  const max = Math.max(10, ...series.flatMap((s) => s.v));
  const passo = Math.pow(10, Math.floor(Math.log10(max)));
  const topo = Math.ceil(max / passo) * passo;
  const x = (i) => m.l + (i * (L - m.l - m.r)) / Math.max(1, dias_.length - 1);
  const y = (v) => m.t + (A - m.t - m.b) * (1 - v / topo);
  const cada = Math.ceil(dias_.length / (L < 500 ? 4 : 7));
  let svg = `<svg viewBox="0 0 ${L} ${A}" role="img" aria-label="Visualizações por dia de cada canal"><defs>`;
  series.forEach((s, k) => { svg += `<linearGradient id="gv${k}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${s.c.cor}" stop-opacity=".18"/><stop offset="1" stop-color="${s.c.cor}" stop-opacity="0"/></linearGradient>`; });
  svg += `</defs>`;
  [0, .25, .5, .75, 1].forEach((f) => {
    const t = topo * f;
    svg += `<line x1="${m.l}" x2="${L - m.r}" y1="${y(t)}" y2="${y(t)}" stroke="${f ? "#1a1b1e" : "#34343a"}"/>`;
    svg += `<text x="${m.l - 8}" y="${y(t) + 4}" text-anchor="end">${num(t)}</text>`;
  });
  dias_.forEach((d, i) => { if (i % cada === 0) svg += `<text x="${x(i)}" y="${A - 6}" text-anchor="middle">${dataCurta(d + "T12:00:00")}</text>`; });
  series.forEach((s, k) => {
    const d = s.v.map((v, i) => `${i ? "L" : "M"}${x(i).toFixed(1)},${y(v).toFixed(1)}`).join("");
    const atraso = `--atraso:${k * .15}s`;
    svg += `<path class="${animar ? "area-serie" : ""}" style="${atraso}" d="${d}L${x(s.v.length - 1)},${y(0)}L${x(0)},${y(0)}Z" fill="url(#gv${k})"/>`;
    svg += `<path class="${animar ? "linha-serie" : ""}" pathLength="1" style="--comp:1;${atraso}" d="${d}" fill="none" stroke="${s.c.cor}" stroke-width="2" stroke-linejoin="round" stroke-linecap="round"/>`;
  });
  const fins = series.map((s) => ({ s, y: y(s.v[s.v.length - 1]) })).sort((a, b) => a.y - b.y);
  for (let i = 1; i < fins.length; i++) if (fins[i].y - fins[i - 1].y < 15) fins[i].y = fins[i - 1].y + 15;
  fins.forEach(({ s, y: yy }) => { svg += `<text x="${L - m.r + 10}" y="${yy + 4}" style="fill:#d0d6e0;font-weight:500">${esc(s.c.nicho)}</text>`; });
  svg += `<line id="mira" x1="0" x2="0" y1="${m.t}" y2="${y(0)}" stroke="#3e3e44" stroke-dasharray="3 3" visibility="hidden"/>`;
  series.forEach((s, k) => { svg += `<circle id="mp${k}" r="4.5" fill="${s.c.cor}" stroke="#0f1011" stroke-width="2" visibility="hidden"/>`; });
  svg += `<rect x="${m.l}" y="0" width="${L - m.l - m.r}" height="${A}" fill="transparent" id="area-mira"/></svg>`;
  caixa.innerHTML = svg;
  $("#leg-views").innerHTML = series.map((s) => `<span>${ponto(s.c)}${esc(s.c.nicho)}</span>`).join("");

  const dica = $("#dica");
  const area = $("#area-mira", caixa);
  const mover = (ev) => {
    const r = $("svg", caixa).getBoundingClientRect();
    const px = ((ev.clientX - r.left) / r.width) * L;
    const i = Math.max(0, Math.min(dias_.length - 1, Math.round(((px - m.l) / (L - m.l - m.r)) * (dias_.length - 1))));
    const mira = $("#mira", caixa);
    mira.setAttribute("x1", x(i)); mira.setAttribute("x2", x(i)); mira.setAttribute("visibility", "visible");
    series.forEach((s, k) => { const p = $("#mp" + k, caixa); p.setAttribute("cx", x(i)); p.setAttribute("cy", y(s.v[i])); p.setAttribute("visibility", "visible"); });
    const total = series.reduce((a, s) => a + s.v[i], 0);
    dica.innerHTML = `<b>${new Date(dias_[i] + "T12:00:00").toLocaleDateString("pt-BR", { weekday: "short", day: "2-digit", month: "short" })}</b>` +
      [...series].sort((a, b) => b.v[i] - a.v[i]).map((s) => `<div><span>${ponto(s.c)}${esc(s.c.nicho)}</span><span>${num(s.v[i])}</span></div>`).join("") +
      `<div style="border-top:1px solid #34343a;margin-top:5px;padding-top:5px"><span>Total</span><span>${num(total)}</span></div>`;
    dica.hidden = false;
    dica.style.left = (ev.clientX + 200 > innerWidth ? ev.clientX - 196 : ev.clientX + 16) + "px";
    dica.style.top = ev.clientY + 14 + "px";
  };
  area.addEventListener("pointermove", mover);
  area.addEventListener("pointerdown", mover);
  area.addEventListener("pointerleave", () => { dica.hidden = true; $$("#mira, circle", caixa).forEach((e) => e.setAttribute("visibility", "hidden")); });
}

/* ---------- barras de faturamento ---------- */
function graficoReceita(linhas) {
  const ord = [...linhas].sort((a, b) => b[1].receita - a[1].receita);
  const max = Math.max(1, ...ord.map(([, r]) => r.receita));
  const dica = $("#dica");
  $("#graf-receita").innerHTML = ord.map(([c, r], i) => `
    <div class="barra-linha" style="--cor:${c.cor}">
      <div class="barra-cab"><span class="canal-nome">${ponto(c)}${esc(c.nicho)}</span><b data-v="${r.receita}">—</b></div>
      <div class="barra-trilho"><div class="barra-cheia" style="--w:${Math.max(r.receita ? 2 : 0, (r.receita / max) * 100).toFixed(1)}%;--atraso:${.2 + i * .12}s"></div></div>
      <div class="barra-pe">${num(r.vendas)} vendas · ${dec(r.porMil, 2)} por mil views${r.devolvidas ? ` · ${r.devolvidas} devolvida${r.devolvidas > 1 ? "s" : ""}` : ""}</div>
    </div>`).join("");
  $$("#graf-receita b[data-v]").forEach((el) => contar(el, +el.dataset.v, real, 1300));
  $$("#graf-receita .barra-linha").forEach((el, k) => {
    const [c, r] = ord[k];
    el.onpointermove = (ev) => {
      dica.innerHTML = `<b>${esc(c.nome)}</b><div><span>Vendas</span><span>${num(r.vendas)}</span></div><div><span>Devoluções</span><span>${num(r.devolvidas)}</span></div><div><span>R$ por mil views</span><span>${real(r.rpm)}</span></div><div><span>Líquido</span><span>${real(r.receita)}</span></div>`;
      dica.hidden = false; dica.style.left = Math.min(ev.clientX + 16, innerWidth - 210) + "px"; dica.style.top = ev.clientY + 14 + "px";
    };
    el.onpointerleave = () => (dica.hidden = true);
  });
}

/* ---------- vídeos ---------- */
function montarFiltros() {
  const caixa = $("#filtro-canal");
  caixa.innerHTML = `<button data-c="" class="ativo">Todos</button>` + D.canais.map((c) => `<button data-c="${esc(c.id)}">${ponto(c)}${esc(c.nicho)}</button>`).join("");
  $$("button", caixa).forEach((b) => (b.onclick = () => {
    filtroVideo = b.dataset.c;
    $$("button", caixa).forEach((x) => x.classList.toggle("ativo", x === b));
    videosTabela(true);
  }));
}

function videosTabela(animar) {
  const lista = D.canais.filter((c) => !filtroVideo || c.id === filtroVideo)
    .flatMap((c) => (c.youtube?.videos || []).map((v) => ({ ...v, c })));
  const { campo, desc } = ordemVideos;
  const val = (v) => (campo === "seo" ? v.seo?.nota : campo === "publicado" ? new Date(v.publicado).getTime() : v[campo]);
  lista.sort((a, b) => ((val(a) ?? -1) - (val(b) ?? -1)) * (desc ? -1 : 1));
  const cols = [["publicado", "Publicado"], ["views", "Views"], ["ctr", "CTR"], ["retencao", "Retenção"], ["likes", "Likes"], ["comentarios", "Coment."], ["vendas", "Vendas"], ["receita", "Líquido"], ["seo", "SEO"]];
  const seta = (k) => (campo === k ? (desc ? " ↓" : " ↑") : "");
  let html = `<thead><tr><th></th><th>Título</th>${cols.map(([k, t]) => `<th class="n" data-ordem="${k}">${t}${seta(k)}</th>`).join("")}</tr></thead><tbody>`;
  if (!lista.length) html += `<tr><td colspan="11" class="vazio">Nenhum vídeo ainda.</td></tr>`;
  lista.forEach((v, i) => {
    const n = v.seo?.nota ?? 0;
    const anima = animar ? ` class="linha-entra" style="animation-delay:${Math.min(i, 12) * 35}ms"` : "";
    html += `<tr${anima}>
      <td>${v.capa ? `<img class="capa" src="${esc(v.capa)}" alt="" loading="lazy">` : `<span class="capa"></span>`}</td>
      <td class="tit"><a href="https://studio.youtube.com/video/${esc(v.id)}/analytics" target="_blank" rel="noopener">${esc(v.titulo)}</a>
        <small>${ponto(v.c)}${esc(v.c.nicho)} · ${Math.round((v.duracao || 0) / 60)} min${v.status === "agendado" ? ` · <span class="chip">agendado</span>` : ""}</small></td>
      <td class="n">${dataCurta(v.publicado)}</td><td class="n">${num(v.views)}</td>
      <td class="n">${pct(v.ctr)}</td><td class="n">${pct(v.retencao)}</td>
      <td class="n">${num(v.likes)}</td><td class="n">${num(v.comentarios)}</td>
      <td class="n">${num(v.vendas ?? 0)}</td><td class="n">${real(v.receita ?? 0)}</td>
      <td class="n"><button class="nota ${n >= 8 ? "boa" : n < 6 ? "ruim" : ""}" data-abrir="${i}" aria-expanded="false"><i></i>${n}/10</button></td></tr>
      <tr class="checklist" data-lista="${i}" hidden><td colspan="11"><ul>${(v.seo?.itens || []).map((it) => `<li class="${it.ok ? "" : "nao"}">${esc(it.txt)}</li>`).join("")}</ul></td></tr>`;
  });
  const t = $("#tab-videos");
  t.innerHTML = html + "</tbody>";
  $$("th[data-ordem]", t).forEach((th) => (th.onclick = () => {
    const k = th.dataset.ordem;
    ordemVideos = { campo: k, desc: campo === k ? !desc : true };
    videosTabela(true);
  }));
  $$("[data-abrir]", t).forEach((b) => (b.onclick = () => {
    const tr = $(`[data-lista="${b.dataset.abrir}"]`, t);
    tr.hidden = !tr.hidden;
    b.setAttribute("aria-expanded", String(!tr.hidden));
    if (!tr.hidden) tr.classList.add("linha-entra");
  }));
}

/* ---------- vendas ---------- */
function vendasTabela() {
  const { ini } = janela(0);
  const titulos = {};
  D.canais.forEach((c) => (c.youtube?.videos || []).forEach((v) => (titulos[v.id] = v.titulo)));
  const porId = Object.fromEntries(D.canais.map((c) => [c.id, c]));
  const lista = D.vendas.filter((s) => new Date(s.data) >= ini).sort((a, b) => new Date(b.data) - new Date(a.data)).slice(0, 60);
  const nomeSit = { ok: "Paga", devolvida: "Devolvida", pendente: "Pendente" };
  const metodo = { pix: "Pix", credit_card: "Cartão", boleto: "Boleto" };
  $("#tab-vendas").innerHTML = `<thead><tr><th>Data</th><th>Canal</th><th>Vídeo</th><th>Pagamento</th><th class="n">Líquido</th><th>Situação</th></tr></thead><tbody>` +
    (lista.length ? lista.map((s, i) => `<tr class="linha-entra" style="animation-delay:${Math.min(i, 12) * 30}ms"><td class="n" style="text-align:left">${new Date(s.data).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })}</td>
      <td>${porId[s.canal] ? nomeCanal(porId[s.canal]) : `<span class="vazio">${esc(s.produto || "?")}</span>`}</td>
      <td class="tit">${s.video ? esc(titulos[s.video]) : `<span class="vazio">${esc(s.utm_source || "—")}</span>`}</td>
      <td>${metodo[s.metodo] || esc(s.metodo || "—")}</td>
      <td class="n">${real(s.liquido)}</td><td><span class="sit ${s.situacao}">${nomeSit[s.situacao]}</span></td></tr>`).join("")
      : `<tr><td colspan="6" class="vazio">Nenhuma venda no período.</td></tr>`) + "</tbody>";
}

/* ===================================================================
   INÍCIO: se a senha já foi lembrada, entra direto
   =================================================================== */
(async () => {
  let s = null;
  try { s = sessionStorage.getItem(CHAVE_LOCAL); } catch (e) {}
  s = s || lembrada();
  if (!s) { $("#campo-senha").focus({ preventScroll: true }); return; }
  try { D = await abrir(s); mostrarPainel(); }
  catch (e) { esquecer(); }
})();
