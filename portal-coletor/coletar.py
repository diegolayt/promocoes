"""Coletor do Portal dos Canais.

Puxa as métricas de cada canal do YouTube (Data API + Analytics API) e as vendas
da Kiwify, monta um dados.json e grava a versão criptografada com a senha do
portal em site/data/dados.enc.json (o site só abre com a senha).

Uso:
  python coletar.py            -> coleta real (usa as variáveis de ambiente abaixo)
  python coletar.py --demo     -> gera dados de exemplo (senha PORTAL_SENHA ou "demo")

Variáveis de ambiente (no GitHub ficam em Settings > Secrets):
  PORTAL_SENHA                      senha do site
  YT_CLIENT_ID, YT_CLIENT_SECRET    app OAuth do Google (um só para todos os canais)
  YT_TOKEN_<CANAL>                  refresh token de cada canal (autorizar_youtube.py)
  YT_API_KEY                        opcional: chave pública, usada se o canal ainda não tem token
  KIWIFY_CLIENT_ID, KIWIFY_CLIENT_SECRET, KIWIFY_ACCOUNT_ID   API da Kiwify
"""
from __future__ import annotations

import base64
import datetime as dt
import json
import os
import random
import re
import sys
from pathlib import Path

import requests
from cryptography.hazmat.primitives import hashes
from cryptography.hazmat.primitives.ciphers.aead import AESGCM
from cryptography.hazmat.primitives.kdf.pbkdf2 import PBKDF2HMAC

RAIZ = Path(__file__).resolve().parent.parent
CANAIS = json.loads((Path(__file__).parent / "canais.json").read_text(encoding="utf-8"))
# No GitHub Actions do site (repo diegolayt/promocoes) a saída é portal/data/dados.enc.json (variável PORTAL_SAIDA).
SAIDA = Path(os.environ["PORTAL_SAIDA"]) if os.environ.get("PORTAL_SAIDA") else RAIZ / "site" / "data" / "dados.enc.json"
DIAS = 90
ITERACOES = 210_000
HOJE = dt.date.today()
INICIO = HOJE - dt.timedelta(days=DIAS - 1)
VENDA_OK = {"paid", "approved", "authorized"}
VENDA_DEVOLVIDA = {"refunded", "chargedback", "pending_refund", "refund_requested"}

avisos: list[str] = []


# ----------------------------------------------------------------- YouTube

def token_google(refresh: str) -> str:
    r = requests.post("https://oauth2.googleapis.com/token", data={
        "client_id": os.environ["YT_CLIENT_ID"],
        "client_secret": os.environ["YT_CLIENT_SECRET"],
        "refresh_token": refresh,
        "grant_type": "refresh_token",
    }, timeout=30)
    r.raise_for_status()
    return r.json()["access_token"]


def yt(caminho: str, params: dict, token: str | None) -> dict:
    url = "https://www.googleapis.com/youtube/v3/" + caminho
    headers = {}
    if token:
        headers["Authorization"] = "Bearer " + token
    else:
        params = {**params, "key": os.environ["YT_API_KEY"]}
    r = requests.get(url, params=params, headers=headers, timeout=30)
    r.raise_for_status()
    return r.json()


def analytics(token: str, params: dict) -> list[dict]:
    base = {"ids": "channel==MINE", "startDate": INICIO.isoformat(), "endDate": HOJE.isoformat()}
    r = requests.get("https://youtubeanalytics.googleapis.com/v2/reports",
                     params={**base, **params},
                     headers={"Authorization": "Bearer " + token}, timeout=60)
    r.raise_for_status()
    j = r.json()
    nomes = [c["name"] for c in j.get("columnHeaders", [])]
    return [dict(zip(nomes, linha)) for linha in j.get("rows", [])]


def duracao_seg(iso: str) -> int:
    m = re.match(r"P(?:(\d+)D)?T?(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?", iso or "")
    if not m:
        return 0
    d, h, mi, s = (int(x or 0) for x in m.groups())
    return d * 86400 + h * 3600 + mi * 60 + s


