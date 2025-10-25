import pandas as pd

from fastapi_chatapp.main import _build_docs_from_excel, _normalize_recommendations


def test_build_docs_from_excel_combines_all_sheets(tmp_path):
    sheet_a = pd.DataFrame(
        {
            "Q": ["なぜ万引きした？", "これからどう対策する？"],
            "回答": ["わからない", "欲しいものがあったら家族に伝える"],
            "A": ["万引きという言葉はわかる？", ""],
            "課題タイプ": ["衝動性", "衝動性"],
        }
    )
    sheet_b = pd.DataFrame(
        {
            "Question": ["What triggered the behaviour?"],
            "Answer": ["I felt cornered"],
        }
    )
    sheet_b.loc[1] = [None, None]  # 空行は無視されるはず

    xlsx_path = tmp_path / "qa_multi.xlsx"
    with pd.ExcelWriter(xlsx_path) as writer:
        sheet_a.to_excel(writer, index=False, sheet_name="SheetA")
        sheet_b.to_excel(writer, index=False, sheet_name="SheetB")

    texts, metas = _build_docs_from_excel(str(xlsx_path))

    assert len(texts) == 3
    assert len(metas) == 3

    assert any("補足A: 万引きという言葉はわかる？" in t for t in texts)
    assert {"SheetA", "SheetB"} == {m["sheet"] for m in metas}

    english_doc = next(t for t, m in zip(texts, metas) if m["sheet"] == "SheetB")
    assert "Q: What triggered the behaviour?" in english_doc
    assert "A: I felt cornered" in english_doc
    assert next(m for m in metas if m["sheet"] == "SheetB")["kadai_type"] == "未指定"


def test_normalize_recommendations_limits_to_three():
    raw = """
評価: ―順位: 1

1. **問い返し案**: お酒をやめられない理由は、どんなことが影響していると思いますか？
評価: ―順位: 2
**評価**: 5
**支援者の声かけ例**: その理由を一緒に考えることで、何か解決策が見つかるかもしれませんね。

2. **問い返し案**: お酒を飲むことで、どんな気持ちや状況が楽になると感じますか？
評価: ―順位: 5
**評価**: 4
**支援者の声かけ例**: その気持ちを理解することで、他の方法を見つける手助けになるかもしれません。

3. **問い返し案**: お酒をやめた場合、どんな変化が自分の生活に訪れると思いますか？
評価: ―順位: 7
**評価**: 3
**支援者の声かけ例**: その変化を考えることで、やめることへのモチベーションが高まるかもしれませんね。

4. **問い返し案**: 周囲の支援で役立っていることはありますか？
評価: ―順位: 9
**評価**: 2
**支援者の声かけ例**: 支えてくれている人たちの存在も振り返ってみましょう。
"""

    normalized = _normalize_recommendations(raw, limit=3)
    lines = normalized.splitlines()

    assert len(lines) == 3
    assert lines[0].startswith("1. [評価:5] 問い返し:")
    assert lines[1].startswith("2. [評価:4] 問い返し:")
    assert lines[2].startswith("3. [評価:3] 問い返し:")
    assert "周囲の支援で役立っていることはありますか" not in normalized
