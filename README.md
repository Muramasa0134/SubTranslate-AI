# SubTranslate AI - Nền tảng Dịch Phụ đề Video Thông minh

Ứng dụng Web toàn diện ứng dụng Trí tuệ Nhân tạo (AI) để tự động nhận dạng giọng nói từ video, dịch phụ đề song ngữ và biên tập phụ đề thời gian thực. Dự án được thiết kế chuyên nghiệp phục vụ mục đích học tập, xây dựng Portfolio và ứng tuyển vị trí **AI Engineer / AI Intern**.

---

## 1. Tính năng nổi bật

### A. Dịch file phụ đề (.SRT)
* **Phân tích thông minh:** Đọc và chia nhỏ các khối phụ đề (Index, Timestamp, Text).
* **Bảo toàn thời gian 100%:** Giữ nguyên số thứ tự và mốc thời gian bắt đầu/kết thúc (`HH:MM:SS,mmm`).
* **Dịch thuật theo lô (Batch Processing):** Gửi các nhóm phụ đề theo lô có cấu trúc JSON tới Google Gemini API để tối ưu hóa tốc độ và ngữ cảnh tự nhiên.
* **Biên tập song ngữ:** Hiển thị trực quan bản gốc và bản dịch song song, cho phép chỉnh sửa trực tiếp.
* **Xuất file:** Tải về file `.srt` hoàn chỉnh đã được dịch hoặc file gốc.

### B. Dịch trực tiếp từ Video & Cấu hình xuất MP4
* **Đa định dạng:** Hỗ trợ upload video `.mp4`, `.mkv`, `.mov`, `.webm`, `.avi`. Tự động chuẩn hóa sang MP4 chuẩn web (H.264/AAC + faststart) để phát mượt mà trên trình duyệt.
* **Trích xuất âm thanh (FFmpeg):** Chuyển đổi âm thanh video sang định dạng chuẩn `16kHz Mono 16-bit PCM WAV`.
* **Nhận diện giọng nói (Speech-to-Text):** Ứng dụng mô hình `faster-whisper` (CTranslate2) nhận diện tiếng nói kèm mốc thời gian (timestamp) chính xác từng mili-giây.
* **Dịch AI (Google Gemini):** Dịch nội dung văn bản trích xuất mà **không** cần upload cả video lên Gemini.
* **Xem trước Video kèm Phụ đề:** Tích hợp trình phát video đồng bộ hiển thị phụ đề overlay theo thời gian thực (hỗ trợ chuyển đổi giữa phụ đề Dịch / Gốc / Cả hai).
* **Cấu hình & Xuất Video MP4 (Hardsub):**
  * Tùy chỉnh cỡ chữ phụ đề (Font Size: 16px - 36px).
  * Lựa chọn màu sắc chữ (Trắng, Vàng, Cyan, Xanh neon, Hồng hoặc mã màu Hex).
  * Lựa chọn viền chữ đen nổi (Black Outline) hoặc hộp nền mờ (Opaque Dark Box).
  * Tùy chỉnh vị trí phụ đề: Dưới cùng (Bottom), Ở giữa (Middle), Trên cùng (Top).
  * Khung xem trước trực tiếp (Live Subtitle Preview Simulator).
  * Xuất và tải về video MP4 hoàn chỉnh đã gắn phụ đề qua FFmpeg.

### C. Quản lý Lịch sử (SQLite)
* Lưu trữ tự động lịch sử các lần dịch vào cơ sở dữ liệu SQLite (`subtranslate.db`).
* Lưu thông tin tên file, ngôn ngữ nguồn, ngôn ngữ đích, số dòng phụ đề, đường dẫn video và thời gian tạo.
* Cho phép mở lại bất kỳ lúc nào để xem video, tiếp tục biên tập hoặc xóa bản ghi.

---

## 2. Kiến trúc & Quy trình xử lý AI

```
1. QUY TRÌNH DỊCH SRT:
[Upload .SRT] ──> [Parse Subtitles] ──> [Gemini API Batch Translation] ──> [Dual Subtitle Editor] ──> [Download .SRT]

2. QUY TRÌNH DỊCH & TẠO PHỤ ĐỀ TRỰC TIẾP TRONG VIDEO (HARDSUB MP4):
[Upload Video] ──> [FFmpeg Audio Extract] ──> [faster-whisper STT] ──> [Gemini Translation] ──> [FFmpeg Hardsub Burn-in] ──> [Xem & Tải Video MP4 Đã Gắn Sub]
```

