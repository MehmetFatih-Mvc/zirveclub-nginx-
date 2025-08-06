#!/bin/bash

echo "ZirveClub Kurulum Scripti"
echo "========================="

# Sistem güncellemesi
echo "Sistem güncelleniyor..."
sudo apt update && sudo apt upgrade -y

# Node.js kurulumu
echo "Node.js kuruluyor..."
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# PM2 kurulumu
echo "PM2 kuruluyor..."
sudo npm install -g pm2

# Nginx kurulumu
echo "Nginx kuruluyor..."
sudo apt install nginx -y

# Firewall ayarları
echo "Firewall ayarlanıyor..."
sudo ufw allow 22
sudo ufw allow 80
sudo ufw allow 443
sudo ufw --force enable

# SSL sertifikası
echo "SSL sertifikası kuruluyor..."
sudo apt install certbot python3-certbot-nginx -y

echo "Kurulum tamamlandı!"
echo "Şimdi deploy.sh çalıştırın: bash deploy.sh" 