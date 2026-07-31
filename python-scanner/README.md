# Python Scanner (OpenCV + pyzbar)

Python-based QR and barcode scanning for the multiscanning project. Uses **OpenCV** for image capture/processing and **pyzbar** (ZBar) for decoding.

## Setup

### 1. Create a virtual environment (recommended)

```powershell
cd C:\Users\Shruti\Desktop\MULTISCANNING\multiple-QRSCANNER\python-scanner
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
```

### 2. Windows: ZBar DLL for pyzbar

`pyzbar` is a Python wrapper around the native **ZBar** library. On Windows you must make `libzbar-64.dll` available:

**Option A — Chocolatey (easiest)**

```powershell
choco install zbar
```

**Option B — Manual**

1. Download a Windows ZBar build (e.g. from [SourceForge ZBar](https://sourceforge.net/projects/zbar/files/) or a trusted mirror).
2. Copy `libzbar-64.dll` into one of:
   - This folder: `python-scanner\`
   - Your Python `Scripts\` folder (inside `.venv`)
   - A directory already on your `PATH`

If pyzbar cannot find the DLL, import/decode will fail with an error mentioning `libzbar-64.dll`.

### 3. Verify installation

```powershell
python -c "from pyzbar.pyzbar import decode; import cv2; print('OK', cv2.__version__)"
```

## Usage

### Scan an image file

```powershell
python scan_image.py path\to\image.png
python scan_image.py path\to\image.png --json
python scan_image.py path\to\image.png --save annotated.png
```

### Live webcam scanner

```powershell
python scan_webcam.py
python scan_webcam.py --camera 1
```

Press **q** in the preview window to quit.

## Dependencies

| Package | Purpose |
|---------|---------|
| `opencv-python` | Image I/O, webcam capture, annotation |
| `pyzbar` | QR/barcode decoding (wraps ZBar) |
| `numpy` | Array operations (OpenCV dependency) |
| `Pillow` | Optional image utilities |

For headless/server use (no GUI), swap `opencv-python` with `opencv-python-headless` in `requirements.txt`.

## Integration with the Node.js app

The main web app (`server/` + `client/`) still uses **jsQR** and **Sharp**. This Python module is a standalone scanner you can run from the CLI or call from a future Flask backend (see `ROADMAP.md` Phase 7).
