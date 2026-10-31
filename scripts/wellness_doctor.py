#!/usr/bin/env python3
"""Deterministic, read-only repository health inspection for MeepSheep."""
from __future__ import annotations
import argparse
import json
import re
import sys
from datetime import datetime, timezone
from pathlib import Path
from urllib.parse import unquote, urlsplit

START_MARKER = "<!-- MEEPSHEEP_HEALTH_START -->"
END_MARKER = "<!-- MEEPSHEEP_HEALTH_END -->"
WORKFLOW_URL = "https://github.com/LILSYNNOFFICIAL/MeepSheep/actions/workflows/wellness-doctor.yml"
SEVERITIES = {
    "ok": (0, "🟢", "Healthy", "OK"),
    "warning": (1, "🟡", "Warning / Error 1", "ERROR_1"),
    "error": (2, "🔵", "Error 2", "ERROR_2"),
    "critical": (3, "🔴", "Major failure", "MAJOR_FAILURE"),
}
REQUIRED_FILES = [
    "README.md", "AI/WF.md", "AI/PROJECT.md", "AI/ARCHITECTURE.md",
    "AI/DECISIONS.md", "AI/SECURITY.md", "AI/RESEARCH.md", "AI/INTEGRATIONS.md",
    "AI/STATE.md", "AI/CONTRIBUTING.md", "AI/GITHUB_RULES.md", "AI/ACTIONS.md",
    "AI/WELLNESS_DOCTOR.md", "AI/STATUS_ICONS.md", "AI/INCIDENTS.md",
    "AI/AUTOMATION_LOG.md", "AI/WELLNESS_IMPLEMENTATION_PLAN.md",
    ".github/workflows/quality.yml", ".github/workflows/wellness-doctor.yml",
    "scripts/wellness_doctor.py", "tests/test_wellness_doctor.py",
]
REQUIRED_README_LINKS = [f"AI/{name}.md" for name in [
    "WF", "PROJECT", "ARCHITECTURE", "DECISIONS", "SECURITY", "RESEARCH",
    "INTEGRATIONS", "STATE", "CONTRIBUTING", "GITHUB_RULES", "ACTIONS",
    "WELLNESS_DOCTOR", "STATUS_ICONS", "INCIDENTS", "AUTOMATION_LOG",
    "WELLNESS_IMPLEMENTATION_PLAN",
]]
LINK_RE = re.compile(r"(?<!!)\[[^\]]*\]\((?:<([^>]+)>|([^\s)]+))(?:\s+[^)]*)?\)")
FENCE_RE = re.compile(r"^\s{0,3}(`{3,}|~{3,})")
EXCLUDED_DIRS = {".git", ".venv", "venv", "node_modules", "__pycache__", ".pytest_cache", ".mypy_cache", ".ruff_cache"}

def determine_status(findings: list[dict]) -> dict:
    highest = "ok"
    for finding in findings:
        severity = finding.get("severity", "critical")
        if severity not in SEVERITIES:
            severity = "critical"
        if SEVERITIES[severity][0] > SEVERITIES[highest][0]:
            highest = severity
    _, icon, label, code = SEVERITIES[highest]
    return {"severity": highest, "icon": icon, "label": label, "code": code}

def _add(findings: list[dict], finding_id: str, severity: str, message: str, path: str | None = None) -> None:
    findings.append({"id": finding_id, "severity": severity, "message": message, "path": path})

def _inside_root(root: Path, candidate: Path) -> bool:
    try:
        candidate.resolve(strict=False).relative_to(root.resolve())
        return True
    except (ValueError, OSError):
        return False

def _markdown_files(root: Path) -> list[Path]:
    found = []
    for path in root.rglob("*.md"):
        if any(part in EXCLUDED_DIRS for part in path.relative_to(root).parts):
            continue
        if path.is_file() and _inside_root(root, path):
            found.append(path)
    return sorted(found)

def _all_files(root: Path) -> list[Path]:
    found = []
    for path in root.rglob("*"):
        relative = path.relative_to(root)
        if any(part in EXCLUDED_DIRS for part in relative.parts) or path.is_symlink():
            continue
        if path.is_file() and _inside_root(root, path):
            found.append(path)
    return found

