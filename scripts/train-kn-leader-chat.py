#!/usr/bin/env python3
"""koko-ni-iru 班長会話分類器を学習し leader-chat-classifier-meta.json を出力。

- PyTorch あり: TextCNN（modelType=textcnn）
- なし: 文字 n-gram + ロジスティック（modelType=char_lr、報告分類器と同型）
"""
from __future__ import annotations

import csv
import json
import random
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
CASE_DIR = ROOT / "games/signal-trace/cases/koko-ni-iru"
CSV_PATH = CASE_DIR / "training/leader-chat-samples.csv"
META_PATH = CASE_DIR / "leader-chat-classifier-meta.json"
SPARSE_PATH = CASE_DIR / "leader-chat-classifier-sparse.tsv"

MAX_LEN = 128
EMB_DIM = 48
NUM_FILTERS = 48
FILTER_SIZES = [2, 3, 4, 5]
EPOCHS = 12
BATCH_SIZE = 32
MIN_CONFIDENCE = 0.28
MAX_FEATURES = 12000
SPARSE_EPS = 1e-9
PAD, UNK = "<PAD>", "<UNK>"


def load_samples() -> tuple[list[str], list[str]]:
    if not CSV_PATH.is_file():
        print(f"CSV not found: {CSV_PATH} — run seed-kn-leader-chat-samples.py first", file=sys.stderr)
        sys.exit(1)
    texts: list[str] = []
    labels: list[str] = []
    with CSV_PATH.open(encoding="utf-8", newline="") as f:
        for row in csv.DictReader(f):
            t = (row.get("text") or "").strip()
            lb = (row.get("response_id") or "").strip()
            if t and lb:
                texts.append(t)
                labels.append(lb)
    if len(texts) < 40:
        print("教材が少なすぎます。", file=sys.stderr)
        sys.exit(1)
    return texts, labels


def build_vocab(texts: list[str]) -> dict[str, int]:
    chars: set[str] = set()
    for t in texts:
        chars.update(t)
    index = {PAD: 0, UNK: 1}
    for i, ch in enumerate(sorted(chars), start=2):
        index[ch] = i
    return index


def encode(text: str, char_to_index: dict[str, int]) -> list[int]:
    unk = char_to_index["<UNK>"]
    out = [char_to_index.get(ch, unk) for ch in text[:MAX_LEN]]
    pad = char_to_index["<PAD>"]
    while len(out) < MAX_LEN:
        out.append(pad)
    return out


def train_textcnn(texts: list[str], labels: list[str]) -> dict:
    import torch
    import torch.nn as nn
    from torch.utils.data import DataLoader, TensorDataset

    label_list = sorted(set(labels))
    label_to_idx = {lb: i for i, lb in enumerate(label_list)}
    y = [label_to_idx[lb] for lb in labels]
    char_to_index = build_vocab(texts)
    vocab_size = len(char_to_index)

    X = torch.tensor([encode(t, char_to_index) for t in texts], dtype=torch.long)
    Y = torch.tensor(y, dtype=torch.long)

    n = len(texts)
    idx = list(range(n))
    random.seed(42)
    random.shuffle(idx)
    split = int(n * 0.9)
    train_idx, val_idx = idx[:split], idx[split:]

    class TextCNN(nn.Module):
        def __init__(self) -> None:
            super().__init__()
            self.embedding = nn.Embedding(vocab_size, EMB_DIM, padding_idx=0)
            self.convs = nn.ModuleList(
                [nn.Conv1d(EMB_DIM, NUM_FILTERS, k) for k in FILTER_SIZES]
            )
            self.dropout = nn.Dropout(0.25)
            self.fc = nn.Linear(NUM_FILTERS * len(FILTER_SIZES), len(label_list))

        def forward(self, x: torch.Tensor) -> torch.Tensor:
            emb = self.embedding(x).transpose(1, 2)
            pools = [torch.relu(conv(emb)).max(dim=2).values for conv in self.convs]
            out = torch.cat(pools, dim=1)
            out = self.dropout(out)
            return self.fc(out)

    device = torch.device("cpu")
    model = TextCNN().to(device)
    opt = torch.optim.Adam(model.parameters(), lr=1e-3)
    loss_fn = nn.CrossEntropyLoss()
    loader = DataLoader(
        TensorDataset(X[train_idx], Y[train_idx]), batch_size=BATCH_SIZE, shuffle=True
    )

    for epoch in range(EPOCHS):
        model.train()
        total = 0.0
        for xb, yb in loader:
            xb, yb = xb.to(device), yb.to(device)
            opt.zero_grad()
            loss = loss_fn(model(xb), yb)
            loss.backward()
            opt.step()
            total += float(loss.item())
        if val_idx:
            model.eval()
            with torch.no_grad():
                vp = model(X[val_idx].to(device)).argmax(dim=1)
                acc = (vp == Y[val_idx].to(device)).float().mean().item()
            print(f"epoch {epoch + 1}/{EPOCHS} loss={total / max(len(loader), 1):.4f} val_acc={acc:.3f}")

    model.eval()
    convs_export = []
    for conv, k in zip(model.convs, FILTER_SIZES):
        w = conv.weight.detach().cpu().reshape(NUM_FILTERS, -1).tolist()
        b = conv.bias.detach().cpu().tolist()
        convs_export.append({"size": k, "weight": w, "bias": b})

    return {
        "version": 3,
        "modelType": "textcnn",
        "caseId": "koko-ni-iru",
        "maxLen": MAX_LEN,
        "embDim": EMB_DIM,
        "numFilters": NUM_FILTERS,
        "filterSizes": FILTER_SIZES,
        "charToIndex": char_to_index,
        "labels": label_list,
        "embedding": model.embedding.weight.detach().cpu().tolist(),
        "convs": convs_export,
        "fcWeight": model.fc.weight.detach().cpu().tolist(),
        "fcBias": model.fc.bias.detach().cpu().tolist(),
        "trainingSamples": len(texts),
        "minConfidence": MIN_CONFIDENCE,
    }


