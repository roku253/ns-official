#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""v3 story patches for koko-ni-iru external sites (local clones under d:\\謎解き)."""
from __future__ import annotations

import hashlib
import os
import re
from pathlib import Path

SCHOOL = Path(r"d:\謎解き\小学校サイト\kasuminomori-shougakkou")
BOARD = Path(r"d:\謎解き\掲示板\urban-legend-board")
TOWN = Path(r"d:\謎解き\観光サイト\kasuminomori")
MAP = Path(r"d:\謎解き\地図サイト\gougle-map")
VIDEO = Path(r"d:\謎解き\動画サイト\yootube")

SEARCH_ROOTS = [
    Path(r"d:\謎解き"),
    Path(__file__).resolve().parents[2],
]


def sha256_login(name: str, birth: str) -> str:
    payload = (
        name.replace(" ", "").replace("\u3000", "").lower() + "|" + re.sub(r"\D", "", birth)
    )
    return hashlib.sha256(payload.encode("utf-8")).hexdigest()


def find_dir(name: str) -> Path | None:
    for root in SEARCH_ROOTS:
        if not root.is_dir():
            continue
        for dirpath, dirnames, _files in os.walk(root):
            if Path(dirpath).name == name:
                return Path(dirpath)
            # prune deep walks
            if name not in dirnames and len(Path(dirpath).parts) > 12:
                dirnames[:] = []
    return None


def patch_school_login() -> None:
    """school-login.js は isV3YuCredential（20090412）を手動適用済みの想定。"""
    path = SCHOOL / "js" / "school-login.js"
    if "isV3YuCredential" in path.read_text(encoding="utf-8"):
        print("school-login.js already v3")
        return
    print("WARN: school-login.js needs isV3YuCredential — patch manually")


REDIRECT_HTML = """<!DOCTYPE html>
<html lang="ja">
<head>
  <meta charset="UTF-8" />
  <meta http-equiv="refresh" content="0; url={url}" />
  <title>リダイレクト｜霞ノ杜小学校</title>
  <script>location.replace("{url}");</script>
</head>
<body>
  <p><a href="{url}">{label}</a></p>
</body>
</html>
"""


def write_redirect(path: Path, url: str, label: str) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(
        REDIRECT_HTML.format(url=url, label=label),
        encoding="utf-8",
    )
    print("redirect", path.relative_to(SCHOOL))


def patch_school_archives() -> None:
    # TC legacy years → 2020
    for year in ("2016", "2021"):
        write_redirect(
            SCHOOL / "archives" / "time-capsule" / year / "index.html",
            "../2020/",
            "2020年度のタイムカプセルへ",
        )
    # archive index years
    write_redirect(
        SCHOOL / "archives" / "2016" / "index.html",
        "../2019/",
        "令和元年度（2019）保管資料へ",
    )
    write_redirect(
        SCHOOL / "archives" / "2021" / "index.html",
        "../2019/",
        "令和元年度（2019）保管資料へ",
    )

    # 2019 archive hub
    hub = SCHOOL / "archives" / "2019" / "index.html"
    hub.parent.mkdir(parents=True, exist_ok=True)
    if not hub.exists():
        hub.write_text(
            """<!DOCTYPE html>
<html lang="ja">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>保管資料（2019）｜霞ノ杜小学校</title>
  <link rel="stylesheet" href="../../css/style.css" />
  <link rel="stylesheet" href="../../css/layout-municipal.css" />
  <script>window.__TOKEN_RESOURCE_KEY__ = "ext:kasuminomori-shougakkou"</script>
  <script src="../../token-gate.js" defer></script>
  <script src="../../js/school-login.js" defer></script>
  <script src="../../js/school-shell.js" defer></script>
</head>
<body data-sgn-base="../../" data-sgn-active="guide">
  <div id="site-root">
    <div class="sgn-site">
      <div class="sgn-body">
        <div class="sgn-col-main">
          <p class="sgn-crumbs"><a href="../../">ホーム</a> ／ 保管資料（2019）</p>
          <h1 class="sgn-page-title">令和元年度（2019）関連記録</h1>
          <p>2019年度に関係する文書・記録への参照です。</p>
          <ul>
            <li><a href="records/river-roster.html">河川敷清掃 参加者名簿（印刷確認用）</a></li>
            <li><a href="../time-capsule/2020/">タイムカプセル（2020・6年1組作成）</a></li>
          </ul>
        </div>
      </div>
    </div>
  </div>
</body>
</html>
""",
            encoding="utf-8",
        )
        print("created", hub.relative_to(SCHOOL))

    roster = SCHOOL / "archives" / "2019" / "records" / "river-roster.html"
    roster.parent.mkdir(parents=True, exist_ok=True)
    roster.write_text(
        (SCHOOL / "archives" / "2021" / "records" / "river-roster.html")
        .read_text(encoding="utf-8")
        .replace("令和3年10月12日", "令和元年10月12日")
        .replace("令和3年度保管資料", "令和元年度保管資料")
        .replace("（R3）", "（R1）")
        .replace("2011.4.12生", "2009.4.12生")
        .replace("KSE-R3-1012-A（2021活動記録複写）", "KSE-R1-1012-A（2019活動記録複写）"),
        encoding="utf-8",
    )
    print("roster 2019")

    # Fix 2021 roster redirect path in sketch pages
    for rel in (
        "archives/2021/records/sketch.html",
        "archives/2016/records/sketch.html",
    ):
        p = SCHOOL / rel
        if not p.exists():
            continue
        t = p.read_text(encoding="utf-8")
        t2 = (
            t.replace("../../time-capsule/2021/", "../../time-capsule/2020/")
            .replace("../../time-capsule/2016/", "../../time-capsule/2020/")
            .replace("（2021・4年1組）", "（2020・6年1組）")
            .replace("（2016・4年1組）", "（2020・6年1組）")
        )
        if t2 != t:
            p.write_text(t2, encoding="utf-8")
            print("sketch", rel)

    # TC catalog JS
    idx = SCHOOL / "archives" / "time-capsule" / "index.html"
    t = idx.read_text(encoding="utf-8")
    t = t.replace(
        "} else if (year === 2016 || year === 2021) {",
        "} else if (year === 2016 || year === 2019 || year === 2021) {",
    )
    idx.write_text(t, encoding="utf-8")
    print("tc index")

    # README + docs
    for doc in (SCHOOL / "README.md", SCHOOL / "docs" / "information-classification.md"):
        if not doc.exists():
            continue
        t = doc.read_text(encoding="utf-8")
        t = (
            t.replace("2021年度のみ", "2020年度作成分のみ")
            .replace("2021年度", "2020年度")
            .replace("archives/time-capsule/2021/", "archives/time-capsule/2020/")
            .replace("archives/2021/", "archives/2019/")
        )
        doc.write_text(t, encoding="utf-8")
        print("doc", doc.name)

    act = SCHOOL / "activity" / "index.html"
    if act.exists():
        t = act.read_text(encoding="utf-8").replace(
            "2021年の記録は <a href=\"../archives/2021/\">令和3年度保管資料</a>",
            "2019年ごろの記録は <a href=\"../archives/2019/\">令和元年度保管資料</a>",
        )
        act.write_text(t, encoding="utf-8")
        print("activity")


