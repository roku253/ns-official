# -*- coding: utf-8 -*-
"""Apply v3 story patches to urban-legend-board/index.html"""
import os

def find_board_root():
    root = r"d:\謎解き"
    for dirpath, _dirnames, _files in os.walk(root):
        if dirpath.endswith("urban-legend-board"):
            return dirpath
    raise SystemExit("urban-legend-board not found")


def main():
    board = find_board_root()
    path = os.path.join(board, "index.html")
    with open(path, encoding="utf-8") as f:
        s = f.read()

    pin = """
    <div class="panel" id="pin-fixed" data-kn-story-clue="1">
      <div class="panel-h">【固定】板主より</div>
      <div class="panel-b" style="font-size:12px;line-height:1.6;">
        <p style="margin:0 0 8px;"><strong>怪奇・未解決案件の情報提供について</strong></p>
        <p style="margin:0 0 6px;">当掲示板では、未解決の怪奇・失踪・都市伝説に関する情報を収集しています。「記録に残すべきかもしれない」と感じた情報があれば、以下からご連絡ください。匿名で受け付けています。</p>
        <p style="margin:0 0 6px;"><a href="#form-anon">→ 情報提供フォーム（匿名）</a></p>
        <p style="margin:0;font-size:11px;color:#666;">※いただいた情報は<strong>記録班</strong>の調査員が確認します。返信はできない場合があります。板管理者とは別組織です。</p>
      </div>
    </div>

"""

    anchor = '    <div class="panel" id="top">'
    if "pin-fixed" not in s and anchor in s:
        s = s.replace(anchor, pin + anchor, 1)

    repl = [
        ("【2021】霞ノ杜・三日間の神隠し？", "【2019】霞ノ杜・神隠し伝言"),
        ("<!-- ===================== 謎スレ B：2021霞ノ杜 ===================== -->",
         "<!-- ===================== 謎スレ B：2019霞ノ杜 ===================== -->"),
        ("2019/08/12(月) 21:04:11 ID:Kn2019a", "PLACEHOLDER"),
    ]
    # main thread body replacements
    old_news = """      <div class="res"><span class="res-num">1</span><span class="res-name">名無しさん</span><span class="res-date">2021/08/12(金) 21:04:11 ID:Kn2021a</span>
        <div class="res-body">霞ノ杜のローカルで「子どもが行方不明、数日後に保護」と出てた。町の古い伝承「三人が山に入り二人だけ戻る」に無理やり当てはめてる人多くない？</div></div>
      <div class="res"><span class="res-num">2</span><span class="res-name">名無しさん</span><span class="res-date">2021/08/13(土) 08:22:40 ID:Kn2021b</span>
        <div class="res-body">公式は氏名非公開。板では「ソラくん」「青空」「転校した子」が混ざってて読めない。同じ子なのか別なのか。</div></div>
      <div class="res"><span class="res-num">3</span><span class="res-name">名無しさん</span><span class="res-date">2021/08/13(土) 19:44:02 ID:Kn2021d</span>
        <div class="res-body">伝承は江戸時代からの話らしい。2021の件と一緒に語るのは後付けだろ、でも怖いのは怖い。</div></div>
      <div class="res"><span class="res-num">4</span><span class="res-name">名無しさん</span><span class="res-date">2021/08/14(日) 14:11:09 ID:Kn2021c</span>
        <div class="res-body">地図で霞ノ杜検索すると町立第一小学校が出る。表記ゆれで「霞ノ杜第一小学校」とも。</div></div>
      <div class="res"><span class="res-num">5</span><span class="res-name">名無しさん</span><span class="res-date">2021/08/15(日) 02:33:18 ID:Kn2021e</span>
        <div class="res-body">深夜に長文書こうとしたら規制で消された人いた。保護者っぽい文体だった。</div></div>"""

    new_news = """      <div class="res"><span class="res-num">1</span><span class="res-name">名無しさん</span><span class="res-date">2019/08/12(月) 21:04:11 ID:Kn2019a</span>
        <div class="res-body">霞ノ杜のローカルで「小学生が烏啼山道で負傷、登山事故扱い」と出てた。町の古い伝承「三人が山に入り、二人だけが戻る」に無理やり当てはめてる人多くない？</div></div>
      <div class="res"><span class="res-num">2</span><span class="res-name">名無しさん</span><span class="res-date">2019/08/13(火) 08:22:40 ID:Kn2019b</span>
        <div class="res-body">公式は氏名非公開。板では「ソラくん」「青空」「転校した子」が混ざってて読めない。同じ子なのか別なのか。</div></div>
      <div class="res"><span class="res-num">3</span><span class="res-name">名無しさん</span><span class="res-date">2019/08/13(火) 19:44:02 ID:Kn2019d</span>
        <div class="res-body">伝承は江戸時代からの話らしい。2019の件と一緒に語るのは後付けだろ、でも怖いのは怖い。</div></div>
      <div class="res"><span class="res-num">4</span><span class="res-name">名無しさん</span><span class="res-date">2019/08/14(水) 14:11:09 ID:Kn2019c</span>
        <div class="res-body">地図で霞ノ杜検索すると町立第一小学校が出る。表記ゆれで「霞ノ杜第一小学校」とも。</div></div>
      <div class="res"><span class="res-num">5</span><span class="res-name">名無しさん</span><span class="res-date">2019/08/15(木) 02:33:18 ID:Kn2019e</span>
        <div class="res-body">深夜に長文書こうとしたら規制で消された人いた。保護者っぽい文体だった。スタブは下の深夜スレにも残ってる。</div></div>"""

    if old_news in s:
        s = s.replace(old_news, new_news, 1)

    old_tr = """      <div class="res"><span class="res-num">1</span><span class="res-name">名無しさん</span><span class="res-date">2021/09/02(木) 18:11:00 ID:Tr2021a</span>
        <div class="res-body">第一小学校の口では「転校した子」がいるらしい。でも行き先の学校名、どこにも書いてない。</div></div>
      <div class="res"><span class="res-num">2</span><span class="res-name">名無しさん</span><span class="res-date">2021/09/03(金) 07:22:14 ID:Tr2021b</span>
        <div class="res-body">ソラくんって呼び方と青空って呼び方、同じ子？　見た人と見てない人がいる。</div></div>
      <div class="res"><span class="res-num">3</span><span class="res-name">板管理者</span><span class="res-date">2021/09/04(土) 11:05:33 ID:ADMIN_ID_105</span>
        <div class="res-body">個人特定につながる書き込みは削除します。スレッドは情報整理用として残します。</div></div>
      <div class="res"><span class="res-num">4</span><span class="res-name">名無しさん</span><span class="res-date">2024/09/20(金) 21:40:11 ID:Tr2024a</span>
        <div class="res-body">2021スレと矛盾してる気がする。公式記録と板、どっち信じるか問題。</div></div>"""

    new_tr = """      <div class="res"><span class="res-num">1</span><span class="res-name">名無しさん</span><span class="res-date">2019/09/02(月) 18:11:00 ID:Tr2019a</span>
        <div class="res-body">第一小学校の口では「転校した子」がいるらしい。でも行き先の学校名、どこにも書いてない。</div></div>
      <div class="res"><span class="res-num">2</span><span class="res-name">名無しさん</span><span class="res-date">2019/09/03(火) 07:22:14 ID:Tr2019b</span>
        <div class="res-body">ソラくんって呼び方と青空って呼び方、転校した子って呼び方——同じ子？　見た人と見てない人がいる。</div></div>
      <div class="res"><span class="res-num">3</span><span class="res-name">板管理者</span><span class="res-date">2019/09/04(水) 11:05:33 ID:ADMIN_ID_105</span>
        <div class="res-body">個人特定につながる書き込みは削除します。スレッドは情報整理用として残します。</div></div>
      <div class="res"><span class="res-num">4</span><span class="res-name">名無しさん</span><span class="res-date">2024/09/20(金) 21:40:11 ID:Tr2024a</span>
        <div class="res-body">2019のスレと公式記録、食い違ってる気がする。板と学校、どっち信じるか問題。</div></div>"""

    if old_tr in s:
        s = s.replace(old_tr, new_tr, 1)

    old_vid = """      <div class="res"><span class="res-num">1</span><span class="res-name">名無しさん</span><span class="res-date">2024/09/19(木) 23:01:22 ID:Yt0vXp5L</span>
        <div class="res-body">某スポット巡り動画。看板はっきり映ってる：<br />
          <a href="https://roku253.github.io/yootube/" rel="noopener">https://roku253.github.io/yootube/</a></div></div>"""

    new_vid = """      <div class="res"><span class="res-num">1</span><span class="res-name">名無しさん</span><span class="res-date">2024/09/19(木) 23:01:22 ID:Yt0vXp5L</span>
        <div class="res-body">2019年の霞ノ杜ニュース風、まだ残ってる：<br />
          <a href="https://roku253.github.io/yootube/watch/kasuminomori-2019-incident.html" rel="noopener">https://roku253.github.io/yootube/watch/kasuminomori-2019-incident.html</a><br />
          コメント欄、なんか重い。</div></div>"""

    if old_vid in s:
        s = s.replace(old_vid, new_vid, 1)

    s = s.replace("2021/08/15(日) 02:41:00", "2019/08/15(木) 02:41:00")

    form = """    <!-- ===================== 記録班・匿名フォーム（ダミー） ===================== -->
    <div class="form-block" id="form-anon" data-kn-story-clue="1">
      <strong>情報提供フォーム（匿名）— 記録班宛</strong>
      <p style="margin:0 0 8px;font-size:11px;color:#555;">怪奇・未解決案件のメモを送る窓口です。氏名の記載は不要です。</p>
      <form class="fake-post" data-label="匿名提供">
        <label>件名（任意）</label>
        <textarea class="thread-title-input" placeholder="（なし）"></textarea>
        <label>内容</label>
        <textarea placeholder="気になった出来事・URL・時期など"></textarea>
        <button type="submit">送信する</button>
      </form>
      <div class="post-deny-msg" aria-live="polite"></div>
    </div>

"""

    if "form-anon" not in s:
        s = s.replace(
            "    <!-- ===================== 新規スレッド（ダミー） ===================== -->",
            form + "    <!-- ===================== 新規スレッド（ダミー） ===================== -->",
            1,
        )

    s = s.replace(
        'return f === "purged_delete" || f === "purged_keep";',
        'return f === "purged_delete" || f === "purged_keep" || f === "purged_partial";',
    )
    s = s.replace(
        'if (v !== "purged_delete" && v !== "purged_keep") return;',
        'if (v !== "purged_delete" && v !== "purged_keep" && v !== "purged_partial") return;',
    )

    for a, b in repl:
        if a != "PLACEHOLDER" and a in s:
            s = s.replace(a, b)

    with open(path, "w", encoding="utf-8") as f:
        f.write(s)
    print("patched:", path)


if __name__ == "__main__":
    main()
