/**
 * Anti-Fesal Dev Server Runner
 * Automatically finds project virtual environment and starts Uvicorn with auto-reload.
 */

const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

const isWin = process.platform === 'win32';
const venvPythonWin = path.join(__dirname, '.venv', 'Scripts', 'python.exe');
const venvPythonUnix = path.join(__dirname, '.venv', 'bin', 'python');

let pythonBin = 'python';

if (fs.existsSync(venvPythonWin)) {
  pythonBin = venvPythonWin;
} else if (fs.existsSync(venvPythonUnix)) {
  pythonBin = venvPythonUnix;
}

const isTest = process.argv.includes('--test');

let commandArgs = [];

if (isTest) {
  console.log('\n🧪 Running Anti-Fesal Test Suite via pytest...\n');
  commandArgs = ['-m', 'pytest', 'tests/', '-v'];
} else {
  console.log('\n======================================================');
  console.log('⚡ Starting Anti-Fesal (آنتي فصال) Dev Server...');
  console.log(`🐍 Python Runtime: ${pythonBin}`);
  console.log('🌐 Web Application: http://127.0.0.1:8000');
  console.log('📚 API Documentation: http://127.0.0.1:8000/docs');
  console.log('======================================================\n');
  commandArgs = ['-m', 'uvicorn', 'backend.main:app', '--host', '127.0.0.1', '--port', '8000', '--reload', '--reload-dir', 'backend'];
}

const child = spawn(pythonBin, commandArgs, {
  stdio: 'inherit',
  shell: false
});

child.on('error', (err) => {
  console.error('❌ Failed to start process:', err);
});

child.on('exit', (code) => {
  if (code !== 0) {
    console.error(`\n⚠️ Process exited with code ${code}`);
  }
});