def nota_seo(v: dict, canal: dict) -> dict:
    titulo = v["titulo"]
    desc = v["descricao"]
    tags = v["tags"]
    primeira = desc.strip().splitlines()[0] if desc.strip() else ""
    chaves = [c.lower() for c in canal["palavras_chave"]]
    texto_busca = (titulo + " " + " ".join(tags)).lower()
    hashtags = re.findall(r"#\w+", desc)
    itens = [
        (30 <= len(titulo) <= 70, f"Título com {len(titulo)} caracteres (ideal 30 a 70)"),
        (bool(re.search(r"\d", titulo)), "Título com número (ex.: \"7 erros...\")"),
        (any(c in texto_busca for c in chaves), "Palavra-chave do nicho no título ou nas tags"),
        (bool(re.search(r"https?://", primeira)), "Link do e-book na 1ª linha da descrição"),
        (len(desc) >= 300, f"Descrição com {len(desc)} caracteres (mínimo 300)"),
        (len(tags) >= 5, f"{len(tags)} tags (mínimo 5)"),
        (1 <= len(hashtags) <= 5, f"{len(hashtags)} hashtags (ideal 1 a 5)"),
        (v["capa_personalizada"], "Capa personalizada"),
    ]
    ok = sum(1 for passou, _ in itens if passou)
    return {"nota": round(ok * 10 / len(itens)), "itens": [{"ok": p, "txt": t} for p, t in itens]}


def coletar_youtube(canal: dict) -> dict:
    refresh = os.environ.get(canal["segredo_token"], "").strip()
    token = None
    if refresh:
        token = token_google(refresh)
        info = yt("channels", {"part": "snippet,statistics,contentDetails", "mine": "true"}, token)
    elif canal.get("youtube_channel_id") and os.environ.get("YT_API_KEY"):
        info = yt("channels", {"part": "snippet,statistics,contentDetails", "id": canal["youtube_channel_id"]}, None)
        avisos.append(f"{canal['nome']}: sem autorização do YouTube, só números públicos (sem retenção/CTR).")
    else:
        avisos.append(f"{canal['nome']}: YouTube ainda não conectado.")
        return {"conectado": False}

    item = info["items"][0]
    uploads = item["contentDetails"]["relatedPlaylists"]["uploads"]
    est = item["statistics"]

    ids: list[str] = []
    pagina = None
    while True:
        p = {"part": "contentDetails", "playlistId": uploads, "maxResults": 50}
        if pagina:
            p["pageToken"] = pagina
        j = yt("playlistItems", p, token)
        ids += [x["contentDetails"]["videoId"] for x in j.get("items", [])]
        pagina = j.get("nextPageToken")
        if not pagina or len(ids) >= 300:
            break

    videos = []
    for i in range(0, len(ids), 50):
        j = yt("videos", {"part": "snippet,statistics,contentDetails,status", "id": ",".join(ids[i:i + 50])}, token)
        for x in j.get("items", []):
            sn, st, cd, stt = x["snippet"], x.get("statistics", {}), x["contentDetails"], x["status"]
            publicado = stt.get("publishAt") if stt.get("privacyStatus") != "public" and stt.get("publishAt") else sn["publishedAt"]
            v = {
                "id": x["id"],
                "titulo": sn["title"],
                "descricao": sn.get("description", ""),
                "tags": sn.get("tags", []),
                "publicado": publicado,
                "status": "agendado" if stt.get("publishAt") and stt.get("privacyStatus") != "public" else stt.get("privacyStatus"),
                "duracao": duracao_seg(cd.get("duration")),
                "views": int(st.get("viewCount", 0)),
                "likes": int(st.get("likeCount", 0)),
                "comentarios": int(st.get("commentCount", 0)),
                "capa": (sn.get("thumbnails", {}).get("medium") or {}).get("url", ""),
                "capa_personalizada": "maxres" in sn.get("thumbnails", {}),
            }
            v["seo"] = nota_seo(v, canal)
            videos.append(v)

    diario = []
    if token:
        try:
            for r in analytics(token, {"dimensions": "day",
                                       "metrics": "views,estimatedMinutesWatched,subscribersGained,subscribersLost",
                                       "sort": "day"}):
                diario.append({"d": r["day"], "views": r["views"], "minutos": r["estimatedMinutesWatched"],
                               "inscritos": r["subscribersGained"] - r["subscribersLost"]})
        except requests.HTTPError as e:
            avisos.append(f"{canal['nome']}: Analytics diário falhou ({e.response.status_code}).")

        por_video = {}
        try:
            for r in analytics(token, {"dimensions": "video", "maxResults": 200, "sort": "-views",
                                       "metrics": "views,estimatedMinutesWatched,averageViewPercentage,averageViewDuration"}):
                por_video[r["video"]] = r
        except requests.HTTPError as e:
            avisos.append(f"{canal['nome']}: Analytics por vídeo falhou ({e.response.status_code}).")
        try:  # impressões e CTR da capa (métrica nova, pode não existir em toda conta)
            for r in analytics(token, {"dimensions": "video", "maxResults": 200, "sort": "-videoThumbnailImpressions",
                                       "metrics": "videoThumbnailImpressions,videoThumbnailImpressionsClickRate"}):
                por_video.setdefault(r["video"], {}).update(r)
        except requests.HTTPError:
            avisos.append(f"{canal['nome']}: CTR da capa indisponível na API.")
        for v in videos:
            a = por_video.get(v["id"], {})
            v["minutos"] = a.get("estimatedMinutesWatched")
            v["retencao"] = a.get("averageViewPercentage")
            v["tempo_medio"] = a.get("averageViewDuration")
            v["impressoes"] = a.get("videoThumbnailImpressions")
            ctr = a.get("videoThumbnailImpressionsClickRate")
            v["ctr"] = round(ctr * 100, 2) if ctr is not None and ctr <= 1 else ctr

    for v in videos:
        v.pop("descricao", None)  # não precisa ir pro site

    return {
        "conectado": True,
        "canal_id": item["id"],
        "titulo": item["snippet"]["title"],
        "inscritos": int(est.get("subscriberCount", 0)),
        "views_total": int(est.get("viewCount", 0)),
        "videos_total": int(est.get("videoCount", 0)),
        "diario": diario,
        "videos": videos,
    }