def _check_markdown(root: Path, path: Path, findings: list[dict]) -> int:
    relative = path.relative_to(root).as_posix()
    try:
        content = path.read_text(encoding="utf-8")
    except (OSError, UnicodeError) as exc:
        _add(findings, "MARKDOWN_UNREADABLE", "error", f"Cannot read Markdown as UTF-8: {exc.__class__.__name__}.", relative)
        return 0
    checks = 0
    fence = None
    for line_number, line in enumerate(content.splitlines(), start=1):
        match = FENCE_RE.match(line)
        if not match:
            continue
        marker = match.group(1)
        if fence is None:
            fence = (marker[0], len(marker), line_number)
        elif marker[0] == fence[0] and len(marker) >= fence[1]:
            fence = None
    checks += 1
    if fence is not None:
        _add(findings, "MARKDOWN_FENCE_UNBALANCED", "warning", f"Unclosed fenced code block opened on line {fence[2]}.", relative)
    for match in LINK_RE.finditer(content):
        destination = match.group(1) or match.group(2) or ""
        parsed = urlsplit(destination)
        if parsed.scheme or destination.startswith("//") or not parsed.path:
            continue
        local_path = unquote(parsed.path)
        target = (path.parent / local_path).resolve(strict=False)
        checks += 1
        if not _inside_root(root, target) or not target.exists():
            _add(findings, "MARKDOWN_LINK_BROKEN", "warning", f"Relative Markdown link does not resolve: {destination}", relative)
    return checks

def inspect_repository(root: Path | str) -> dict:
    root = Path(root).resolve()
    findings: list[dict] = []
    passed = 0
    for relative in REQUIRED_FILES:
        target = root / relative
        if target.is_file() and target.stat().st_size > 0 and _inside_root(root, target):
            passed += 1
        else:
            severity = "critical" if relative == "README.md" else "error"
            _add(findings, "REQUIRED_FILE_MISSING", severity, f"Required project file is missing, empty, or unreadable: {relative}", relative)
    files = _all_files(root)
    passed += 1
    if not files:
        _add(findings, "REPOSITORY_EMPTY", "critical", "No repository files were found.")
    markdown_files = _markdown_files(root)
    for path in markdown_files:
        passed += _check_markdown(root, path, findings)
    readme = root / "README.md"
    if readme.is_file():
        try:
            readme_text = readme.read_text(encoding="utf-8")
            start_count, end_count = readme_text.count(START_MARKER), readme_text.count(END_MARKER)
            start_pos, end_pos = readme_text.find(START_MARKER), readme_text.find(END_MARKER)
            if start_count != 1 or end_count != 1 or start_pos < 0 or end_pos < start_pos:
                _add(findings, "README_HEALTH_MARKERS_INVALID", "critical", "README must contain exactly one ordered pair of Wellness Doctor markers.", "README.md")
            else:
                passed += 1
            for link in REQUIRED_README_LINKS:
                if f"]({link})" not in readme_text:
                    _add(findings, "README_AI_LINK_MISSING", "warning", f"README does not link to {link}.", "README.md")
                else:
                    passed += 1
        except (OSError, UnicodeError):
            _add(findings, "README_UNREADABLE", "critical", "README cannot be read as UTF-8.", "README.md")
    quality = root / ".github/workflows/quality.yml"
    wellness = root / ".github/workflows/wellness-doctor.yml"
    if quality.is_file():
        text = quality.read_text(encoding="utf-8")
        missing = [token for token in ["pull_request", "contents: read", "unittest", "wellness_doctor.py"] if token not in text]
        if missing:
            _add(findings, "QUALITY_WORKFLOW_CONTRACT", "error", "Quality workflow is missing required contract elements: " + ", ".join(missing), ".github/workflows/quality.yml")
        else:
            passed += 1
    if wellness.is_file():
        text = wellness.read_text(encoding="utf-8")
        missing = [token for token in ["workflow_dispatch", "schedule", "contents: write", "wellness_doctor.py"] if token not in text]
        if "pull_request" in text:
            missing.append("must not trigger on pull_request")
        if missing:
            _add(findings, "WELLNESS_WORKFLOW_CONTRACT", "error", "Wellness workflow contract is invalid: " + ", ".join(missing), ".github/workflows/wellness-doctor.yml")
        else:
            passed += 1
    status = determine_status(findings)
    counts = {"passed": passed, "warning": 0, "error": 0, "critical": 0}
    for finding in findings:
        counts[finding["severity"]] += 1
    return {
        "schema_version": 1, "generated_at": datetime.now(timezone.utc).isoformat(),
        "status": status, "counts": counts,
        "files": {"total": len(files), "markdown": len(markdown_files)},
        "findings": findings,
    }

