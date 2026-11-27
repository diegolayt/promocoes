/* Contador de visitas e de cliques que viram dinheiro (GoatCounter, sem cookie).
   Visita conta sozinha. Clique em link de loja/Telegram/Kiwify vira evento "clique-<loja>-<pagina>". */
(function () {
  "use strict";
  var s = document.createElement("script");
  s.async = true;
  s.src = "//gc.zgo.at/count.js";
  s.setAttribute("data-goatcounter", "https://diegolaebooks.goatcounter.com/count");
  document.head.appendChild(s);

  function conta(nome) {
    var n = 0;
    (function vai() {
      if (window.goatcounter && window.goatcounter.count) window.goatcounter.count({ path: nome, title: nome, event: true });
      else if (n++ < 20) setTimeout(vai, 250);
    })();
  }

  function lojaDe(h) {
    if (/amazon\.|amzn\./.test(h)) return "amazon";
    if (/mercadolivre|mercadolibre|meli\.la/.test(h)) return "mercadolivre";
    if (/shopee|shp\.ee/.test(h)) return "shopee";
    if (/aliexpress|s\.click\.ali/.test(h)) return "aliexpress";
    if (/t\.me\//.test(h)) return "telegram";
    if (/kiwify/.test(h)) return "kiwify";
    return "";
  }

  document.addEventListener("click", function (e) {
    var a = e.target && e.target.closest ? e.target.closest("a[href]") : null;
    if (!a) return;
    var loja = lojaDe(a.href);
    if (!loja) return;
    var pg = location.pathname.replace(/^\/+|\/+$/g, "").replace(/\//g, "-") || "home";
    conta("clique-" + loja + "-" + pg);
  }, true);
})();
