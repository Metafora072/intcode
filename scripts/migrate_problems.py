"""将 leetcode_hot100.json 拆分为单题文件，方便后续同步。"""
import json
from pathlib import Path


def main():
    repo_root = Path(__file__).resolve().parents[1]
    fixture_path = repo_root / "backend" / "app" / "fixtures" / "leetcode_hot100.json"
    target_dir = repo_root / "backend" / "data" / "problems"
    target_dir.mkdir(parents=True, exist_ok=True)

    if not fixture_path.exists():
        raise FileNotFoundError(f"未找到夹具文件: {fixture_path}")

    data = json.loads(fixture_path.read_text(encoding="utf-8"))
    for item in data:
        slug = item["slug"]
        tags = item.get("tags", [])
        if isinstance(tags, str):
            tags = [t for t in tags.split(",") if t]
        payload = {
            "slug": slug,
            "title": item.get("title", ""),
            "difficulty": item.get("difficulty", "EASY"),
            "tags": tags,
            "content": item.get("content", ""),
            "input_description": item.get("input_description", ""),
            "output_description": item.get("output_description", ""),
            "constraints": item.get("constraints", ""),
            "is_spj": item.get("is_spj", False),
            "spj_code": item.get("spj_code"),
            "testcases": [
                {
                    "input_text": tc["input_text"],
                    "output_text": tc["output_text"],
                    "is_sample": tc.get("is_sample", False),
                }
                for tc in item.get("testcases", [])
            ],
        }
        out_path = target_dir / f"{slug}.json"
        out_path.write_text(json.dumps(payload, ensure_ascii=False, indent=2), encoding="utf-8")
        print(f"已写出 {out_path}")


if __name__ == "__main__":
    main()
