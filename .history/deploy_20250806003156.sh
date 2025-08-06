#!/bin/bash

echo "ZirveClub Deployment Script"
echo "=========================="

# Node.js versiyonunu kontrol et
echo "Node.js versiyonu kontrol ediliyor..."
node --version
npm --version

# Bağımlılıkları yükle
echo "Bağımlılıklar yükleniyor..."
npm install --production

# Uploads klasörünü oluştur
echo "Uploads klasörü oluşturuluyor..."
mkdir -p uploads

# Dosya izinlerini ayarla
echo "Dosya izinleri ayarlanıyor..."
chmod 755 server.js
chmod 755 start.js
chmod 644 *.txt

# PM2 ile başlat (eğer kuruluysa)
if command -v pm2 &> /dev/null; then
    echo "PM2 ile başlatılıyor..."
    pm2 start ecosystem.config.js --env production
    pm2 save
    pm2 startup
else
    echo "PM2 kurulu değil, normal başlatılıyor..."
    npm start
fi

echo "Deployment tamamlandı!"
echo "Site: http://localhost:3000"
echo "Admin: http://localhost:3000/admin" 