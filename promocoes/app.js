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
    ...["feed", "feed.eletronicos", "feed.feminino", "feed.mercado", "feed.mercadolivre", "vitrine.mercadolivre", "vitrine.shopee", "feed.aliexpress", "vitrine.aliexpress", "hot.aliexpress"]
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
  respostas.forEach((lista, i) => {
    // Os arquivos "feed" são as postagens que o bot fez no grupo do Telegram.
    const doGrupo = /\/feed[^/]*\.json$/.test(CONFIG.fontes[i]);
    for (const bruta of lista) {
      const oferta = normalizar(bruta);
      if (!oferta || oferta.publicadoEm < limite) continue;
      const atual = porId.get(oferta.id);
      oferta.doGrupo = doGrupo || Boolean(atual?.doGrupo);
      if (!atual || oferta.publicadoEm > atual.publicadoEm) porId.set(oferta.id, oferta);
      else if (doGrupo) atual.doGrupo = true;
    }
  });
  estado.ofertas = [...porId.values()].sort((a, b) => b.publicadoEm - a.publicadoEm);
  estado.cupons = await carregarCupons();
  for (const oferta of estado.ofertas) {
    if (oferta.cupom) continue;
    const cupom = estado.cupons.find((c) => cupomVale(c, oferta));
    if (cupom) oferta.cupom = cupom.codigo;
  }
  desenhar();
  if (!anel.ocupado && Date.now() - anel.montadoEm > RENOVAR_ANEL_MS) montarAnel(estado.ofertas);
  preencherCelular();
}

// ───── iPhone da chamada: o grupo do Telegram ao vivo ─────
// A tela repete as postagens reais do bot (mesmo texto e botão), uma a uma,
// com "enviando foto…" no topo antes de cada uma, como no app.
const telegram = { fila: [], proxima: 0, relogio: 0, naTela: false, ligado: false };

function preencherCelular() {
  const doGrupo = estado.ofertas.filter((o) => o.doGrupo);
  const hoje = new Date().setHours(0, 0, 0, 0);
  const postadasHoje = doGrupo.filter((o) => o.publicadoEm >= hoje).length;
  const nota = $("tg-contagem");
  nota.hidden = postadasHoje < 10;
  nota.replaceChildren("Hoje o bot já postou ", el("b", {}, `${postadasHoje.toLocaleString("pt-BR")} ofertas`), " no grupo.");

  // Prefere o que está em alta e tem desconto; sem foto não entra na tela.
  const base = doGrupo.length >= 6 ? doGrupo : estado.ofertas;
  const comFoto = base.filter((o) => o.imagem && o.loja !== "amazon");
  const boas = comFoto.filter((o) => o.desconto >= 15 && o.desconto <= 70);
  telegram.fila = escolherEmAlta(boas.length >= 6 ? boas : comFoto, 12).slice(0, 12);
  if (!telegram.ligado && telegram.fila.length) ligarTelegram();
}

function textoQuantos(n) {
  return n >= 1000 ? `${Math.floor(n / 1000)} mil+ vendidos` : `${n}+ vendidos`;
}

function mensagemTelegram(oferta, hora) {
  const loja = LOJAS[oferta.loja];
  const prova = [
    oferta.nota >= 4 ? `⭐ ${oferta.nota.toFixed(1).replace(".", ",")}` : "", // taste-skill-ignore: mesmo texto que o bot posta no Telegram
    oferta.vendidos >= 100 ? textoQuantos(oferta.vendidos) : "",
    oferta.lojaOficial ? "✅ Loja oficial" : "", // taste-skill-ignore: mesmo texto que o bot posta no Telegram
  ].filter(Boolean).join(" · ");
  const preco = oferta.precoDe
    ? `💥 De ${brl.format(oferta.precoDe)} por ${brl.format(oferta.preco)} (-${oferta.desconto}%)` // taste-skill-ignore: mesmo texto que o bot posta no Telegram
    : `💥 Por ${brl.format(oferta.preco)}`; // taste-skill-ignore: mesmo texto que o bot posta no Telegram
  let dominio = "";
  try { dominio = new URL(oferta.link).hostname.replace(/^www\./, ""); } catch {}
  const foto = el("img", { class: "tg-foto", src: oferta.imagem, alt: "", referrerpolicy: "no-referrer", decoding: "async" });
  return el("div", { class: "tg-msg" },
    el("img", { class: "tg-avatar", src: "../assets/logo-64.png", alt: "" }),
    el("div", { class: "tg-coluna" },
      el("div", { class: "tg-bolha" },
        el("span", { class: "tg-nome" }, "Diegola Promoções"),
        foto,
        el("div", { class: "tg-texto" },
          el("p", { class: "tg-produto" }, `🛍️ ${oferta.titulo}`), // taste-skill-ignore: mesmo texto que o bot posta no Telegram
          prova && el("p", {}, prova),
          el("p", { class: "tg-espaco" }),
          el("p", {}, preco),
          el("p", { class: "tg-link" }, `🛒 Compre aqui 👉 ${dominio}`), // taste-skill-ignore: mesmo texto que o bot posta no Telegram
          el("span", { class: "tg-hora" }, hora),
        ),
      ),
      el("span", { class: "tg-botao" }, `🛒 Garantir oferta na ${loja.nome}`), // taste-skill-ignore: mesmo texto que o bot posta no Telegram
    ),
  );
}

