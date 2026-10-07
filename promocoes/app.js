// ───── Configuração ─────
const CONFIG = {
  // Link de convite do grupo (t.me/...). Vazio esconde os botões do Telegram.
  telegram: "https://t.me/diegolapromocoes",
  // Arquivos de ofertas. Aceita caminhos locais ou URLs completas (por exemplo
  // os feeds que o bot grava no GitHub). Fontes que falharem são ignoradas.
  fontes: [
    "../data/ofertas.json",
    "../data/manuais.json",
    "../data/amazon.json",
    // Feeds que o bot do Telegram grava a cada publicação (um por tópico).
    // A vitrine traz os melhores de cada categoria do Mercado Livre, duas vezes ao dia.
    ...["feed", "feed.eletronicos", "feed.feminino", "feed.mercado", "feed.mercadolivre", "vitrine.mercadolivre", "vitrine.shopee"]
      .map((nome) => `https://raw.githubusercontent.com/diegolayt/diegola-promocoes-bot/main/data/${nome}.json`),
  ],
  // Cupons do dia: cada um diz a loja, o código e em quais ofertas vale.
  // O primeiro arquivo é o mesmo que o bot do Telegram usa; o segundo é local.
  cupons: ["https://raw.githubusercontent.com/diegolayt/diegola-promocoes-bot/main/data/cupons.json", "../data/cupons.json"],
  porPagina: 40,
  atualizarACadaMs: 2 * 60_000,
  // Ofertas mais antigas que isso saem do ar sozinhas.
  validadeHoras: 72,
};

// A ordem daqui é a ordem em que as lojas aparecem no site.
const LOJAS = {
  amazon: { nome: "Amazon", cor: "#ff9900", logo: "../assets/lojas/amazon.png" },
  mercadolivre: { nome: "Mercado Livre", cor: "#f5c400", logo: "../assets/lojas/mercadolivre.png" },
  shopee: { nome: "Shopee", cor: "#ee4d2d", logo: "../assets/lojas/shopee.png" },
  aliexpress: { nome: "AliExpress", cor: "#e43225", logo: "../assets/lojas/aliexpress.png" },
  kabum: { nome: "KaBuM!", cor: "#ff6500", logo: "../assets/lojas/kabum.png" },
  magalu: { nome: "Magalu", cor: "#0086ff", logo: "../assets/lojas/magalu.png" },
};

// A primeira categoria cujo padrão casar com o título vence, então as mais
// específicas ficam antes das genéricas.
const CATEGORIAS = [
  ["Celulares", /\b(celular(es)?|smartphones?|iphone|galaxy [asmz]\d|redmi|poco|motorola|moto g)\b/],
  ["Games", /\b(playstation|ps[45]|xbox|nintendo|switch|console|gamepad|controle (sem fio|gamer)|joystick)\b/],
  ["Informática", /\b(notebook|monitor|teclado|mouse|ssd|hd externo|webcam|impressora|roteador|repetidor|memoria ram|placa de video|pen ?drive|cartao de memoria|tablet|galaxy tab|ipad|cameras? (de (seguranca|vigilancia)|ip|wi-?fi))\b/],
  ["Áudio e TV", /\b(fones?|headset|headphone|earbuds|caixas? (de som|amplificada)|soundbar|microfone|smart tv|televis\w*|tv \d+|projetor)\b/],
  ["Eletrodomésticos", /\b(air fryer|fritadeira|geladeira|refrigerador|frigobar|micro-?ondas|forno|fogao|cooktop|liquidificador|cafeteira|aspirador|ventilador|ar condicionado|climatizador|sanduicheira|lava e seca|maquina de lavar|lavadora|batedeira|mixer|purificador|ferro de passar)\b/],
  ["Beleza", /\b(perfumes?|colonia|kaiak|body splash|maquiagem|batom|base|hidratante|shampoo|condicionador|skincare|serum|protetor solar|esmalte|secador|chapinha|barbeador|desodorante|sabonete)\b/],
  ["Moda", /\b(camis(et)?as?|blusas?|moletom|casaco|jaqueta|calcas?|bermudas?|shorts?|vestidos?|saia|tenis|sandalia|sapato|botas?|chinelo|bone|bolsa|mochila|carteira|cinto|relogio|smartwatch|oculos|lingerie|sutia|calcinhas?|cuecas?|meias?|pijama)\b/],
  ["Mercado", /\b(chocolate|biscoito|bolacha|salgadinhos?|balas?|cafe|cha|whey|creatina|suplemento|pasta de amendoim|energetico|refrigerante|cerveja|vinho|gin|whisky|sabao|amaciante|detergente|desinfetante|papel higienico|fralda|racao|azeite|granola)\b/],
  ["Casa", /\b(panelas?|potes?|porta pao|jogo de|cama|colchao|travesseiro|toalha|lencol|cortina|tapete|cadeira|mesa|sofa|estante|guarda-?roupa|luminaria|lampada|torneira|chuveiro|organizador|ferramenta|furadeira|parafusadeira|cuba)\b/],
];

