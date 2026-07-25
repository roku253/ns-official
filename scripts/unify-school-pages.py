#!/usr/bin/env python3
"""Unify school site pages: shell script, remove duplicate footers/fiction notes."""
from pathlib import Path
import re

ROOT = Path(r"d:\謎解き\小学校サイト\kasuminomori-shougakkou")
FICTION_RE = re.compile(
    r'\s*<p class="school-fiction-note"[^>]*>.*?</p>\s*',
    re.DOTALL,
)
FOOTER_RE = re.compile(
    r'\s*<footer class="sgn-footer"[^>]*>.*?</footer>\s*',
    re.DOTALL,
)
BANNER_NAV_RE = re.compile(
    r'\s*<div class="sgn-banner">.*?</nav>\s*',
    re.DOTALL,
)
BANNER_ONLY_RE = re.compile(
    r'\s*<div class="sgn-banner">.*?</div>\s*',
    re.DOTALL,
)


def patch_file(path: Path) -> None:
    rel = str(path.relative_to(ROOT)).replace("\\", "/")
    if rel.startswith("partials/"):
        return

    text = path.read_text(encoding="utf-8")
    orig = text

    text = FICTION_RE.sub("\n", text)
    text = FOOTER_RE.sub("\n", text)
    text = BANNER_NAV_RE.sub("\n", text)
    text = BANNER_ONLY_RE.sub("\n", text)

    if "school-shell.js" not in text and "<body" in text:
        m = re.search(r'(<script\s+src="[^"]*token-gate\.js"[^>]*>\s*</script>)', text)
        if m:
            depth = rel.count("/")
            base = "../" * depth if depth else "./"
            shell = f'\n  <script src="{base}js/school-shell.js" defer></script>'
            text = text.replace(m.group(1), m.group(1) + shell, 1)

    path.write_text(text, encoding="utf-8")
    if text != orig:
        print("cleaned", rel)


def main() -> None:
    for html in ROOT.rglob("*.html"):
        patch_file(html)


if __name__ == "__main__":
    main()
