#!/usr/bin/env python3
"""
班長会話分類器用教材 CSV を大量生成（koko-ni-iru）。

方針:
- プレイテストで直した1文だけでなく、同じ意図の言い回しを体系的に展開
- 各 response_id に最低 MIN_PER_LABEL 件を目指す
- 実行: python scripts/seed-kn-leader-chat-samples.py
"""
from __future__ import annotations

import csv
import itertools
import random
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / "games/signal-trace/cases/koko-ni-iru/training/leader-chat-samples.csv"

random.seed(42)
MIN_PER_LABEL = 28
MIN_PER_LABEL_CHITCHAT_SLEEPY = 72

Rows = list[tuple[str, str]]


def add(rows: Rows, texts: list[str], label: str) -> None:
    for t in texts:
        s = t.strip()
        if s:
            rows.append((s, label))


def suffixes_chitchat() -> list[str]:
    """挨拶・雑談用（ね / よ / わ を許可）"""
    return ["", "？", "?", "かな", "の", "ね", "よ", "わ", "ですか", "ますか", "かな？"]


def suffixes_topic() -> list[str]:
    """調査トピック用。短い「○○ね」だけが雑談に吸われるのを避け、ね は付けない"""
    return ["", "？", "?", "かな", "の", "ですか", "ますか", "かな？"]


def expand(
    base_phrases: list[str],
    extra_particles: bool = True,
    *,
    particle_set: str = "topic",
) -> list[str]:
    suf = suffixes_chitchat() if particle_set == "chitchat" else suffixes_topic()
    out: set[str] = set()
    for p in base_phrases:
        p = p.strip()
        if not p:
            continue
        out.add(p)
        if extra_particles:
            for s in suf:
                if s and not p.endswith(s):
                    out.add(p + s)
    return list(out)


def expand_chitchat(base_phrases: list[str], extra_particles: bool = True) -> list[str]:
    return expand(base_phrases, extra_particles, particle_set="chitchat")


def cartesian(stems: list[str], tails: list[str]) -> list[str]:
    out: list[str] = []
    for a, b in itertools.product(stems, tails):
        t = (a + b).strip()
        if len(t) >= 2:
            out.append(t)
    return out


