#!/usr/bin/env python3
"""Generate password-protected 4年1組タイムカプセル PDF for kasuminomori-shougakkou."""
from __future__ import annotations

import sys
import urllib.request
from io import BytesIO
from pathlib import Path

from fpdf import FPDF
from pypdf import PdfReader, PdfWriter

ROOT = Path(__file__).resolve().parent.parent
FONT_DIR = ROOT / "scripts" / "fonts"
FONT_FILE = FONT_DIR / "NotoSansCJKjp-Regular.otf"
FONT_URL = (
    "https://github.com/googlefonts/noto-cjk/raw/main/Sans/OTF/Japanese/"
    "NotoSansCJKjp-Regular.otf"
)
OUT_DIR = Path(r"d:\謎解き\小学校サイト\kasuminomori-shougakkou\assets")
OUT_PDF = OUT_DIR / "time-capsule-2016.pdf"
PDF_PASSWORD = "9ふるさと"

ROSTER = [
    ("1", "青木 花"),
    ("2", "佐藤 優"),
    ("3", "（欠番）", True),
    ("4", "大野 咲"),
    ("5", "田村 巧"),
    ("6", "鈴木 蓮"),
    ("7", "西村 澪"),
    ("8", "佐藤 優 ※公式記録"),
    ("9", "佐藤 優 ※4人目在籍時"),
]


def ensure_font() -> None:
    FONT_DIR.mkdir(parents=True, exist_ok=True)
    if FONT_FILE.exists():
        return
    print(f"Downloading font: {FONT_URL}")
    urllib.request.urlretrieve(FONT_URL, FONT_FILE)


def build_content(pdf: FPDF) -> None:
    pdf.add_font("Noto", "", str(FONT_FILE))
    pdf.set_font("Noto", size=18)
    pdf.cell(0, 12, "10年後の私へ", ln=True, align="C")
    pdf.set_font("Noto", size=11)
    pdf.cell(0, 8, "霞ノ杜町立第一小学校 4年1組（2021）", ln=True, align="C")
    pdf.ln(6)

    pdf.set_font("Noto", size=12)
    pdf.multi_cell(
        0,
        7,
        "この名簿は、2分の1成人式に向けてクラスで残したタイムカプセルの控えです。"
        "公式の学級名簿では、ある児童の行が欠番になっています。",
    )
    pdf.ln(4)

    pdf.set_font("Noto", size=11)
    col_w = (20, 50, 120)
    pdf.set_fill_color(238, 242, 234)
    for i, label in enumerate(["番号", "氏名", "備考"]):
        pdf.cell(col_w[i], 8, label, border=1, fill=True)
    pdf.ln()

    for row in ROSTER:
        num, name = row[0], row[1]
        missing = len(row) > 2 and row[2]
        note = "公式欄では削除" if missing else ""
        if num == "9":
            note = "朗在籍時の優の席"
        if num == "8":
            note = "大人が改ざん後の公式番号"
        pdf.cell(col_w[0], 8, num, border=1)
        pdf.cell(col_w[1], 8, name, border=1)
        pdf.cell(col_w[2], 8, note, border=1)
        pdf.ln()

    pdf.ln(8)
    pdf.set_font("Noto", size=12)
    pdf.cell(0, 8, "── 佐藤優の作文（抜粋・手書き復元） ──", ln=True)
    pdf.set_font("Noto", size=10)
    pdf.multi_cell(
        0,
        6,
        "旧・烏啼の開発現場で、大人たちが「67B_MUNAGI」と呼んでいた。"
        "風穴の奥で、朗を……ぼくは、ここにいると書き残す。"
        "地図の検索窓に、そのまま打ち込んでほしい。",
    )
    pdf.ln(4)
    pdf.multi_cell(
        0,
        6,
        "合唱：ふるさと（当時のクラス合唱曲）\n"
        "※ 閲覧パスワードは、本来の出席番号と合唱曲名をつなげる。",
    )


def main() -> int:
    ensure_font()
    OUT_DIR.mkdir(parents=True, exist_ok=True)

    pdf = FPDF()
    pdf.set_auto_page_break(auto=True, margin=15)
    pdf.add_page()
    build_content(pdf)

    raw = BytesIO()
    pdf.output(raw)
    raw.seek(0)

    reader = PdfReader(raw)
    writer = PdfWriter()
    for page in reader.pages:
        writer.add_page(page)
    writer.encrypt(user_password=PDF_PASSWORD)

    with open(OUT_PDF, "wb") as f:
        writer.write(f)

    print(f"Wrote {OUT_PDF} (password: {PDF_PASSWORD})")
    return 0


if __name__ == "__main__":
    sys.exit(main())
