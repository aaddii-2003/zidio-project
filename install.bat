@echo off
echo 🚀 Excel Analytics Platform - Installation Script
echo =================================================

REM Check if Node.js is installed
node --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ Node.js is not installed. Please install Node.js v16 or higher.
    pause
    exit /b 1
)

echo ✅ Node.js version: 
node --version

echo 📦 Installing root dependencies...
npm install

echo 📦 Installing backend dependencies...
cd backend
npm install

REM Create uploads directory
if not exist uploads mkdir uploads

echo 📦 Installing frontend dependencies...
cd ..\frontend
npm install

REM Go back to root
cd ..

REM Create .env file if it doesn't exist
if not exist backend\.env (
    echo 📝 Creating backend\.env file...
    copy backend\.env.example backend\.env
    echo ⚠️  Please update backend\.env with your MongoDB URI and JWT secret
)

echo.
echo ✅ Installation completed successfully!
echo.
echo 🔧 Next steps:
echo 1. Update backend\.env with your MongoDB URI and JWT secret
echo 2. Start MongoDB (if using local installation)
echo 3. Run 'npm run dev' to start the application
echo.
echo 🌐 Application will be available at:
echo    Frontend: http://localhost:3000
echo    Backend:  http://localhost:5000
echo.
echo 📚 For more information, see README.md
pause









