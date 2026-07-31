#!/usr/bin/env python3
"""Live QR/barcode scanner using the default webcam."""

from __future__ import annotations

import argparse
import sys
import time

import cv2

from scanner.decode import annotate_image, decode_barcodes


def main() -> int:
    parser = argparse.ArgumentParser(description="Scan QR/barcodes from webcam.")
    parser.add_argument("--camera", type=int, default=0, help="Camera index (default: 0)")
    parser.add_argument(
        "--interval",
        type=float,
        default=0.25,
        help="Seconds between decode attempts (default: 0.25)",
    )
    args = parser.parse_args()

    cap = cv2.VideoCapture(args.camera)
    if not cap.isOpened():
        print(f"Could not open camera {args.camera}", file=sys.stderr)
        return 1

    print("Press q to quit.")
    last_decode = 0.0
    latest_results = []

    try:
        while True:
            ok, frame = cap.read()
            if not ok:
                print("Failed to read frame.", file=sys.stderr)
                break

            now = time.time()
            if now - last_decode >= args.interval:
                latest_results = decode_barcodes(frame)
                for result in latest_results:
                    print(f"[{result.symbology}] {result.data}")
                last_decode = now

            display = annotate_image(frame, latest_results)
            cv2.imshow("multiscanning - press q to quit", display)
            if cv2.waitKey(1) & 0xFF == ord("q"):
                break
    finally:
        cap.release()
        cv2.destroyAllWindows()

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