// O bot informa de qual fonte a oferta saiu; isso é mais confiável que
// adivinhar a categoria pelo título.
const CATEGORIA_DA_FONTE = Object.fromEntries(Object.entries({
  "Celulares": "smartphone smartwatch",
  "Games": "console jogos cadeira_gamer",
  "Informática": "tablet monitor notebook computador teclado mouse armazenamento placa_video roteador camera_seguranca",
  "Áudio e TV": "fone caixa_som soundbar tv projetor",
  "Eletrodomésticos": "air_fryer liquidificador cafeteira microondas robo_aspirador ventilador",
  "Beleza": "perfume barbeador maquiagem skincare cabelo_eletrico cabelo",
  "Moda": "camiseta camisa moletom casaco bermuda calca tenis sapato relogio carteira mochila oculos vestido blusa legging conjunto lingerie bolsa sandalia salto acessorios",
  "Mercado": "suplementos cafe_cha chocolate energetico pasta_amendoim sabao desinfetante higiene racao fralda",
}).flatMap(([categoria, fontes]) => fontes.split(" ").map((fonte) => [fonte, categoria])));

// Rótulos usados pelo bot do Mercado Livre (têm espaço e acento).
for (const [categoria, fontes] of Object.entries({
  "Celulares": ["celular"],
  "Games": ["jogos de tabuleiro"],
  "Informática": ["periférico", "componente", "redes", "impressão", "drone", "segurança"],
  "Áudio e TV": ["televisão", "áudio", "som", "streaming"],
  "Eletrodomésticos": ["eletrodoméstico", "climatização", "refrigeração", "lavadora", "fogão", "purificador"],
  "Beleza": ["pele", "barbearia", "cuidado pessoal"],
  "Moda": ["masculino", "relógio", "calçado"],
  "Mercado": ["suplemento"],
  "Casa": ["casa", "cozinha", "móveis", "colchão", "iluminação", "ferramenta", "ferramenta elétrica", "natal"],
  "Esportes": ["fitness", "ciclismo"],
  "Livros": ["livros"],
  "Brinquedos": ["brinquedos"],
})) for (const fonte of fontes) CATEGORIA_DA_FONTE[fonte] = categoria;

const brl = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });
const $ = (id) => document.getElementById(id);
const estado = { ofertas: [], visiveis: CONFIG.porPagina, loja: "", categoria: "", busca: "", ordem: "destaque", oficial: false, cupons: [], cuponsAbertos: false };

