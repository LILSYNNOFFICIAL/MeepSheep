import tempfile
import unittest
from pathlib import Path

from scripts.wellness_doctor import determine_status, inspect_repository, update_readme


class StatusTests(unittest.TestCase):
    def test_maps_all_four_levels_and_uses_highest_severity(self):
        self.assertEqual(determine_status([])["icon"], "🟢")
        self.assertEqual(determine_status([{"severity": "warning"}])["icon"], "🟡")
        self.assertEqual(determine_status([{"severity": "error"}])["icon"], "🔵")
        self.assertEqual(determine_status([{"severity": "critical"}])["icon"], "🔴")
        mixed = [{"severity": "warning"}, {"severity": "error"}, {"severity": "critical"}]
        self.assertEqual(determine_status(mixed)["code"], "MAJOR_FAILURE")


class RepositoryInspectionTests(unittest.TestCase):
    def make_repo(self, root: Path):
        (root / "AI").mkdir()
        (root / ".github" / "workflows").mkdir(parents=True)
        (root / "scripts").mkdir()
        (root / "tests").mkdir()
        (root / "README.md").write_text(
            "# Example\n\n<!-- MEEPSHEEP_HEALTH_START -->\nold\n<!-- MEEPSHEEP_HEALTH_END -->\n",
            encoding="utf-8",
        )
        names = [
            "WF.md", "PROJECT.md", "ARCHITECTURE.md", "DECISIONS.md",
            "SECURITY.md", "RESEARCH.md", "INTEGRATIONS.md", "STATE.md",
            "CONTRIBUTING.md", "GITHUB_RULES.md", "ACTIONS.md",
            "WELLNESS_DOCTOR.md", "STATUS_ICONS.md", "INCIDENTS.md",
            "AUTOMATION_LOG.md", "WELLNESS_IMPLEMENTATION_PLAN.md",
        ]
        for name in names:
            (root / "AI" / name).write_text(f"# {name}\n", encoding="utf-8")
        (root / ".github" / "workflows" / "quality.yml").write_text(
            "name: Quality\non: [push, pull_request]\npermissions:\n  contents: read\n"
            "run: unittest wellness_doctor.py\n", encoding="utf-8"
        )
        (root / ".github" / "workflows" / "wellness-doctor.yml").write_text(
            "name: Wellness\non: [push, workflow_dispatch, schedule]\n"
            "permissions:\n  contents: write\nrun: wellness_doctor.py\n", encoding="utf-8"
        )
        (root / "scripts" / "wellness_doctor.py").write_text("# doctor\n", encoding="utf-8")
        (root / "tests" / "test_wellness_doctor.py").write_text("# tests\n", encoding="utf-8")

    def test_detects_missing_required_document_and_broken_link(self):
        with tempfile.TemporaryDirectory() as temp:
            root = Path(temp)
            self.make_repo(root)
            (root / "AI" / "WF.md").unlink()
            (root / "README.md").write_text(
                "# Example\n[missing](AI/not-here.md)\n"
                "<!-- MEEPSHEEP_HEALTH_START -->\nx\n<!-- MEEPSHEEP_HEALTH_END -->\n",
                encoding="utf-8",
            )
            report = inspect_repository(root)
            ids = {finding["id"] for finding in report["findings"]}
            self.assertIn("REQUIRED_FILE_MISSING", ids)
            self.assertIn("MARKDOWN_LINK_BROKEN", ids)

    def test_detects_unbalanced_fence_and_malformed_markers(self):
        with tempfile.TemporaryDirectory() as temp:
            root = Path(temp)
            self.make_repo(root)
            (root / "AI" / "WF.md").write_text("# Workflow\n```py\n", encoding="utf-8")
            report = inspect_repository(root)
            self.assertIn("MARKDOWN_FENCE_UNBALANCED", {f["id"] for f in report["findings"]})
            (root / "README.md").write_text("# Example\n<!-- MEEPSHEEP_HEALTH_START -->\n", encoding="utf-8")
            report = inspect_repository(root)
            critical = [f for f in report["findings"] if f["id"] == "README_HEALTH_MARKERS_INVALID"]
            self.assertTrue(critical)
            self.assertEqual(critical[0]["severity"], "critical")


class ReadmeUpdateTests(unittest.TestCase):
    def test_updates_only_marked_region_and_is_idempotent(self):
        with tempfile.TemporaryDirectory() as temp:
            root = Path(temp)
            original = "TOP\n<!-- MEEPSHEEP_HEALTH_START -->\nold\n<!-- MEEPSHEEP_HEALTH_END -->\nBOTTOM\n"
            (root / "README.md").write_text(original, encoding="utf-8")
            report = {
                "status": {"icon": "🟢", "label": "Healthy", "code": "OK"},
                "counts": {"passed": 4, "warning": 0, "error": 0, "critical": 0},
                "findings": [],
            }
            self.assertTrue(update_readme(root, report))
            updated = (root / "README.md").read_text(encoding="utf-8")
            self.assertTrue(updated.startswith("TOP\n<!-- MEEPSHEEP_HEALTH_START -->"))
            self.assertTrue(updated.endswith("<!-- MEEPSHEEP_HEALTH_END -->\nBOTTOM\n"))
            self.assertIn("🟢", updated)
            self.assertFalse(update_readme(root, report))
            self.assertEqual((root / "README.md").read_text(encoding="utf-8"), updated)

    def test_missing_or_duplicate_markers_never_rewrites_readme(self):
        with tempfile.TemporaryDirectory() as temp:
            root = Path(temp)
            original = "# README without markers\n"
            (root / "README.md").write_text(original, encoding="utf-8")
            report = {
                "status": {"icon": "🔴", "label": "Critical", "code": "MAJOR_FAILURE"},
                "counts": {"passed": 0, "warning": 0, "error": 0, "critical": 1},
                "findings": [],
            }
            with self.assertRaises(ValueError):
                update_readme(root, report)
            self.assertEqual((root / "README.md").read_text(encoding="utf-8"), original)


if __name__ == "__main__":
    unittest.main()
