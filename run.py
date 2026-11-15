#!/usr/bin/env python3
"""
Anti-Fesal Dev Server Entrypoint
Usage: python run.py
"""
import sys
import os
import subprocess

PROJECT_ROOT = os.path.dirname(os.path.abspath(__file__))
VENV_PYTHON_WIN = os.path.join(PROJECT_ROOT, ".venv", "Scripts", "python.exe")
VENV_PYTHON_UNIX = os.path.join(PROJECT_ROOT, ".venv", "bin", "python")

def main():
    # If not running in .venv and .venv exists, re-exec with .venv python
    if os.path.exists(VENV_PYTHON_WIN) and sys.executable.lower() != VENV_PYTHON_WIN.lower():
        print(f"[Anti-Fesal] Switching to virtual environment: {VENV_PYTHON_WIN}")
        sys.exit(subprocess.call([VENV_PYTHON_WIN, __file__] + sys.argv[1:]))
    elif os.path.exists(VENV_PYTHON_UNIX) and sys.executable.lower() != VENV_PYTHON_UNIX.lower():
        print(f"[Anti-Fesal] Switching to virtual environment: {VENV_PYTHON_UNIX}")
        sys.exit(subprocess.call([VENV_PYTHON_UNIX, __file__] + sys.argv[1:]))

    import uvicorn
    print("\n======================================================")
    print("⚡ Starting Anti-Fesal (آنتي فصال) Dev Server...")
    print(f"🐍 Python Executable: {sys.executable}")
    print("🌐 Web Application: http://127.0.0.1:8000")
    print("📚 API Documentation: http://127.0.0.1:8000/docs")
    print("======================================================\n")

    uvicorn.run("backend.main:app", host="127.0.0.1", port=8000, reload=True, reload_dirs=["backend"])

if __name__ == "__main__":
    main()