def train_char_lr(texts: list[str], labels: list[str]) -> dict:
    from sklearn.feature_extraction.text import TfidfVectorizer
    from sklearn.linear_model import LogisticRegression
    from sklearn.pipeline import Pipeline

    print("PyTorch なし → char_lr（文字 n-gram + ロジスティック）で学習します。", file=sys.stderr)

    pipe = Pipeline(
        [
            (
                "tfidf",
                TfidfVectorizer(
                    analyzer="char",
                    ngram_range=(2, 4),
                    min_df=1,
                    max_features=MAX_FEATURES,
                    sublinear_tf=True,
                ),
            ),
            (
                "clf",
                LogisticRegression(
                    max_iter=2000,
                    solver="lbfgs",
                    C=1.0,
                    class_weight="balanced",
                ),
            ),
        ]
    )
    pipe.fit(texts, labels)

    tfidf: TfidfVectorizer = pipe.named_steps["tfidf"]
    clf: LogisticRegression = pipe.named_steps["clf"]
    vocabulary = list(tfidf.vocabulary_.keys())
    vocab_index = {term: i for i, term in enumerate(vocabulary)}
    idf = [float(tfidf.idf_[vocab_index[t]]) for t in vocabulary]
    label_list = [str(c) for c in clf.classes_]
    intercept = [float(x) for x in clf.intercept_]

    nonzero_total = 0
    with SPARSE_PATH.open("w", encoding="utf-8", newline="") as sparse_out:
        sparse_out.write("labelIndex\tfeatureIndex\tcoefficient\n")
        for ci in range(len(label_list)):
            for term in vocabulary:
                fi = vocab_index[term]
                v = float(clf.coef_[ci][fi])
                if abs(v) > SPARSE_EPS:
                    sparse_out.write(f"{ci}\t{fi}\t{v}\n")
                    nonzero_total += 1

    return {
        "version": 3,
        "modelType": "char_lr",
        "caseId": "koko-ni-iru",
        "labels": label_list,
        "vocabulary": vocabulary,
        "idf": idf,
        "intercept": intercept,
        "trainingSamples": len(texts),
        "maxFeatures": MAX_FEATURES,
        "nonzeroCoefficients": nonzero_total,
        "sparseFile": "leader-chat-classifier-sparse.tsv",
        "minConfidence": MIN_CONFIDENCE,
    }


def main() -> int:
    texts, labels = load_samples()
    try:
        import torch  # noqa: F401

        meta = train_textcnn(texts, labels)
        if SPARSE_PATH.is_file():
            SPARSE_PATH.unlink()
    except ImportError:
        meta = train_char_lr(texts, labels)

    META_PATH.write_text(json.dumps(meta, ensure_ascii=False), encoding="utf-8")
    kb = META_PATH.stat().st_size / 1024
    print(
        f"Wrote {META_PATH.name} ({kb:.1f} KB) modelType={meta['modelType']}, "
        f"{len(texts)} samples, {len(meta['labels'])} labels"
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
