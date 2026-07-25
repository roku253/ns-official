/**
 * 班長会話スモークテスト
 * npm run verify:kn-leader-chat
 * （tsx 経由。TS ソースを直接 import する）
 */
import {
  composeLeaderDialogueReply,
  getClaudeFallbackDecision,
  materializeLeaderDialogueReply,
  resolveLeaderDialogue,
  resolveLeaderDialogueWithStreak,
} from "../games/signal-trace/cases/koko-ni-iru/leader-chat-replies.ts";
import { LEADER_RESPONSES } from "../games/signal-trace/cases/koko-ni-iru/leader-chat-responses.ts";
import { hasCaseKeywordOnlyInHiragana } from "../games/signal-trace/cases/koko-ni-iru/leader-chat-case-hiragana-terms.ts";
import { preprocessLeaderMessage } from "../games/signal-trace/cases/koko-ni-iru/leader-chat-preprocess.ts";
import { matchLeaderIntel } from "../games/signal-trace/cases/koko-ni-iru/leader-intel.ts";

const CASE = "koko-ni-iru";

function check(name, input, expectIncludes, expectExcludes = []) {
  const r = composeLeaderDialogueReply({
    caseId: CASE,
    messageText: input,
    chatCount: 0,
  });
  const okInc = expectIncludes.every((s) => r.content.includes(s));
  const okExc = expectExcludes.every((s) => !r.content.includes(s));
  if (!okInc || !okExc) {
    console.error(`FAIL ${name}:`, r.content);
    return false;
  }
  console.log(`OK ${name}`);
  return true;
}

function checkAny(name, input, expectAnyIncludes, expectExcludes = []) {
  const r = composeLeaderDialogueReply({
    caseId: CASE,
    messageText: input,
    chatCount: 0,
  });
  const okInc = expectAnyIncludes.some((s) => r.content.includes(s));
  const okExc = expectExcludes.every((s) => !r.content.includes(s));
  if (!okInc || !okExc) {
    console.error(`FAIL ${name}:`, r.content);
    return false;
  }
  console.log(`OK ${name}`);
  return true;
}

let failed = 0;
const run = (...args) => {
  if (!check(...args)) failed++;
};
const runAny = (...args) => {
  if (!checkAny(...args)) failed++;
};

function checkClaudeRoute(name, input, expectUse, expectResponseId = null) {
  const res = resolveLeaderDialogue({
    caseId: CASE,
    messageText: input,
    chatCount: 0,
  });
  const d = getClaudeFallbackDecision(res);
  const okUse = d.use === expectUse;
  const okId = expectResponseId == null || res.responseId === expectResponseId;
  if (!okUse || !okId) {
    console.error(`FAIL ${name}:`, {
      responseId: res.responseId,
      claude: d,
      viaRule: res.viaRule,
    });
    return false;
  }
  console.log(`OK ${name}`);
  return true;
}

const runClaude = (...args) => {
  if (!checkClaudeRoute(...args)) failed++;
};

run("sleepy", "ねむい", ["休憩"], ["地図", "烏啼", "ソラ", "板のメモ送って。了解"]);
run("sleepy ne", "ねむいね", ["休憩"], ["ソラ", "青空", "気になる", "先に"]);
runClaude("cat cute claude", "ねこかわいい", true, "chitchat.generic.0");
runClaude("yorushika claude", "ヨルシカ知ってる？", true, "chitchat.generic.0");
runClaude("chahan claude", "チャーハン食べた", true, "chitchat.generic.0");
runClaude("what time claude", "今何時？", true, "chitchat.generic.0");
runClaude("current time claude", "今の時間は？", true, "chitchat.generic.0");
runClaude("what date claude", "今日何日？", true, "chitchat.generic.0");
runClaude("what weekday claude", "何曜日？", true, "chitchat.generic.0");

const INVESTIGATION_LABEL_PREFIXES = [
  "confirm_scope.",
  "wh_question.",
  "sharing_findings.",
  "request_opinion.",
];

