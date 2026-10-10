"""Edit genuine browser frame captures into desktop and mobile ARED films.

Requires Pillow, the project's converted Inter/Fraunces fonts and ffmpeg.
Run from the repository root. Source screenshots are frames sampled from live
interactions, not supplied reference screenshots or fabricated product screens.
"""
import bisect
import functools
import json
from pathlib import Path
import subprocess
import sys

from PIL import Image, ImageDraw, ImageFont

ROOT = Path("artifacts/ared-films")
FPS = 30
LINEN = (247, 245, 243)
INK = (13, 13, 13)
STONE = (110, 106, 105)
VOICE = Path("/Users/E127943/Downloads/ElevenLabs_2026-10-03T14_39_34_PY_eleven_v4.mp3")


def ease(t):
    t = max(0, min(1, t))
    return 1 - (1 - t) ** 3


@functools.lru_cache(maxsize=100)
def font(size, display=False):
    f = ImageFont.truetype(str(ROOT / ("Fraunces.ttf" if display else "Inter.ttf")), size)
    # Next's downloaded Fraunces subset defaults to weight 900. Match the
    # project's Cosmos display weight instead of accidentally exporting bold.
    if display:
        f.set_variation_by_axes([74, 350])
    else:
        f.set_variation_by_axes([400])
    return f


def centered_text(canvas, text, y, size, color=INK, display=False, opacity=1):
    layer = Image.new("RGBA", canvas.size)
    d = ImageDraw.Draw(layer)
    f = font(size, display)
    box = d.textbbox((0, 0), text, font=f)
    x = (canvas.width - (box[2] - box[0])) / 2 - box[0]
    d.text((x, y - box[1]), text, font=f, fill=(*color, int(opacity * 255)))
    canvas.paste(layer, (0, 0), layer)


def identity(t, mobile, closing=False):
    w, h = (1080, 1920) if mobile else (1920, 1080)
    canvas = Image.new("RGB", (w, h), LINEN)
    p = ease(t / .75)
    size = 190 if mobile else 230
    y = h * (.37 if closing else .40) + 28 * (1 - p)
    centered_text(canvas, "ARED", y, size, display=True, opacity=p)
    if closing:
        lines = ["More ways to find, connect,", "and produce knowledge."] if mobile else ["More ways to find, connect, and produce knowledge."]
        for i, line in enumerate(lines):
            centered_text(canvas, line, h * .55 + i * 58, 42 if mobile else 40,
                          STONE, opacity=ease((t - .25) / .8))
        centered_text(canvas, "ared.design", h * .70, 34, opacity=ease((t - .5) / .8))
    else:
        d = ImageDraw.Draw(canvas)
        line_width = int((w * .28) * ease((t - .25) / 1.0))
        d.line((w / 2 - line_width / 2, h * .64, w / 2 + line_width / 2, h * .64), fill=STONE, width=2)
    return canvas


class Shot:
    def __init__(self, folder, name):
        self.files = sorted((ROOT / folder).glob(name + "-*.png"))
        meta = json.loads((ROOT / folder / (name + ".json")).read_text())
        self.times = meta["times"]
        self.duration = meta["duration"]
        if len(self.files) < len(self.times):
            raise ValueError("Incomplete capture: " + name)
        self.cache = {}

    def frame(self, t, size):
        index = min(len(self.times) - 1, max(0, bisect.bisect_right(self.times, t) - 1))
        if index not in self.cache:
            self.cache[index] = Image.open(self.files[index]).convert("RGB").resize(size, Image.Resampling.LANCZOS)
            if len(self.cache) > 3:
                del self.cache[next(iter(self.cache))]
        return self.cache[index].copy()


def render(mobile, narrated):
    size = (1080, 1920) if mobile else (1920, 1080)
    folder = "frames-mobile" if mobile else "frames-desktop"
    # Captures use independent responsive layouts. No desktop UI is cropped into
    # a phone frame; all pixels of each real viewport remain visible.
    if narrated:
        timeline = [("intro", 2), ("home", 8), ("explore-ready", 8),
                    ("search-live", 8), ("record", 8), ("provenance", 4),
                    ("for-you-images", 6), ("save-prompt", 4), ("end", 6)]
    else:
        timeline = [("intro", 2), ("home", 4), ("explore-ready", 3),
                    ("for-you-images", 3), ("end", 3)]
    suffix = "mobile" if mobile else "desktop"
    name = ("ARED-explainer-draft-54s-" if narrated else "ARED-motion-15s-") + suffix
    silent = ROOT / (name + ".silent.mp4")
    output = ROOT / (name + ".mp4")
    args = ["ffmpeg", "-hide_banner", "-loglevel", "error", "-y", "-f", "rawvideo",
            "-pix_fmt", "rgb24", "-s", f"{size[0]}x{size[1]}", "-r", str(FPS),
            "-i", "pipe:0", "-an", "-c:v", "libx264", "-preset", "fast", "-crf", "18",
            "-pix_fmt", "yuv420p", "-movflags", "+faststart", str(silent)]
    process = subprocess.Popen(args, stdin=subprocess.PIPE)
    last = None
    for name, length in timeline:
        print(suffix, "narrated" if narrated else "short", name, flush=True)
        shot = None if name in ("intro", "end") else Shot(folder, name)
        for n in range(round(length * FPS)):
            t = n / FPS
            if shot:
                # Time-remap at a restrained rate; footage is never a still-image
                # substitution for a product interaction.
                clip_time = min(shot.duration - .08, t / length * shot.duration)
                frame = shot.frame(clip_time, size)
            else:
                frame = identity(t, mobile, name == "end")
            # Short linen cross-dissolves avoid dramatic wipes or color overlays.
            if last is not None and n < 8:
                frame = Image.blend(last, frame, ease(n / 8))
            process.stdin.write(frame.tobytes())
        last = frame.copy()
    process.stdin.close()
    if process.wait() != 0:
        raise RuntimeError("Video encoder failed")
    if narrated:
        subprocess.run(["ffmpeg", "-hide_banner", "-loglevel", "error", "-y", "-i", str(silent),
                        "-i", str(VOICE), "-map", "0:v:0", "-map", "1:a:0", "-c:v", "copy",
                        "-c:a", "aac", "-b:a", "192k", "-af", "loudnorm=I=-16:TP=-1.5:LRA=11,apad", "-t", "54",
                        "-movflags", "+faststart", str(output)], check=True)
        silent.unlink()
    else:
        silent.rename(output)
    print("EXPORTED", output, flush=True)


if __name__ == "__main__":
    modes = sys.argv[1:] or ["short", "narrated"]
    for mode in modes:
        for mobile in [False, True]:
            render(mobile, mode == "narrated")
