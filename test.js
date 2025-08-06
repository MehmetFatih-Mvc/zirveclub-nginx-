const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));

async function testSystem() {
    try {
        console.log('Sistem test ediliyor...');
        
        // Test kullanıcı kaydı
        const registerResponse = await fetch('http://localhost:3000/api/register', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                username: 'testuser',
                password: '123456'
            })
        });
        
        const registerData = await registerResponse.json();
        console.log('Kayıt sonucu:', registerData);
        
        if (registerResponse.ok) {
            const sessionId = registerData.sessionId;
            
            // Admin girişi
            const adminResponse = await fetch('http://localhost:3000/api/admin/login', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    username: 'admin',
                    password: 'admin123'
                })
            });
            
            const adminData = await adminResponse.json();
            console.log('Admin giriş sonucu:', adminData);
            
            if (adminResponse.ok) {
                const adminSessionId = adminData.sessionId;
                
                // POZI miktarı ayarla
                const poziResponse = await fetch('http://localhost:3000/api/admin/set-pozi-amount', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'session-id': adminSessionId
                    },
                    body: JSON.stringify({
                        userId: registerData.user.id,
                        poziAmount: 100
                    })
                });
                
                const poziData = await poziResponse.json();
                console.log('POZI miktarı ayarlama sonucu:', poziData);
                
                // Kullanıcı girişi
                const loginResponse = await fetch('http://localhost:3000/api/login', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        username: 'testuser',
                        password: '123456'
                    })
                });
                
                const loginData = await loginResponse.json();
                console.log('Giriş sonucu:', loginData);
                
                if (loginResponse.ok) {
                    const userSessionId = loginData.sessionId;
                    
                    // Sipariş işlemi test et
                    const orderResponse = await fetch('http://localhost:3000/api/order', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            'session-id': userSessionId
                        },
                        body: JSON.stringify({
                            orderType: 'receive'
                        })
                    });
                    
                    const orderData = await orderResponse.json();
                    console.log('Sipariş işlemi sonucu:', orderData);
                }
            }
        }
        
    } catch (error) {
        console.error('Test hatası:', error);
    }
}

testSystem(); 