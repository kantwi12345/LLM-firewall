FROM python:3.12-slim

WORKDIR /app

# ffmpeg for whisper's audio decoding is handled by imageio-ffmpeg at
# runtime (see voice_input.py), so no system-level ffmpeg install
# needed here - keeps the image smaller.

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .
RUN mkdir -p /app/data

EXPOSE 8000

# AI_SOC_API_KEY must be provided at runtime (docker run -e AI_SOC_API_KEY=...
# or via docker-compose.yml's environment section) - the app refuses to
# start without it (see auth.py), so there's no risk of accidentally
# deploying with no authentication.
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
