import json, subprocess, numpy as np
raw = subprocess.run(["/opt/homebrew/bin/ffmpeg","-v","error","-i","tmp/film/voice.mp3","-ac","1","-ar","16000","-f","f32le","-"],capture_output=True).stdout
audio = np.frombuffer(raw, dtype=np.float32)
from faster_whisper import WhisperModel
m = WhisperModel("small.en", device="cpu", compute_type="int8")
segs, _ = m.transcribe(audio, word_timestamps=True, vad_filter=False, beam_size=5)
out = []
for s in segs:
    for w in s.words:
        out.append({"w": w.word.strip(), "s": round(w.start, 3), "e": round(w.end, 3), "p": round(w.probability, 3)})
    print(f"{s.start:6.2f}-{s.end:6.2f} {s.text}")
json.dump(out, open("tmp/film/voice-words.json", "w"), indent=1)
print("words", len(out))