def build_corpus() -> dict[str, list[str]]:
    """ラベルごとの代表フレーズ（言い換えは expand / cartesian で増やす）"""
    c: dict[str, list[str]] = {}

    # --- 雑談・生活（particle_set=chitchat → ね 等を許可）---
    c["chitchat.greeting"] = expand_chitchat(
        [
            "おはよう",
            "おはようございます",
            "おはようございます班長",
            "こんにちは",
            "こんばんは",
            "やあ",
            "はじめまして",
            "班長おはよう",
        ]
    )
    c["chitchat.thanks"] = expand_chitchat(
        ["ありがとう", "どうも", "助かった", "ありがとうございます", "感謝", "サンキュー"]
    )
    c["chitchat.sleepy"] = expand_chitchat(
        [
            "ねむい",
            "眠い",
            "眠たい",
            "眠くなってきた",
            "もう眠い",
            "うとうとする",
            "ねむいね",
            "眠いね",
            "眠たいね",
            "だるい",
            "つかれた",
            "疲れた",
        ]
    )
    c["chitchat.tadaima"] = expand_chitchat(
        ["ただいま", "ただいま戻った", "戻った", "戻ってきた", "また来た", "続きやる"]
    )
    c["chitchat.streak.1"] = expand_chitchat(
        [
            "そろそろ調査に戻ろうか",
            "雑談もいいけど怪奇の方",
            "オカルト班としては調査が第一",
            "一息ついたら続きで",
        ]
    )
    c["chitchat.streak.2"] = expand_chitchat(
        [
            "雑談より報告の方が助かる",
            "ログ待ち班長",
            "雑談多くない",
            "調査モードに戻して",
        ]
    )
    c["chitchat.streak.3"] = expand_chitchat(
        [
            "調査の話しよう",
            "雑談はもう十分",
            "班長待機中",
            "報告待ち",
        ]
    )
    c["chitchat.brb"] = expand_chitchat(
        [
            "ご飯食べてからまた調査する",
            "飯食べてから戻る",
            "休憩してくる",
            "ちょっと離れる",
            "一旦離れる",
            "少し休んでくる",
            "トイレ行ってくる",
            "シャワー浴びてからまた調査",
            "散歩してからまた調査",
            "また後で調査する",
            "調査続きはまたあとで",
            "席外す",
            "仮眠とる",
        ]
    )
    c["chitchat.lost"] = expand_chitchat(
        [
            "わからなくなってきた",
            "わかんなくなってきた",
            "わからない",
            "迷ってる",
            "迷った",
            "難しい",
            "むずかしい",
            "きつい",
            "しんどい",
            "つらい",
            "行き詰まった",
            "詰まった",
            "もう無理",
            "頭がごちゃごちゃ",
            "焦ってきた",
            "落ち込んできた",
        ]
    )
    c["chitchat.generic.0"] = expand_chitchat(
        [
            "了解",
            "わかった",
            "OK",
            "オッケー",
            "うんうん",
            "なるほどね",
            "ねこかわいい",
            "猫かわいい",
            "犬かわいい",
            "うさぎかわいい",
            "かわいい",
            "今日暑い",
            "暇だ",
            "コーヒー飲みたい",
            "映画見た",
        ]
    )
    c["chitchat.generic.1"] = expand_chitchat(
        ["はい", "うん", "そうだね", "そっか", "まあそうかも"]
    )
    c["chitchat.hint_refusal"] = expand_chitchat(
        [
            "答え教えて",
            "正解は",
            "攻略方法",
            "ヒントください",
            "答え丸投げしていい",
            "解き方教えて",
            "ネタバレしていい",
        ]
    )
    c["chitchat.what_is.general.0"] = expand_chitchat(
        [
            "小学校って何",
            "湖って何",
            "山って何",
            "学校って何",
            "歴史って何",
        ]
    )
    c["chitchat.what_is.unknown.0"] = expand_chitchat(
        [
            "ヨルシカって何",
            "NSって何",
            "米津玄師って何",
            "バンドって何",
        ]
    )
    c["chitchat.what_is.in_world.0"] = expand_chitchat(
        [
            "gouglemapって何",
            "gouglemapsって何",
            "gougle-mapって何",
            "yootubeって何",
        ]
    )
    c["chitchat.what_is.investigation.0"] = expand_chitchat(
        [
            "タイムカプセルって何",
            "依頼文って何",
            "名簿って何",
            "2019って何",
        ]
    )
    c["chitchat.answer_request"] = expand_chitchat(
        [
            "事件の全容教えて",
            "事件の真相教えて",
            "誰が何をしたのか",
            "結果どういうことなのか",
            "何が起きたのか教えて",
            "結末教えて",
            "犯人は誰",
            "事件どうなったの",
            "全容知りたい",
        ]
    )

    # --- 進め方 ---
    c["procedure.0"] = expand(
        [
            "何から見ればいい",
            "どこから調べる",
            "進め方教えて",
            "手順わからない",
            "最初に何を見る",
            "調査の入口は",
            "どこ当たればいい",
        ]
    )
    c["procedure.1"] = expand(
        ["順番は", "調査の順番どうする", "先に何", "後は何", "ログの順番"]
    )
    c["procedure.2"] = expand(
        ["板のあと何見る", "ログのあと公式記録", "掲示板の次", "ミラーのあと"]
    )
    c["procedure.what_now"] = expand(
        [
            "なにすればいい",
            "何すればいい",
            "どうすればいい",
            "何したらいい",
            "手助けして",
            "次何する",
            "今何をすれば",
            "全然わからない何から",
            "班長何からお願い",
        ]
    )

    # --- 確認疑問（スコープ） ---
    c["confirm_scope.folklore.1"] = expand(
        cartesian(
            ["神隠し", "かみかくし", "言い伝え", "伝承", "三人二人"],
            ["だけ調べればいい", "から入っていい", "見ればいい", "追えばいい", "でいいの"],
        )
    )
    c["confirm_scope.folklore.0"] = expand(
        [
            "神隠しだけだと抜けそう",
            "この事件神隠し一本でいい",
            "伝承だけで足りる",
            "怪奇だけ見ればいい",
        ]
    )
    c["confirm_scope.board.0"] = expand(
        cartesian(
            ["掲示板", "板", "スレ", "ログミラー", "ミラー"],
            ["みればいい", "見ればいい", "だけでいい", "からでいい", "読めばいい", "当たればいい"],
        )
        + ["掲示板みればいいのね", "板見ればいいの", "2019のスレ全部読む"]
    )
    c["confirm_scope.board.1"] = expand(
        [
            "板と学校どっち先",
            "板だけで足りる",
            "掲示板のあと学校",
            "学校より先に板",
        ]
    )
    c["confirm_scope.school.0"] = expand(
        cartesian(
            ["学校", "小学校", "名簿", "TC", "タイムカプセル"],
            ["いつ見る", "いつ見ればいい", "板のあと", "先に見る", "ログインどうする"],
        )
        + [
            "学校のタイムカプセルに在学時の名前と生年月必要なんだけどどうすればいい",
            "TCログインどうすればいい",
            "タイムカプセル生年月日必要",
        ]
    )
    c["confirm_scope.school.1"] = expand(
        cartesian(
            ["タイムカプセル", "名簿", "TC", "ソラ"],
            ["と名簿", "セット", "板のあと", "一緒に", "同時に見る"],
        )
    )
    c["confirm_scope.town.0"] = expand(
        cartesian(
            ["町", "霞ノ杜", "公式サイト", "資料室", "町のサイト"],
            ["いつ見る", "見ればいい", "調べればいい", "からでいい"],
        )
    )
    c["confirm_scope.map.0"] = expand(
        cartesian(
            ["地図", "マップ", "烏啼", "山道"],
            ["見ればいい", "先に見る", "いつ見る", "関係ある"],
        )
    )
    c["confirm_scope.accident.0"] = expand(
        cartesian(
            ["動画", "映像", "2019", "事故", "ニュース"],
            ["から入る", "見ればいい", "先に見る", "関係ある"],
        )
    )
    c["confirm_scope.sora.0"] = expand(
        [
            "ソラだけ追う",
            "ソラから入っていい",
            "青空の子気になる",
            "ソラの話先に",
            # topic では ね を自動付与しない。必要ならフレーズごと明示
            "ソラだけ追うね",
            "ソラから入っていいね",
            "青空の子気になるね",
            "ソラの話先にね",
        ]
    )
    c["confirm_scope.request_letter.0"] = expand(
        [
            "依頼文だけ読めばいい",
            "依頼文からでいい",
            "依頼者の文先に",
            "フォームの文見ればいい",
        ]
    )
    c["confirm_scope.investigation_scope.0"] = expand(
        cartesian(
            ["調査範囲", "見る範囲", "調べる範囲"],
            ["どこまで", "は", "教えて", "決めたい"],
        )
        + ["全部見る必要ある", "何を調べればいい範囲"]
    )
    c["confirm_scope.investigation_scope.1"] = expand(
        cartesian(
            ["いきなり", "順不同で", "外のサイト"],
            ["全部", "いい", "見ていい", "当たっていい"],
        )
    )
    c["confirm_scope.general.0"] = expand(
        cartesian(
            ["この案件", "今回", "調査"],
            ["何から", "おすすめ", "一本道", "順番"],
        )
    )

    # --- 何疑問 ---
    c["wh_question.folklore.0"] = expand(
        [
            "三人入って二人戻るって何",
            "神隠しの三人二人どういう意味",
            "伝承の型って何",
            "言い伝えの三人二人とは",
        ]
    )
    c["wh_question.folklore.1"] = expand(
        cartesian(
            ["言い伝え", "伝承", "神隠しの話", "町の歴史"],
            ["と板", "とスレ", "と2019", "どう違う", "の関係"],
        )
    )
    c["wh_question.board.0"] = expand(
        cartesian(
            ["板", "スレ", "掲示板", "ログミラー", "削除スタブ"],
            ["って何", "とは", "信じていい", "どういうこと", "何のログ"],
        )
    )
    c["wh_question.school.0"] = expand(
        cartesian(
            ["名簿", "TC", "タイムカプセル", "転校", "行き先"],
            ["の空欄", "どういうこと", "とは", "おかしい", "意味"],
        )
    )
    c["wh_question.sora.0"] = expand(
        cartesian(
            ["ソラ", "青空の子", "ソラの話"],
            ["って誰", "は実在", "は架空", "気になる", "関係ある"],
        )
    )
    c["wh_question.general.0"] = expand(
        cartesian(
            ["今", "いま", "この時点で"],
            ["わからないこと", "一番おかしい", "矛盾", "気になる点"],
        )
    )
    c["wh_question.requester"] = expand(
        [
            "依頼人って誰なの",
            "依頼者は誰",
            "誰が依頼してきたの",
            "依頼人の身元わかる",
            "匿名だけど誰なの",
        ]
    )
    c["wh_question.boy_identity"] = expand(
        [
            "神隠しに合った少年はだれ",
            "少年は誰かわからない",
            "消えた子の正体",
            "誰が神隠しになったの",
            "神隠しに合った少年はだれかあんまりわかってないんだね",
            "少年の名前は確定していない",
            "名前はまだはっきりしない",
            "呼び方がバラバラで誰かわからない",
        ]
    )

    # --- 観察共有 ---
    c["sharing_findings.board"] = expand(
        cartesian(
            ["板で", "スレで", "掲示板で", "レスで"],
            [
                "名前がバラバラ",
                "削除スタブあった",
                "転校と矛盾",
                "ソラいないって書いてあった",
                "見たって書いてあるのに",
                "2019だけおかしい",
            ],
        )
        + [
            "ソラくんと青空と転校した子っていろいろあった",
            "「ソラくん」「青空」「転校した子」っていろいろあったから",
            "板でソラと青空の呼び方が混ざってる",
        ]
    )
    c["sharing_findings.school"] = expand(
        [
            "名簿に載ってない名前あった",
            "TCに名前だけの欄",
            "行き先が空欄",
            "転校の体裁なのに行き先ない",
            "ログインできた",
            "神隠しに合った少年は転校したってことになってるらしい",
            "神隠しの少年が転校したって書いてあった",
            "てんこうしたってことになってる",
        ]
    )
    c["sharing_findings.folklore"] = expand(
        [
            "神隠しがあったんだね",
            "神隠しの話あった",
            "伝承ページおかしい",
            "三人二人の記述見つけた",
        ]
    )
    c["sharing_findings.town"] = expand(
        [
            "霞ノ杜町で事件があったみたい",
            "町で2019の事件があった",
            "公式サイトに2019の記事",
            "議事録抜粋変",
            "町の歴史ページに怪しい記述",
        ]
    )
    c["sharing_findings.general"] = expand(
        cartesian(
            ["気になった", "おかしい", "引っかかった", "変だと思った"],
            ["", "のは", "のが", "点は"],
        )
        + ["こういうの見つけた", "違和感ある", "矛盾っぽい"]
    )

    # --- 進行・板終了・次 ---
    c["board.exhausted"] = expand(
        [
            "掲示板にはもう特に情報なさそう",
            "板はもう読み終わった",
            "板に特に情報なさそう",
            "スレ追っても新情報ない",
            "ログは一通読んだ",
            "板は出尽くし",
            "ミラー全部見た",
        ]
    )
    c["plan.next_town"] = expand(
        [
            "次は霞ノ杜町のサイト内か調べてみる",
            "霞ノ杜町のサイトを見る",
            "町の公式サイトから調べる",
            "次は町のページ",
            "公式サイト行く",
            "資料室見に行く",
            "霞ノ杜って町を調べたほうがよさそう",
            "町のサイト調べてみる",
            "霞ノ杜調べたほうがよさそう",
        ]
    )
    # --- 意見 ---
    c["request_opinion.0"] = expand(
        ["班長はどう思う", "怪奇説どう", "記録がおかしい線本当", "班長の見解は"]
    )
    c["request_opinion.1"] = expand(
        ["うん気になる", "どう見てる", "本当に食い違う", "班としてどう"]
    )
    c["request_opinion.2"] = expand(
        cartesian(
            ["早く", "もう", "そろそろ"],
            ["結論", "答え", "方針", "整理"],
        )
        + ["まだ材料集め", "焦ってきた", "班長急がせないで"]
    )

    c["acknowledge.player_stuck"] = expand(
        [
            "全然わからない",
            "まだ不明",
            "誰かわかってないんだ",
            "わけわからん",
            "頭整理つかない",
            "まだピンとこない",
        ]
    )

    # --- ポリシー ---
    c["policy.sibling_case"] = expand(
        [
            "消えた少年の正体は",
            "別案件のヒント",
            "信号跡の別の謎",
            "他の事件の話",
            "別の謎の答え",
        ]
    )
    c["policy.universal_folklore"] = expand(
        [
            "神隠しって何",
            "神隠しとは",
            "言い伝えって一般的にどういう意味",
            "伝承って何意味",
        ]
    )
    c["policy.inactive_case"] = expand(
        cartesian(
            ["もう", "この", "別の"],
            ["終わった", "閉じてる", "続き", "案件"],
        )
        + ["受付閉じてる", "続きある", "まだやることある"]
    )

    # --- メタ・曖昧 ---
    c["meta_test.0"] = expand(
        ["届いてる", "送信テスト", "メッセージ届いてますか", "これ動いてる", "通信テスト"]
    )
    c["meta_test.1"] = expand(
        cartesian(
            ["受信", "通信", "メッセージ"],
            ["OK", "問題なし", "見えてる", "大丈夫"],
        )
    )
    c["vague.0"] = expand_chitchat(
        ["うん", "なるほど", "へー", "ふむ", "えー", "んー", "…", "あー"]
    )
    c["vague.1"] = expand(
        ["板", "学校見てる", "町", "地図", "今板", "サイト見てる", "調べてる"]
    )

    return c