---

## 3. Công nghệ sử dụng

| Tầng | Công nghệ | Chi tiết |
| :--- | :--- | :--- |
| **Frontend** | React 18, Vite | Khung giao diện Single Page Application hiện đại |
| | Tailwind CSS | Thiết kế giao diện Dark Mode cao cấp (Navy/Dark, Purple/Blue, White, Cyan) |
| | React Router DOM | Điều hướng trang (Home, Dashboard, Translate, History) |
| | Axios | Giao tiếp RESTful API với Backend |
| | Lucide React | Hệ thống biểu tượng giao diện hiện đại |
| **Backend** | Python 3.14 / 3.11+ | Nền tảng backend hiệu năng cao |
| | FastAPI & Uvicorn | Web framework bất đồng bộ (Asynchronous REST API) |
| | Pydantic v2 | Xác thực và định dạng dữ liệu Request/Response |
| | SQLAlchemy | ORM quản trị cơ sở dữ liệu SQLite |
| **AI & Media** | Google Gemini API (`google-genai`) | Dịch phụ đề văn cảnh tự nhiên (mặc định: `gemini-2.5-flash`) |
| | `faster-whisper` | Speech-to-Text engine tối ưu với CTranslate2 |
| | `imageio-ffmpeg` & FFmpeg | Trích xuất âm thanh từ video chất lượng cao |
| | `pysubs2` | Đọc, phân tích cú pháp và xuất định dạng SRT |

---

## 4. Cấu trúc thư mục dự án

```
SubTranslate-AI/
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── Navbar.jsx                # Header, điều hướng và trạng thái API Key
│   │   │   ├── Footer.jsx                # Footer thông tin dự án
│   │   │   ├── ApiKeyModal.jsx           # Hộp thoại nhập & lưu Gemini API Key
│   │   │   ├── SubtitleEditor.jsx        # Trình chỉnh sửa phụ đề song ngữ trực tiếp
│   │   │   └── VideoSubtitlePlayer.jsx   # Video Player đồng bộ phụ đề thời gian thực
│   │   ├── pages/
│   │   │   ├── Home.jsx                  # Trang chủ giới thiệu nền tảng & workflow
│   │   │   ├── Dashboard.jsx             # Tổng quan số liệu và trạng thái AI engines
│   │   │   ├── TranslatePage.jsx         # Không gian upload và dịch SRT/Video
│   │   │   ├── HistoryPage.jsx           # Danh sách quản lý lịch sử dịch
│   │   │   └── HistoryDetailPage.jsx     # Xem lại video và phụ đề chi tiết
│   │   ├── services/
│   │   │   └── api.js                    # Kết nối API Backend bằng Axios
│   │   ├── utils/
│   │   │   └── languages.js              # Danh mục ngôn ngữ hỗ trợ
│   │   ├── App.jsx                       # Cấu hình Router chính
│   │   ├── main.jsx                      # Entrypoint React
│   │   └── index.css                     # Tailwind CSS & Dark mode styles
│   ├── package.json
│   ├── vite.config.js
│   └── tailwind.config.js
│
├── backend/
│   ├── app/
│   │   ├── api/
│   │   │   └── endpoints.py              # Các API endpoints xử lý SRT, Video, Lịch sử
│   │   ├── database/
│   │   │   └── connection.py             # Kết nối SQLite & SQLAlchemy session
│   │   ├── models/
│   │   │   ├── history.py                # Database model lưu lịch sử dịch
│   │   │   └── schemas.py                # Pydantic schemas cho API
│   │   ├── services/
│   │   │   ├── gemini_service.py         # Dịch phụ đề qua Google Gemini API
│   │   │   ├── whisper_service.py        # Speech-to-Text với faster-whisper
│   │   │   ├── audio_service.py          # Trích xuất âm thanh với FFmpeg
│   │   │   ├── srt_service.py            # Phân tích cú pháp & xuất file SRT
│   │   │   └── history_service.py        # Thao tác CRUD lịch sử
│   │   ├── utils/
│   │   │   └── config.py                 # Nạp cấu hình từ .env
│   │   └── main.py                       # Khởi tạo FastAPI app và CORS
│   ├── storage/                          # Thư mục lưu trữ nội bộ (uploads, audio, db)
│   ├── run.py                            # Script khởi động Backend server
│   ├── requirements.txt                  # Danh mục thư viện Python
│   ├── .env.example                      # File mẫu biến môi trường
│   └── .env                              # File cấu hình biến môi trường
│
├── sample_subtitles.srt                  # File SRT mẫu phục vụ thử nghiệm
├── .gitignore
└── README.md
```

