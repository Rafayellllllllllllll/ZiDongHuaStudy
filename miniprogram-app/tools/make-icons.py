#!/usr/bin/env python3
"""Draw the five tab icons. Shapes only — no character used as a logo."""
from pathlib import Path
from PIL import Image, ImageDraw

ROOT = Path(__file__).resolve().parents[1] / "assets" / "tab"
SIZE = 81
IDLE = (138, 163, 154, 255)
ON = (31, 143, 116, 255)


def canvas():
    image = Image.new("RGBA", (SIZE, SIZE), (0, 0, 0, 0))
    return image, ImageDraw.Draw(image)


def home(draw, color):
    draw.line([(18, 38), (40, 18), (62, 38)], fill=color, width=5, joint="curve")
    draw.rounded_rectangle((24, 36, 56, 64), radius=5, outline=color, width=5)
    draw.line([(40, 63), (40, 49)], fill=color, width=5)


def bank(draw, color):
    draw.rounded_rectangle((22, 18, 58, 64), radius=7, outline=color, width=5)
    draw.line([(32, 34), (48, 34)], fill=color, width=5)
    draw.line([(32, 46), (48, 46)], fill=color, width=5)


def practice(draw, color):
    draw.line([(26, 56), (54, 26)], fill=color, width=5)
    draw.polygon([(50, 18), (64, 22), (56, 32)], fill=color)


def stats(draw, color):
    draw.rounded_rectangle((20, 40, 30, 64), radius=3, fill=color)
    draw.rounded_rectangle((36, 24, 46, 64), radius=3, fill=color)
    draw.rounded_rectangle((52, 34, 62, 64), radius=3, fill=color)


def me(draw, color):
    draw.ellipse((30, 14, 52, 36), outline=color, width=5)
    draw.arc((18, 38, 64, 84), 200, 340, fill=color, width=5)


DRAW = {
    "home": home,
    "bank": bank,
    "practice": practice,
    "stats": stats,
    "me": me,
}


def main():
    ROOT.mkdir(parents=True, exist_ok=True)
    for name, fn in DRAW.items():
        for suffix, color in (("", IDLE), ("-on", ON)):
            image, draw = canvas()
            fn(draw, color)
            image.save(ROOT / ("%s%s.png" % (name, suffix)))


if __name__ == "__main__":
    main()
