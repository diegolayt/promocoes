/* Monta os cards de e-book (página inicial e /ebooks) a partir de /ebooks/ebooks.json.
   Pra pôr um e-book novo na vitrine, é só acrescentar uma entrada no ebooks.json. */
(function () {
  "use strict";
  var esc = function (s) { return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); };

  // capa com o título por cima (as fotos de capa vêm sem texto)
  var livro = function (e, comAlt) {
    return '<div class="livro"><img src="' + esc(e.capa) + '" alt="' + (comAlt ? "Capa do e-book " + esc(e.titulo) : "") + '"' + (comAlt ? ' loading="lazy"' : "") + '><span>' + esc(e.titulo) + '</span></div>';
  };

  // topo ganha linha ao rolar
  var topo = document.querySelector(".topo");
  if (topo) addEventListener("scroll", function () { topo.classList.toggle("rolou", scrollY > 8); }, { passive: true });

  // revela ao rolar
  var io = "IntersectionObserver" in window ? new IntersectionObserver(function (ents) {
    ents.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add("visivel"); io.unobserve(e.target); } });
  }, { threshold: .12 }) : null;
  window.revelar = function () {
    document.querySelectorAll(".revela:not(.visivel)").forEach(function (el) { io ? io.observe(el) : el.classList.add("visivel"); });
  };

  fetch("/ebooks/ebooks.json").then(function (r) { return r.json(); }).then(function (lista) {
    var grade = document.getElementById("lista-ebooks");
    if (grade) {
      grade.innerHTML = lista.map(function (e, i) {
        return '<a class="ebook revela" style="--cor:' + esc(e.cor) + ';transition-delay:' + i * 80 + 'ms" href="' + esc(e.url) + '">' +
          '<div class="capa-caixa"><span class="tema"><i></i>' + esc(e.tema) + '</span>' +
          livro(e, true) + '</div>' +
          '<div class="corpo"><span class="canal">Canal ' + esc(e.canal) + '</span>' +
          '<h3>' + esc(e.titulo) + '</h3><p class="resumo">' + esc(e.resumo) + '</p>' +
          '<div class="rodape-card"><span class="preco"><b>' + esc(e.preco) + '</b><small>ou ' + esc(e.parcela) + '</small></span>' +
          '<span class="ver">Ver o guia <span class="seta">→</span></span></div></div></a>';
      }).join("");
    }
    var leque = document.getElementById("leque");
    if (leque) leque.innerHTML = lista.slice(0, 4).map(function (e) { return livro(e, false); }).join("");
    window.revelar();
  }).catch(function () {});
  window.revelar();
})();