function ligarTelegram() {
  telegram.ligado = true;
  const chat = $("tg-chat");
  const lista = el("div", { class: "tg-lista" }, ...chat.children);
  chat.replaceChildren(lista);
  const topico = $("tg-topico");
  const parado = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const horaAgora = () => new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
  $("ios-hora").textContent = horaAgora().replace(/^0/, "");

  const postar = (animar) => {
    const oferta = telegram.fila[telegram.proxima++ % telegram.fila.length];
    const msg = mensagemTelegram(oferta, horaAgora());
    lista.append(msg);
    topico.textContent = `Promoções ${LOJAS[oferta.loja].nome}`;
    topico.classList.remove("digitando");
    // Mensagens que já saíram por cima da tela vão embora.
    while (lista.querySelectorAll(".tg-msg").length > 5) lista.querySelector(".tg-msg").remove();
    if (!animar) return;
    // O chat sobe de leve para abrir espaço, como no app.
    const altura = msg.offsetHeight + 10;
    lista.style.transition = "none";
    lista.style.transform = `translateY(${altura}px)`;
    lista.offsetHeight;
    lista.style.transition = "transform .55s cubic-bezier(.2, .8, .2, 1)";
    lista.style.transform = "";
    msg.classList.add("chegando");
  };

  // Começa com duas mensagens já na tela.
  postar(false); postar(false);
  if (parado) return;
  const ciclo = () => {
    telegram.relogio = setTimeout(() => {
      if (!telegram.naTela || document.hidden) return ciclo();
      topico.textContent = "enviando foto…";
      topico.classList.add("digitando");
      telegram.relogio = setTimeout(() => { postar(true); ciclo(); }, 1100);
    }, 2600);
  };
  ciclo();
}