function assertOffAnchorNotInvestigationLabel(name, messageText) {
  const res = resolveLeaderDialogue({
    caseId: CASE,
    messageText,
    chatCount: 0,
  });
  const bad = INVESTIGATION_LABEL_PREFIXES.some(
    (p) => res.responseId === p || res.responseId.startsWith(p)
  );
  if (
    bad ||
    res.responseId === "board.exhausted" ||
    res.responseId === "plan.next_town" ||
    res.responseId === "acknowledge.player_stuck"
  ) {
    console.error(
      "FAIL off-anchor investigation label:",
      name,
      messageText,
      res.responseId,
      res.ml?.responseId,
      res.ml?.confidence
    );
    failed++;
    return;
  }
  if (
    !res.responseId.startsWith("chitchat.") &&
    !res.responseId.startsWith("vague.") &&
    !res.responseId.startsWith("procedure.") &&
    !res.responseId.startsWith("meta_test.") &&
    !res.responseId.startsWith("quality.")
  ) {
    console.error("FAIL off-anchor unexpected label:", name, res.responseId);
    failed++;
    return;
  }
  console.log(`OK off-anchor filter ${name}`);
}

assertOffAnchorNotInvestigationLabel("yorushika", "ヨルシカ知ってる？");
assertOffAnchorNotInvestigationLabel("chahan", "チャーハン食べた");
assertOffAnchorNotInvestigationLabel("curry", "カレー好き？");
assertOffAnchorNotInvestigationLabel("band", "米津玄師知ってる？");
runClaude("leader name claude", "班長の名前なんて言うの？", true, "chitchat.generic.0");
runClaude("who are you claude", "誰？", true, "chitchat.generic.0");
runClaude("youth nostalgic claude", "少年のときっていいよね", true, "chitchat.generic.0");

{
  const cases = [
    ["folklore what is", "神隠しって何？", "policy.universal_folklore", false, ["言い伝え", "伝承"]],
    ["tc what is", "タイムカプセルって何？", "chitchat.what_is.investigation.0", true, null],
    ["school what is", "小学校って何？", "chitchat.what_is.general.0", true, ["聞くことじゃない", "調べ", "常識", "ネット"]],
    ["lake what is", "湖って何？", "chitchat.what_is.general.0", true, ["聞くことじゃない", "調べ", "常識", "ネット"]],
    ["yoru what is", "ヨルシカって何？", "chitchat.what_is.unknown.0", false, ["知らない", "分からん"]],
    ["ns what is", "NSって何？", "chitchat.what_is.unknown.0", false, ["知らない", "分からん"]],
    ["gouglemap what is", "gouglemapって？", "chitchat.what_is.in_world.0", true, ["地図", "普通"]],
  ];
  for (const [name, msg, expectId, useClaude, toneHints] of cases) {
    const r = resolveLeaderDialogue({ caseId: CASE, messageText: msg, chatCount: 0 });
    const reply = composeLeaderDialogueReply({ caseId: CASE, messageText: msg, chatCount: 0 });
    const claude = getClaudeFallbackDecision(r);
    if (r.responseId !== expectId) {
      console.error("FAIL what-is label:", name, r.responseId, "expected", expectId);
      failed++;
    } else if (useClaude && !claude.use) {
      console.error("FAIL what-is claude:", name, claude);
      failed++;
    } else if (!useClaude && claude.use) {
      console.error("FAIL what-is template:", name, claude);
      failed++;
    } else if (toneHints && !toneHints.some((h) => reply.content.includes(h))) {
      console.error("FAIL what-is tone:", name, reply.content);
      failed++;
    } else {
      console.log("OK what-is", name);
    }
  }
}

