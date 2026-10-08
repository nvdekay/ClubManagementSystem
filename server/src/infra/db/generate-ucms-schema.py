"""Generate the Mongo schema inventory from the checked-in DBML design.

Run from the repository root: python3 server/src/infra/db/generate-ucms-schema.py
"""

from __future__ import annotations

import ast
import json
import re
from pathlib import Path


ROOT = Path(__file__).resolve().parents[4]
SOURCE = ROOT / "docs/05-implementation/UCMS_Database_Design.dbml"
TARGET = Path(__file__).with_name("ucms-schema.generated.ts")
FIELD = re.compile(r'^\s*(\w+)\s+("[^"]+"|\w+)\s*(?:\[(.*)\])?\s*$')
INDEX = re.compile(r'^\s*(\([^)]*\)|\w+)\s+\[(.*)\]\s*$')
START = re.compile(r'^(Enum|Table)\s+(\w+)\s*\{')


def split_attributes(value: str) -> list[str]:
    return [part.strip() for part in re.split(r",\s*(?=(?:[^']*'[^']*')*[^']*$)", value)]


def parse_attributes(value: str | None) -> dict[str, object]:
    result: dict[str, object] = {}
    for part in split_attributes(value or ""):
        if not part or part.startswith("note:"):
            continue
        if part.startswith("default:"):
            raw = part.partition(":")[2].strip()
            result["default"] = ast.literal_eval(raw) if raw.startswith("'") else json.loads(raw)
        elif part.startswith("name:"):
            result["name"] = ast.literal_eval(part.partition(":")[2].strip())
        elif part in {"pk", "unique", "not null"}:
            result[{"not null": "required"}.get(part, part)] = True
        else:
            raise ValueError(f"Unsupported DBML attribute: {part}")
    return result


def main() -> None:
    enums: dict[str, list[str]] = {}
    tables: dict[str, dict[str, object]] = {}
    section = None
    name = None
    in_indexes = False
    for line_number, line in enumerate(SOURCE.read_text().splitlines(), 1):
        stripped = line.strip()
        if not section:
            match = START.match(stripped)
            if match:
                section, name = match.groups()
                in_indexes = False
                if section == "Enum":
                    enums[name] = []
                else:
                    tables[name] = {"fields": {}, "indexes": []}
            continue
        if stripped == "}":
            if in_indexes:
                in_indexes = False
            else:
                section = name = None
            continue
        if not stripped or stripped.startswith("//") or stripped.startswith("Note:"):
            continue
        if section == "Enum":
            raw = stripped.split(" [", 1)[0]
            enums[name].append(ast.literal_eval(raw) if raw.startswith('"') else raw)
            continue
        table = tables[name]
        if stripped == "indexes {":
            in_indexes = True
            continue
        if in_indexes:
            match = INDEX.match(stripped)
            if not match:
                raise ValueError(f"Unsupported index at line {line_number}: {stripped}")
            key, raw_attrs = match.groups()
            attrs = parse_attributes(raw_attrs)
            keys = [item.strip() for item in key.strip("()").split(",")]
            table["indexes"].append({"fields": keys, **attrs})
            continue
        match = FIELD.match(stripped)
        if not match:
            raise ValueError(f"Unsupported field at line {line_number}: {stripped}")
        field, field_type, raw_attrs = match.groups()
        attrs = parse_attributes(raw_attrs)
        if field == "id" and field_type == "objectId" and attrs.get("pk"):
            continue  # Mongo's _id is the ObjectId primary key.
        field_type = field_type.strip('"')
        if field_type not in {"objectId", "string", "string[]", "text", "int", "decimal", "bool", "datetime", "json"} and field_type not in enums:
            raise ValueError(f"Unknown type {field_type} at line {line_number}")
        attrs.pop("pk", None)
        table["fields"][field] = {"type": field_type, **attrs}
    if len(tables) != 49 or len(enums) != 24:
        raise ValueError(f"Unexpected DBML inventory: {len(tables)} tables, {len(enums)} enums")
    output = (
        "// Generated from docs/05-implementation/UCMS_Database_Design.dbml.\n"
        "// Run python3 server/src/infra/db/generate-ucms-schema.py after DBML changes.\n"
        "// Do not edit by hand.\n"
        f"export const ucmsEnums = {json.dumps(enums, ensure_ascii=False, indent=2)} as const;\n\n"
        f"export const ucmsTables = {json.dumps(tables, ensure_ascii=False, indent=2)} as const;\n"
    )
    TARGET.write_text(output)
    print(f"Generated {len(tables)} collections and {len(enums)} enums in {TARGET.name}")


if __name__ == "__main__":
    main()
