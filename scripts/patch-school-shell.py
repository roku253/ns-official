#!/usr/bin/env python3
"""Add school-shell.js and data-sgn-* attributes to all school HTML pages."""
from pathlib import Path
import re

ROOT = Path(r"d:\謎解き\小学校サイト\kasuminomori-shougakkou")

ACTIVE_MAP = {
    "index.html": ("home", "./"),
    "guide/index.html": ("guide", "../"),
    "contact/index.html": ("contact", "../"),
    "access/index.html": ("access", "../"),
    "portal/events/index.html": ("events", "../../"),
    "portal/life/index.html": ("life", "../../"),
    "portal/newsletters/index.html": ("newsletter", "../../"),
    "portal/grade-news/index.html": ("newsletter", "../../"),
    "portal/lunch/index.html": ("life", "../../"),
    "portal/health/index.html": ("newsletter", "../../"),
    "portal/nurse/index.html": ("newsletter", "../../"),
    "portal/pta/index.html": ("life", "../../"),
    "portal/evaluation/index.html": ("guide", "../../"),
    "portal/shin1/index.html": ("life", "../../"),
    "archives/2016/index.html": ("guide", "../../"),
    "archives/time-capsule/index.html": ("contact", "../../"),
    "archives/time-capsule/2016/index.html": ("contact", "../../../"),
}

SHELL_SCRIPT = '<script src="{base}js/school-shell.js" defer></script>'


def depth_base(rel: str) -> str:
    return ACTIVE_MAP.get(rel.replace("\\", "/"), ("home", "../../"))[1]


def active_for(rel: str) -> str:
    return ACTIVE_MAP.get(rel.replace("\\", "/"), ("home", "../../"))[0]


def patch_file(path: Path, rel: str) -> None:
    text = path.read_text(encoding="utf-8")
    if "school-shell.js" in text and "data-sgn-base" in text:
        return

    base = depth_base(rel)
    active = active_for(rel)
    shell = SHELL_SCRIPT.format(base=base)
    changed = False

    if 'data-sgn-base="."' in text:
        text = text.replace('data-sgn-base="."', f'data-sgn-base="{base}"')
        changed = True

    if "<body" in text and "data-sgn-base" not in text:
        text = re.sub(
            r"<body([^>]*)>",
            rf'<body\1 data-sgn-base="{base}" data-sgn-active="{active}">',
            text,
            count=1,
        )
        changed = True

    if "school-shell.js" not in text:
        inserted = False
        for marker in ("js/school-login.js", "js/kn-footprint.js", "token-gate.js"):
            m = re.search(
                rf'(<script\s+src="[^"]*{re.escape(marker)}"[^>]*>\s*</script>)',
                text,
            )
            if m:
                text = text.replace(m.group(1), m.group(1) + "\n  " + shell, 1)
                inserted = True
                break
        if not inserted:
            text = text.replace("</head>", "  " + shell + "\n</head>", 1)
        changed = True

    if changed:
        path.write_text(text, encoding="utf-8")
        print("patched", rel)


def main() -> None:
    for html in ROOT.rglob("*.html"):
        if "partials" in str(html):
            continue
        rel = str(html.relative_to(ROOT))
        if rel.startswith("archives/time-capsule/20") and rel.endswith("/index.html"):
            if "/2016/" not in rel and rel != "archives/time-capsule/2016/index.html":
                patch_file(html, "archives/time-capsule/2016/index.html")
                continue
        patch_file(html, rel)


if __name__ == "__main__":
    main()
