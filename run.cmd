@echo off
echo Starting AtomChain...

echo Starting Backend...
start cmd /k "cd backend && uvicorn main:app --reload"

echo Starting Frontend...
start cmd /k "cd frontend && npm run electron:dev"

echo AtomChain development environment started!
