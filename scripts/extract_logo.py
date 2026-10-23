"""Extract MyHR logo variants from the brand identity presentation.

Usage (from the frontend root):  python scripts/extract_logo.py
Needs only Pillow. Source: public/MyHR Brand Identity Presentation.png
"""
from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parent.parent
SRC = ROOT / "public" / "MyHR Brand Identity Presentation.png"
OUT = ROOT / "public" / "images" / "logo"

# Pixel boxes inside the 1254x1254 source (hero logo).
LOCKUP_BOX = (190, 152, 1078, 445)  # icon + MyHR + tagline
ICON_BOX = (190, 152, 518, 445)
TAGLINE_BOX = (545, 400, 1078, 445)  # erased for the "no tagline" variant


def to_transparent(img: Image.Image) -> Image.Image:
    """Turn a logo on a white background into an RGBA image with real alpha."""
    img = img.convert("RGB")
    src = img.load()
    out = Image.new("RGBA", img.size)
    dst = out.load()
    for y in range(img.height):
        for x in range(img.width):
            r, g, b = src[x, y]
            diff = max(255 - r, 255 - g, 255 - b)
            if diff < 8:
                dst[x, y] = (0, 0, 0, 0)
                continue
            a = diff / 255.0
            dst[x, y] = (
                round(255 - (255 - r) / a),
                round(255 - (255 - g) / a),
                round(255 - (255 - b) / a),
                round(a * 255),
            )
    return out


def to_dark_mode(img: Image.Image) -> Image.Image:
    """Navy parts (wordmark, heart, head) -> white; blue parts stay blue."""
    out = img.copy()
    px = out.load()
    for y in range(out.height):
        for x in range(out.width):
            r, g, b, a = px[x, y]
            if a == 0:
                continue
            w = 1.0 - min(1.0, max(0.0, (g - 45) / 65.0))  # 1 = navy, 0 = blue
            # Muted tagline grey also lightens a bit for contrast on navy.
            px[x, y] = (
                round(r + (255 - r) * w),
                round(g + (255 - g) * w),
                round(b + (255 - b) * w),
                a,
            )
    return out


def erase(img: Image.Image, box, origin) -> Image.Image:
    img = img.copy()
    px = img.load()
    x0, y0, x1, y1 = (box[0] - origin[0], box[1] - origin[1], box[2] - origin[0], box[3] - origin[1])
    for y in range(max(0, y0), min(img.height, y1)):
        for x in range(max(0, x0), min(img.width, x1)):
            px[x, y] = (0, 0, 0, 0)
    return img


def trim(img: Image.Image, pad: int = 0) -> Image.Image:
    bbox = img.getchannel("A").point(lambda v: 255 if v > 10 else 0).getbbox()
    img = img.crop(bbox)
    if pad:
        canvas = Image.new("RGBA", (img.width + pad * 2, img.height + pad * 2), (0, 0, 0, 0))
        canvas.paste(img, (pad, pad))
        return canvas
    return img


def square(img: Image.Image, size: int, pad_ratio: float = 0.0, bg=None) -> Image.Image:
    inner = int(size * (1 - pad_ratio * 2))
    scale = inner / max(img.size)
    resized = img.resize((max(1, round(img.width * scale)), max(1, round(img.height * scale))), Image.LANCZOS)
    canvas = Image.new("RGBA", (size, size), bg or (0, 0, 0, 0))
    canvas.alpha_composite(resized, ((size - resized.width) // 2, (size - resized.height) // 2))
    return canvas


def main() -> None:
    OUT.mkdir(parents=True, exist_ok=True)
    source = Image.open(SRC)

    lockup = to_transparent(source.crop(LOCKUP_BOX))
    icon = to_transparent(source.crop(ICON_BOX))

    lockup_clean = trim(erase(lockup, TAGLINE_BOX, LOCKUP_BOX[:2]))
    lockup_full = trim(lockup)
    icon = trim(icon)

    lockup_clean.save(OUT / "myhr-logo.png", optimize=True)
    to_dark_mode(lockup_clean).save(OUT / "myhr-logo-dark.png", optimize=True)
    lockup_full.save(OUT / "myhr-logo-tagline.png", optimize=True)
    to_dark_mode(lockup_full).save(OUT / "myhr-logo-tagline-dark.png", optimize=True)
    icon.save(OUT / "myhr-icon.png", optimize=True)

    # Favicons / app icon: white mark on blue rounded tile (matches the brand "App Icon").
    tile = Image.new("RGBA", (512, 512), (0, 0, 0, 0))
    from PIL import ImageDraw

    ImageDraw.Draw(tile).rounded_rectangle((0, 0, 511, 511), radius=112, fill=(15, 113, 243, 255))
    white_icon = to_dark_mode(icon)
    # Make the whole mark white (blue parts too) for the tile.
    wpx = white_icon.load()
    for y in range(white_icon.height):
        for x in range(white_icon.width):
            a = wpx[x, y][3]
            wpx[x, y] = (255, 255, 255, a)
    tile.alpha_composite(square(white_icon, 512, pad_ratio=0.2))
    tile.save(ROOT / "public" / "favicon.png", optimize=True)
    tile.resize((48, 48), Image.LANCZOS).save(
        ROOT / "public" / "images" / "favicon.ico", sizes=[(16, 16), (32, 32), (48, 48)]
    )
    tile.save(OUT / "myhr-app-icon.png", optimize=True)
    print("done")


if __name__ == "__main__":
    main()
