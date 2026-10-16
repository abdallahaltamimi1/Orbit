@echo off
cd /d "%~dp0"
set "ORBIT_NODE_RUNTIME=node"
where node >nul 2>nul
if errorlevel 1 set "ORBIT_NODE_RUNTIME=%USERPROFILE%\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe"
if not exist "node_modules\vite\bin\vite.js" (
  echo Project dependencies are missing. Open this project in Codex.
  pause
  exit /b 1
)
echo The Learning Orbit
echo Student dashboard: http://127.0.0.1:5175/student-dashboard/student-dashboard.html
echo Sign in as a student or choose a student from Presentation content.
echo Keep this window open during the presentation.
"%ORBIT_NODE_RUNTIME%" node_modules\vite\bin\vite.js --configLoader runner --host 127.0.0.1 --port 5175 --strictPort
pause
