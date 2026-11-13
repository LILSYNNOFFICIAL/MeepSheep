#!/usr/bin/env python3
"""Dependency-free static checks for the MeepSheep company website."""
from __future__ import annotations

from html.parser import HTMLParser
from pathlib import Path
import sys

ROOT = Path(__file__).resolve().parents[1]
HTML = ROOT / "index.html"
CSS = ROOT / "styles.css"
JS = ROOT / "app.js"

class SiteParser(HTMLParser):
    def __init__(self) -> None:
        super().__init__(convert_charrefs=True)
        self.ids: set[str] = set()
        self.links: list[tuple[str, dict[str, str | None]]] = []
        self.tags: list[str] = []
        self.h1_count = 0
        self.lang: str | None = None

    def handle_starttag(self, tag: str, attrs) -> None:
        data = dict(attrs)
        self.tags.append(tag)
        if tag == "html":
            self.lang = data.get("lang")
        if data.get("id"):
            self.ids.add(str(data["id"]))
        if tag == "h1":
            self.h1_count += 1
        for key in ("href", "src"):
            value = data.get(key)
            if value:
                self.links.append((str(value), data))
        if tag == "a" and data.get("target") == "_blank":
            rel = set((data.get("rel") or "").lower().split())
            if not {"noopener", "noreferrer"}.issubset(rel):
                raise ValueError("External target=_blank link must use rel=noopener noreferrer")

def require(condition: bool, message: str) -> None:
    if not condition:
        raise ValueError(message)

def main() -> int:
    try:
        require(HTML.is_file() and CSS.is_file() and JS.is_file(), "Required website asset is missing")
        html = HTML.read_text(encoding="utf-8")
        css = CSS.read_text(encoding="utf-8")
        js = JS.read_text(encoding="utf-8")
        parser = SiteParser()
        parser.feed(html)
        parser.close()

        require(html.lstrip().lower().startswith("<!doctype html>"), "HTML5 doctype is missing")
        require(parser.lang == "en", "Root html lang must be en")
        require(parser.h1_count == 1, f"Expected exactly one h1, found {parser.h1_count}")
        require("main" in parser.tags and "nav" in parser.tags and "footer" in parser.tags, "Semantic main/nav/footer landmarks are required")
        require('name="viewport"' in html and 'name="description"' in html, "Viewport and description metadata are required")
        require('href="/styles.css"' in html and 'src="/app.js"' in html, "Stylesheet and script references are required")
        require("prefers-reduced-motion" in css, "Reduced-motion support is required")
        require("@media (max-width: 680px)" in css, "Mobile responsive breakpoint is required")
        require("aria-expanded" in js and "Escape" in js, "Mobile navigation must support state and Escape key")
        require("menu-toggle" in html and 'aria-controls="main-nav"' in html, "Accessible mobile menu controls are required")

        broken = []
        for destination, _attrs in parser.links:
            if destination.startswith(("#", "https://", "http://", "mailto:", "tel:")):
                if destination.startswith("#") and destination[1:] and destination[1:] not in parser.ids:
                    broken.append(destination)
                continue
            local = destination.split("?", 1)[0].split("#", 1)[0]
            if not local:
                continue
            relative = local.lstrip("/")
            target = ROOT / relative
            if not target.is_file():
                broken.append(destination)
        require(not broken, "Broken local links or anchors: " + ", ".join(broken))

        print("Website validation passed.")
        print(f"HTML landmarks: {len(parser.tags)} tags; local links: {len(parser.links)}; assets: 3 core files.")
        return 0
    except Exception as exc:
        print(f"Website validation failed: {exc}", file=sys.stderr)
        return 1

if __name__ == "__main__":
    raise SystemExit(main())
