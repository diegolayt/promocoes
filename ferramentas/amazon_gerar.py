"""Gera data/amazon.json a partir de amazon_coleta.txt, com a tag de afiliado.

Uso: python ferramentas/amazon_gerar.py "2026-10-06T22:05:00-03:00"
O argumento é o horário em que os preços foram vistos na Amazon.
"""
import json
import sys
from pathlib import Path

TAG = "diegola00-20"
aqui = Path(__file__).parent
visto_em = sys.argv[1]
ofertas, categoria = [], "Outros"

for linha in (aqui / "amazon_coleta.txt").read_text(encoding="utf-8").splitlines():
    linha = linha.strip()
    if not linha or linha.startswith("#"):
        continue
    if linha.startswith("["):
        categoria = linha.strip("[]")
        continue
    # O título pode conter "|", então os campos fixos são lidos pelas pontas.
    asin, resto = linha.split("|", 1)
    titulo, preco, nota, avaliacoes, imagem = resto.rsplit("|", 4)
    ofertas.append({
        "id": f"amazon-{asin}",
        "loja": "amazon",
        "titulo": titulo.strip(),
        "imagem": f"https://m.media-amazon.com/images/I/{imagem}._AC_SL500_.jpg",
        "preco": float(preco.replace(".", "").replace(",", ".")),
        "link": f"https://www.amazon.com.br/dp/{asin}?tag={TAG}",
        "nota": float(nota.replace(",", ".")),
        "avaliacoes": int(avaliacoes),
        "categoria": categoria,
        "precoEm": visto_em,
        "publicadoEm": visto_em,
    })

saida = aqui.parent / "data" / "amazon.json"
saida.write_text(json.dumps(ofertas, ensure_ascii=False, indent=1), encoding="utf-8")
print(len(ofertas), "ofertas da Amazon em", saida)