# ------------------------------------------------------------------ Kiwify

def coletar_kiwify() -> list[dict]:
    if not os.environ.get("KIWIFY_CLIENT_ID"):
        avisos.append("Kiwify ainda não conectada.")
        return []
    r = requests.post("https://public-api.kiwify.com/v1/oauth/token", data={
        "client_id": os.environ["KIWIFY_CLIENT_ID"],
        "client_secret": os.environ["KIWIFY_CLIENT_SECRET"],
    }, timeout=30)
    r.raise_for_status()
    headers = {"Authorization": "Bearer " + r.json()["access_token"],
               "x-kiwify-account-id": os.environ["KIWIFY_ACCOUNT_ID"]}
    vendas, pagina = [], 1
    while True:
        r = requests.get("https://public-api.kiwify.com/v1/sales", headers=headers, timeout=60, params={
            "start_date": INICIO.isoformat(), "end_date": HOJE.isoformat(),
            "view_full_sale_details": "true", "page_size": "100", "page_number": str(pagina)})
        r.raise_for_status()
        j = r.json()
        lote = j.get("data", [])
        for s in lote:
            pg = s.get("payment") or {}
            tr = s.get("tracking") or {}
            # só o necessário: nada de nome, e-mail ou CPF do comprador vai pro site
            vendas.append({
                "data": s.get("created_at"),
                "status": s.get("status"),
                "produto_id": (s.get("product") or {}).get("id"),
                "produto": (s.get("product") or {}).get("name"),
                "bruto": (pg.get("charge_amount") or 0) / 100,
                "liquido": (s.get("net_amount") or pg.get("net_amount") or 0) / 100,
                "metodo": s.get("payment_method"),
                "origem": tr.get("src") or tr.get("utm_content") or tr.get("sck") or "",
                "utm_source": tr.get("utm_source") or "",
            })
        total = (j.get("pagination") or {}).get("count") or 0
        if not lote or pagina * 100 >= total:
            break
        pagina += 1
    return vendas


