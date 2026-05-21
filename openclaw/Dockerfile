FROM node:24-slim

RUN apt-get update && apt-get install -y \
    git \
    python3 \
    make \
    g++ \
    ca-certificates \
    && rm -rf /var/lib/apt/lists/*

RUN npm install -g openclaw@latest

WORKDIR /root

COPY workspace/ /root/.openclaw/workspace/

CMD ["openclaw", "gateway"]