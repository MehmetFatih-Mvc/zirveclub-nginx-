const https = require('https');

const options = {
    hostname: 'dijital-menu.shop',
    port: 443,
    path: '/api/register',
    method: 'POST',
    headers: {
        'Content-Type': 'application/json'
    }
};

console.log('🔍 API test ediliyor...');

const req = https.request(options, (res) => {
    console.log(`Status: ${res.statusCode}`);
    console.log(`Headers:`, res.headers);
    
    let data = '';
    res.on('data', (chunk) => {
        data += chunk;
    });
    
    res.on('end', () => {
        console.log('Response:', data.substring(0, 200) + '...');
    });
});

req.on('error', (error) => {
    console.error('❌ Hata:', error.message);
});

req.write(JSON.stringify({
    username: 'testuser',
    password: 'testpass123'
}));

req.end(); 