for (const [name, msg, expectAny] of [
  ["story answer full", "事件の全容教えて", ["知らない", "整理", "報告"]],
  ["story answer who", "誰が何をしたのか", ["知らない", "整理", "報告", "結論"]],
  ["story answer result", "結果どういうことなのか", ["知らない", "整理", "報告", "結論"]],
]) {
  const res = composeLeaderDialogueReply({
    caseId: CASE,
    messageText: msg,
    chatCount: 0,
  });
  const r = resolveLeaderDialogue({ caseId: CASE, messageText: msg, chatCount: 0 });
  if (r.responseId !== "chitchat.answer_request") {
    console.error("FAIL", name, "label:", r.responseId);
    failed++;
  } else if (!expectAny.some((s) => res.content.includes(s))) {
    console.error("FAIL", name, "tone:", res.content);
    failed++;
  } else if (getClaudeFallbackDecision(r).use) {
    console.error("FAIL", name, "should be template not claude");
    failed++;
  } else {
    console.log("OK", name);
  }
}

{
  const leaderName = resolveLeaderDialogue({
    caseId: CASE,
    messageText: "班長の名前なんて言うの？",
    chatCount: 0,
  });
  if (leaderName.responseId.startsWith("meta_test.")) {
    console.error("FAIL leader name meta_test:", leaderName.responseId);
    failed++;
  } else if (
    leaderName.responseId !== "chitchat.generic.0" &&
    leaderName.responseId !== "chitchat.generic.1"
  ) {
    console.error("FAIL leader name label:", leaderName.responseId);
    failed++;
  } else {
    console.log("OK leader identity not meta_test");
  }
  const youth = resolveLeaderDialogue({
    caseId: CASE,
    messageText: "少年のときっていいよね",
    chatCount: 0,
  });
  if (youth.responseId.startsWith("procedure.")) {
    console.error("FAIL nostalgic youth procedure:", youth.responseId, youth.ml?.confidence);
    failed++;
  } else if (
    youth.responseId !== "chitchat.generic.0" &&
    youth.responseId !== "chitchat.generic.1"
  ) {
    console.error("FAIL nostalgic youth label:", youth.responseId);
    failed++;
  } else {
    console.log("OK nostalgic youth not procedure");
  }
  const stuckRes = resolveLeaderDialogue({
    caseId: CASE,
    messageText: "誰かわかってないんだ",
    chatCount: 0,
  });
  const stuck = materializeLeaderDialogueReply(stuckRes, "誰かわかってないんだ");
  if (stuckRes.responseId !== "acknowledge.player_stuck") {
    console.error("FAIL player_stuck route:", stuckRes.responseId);
    failed++;
  } else if (/画面名|全知じゃない/.test(stuck.content)) {
    console.error("FAIL player_stuck template tone:", stuck.content);
    failed++;
  } else if (!/一緒に整理|気になった/.test(stuck.content)) {
    console.error("FAIL player_stuck missing forward tone:", stuck.content);
    failed++;
  } else {
    console.log("OK player_stuck template tone");
  }
}

{
  const yoru = resolveLeaderDialogue({
    caseId: CASE,
    messageText: "ヨルシカ知ってる？",
    chatCount: 0,
  });
  if (yoru.responseId === "confirm_scope.sora.0" || yoru.responseId === "wh_question.sora.0") {
    console.error("FAIL yorushika not sora:", yoru.responseId, yoru.ml?.confidence);
    failed++;
  } else if (yoru.responseId !== "chitchat.generic.0" && yoru.responseId !== "chitchat.generic.1") {
    console.error("FAIL yorushika label:", yoru.responseId);
    failed++;
  } else if (!getClaudeFallbackDecision(yoru).use) {
    console.error("FAIL yorushika should use claude:", getClaudeFallbackDecision(yoru));
    failed++;
  } else {
    console.log("OK yorushika entertainment chitchat");
  }
  const soraOk = resolveLeaderDialogue({
    caseId: CASE,
    messageText: "ソラの転校が気になる",
    chatCount: 1,
  });
  const soraCaseIds = new Set([
    "wh_question.sora.0",
    "confirm_scope.sora.0",
    "sharing_findings.board",
  ]);
  if (!soraCaseIds.has(soraOk.responseId) && !soraOk.responseId.includes("sora")) {
    console.error("FAIL real sora still routed:", soraOk.responseId);
    failed++;
  } else {
    console.log("OK real sora case routing");
  }
}
runClaude("curry prefs claude", "カレー好き？", true, "chitchat.generic.0");
runClaude("literary chitchat claude", "吾輩は猫である", true);
runClaude("sleepy template", "ねむい", false, "chitchat.sleepy");
runClaude("lost template", "迷ってる", false, "chitchat.lost");
runClaude("requester name unknown claude", "依頼者の名前とかわからないの？", true, "chitchat.generic.0");
runClaude("leader who unknown claude", "班長って誰かわからないの？", true, "chitchat.generic.0");
runClaude("kimi unknown claude", "君のことよくわからない", true, "chitchat.generic.0");
runClaude("requester name claude", "依頼者の名前おしえて", true, "wh_question.requester");
runClaude("requester who claude", "依頼者は誰？", true, "wh_question.requester");
runClaude("greeting template", "こんにちは", false, "chitchat.greeting");
runClaude("brb meal template", "ご飯食べてからまた調査する", false, "chitchat.brb");
runClaude("brb break template", "休憩してくる", false, "chitchat.brb");
runClaude("brb leave template", "ちょっと離れる", false, "chitchat.brb");