# ------------------------------------------------------------------- Demo

def dados_demo() -> dict:
    random.seed(7)
    temas = {
        "cachorro": ["7 erros que todo dono de cachorro comete", "5 sinais de que seu cachorro está estressado",
                     "Nunca dê isso ao seu cachorro", "Como ensinar seu cão a não puxar a guia",
                     "7 comidas proibidas para cães", "Por que seu cachorro te segue até no banheiro"],
        "gato": ["7 coisas que seu gato odeia e você faz", "Por que o gato derruba as coisas da mesa",
                 "5 sinais de que seu gato confia em você", "Nunca faça isso com seu gato",
                 "7 plantas que podem matar seu gato", "O que o rabo do gato está dizendo"],
        "orquidea": ["7 erros que matam sua orquídea", "Como fazer a orquídea florir de novo",
                     "Adubo caseiro de graça para orquídeas", "Nunca mais regue a orquídea assim",
                     "5 sinais de que a orquídea precisa de vaso novo", "Raiz aérea da orquídea: cortar ou não?"],
        "autismo": ["7 sinais de autismo que passam despercebidos", "Autismo ou TDAH: a diferença explicada",
                    "5 coisas que ajudam uma criança autista na crise", "TDAH em adultos: 7 sinais",
                    "O que nunca dizer para os pais de um autista", "Como organizar a rotina de quem tem TDAH"],
    }
    peso = {"cachorro": 1.3, "gato": 1.0, "orquidea": 0.8, "autismo": 1.1}
    canais, vendas = [], []
    for c in CANAIS:
        k = peso.get(c["id"], 1.0)
        if c["id"] not in temas:
            continue
        diario = []
        for i in range(DIAS):
            d = INICIO + dt.timedelta(days=i)
            base = 0 if i < 55 else (150 + (i - 55) * 60) * k
            vw = int(max(0, base * random.uniform(0.6, 1.5)))
            diario.append({"d": d.isoformat(), "views": vw, "minutos": int(vw * random.uniform(3.1, 4.6)),
                           "inscritos": int(vw * random.uniform(0.006, 0.014))})
        videos = []
        for j, t in enumerate(temas[c["id"]]):
            pub = HOJE - dt.timedelta(days=30 - j * 5)
            vw = int(random.uniform(400, 9000) * k)
            v = {"id": f"demo{c['id'][:3]}{j}", "titulo": t, "tags": c["palavras_chave"][: 3 + j % 4],
                 "publicado": pub.isoformat() + "T15:00:00Z", "status": "public", "duracao": 560 + j * 23,
                 "views": vw, "likes": int(vw * 0.04), "comentarios": int(vw * 0.006), "capa": "",
                 "capa_personalizada": j % 3 != 2, "minutos": int(vw * 3.8),
                 "retencao": round(random.uniform(28, 52), 1), "tempo_medio": random.randint(160, 300),
                 "impressoes": int(vw * random.uniform(9, 16)), "ctr": round(random.uniform(3.5, 9.8), 2)}
            v["seo"] = nota_seo({**v, "descricao": ("https://diegola.com.br/x E-book\n" if j % 4 else "") + "texto " * (40 + j * 20) + "#pet"}, c)
            videos.append(v)
            for _ in range(int(vw / 900)):
                quando = pub + dt.timedelta(days=random.randint(0, max(1, (HOJE - pub).days)))
                vendas.append({"data": quando.isoformat() + "T18:00:00Z", "status": random.choice(["paid"] * 12 + ["refunded"]),
                               "produto_id": f"prod-{c['id']}", "produto": f"E-book {c['nicho']}", "bruto": 27.9,
                               "liquido": 24.31, "metodo": random.choice(["pix", "pix", "credit_card"]),
                               "origem": v["id"], "utm_source": "youtube"})
        canais.append({**c, "kiwify_product_id": f"prod-{c['id']}",
                       "youtube": {"conectado": True, "titulo": c["nome"], "inscritos": int(sum(x["inscritos"] for x in diario)),
                                   "views_total": int(sum(x["views"] for x in diario)), "videos_total": len(videos),
                                   "diario": diario, "videos": videos}})
    return {"canais": canais, "vendas": vendas, "demo": True}


