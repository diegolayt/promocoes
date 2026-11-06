/* Achados relacionados no fim das páginas de e-book (diegola.com.br/<nicho>/).
   A página só precisa ter <div id="achados" data-nicho="cachorro"></div> e chamar este arquivo.
   As ofertas vêm dos mesmos arquivos do Diegola Promoções e só carregam quando a pessoa
   chega perto do fim da página, pra não atrasar a compra do e-book. */
(function () {
  "use strict";
  var caixa = document.getElementById("achados");
  if (!caixa) return;

  var TAG_AMAZON = "diegola00-20";
  var VALIDADE_H = 72;
  var BOT = "https://raw.githubusercontent.com/diegolayt/diegola-promocoes-bot/main/data/";
  var FONTES = ["/data/amazon.json", "/data/ofertas.json", BOT + "feed.mercado.json", BOT + "vitrine.shopee.json", BOT + "feed.json"];
  var LOJAS = { amazon: "Amazon", mercadolivre: "Mercado Livre", shopee: "Shopee", aliexpress: "AliExpress", kabum: "KaBuM!", magalu: "Magalu" };

  var NICHOS = {
    cachorro: {
      titulo: "Achados pro seu cachorro",
      alvo: /\b(c[aã]es|c[aã]o|cachorr\w*|dogs?|caninos?|filhotes?)\b/i,
      produto: /(ra[cç][aã]o|petisco|bifinho|tapete higi[eê]nico|antipulga|carrapat|verm[ií]fug|coleira|peitoral|\bguia\b|caminha|\bcama\b|brinquedo|mordedor|comedouro|bebedouro|fonte|shampoo|escova|nexgard|simparic|bravecto|sach[eê])/i,
      fora: /(camiseta|camisa|blusa|estampa|caneca|chocolate|adesivo|chaveiro|meia)/i,
      buscas: [["Petiscos", "petisco para cachorro"], ["Tapete higiênico", "tapete higienico para caes"], ["Mordedor", "brinquedo mordedor cachorro"], ["Peitoral antipuxão", "peitoral antipuxao cachorro"], ["Caminha", "caminha para cachorro"]],
    },
    gato: {
      titulo: "Achados pro seu gato",
      alvo: /\b(gat[oa]s?|gatinhos?|felin\w*|cats?)\b/i,
      produto: /(ra[cç][aã]o|areia|sach[eê]|petisco|arranhador|brinquedo|varinha|comedouro|bebedouro|fonte|caixa de areia|caminha|whiskas|granplus|wanpy|churu|antipulga|tapete)/i,
      fora: /(camiseta|camisa|blusa|l[ií]ngua de gato|chocolate|caneca|estampa|kopenhagen|dolce gusto|adesivo|chaveiro|meia)/i,
      buscas: [["Arranhador", "arranhador para gatos"], ["Fonte de água", "fonte de agua para gatos"], ["Areia sanitária", "areia sanitaria para gatos"], ["Varinha de brincar", "varinha brinquedo gato"], ["Caminha", "caminha para gato"]],
    },
    orquidea: {
      titulo: "Achados pra sua orquídea",
      alvo: /./,
      produto: /\b(orqu[ií]deas?|adubo|fertilizante|substrato|casca de pinus|musgo|esfagno|vasos?|borrifador|pulverizador|regador|npk|forth|cochonilha)\b/i,
      fora: /(formicida|formiga|baraticida|barata|cupim|mosquito|dengue|rato|raticida|artificia|blocos|montar|lava ?roupas|amaciante|perfume|sabonete|alfazema|aromatiz|limpeza|multiuso|lego|[oó]culos|mangueira|projetor|torneira|cadeira|sanit[aá]rio|descarga|chia|caf[eé])/i,
      buscas: [["Adubo pra orquídea", "adubo para orquidea"], ["Vaso pra orquídea", "vaso para orquidea"], ["Substrato", "substrato para orquidea"], ["Borrifador", "borrifador para plantas"], ["Casca de pinus", "casca de pinus orquidea"]],
    },
  };

  var cfg = NICHOS[caixa.getAttribute("data-nicho")];
  if (!cfg) { caixa.remove(); return; }

  /* ---------- visual (usa as cores da própria página) ---------- */
  var css = document.createElement("style");
  css.textContent = [
    ".achados{padding:64px 0;background:#fff;border-top:1px solid rgba(0,0,0,.06)}",
    ".achados .cab{display:flex;justify-content:space-between;align-items:flex-end;gap:16px;flex-wrap:wrap;margin-bottom:22px}",
    ".achados h2{margin:8px 0 6px}",
    ".achados .sub{margin:0;opacity:.78;max-width:560px}",
    ".achados .mais{display:inline-flex;align-items:center;gap:8px;font-weight:800;color:var(--cor2);text-decoration:none;border:1.5px solid currentColor;padding:10px 16px;border-radius:12px;white-space:nowrap;transition:background .2s,color .2s}",
    ".achados .mais:hover{background:var(--cor2);color:#fff}",
    ".achados .grade{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:16px}",
    ".achados .card{position:relative;display:flex;flex-direction:column;background:#fff;border:1px solid rgba(0,0,0,.08);border-radius:18px;overflow:hidden;text-decoration:none;color:inherit;transition:transform .35s cubic-bezier(.16,1,.3,1),box-shadow .35s;opacity:0;transform:translateY(14px);animation:achEntra .7s cubic-bezier(.16,1,.3,1) forwards}",
    ".achados .card:hover{transform:translateY(-4px);box-shadow:0 18px 40px -18px rgba(0,0,0,.35)}",
    "@keyframes achEntra{to{opacity:1;transform:none}}",
    ".achados .foto{position:relative;aspect-ratio:1;background:#fff;overflow:hidden;border-bottom:1px solid rgba(0,0,0,.05)}",
    ".achados .foto img{position:absolute;inset:14px;width:calc(100% - 28px);height:calc(100% - 28px);object-fit:contain;transition:transform .5s cubic-bezier(.16,1,.3,1)}",
    ".achados .card:hover .foto img{transform:scale(1.05)}",
    ".achados .off{position:absolute;top:12px;left:12px;background:var(--cor);color:#fff;font-weight:800;font-size:13px;padding:4px 9px;border-radius:99px}",
    ".achados .info{padding:14px 16px 16px;display:flex;flex-direction:column;gap:6px;flex:1}",
    ".achados .loja{font-size:12px;font-weight:800;letter-spacing:.6px;text-transform:uppercase;opacity:.55}",
    ".achados .nome{font-size:15px;line-height:1.35;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden;min-height:2.7em}",
    ".achados .valor{margin-top:auto;display:flex;align-items:baseline;gap:8px;flex-wrap:wrap}",
    ".achados .valor b{font-family:Fredoka,Nunito,sans-serif;font-size:22px;color:var(--cor2)}",
    ".achados .valor s{font-size:13px;opacity:.5}",
    ".achados .ir{font-size:14px;font-weight:800;color:var(--cor)}",
    ".achados .buscas{margin-top:26px;display:flex;flex-wrap:wrap;gap:10px;align-items:center}",
    ".achados .buscas span{font-weight:800;margin-right:4px}",
    ".achados .buscas a{background:var(--fundo);color:var(--tinta);text-decoration:none;font-weight:600;font-size:15px;padding:9px 15px;border-radius:99px;border:1px solid rgba(0,0,0,.06);transition:background .2s,color .2s}",
    ".achados .buscas a:hover{background:var(--cor);color:#fff}",
    ".achados .aviso{margin-top:18px;font-size:13px;opacity:.6}",
    ".achados .esq{background:linear-gradient(90deg,#f3f3f3 25%,#e9e9e9 50%,#f3f3f3 75%);background-size:200% 100%;animation:achBrilho 1.2s infinite linear;border-radius:18px;aspect-ratio:.72}",
    "@keyframes achBrilho{to{background-position:-200% 0}}",
    "@media(max-width:820px){.achados .grade{display:flex;overflow-x:auto;scroll-snap-type:x mandatory;margin:0 -20px;padding:4px 20px 12px;gap:12px}.achados .card,.achados .esq{flex:0 0 62%;scroll-snap-align:start}}",
    "@media(prefers-reduced-motion:reduce){.achados .card{animation:none;opacity:1;transform:none}}",
  ].join("");
  document.head.appendChild(css);

  var buscaAmazon = function (q) { return "https://www.amazon.com.br/s?k=" + encodeURIComponent(q) + "&tag=" + TAG_AMAZON; };
  var esc = function (s) { return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); };
  var real = function (n) { return Number(n).toLocaleString("pt-BR", { style: "currency", currency: "BRL" }); };

  caixa.className = "achados";
  caixa.innerHTML =
    '<div class="w"><div class="cab"><div>' +
    '<div class="k">Achados do dia</div><h2>' + esc(cfg.titulo) + '</h2>' +
    '<p class="sub">Ofertas com desconto escolhidas a dedo pelo Diegola Promoções, em lojas confiáveis.</p></div>' +
    '<a class="mais" href="/promocoes/" target="_blank" rel="noopener">Ver todas as promoções →</a></div>' +
    '<div class="grade">' + '<div class="esq"></div>'.repeat(4) + '</div>' +
    '<div class="buscas"><span>Buscas prontas na Amazon:</span>' +
    cfg.buscas.map(function (b) { return '<a href="' + buscaAmazon(b[1]) + '" target="_blank" rel="noopener sponsored">' + esc(b[0]) + '</a>'; }).join("") +
    '</div><p class="aviso">Links de afiliado: você paga o mesmo preço e uma parte ajuda o canal a continuar produzindo conteúdo grátis.</p></div>';

  /* ---------- ofertas ---------- */
  function titulo(x) { return String(x.titulo || x.title || x.nome || ""); }
  function preco(v) { if (v == null || v === "") return null; var n = typeof v === "number" ? v : parseFloat(String(v).replace(/[^\d,.-]/g, "").replace(/\.(?=\d{3})/g, "").replace(",", ".")); return isNaN(n) ? null : n; }
  function serve(x) { var t = titulo(x); return x.link && x.imagem && cfg.alvo.test(t) && cfg.produto.test(t) && !cfg.fora.test(t); }

  // Cada arquivo que chega já atualiza os cards (o do AliExpress é grande e não pode segurar os outros).
  function carregar() {
    var todos = [], faltam = FONTES.length, timer = null;
    FONTES.forEach(function (u) {
      fetch(u).then(function (r) { return r.ok ? r.json() : []; }).catch(function () { return []; }).then(function (j) {
        var l = Array.isArray(j) ? j : ((j && (j.itens || j.ofertas || j.items)) || []);
        todos = todos.concat(l.filter(Boolean));
        faltam--;
        clearTimeout(timer);
        timer = setTimeout(function () { montar(todos, faltam === 0); }, faltam ? 250 : 0);
      });
    });
  }

  var assinatura = "";
  function montar(todos, fim) {
    {
      var agora = Date.now(), vistos = {};
      var bons = todos.filter(serve).map(function (x) {
        var p = preco(x.preco), de = preco(x.precoDe);
        var quando = Date.parse(x.publicadoEm || x.precoEm || "") || 0;
        return { x: x, p: p, de: de && p && de > p ? de : null, off: de && p && de > p ? Math.round((1 - p / de) * 100) : 0, quando: quando };
      }).filter(function (o) {
        var chave = titulo(o.x).toLowerCase().replace(/\W+/g, " ").slice(0, 48);
        if (!o.p || vistos[chave]) return false;
        vistos[chave] = 1; return true;
      });
      var recentes = bons.filter(function (o) { return !o.quando || agora - o.quando < VALIDADE_H * 36e5; });
      var lista = (recentes.length >= 4 ? recentes : bons)
        .sort(function (a, b) { return (b.off + (b.x.nota || 0) * 2) - (a.off + (a.x.nota || 0) * 2) || b.quando - a.quando; })
        .slice(0, 8);
      if (lista.length < 4 && !fim) return;          // espera mais arquivos antes de mostrar pouca coisa
      var nova = lista.map(function (o) { return o.x.link; }).join("|");
      if (nova === assinatura) return;              // nada mudou: não pisca a tela
      assinatura = nova;
      mostrar(lista);
    }
  }

  function mostrar(lista) {
    var grade = caixa.querySelector(".grade");
    if (!grade) return;
    if (!lista.length) { grade.remove(); return; }
    grade.innerHTML = lista.map(function (o, i) {
      var x = o.x;
      return '<a class="card" style="animation-delay:' + i * 70 + 'ms" href="' + esc(x.link) + '" target="_blank" rel="noopener sponsored">' +
        (o.off >= 5 ? '<span class="off">-' + o.off + '%</span>' : "") +
        '<div class="foto"><img src="' + esc(x.imagem) + '" alt="" loading="lazy" referrerpolicy="no-referrer"></div>' +
        '<div class="info"><span class="loja">' + esc(LOJAS[x.loja] || x.loja || "") + '</span>' +
        '<span class="nome">' + esc(titulo(x)) + '</span>' +
        '<div class="valor"><b>' + real(o.p) + '</b>' + (o.de ? '<s>' + real(o.de) + '</s>' : "") + '</div>' +
        '<span class="ir">Ver oferta →</span></div></a>';
    }).join("");
  }

  // Começa a carregar quando a pessoa chega a ~800px do bloco (dois gatilhos, o que vier primeiro).
  var iniciou = false, io = null;
  function iniciar() {
    if (iniciou) return;
    iniciou = true;
    if (io) io.disconnect();
    removeEventListener("scroll", perto);
    carregar();
  }
  function perto() { if (caixa.getBoundingClientRect().top < innerHeight + 800) iniciar(); }
  if ("IntersectionObserver" in window) {
    io = new IntersectionObserver(function (e) { if (e[0].isIntersecting) iniciar(); }, { rootMargin: "800px 0px" });
    io.observe(caixa);
  }
  addEventListener("scroll", perto, { passive: true });
  perto();
})();
