# -*- coding: utf-8 -*-
"""Lê TABELA CESARI PNEUS JUNHO-26.xlsx (abas 2–4) e gera public/cesari-produtos-data.js."""
import json
import os
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
    "PNEUS DE CARRO NOVOS",
    "PNEU CARRO REMOLDADO AM PLUS",
    "CAMARA DE AR",
    "ITENS PARA CONSERTO",
    "ÓLEO",
    "PATINS DE FREIO",
    "ACESSÓRIOS PARA MOTOS",
    "CAPAS DE CHUVA",
    "KIT GSW",
]

DEFAULT_XLSX = (
    r"g:\Outros computadores\Meu laptop\G8 Representações\CESARI"
    + r"\TABELA CESARI PNEUS JUNHO-26.xlsx"
)

SHEETS_PADRAO = (2, 3)
SHEET_GSW = 4


def col_letters(cell_ref):
    m = re.match(r"([A-Z]+)", cell_ref or "")
    return m.group(1) if m else ""


def load_shared_strings(z):
    root = ET.fromstring(z.read("xl/sharedStrings.xml"))
    shared = []
    for si in root.findall("m:si", NS):
        shared.append("".join("".join(n.itertext()) for n in si))
    return shared


def load_sheet_rows(z, shared, sheet_num):
    sheet = ET.fromstring(z.read(f"xl/worksheets/sheet{sheet_num}.xml"))
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
    return (t or "").strip().replace(",", ".")


def normalize_category_name(cat):
    cat = " ".join((cat or "").split())
    up = cat.upper()
    if re.match(r"^LINHA\s+PNEUS\s+REMOLD", cat, re.I):
        return "LINHA PNEUS REMOLDADOS"
    if up in ("ÓLEO", "OLEO") or (up.startswith("LEO") and "OLEO" not in up):
        return "ÓLEO"
    if "ACESS" in up and "MOTO" in up:
        return "ACESSÓRIOS PARA MOTOS"
    if "KIT" in up and "GSW" in up:
        return "KIT GSW"
    if "KIT" in up and "RETENTOR" in up:
        return "KIT GSW"
    return cat


def parse_price(d):
    if d is None or str(d).strip() == "":
        return None
    try:
        return float(str(d).replace(",", "."))
    except ValueError:
        return None


def is_header_row(r):
    a = (r.get("A") or "").upper()
    return "REF" in a


def parse_items_ab(ref_col, desc_col, tam_col, price_col, rows, skip_header=None):
    """Abas 2 e 3: categoria em A ou B; produto com preço em price_col."""
    if skip_header is None:
        skip_header = bool(rows) and is_header_row(rows[0])
    cat = None
    items = []
    for r in rows[1 if skip_header else 0 :]:
        ref = (r.get(ref_col) or "").strip()
        desc = (r.get(desc_col) or "").strip()
        tam = normalize_tam(r.get(tam_col))
        price = parse_price(r.get(price_col))

        if price is not None and desc and ref:
            if not cat:
                continue
            if not tam:
                tam = "UN"
            items.append(
                {
                    "CATEGORIA": normalize_category_name(cat),
                    "REF": str(ref),
                    "MODELO": desc,
                    "TAM": tam,
                    "preco": price,
                }
            )
            continue

        if ref and not desc and not price:
            if "REF" not in ref.upper():
                cat = ref
        elif desc and not ref and not price:
            if "DESCRI" not in desc.upper():
                cat = desc
    return items


def parse_items_gsw(rows):
    """Aba 4: código em B, aplicação em C, preço em D."""
    cat = "KIT GSW"
    items = []
    for r in rows:
        ref = (r.get("B") or "").strip()
        desc = (r.get("C") or "").strip()
        price = parse_price(r.get("D"))

        if desc and not ref and price is None:
            up = desc.upper()
            if "TABELA" in up or "PEDIDO" in up or up == "TOTAL":
                continue
            if "KIT" in up or "GSW" in up:
                cat = normalize_category_name(desc)
            continue

        if ref and desc and price is not None:
            items.append(
                {
                    "CATEGORIA": cat,
                    "REF": str(ref),
                    "MODELO": desc,
                    "TAM": "UN",
                    "preco": price,
                }
            )
    return items


def load_all_items(path):
    z = zipfile.ZipFile(path)
    shared = load_shared_strings(z)
    items = []
    for sn in SHEETS_PADRAO:
        rows = load_sheet_rows(z, shared, sn)
        items.extend(parse_items_ab("A", "B", "C", "D", rows))
    items.extend(parse_items_gsw(load_sheet_rows(z, shared, SHEET_GSW)))
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
    items = sort_by_order(load_all_items(xlsx))
    seen = {i["CATEGORIA"] for i in items}
    base = os.path.join(os.path.dirname(__file__), "..", "public")
    out_js = os.path.join(base, "cesari-produtos-data.js")
    body = to_js_lines(items)
    banner = (
        "/** Cesari — preços/categorias (Junho/2026). "
        "Regenerar: python scripts/build_cesari_from_xlsx.py [caminho.xlsx] */\n"
    )
    with open(out_js, "w", encoding="utf-8") as f:
        f.write(banner)
        f.write("window.CESARI_PRODUTOS_DATA = [\n")
        f.write(body)
        f.write("\n];\n")
        cats_out = [c for c in CATEGORIAS_ORDEM if c in seen]
        extra_c = sorted({i["CATEGORIA"] for i in items} - set(cats_out))
        cats_js = json.dumps(cats_out + extra_c, ensure_ascii=False)
        f.write("window.CESARI_CATEGORIAS_ORDEM = ")
        f.write(cats_js)
        f.write(";\n")
    print("Wrote", out_js)
    cats = [c for c in CATEGORIAS_ORDEM if c in seen]
    extra = sorted(seen - set(cats))
    meta = {
        "total": len(items),
        "categorias": cats + extra,
        "fonte": xlsx,
    }
    print(json.dumps(meta, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