# ------------------------------------------------------------- Montagem

def montar() -> dict:
    canais = []
    for c in CANAIS:
        try:
            canais.append({**c, "youtube": coletar_youtube(c)})
        except Exception as e:  # um canal com erro não derruba os outros
            avisos.append(f"{c['nome']}: erro no YouTube ({type(e).__name__}).")
            canais.append({**c, "youtube": {"conectado": False}})
    try:
        vendas = coletar_kiwify()
    except Exception as e:
        avisos.append(f"Kiwify: erro ao ler vendas ({type(e).__name__}).")
        vendas = []
    return {"canais": canais, "vendas": vendas}


def ligar_vendas(dados: dict) -> None:
    """Diz de qual canal (e de qual vídeo, se o link tiver ?src=ID_DO_VIDEO) veio cada venda."""
    por_produto = {c["kiwify_product_id"]: c["id"] for c in dados["canais"] if c.get("kiwify_product_id")}
    video_canal = {}
    for c in dados["canais"]:
        for v in c["youtube"].get("videos", []):
            video_canal[v["id"]] = c["id"]
    for s in dados["vendas"]:
        s["canal"] = por_produto.get(s["produto_id"]) or video_canal.get(s["origem"]) or ""
        s["video"] = s["origem"] if s["origem"] in video_canal else ""
        s["situacao"] = "ok" if s["status"] in VENDA_OK else ("devolvida" if s["status"] in VENDA_DEVOLVIDA else "pendente")
        s.pop("produto_id", None)
    for c in dados["canais"]:
        for v in c["youtube"].get("videos", []):
            mine = [s for s in dados["vendas"] if s["video"] == v["id"] and s["situacao"] == "ok"]
            v["vendas"] = len(mine)
            v["receita"] = round(sum(s["liquido"] for s in mine), 2)


def criptografar(dados: dict, senha: str) -> dict:
    sal, iv = os.urandom(16), os.urandom(12)
    chave = PBKDF2HMAC(algorithm=hashes.SHA256(), length=32, salt=sal, iterations=ITERACOES).derive(senha.encode())
    ct = AESGCM(chave).encrypt(iv, json.dumps(dados, ensure_ascii=False).encode(), None)
    b = lambda x: base64.b64encode(x).decode()
    return {"v": 1, "iter": ITERACOES, "sal": b(sal), "iv": b(iv), "dados": b(ct)}


def main() -> None:
    demo = "--demo" in sys.argv
    dados = dados_demo() if demo else montar()
    ligar_vendas(dados)
    dados["atualizado"] = dt.datetime.now(dt.timezone.utc).isoformat(timespec="seconds")
    dados["avisos"] = avisos
    senha = os.environ.get("PORTAL_SENHA") or ("demo" if demo else "")
    if not senha:
        sys.exit("Falta a variável PORTAL_SENHA.")
    SAIDA.parent.mkdir(parents=True, exist_ok=True)
    SAIDA.write_text(json.dumps(criptografar(dados, senha)), encoding="utf-8")
    print(f"OK: {len(dados['canais'])} canais, {len(dados['vendas'])} vendas, {len(avisos)} avisos -> {SAIDA}")
    for a in avisos:
        print(" -", a)


if __name__ == "__main__":
    main()