def add_offtopic_daily_chitchat(rows: Rows) -> None:
    """動物・日常感想 — tadaima 誤学習対策（ゲーム語なし）"""
    phrases = [
        "ねこかわいい",
        "猫かわいい",
        "犬かわいい",
        "いぬかわいい",
        "うさぎかわいい",
        "かわいいね",
        "かわいすぎ",
        "ペットかわいい",
        "今日天気いい",
        "暇すぎる",
        "ラーメン食べたい",
        "チャーハン食べた",
        "チャーハン食べたい",
        "ご飯食べた",
        "コーヒー美味しい",
        "アニメおもしろい",
        "気分いい",
        "カレー好き",
        "ラーメン好き",
        "コーヒー好き",
        "ピザ食べたい",
        "趣味は映画",
    ]
    for p in phrases:
        rows.append((p, "chitchat.generic.0"))
    for _ in range(4):
        for p in phrases:
            rows.append((p, "chitchat.generic.0"))


def add_casual_ne_guard(rows: Rows) -> None:
    """ゲーム語なしの「○○ね」— 末尾ねバイアス対策の明示教材"""
    pairs = [
        ("ねむいね", "chitchat.sleepy"),
        ("眠いね", "chitchat.sleepy"),
        ("眠たいね", "chitchat.sleepy"),
        ("だるいね", "chitchat.sleepy"),
        ("つかれたね", "chitchat.sleepy"),
        ("疲れたね", "chitchat.sleepy"),
        ("うとうとするね", "chitchat.sleepy"),
        ("もう眠いね", "chitchat.sleepy"),
        ("うんね", "chitchat.generic.1"),
        ("そうだね", "chitchat.generic.1"),
        ("なるほどね", "chitchat.generic.0"),
        ("了解ね", "chitchat.generic.0"),
        ("おつかれね", "chitchat.thanks"),
        ("わからなくなってきた", "chitchat.lost"),
        ("わかんなくなってきた", "chitchat.lost"),
        ("迷ってる", "chitchat.lost"),
        ("難しい", "chitchat.lost"),
        ("きつい", "chitchat.lost"),
    ]
    for t, lb in pairs:
        rows.append((t, lb))
    # 末尾「ね」系を ML に強く刻む（各 3 回）
    for _ in range(3):
        for t, lb in pairs:
            rows.append((t, lb))


