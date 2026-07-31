#!/usr/bin/env python3
"""Scan QR/barcodes from an image file."""

from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

from scanner.decode import annotate_image, decode_image_file


def main() -> int:
    parser = argparse.ArgumentParser(description="Decode QR/barcodes from an image.")
    parser.add_argument("image", type=Path, help="Path to image file")
    parser.add_argument(
        "--save",
        type=Path,
        help="Optional path to save annotated output image",
    )
    parser.add_argument(
        "--json",
        action="store_true",
        help="Print results as JSON",
    )
    args = parser.parse_args()

    try:
        results, image = decode_image_file(args.image)
    except FileNotFoundError as exc:
        print(exc, file=sys.stderr)
        return 1

    payload = [
        {
            "data": result.data,
            "symbology": result.symbology,
            "rect": {
                "x": result.rect[0],
                "y": result.rect[1],
                "width": result.rect[2],
                "height": result.rect[3],
            },
        }
        for result in results
    ]

    if args.json:
        print(json.dumps({"totalFound": len(payload), "codes": payload}, indent=2))
    else:
        print(f"Found {len(payload)} code(s) in {args.image}")
        for index, item in enumerate(payload, start=1):
            print(f"  [{index}] {item['symbology']}: {item['data']}")

    if args.save:
        annotated = annotate_image(image, results)
        args.save.parent.mkdir(parents=True, exist_ok=True)
        import cv2

        cv2.imwrite(str(args.save), annotated)
        print(f"Saved annotated image to {args.save}")

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
