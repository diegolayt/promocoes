/* Blocos ao vivo dos artigos de /dicas/: ofertas (data-busca = regex no título) e cupons (data-loja).
   Usa os mesmos arquivos do Diegola Promoções. Só carrega quando a pessoa chega perto do bloco. */
(function () {
  "use strict";
  var BOT = "https://raw.githubusercontent.com/diegolayt/diegola-promocoes-bot/main/data/";
  var FONTES = ["/data/amazon.json", "/data/ofertas.json", BOT + "feed.mercado.json", BOT + "vitrine.shopee.json", BOT + "feed.json", BOT + "vitrine.aliexpress.json", BOT + "feed.eletronicos.json", BOT + "vitrine.mercadolivre.json", BOT + "hot.aliexpress.json"];
  var CUPONS = [BOT + "cupons.json", "/data/cupons.json"];
  var LOJAS = { amazon: "Amazon", mercadolivre: "Mercado Livre", shopee: "Shopee", aliexpress: "AliExpress", kabum: "KaBuM!", magalu: "Magalu" };
  var VALIDADE_H = 72;

  var esc = function (s) { return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); };
  var real = function (n) { return Number(n).toLocaleString("pt-BR", { style: "currency", currency: "BRL" }); };
  function preco(v) { if (v == null || v === "") return null; var n = typeof v === "number" ? v : parseFloat(String(v).replace(/[^\d,.-]/g, "").replace(/\.(?=\d{3})/g, "").replace(",", ".")); return isNaN(n) ? null : n; }
  function titulo(x) { return String(x.titulo || x.title || x.nome || ""); }

  var cache = {};
  function baixar(u) {
    if (!cache[u]) cache[u] = fetch(u).then(function (r) { return r.ok ? r.json() : []; }).catch(function () { return []; }).then(function (j) {
      return Array.isArray(j) ? j : ((j && (j.itens || j.ofertas || j.items)) || []);
    });
    return cache[u];
  }

  function ofertas(caixa) {
    var busca = new RegExp(caixa.getAttribute("data-busca"), "i");
    var foraTxt = caixa.getAttribute("data-fora");
    var fora = foraTxt ? new RegExp(foraTxt, "i") : null;
    var soLoja = caixa.getAttribute("data-loja") || "";
    var teto = parseFloat(caixa.getAttribute("data-max")) || 0;
    var grade = caixa.querySelector(".grade");
    var todos = [], faltam = FONTES.length, ultima = "";
    FONTES.forEach(function (u) {
      baixar(u).then(function (l) {
        todos = todos.concat(l.filter(Boolean)); faltam--;
        var agora = Date.now(), vistos = {};
        var bons = todos.filter(function (x) { var t = titulo(x); return x.link && x.imagem && (!soLoja || x.loja === soLoja) && busca.test(t) && !(fora && fora.test(t)); }).map(function (x) {
          var p = preco(x.preco), de = preco(x.precoDe), quando = Date.parse(x.publicadoEm || x.precoEm || "") || 0;
          return { x: x, p: p, de: de && p && de > p ? de : null, off: de && p && de > p ? Math.round((1 - p / de) * 100) : 0, quando: quando };
        }).filter(function (o) { var k = titulo(o.x).toLowerCase().replace(/\W+/g, " ").slice(0, 48); if (!o.p || vistos[k] || (teto && o.p > teto)) return false; vistos[k] = 1; return true; });
        var recentes = bons.filter(function (o) { return !o.quando || agora - o.quando < VALIDADE_H * 36e5; });
        var lista = (recentes.length >= 4 ? recentes : bons).sort(function (a, b) { return (b.off + (b.x.nota || 0) * 2) - (a.off + (a.x.nota || 0) * 2) || b.quando - a.quando; }).slice(0, 8);
        if (lista.length < 4 && faltam) return;
        var ass = lista.map(function (o) { return o.x.link; }).join("|");
        if (ass === ultima && faltam) return;
        ultima = ass;
        if (lista.length < 3) {
          if (!faltam) caixa.remove();   // nada que preste agora: some com o bloco em vez de mostrar caixa vazia
          return;
        }
        grade.innerHTML = lista.map(function (o) {
          var x = o.x;
          return '<a class="card" href="' + esc(x.link) + '" target="_blank" rel="sponsored nofollow noopener">' + (o.off >= 5 ? '<span class="off">-' + o.off + '%</span>' : "") +
            '<div class="foto"><img src="' + esc(x.imagem) + '" alt="" loading="lazy" referrerpolicy="no-referrer"></div><div class="info"><span class="loja">' + esc(LOJAS[x.loja] || x.loja || "") +
            '</span><span class="nome">' + esc(titulo(x)) + '</span><div class="valor"><b>' + real(o.p) + "</b>" + (o.de ? "<s>" + real(o.de) + "</s>" : "") + "</div></div></a>";
        }).join("");
        if (!faltam && !caixa.querySelector(".mais")) caixa.querySelector(".aviso").insertAdjacentHTML("beforebegin", '<a class="mais" href="/promocoes/?src=dicas">Ver todas as promoções de hoje →</a>');
      });
    });
  }

  function cupons(caixa) {
    var loja = (caixa.getAttribute("data-loja") || "").toLowerCase();
    var alvo = caixa.querySelector(".lista-cupons");
    Promise.all(CUPONS.map(baixar)).then(function (listas) {
      var agora = Date.now(), vistos = {};
      var l = listas[0].length ? listas[0] : listas[1];
      var validos = l.filter(function (c) {
        if (!c || !c.codigo || !c.descricao || vistos[c.codigo]) return false;
        if (c.fim && Date.parse(c.fim) < agora) return false;
        vistos[c.codigo] = 1; return true;
      });
      var bons = validos.filter(function (c) { return !loja || loja === "todas" || c.loja === loja; }).slice(0, 12);
      var aviso = "";
      if (!bons.length) {
        // Sem cupom da loja agora: avisa e mostra os das outras lojas, pra página nunca ficar vazia.
        bons = validos.slice(0, 8);
        aviso = '<p class="vazio">Os cupons ' + (LOJAS[loja] ? "da " + esc(LOJAS[loja]) + " " : "") + 'acabaram agora há pouco. Os novos saem primeiro no grupo do Telegram (link logo abaixo). Enquanto isso, estes estão valendo em outras lojas:</p>';
        if (!bons.length) { alvo.innerHTML = aviso.replace(/ Enquanto isso.*<\/p>$/, "</p>"); return; }
      }
      alvo.innerHTML = aviso + bons.map(function (c) {
        return '<div class="cupom"><button class="cod" type="button" data-cod="' + esc(c.codigo) + '" title="Copiar código">' + esc(c.codigo) + '</button><div class="desc"><b>' + esc(LOJAS[c.loja] || c.loja) + ":</b> " + esc(c.descricao) +
          (c.regra ? "<small>" + esc(c.regra) + "</small>" : "") + "</div>" + (c.link ? '<a class="usar" href="' + esc(c.link) + '" target="_blank" rel="sponsored nofollow noopener">Usar →</a>' : "<span></span>") + "</div>";
      }).join("");
    });
    caixa.addEventListener("click", function (e) {
      var b = e.target.closest(".cod");
      if (!b) return;
      var cod = b.getAttribute("data-cod");
      try { navigator.clipboard.writeText(cod); } catch (_) {}
      b.textContent = "Copiado!";
      setTimeout(function () { b.textContent = cod; }, 1600);
    });
  }

  var caixas = [].slice.call(document.querySelectorAll(".ao-vivo"));
  function iniciar(c) {
    if (c.__ok) return; c.__ok = 1;
    if (c.classList.contains("cupons")) cupons(c); else ofertas(c);
  }
  function checar() { caixas.forEach(function (c) { if (c.getBoundingClientRect().top < innerHeight + 900) iniciar(c); }); }
  addEventListener("scroll", checar, { passive: true });
  checar();
})();