def add_quality_samples(rows: Rows) -> None:
    """品質ラベルは「実際のゴミ入力」のみ。普通の日本語（化けてる等の相談含む）は載せない。"""
    for _ in range(55):
        rows.append(("あ" * random.randint(6, 16), "quality.noise"))
    for _ in range(40):
        rows.append(("asdfghjklqwerty"[: random.randint(5, 12)], "quality.noise"))
    add(
        rows,
        expand(["...", "。。。", "あああ", "いいい", "ううう", "testtest"]),
        "quality.noise",
    )
    add(
        rows,
        expand(
            [
                "konnichiwa",
                "hello",
                "test",
                "asdf",
                "bbbb",
            ]
        ),
        "quality.romaji_only",
    )
    add(rows, expand(["？？？", "???"]), "quality.romaji_only")
    add(
        rows,
        expand(
            [
                "かすみのもりで事件があったみたい",
                "かすみのもりのサイトを見た",
                "そらのことを調べてる",
                "あおぞらの子が気になる",
                "かみかくしについてしらべればいいの",
                "けいじばんを見てきた",
                "しょうがっこうの名簿を見た",
                "うていさんどうってどこ",
                "たいむかぷせるにログインしたい",
            ],
            particle_set="chitchat",
        ),
        "quality.hiragana_only",
    )
    add(
        rows,
        [
            "ï¿½ï¿½ï¿½",
            "縺薙縺薙↓縺",
            "□□□",
            "□□□？？？",
            "???",
            "????",
        ],
        "quality.garbled",
    )
    add(
        rows,
        expand(
            [
                "同じ文また送る",
                "さっきと同じ",
                "もう一度送る",
                "重複テスト",
            ]
        ),
        "quality.repeat",
    )