{
  const streak1 = resolveLeaderDialogueWithStreak({
    caseId: CASE,
    messageText: "ねこかわいい",
    chatCount: 0,
    consecutiveOffTopicChitchat: 1,
  });
  const d1 = getClaudeFallbackDecision(streak1);
  if (streak1.responseId !== "chitchat.streak.1" || d1.use) {
    console.error("FAIL chitchat streak 2nd:", streak1.responseId, d1);
    failed++;
  } else {
    console.log("OK chitchat streak 2nd template");
  }
  const streak4 = resolveLeaderDialogueWithStreak({
    caseId: CASE,
    messageText: "カレー好き？",
    chatCount: 1,
    consecutiveOffTopicChitchat: 3,
  });
  if (streak4.responseId !== "chitchat.streak.2" || getClaudeFallbackDecision(streak4).use) {
    console.error("FAIL chitchat streak 4th:", streak4.responseId);
    failed++;
  } else {
    console.log("OK chitchat streak 4th template");
  }
  const streak6 = resolveLeaderDialogueWithStreak({
    caseId: CASE,
    messageText: "吾輩は猫である",
    chatCount: 2,
    consecutiveOffTopicChitchat: 5,
  });
  if (streak6.responseId !== "chitchat.streak.3" || getClaudeFallbackDecision(streak6).use) {
    console.error("FAIL chitchat streak 6th:", streak6.responseId);
    failed++;
  } else {
    console.log("OK chitchat streak 6th template");
  }
  const reset = resolveLeaderDialogueWithStreak({
    caseId: CASE,
    messageText: "掲示板で2019だけおかしい",
    chatCount: 3,
    consecutiveOffTopicChitchat: 4,
  });
  if ((reset.offTopicChitchatStreak ?? 0) !== 0) {
    console.error("FAIL chitchat streak reset on investigation:", reset.offTopicChitchatStreak);
    failed++;
  } else {
    console.log("OK chitchat streak reset on investigation");
  }
  const folkloreQ = resolveLeaderDialogueWithStreak({
    caseId: CASE,
    messageText: "神隠しって何？",
    chatCount: 0,
    consecutiveOffTopicChitchat: 4,
  });
  if (folkloreQ.responseId.startsWith("chitchat.streak.")) {
    console.error("FAIL folklore question streak override:", folkloreQ.responseId);
    failed++;
  } else if ((folkloreQ.offTopicChitchatStreak ?? 0) !== 0) {
    console.error("FAIL folklore question streak count:", folkloreQ.offTopicChitchatStreak);
    failed++;
  } else {
    console.log("OK folklore question bypasses streak");
  }
  const streakQ = materializeLeaderDialogueReply(
    resolveLeaderDialogueWithStreak({
      caseId: CASE,
      messageText: "ヨルシカ知ってる？",
      chatCount: 0,
      consecutiveOffTopicChitchat: 1,
    }),
    "ヨルシカ知ってる？"
  );
  if (!/知らない|分からん/.test(streakQ.content)) {
    console.error("FAIL streak question tone:", streakQ.content);
    failed++;
  } else {
    console.log("OK streak off-topic question tone");
  }
}

