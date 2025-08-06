const { spawn } = require('child_process');
const path = require('path');

// Production için process manager
const server = spawn('node', ['server.js'], {
    stdio: 'inherit',
    cwd: __dirname
});

server.on('error', (err) => {
    console.error('Server başlatılamadı:', err);
    process.exit(1);
});

server.on('exit', (code) => {
    console.log(`Server çıktı (kod: ${code})`);
    process.exit(code);
});

// Graceful shutdown
process.on('SIGTERM', () => {
    console.log('SIGTERM alındı, server kapatılıyor...');
    server.kill('SIGTERM');
});

process.on('SIGINT', () => {
    console.log('SIGINT alındı, server kapatılıyor...');
    server.kill('SIGINT');
}); 