def _category_status(findings: list[dict], prefixes: tuple[str, ...]) -> str:
    subset = [finding for finding in findings if finding["id"].startswith(prefixes)]
    return determine_status(subset)["icon"]

def render_health_block(report: dict) -> str:
    status, counts = report["status"], report["counts"]
    findings = report.get("findings", [])
    repo_ids = ("REQUIRED_FILE_", "REPOSITORY_")
    doc_ids = ("MARKDOWN_", "README_AI_LINK_", "README_UNREADABLE")
    workflow_ids = ("QUALITY_WORKFLOW_", "WELLNESS_WORKFLOW_")
    readme_ids = ("README_HEALTH_MARKERS_",)
    rows = [
        ("Repository files", _category_status(findings, repo_ids)),
        ("Documentation and links", _category_status(findings, doc_ids)),
        ("GitHub workflows", _category_status(findings, workflow_ids)),
        ("README health contract", _category_status(findings, readme_ids)),
    ]
    lines = [
        "## 🩺 MeepSheep Wellness Doctor", "",
        f"**Overall health: {status['icon']} {status['label']}** · `{status['code']}`", "",
        "| Inspection | Status |", "|---|---:|",
    ]
    lines.extend(f"| {name} | {icon} |" for name, icon in rows)
    lines.extend([
        "", f"**Checks:** {counts['passed']} passed · 🟡 {counts['warning']} warnings · 🔵 {counts['error']} errors · 🔴 {counts['critical']} critical", "",
        f"[Latest inspection and diagnostic logs]({WORKFLOW_URL})", "",
        "<sub>Scheduled inspections run every 15 minutes on a best-effort basis. The latest workflow run contains the exact inspection time. This summary covers configured repository checks, not unconfigured production services.</sub>",
    ])
    return "\n".join(lines)

def update_readme(root: Path | str, report: dict) -> bool:
    root = Path(root).resolve()
    readme = root / "README.md"
    original = readme.read_text(encoding="utf-8")
    if original.count(START_MARKER) != 1 or original.count(END_MARKER) != 1:
        raise ValueError("README must contain exactly one health marker pair")
    start, end = original.find(START_MARKER), original.find(END_MARKER)
    if start < 0 or end < start:
        raise ValueError("README health markers are missing or out of order")
    content_start = start + len(START_MARKER)
    updated = original[:content_start] + "\n\n" + render_health_block(report) + "\n\n" + original[end:]
    if updated == original:
        return False
    readme.write_text(updated, encoding="utf-8", newline="")
    return True

def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--root", type=Path, default=Path.cwd())
    parser.add_argument("--write-readme", action="store_true")
    parser.add_argument("--json", action="store_true")
    args = parser.parse_args(argv)
    try:
        report = inspect_repository(args.root)
        changed = update_readme(args.root, report) if args.write_readme else False
        report["readme_updated"] = changed
        if args.json:
            print(json.dumps(report, ensure_ascii=False, indent=2))
        else:
            print(f"{report['status']['icon']} {report['status']['label']} ({report['status']['code']})")
            print(f"Passed: {report['counts']['passed']} | Warnings: {report['counts']['warning']} | Errors: {report['counts']['error']} | Critical: {report['counts']['critical']}")
            for finding in report["findings"]:
                location = f" [{finding['path']}]" if finding.get("path") else ""
                print(f"{finding['severity'].upper()}: {finding['id']}{location}: {finding['message']}")
            if args.write_readme:
                print("README health block updated." if changed else "README health block unchanged.")
        return 1 if report["counts"]["error"] or report["counts"]["critical"] else 0
    except Exception as exc:
        print(f"Doctor could not complete: {exc.__class__.__name__}: {exc}", file=sys.stderr)
        return 2

if __name__ == "__main__":
    raise SystemExit(main())
