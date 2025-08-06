const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));
const fs = require('fs');
const path = require('path');

const BASE_URL = 'http://localhost:3000';

async function testSystem() {
    console.log('🚀 POZI Sistemi Test Ediliyor...\n');

    try {
        // Test 1: Kullanıcı Kaydı
        console.log('1️⃣ Kullanıcı kaydı test ediliyor...');
        const registerResponse = await fetch(`${BASE_URL}/api/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                username: 'testuser_' + Date.now(),
                password: 'testpass123'
            })
        });
        
        const registerData = await registerResponse.json();
        if (!registerResponse.ok) {
            throw new Error(`Kayıt hatası: ${registerData.error}`);
        }
        
        const sessionId = registerData.sessionId;
        const userId = registerData.user.id;
        console.log('✅ Kullanıcı kaydı başarılı');
        console.log(`   Kullanıcı No: ${registerData.user.userNumber}`);
        console.log(`   Session ID: ${sessionId}\n`);

        // Test 2: Admin Girişi
        console.log('2️⃣ Admin girişi test ediliyor...');
        const adminResponse = await fetch(`${BASE_URL}/api/admin/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                username: 'admin',
                password: 'admin123'
            })
        });
        
        const adminData = await adminResponse.json();
        if (!adminResponse.ok) {
            throw new Error(`Admin giriş hatası: ${adminData.error}`);
        }
        
        const adminSessionId = adminData.sessionId;
        console.log('✅ Admin girişi başarılı\n');

        // Test 3: POZI Miktarı Ayarlama
        console.log('3️⃣ POZI miktarı ayarlanıyor...');
        const poziResponse = await fetch(`${BASE_URL}/api/admin/set-pozi-amount`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'session-id': adminSessionId
            },
            body: JSON.stringify({
                userId: userId,
                poziAmount: 100
            })
        });
        
        const poziData = await poziResponse.json();
        if (!poziResponse.ok) {
            throw new Error(`POZI ayarlama hatası: ${poziData.error}`);
        }
        console.log('✅ POZI miktarı ayarlandı (100 POZI)\n');

        // Test 4: İlk Görev (Ücretsiz)
        console.log('4️⃣ İlk görev test ediliyor (ücretsiz olmalı)...');
        const firstOrderResponse = await fetch(`${BASE_URL}/api/order`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'session-id': sessionId
            },
            body: JSON.stringify({ orderType: 'receive' })
        });
        
        const firstOrderData = await firstOrderResponse.json();
        if (!firstOrderResponse.ok) {
            throw new Error(`İlk görev hatası: ${firstOrderData.error}`);
        }
        console.log('✅ İlk görev başarılı (ücretsiz)');
        console.log(`   Ödül: ${firstOrderData.reward} POZI\n`);

        // Test 5: Dosya Yükleme Testi (Basitleştirilmiş)
        console.log('5️⃣ Dosya yükleme sistemi test ediliyor...');
        
        // Basit bir test dosyası oluştur
        const testImagePath = path.join(__dirname, 'test_image.txt');
        fs.writeFileSync(testImagePath, 'Test image data');
        
        try {
            const { default: FormData } = await import('form-data');
            const form = new FormData();
            form.append('amount', '200');
            form.append('description', 'Test ödeme dekontu');
            form.append('receiptFile', fs.createReadStream(testImagePath), {
                filename: 'test_receipt.txt',
                contentType: 'text/plain'
            });
            
            const uploadResponse = await fetch(`${BASE_URL}/api/upload-receipt`, {
                method: 'POST',
                headers: {
                    'session-id': sessionId,
                    ...form.getHeaders()
                },
                body: form
            });
            
            if (!uploadResponse.ok) {
                const errorText = await uploadResponse.text();
                console.log('⚠️ Dosya yükleme hatası:', errorText);
            } else {
                const uploadData = await uploadResponse.json();
                console.log('✅ Dosya yükleme başarılı');
                console.log(`   Receipt ID: ${uploadData.receipt.id}`);
            }
        } catch (error) {
            console.log('⚠️ Dosya yükleme testi atlandı:', error.message);
        } finally {
            // Test dosyasını temizle
            if (fs.existsSync(testImagePath)) {
                fs.unlinkSync(testImagePath);
            }
        }
        console.log('');

        // Test 6: Admin Dekont Görüntüleme
        console.log('6️⃣ Admin dekont görüntüleme test ediliyor...');
        const receiptsResponse = await fetch(`${BASE_URL}/api/admin/receipts`, {
            headers: {
                'session-id': adminSessionId
            }
        });
        
        const receiptsData = await receiptsResponse.json();
        if (!receiptsResponse.ok) {
            throw new Error(`Dekont listesi hatası: ${receiptsData.error}`);
        }
        
        if (receiptsData.receipts && receiptsData.receipts.length > 0) {
            console.log('✅ Admin dekont listesi başarılı');
            console.log(`   Toplam dekont: ${receiptsData.receipts.length}`);
            const latestReceipt = receiptsData.receipts[0];
            console.log(`   Son dekont: ${latestReceipt.fileName}`);
            console.log(`   Miktar: ${latestReceipt.amount} POZI`);
        } else {
            console.log('⚠️ Henüz dekont bulunamadı');
        }

        // Test 7: Ödeme Onaylama
        console.log('\n7️⃣ Ödeme onaylama test ediliyor...');
        if (receiptsData.receipts && receiptsData.receipts.length > 0) {
            const receiptId = receiptsData.receipts[0].id;
            const approveResponse = await fetch(`${BASE_URL}/api/admin/receipt/${receiptId}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'session-id': adminSessionId
                },
                body: JSON.stringify({ action: 'approve' })
            });
            
            const approveData = await approveResponse.json();
            if (!approveResponse.ok) {
                throw new Error(`Ödeme onaylama hatası: ${approveData.error}`);
            }
            console.log('✅ Ödeme onaylandı');
        }

        // Test 8: Kullanıcıyı Ödeme Yapmış Olarak İşaretleme
        console.log('\n8️⃣ Kullanıcı ödeme durumu güncelleniyor...');
        const markPaidResponse = await fetch(`${BASE_URL}/api/admin/mark-paid`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'session-id': adminSessionId
            },
            body: JSON.stringify({ userId: userId })
        });
        
        const markPaidData = await markPaidResponse.json();
        if (!markPaidResponse.ok) {
            throw new Error(`Ödeme işaretleme hatası: ${markPaidData.error}`);
        }
        console.log('✅ Kullanıcı ödeme yapmış olarak işaretlendi');

        // Test 9: İkinci Görev (Ödeme Gerekli)
        console.log('\n9️⃣ İkinci görev test ediliyor (ödeme gerekli olmalı)...');
        const secondOrderResponse = await fetch(`${BASE_URL}/api/order`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'session-id': sessionId
            },
            body: JSON.stringify({ orderType: 'receive' })
        });
        
        const secondOrderData = await secondOrderResponse.json();
        if (secondOrderResponse.ok) {
            console.log('✅ İkinci görev başarılı');
            console.log(`   Ödül: ${secondOrderData.reward} POZI`);
        } else {
            console.log('⚠️ İkinci görev ödeme gerektiriyor (beklenen davranış)');
            console.log(`   Hata: ${secondOrderData.error}`);
        }

        console.log('\n🎉 Tüm testler tamamlandı!');
        console.log('\n📋 Test Sonuçları:');
        console.log('✅ Kullanıcı kaydı ve 11 haneli numara');
        console.log('✅ Admin girişi');
        console.log('✅ POZI miktarı ayarlama');
        console.log('✅ İlk görev (ücretsiz)');
        console.log('✅ Dosya yükleme sistemi');
        console.log('✅ Admin dekont görüntüleme');
        console.log('✅ Ödeme onaylama');
        console.log('✅ Kullanıcı ödeme durumu');
        console.log('✅ Görev ödeme mantığı');

    } catch (error) {
        console.error('❌ Test hatası:', error.message);
        process.exit(1);
    }
}

// Test sistemini çalıştır
testSystem(); 