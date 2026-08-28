# ============================================================
# KOI Recall Admin (管理后台) — 开发启动脚本
# 单独 clone 本仓库后即可运行，无需 monorepo 根目录。
#
# 用法:
#   .\start-dev.ps1                                     # 默认连线上后端
#   .\start-dev.ps1 -ApiUrl http://localhost:3002       # 连本地后端
# ============================================================

param(
  [string]$ApiUrl = "https://koi-recall-backend.vercel.app"
)

Write-Host "============================================================" -ForegroundColor Cyan
Write-Host "  KOI Recall Admin — 管理后台开发环境" -ForegroundColor Cyan
Write-Host "============================================================" -ForegroundColor Cyan
Write-Host ""

# ── 1. 检查 Node.js ──
Write-Host "[1/3] 检查环境..." -ForegroundColor Yellow
try {
  $nodeVersion = node --version 2>$null
  Write-Host "  ✓ Node.js $nodeVersion" -ForegroundColor Green
} catch {
  Write-Host "  ✗ 未找到 Node.js，请先安装 Node.js >= 18。" -ForegroundColor Red
  exit 1
}

# ── 2. 安装依赖（首次运行）──
Write-Host ""
Write-Host "[2/3] 检查依赖..." -ForegroundColor Yellow
if (-not (Test-Path "node_modules")) {
  Write-Host "  → 首次运行，安装依赖..." -ForegroundColor Gray
  npm install --silent 2>&1 | Out-Null
}
Write-Host "  ✓ 依赖已就绪" -ForegroundColor Green

# ── 3. 启动 ──
Write-Host ""
Write-Host "[3/3] 启动开发服务器..." -ForegroundColor Yellow
$env:NEXT_PUBLIC_API_URL = $ApiUrl
Write-Host "  后端 API: $ApiUrl" -ForegroundColor Blue

Write-Host ""
Write-Host "============================================================" -ForegroundColor Cyan
Write-Host "  Admin Panel:   http://localhost:3001" -ForegroundColor Green
Write-Host "============================================================" -ForegroundColor Cyan
Write-Host ""
# Keep these credentials synchronized with the backend Neon staff_users seed accounts.
Write-Host "后台登录账号（存于后端 Neon 数据库 staff_users 表）:" -ForegroundColor Gray
Write-Host "  admin@koi-platform.com    / happyglobal123!     (administrator)" -ForegroundColor Gray
Write-Host "  reviewer@koi-platform.com / KoiReviewer2026!  (reviewer)" -ForegroundColor Gray
Write-Host "  viewer@koi-platform.com   / KoiViewer2026!    (viewer)" -ForegroundColor Gray
Write-Host ""
Write-Host "切换后端: .\start-dev.ps1 -ApiUrl http://localhost:3002" -ForegroundColor Gray
Write-Host ""

npm run dev
