#!/usr/bin/env python3
"""Remove staff-prelock / data-staff-page from kasuminomori school HTML."""
from __future__ import annotations

import re
from pathlib import Path

ROOT = Path(r"d:\謎解き\小学校サイト\kasuminomori-shougakkou")

PRELOCK = re.compile(
    r"\s*<script>\s*try\s*\{\s*"
    r'if\s*\(sessionStorage\.getItem\("kn_graduate_auth_v1"\)\s*!==\s*"1"\)\s*\{\s*'
    r'document\.documentElement\.classList\.add\("staff-prelock"\);\s*\}\s*'
    r"\}\s*catch\s*\(e\)\s*\{\}\s*</script>\s*",
    re.S,
)

GRADUATE_PAGES = {
    ROOT / "archives" / "time-capsule" / "2016" / "index.html",
    ROOT / "archives" / "2016" / "index.html",
    ROOT / "archives" / "2016" / "art-club.html",
}


def main() -> int:
    for path in ROOT.rglob("*.html"):
        text = path.read_text(encoding="utf-8")
        orig = text
        text = PRELOCK.sub("\n", text)
        text = text.replace(" data-staff-page", "")
        if path in GRADUATE_PAGES and "data-graduate-page" not in text:
            text = text.replace("<body ", "<body data-graduate-page ", 1)
        if path == ROOT / "index.html":
            text = text.replace(" data-require-login", "")
        if path == ROOT / "archives" / "time-capsule" / "index.html":
            text = text.replace(
                'if (year >= 2013 && year <= 2019) a.setAttribute("data-require-login", "");',
                "",
            )
            text = text.replace(
                "閲覧には認証が必要です（お問い合わせのFAQをご参照ください）。",
                "卒業生の方はログイン後に2013〜2019年度の保管を閲覧できます。",
            )
        if path == ROOT / "portal" / "newsletters" / "index.html":
            text = re.sub(
                r'<p style="font-size:12px;color:#666;">.*?</p>',
                '<p style="font-size:12px;color:#666;">'
                "未ログイン時は令和2〜8年度（2020〜2026年）を表示します。"
                "卒業生ログイン後は平成25〜31/令和元年度（2013〜2019年）のアーカイブを表示します。"
                "</p>",
                text,
                count=1,
            )
        if text != orig:
            path.write_text(text, encoding="utf-8")
            print("updated", path.relative_to(ROOT))
    print("done")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
