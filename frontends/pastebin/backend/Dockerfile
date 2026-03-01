FROM python:3.11-slim

# Install Docker CLI so the backend can spawn sandboxed containers.
# Mount the host Docker socket at runtime:
#   -v /var/run/docker.sock:/var/run/docker.sock
RUN apt-get update && apt-get install -y --no-install-recommends \
      docker.io \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY frontends/pastebin/backend/requirements.txt .
RUN for i in 1 2 3 4 5; do \
      pip install --no-cache-dir -r requirements.txt && break \
      || (echo "pip failed (attempt $i/5), retrying in $((i*10))s..." && sleep $((i*10))); \
    done

COPY frontends/pastebin/backend/app.py .

RUN mkdir -p /app/data

EXPOSE 5000

CMD ["python", "app.py"]















