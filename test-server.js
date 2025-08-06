const axios = require('axios');

const BASE_URL = 'http://localhost:3000'; // Sunucu adresinizi buraya yazın

async function testServer() {
    console.log('🔍 Sunucu test ediliyor...');
    
    try {
        // 1. Ana sayfa testi
        console.log('\n1. Ana sayfa testi...');
        const homeResponse = await axios.get(`${BASE_URL}/`);
        console.log('✅ Ana sayfa erişilebilir');
        
        // 2. Kayıt testi
        console.log('\n2. Kayıt testi...');
        const registerData = {
            username: 'testuser' + Date.now(),
            password: 'testpass123'
        };
        
        const registerResponse = await axios.post(`${BASE_URL}/api/register`, registerData);
        console.log('✅ Kayıt başarılı:', registerResponse.data);
        
        // 3. Giriş testi
        console.log('\n3. Giriş testi...');
        const loginData = {
            username: registerData.username,
            password: registerData.password
        };
        
        const loginResponse = await axios.post(`${BASE_URL}/api/login`, loginData);
        console.log('✅ Giriş başarılı:', loginResponse.data);
        
        // 4. Kullanıcı verisi testi
        console.log('\n4. Kullanıcı verisi testi...');
        const sessionId = loginResponse.data.sessionId;
        const userResponse = await axios.get(`${BASE_URL}/api/user`, {
            headers: {
                'session-id': sessionId
            }
        });
        console.log('✅ Kullanıcı verisi alındı:', userResponse.data);
        
        console.log('\n🎉 Tüm testler başarılı!');
        
    } catch (error) {
        console.error('❌ Hata:', error.response?.data || error.message);
        
        if (error.code === 'ECONNREFUSED') {
            console.log('\n💡 Sunucu çalışmıyor. Sunucuyu başlatın:');
            console.log('   npm start');
        }
    }
}

testServer(); 