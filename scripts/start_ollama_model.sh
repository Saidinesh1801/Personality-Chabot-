#!/bin/sh
MODEL=${1:-llama2}

if ! command -v ollama >/dev/null 2>&1; then
  echo "Ollama CLI not found. Install from https://ollama.ai/docs and try again."
  exit 1
fi

echo "Pulling model $MODEL (if not present)..."
ollama pull $MODEL || true

echo "Starting model $MODEL in background..."
nohup ollama run "$MODEL" >/dev/null 2>&1 &
PID=$!
echo $PID > "/tmp/ollama_${MODEL}.pid"
echo "Started (pid $PID). API usually at http://localhost:11434"
