# v3.24 Jarvis: laptop par free Whisper (faster-whisper). Install: pip install faster-whisper
# Use: python stt.py <audio-file> [model]   -> prints text
import sys

def main():
    if len(sys.argv) < 2:
        print("", end=""); return
    from faster_whisper import WhisperModel
    model = sys.argv[2] if len(sys.argv) > 2 else "small"
    m = WhisperModel(model, device="auto", compute_type="int8")
    segs, _ = m.transcribe(sys.argv[1], beam_size=1, vad_filter=True)
    sys.stdout.write(" ".join(s.text.strip() for s in segs).strip())

if __name__ == "__main__":
    main()
