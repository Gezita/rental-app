#!/usr/bin/env python3
"""Fill CRA T776 E (25) AcroForm fields from JSON on stdin."""

import json
import sys
from pathlib import Path

from pypdf import PdfReader, PdfWriter


def main() -> None:
    if len(sys.argv) < 3:
        print("Usage: fill-t776.py <template.pdf> <output.pdf>", file=sys.stderr)
        sys.exit(1)

    template = Path(sys.argv[1])
    output = Path(sys.argv[2])
    payload = json.load(sys.stdin)
    values_by_short: dict[str, str] = payload.get("fields", {})

    reader = PdfReader(str(template))
    writer = PdfWriter()
    writer.append(reader)

    fields = reader.get_fields() or {}
    updates: dict[str, str] = {}
    for full_name, field in fields.items():
        if field.get("/FT") != "/Tx":
            continue
        short = full_name.split(".")[-1]
        value = values_by_short.get(short)
        if value:
            updates[full_name] = str(value)

    for page in writer.pages:
        writer.update_page_form_field_values(page, updates)

    output.parent.mkdir(parents=True, exist_ok=True)
    with open(output, "wb") as handle:
        writer.write(handle)


if __name__ == "__main__":
    main()
