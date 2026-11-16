FROM python:3.11-slim

# Install system dependencies (FFmpeg is required for audio extraction & subtitle burning)
RUN apt-get update && apt-get install -y --no-install-recommends \
    ffmpeg \
    curl \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy dependency requirements
COPY requirements.txt .

# Install Python packages
RUN pip install --no-cache-dir -r requirements.txt

# Copy source code
COPY . .

# Ensure storage directories exist
RUN mkdir -p storage/uploads storage/audio storage/subtitles

# Default environment variables
ENV PYTHONUNBUFFERED=1 \
    BACKEND_HOST=0.0.0.0 \
    BACKEND_PORT=8000 \
    WHISPER_MODEL=tiny \
    WHISPER_DEVICE=cpu \
    WHISPER_COMPUTE_TYPE=int8

EXPOSE 8000

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
