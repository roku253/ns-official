/** アルバム見開きごとの写真（static 同期後は /games/moonlit-script/album/ 参照） */

export type AlbumPhoto = {
  file: string
  caption: string
  dateNote: string
}

export type AlbumSpread = {
  id: string
  photos: AlbumPhoto[]
}

export const ALBUM_SPREADS: AlbumSpread[] = [
  {
    id: "s1",
    photos: [
      {
        file: "photo-01.webp",
        caption: "駅前。人が少ない日だった",
        dateNote: "8/3",
      },
      {
        file: "photo-02.webp",
        caption: "芝生と白い花。指先が緑になる",
        dateNote: "同じ夏",
      },
    ],
  },
  {
    id: "s2",
    photos: [
      {
        file: "photo-03.webp",
        caption: "トンネルの入口。まだ明るいうち",
        dateNote: "夕方前",
      },
      {
        file: "photo-04.webp",
        caption: "縁側の影。遠くで金属が鳴る音",
        dateNote: "夜寄り",
      },
    ],
  },
  {
    id: "s3",
    photos: [
      {
        file: "photo-05.webp",
        caption: "赤い屋根の看板が斜めに入った",
        dateNote: "帰り道",
      },
      {
        file: "photo-06.webp",
        caption: "紙袋の角。中身は温かかった",
        dateNote: "──",
      },
    ],
  },
  {
    id: "s4",
    photos: [
      {
        file: "photo-04.webp",
        caption: "レシートの文字がにじんで読めない",
        dateNote: "あとから",
      },
      {
        file: "photo-06.webp",
        caption: "二人分の影。長い",
        dateNote: "トンネル前",
      },
    ],
  },
]
