import subprocess, time, requests
from app.services.audio_service import get_ffmpeg_binary

ffmpeg = get_ffmpeg_binary()
video_file = 'storage/uploads/7b8a0c6f-7c62-4aef-bf4f-fb9593ed8018.mp4'

print("=== BẮT ĐẦU TEST DỊCH TRỰC TIẾP TỪNG PHÂN ĐOẠN (SIMULATION) ===\n")

# Test 4 consecutive slices of 3 seconds each
slices = [
    (2, 3),
    (5, 3),
    (8, 3),
    (11, 3)
]

prev_context = ''
for idx, (start_sec, dur_sec) in enumerate(slices, 1):
    cmd = [
        ffmpeg, '-y',
        '-ss', str(start_sec),
        '-i', video_file,
        '-t', str(dur_sec),
        '-vn', '-acodec', 'pcm_s16le', '-ar', '16000', '-ac', '1',
        '-f', 'wav', 'pipe:1'
    ]
    p = subprocess.Popen(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE)
    wav_bytes, _ = p.communicate()
    
    t0 = time.time()
    res = requests.post(
        'http://127.0.0.1:8000/api/live/translate-chunk',
        files={'audio': (f'chunk_{idx}.wav', wav_bytes, 'audio/wav')},
        data={
            'source_language': 'auto',
            'target_language': 'vi',
            'translation_style': 'anime',
            'prev_context': prev_context
        }
    )
    latency = time.time() - t0
    data = res.json()
    
    m_start = f"{start_sec // 60:02d}:{start_sec % 60:02d}"
    m_end = f"{(start_sec + dur_sec) // 60:02d}:{(start_sec + dur_sec) % 60:02d}"
    
    print(f"📍 [CÂU {idx}] Mốc thời gian: [{m_start} --> {m_end}] (Độ trễ: {latency:.2f}s)")
    if data.get('is_speech'):
        print(f"   🎙️ Giọng gốc: \"{data.get('original_text')}\"")
        print(f"   🇻🇳 Phụ đề hiện lên tab bên cạnh: \"{data.get('translated_text')}\"")
        prev_context = data.get('original_text')
    else:
        print("   ⚪ (Khoảng lặng / Nhạc nền, không có lời thoại)")
    print("-" * 65)
