#!/usr/bin/env python3
"""Write small power-of-two PNGs into textures/ (stdlib only, no Pillow)."""
import os
import struct
import zlib

W = H = 64
OUT = os.path.join(os.path.dirname(__file__), "textures")


def write_png(path, width, height, rgba_flat):
    def chunk(tag, data):
        crc = zlib.crc32(tag + data) & 0xFFFFFFFF
        return struct.pack(">I", len(data)) + tag + data + struct.pack(">I", crc)

    raw = bytearray()
    for y in range(height):
        raw.append(0)
        raw.extend(rgba_flat[y * width * 4 : (y + 1) * width * 4])
    compressed = zlib.compress(bytes(raw), 9)
    ihdr = struct.pack(">IIBBBBB", width, height, 8, 6, 0, 0, 0)
    data = (
        b"\x89PNG\r\n\x1a\n"
        + chunk(b"IHDR", ihdr)
        + chunk(b"IDAT", compressed)
        + chunk(b"IEND", b"")
    )
    with open(path, "wb") as f:
        f.write(data)


def noise(x, y, seed):
    return ((x * 374761393 + y * 668265263 + seed) & 0x7FFFFFFF) / 2147483647.0


def make_grass():
    px = bytearray(W * H * 4)
    for y in range(H):
        for x in range(W):
            n = noise(x, y, 1)
            g = int(55 + 80 * n)
            r = int(25 + 40 * noise(x, y, 2))
            b = int(20 + 30 * noise(x, y, 3))
            i = (y * W + x) * 4
            px[i : i + 4] = bytes([r, g, b, 255])
    return px


def make_dirt():
    px = bytearray(W * H * 4)
    for y in range(H):
        for x in range(W):
            n = noise(x, y, 4)
            r = int(90 + 50 * n)
            g = int(55 + 35 * noise(x, y, 5))
            b = int(35 + 25 * noise(x, y, 6))
            i = (y * W + x) * 4
            px[i : i + 4] = bytes([r, g, b, 255])
    return px


def make_stone():
    px = bytearray(W * H * 4)
    for y in range(H):
        for x in range(W):
            n = noise(x, y, 7)
            v = int(85 + 45 * n)
            i = (y * W + x) * 4
            px[i : i + 4] = bytes([v, v, int(v + 8 * noise(x, y, 8)), 255])
    return px


def make_planks():
    px = bytearray(W * H * 4)
    for y in range(H):
        for x in range(W):
            stripe = (x // 8 + y // 8) % 2
            n = noise(x, y, 9)
            base = 120 if stripe else 95
            r = int(base + 30 * n)
            g = int(base * 0.65 + 20 * n)
            b = int(base * 0.45 + 15 * n)
            i = (y * W + x) * 4
            px[i : i + 4] = bytes([r, g, b, 255])
    return px


def main():
    os.makedirs(OUT, exist_ok=True)
    write_png(os.path.join(OUT, "grass_block.png"), W, H, make_grass())
    write_png(os.path.join(OUT, "dirt_block.png"), W, H, make_dirt())
    write_png(os.path.join(OUT, "stone_block.png"), W, H, make_stone())
    write_png(os.path.join(OUT, "planks_block.png"), W, H, make_planks())
    print("Wrote:", OUT)


if __name__ == "__main__":
    main()