function semAcento(texto) {
  return String(texto || "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
}

function categoriaDe(titulo) {
  const base = semAcento(titulo);
  return CATEGORIAS.find(([, padrao]) => padrao.test(base))?.[0] || "Outros";
}

function linkSeguro(url) {
  try { return /^https?:$/.test(new URL(url).protocol) ? url : null; } catch { return null; }
}

// Aceita o que vier dos feeds e devolve só ofertas completas e seguras de exibir.
function normalizar(bruta) {
  const link = linkSeguro(bruta?.link);
  const preco = Number(bruta?.preco);
  if (!link || !bruta.titulo || !LOJAS[bruta.loja] || !(preco > 0)) return null;
  const precoDe = Number(bruta.precoDe) > preco ? Number(bruta.precoDe) : null;
  const desconto = precoDe ? Math.round((1 - preco / precoDe) * 100) : 0;
  const publicadoEm = Date.parse(bruta.publicadoEm) || Date.now();
  return {
    id: String(bruta.id || link),
    loja: bruta.loja,
    titulo: String(bruta.titulo).trim(),
    imagem: linkSeguro(bruta.imagem),
    preco, precoDe, desconto, link, publicadoEm,
    cupom: bruta.cupom ? String(bruta.cupom).trim() : "",
    freteGratis: Boolean(bruta.freteGratis),
    vendidos: Number(bruta.vendidos) || 0,
    nota: Number(bruta.nota) || 0,
    lojaOficial: Boolean(bruta.lojaOficial),
    avaliacoes: Number(bruta.avaliacoes) || 0,
    precoEm: Date.parse(bruta.precoEm) || 0,
    full: Boolean(bruta.full),
    fonte: bruta.fonte || "",
    categoria: bruta.categoria || CATEGORIA_DA_FONTE[bruta.fonte] || categoriaDe(bruta.titulo),
    busca: semAcento(`${bruta.titulo} ${LOJAS[bruta.loja].nome}`),
  };
}

async function carregar() {
  const respostas = await Promise.all(CONFIG.fontes.map(async (fonte) => {
    try {
      const resposta = await fetch(fonte, { cache: "no-store" });
      if (!resposta.ok) return [];
      const dados = await resposta.json();
      return Array.isArray(dados) ? dados : [];
    } catch { return []; }
  }));
  const limite = Date.now() - CONFIG.validadeHoras * 3_600_000;
  const porId = new Map();
  for (const bruta of respostas.flat()) {
    const oferta = normalizar(bruta);
    if (!oferta || oferta.publicadoEm < limite) continue;
    const atual = porId.get(oferta.id);
    if (!atual || oferta.publicadoEm > atual.publicadoEm) porId.set(oferta.id, oferta);
  }
  estado.ofertas = [...porId.values()].sort((a, b) => b.publicadoEm - a.publicadoEm);
  estado.cupons = await carregarCupons();
  for (const oferta of estado.ofertas) {
    if (oferta.cupom) continue;
    const cupom = estado.cupons.find((c) => cupomVale(c, oferta));
    if (cupom) oferta.cupom = cupom.codigo;
  }
  desenhar();
}

// Só entram cupons completos e dentro da validade.
async function carregarCupons() {
  const listas = await Promise.all(CONFIG.cupons.map(async (fonte) => {
    try {
      const resposta = await fetch(fonte, { cache: "no-store" });
      const lista = resposta.ok ? await resposta.json() : [];
      return Array.isArray(lista) ? lista : [];
    } catch { return []; }
  }));
  const agora = Date.now();
  const vistos = new Set();
  // Cupom sem código é o que se resgata na página da loja; só vale com link.
  return listas.flat().filter((c) => {
    const chave = c && (c.codigo || c.link);
    if (!chave || vistos.has(chave) || !LOJAS[c.loja] || !c.descricao || (!c.codigo && !linkSeguro(c.link))) return false;
    if ((c.inicio && Date.parse(c.inicio) > agora) || (c.fim && Date.parse(c.fim) <= agora)) return false;
    vistos.add(chave);
    return true;
  });
}

// Um cupom só aparece no cartão quando a oferta atende à regra dele.
function cupomVale(cupom, oferta) {
  // "soLista" é o cupom que vale só em uma lista de produtos da loja: aparece
  // na seção de cupons, mas não em cartões, porque não sabemos quais entram.
  return !cupom.soLista && cupom.codigo && cupom.loja === oferta.loja
    && (!cupom.categorias?.length || cupom.categorias.includes(oferta.categoria))
    && (!cupom.fontes?.length || cupom.fontes.includes(oferta.fonte))
    && oferta.preco >= Number(cupom.precoMinimo || 0)
    && (!cupom.soFull || oferta.full);
}

function haQuanto(instante) {
  const minutos = Math.max(0, Math.round((Date.now() - instante) / 60_000));
  if (minutos < 1) return "agora";
  if (minutos < 60) return `há ${minutos} min`;
  const horas = Math.round(minutos / 60);
  if (horas < 24) return `há ${horas} h`;
  const dias = Math.round(horas / 24);
  return dias === 1 ? "ontem" : `há ${dias} dias`;
}

function el(tag, atributos = {}, ...filhos) {
  const no = document.createElement(tag);
  for (const [chave, valor] of Object.entries(atributos)) {
    if (valor === false || valor == null) continue;
    if (chave === "class") no.className = valor;
    else if (chave.startsWith("on")) no.addEventListener(chave.slice(2), valor);
    else no.setAttribute(chave, valor === true ? "" : valor);
  }
  no.append(...filhos.filter((filho) => filho != null && filho !== false));
  return no;
}

function avisar(texto) {
  const aviso = $("aviso");
  aviso.textContent = texto;
  aviso.classList.add("visivel");
  clearTimeout(avisar.relogio);
  avisar.relogio = setTimeout(() => aviso.classList.remove("visivel"), 1800);
}

async function copiarCupom(codigo) {
  try { await navigator.clipboard.writeText(codigo); avisar(`Cupom ${codigo} copiado`); }
  catch { avisar(`Cupom: ${codigo}`); }
}

function cartao(oferta) {
  const loja = LOJAS[oferta.loja];
  const foto = el("div", { class: "cartao-foto" });
  if (oferta.imagem) {
    foto.append(el("img", { src: oferta.imagem, alt: "", loading: "lazy", decoding: "async", referrerpolicy: "no-referrer", onerror: (evento) => evento.target.remove() }));
  }
  if (oferta.desconto >= 5) foto.append(el("span", { class: "selo-desconto" }, `−${oferta.desconto}%`));

  const etiquetas = el("div", { class: "etiquetas" });
  if (oferta.cupom) etiquetas.append(el("button", { class: "cupom", type: "button", title: "Copiar cupom", onclick: () => copiarCupom(oferta.cupom) }, `Cupom ${oferta.cupom}`));
  if (oferta.lojaOficial) etiquetas.append(el("span", { class: "etiqueta oficial" }, "Loja oficial"));
  if (oferta.nota >= 4) etiquetas.append(el("span", { class: "etiqueta nota" }, `★ ${oferta.nota.toFixed(1).replace(".", ",")}${oferta.avaliacoes >= 1000 ? ` (${Math.floor(oferta.avaliacoes / 1000)} mil)` : ""}`));
  if (oferta.freteGratis) etiquetas.append(el("span", { class: "etiqueta frete" }, "Frete grátis"));
  if (oferta.vendidos >= 100) etiquetas.append(el("span", { class: "etiqueta" }, `${oferta.vendidos >= 1000 ? `${Math.floor(oferta.vendidos / 1000)} mil+` : `${oferta.vendidos}+`} vendidos`));

  return el("article", { class: "cartao" },
    foto,
    el("div", { class: "cartao-corpo" },
      el("div", { class: "cartao-meta" },
        el("span", { class: "loja" }, logoLoja(loja), loja.nome),
        el("time", { datetime: new Date(oferta.publicadoEm).toISOString() }, haQuanto(oferta.publicadoEm)),
      ),
      el("h3", { class: "cartao-titulo" },
        el("a", { href: oferta.link, target: "_blank", rel: "sponsored nofollow noopener" }, oferta.titulo),
      ),
      etiquetas,
      el("div", { class: "precos" },
        el("span", { class: "preco" }, brl.format(oferta.preco)),
        oferta.precoDe && el("span", { class: "preco-de" }, brl.format(oferta.precoDe)),
      ),
      // Preço que não vem de uma API ao vivo aparece com a hora em que foi visto.
      oferta.precoEm > 0 && el("small", { class: "preco-em" }, `Preço em ${new Date(oferta.precoEm).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" }).replace(",", " às")}, pode mudar`),
      el("span", { class: "ir", "aria-hidden": "true" }, `Ver na ${loja.nome}`),
    ),
  );
}

function logoLoja(loja) {
  return el("img", { class: "loja-logo", src: loja.logo, alt: "", width: "20", height: "20", loading: "lazy", decoding: "async" });
}

function ficha(rotulo, ativa, aoClicar, extras = {}) {
  return el("button", { class: "ficha", type: "button", "aria-pressed": String(ativa), onclick: aoClicar, disabled: extras.desativada, style: extras.cor && `--cor:${extras.cor}` },
    extras.logo ? logoLoja(extras) : extras.cor && el("i"), rotulo, extras.total != null && el("small", {}, String(extras.total)),
  );
}

function filtradas({ ignorarLoja = false, ignorarCategoria = false } = {}) {
  const termos = semAcento(estado.busca).split(/\s+/).filter(Boolean);
  return estado.ofertas.filter((oferta) =>
    (ignorarLoja || !estado.loja || oferta.loja === estado.loja)
    && (ignorarCategoria || !estado.categoria || oferta.categoria === estado.categoria)
    && (!estado.oficial || oferta.lojaOficial)
    && termos.every((termo) => oferta.busca.includes(termo)));
}

// Reveza os grupos (um item de cada por vez) para a lista ficar variada.
function revezar(grupos) {
  const saida = [];
  for (let i = 0; grupos.some((grupo) => i < grupo.length); i += 1) {
    for (const grupo of grupos) if (i < grupo.length) saida.push(grupo[i]);
  }
  return saida;
}

function porLoja(lista) {
  return Object.keys(LOJAS).map((loja) => lista.filter((o) => o.loja === loja)).filter((grupo) => grupo.length);
}

// Amostra variada de uma loja: uma oferta de cada categoria por vez.
function variadas(lista, quantidade) {
  const categorias = [...new Set(lista.map((o) => o.categoria))];
  return revezar(categorias.map((categoria) => lista.filter((o) => o.categoria === categoria))).slice(0, quantidade);
}

function ordenadas(lista) {
  // "Em destaque" segue a ordem das lojas, revezando entre elas.
  if (estado.ordem === "destaque") return revezar(porLoja(lista));
  const criterios = {
    recentes: (a, b) => b.publicadoEm - a.publicadoEm,
    desconto: (a, b) => b.desconto - a.desconto || b.publicadoEm - a.publicadoEm,
    menor: (a, b) => a.preco - b.preco,
    maior: (a, b) => b.preco - a.preco,
  };
  return [...lista].sort(criterios[estado.ordem]);
}

function definir(mudancas) {
  Object.assign(estado, mudancas, { visiveis: CONFIG.porPagina });
  const parametros = new URLSearchParams();
  if (estado.loja) parametros.set("loja", estado.loja);
  if (estado.categoria) parametros.set("cat", estado.categoria);
  if (estado.busca) parametros.set("q", estado.busca);
  if (estado.ordem !== "destaque") parametros.set("ordem", estado.ordem);
  history.replaceState(null, "", parametros.size ? `?${parametros}` : location.pathname);
  desenhar();
}

function desenhar() {
  const todas = estado.ofertas;
  const resumo = $("resumo");
  resumo.replaceChildren();
  if (todas.length) {
    const lojasAtivas = porLoja(todas).length;
    resumo.append(el("b", {}, `${todas.length} ofertas no ar`), ` em ${lojasAtivas} ${lojasAtivas === 1 ? "loja" : "lojas"} · atualizado ${haQuanto(todas[0].publicadoEm)}`);
  } else {
    resumo.textContent = "Nenhuma oferta no ar agora. Volte daqui a pouco.";
  }

  // As contagens de cada grupo de filtro respeitam os outros filtros ativos.
  const paraLojas = filtradas({ ignorarLoja: true });
  $("lojas").replaceChildren(
    ficha("Todas", !estado.loja, () => definir({ loja: "" }), { total: paraLojas.length }),
    ...Object.entries(LOJAS).map(([chave, loja]) => {
      const total = paraLojas.filter((o) => o.loja === chave).length;
      return ficha(loja.nome, estado.loja === chave, () => definir({ loja: estado.loja === chave ? "" : chave }), { cor: loja.cor, logo: loja.logo, total, desativada: !total && estado.loja !== chave });
    }),
  );

  const paraCategorias = filtradas({ ignorarCategoria: true });
  const nomes = [...CATEGORIAS.map(([nome]) => nome), "Esportes", "Livros", "Brinquedos", "Outros"].filter((nome) => paraCategorias.some((o) => o.categoria === nome) || estado.categoria === nome);
  $("categorias").replaceChildren(
    ficha("Tudo", !estado.categoria, () => definir({ categoria: "" })),
    ...nomes.map((nome) => ficha(nome, estado.categoria === nome, () => definir({ categoria: estado.categoria === nome ? "" : nome }))),
    ...(todas.some((o) => o.lojaOficial) ? [ficha("✓ Só loja oficial", estado.oficial, () => definir({ oficial: !estado.oficial }))] : []),
  );

  const lista = ordenadas(filtradas());
  const semFiltro = !estado.loja && !estado.categoria && !estado.busca && !estado.oficial && estado.ordem === "destaque";

  // Cupons válidos agora, cada um com botão de copiar e atalho para as ofertas em que vale.
  $("cupons-bloco").hidden = !estado.cupons.length;
  // Fechada, a seção mostra só os quatro primeiros para não empurrar as ofertas para baixo.
  const cuponsFechado = matchMedia("(max-width: 640px)").matches ? 2 : 4;
  $("cupons-todos").hidden = estado.cupons.length <= cuponsFechado;
  $("cupons-todos").textContent = estado.cuponsAbertos ? "Mostrar menos" : `Ver todos os ${estado.cupons.length} cupons`;
  $("cupons").replaceChildren(...estado.cupons.slice(0, estado.cuponsAbertos ? undefined : cuponsFechado).map((cupom) => {
    const loja = LOJAS[cupom.loja];
    const quantas = cupom.codigo ? todas.filter((o) => o.cupom === cupom.codigo).length : 0;
    return el("article", { class: "cupom-cartao" },
      el("span", { class: "loja" }, logoLoja(loja), loja.nome),
      el("strong", {}, cupom.descricao),
      cupom.regra && el("small", {}, cupom.regra),
      el("div", { class: "cupom-acoes" },
        cupom.codigo && el("button", { class: "cupom", type: "button", title: "Copiar cupom", onclick: () => copiarCupom(cupom.codigo) }, cupom.codigo),
        linkSeguro(cupom.link) && el("a", { class: "link", href: cupom.link, target: "_blank", rel: "sponsored nofollow noopener" }, !cupom.codigo ? "Resgatar na loja" : cupom.soLista ? "Ver produtos do cupom" : "Abrir na loja"),
        quantas > 0 && el("button", { class: "link", type: "button", onclick: () => { $("busca").value = ""; definir({ loja: cupom.loja, categoria: cupom.categorias?.length === 1 ? cupom.categorias[0] : "", busca: "", oficial: false }); } }, `Ver ${quantas} ${quantas === 1 ? "oferta" : "ofertas"}`),
      ),
    );
  }));

  // Página inicial: uma faixa por loja, na ordem definida em LOJAS.
  $("vitrines").replaceChildren(...(semFiltro ? porLoja(todas).filter((grupo) => grupo.length >= 4).map((grupo) => {
    const loja = LOJAS[grupo[0].loja];
    return el("section", { class: "vitrine" },
      el("div", { class: "titulo-secao" },
        el("h2", { class: "loja-titulo" }, logoLoja(loja), loja.nome),
        el("button", { class: "link", type: "button", onclick: () => { definir({ loja: grupo[0].loja }); scrollTo({ top: 0 }); } }, `Ver todas (${grupo.length})`),
      ),
      el("div", { class: "trilho" }, ...variadas(grupo, 12).map(cartao)),
    );
  }) : []));
  // Acima de 70% quase sempre é "preço cheio" inflado pelo vendedor; esses
  // continuam na lista, mas não ganham a vitrine.
  const destaques = semFiltro
    ? todas.filter((o) => o.desconto >= 30 && o.desconto <= 70 && o.publicadoEm >= Date.now() - 86_400_000).sort((a, b) => b.desconto - a.desconto).slice(0, 10)
    : [];
  $("destaques-bloco").hidden = destaques.length < 4;
  $("destaques").replaceChildren(...destaques.map(cartao));

  $("titulo-lista").textContent = semFiltro ? "Todas as ofertas" : `${lista.length} ${lista.length === 1 ? "oferta encontrada" : "ofertas encontradas"}`;
  $("grade").replaceChildren(...lista.slice(0, estado.visiveis).map(cartao));
  $("vazio").hidden = lista.length > 0 || !todas.length;
  $("mais").hidden = lista.length <= estado.visiveis;
}

function iniciar() {
  const parametros = new URLSearchParams(location.search);
  estado.loja = LOJAS[parametros.get("loja")] ? parametros.get("loja") : "";
  estado.categoria = parametros.get("cat") || "";
  estado.busca = parametros.get("q") || "";
  estado.ordem = ["recentes", "desconto", "menor", "maior"].includes(parametros.get("ordem")) ? parametros.get("ordem") : "destaque";
  $("busca").value = estado.busca;
  $("ordem").value = estado.ordem;

  for (const id of ["telegram-topo", "telegram-base"]) {
    if (linkSeguro(CONFIG.telegram)) $(id).href = CONFIG.telegram;
    else ($(id).closest(".chamada") || $(id)).hidden = true;
  }

  let espera;
  $("busca").addEventListener("input", (evento) => {
    clearTimeout(espera);
    espera = setTimeout(() => definir({ busca: evento.target.value.trim() }), 150);
  });
  $("ordem").addEventListener("change", (evento) => definir({ ordem: evento.target.value }));
  $("mais").addEventListener("click", () => { estado.visiveis += CONFIG.porPagina; desenhar(); });
  $("cupons-todos").addEventListener("click", () => { estado.cuponsAbertos = !estado.cuponsAbertos; desenhar(); });
  $("limpar").addEventListener("click", () => { $("busca").value = ""; definir({ loja: "", categoria: "", busca: "", oficial: false }); });
  $("tema").addEventListener("click", () => {
    const escuroAgora = document.documentElement.dataset.theme
      ? document.documentElement.dataset.theme === "dark"
      : matchMedia("(prefers-color-scheme: dark)").matches;
    const novo = escuroAgora ? "light" : "dark";
    document.documentElement.dataset.theme = novo;
    try { localStorage.setItem("tema", novo); } catch {}
  });

  $("grade").replaceChildren(...Array.from({ length: 10 }, () => el("div", { class: "esqueleto" })));
  carregar();
  setInterval(() => { if (!document.hidden) carregar(); }, CONFIG.atualizarACadaMs);
}

iniciar();
