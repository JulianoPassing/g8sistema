# -*- coding: utf-8 -*-
"""Lê TABELA CESARI PNEUS JUNHO-26.xlsx e gera trecho JS para cesari.html / b2b-cesari.html."""
import json
import re
import sys
import zipfile
import xml.etree.ElementTree as ET

NS = {"m": "http://schemas.openxmlformats.org/spreadsheetml/2006/main"}

CATEGORIAS_ORDEM = [
    "PNEUS DE MOTO NOVOS",
    "LINHA FLASH TYRE",
    "PNEU QUADRICICULO",
    "LINHA PNEUS REMOLDADOS",
    "CAMARA DE AR",
    "ITENS PARA CONSERTO",
    "ÓLEO",
    "PATINS DE FREIO",
    "ACESSÓRIOS PARA MOTOS",
    "CAPAS DE CHUVA",
]

DEFAULT_XLSX = (
    r"g:\Outros computadores\Meu laptop\G8 Representações\CESARI\TABELA CESARI PNEUS JUNHO-26.xlsx"
)


def col_letters(cell_ref):
    m = re.match(r"([A-Z]+)", cell_ref or "")
    return m.group(1) if m else ""


def load_rows(path):
    z = zipfile.ZipFile(path)
    root = ET.fromstring(z.read("xl/sharedStrings.xml"))
    shared = []
    for si in root.findall("m:si", NS):
        t = "".join("".join(n.itertext()) for n in si)
        shared.append(t)
    sheet = ET.fromstring(z.read("xl/worksheets/sheet1.xml"))
    rows = []
    for row in sheet.findall("m:sheetData/m:row", NS):
        r = {}
        for c in row.findall("m:c", NS):
            ref = c.get("r", "")
            col = col_letters(ref)
            v = c.find("m:v", NS)
            if v is None:
                continue
            val = v.text
            if c.get("t") == "s" and val is not None:
                val = shared[int(val)]
            r[col] = val
        rows.append(r)
    return rows


def normalize_tam(t):
    t = (t or "").strip().replace(",", ".")
    return t


def normalize_category_name(cat):
    cat = " ".join((cat or "").split())
    if re.match(r"^LINHA\s+PNEUS\s+REMOLD", cat, re.I):
        return "LINHA PNEUS REMOLDADOS"
    up = cat.upper()
    if up == "ÓLEO" or up == "OLEO" or cat.startswith("LEO") and "OLEO" not in cat:
        return "ÓLEO"
    if "ACESS" in up and "MOTO" in up:
        return "ACESSÓRIOS PARA MOTOS"
    return cat


def parse_items(rows):
    cat = None
    items = []
    for r in rows[1:]:
        a = (r.get("A") or "").strip()
        b = (r.get("B") or "").strip()
        d = r.get("D")
        if d is not None and str(d).strip() != "":
            try:
                price = float(str(d).replace(",", "."))
            except ValueError:
                continue
            ref = a
            modelo = b
            tam = normalize_tam(r.get("C"))
            if not tam:
                tam = "UN"
            if not ref or not modelo:
                continue
            if not cat:
                continue
            categoria = normalize_category_name(cat)
            items.append(
                {
                    "CATEGORIA": categoria,
                    "REF": str(ref),
                    "MODELO": modelo,
                    "TAM": tam,
                    "preco": price,
                }
            )
            continue
        if a and (not b):
            if "REF" not in a.upper() and a.upper() != "REF.":
                cat = a
        elif b and (not a):
            if "DESCRI" not in b.upper():
                cat = b
    return items


def sort_by_order(items):
    rank = {c: i for i, c in enumerate(CATEGORIAS_ORDEM)}

    def key(it):
        rnk = rank.get(it["CATEGORIA"], 999)
        return (rnk, it["CATEGORIA"], it["REF"], it["MODELO"])

    return sorted(items, key=key)


def fmt_num(p):
    if abs(p - round(p)) < 1e-9:
        return str(int(round(p)))
    return json.dumps(p)


def to_js_lines(items):
    lines = []
    for i, it in enumerate(items):
        p = it["preco"]
        ps = fmt_num(p)
        modelo = json.dumps(it["MODELO"], ensure_ascii=False)
        tam = json.dumps(it["TAM"], ensure_ascii=False)
        cat = json.dumps(it["CATEGORIA"], ensure_ascii=False)
        ref = json.dumps(str(it["REF"]), ensure_ascii=False)
        suffix = "," if i < len(items) - 1 else ""
        line = (
            f"  {{ CATEGORIA: {cat}, REF: {ref}, MODELO: {modelo}, TAM: {tam}, "
            f"PRECOS: {{ p_30_60_90: {ps}, p_30_45_60: {ps}, a_vista: {ps} }} }}{suffix}"
        )
        lines.append(line)
    return "\n".join(lines)


def main():
    xlsx = sys.argv[1] if len(sys.argv) > 1 else DEFAULT_XLSX
    rows = load_rows(xlsx)
    items = sort_by_order(parse_items(rows))
    import os

    base = os.path.join(os.path.dirname(__file__), "..", "public")
    out_js = os.path.join(base, "cesari-produtos-data.js")
    body = to_js_lines(items)
    banner = (
        "/** Cesari Pneus — preços/categorias (Junho/2026). "
        "Regenerar: python scripts/build_cesari_from_xlsx.py [caminho.xlsx] */\n"
    )
    with open(out_js, "w", encoding="utf-8") as f:
        f.write(banner)
        f.write("window.CESARI_PRODUTOS_DATA = [\n")
        f.write(body)
        f.write("\n];\n")
    print("Wrote", out_js)
    meta = {
        "total": len(items),
        "categorias": list({i["CATEGORIA"] for i in items}),
        "fonte": xlsx,
    }
    print(json.dumps(meta, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
