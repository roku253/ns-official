/** 手紙本文断片と空欄（stageId は task-templates / secrets と一致。空欄7＋最終は別UI） */

export type LetterSegment =
  | { kind: "text"; value: string }
  | {
      kind: "blank"
      stageId: string
      ariaPlain: string
      placeholder: string
      hint: string
      strongHint: string
    }

export const LETTER_INTRO_PAGES: string[] = [
  `物置の引き出しの底で、茶色い封筒を見つけた。
宛名は消えかけていて、差出人の欄だけが妙にはっきりしていた。`,

  `中には、書きかけの便箋が一枚挟まっていた。
行の途中で筆が止まっている。まるで、言葉を探していたみたいに。`,

  `便箋のそばに、手記とアルバムを並べた。
机の上で、同じ夏が三つに分かれて見えた。`,
]

/** 空欄は7つのみ（ms-letter-blank-1 … 7）。差出人は ms-letter-final */
export const LETTER_SEGMENTS: LetterSegment[] = [
  { kind: "text", value: "あの夏のこと、ちゃんと書き留めたかった。\n\n" },
  {
    kind: "blank",
    stageId: "ms-letter-blank-1",
    ariaPlain: "第一空欄。曜日。",
    placeholder: "　　　",
    hint: "手記の冒頭付近。「人少ない」とある日の曜日を思い出して。",
    strongHint: "「土曜」の言い方（ひとことで）。",
  },
  {
    kind: "text",
    value: "の午後、駅前は思ったより静かだった。\nみーちゃんと",
  },
  {
    kind: "blank",
    stageId: "ms-letter-blank-2",
    ariaPlain: "第二空欄。行った場所。",
    placeholder: "　　　",
    hint: "手記にベンチと芝生があるページ。アルバムの白い花の写真も。",
    strongHint: "芝生とシロツメクサがあった場所。",
  },
  {
    kind: "text",
    value: "に行って、",
  },
  {
    kind: "blank",
    stageId: "ms-letter-blank-3",
    ariaPlain: "第三空欄。つくったもの。",
    placeholder: "　　　",
    hint: "手記で茎を結び、「ぜったい忘れない」と書いたあたり。",
    strongHint: "シロツメクサでつくった小さな輪。",
  },
  {
    kind: "text",
    value: "をつくった。\n\nスーパーの小さな表示には、卵Mが",
  },
  {
    kind: "blank",
    stageId: "ms-letter-blank-4",
    ariaPlain: "第四空欄。卵の値段（数字）。",
    placeholder: "　　　",
    hint: "手記のレジの話。数字だけ。",
    strongHint: "三けたの数字。手記の卵のところをもう一度。",
  },
  {
    kind: "text",
    value: "円って出ていた。安い、って言ったら、おばあちゃんが笑った。\n\n帰り道、",
  },
  {
    kind: "blank",
    stageId: "ms-letter-blank-5",
    ariaPlain: "第五空欄。近道の暗い場所。",
    placeholder: "　　　",
    hint: "手記で夜がこわいとある場所。アルバムに入口の写真。",
    strongHint: "近道。トンネル。",
  },
  {
    kind: "text",
    value: "がいちばんこわかった。それでも遠くで、",
  },
  {
    kind: "blank",
    stageId: "ms-letter-blank-6",
    ariaPlain: "第六空欄。夏の音。",
    placeholder: "　　　",
    hint: "手記のトンネルの段落。縁側の写真のキャプションも。",
    strongHint: "金属が鳴るような、夏の音。",
  },
  {
    kind: "text",
    value: "の音がして、少しだけ安心した。\n\n赤い屋根のパン屋では、ピーナッツクリームのコッペが",
  },
  {
    kind: "blank",
    stageId: "ms-letter-blank-7",
    ariaPlain: "第七空欄。コッペの値段（数字）。",
    placeholder: "　　　",
    hint: "手記のガラスケースの札。数字。",
    strongHint: "二けたの数字。パン屋のコッペの札。",
  },
  {
    kind: "text",
    value: "円になっていた。\n\n……ここまで書いて、筆が止まった。\n\n",
  },
]

export const LETTER_FINAL_BLOCK = {
  stageId: "ms-letter-final",
  ariaPlain: "最終。手記末尾の署名。",
  placeholder: "　　　",
  hint: "手記の最後のページ。綴じた名前を、そのまま。",
  strongHint: "最後に「――」のあとに書かれている名前。",
}
