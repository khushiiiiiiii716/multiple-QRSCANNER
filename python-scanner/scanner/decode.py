"""Barcode/QR decoding with OpenCV + pyzbar."""

from __future__ import annotations

from dataclasses import dataclass
from pathlib import Path
from typing import Iterable

import cv2
import numpy as np
from pyzbar.pyzbar import ZBarSymbol, decode


@dataclass(frozen=True)
class BarcodeResult:
    data: str
    symbology: str
    rect: tuple[int, int, int, int]  # x, y, width, height
    polygon: tuple[tuple[int, int], ...]


def _to_results(decoded) -> list[BarcodeResult]:
    results: list[BarcodeResult] = []
    for item in decoded:
        text = item.data.decode("utf-8", errors="replace")
        x, y, w, h = item.rect
        polygon = tuple((point.x, point.y) for point in item.polygon)
        results.append(
            BarcodeResult(
                data=text,
                symbology=item.type,
                rect=(x, y, w, h),
                polygon=polygon,
            )
        )
    return results


def decode_barcodes(
    image: np.ndarray,
    *,
    symbols: Iterable[ZBarSymbol] | None = None,
) -> list[BarcodeResult]:
    """Decode all barcodes/QR codes in a BGR OpenCV image."""
    if image is None or image.size == 0:
        return []

    gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY) if len(image.shape) == 3 else image
    decoded = decode(gray, symbols=symbols)
    return _to_results(decoded)


def decode_image_file(path: str | Path) -> tuple[list[BarcodeResult], np.ndarray]:
    """Load an image from disk and decode all codes in it."""
    image_path = Path(path)
    image = cv2.imread(str(image_path))
    if image is None:
        raise FileNotFoundError(f"Could not read image: {image_path}")
    return decode_barcodes(image), image


def annotate_image(image: np.ndarray, results: list[BarcodeResult]) -> np.ndarray:
    """Draw bounding boxes and labels for detected codes."""
    annotated = image.copy()
    for index, result in enumerate(results, start=1):
        x, y, w, h = result.rect
        cv2.rectangle(annotated, (x, y), (x + w, y + h), (0, 200, 80), 2)
        label = f"{index}: {result.symbology}"
        cv2.putText(
            annotated,
            label,
            (x, max(y - 8, 16)),
            cv2.FONT_HERSHEY_SIMPLEX,
            0.5,
            (0, 200, 80),
            1,
            cv2.LINE_AA,
        )
    return annotated
