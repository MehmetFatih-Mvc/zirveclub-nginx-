const http = require('http');

const options = {
    hostname: 'localhost',
    port: 3000,
    path: '/',
    method: 'GET'
};

console.log('🔍 Sunucu test ediliyor...');

const req = http.request(options, (res) => {
    console.log(`✅ Sunucu çalışıyor! Status: ${res.statusCode}`);
    console.log(`📡 Sunucu adresi: http://localhost:3000`);
    
    if (res.statusCode === 200) {
        console.log('\n🎉 Sunucu erişilebilir!');
        console.log('💡 Şimdi tarayıcıda http://localhost:3000 adresini açın');
    }
});

req.on('error', (error) => {
    console.error('❌ Sunucu çalışmıyor:', error.message);
    console.log('\n💡 Sunucuyu başlatmak için:');
    console.log('   npm start');
    console.log('   veya');
    console.log('   node server.js');
});

req.end(); 