{
  const brbReply = composeLeaderDialogueReply({
    caseId: CASE,
    messageText: "ご飯食べてからまた調査する",
    chatCount: 0,
  });
  if (!/待って|ゆっくり|戻った|一旦|大事/.test(brbReply.content)) {
    console.error("FAIL brb meal reply:", brbReply.content);
    failed++;
  } else if (/画面名|掲示板|ミラー/.test(brbReply.content)) {
    console.error("FAIL brb meal board tone:", brbReply.content);
    failed++;
  } else {
    console.log("OK brb meal reply");
  }
}

{
  const lake = resolveLeaderDialogue({
    caseId: CASE,
    messageText: "湖あるんだね",
    chatCount: 0,
  });
  if (lake.responseId === "quality.garbled" || lake.responseId.startsWith("quality.")) {
    console.error("FAIL lake readable not quality:", lake.responseId, lake.ml?.confidence);
    failed++;
  } else {
    console.log("OK lake readable not quality");
  }
  const mojibake = preprocessLeaderMessage("ï¿½ï¿½ï¿½");
  if (mojibake.forcedResponseId !== "quality.garbled") {
    console.error("FAIL mojibake still garbled:", mojibake);
    failed++;
  } else {
    console.log("OK mojibake preprocess garbled");
  }
  const garbledTalk = resolveLeaderDialogue({
    caseId: CASE,
    messageText: "文字化けしてる",
    chatCount: 0,
  });
  if (garbledTalk.responseId === "quality.garbled") {
    console.error("FAIL garbled meta japanese:", garbledTalk.responseId);
    failed++;
  } else {
    console.log("OK garbled meta japanese not quality");
  }
  const lakeWord = preprocessLeaderMessage("湖");
  if (lakeWord.forcedResponseId === "quality.noise") {
    console.error("FAIL single kanji lake not noise:", lakeWord);
    failed++;
  } else {
    console.log("OK single kanji lake not noise");
  }
  const lakeClaude = getClaudeFallbackDecision(
    resolveLeaderDialogue({ caseId: CASE, messageText: "湖", chatCount: 0 })
  );
  if (!lakeClaude.use) {
    console.error("FAIL single kanji lake claude:", lakeClaude);
    failed++;
  } else {
    console.log("OK single kanji lake claude");
  }
  const lakeFinding = composeLeaderDialogueReply({
    caseId: CASE,
    messageText: "湖あるんだね",
    chatCount: 0,
  });
  if (
    lakeFinding.content.includes("画面名") ||
    lakeFinding.content.includes("いま見てる画面")
  ) {
    console.error("FAIL lake finding unnatural vague:", lakeFinding.content);
    failed++;
  } else if (!/気になる|発見|依頼文|ページ|伝わ|班メモ/.test(lakeFinding.content)) {
    console.error("FAIL lake finding tone:", lakeFinding.content);
    failed++;
  } else {
    console.log("OK lake finding natural reply");
  }
  const dots = preprocessLeaderMessage("...");
  if (dots.forcedResponseId !== "quality.noise") {
    console.error("FAIL dots still noise:", dots);
    failed++;
  } else {
    console.log("OK dots preprocess noise");
  }
}