---

## 5. Hướng dẫn Cài đặt & Chạy ứng dụng

### Bước 1: Cấu hình Backend

1. Di chuyển vào thư mục backend:
   ```bash
   cd backend
   ```
2. Kích hoạt môi trường ảo (virtual environment):
   - **Windows:**
     ```powershell
     .\.venv\Scripts\Activate.ps1
     ```
   - **Linux / macOS:**
     ```bash
     source .venv/bin/activate
     ```
3. Cài đặt các thư viện cần thiết:
   ```bash
   pip install -r requirements.txt
   ```
4. Cấu hình file `.env`:
   - Mở file `.env` và điền Gemini API Key (nhận miễn phí tại [Google AI Studio](https://aistudio.google.com/app/apikey)):
     ```env
     GEMINI_API_KEY=AIzaSy...
     GEMINI_MODEL=gemini-2.5-flash
     WHISPER_MODEL=base
     ```
   *(Lưu ý: Bạn cũng có thể nhập API Key trực tiếp trên giao diện web bất cứ lúc nào).*
5. Khởi động Backend Server:
   ```bash
   python -m uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload
   ```
   *Backend hoạt động tại:* `http://127.0.0.1:8000` *(Tài liệu API Swagger tại:* `http://127.0.0.1:8000/docs`*).*

---

### Bước 2: Cấu hình Frontend

1. Mở cửa sổ terminal mới và di chuyển vào thư mục frontend:
   ```bash
   cd frontend
   ```
2. Cài đặt các gói phụ thuộc (nếu chưa cài):
   ```bash
   npm install
   ```
3. Khởi động Vite Development Server:
   ```bash
   npm run dev
   ```
4. Mở trình duyệt và truy cập:
   ```
   http://localhost:5173
   ```

---

## 6. Hướng dẫn sử dụng thử nghiệm

1. **Dịch file SRT:**
   - Vào tab **Translate** &rarr; chọn **Dịch file SRT**.
   - Kéo thả file `sample_subtitles.srt` (có sẵn ở thư mục gốc dự án).
   - Chọn ngôn ngữ nguồn: `English` và ngôn ngữ đích: `Vietnamese`.
   - Nhấn **Bắt đầu dịch (SRT)**.
   - Quan sát bảng dịch song ngữ hiện ra, thử nhấp chuột vào ô dịch để chỉnh sửa văn bản, sau đó nhấn **Download Translated SRT** để tải file về.

2. **Dịch từ Video:**
   - Chọn tab **Dịch từ Video**.
   - Chọn một video ngắn (`.mp4`, `.webm`,...).
   - Hệ thống tự động trích xuất âm thanh bằng FFmpeg, chuyển đổi giọng nói thành phụ đề bằng faster-whisper và dịch bằng Gemini.
   - Video player sẽ xuất hiện kèm phụ đề đồng bộ chạy theo video và trình biên tập song ngữ bên cạnh.

3. **Kiểm tra Dashboard & Lịch sử:**
   - Vào **Dashboard** để theo dõi số lượng bản dịch đã thực hiện và trạng thái kết nối các AI engine.
   - Vào **History** để xem lại các bản dịch cũ, chỉnh sửa phụ đề hoặc tải lại file SRT bất cứ lúc nào.

---

## 7. Kế hoạch triển khai 5 ngày (Portfolio Roadmap)

- [x] **Day 1: Setup & Kiến trúc cơ sở** (Môi trường Python 3.14, FastAPI, React + Vite, Tailwind Dark Mode).
- [x] **Day 2: Xử lý phụ đề SRT** (Trích xuất timestamp, pysubs2, chia nhóm batching, trình biên tập song ngữ và export).
- [x] **Day 3: Tích hợp Google Gemini API** (Prompt kỹ thuật ngữ cảnh, JSON output có kiểm định số thứ tự, xử lý ngoại lệ).
- [x] **Day 4: Xử lý Video** (FFmpeg trích xuất 16kHz WAV, faster-whisper Speech-to-Text, Video Player đồng bộ caption overlay).
- [x] **Day 5: Quản lý Lịch sử & Hoàn thiện** (SQLite database, trang Dashboard, trang History, kiểm thử toàn diện, tài liệu Portfolio).
