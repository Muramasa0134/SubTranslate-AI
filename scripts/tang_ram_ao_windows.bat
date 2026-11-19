@echo off
:: Script tu dong mo rong Bo nho ao (Virtual Memory / Pagefile) len 8GB - 16GB
:: Yeu cau chay bang quyen Administrator (Run as Administrator)

net session >nul 2>&1
if %errorLevel% neq 0 (
    echo [!] Vui long nhap chuot phai vao file nay va chon "Run as Administrator"!
    pause
    exit /b 1
)

echo [*] Dang thiet lap bo nho ao (PageFile) cho he thong Windows...
powershell -NoProfile -ExecutionPolicy Bypass -Command ^
    "$pf = Get-CimInstance Win32_PageFileSetting -ErrorAction SilentlyContinue; " ^
    "if ($pf) { " ^
    "    Set-CimInstance -InputObject $pf[0] -Property @{InitialSize = 8192; MaximumSize = 16384}; " ^
    "    Write-Host '[V] Da mo rong PageFile len 8GB - 16GB thanh cong!' -ForegroundColor Green; " ^
    "} else { " ^
    "    Set-CimInstance -Query 'Select * from Win32_ComputerSystem' -Property @{AutomaticManagedPagefile = $True}; " ^
    "    Write-Host '[V] Da bat che do tu dong quan ly PageFile theo dung luong o dia!' -ForegroundColor Green; " ^
    "}"

echo.
echo Hoan tat! Ban co the tat cua so nay.
pause