{
  const inv = preprocessLeaderMessage("記録が食い違ってる", "記録が食い違ってる");
  if (inv.forcedResponseId !== "quality.repeat" || inv.flags.repeatTiming !== "immediate") {
    console.error("FAIL repeat investigation immediate:", inv);
    failed++;
  } else {
    console.log("OK repeat investigation immediate");
  }
  const invReply = composeLeaderDialogueReply({
    caseId: CASE,
    messageText: "記録が食い違ってる",
    chatCount: 0,
    lastMessageText: "記録が食い違ってる",
  });
  if (!/新しい気づき|気になった|届いて|前にも見た/.test(invReply.content)) {
    console.error("FAIL repeat investigation reply:", invReply.content);
    failed++;
  } else {
    console.log("OK repeat investigation reply");
  }
  const procRepeat = preprocessLeaderMessage(
    "調査を終わった時はどうすればいいの？",
    "調査を終わった時はどうすればいいの？"
  );
  if (procRepeat.forcedResponseId !== null || procRepeat.flags.repeatTiming !== "immediate") {
    console.error("FAIL repeat procedure question bypass:", procRepeat);
    failed++;
  } else {
    console.log("OK repeat procedure question bypass");
  }
  const procRepeatReply = composeLeaderDialogueReply({
    caseId: CASE,
    messageText: "調査を終わった時はどうすればいいの？",
    chatCount: 8,
    lastMessageText: "調査を終わった時はどうすればいいの？",
  });
  if (
    !/最終報告|調査中|ここ/.test(procRepeatReply.content) ||
    /同じ文、届いて|差分だけ|いつ・どこで・何がおかしい/.test(procRepeatReply.content)
  ) {
    console.error("FAIL repeat procedure question reply:", procRepeatReply.content);
    failed++;
  } else {
    console.log("OK repeat procedure question reply");
  }
  const chat = preprocessLeaderMessage("ねこかわいい", "ねこかわいい");
  if (chat.forcedResponseId !== "quality.repeat.chitchat" || chat.flags.repeatTiming !== "immediate") {
    console.error("FAIL repeat chitchat immediate:", chat);
    failed++;
  } else {
    console.log("OK repeat chitchat immediate");
  }
  const chatReply = composeLeaderDialogueReply({
    caseId: CASE,
    messageText: "ねこかわいい",
    chatCount: 1,
    lastMessageText: "ねこかわいい",
  });
  if (!/さっき|直前|同じ/.test(chatReply.content)) {
    console.error("FAIL repeat chitchat immediate reply:", chatReply.content);
    failed++;
  } else {
    console.log("OK repeat chitchat immediate reply");
  }
  const chatEarlier = preprocessLeaderMessage("カレー好き？", undefined, { repeatEarlier: true });
  if (
    chatEarlier.forcedResponseId !== "quality.repeat.chitchat" ||
    chatEarlier.flags.repeatTiming !== "earlier"
  ) {
    console.error("FAIL repeat chitchat earlier:", chatEarlier);
    failed++;
  } else {
    console.log("OK repeat chitchat earlier");
  }
  const earlierReply = composeLeaderDialogueReply({
    caseId: CASE,
    messageText: "カレー好き？",
    chatCount: 2,
    repeatEarlier: true,
  });
  if (!/前にも|さっきのさっき|もう一回/.test(earlierReply.content)) {
    console.error("FAIL repeat chitchat earlier reply:", earlierReply.content);
    failed++;
  } else {
    console.log("OK repeat chitchat earlier reply");
  }
}
runAny(
  "lost confused",
  "わからなくなってきた",
  ["オカルト", "整理", "箇条書き", "並べ", "一緒に", "普通", "焦らなく"],
  ["また今度", "調査中だから", "雑談は後回し"]
);
runAny(
  "lost hard",
  "難しい",
  ["オカルト", "焦らなく", "箇条書き", "並べ", "一緒に", "普通"],
  ["また今度", "調査中だから"]
);
runAny(
  "lost maze",
  "迷ってる",
  ["迷って", "オカルト", "一緒に", "並べ", "普通", "焦らなく"],
  ["また今度", "調査中だから", "雑談は後回し"]
);
run(
  "hiragana town",
  "かすみのもりで事件があった",
  ["メモ", "辿れ", "かすみのもり"],
  ["漢字で書いて", "ひらがなだけでも"]
);
run("tadaima", "ただいま", ["戻った"], ["地図", "もう少しだけ書いて", "ソラ"]);
run("what now", "なにすればいい？", ["ページ名", "気になった"], ["依頼文→", "板ミラー", "伝承ページ", "資料室", "地図", "烏啼", "第一小学校"]);
runAny(
  "report to requester",
  "大体、調査終わった。依頼者に報告したい。",
  ["私が", "フォーム", "直接は届か", "まず私に"],
  ["班長が担当", "こっちからは直接連絡できない", "俺"]
);
runAny(
  "report channel here",
  "調査終わった場合は、ここに報告すればいいの？",
  ["ここ", "最終報告", "調査中"],
  ["依頼者に伝えたい内容", "まとまったら私がフォーム", "いつ・どこで・何がおかしい", "お疲れさま。調査が一通り"]
);
runAny(
  "investigation complete next step",
  "調査を終わった時はどうすればいいの？",
  ["最終報告", "調査中", "ここ"],
  ["いつ・どこで・何がおかしい", "断定はまだ要らない", "ページ名と", "お疲れさま。調査が一通り", "終わった感じなら"]
);
runAny(
  "town event",
  "霞ノ杜町で事件があったみたいだよ",
  ["事件", "面白い", "気になる", "仮説", "考えてなかった", "整理してなかった"],
  ["もう少しだけ書いて", "ソラ", "伝承ページ", "資料室", "そのまま送って", "俺も", "いい線"]
);
run("board done", "掲示板にはもう特に情報なさそう", ["拾えた", "引っかかった"], ["神隠しから入る", "ソラ", "町サイト", "伝承ページ", "2019の記事"]);
run("next town", "次は霞ノ杜町のサイト内か調べてみる", ["気になった", "見出し"], ["ソラ", "結論づけない", "伝承ページ", "資料室", "2019の記事", "先読みしない"]);
run(
  "boy unknown",
  "神隠しに合った少年はだれかあんまりわかってないんだね",
  ["少年", "急いで", "決めなく"],
  ["いい観点", "伝承ページと板", "伝承ページ", "資料室"]
);
run("board scope", "掲示板みればいいのね", ["ログ", "直接開けない"], ["ミラーから", "定番", "共有するね", "伝承ページ"]);

