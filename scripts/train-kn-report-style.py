#!/usr/bin/env python3
"""koko-ni-iru 調査報告スタイル分類器を学習し、メタ JSON + スパース TSV を出力する。"""
from __future__ import annotations

import csv
import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
CASE_DIR = ROOT / "games/signal-trace/cases/koko-ni-iru"
CSV_PATH = CASE_DIR / "training/report-style-samples.csv"
META_PATH = CASE_DIR / "report-style-classifier-meta.json"
SPARSE_PATH = CASE_DIR / "report-style-classifier-sparse.tsv"

MAX_FEATURES = 8000
SPARSE_EPS = 1e-9


def main() -> int:
    try:
        from sklearn.feature_extraction.text import TfidfVectorizer
        from sklearn.linear_model import LogisticRegression
        from sklearn.pipeline import Pipeline
    except ImportError:
        print("scikit-learn が必要です: pip install -r requirements-ml.txt", file=sys.stderr)
        return 1

    if not CSV_PATH.is_file():
        print(f"CSV not found: {CSV_PATH}", file=sys.stderr)
        return 1

    texts: list[str] = []
    labels: list[str] = []
    with CSV_PATH.open(encoding="utf-8", newline="") as f:
        reader = csv.DictReader(f)
        for row in reader:
            t = (row.get("text") or "").strip()
            lb = (row.get("label") or "").strip()
            if t and lb:
                texts.append(t)
                labels.append(lb)

    if len(texts) < 20:
        print("教材が少なすぎます。", file=sys.stderr)
        return 1

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
            ("clf", LogisticRegression(max_iter=2000, solver="lbfgs", C=1.0)),
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

    meta = {
        "version": 2,
        "caseId": "koko-ni-iru",
        "labels": label_list,
        "vocabulary": vocabulary,
        "idf": idf,
        "intercept": intercept,
        "trainingSamples": len(texts),
        "maxFeatures": MAX_FEATURES,
        "nonzeroCoefficients": nonzero_total,
        "sparseFile": "report-style-classifier-sparse.tsv",
    }

    META_PATH.write_text(json.dumps(meta, ensure_ascii=False, indent=2), encoding="utf-8")

    legacy = CASE_DIR / "report-style-classifier.json"
    if legacy.is_file():
        legacy.unlink()
        print(f"Removed legacy {legacy.name}")

    meta_kb = META_PATH.stat().st_size / 1024
    sparse_kb = SPARSE_PATH.stat().st_size / 1024
    print(
        f"Wrote {META_PATH.name} ({meta_kb:.1f} KB), {SPARSE_PATH.name} ({sparse_kb:.1f} KB)\n"
        f"  {len(texts)} samples, {len(vocabulary)} features, {nonzero_total} nonzero coefs"
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
