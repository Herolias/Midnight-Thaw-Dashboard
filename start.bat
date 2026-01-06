@echo off
echo ========================================
echo   Midnight Thaw Tracker - Starting...
echo ========================================
echo.

:: Check if Node.js is installed
where node >nul 2>nul
if %ERRORLEVEL% neq 0 (
    echo [INFO] Node.js is not installed. Attempting to install...
    echo.
    
    :: Try winget first (Windows 10/11)
    where winget >nul 2>nul
    if %ERRORLEVEL% equ 0 (
        echo Installing Node.js via winget...
        winget install OpenJS.NodeJS.LTS --accept-package-agreements --accept-source-agreements
        if %ERRORLEVEL% equ 0 (
            echo.
            echo [SUCCESS] Node.js installed! Please close this window and run start.bat again.
            pause
            exit /b 0
        )
    )
    
    :: Fallback: Download installer
    echo Downloading Node.js installer...
    powershell -Command "& {Invoke-WebRequest -Uri 'https://nodejs.org/dist/v20.11.0/node-v20.11.0-x64.msi' -OutFile '%TEMP%\node-installer.msi'}"
    if exist "%TEMP%\node-installer.msi" (
        echo Running Node.js installer...
        msiexec /i "%TEMP%\node-installer.msi" /passive /norestart
        del "%TEMP%\node-installer.msi"
        echo.
        echo [SUCCESS] Node.js installed! Please close this window and run start.bat again.
        pause
        exit /b 0
    ) else (
        echo [ERROR] Failed to download Node.js.
        echo Please install Node.js 18+ manually from https://nodejs.org/
        pause
        exit /b 1
    )
)

:: Install dependencies if node_modules doesn't exist
if not exist "node_modules\" (
    echo Installing dependencies...
    call npm install
    echo.
)

:: Start the server
echo Starting server...
echo Open http://localhost:3000 in your browser
echo.
call npm start