run(
  "name not fixed",
  "少年の名前は確定していない",
  ["少年", "急いで", "決めなく"],
  ["文字化け", "いい観点", "伝承ページと板", "伝承ページ", "どのレスでそう思ったか"]
);
runAny(
  "sora names on board",
  "「ソラくん」「青空」「転校した子」っていろいろあったから",
  ["面白い", "気になる", "仮説", "アリ", "着眼点", "考えてなかった", "整理してなかった"],
  ["文字化け", "普通の日本語で送って", "三人入って二人", "一文をそのまま", "俺もそう", "いい線"]
);
runAny(
  "theory general",
  "記録が食い違ってる線だと思うんだけど",
  ["面白い視点", "考えてなかった", "仮説", "アリ", "説明つかない", "唸り"],
  ["一文をそのまま", "俺もそう", "俺も同じ", "いい線だ", "一度そう読"]
);
run(
  "town plan phrasing",
  "霞ノ杜って町を調べたほうがよさそう",
  ["気になった", "見出し"],
  ["三人入って二人", "史実そのものとは限らない", "文字化け", "伝承ページ", "資料室"]
);
runAny(
  "transfer not folklore share",
  "あと神隠しに合った少年は、てんこうしたってことになってるらしいよ",
  ["転校", "筋あり", "気になる", "アリ", "考えてなかった"],
  ["いい観点", "伝承ページ", "文字化け", "三人入って二人", "俺も一度", "いい線", "一文をそのまま"]
);
run(
  "who is requester",
  "依頼人って誰なの？",
  ["匿名", "依頼文"],
  ["転校の体裁", "行き先が空欄", "三人入って二人", "全部は一度に", "転校の話"]
);
run(
  "tc login help",
  "学校のタイムカプセルに在学時の名前と生年月必要なんだけど、どうすればいい？",
  ["ログイン", "試せない", "案内文"],
  ["転校の体裁", "全部は一度にやらなくていい", "三人入って二人"]
);

if (matchLeaderIntel("掲示板みればいいのね", [])) {
  console.error("FAIL intel hijack");
  failed++;
} else {
  console.log("OK no intel hijack");
}
if (matchLeaderIntel("依頼人って誰なの？", [])) {
  console.error("FAIL intel on requester who");
  failed++;
} else {
  console.log("OK no intel on requester who");
}

