#!/usr/bin/env python3
from pathlib import Path
from PIL import Image, ImageDraw

root = Path(__file__).resolve().parents[1]
out = root / "webos-app" / "assets" / "lgprivacyshield-icon.png"
scale = 4
size = 130 * scale
im = Image.new("RGBA", (size, size), "#e7ece8")
d = ImageDraw.Draw(im)
def xy(points):
    return [(int(x * scale), int(y * scale)) for x, y in points]

d.rounded_rectangle((0, 0, size - 1, size - 1), radius=27 * scale, fill="#e7ece8")
d.polygon(xy([(65, 12), (111, 29), (111, 64), (108, 77), (101, 89), (90, 99), (65, 119), (40, 107), (29, 98), (21, 85), (19, 64), (19, 29)]), fill="#1f5a62")
d.polygon(xy([(65, 24), (99, 37), (99, 64), (95, 76), (87, 86), (65, 107), (44, 97), (36, 88), (31, 75), (31, 64), (31, 37)]), fill="#e7ece8")
d.rounded_rectangle((38 * scale, 38 * scale, 92 * scale, 95 * scale), radius=27 * scale, fill="#1f5a62")
d.rounded_rectangle((49 * scale, 49 * scale, 81 * scale, 84 * scale), radius=16 * scale, fill="#e7ece8")
d.rectangle((53 * scale, 61 * scale, 77 * scale, 69 * scale), fill="#d39d38")
im.resize((130, 130), Image.Resampling.LANCZOS).save(out, optimize=True)
print(out)
