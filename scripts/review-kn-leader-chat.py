#!/usr/bin/env python3
"""
人間レビュー用: CSV の text に対しモデル予測を書き出す。

使い方:
  1. training/leader-chat-review-in.csv に text 列（任意で human_response_id）
  2. python scripts/review-kn-leader-chat.py
  3. leader-chat-review-out.csv で model_response_id を確認し human を埋める
  4. 正しい行を leader-chat-samples.csv にマージして train-kn-leader-chat.py
"""
from __future__ import annotations

import csv
import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
CASE_DIR = ROOT / "games/signal-trace/cases/koko-ni-iru"
META = CASE_DIR / "leader-chat-classifier-meta.json"
IN_CSV = CASE_DIR / "training/leader-chat-review-in.csv"
OUT_CSV = CASE_DIR / "training/leader-chat-review-out.csv"


def predict(text: str, meta: dict) -> tuple[str, float]:
    # 簡易: train 済み meta が無ければ終了
    try:
        import torch
        import torch.nn as nn
    except ImportError:
        return "vague.0", 0.0

    char_to_index = meta["charToIndex"]
    max_len = meta["maxLen"]
    unk = char_to_index.get("<UNK>", 1)
    pad = char_to_index.get("<PAD>", 0)
    indices = [char_to_index.get(ch, unk) for ch in text[:max_len]]
    while len(indices) < max_len:
        indices.append(pad)
    x = torch.tensor([indices], dtype=torch.long)

    class TextCNN(nn.Module):
        def __init__(self) -> None:
            super().__init__()
            vs = len(char_to_index)
            ed = meta["embDim"]
            nf = meta["numFilters"]
            fs = meta["filterSizes"]
            nl = len(meta["labels"])
            self.embedding = nn.Embedding(vs, ed, padding_idx=0)
            self.convs = nn.ModuleList([nn.Conv1d(ed, nf, k) for k in fs])
            self.fc = nn.Linear(nf * len(fs), nl)

        def forward(self, inp: torch.Tensor) -> torch.Tensor:
            emb = self.embedding(inp).transpose(1, 2)
            pools = [torch.relu(c(emb)).max(dim=2).values for c in self.convs]
            return self.fc(torch.cat(pools, dim=1))

    m = TextCNN()
    with torch.no_grad():
        emb = torch.tensor(meta["embedding"])
        m.embedding.weight.copy_(emb)
        for conv, ce in zip(m.convs, meta["convs"]):
            w = torch.tensor(ce["weight"]).reshape(conv.out_channels, conv.in_channels, conv.kernel_size[0])
            conv.weight.copy_(w)
            conv.bias.copy_(torch.tensor(ce["bias"]))
        m.fc.weight.copy_(torch.tensor(meta["fcWeight"]))
        m.fc.bias.copy_(torch.tensor(meta["fcBias"]))
        logits = m(x)
        probs = torch.softmax(logits, dim=1)[0]
        idx = int(probs.argmax())
        return meta["labels"][idx], float(probs[idx])


def main() -> int:
    if not META.is_file():
        print("先に train-kn-leader-chat.py を実行してください。", file=sys.stderr)
        return 1
    if not IN_CSV.is_file():
        print(f"入力がありません: {IN_CSV}", file=sys.stderr)
        print("text 列だけの CSV を置いて再実行してください。", file=sys.stderr)
        return 1

    meta = json.loads(META.read_text(encoding="utf-8"))
    rows_out = []
    with IN_CSV.open(encoding="utf-8", newline="") as f:
        for row in csv.DictReader(f):
            text = (row.get("text") or "").strip()
            if not text:
                continue
            pred, conf = predict(text, meta)
            rows_out.append(
                {
                    "text": text,
                    "model_response_id": pred,
                    "model_confidence": f"{conf:.4f}",
                    "human_response_id": row.get("human_response_id") or "",
                }
            )

    with OUT_CSV.open("w", encoding="utf-8", newline="") as f:
        w = csv.DictWriter(
            f,
            fieldnames=["text", "model_response_id", "model_confidence", "human_response_id"],
        )
        w.writeheader()
        w.writerows(rows_out)

    print(f"Wrote {len(rows_out)} rows to {OUT_CSV}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