if (!matchLeaderIntel("依頼分どう思う？", [])) {
  console.error("FAIL intel on request letter opinion typo");
  failed++;
} else {
  console.log("OK intel on request letter opinion typo");
}

if (preprocessLeaderMessage("依頼分どう思う？").normalizedText !== "依頼文どう思う？") {
  console.error("FAIL typo normalize: 依頼分→依頼文");
  failed++;
} else {
  console.log("OK typo normalize request letter");
}

runClaude("request letter opinion typo no claude", "依頼分どう思う？", false);

if (hasCaseKeywordOnlyInHiragana("いまいたくみてる")) {
  console.error("FAIL hiragana detect: daily phrase should not trigger");
  failed++;
} else {
  console.log("OK hiragana skip daily");
}
if (preprocessLeaderMessage("いまいたくみてる").forcedResponseId === "quality.hiragana_only") {
  console.error("FAIL hiragana preprocess: daily phrase forced");
  failed++;
} else {
  console.log("OK hiragana preprocess daily");
}
if (preprocessLeaderMessage("かすみのもりで事件").forcedResponseId !== "quality.hiragana_only") {
  console.error("FAIL hiragana preprocess: town kana should force");
  failed++;
} else {
  console.log("OK hiragana preprocess town");
}
if (!hasCaseKeywordOnlyInHiragana("かすみのもりのじけん")) {
  console.error("FAIL hiragana detect: case town kana should trigger");
  failed++;
} else {
  console.log("OK hiragana detect town");
}

{
  const townScene = "霞の杜が事件現場かな";
  const res = resolveLeaderDialogue({
    caseId: CASE,
    messageText: townScene,
    chatCount: 0,
  });
  const claude = getClaudeFallbackDecision(res);
  const townOk =
    (claude.use && /case_anchor/.test(claude.reason)) ||
    (res.viaRule && res.responseId === "sharing_findings.town");
  if (!townOk) {
    console.error("FAIL claude fallback town scene:", claude, res.responseId, res.ml?.confidence);
    failed++;
  } else {
    console.log("OK claude fallback town scene");
  }
}

const THEORY_PUSH_BANNED = [/一文をそのまま送/, /矛盾した部分を送/, /根拠になった記述をもう少し/]
const THEORY_PREKNOW_BANNED = [
  /俺もそう思って/,
  /俺も同じところ/,
  /俺も一度そう/,
  /いい線だと思/,
  /いい線。/,
  /いい線だから/,
  /そう読もうとしてた/,
  /そう整理しようとしてた/,
]
for (const [id, def] of Object.entries(LEADER_RESPONSES)) {
  if (!id.startsWith("sharing_findings.") && !id.startsWith("request_opinion.")) continue
  for (const line of def.variants) {
    for (const re of THEORY_PUSH_BANNED) {
      if (re.test(line)) {
        console.error(`FAIL theory tone ban ${id}:`, line)
        failed++
      }
    }
    for (const re of THEORY_PREKNOW_BANNED) {
      if (re.test(line)) {
        console.error(`FAIL theory preknow ban ${id}:`, line)
        failed++
      }
    }
  }
}
if (!failed) console.log("OK theory engagement tone scan")

const PRESCRIPTIVE_BANNED = [
  /伝承ページ/,
  /資料室/,
  /2019の記事/,
  /公式サイト/,
  /町サイト/,
  /板ミラー/,
  /最初が定番/,
  /の流れ/,
  /次は.*見/,
  /見ればいい/,
  /調べればいい/,
  /から入る/,
  /からでOK/,
  /依頼文→/,
];
for (const [id, def] of Object.entries(LEADER_RESPONSES)) {
  for (const line of def.variants) {
    for (const re of PRESCRIPTIVE_BANNED) {
      if (re.test(line)) {
        console.error(`FAIL template ban ${id}:`, line);
        failed++;
      }
    }
  }
}
if (!failed) console.log("OK template tone ban scan");

if (failed) process.exit(1);
console.log("All leader-chat checks passed.");