// O celular vira de leve na direção do mouse (ou do dedo) e balança sozinho.
function ligarIphone() {
  const cena = $("chamada-cena");
  const iphone = $("iphone");
  if (!cena || !iphone) return;
  cena.addEventListener("click", () => { if (linkSeguro(CONFIG.telegram)) open(CONFIG.telegram, "_blank", "noopener"); });
  new IntersectionObserver(([entrada]) => { telegram.naTela = entrada.isIntersecting; }).observe(cena);
  if (matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  const alvo = { x: 0, y: 0 }, atual = { x: 0, y: 0 };
  cena.closest(".chamada").addEventListener("pointermove", (evento) => {
    const caixa = cena.getBoundingClientRect();
    alvo.x = Math.max(-1, Math.min(1, (evento.clientX - caixa.left) / caixa.width * 2 - 1));
    alvo.y = Math.max(-1, Math.min(1, (evento.clientY - caixa.top) / caixa.height * 2 - 1));
  });
  cena.closest(".chamada").addEventListener("pointerleave", () => { alvo.x = 0; alvo.y = 0; });
  const passo = (t) => {
    requestAnimationFrame(passo);
    if (!telegram.naTela) return;
    atual.x += (alvo.x - atual.x) * 0.06;
    atual.y += (alvo.y - atual.y) * 0.06;
    const balanco = Math.sin(t / 1800);
    const ry = -18 + atual.x * 16 + balanco * 4;
    const rx = 6 - atual.y * 10 + Math.cos(t / 2300) * 2;
    iphone.style.setProperty("--ry", `${ry.toFixed(2)}deg`);
    iphone.style.setProperty("--rx", `${rx.toFixed(2)}deg`);
    iphone.style.translate = `0 ${(balanco * -8).toFixed(1)}px`;
    iphone.style.setProperty("--brilho", `${(60 - ry * 2).toFixed(1)}%`);
  };
  requestAnimationFrame(passo);
}

// ───── Carrossel 3D da abertura ─────
// As ofertas reais giram num anel; cada carta sempre encara a câmera e fica
// menor e mais apagada quando passa para trás. Arrastar gira o anel.
const anel = { montadoEm: 0, ocupado: false, cartas: [], angulo: 0, velocidade: 0.0016, inclinacao: 0, alvoInclinacao: 0 };
// A roleta troca os produtos sozinha de tempos em tempos, com as ofertas novas.
const RENOVAR_ANEL_MS = 10 * 60_000;

// O que costuma ser mais buscado: eletrônicos, informática, games, áudio,
// eletroportáteis e cuidados com aparelho. Mercado (granola, café), roupas,
// livros e brinquedos ficam de fora da roleta, mas continuam na lista.
const CATEGORIAS_EM_ALTA = new Set(["Celulares", "Informática", "Games", "Áudio e TV", "Eletrodomésticos"]);
const PRODUTOS_EM_ALTA = /\b(air ?fryer|fritadeira|cameras?|webcam|fonte|projetor|jbl|caixa de som|soundbar|fita (de )?led|led rgb|celular|smartphone|iphone|galaxy|redmi|xiaomi|poco|motorola|maquina de (cortar|corte)|aparador|barbeador|cortador de cabelo|secador|chapinha|fones?|headset|earbuds|smartwatch|relogio inteligente|ssd|hd externo|memoria ram|placa de video|processador|placa[ -]mae|monitor|teclado|mouse|notebook|tablet|ipad|console|playstation|ps5|xbox|nintendo|switch|controle|smart tv|tv \d+|roteador|alexa|echo dot|chromecast|fire tv|tv box|robo aspirador|aspirador|ventilador|ar condicionado|drone|power ?bank|carregador|kindle)\b/;
const FORA_DA_ROLETA = /\b(granola|biscoito|bolacha|chocolate|cafe|cha|whey|creatina|suplemento|sabao|amaciante|detergente|fralda|racao|papel higienico|azeite|arvore de natal|enfeite|livro|mochila|bolsa|capa|capinha|pelicula|case|cabo|adaptador)\b/;

function emAlta(oferta) {
  const nome = semAcento(oferta.titulo);
  if (FORA_DA_ROLETA.test(nome) || oferta.categoria === "Mercado") return false;
  return CATEGORIAS_EM_ALTA.has(oferta.categoria) || PRODUTOS_EM_ALTA.test(nome);
}

// Nota de procura: vendas e avaliações pesam mais, desconto honesto ajuda,
// oferta recente ganha um empurrão.
function procura(oferta) {
  const horas = (Date.now() - oferta.publicadoEm) / 3_600_000;
  const desconto = oferta.desconto <= 70 ? oferta.desconto : 0;
  return Math.log10(oferta.vendidos + 1) * 2 + Math.log10(oferta.avaliacoes + 1) + (oferta.nota >= 4.5 ? 1 : 0)
    + desconto / 20 + (PRODUTOS_EM_ALTA.test(semAcento(oferta.titulo)) ? 1.5 : 0) + Math.max(0, 1 - horas / 24);
}

// Pega os mais procurados e mistura tipos de produto (um celular, um fone,
// uma air fryer…) para a roleta não ficar repetitiva. Cada renovação sorteia
// um pouco diferente entre os melhores.
function escolherEmAlta(ofertas, quantas) {
  const melhores = ofertas.filter((o) => o.imagem && emAlta(o))
    .map((o) => ({ o, nota: procura(o) + Math.random() * 1.2 }))
    .sort((a, b) => b.nota - a.nota).slice(0, quantas * 5).map(({ o }) => o);
  const tipo = (o) => semAcento(o.titulo).match(PRODUTOS_EM_ALTA)?.[0].replace(/s$/, "") || o.categoria;
  const tipos = [...new Set(melhores.map(tipo))];
  return revezar(tipos.map((t) => melhores.filter((o) => tipo(o) === t)));
}

async function montarAnel(ofertas) {
  const pequeno = matchMedia("(max-width: 640px)").matches;
  const quantas = pequeno ? 10 : 14;
  const candidatas = escolherEmAlta(ofertas, quantas).slice(0, quantas * 2);
  if (candidatas.length < 5) return;
  anel.ocupado = true;

  // Só entram as fotos que carregaram de verdade (algumas lojas recusam).
  const carregadas = await Promise.all(candidatas.map((oferta) => new Promise((ok) => {
    const foto = new Image();
    foto.referrerPolicy = "no-referrer";
    const relogio = setTimeout(() => ok(null), 5000);
    foto.onload = () => { clearTimeout(relogio); ok(foto.naturalWidth > 40 ? { oferta, foto } : null); };
    foto.onerror = () => { clearTimeout(relogio); ok(null); };
    foto.src = oferta.imagem;
  })));
  const escolhidas = carregadas.filter(Boolean).slice(0, quantas);
  anel.ocupado = false;
  if (escolhidas.length < 5) return;
  anel.montadoEm = Date.now();

  const cartas = escolhidas.map(({ oferta, foto }) => {
    const loja = LOJAS[oferta.loja];
    foto.alt = "";
    foto.draggable = false;
    const carta = el("a", { class: "carta", href: oferta.link, target: "_blank", rel: "sponsored nofollow noopener", tabindex: "-1", title: oferta.titulo },
      foto,
      el("img", { class: "carta-loja", src: loja.logo, alt: "" }),
      el("span", { class: "carta-rodape" },
        el("span", { class: "carta-preco" }, brl.format(oferta.preco)),
        oferta.desconto >= 5 && el("span", { class: "carta-off" }, `−${oferta.desconto}%`),
      ),
    );
    return carta;
  });

  const trocar = () => {
    anel.cartas = cartas;
    $("anel").replaceChildren(...cartas);
    if (anel.ligado) medirAnel();
    else { anel.ligado = true; ligarArraste(); requestAnimationFrame(girar); }
    posicionarCartas(performance.now());
    $("anel").classList.remove("trocando");
  };
  // Na renovação, a roleta apaga, troca os produtos e acende de novo.
  if (anel.ligado) { $("anel").classList.add("trocando"); setTimeout(trocar, 500); }
  else trocar();
}

// Medidas lidas só quando a tela muda de tamanho. Ler medidas a cada quadro
// obrigava o navegador a recalcular a página inteira e travava o giro.
const movimentoReduzido = matchMedia("(prefers-reduced-motion: reduce)");

function medirAnel() {
  const largura = $("anel").offsetWidth;
  const total = anel.cartas.length;
  anel.raio = Math.max(largura * 1.8, (largura * 1.45) / (2 * Math.tan(Math.PI / total)));
  anel.caixa = $("anel-cena").getBoundingClientRect();
  anel.caixa = { top: anel.caixa.top + scrollY, height: anel.caixa.height };
}

function posicionarCartas(tempo) {
  const total = anel.cartas.length;
  const raio = anel.raio;
  anel.cartas.forEach((carta, i) => {
    const teta = anel.angulo + (i / total) * Math.PI * 2;
    const x = Math.sin(teta) * raio;
    const z = Math.cos(teta) * raio - raio * 0.35;
    const frente = (Math.cos(teta) + 1) / 2; // 1 na frente, 0 atrás
    const y = Math.sin(teta * 2 + tempo / 1400) * 10;
    carta.style.transform = `translate3d(${x.toFixed(1)}px,${y.toFixed(1)}px,${z.toFixed(1)}px) rotateY(${(Math.sin(teta) * 28).toFixed(1)}deg)`;
    carta.style.opacity = (0.06 + frente ** 1.8 * 0.94).toFixed(2);
    // Só mexe no clique quando muda, para não refazer estilos à toa.
    const clicavel = frente > 0.75;
    if (carta.clicavel !== clicavel) { carta.clicavel = clicavel; carta.style.pointerEvents = clicavel ? "auto" : "none"; }
  });
}

function girar(tempo) {
  if (movimentoReduzido.matches) { posicionarCartas(0); anel.rodando = false; return; }
  // Passo medido em quadros de 60 Hz, para girar igual em qualquer tela.
  const passo = Math.min(4, (tempo - (anel.ultimoTempo ?? tempo)) / 16.67);
  anel.ultimoTempo = tempo;
  if (anel.naTela && !document.hidden) {
    if (!anel.arrastando) anel.angulo += anel.velocidade * passo;
    // Depois de solto, o anel desacelera até voltar ao giro calmo.
    anel.velocidade += (0.0016 - anel.velocidade) * Math.min(1, 0.03 * passo);
    anel.inclinacao += (anel.alvoInclinacao - anel.inclinacao) * Math.min(1, 0.06 * passo);
    $("anel").style.transform = `rotateX(${anel.inclinacao.toFixed(2)}deg)`;
    posicionarCartas(tempo);
  }
  requestAnimationFrame(girar);
}

function ligarArraste() {
  const cena = $("anel-cena");
  let inicioX = 0, ultimoX = 0, moveu = 0;
  medirAnel();
  addEventListener("resize", medirAnel);
  // Fora da tela o anel não gasta nada.
  anel.naTela = true;
  new IntersectionObserver(([entrada]) => { anel.naTela = entrada.isIntersecting; }).observe(cena);
  cena.addEventListener("pointerdown", (evento) => {
    anel.arrastando = true;
    inicioX = ultimoX = evento.clientX;
    moveu = 0;
    cena.classList.add("arrastando");
  });
  addEventListener("pointermove", (evento) => {
    const topo = anel.caixa.top - scrollY;
    if (evento.clientY < topo + anel.caixa.height) anel.alvoInclinacao = ((evento.clientY - topo) / anel.caixa.height - 0.5) * -8;
    if (!anel.arrastando) return;
    const passo = evento.clientX - ultimoX;
    ultimoX = evento.clientX;
    moveu = Math.max(moveu, Math.abs(evento.clientX - inicioX));
    anel.angulo += passo * 0.005;
    anel.velocidade = passo * 0.005;
    // Sem animação contínua (movimento reduzido), o arraste reposiciona direto.
    if (movimentoReduzido.matches) posicionarCartas(0);
  });
  const soltar = () => { anel.arrastando = false; cena.classList.remove("arrastando"); };
  addEventListener("pointerup", soltar);
  addEventListener("pointercancel", soltar);
  // Arrastar não pode abrir a oferta; só o toque parado abre.
  cena.addEventListener("click", (evento) => { if (moveu > 6) evento.preventDefault(); }, true);
}

// Inclinação 3D da foto do cartão acompanhando o mouse.
function ligarInclinacao() {
  if (!matchMedia("(hover: hover) and (prefers-reduced-motion: no-preference)").matches) return;
  document.addEventListener("pointermove", (evento) => {
    const cartao = evento.target.closest?.(".cartao");
    if (ligarInclinacao.atual && ligarInclinacao.atual !== cartao) ligarInclinacao.atual.querySelector(".cartao-foto").style.transform = "";
    ligarInclinacao.atual = cartao;
    if (!cartao) return;
    const foto = cartao.querySelector(".cartao-foto");
    const caixa = foto.getBoundingClientRect();
    const x = (evento.clientX - caixa.left) / caixa.width - 0.5;
    const y = Math.min(1, (evento.clientY - caixa.top) / caixa.height) - 0.5;
    foto.style.transform = `rotateY(${(x * 14).toFixed(2)}deg) rotateX(${(y * -14).toFixed(2)}deg)`;
  });
}

// Blocos entram suavemente quando chegam na tela.
function ligarSurgimento() {
  const alvos = document.querySelectorAll(".garantias-grade > div, .bloco-lojas, .chamada-texto, .chamada-celular, #cupons-bloco, #destaques-bloco .titulo-secao, #ofertas .titulo-secao");
  if (!("IntersectionObserver" in window)) return;
  const observador = new IntersectionObserver((entradas) => {
    for (const entrada of entradas) if (entrada.isIntersecting) { entrada.target.classList.add("visto"); observador.unobserve(entrada.target); }
  }, { rootMargin: "0px 0px -8% 0px" });
  alvos.forEach((alvo, i) => { alvo.classList.add("surge"); alvo.style.transitionDelay = `${(i % 3) * 80}ms`; observador.observe(alvo); });
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
    foto.append(el("img", { src: oferta.imagem, alt: "", loading: "lazy", decoding: "async", referrerpolicy: "no-referrer", onerror: (evento) => evento.target.replaceWith(el("img", { class: "foto-reserva", src: loja.logo, alt: "" })) }));
  } else foto.append(el("img", { class: "foto-reserva", src: loja.logo, alt: "" }));
  if (oferta.desconto >= 5) foto.append(el("span", { class: "selo-desconto" }, `−${oferta.desconto}%`));

  const etiquetas = el("div", { class: "etiquetas" });
  if (oferta.cupom) etiquetas.append(el("button", { class: "cupom", type: "button", title: "Copiar cupom", onclick: () => copiarCupom(oferta.cupom) }, `Cupom ${oferta.cupom}`));
  if (oferta.lojaOficial) etiquetas.append(el("span", { class: "etiqueta oficial" }, "Loja oficial"));
  if (oferta.nota >= 4) etiquetas.append(el("span", { class: "etiqueta nota" }, `Nota ${oferta.nota.toFixed(1).replace(".", ",")}${oferta.avaliacoes >= 1000 ? ` (${Math.floor(oferta.avaliacoes / 1000)} mil)` : ""}`));
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

function blocoLoja(nome, logo, total, ativa, aoClicar, desativada = false) {
  return el("button", { class: "loja-bloco", type: "button", "aria-pressed": String(ativa), onclick: aoClicar, disabled: desativada },
    el("img", { src: logo, alt: "", width: "44", height: "44", loading: "lazy", decoding: "async" }),
    el("strong", {}, nome),
    el("small", {}, total ? `${total} ${total === 1 ? "oferta" : "ofertas"}` : "sem ofertas agora"),
  );
}

function irPara(id) {
  $(id)?.scrollIntoView({ behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" });
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

// Amostra variada de uma loja: uma oferta de cada categoria por vez, mas
// sempre dentro do lote mais novo primeiro (a Amazon chega em lotes de 100
// com o mesmo horário, e revezar tudo junto trazia produto antigo para a frente).
function variadas(lista, quantidade) {
  const lotes = new Map();
  for (const oferta of [...lista].sort((a, b) => b.publicadoEm - a.publicadoEm)) {
    const hora = Math.floor(oferta.publicadoEm / 3_600_000);
    if (!lotes.has(hora)) lotes.set(hora, []);
    lotes.get(hora).push(oferta);
  }
  const saida = [];
  for (const lote of lotes.values()) {
    const categorias = [...new Set(lote.map((o) => o.categoria))];
    saida.push(...revezar(categorias.map((categoria) => lote.filter((o) => o.categoria === categoria))));
    if (saida.length >= quantidade) break;
  }
  return saida.slice(0, quantidade);
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
  const escolherLoja = (chave) => { definir({ loja: chave }); irPara("ofertas"); };
  $("lojas").replaceChildren(
    blocoLoja("Todas as lojas", "../assets/logo-192.png", paraLojas.length, !estado.loja, () => escolherLoja("")),
    // Loja sem oferta no momento nem aparece (a não ser a que está escolhida).
    ...Object.entries(LOJAS).map(([chave, loja]) => {
      const total = paraLojas.filter((o) => o.loja === chave).length;
      return (total || estado.loja === chave) && blocoLoja(loja.nome, loja.logo, total, estado.loja === chave, () => escolherLoja(estado.loja === chave ? "" : chave));
    }).filter(Boolean),
  );

  const paraCategorias = filtradas({ ignorarCategoria: true });
  const nomes = [...CATEGORIAS.map(([nome]) => nome), "Esportes", "Livros", "Brinquedos", "Outros"].filter((nome) => paraCategorias.some((o) => o.categoria === nome) || estado.categoria === nome);
  $("categorias").replaceChildren(
    ficha("Tudo", !estado.categoria, () => definir({ categoria: "" })),
    ...nomes.map((nome) => ficha(nome, estado.categoria === nome, () => definir({ categoria: estado.categoria === nome ? "" : nome }))),
    ...(todas.some((o) => o.lojaOficial) ? [ficha("Só loja oficial", estado.oficial, () => definir({ oficial: !estado.oficial }))] : []),
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
        el("button", { class: "link", type: "button", onclick: () => { definir({ loja: grupo[0].loja }); irPara("ofertas"); } }, `Ver todas (${grupo.length})`),
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

  for (const id of ["telegram-topo", "telegram-palco", "telegram-base"]) {
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

  // O topo fica transparente sobre a abertura escura e sólido no resto da página.
  const topo = $("topo");
  let alturaPalco = document.querySelector(".palco").offsetHeight;
  addEventListener("resize", () => { alturaPalco = document.querySelector(".palco").offsetHeight; });
  const ajustarTopo = () => topo.classList.toggle("solido", scrollY > alturaPalco - 70);
  addEventListener("scroll", ajustarTopo, { passive: true });
  ajustarTopo();
  $("abrir-busca").addEventListener("click", () => { irPara("ofertas"); setTimeout(() => $("busca").focus({ preventScroll: true }), 500); });
  ligarInclinacao();
  ligarSurgimento();
  ligarIphone();

  $("grade").replaceChildren(...Array.from({ length: 10 }, () => el("div", { class: "esqueleto" })));
  carregar();
  setInterval(() => { if (!document.hidden) carregar(); }, CONFIG.atualizarACadaMs);
}

iniciar();
