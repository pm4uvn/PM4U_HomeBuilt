@echo off
setlocal
cd /d "%~dp0"

echo === PM4U HomeBuild — chay local ===

echo Dang dong tien trinh cu tren cong 3000 (neu co)...
for /f "tokens=5" %%p in ('netstat -ano ^| findstr ":3000" ^| findstr "LISTENING"') do (
    taskkill /F /PID %%p >nul 2>&1
)

if exist ".next" (
    echo Dang xoa cache .next...
    rmdir /s /q ".next"
)

echo Dang khoi dong dev server (http://localhost:3000)...
start "" http://localhost:3000
call npx next dev

endlocal
