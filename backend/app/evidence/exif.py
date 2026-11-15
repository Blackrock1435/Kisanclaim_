from __future__ import annotations
import hashlib
from datetime import datetime
from io import BytesIO
from PIL import ExifTags, Image

ALLOWED = {"image/jpeg": ".jpg", "image/png": ".png", "image/webp": ".webp"}


def sha256(b: bytes) -> str:
    return hashlib.sha256(b).hexdigest()


def sniff(b: bytes) -> str | None:
    """Detect type from file content, not the client-supplied header."""
    if b[:3] == b"\xff\xd8\xff":
        return "image/jpeg"
    if b[:8] == b"\x89PNG\r\n\x1a\n":
        return "image/png"
    if b[:4] == b"RIFF" and b[8:12] == b"WEBP":
        return "image/webp"
    return None


def _deg(v, ref):
    d = float(v[0]) + float(v[1]) / 60 + float(v[2]) / 3600
    return -d if ref in ("S", "W") else d


def extract(b: bytes) -> dict:
    """GPS + capture time from EXIF when present. Missing GPS is normal (not an indicator of fraud)."""
    out = {"lat": None, "lon": None, "taken_at": None}
    try:
        img = Image.open(BytesIO(b))
        ex = img.getexif()
        if not ex:
            return out
        sub = ex.get_ifd(ExifTags.IFD.Exif)
        raw = sub.get(36867) or ex.get(306)  # DateTimeOriginal / DateTime
        if raw:
            out["taken_at"] = datetime.strptime(str(raw), "%Y:%m:%d %H:%M:%S")
        gps = ex.get_ifd(ExifTags.IFD.GPSInfo)
        if gps and 2 in gps and 4 in gps:
            out["lat"] = _deg(gps[2], gps.get(1, "N"))
            out["lon"] = _deg(gps[4], gps.get(3, "E"))
    except Exception:
        pass
    return out