def patch_board(board: Path) -> None:
    script = Path(__file__).parent / "patch-urban-legend-board-v3.py"
    if script.exists():
        import importlib.util

        spec = importlib.util.spec_from_file_location("patch_board", script)
        mod = importlib.util.module_from_spec(spec)
        assert spec.loader
        spec.loader.exec_module(mod)
        mod.main()
        return
    index = board / "index.html"
    if index.exists():
        print("board exists but patch script missing:", index)


def patch_town(town: Path) -> None:
    """Replace 2021 paths with 2019 in kasuminomori town site."""
    count = 0
    for path in town.rglob("*.html"):
        t = path.read_text(encoding="utf-8")
        orig = t
        t = t.replace("/blog/2021/", "/blog/2019/")
        t = t.replace("blog/2021/", "blog/2019/")
        t = t.replace("令和3年8月", "令和元年8月")
        t = t.replace("2021年8月", "2019年8月")
        t = t.replace("2021.8.20", "2019.8.20")
        t = t.replace("kasuminomori-2021-incident", "kasuminomori-2019-incident")
        if t != orig:
            path.write_text(t, encoding="utf-8")
            count += 1
    print("town html patches", count)


def patch_video(yootube: Path) -> None:
    old = yootube / "watch" / "kasuminomori-2021-incident.html"
    new = yootube / "watch" / "kasuminomori-2019-incident.html"
    if new.exists():
        print("video 2019 exists")
        return
    if old.exists():
        t = old.read_text(encoding="utf-8")
        t = (
            t.replace("2021", "2019")
            .replace("令和3", "令和元")
            .replace("aosora_0412", "aosora_0412")
        )
        if "aosora_0412" not in t:
            t = t.replace("</body>", '  <p class="yt-comment-hint" data-kn-story-clue="1">コメント欄: aosora_0412 — なんか重い</p>\n</body>')
        new.parent.mkdir(parents=True, exist_ok=True)
        new.write_text(t, encoding="utf-8")
        write_redirect(
            old,
            "kasuminomori-2019-incident.html",
            "2019年版へ",
        )
        print("video created from 2021")
    else:
        print("video not found under", yootube)


def patch_map(gmap: Path) -> None:
    for path in gmap.rglob("*.html"):
        t = path.read_text(encoding="utf-8")
        orig = t
        t = t.replace("2021", "2019") if "kasuminomori" in t.lower() or "霞" in t else t
        if t != orig:
            path.write_text(t, encoding="utf-8")
            print("map", path.relative_to(gmap))


def main() -> int:
    if SCHOOL.is_dir():
        patch_school_login()
        patch_school_archives()
    else:
        print("SKIP school (not found):", SCHOOL)

    if BOARD.is_dir():
        patch_board(BOARD)
    else:
        print("SKIP board:", BOARD)

    if TOWN.is_dir():
        patch_town(TOWN)
        extract = TOWN / "package.json"
        if extract.exists():
            import subprocess

            subprocess.run(["npm", "run", "extract"], cwd=TOWN, check=False)
            print("town: npm run extract")
    else:
        print("SKIP town:", TOWN)

    if MAP.is_dir():
        patch_map(MAP)
    else:
        print("SKIP map:", MAP)

    if VIDEO.is_dir():
        patch_video(VIDEO)
    else:
        print("SKIP video:", VIDEO)

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
