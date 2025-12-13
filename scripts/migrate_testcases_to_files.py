"""将旧版内联测试用例迁移为文件存储."""
from pathlib import Path
import sys
import os

sys.path.append(str(Path(__file__).resolve().parents[1] / "backend"))

from app.config import settings  # noqa: E402
from app.models.base import SessionLocal  # noqa: E402
from app.models.testcase import TestCase  # noqa: E402
from app.models.problem import Problem  # noqa: E402
from app.services import testcase_storage  # noqa: E402
from starlette.datastructures import UploadFile  # noqa: E402

FORCE_REWRITE = os.environ.get("FORCE_REWRITE", "0") == "1"


def migrate():
    db = SessionLocal()
    settings.testcase_root.mkdir(parents=True, exist_ok=True)
    migrated = 0
    skipped = 0
    try:
        problem_map = {p.id: p.slug for p in db.query(Problem).all()}
        for tc in db.query(TestCase).all():
            if tc.in_path and tc.out_path and not FORCE_REWRITE:
                skipped += 1
                continue
            case_no = tc.case_no or (tc.id or 0)
            input_text = tc.input_text or ""
            output_text = tc.output_text or ""
            in_tmp = settings.testcase_root / "tmp_in.txt"
            out_tmp = settings.testcase_root / "tmp_out.txt"
            in_tmp.write_text(input_text, encoding="utf-8")
            out_tmp.write_text(output_text, encoding="utf-8")
            try:
                if FORCE_REWRITE:
                    old_paths = []
                    if tc.in_path:
                        old_paths.append(testcase_storage.resolve_path(tc.in_path))
                    if tc.out_path:
                        old_paths.append(testcase_storage.resolve_path(tc.out_path))
                    testcase_storage.safe_delete_files(old_paths)
                meta = testcase_storage.save_single_testcase(
                    tc.problem_id,
                    case_no,
                    UploadFile(filename=f"{case_no}.in", file=in_tmp.open("rb")),
                    UploadFile(filename=f"{case_no}.out", file=out_tmp.open("rb")),
                    problem_slug=problem_map.get(tc.problem_id),
                )
            finally:
                in_tmp.unlink(missing_ok=True)
                out_tmp.unlink(missing_ok=True)
            for key, value in meta.items():
                setattr(tc, key, value)
            db.add(tc)
            migrated += 1
        db.commit()
        print(f"迁移完成，写入 {migrated} 条，用例已存在跳过 {skipped} 条")
    finally:
        db.close()


if __name__ == "__main__":
    migrate()
