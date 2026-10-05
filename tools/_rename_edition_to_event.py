#!/usr/bin/env python3
"""Hard rename edition→event in Manager frontend (paths, types, strings)."""

from __future__ import annotations

import re
import shutil
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SKIP = {"node_modules", ".git", "tools", ".expo", "dist"}

REPLACEMENTS = [
    ("ApiEdition", "ApiEvent"),
    ("EditionDivision", "EventDivision"),
    ("EditionLottery", "EventLottery"),
    ("EditionParticipation", "EventParticipation"),
    ("EditionRegistration", "EventRegistration"),
    ("EditionReferral", "EventReferral"),
    ("editionDivisions", "eventDivisions"),
    ("editionLotteries", "eventLotteries"),
    ("editionParticipations", "eventParticipations"),
    ("editionRegistrations", "eventRegistrations"),
    ("editionWorkspace", "eventWorkspace"),
    ("useEdition", "useEvent"),
    ("id_edition_division", "id_event_division"),
    ("edition_division_id", "event_division_id"),
    ("id_edition", "id_event"),
    ("edition_id", "event_id"),
    ("show_edition_label", "show_event_label"),
    ("/editions", "/events"),
    ("'editions'", "'events'"),
    ('"editions"', '"events"'),
    ("edition-", "event-"),
    ("Edition", "Event"),
    ("edition", "event"),
]


def should_skip(path: Path) -> bool:
    return any(part in SKIP for part in path.parts)


def transform(text: str) -> str:
    for old, new in REPLACEMENTS:
        text = text.replace(old, new)
    # repair doubles
    text = text.replace("EventEvent", "Event")
    text = text.replace("event_event_", "event_")
    text = text.replace("eventevent", "event")
    return text


def main() -> None:
    # Content first
    updated = 0
    for path in ROOT.rglob("*"):
        try:
            if not path.is_file() or path.is_symlink() or should_skip(path):
                continue
        except OSError:
            continue
        if path.suffix not in {".ts", ".tsx", ".js", ".jsx", ".json", ".md"}:
            continue
        try:
            text = path.read_text(encoding="utf-8")
        except Exception:
            continue
        new = transform(text)
        if new != text:
            path.write_text(new, encoding="utf-8")
            updated += 1
    print(f"content updated: {updated}")

    # Rename directories with edition in name (deepest first)
    dirs = [p for p in ROOT.rglob("*") if p.is_dir() and not should_skip(p) and "edition" in p.name.lower()]
    dirs.sort(key=lambda p: len(p.parts), reverse=True)
    for d in dirs:
        new_name = d.name.replace("edition", "event").replace("Edition", "Event")
        target = d.with_name(new_name)
        if target.exists():
            print("dir exists", target)
            continue
        d.rename(target)
        print(f"dir {d.relative_to(ROOT)} -> {target.relative_to(ROOT)}")

    # Rename files
    files = [p for p in ROOT.rglob("*") if p.is_file() and not should_skip(p) and "edition" in p.name.lower()]
    files.sort(key=lambda p: len(str(p)), reverse=True)
    for f in files:
        new_name = f.name.replace("edition", "event").replace("Edition", "Event")
        target = f.with_name(new_name)
        if target.exists():
            print("file exists", target)
            continue
        f.rename(target)
        print(f"file {f.relative_to(ROOT)} -> {target.relative_to(ROOT)}")


if __name__ == "__main__":
    main()