def add_leader_identity_chitchat_guard(rows: Rows) -> None:
    """班長の名前・素性への質問は meta_test / 案件ラベルに載せない。"""
    add(
        rows,
        expand_chitchat(
            [
                "班長の名前なんて言うの",
                "班長の名前なんて言うの？",
                "班長の名前は",
                "名前は？",
                "誰？",
                "何者？",
                "班長って誰",
                "君の名前知ってる",
                "名前なんて言うの",
            ]
        ),
        "chitchat.generic.0",
    )


def add_nostalgic_youth_chitchat_guard(rows: Rows) -> None:
    """懐古・日常の「少年」は procedure / 調査ラベルに載せない。"""
    add(
        rows,
        expand_chitchat(
            [
                "少年のときっていいよね",
                "少年のときいいよね",
                "少年時代っていい",
                "少年はいいよね",
                "昔の少年みたい",
            ]
        ),
        "chitchat.generic.0",
    )


def add_entertainment_pop_culture_guard(rows: Rows) -> None:
    """音楽・エンタメ雑談は chitchat.generic（sora 系に吸われないよう）。"""
    add(
        rows,
        expand_chitchat(
            [
                "ヨルシカ知ってる",
                "ヨルシカ知ってる？",
                "ヨルシカ好き",
                "米津玄師知ってる",
                "米津玄師好き？",
                "あいみょん知ってる",
                "King Gnu知ってる",
                "RADWIMPS好き",
                "Official髭男dism知ってる",
                "藤井風聞いた",
                "星野源好き",
                "バンド知ってる",
                "好きな歌手いる",
                "アニメおすすめ知ってる",
                "映画好きなの知ってる",
                "ライブ行ったことある",
                "新曲聞いた",
            ]
        ),
        "chitchat.generic.0",
    )


