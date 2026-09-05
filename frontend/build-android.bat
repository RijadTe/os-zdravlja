@echo off
echo ========================================
echo  🔨 Gradim web aplikaciju...
echo ========================================
call npm run build

if %errorlevel% neq 0 (
    echo ❌ GRESKA: Build nije uspio!
    pause
    exit /b %errorlevel%
)

echo.
echo ========================================
echo  📦 Kopiram u Android...
echo ========================================
xcopy dist\* ..\android\app\src\main\assets\public\ /E /I /Y

if %errorlevel% neq 0 (
    echo ❌ GRESKA: Kopiranje nije uspjelo!
    pause
    exit /b %errorlevel%
)

echo.
echo ========================================
echo  ✅ ZAVRSENO!
echo  📱 Pokreni aplikaciju u Android Studiju
echo ========================================
echo.
pause