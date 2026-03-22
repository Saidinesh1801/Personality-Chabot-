param(
  [string]$Model = "llama2"
)

Write-Host "Starting Ollama helper for model: $Model"

$ollama = Get-Command ollama -ErrorAction SilentlyContinue
if (-not $ollama) {
  Write-Host "Ollama CLI not found. Install from https://ollama.ai/docs and try again." -ForegroundColor Yellow
  exit 1
}

Write-Host "Pulling model $Model (if not present)..."
& ollama pull $Model

Write-Host "Launching model $Model in background window..."
Start-Process -FilePath "ollama" -ArgumentList "run", $Model -NoNewWindow
Write-Host "Ollama should be running. Default API: http://localhost:11434" -ForegroundColor Green