def add_readable_japanese_quality_guard(rows: Rows) -> None:
    """短い自然な日本語が quality.* に吸われないよう、調査・雑談の正例を追加。"""
    add(
        rows,
        expand_chitchat(
            [
                "湖あるんだね",
                "湖があるんだ",
                "湖見つけた",
                "山あるね",
                "海きれいだね",
                "景色いい",
                "きれいな場所",
                "ここおかしい",
                "変なページ",
                "面白い記述",
                "気になる一文",
                "違和感ある",
            ]
        ),
        "sharing_findings.general",
    )
    add(
        rows,
        expand_chitchat(
            [
                "猫かわいい",
                "いい天気",
                "お腹すいた",
                "コーヒー飲みたい",
                "音楽聴いてる",
            ]
        ),
        "chitchat.generic.0",
    )
    add(
        rows,
        expand(
            [
                "文字化けしてる",
                "表示が化けてる",
                "文字化けしてるみたい",
                "読めない文字が出る",
                "画面が文字化け",
                "化けてる気がする",
            ],
            particle_set="chitchat",
        ),
        "vague.0",
    )


def pad_label(rows: Rows, label: str, texts: list[str], min_count: int = MIN_PER_LABEL) -> None:
    """ラベルあたり最低件数まで言い換えを複製（重複除去前）"""
    existing = [t for t, lb in rows if lb == label]
    pool = list(dict.fromkeys(existing + texts))
    i = 0
    while len([1 for _, lb in rows if lb == label]) < min_count and pool:
        rows.append((pool[i % len(pool)], label))
        i += 1


def main() -> int:
    rows: Rows = []
    corpus = build_corpus()

    for label, texts in corpus.items():
        add(rows, texts, label)
        min_n = MIN_PER_LABEL_CHITCHAT_SLEEPY if label == "chitchat.sleepy" else MIN_PER_LABEL
        pad_label(rows, label, texts, min_n)

    add_quality_samples(rows)
    add_readable_japanese_quality_guard(rows)
    add_entertainment_pop_culture_guard(rows)
    add_leader_identity_chitchat_guard(rows)
    add_nostalgic_youth_chitchat_guard(rows)
    add_offtopic_daily_chitchat(rows)
    add_casual_ne_guard(rows)

    random.shuffle(rows)
    seen: set[tuple[str, str]] = set()
    unique: Rows = []
    for t, lb in rows:
        key = (t, lb)
        if key in seen:
            continue
        seen.add(key)
        unique.append((t, lb))

    counts: dict[str, int] = {}
    for _, lb in unique:
        counts[lb] = counts.get(lb, 0) + 1

    OUT.parent.mkdir(parents=True, exist_ok=True)
    with OUT.open("w", encoding="utf-8", newline="") as f:
        w = csv.writer(f)
        w.writerow(["text", "response_id"])
        w.writerows(unique)

    low = [lb for lb, n in counts.items() if n < MIN_PER_LABEL]
    print(f"Wrote {len(unique)} rows to {OUT}")
    print(f"  labels: {len(counts)}, min={min(counts.values())}, max={max(counts.values())}")
    if low:
        print(f"  warning: below MIN_PER_LABEL ({MIN_PER_LABEL}): {len(low)} labels")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
