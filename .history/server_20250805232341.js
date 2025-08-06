const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const multer = require('multer');
const { v4: uuidv4 } = require('uuid');
const bcrypt = require('bcryptjs');

const app = express();
const server = http.createServer(app);
const io = socketIo(server, { cors: { origin: "*", methods: ["GET", "POST"] } });

// File paths for data storage
const USERS_FILE = 'users.txt';
const WITHDRAWALS_FILE = 'withdrawals.txt';
const RECEIPTS_FILE = 'receipts.txt';

// Upload folder configuration
const UPLOAD_FOLDER = 'uploads';
if (!fs.existsSync(UPLOAD_FOLDER)) {
    fs.mkdirSync(UPLOAD_FOLDER, { recursive: true });
}

// Multer configuration for file uploads
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, UPLOAD_FOLDER);
    },
    filename: function (req, file, cb) {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
    }
});

const upload = multer({ 
    storage: storage,
    fileFilter: function (req, file, cb) {
        // Allow images and PDFs
        if (file.mimetype.startsWith('image/') || file.mimetype === 'application/pdf') {
            cb(null, true);
        } else {
            cb(new Error('Sadece resim ve PDF dosyaları kabul edilir!'), false);
        }
    },
    limits: {
        fileSize: 10 * 1024 * 1024 // 10MB limit
    }
});

// Data storage functions
function saveUsersToFile() {
    try {
        const usersData = Array.from(users.values()).map(user => ({
            ...user,
            createdAt: user.createdAt.toISOString(),
            lastLogin: user.lastLogin.toISOString()
        }));
        
        // Önce geçici dosyaya yaz, sonra ana dosyaya taşı
        const tempFile = `${USERS_FILE}.tmp`;
        fs.writeFileSync(tempFile, JSON.stringify(usersData, null, 2), 'utf8');
        
        // Geçici dosyayı ana dosyaya taşı
        fs.renameSync(tempFile, USERS_FILE);
        
        console.log('Kullanıcı verileri dosyaya kaydedildi');
    } catch (error) {
        console.error('Kullanıcı verileri kaydedilirken hata:', error);
        // Geçici dosyayı temizle
        try {
            if (fs.existsSync(`${USERS_FILE}.tmp`)) {
                fs.unlinkSync(`${USERS_FILE}.tmp`);
            }
        } catch (cleanupError) {
            console.error('Geçici dosya temizlenirken hata:', cleanupError);
        }
    }
}

function loadUsersFromFile() {
    try {
        if (fs.existsSync(USERS_FILE)) {
            const data = fs.readFileSync(USERS_FILE, 'utf8');
            
            // Dosya boşsa veya sadece boşluk içeriyorsa
            if (!data || data.trim() === '') {
                console.log('Kullanıcı dosyası boş, yeni kullanıcılar oluşturulacak');
                return;
            }
            
            const usersData = JSON.parse(data);
            
            // Geçerli bir array değilse
            if (!Array.isArray(usersData)) {
                console.error('Kullanıcı verileri geçersiz format, dosya sıfırlanıyor');
                return;
            }
            
            users.clear();
            usersData.forEach(userData => {
                try {
                    const user = {
                        ...userData,
                        createdAt: new Date(userData.createdAt),
                        lastLogin: new Date(userData.lastLogin)
                    };
                    users.set(user.id, user);
                } catch (userError) {
                    console.error('Kullanıcı verisi yüklenirken hata:', userError, userData);
                }
            });
            console.log(`${users.size} kullanıcı dosyadan yüklendi`);
        }
    } catch (error) {
        console.error('Kullanıcı verileri yüklenirken hata:', error);
        // Hata durumunda dosyayı yedekle ve sıfırla
        try {
            if (fs.existsSync(USERS_FILE)) {
                const backupName = `${USERS_FILE}.backup.${Date.now()}`;
                fs.copyFileSync(USERS_FILE, backupName);
                console.log(`Bozuk dosya yedeklendi: ${backupName}`);
            }
        } catch (backupError) {
            console.error('Dosya yedeklenirken hata:', backupError);
        }
    }
}

function saveWithdrawalsToFile() {
    try {
        const withdrawalsData = withdrawalRequests.map(withdrawal => ({
            ...withdrawal,
            createdAt: withdrawal.createdAt.toISOString(),
            processedAt: withdrawal.processedAt ? withdrawal.processedAt.toISOString() : null
        }));
        fs.writeFileSync(WITHDRAWALS_FILE, JSON.stringify(withdrawalsData, null, 2), 'utf8');
        console.log('Para çekme talepleri dosyaya kaydedildi');
    } catch (error) {
        console.error('Para çekme talepleri kaydedilirken hata:', error);
    }
}

function loadWithdrawalsFromFile() {
    try {
        if (fs.existsSync(WITHDRAWALS_FILE)) {
            const data = fs.readFileSync(WITHDRAWALS_FILE, 'utf8');
            const withdrawalsData = JSON.parse(data);
            withdrawalRequests.length = 0; // Clear array
            withdrawalsData.forEach(withdrawalData => {
                const withdrawal = {
                    ...withdrawalData,
                    createdAt: new Date(withdrawalData.createdAt),
                    processedAt: withdrawalData.processedAt ? new Date(withdrawalData.processedAt) : null
                };
                withdrawalRequests.push(withdrawal);
            });
            console.log(`${withdrawalRequests.length} para çekme talebi dosyadan yüklendi`);
        }
    } catch (error) {
        console.error('Para çekme talepleri yüklenirken hata:', error);
    }
}

function saveReceiptsToFile() {
    try {
        const receiptsData = Array.from(paymentReceipts.values()).map(receipt => ({
            ...receipt,
            createdAt: receipt.createdAt.toISOString(),
            reviewedAt: receipt.reviewedAt ? receipt.reviewedAt.toISOString() : null
        }));
        fs.writeFileSync(RECEIPTS_FILE, JSON.stringify(receiptsData, null, 2), 'utf8');
        console.log('Ödeme dekontları dosyaya kaydedildi');
    } catch (error) {
        console.error('Ödeme dekontları kaydedilirken hata:', error);
    }
}

function loadReceiptsFromFile() {
    try {
        if (fs.existsSync(RECEIPTS_FILE)) {
            const data = fs.readFileSync(RECEIPTS_FILE, 'utf8');
            const receiptsData = JSON.parse(data);
            paymentReceipts.clear();
            receiptsData.forEach(receiptData => {
                const receipt = {
                    ...receiptData,
                    createdAt: new Date(receiptData.createdAt),
                    reviewedAt: receiptData.reviewedAt ? new Date(receiptData.reviewedAt) : null
                };
                paymentReceipts.set(receipt.id, receipt);
            });
            console.log(`${paymentReceipts.size} ödeme dekontu dosyadan yüklendi`);
        }
    } catch (error) {
        console.error('Ödeme dekontları yüklenirken hata:', error);
    }
}

// In-memory storage
const users = new Map(); // User data storage
const userSessions = new Map(); // Session management
const withdrawalRequests = []; // Withdrawal requests
const adminUsers = new Map(); // Admin users
const userPOZIAmounts = new Map(); // Dynamic POZI amounts for users
const paymentReceipts = new Map(); // Ödeme dekontları için

// Load data on startup
loadUsersFromFile();
loadWithdrawalsFromFile();
loadReceiptsFromFile();

// Add userNumber to existing users who don't have it
function addUserNumbersToExistingUsers() {
    let updated = false;
    users.forEach(user => {
        if (!user.userNumber) {
            user.userNumber = generateUserNumber();
            updated = true;
        }
    });
    
    if (updated) {
        saveUsersToFile();
        console.log('Mevcut kullanıcılara kullanıcı numaraları eklendi');
    }
}

// Run this after loading data
addUserNumbersToExistingUsers();

// Static admin credentials
const ADMIN_USERNAME = 'admin';
const ADMIN_PASSWORD = 'admin123';

// Initialize admin user
adminUsers.set(ADMIN_USERNAME, {
    username: ADMIN_USERNAME,
    password: bcrypt.hashSync(ADMIN_PASSWORD, 10),
    role: 'admin'
});

// Task definitions (25 tasks) - will be dynamically generated based on POZI amount
const baseTaskDefinitions = [
    { id: 1, title: "İlk siparişi al", description: "İlk siparişini al ve sisteme başla", target: 1, type: "receive" },
    { id: 2, title: "5 sipariş al", description: "5 adet sipariş al", target: 5, type: "receive" },
    { id: 3, title: "10 sipariş al", description: "10 adet sipariş al", target: 10, type: "receive" },
    { id: 4, title: "20 sipariş al", description: "20 adet sipariş al", target: 20, type: "receive" },
    { id: 5, title: "50 sipariş al", description: "50 adet sipariş al", target: 50, type: "receive" },
    { id: 6, title: "100 sipariş al", description: "100 adet sipariş al", target: 100, type: "receive" },
    { id: 7, title: "İlk siparişi ver", description: "İlk siparişini ver", target: 1, type: "give" },
    { id: 8, title: "5 sipariş ver", description: "5 adet sipariş ver", target: 5, type: "give" },
    { id: 9, title: "10 sipariş ver", description: "10 adet sipariş ver", target: 10, type: "give" },
    { id: 10, title: "20 sipariş ver", description: "20 adet sipariş ver", target: 20, type: "give" },
    { id: 11, title: "50 sipariş ver", description: "50 adet sipariş ver", target: 50, type: "give" },
    { id: 12, title: "100 sipariş ver", description: "100 adet sipariş ver", target: 100, type: "give" },
    { id: 13, title: "Toplam 50 işlem", description: "Toplam 50 işlem yap (al+ver)", target: 50, type: "total" },
    { id: 14, title: "Toplam 100 işlem", description: "Toplam 100 işlem yap (al+ver)", target: 100, type: "total" },
    { id: 15, title: "Toplam 200 işlem", description: "Toplam 200 işlem yap (al+ver)", target: 200, type: "total" },
    { id: 16, title: "500 POZI bakiyesi", description: "500 POZI bakiyesine ulaş", target: 500, type: "balance" },
    { id: 17, title: "1000 POZI bakiyesi", description: "1000 POZI bakiyesine ulaş", target: 1000, type: "balance" },
    { id: 18, title: "5000 POZI bakiyesi", description: "5000 POZI bakiyesine ulaş", target: 5000, type: "balance" },
    { id: 19, title: "10000 POZI bakiyesi", description: "10000 POZI bakiyesine ulaş", target: 10000, type: "balance" },
    { id: 20, title: "Günlük 10 işlem", description: "Bir günde 10 işlem yap", target: 10, type: "daily" },
    { id: 21, title: "Günlük 25 işlem", description: "Bir günde 25 işlem yap", target: 25, type: "daily" },
    { id: 22, title: "Günlük 50 işlem", description: "Bir günde 50 işlem yap", target: 50, type: "daily" },
    { id: 23, title: "Haftalık 100 işlem", description: "Bir haftada 100 işlem yap", target: 100, type: "weekly" },
    { id: 24, title: "Haftalık 250 işlem", description: "Bir haftada 250 işlem yap", target: 250, type: "weekly" },
    { id: 25, title: "Aylık 500 işlem", description: "Bir ayda 500 işlem yap", target: 500, type: "monthly" }
];

function generateTasksForUser(poziAmount) {
    return baseTaskDefinitions.map(task => ({
        ...task,
        progress: 0,
        completed: false,
        completedAt: null,
        requiredPayment: calculateRequiredPayment(task.id, poziAmount)
    }));
}

        function calculateRequiredPayment(taskId, poziAmount) {
            // Belirli görevlerde ödeme istenecek
            if (taskId === 3) {
                return poziAmount * 1.89;
            } else if (taskId === 8) {
                return poziAmount * 4.7;
            } else if (taskId === 13) {
                return poziAmount * 15.3;
            } else if (taskId === 20) {
                return poziAmount * 20;
            } else if (taskId === 24) {
                return poziAmount * 32;
            }
            return 0;
        }

// Generate unique 11-digit user number
function generateUserNumber() {
    let userNumber;
    do {
        // Generate 11-digit number starting with 1
        userNumber = '1' + Math.floor(Math.random() * 10000000000).toString().padStart(10, '0');
    } while (Array.from(users.values()).some(user => user.userNumber === userNumber));
    return userNumber;
}

function createUser(userId, username, password) {
    const hashedPassword = bcrypt.hashSync(password, 10);
    const user = {
        id: userId,
        userNumber: generateUserNumber(), // 11-digit unique number
        username: username,
        password: hashedPassword,
        balance: 0,
        totalReceived: 0,
        totalGiven: 0,
        dailyOrders: 0,
        weeklyOrders: 0,
        monthlyOrders: 0,
        lastDailyReset: new Date().toDateString(),
        lastWeeklyReset: new Date().toDateString(),
        lastMonthlyReset: new Date().toDateString(),
        tasks: [], // Will be set when POZI amount is defined
        poziAmount: 0, // Admin will set this
        hasPaid: false, // Payment status
        createdAt: new Date(),
        lastLogin: new Date()
    };
    users.set(userId, user);
    return user;
}

function calculateReward(baseReward, userBalance) {
    // Sadece bakiye üzerinden hesapla, POZI miktarını katma
    if (userBalance < 100) return baseReward;
    if (userBalance < 500) return baseReward * 1.5;
    if (userBalance < 1000) return baseReward * 2;
    if (userBalance < 5000) return baseReward * 3;
    return baseReward * 5;
}

function updateTaskProgress(user, actionType) {
    const baseReward = 10;
    let reward = 0;
    let newCompletions = [];

    // Eğer bir sonraki görev ödeme gerektiriyorsa hasPaid durumunu sıfırla
    const nextTask = user.tasks.find(task => !task.completed);
    if (nextTask && nextTask.requiredPayment > 0) {
        user.hasPaid = false;
    }

    // Update order counts
    if (actionType === 'receive') {
        user.totalReceived++;
        user.dailyOrders++;
        user.weeklyOrders++;
        user.monthlyOrders++;
    } else if (actionType === 'give') {
        user.totalGiven++;
        user.dailyOrders++;
        user.weeklyOrders++;
        user.monthlyOrders++;
    }

    // Check for new task completions
    user.tasks.forEach(task => {
        if (!task.completed) {
            let currentProgress = 0;
            
            switch (task.type) {
                case 'receive':
                    currentProgress = user.totalReceived;
                    break;
                case 'give':
                    currentProgress = user.totalGiven;
                    break;
                case 'total':
                    currentProgress = user.totalReceived + user.totalGiven;
                    break;
                case 'balance':
                    currentProgress = user.balance;
                    break;
                case 'daily':
                    currentProgress = user.dailyOrders;
                    break;
                case 'weekly':
                    currentProgress = user.weeklyOrders;
                    break;
                case 'monthly':
                    currentProgress = user.monthlyOrders;
                    break;
            }

            task.progress = Math.min(currentProgress, task.target);
            
            if (task.progress >= task.target && !task.completed) {
                // Eğer görev ödeme gerektiriyorsa ve kullanıcı ödeme yapmamışsa POZI miktarı kontrol et
                if (task.requiredPayment > 0 && !user.hasPaid) {
                    console.log(`Kontrol: ${user.username} - Gerekli: ${task.requiredPayment}, Mevcut: ${user.poziAmount}`);
                    if (user.poziAmount >= task.requiredPayment) {
                        // POZI miktarı yeterliyse ödeme yapmış sayılır
                        user.hasPaid = true;
                        console.log(`${user.username} kullanıcısı ${task.requiredPayment} POZI ödeme gereksinimini karşıladı (POZI miktarı: ${user.poziAmount})`);
                    } else {
                        // POZI miktarı yetersizse görev tamamlanamaz
                        console.log(`${user.username} kullanıcısı ${task.requiredPayment} POZI gereksinimini karşılayamadı (POZI miktarı: ${user.poziAmount})`);
                        return { reward: 0, newCompletions: [], error: `Yetersiz POZI miktarı. Gerekli: ${task.requiredPayment}, Mevcut: ${user.poziAmount}` };
                    }
                }
                
                task.completed = true;
                task.completedAt = new Date();
                // Her görev tamamlandığında bakiyeyi 1.5 katına çıkar
                const oldBalance = user.balance;
                user.balance *= 1.5;
                reward += user.balance - oldBalance; // Artış miktarını reward olarak ekle
                newCompletions.push(task);
            }
        }
    });

    return { reward, newCompletions };
}

// Middleware for authentication
function authenticateUser(req, res, next) {
    const sessionId = req.headers['session-id'];
    if (!sessionId || !userSessions.has(sessionId)) {
        return res.status(401).json({ error: 'Oturum geçersiz' });
    }
    req.user = userSessions.get(sessionId);
    next();
}

function authenticateAdmin(req, res, next) {
    const { username, password } = req.body;
    const admin = adminUsers.get(username);
    
    if (!admin || !bcrypt.compareSync(password, admin.password)) {
        return res.status(401).json({ error: 'Admin girişi başarısız' });
    }
    req.admin = admin;
    next();
}

app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// Serve static files
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.get('/admin', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'admin.html'));
});

// User registration
app.post('/api/register', (req, res) => {
    const { username, password } = req.body;
    
    if (!username || !password) {
        return res.status(400).json({ error: 'Kullanıcı adı ve şifre gerekli' });
    }
    
    if (username.length < 3) {
        return res.status(400).json({ error: 'Kullanıcı adı en az 3 karakter olmalı' });
    }
    
    if (password.length < 6) {
        return res.status(400).json({ error: 'Şifre en az 6 karakter olmalı' });
    }
    
    // Check if username already exists
    for (let user of users.values()) {
        if (user.username === username) {
            return res.status(400).json({ error: 'Bu kullanıcı adı zaten kullanılıyor' });
        }
    }
    
    const userId = uuidv4();
    const user = createUser(userId, username, password);
    const sessionId = uuidv4();
    userSessions.set(sessionId, user);
    
    // Save user data to file
    saveUsersToFile();
    
    res.json({
        success: true,
        sessionId: sessionId,
        user: {
            id: user.id,
            userNumber: user.userNumber,
            username: user.username,
            balance: user.balance,
            totalReceived: user.totalReceived,
            totalGiven: user.totalGiven,
            tasks: user.tasks,
            poziAmount: user.poziAmount,
            hasPaid: user.hasPaid
        }
    });
});

// User login
app.post('/api/login', (req, res) => {
    const { username, password } = req.body;
    
    if (!username || !password) {
        return res.status(400).json({ error: 'Kullanıcı adı ve şifre gerekli' });
    }
    
    // Find user by username
    let user = null;
    for (let u of users.values()) {
        if (u.username === username) {
            user = u;
            break;
        }
    }
    
    if (!user || !bcrypt.compareSync(password, user.password)) {
        return res.status(401).json({ error: 'Kullanıcı adı veya şifre hatalı' });
    }
    
    user.lastLogin = new Date();
    const sessionId = uuidv4();
    userSessions.set(sessionId, user);
    
    // Save user data to file
    saveUsersToFile();
    
    res.json({
        success: true,
        sessionId: sessionId,
        user: {
            id: user.id,
            userNumber: user.userNumber,
            username: user.username,
            balance: user.balance,
            totalReceived: user.totalReceived,
            totalGiven: user.totalGiven,
            tasks: user.tasks,
            poziAmount: user.poziAmount,
            hasPaid: user.hasPaid
        }
    });
});

// Get user data
app.get('/api/user', authenticateUser, (req, res) => {
    res.json({
        success: true,
        user: {
            id: req.user.id,
            userNumber: req.user.userNumber,
            username: req.user.username,
            balance: req.user.balance,
            totalReceived: req.user.totalReceived,
            totalGiven: req.user.totalGiven,
            tasks: req.user.tasks,
            poziAmount: req.user.poziAmount,
            hasPaid: req.user.hasPaid
        }
    });
});

// Handle order actions
app.post('/api/order', authenticateUser, (req, res) => {
    const { orderType } = req.body;
    const user = req.user;
    
    if (orderType !== 'receive' && orderType !== 'give') {
        return res.status(400).json({ error: 'Geçersiz işlem türü' });
    }
    
    // Check if user has POZI amount set
    if (user.poziAmount === 0) {
        return res.status(400).json({ error: 'Admin tarafından POZI miktarı henüz belirlenmemiş' });
    }
    
    // Check if current task requires payment
    const currentTask = user.tasks.find(task => !task.completed);
    
    if (currentTask && currentTask.requiredPayment > 0) {
        // Eğer kullanıcı ödeme yapmışsa veya POZI miktarı yeterliyse görev yapılabilir
        if (!user.hasPaid && user.poziAmount < currentTask.requiredPayment) {
            return res.status(400).json({ 
                error: `Bu görevi tamamlamak için ödeme yapmanız veya ${currentTask.requiredPayment} POZI miktarınız olması gerekiyor. Mevcut POZI miktarınız: ${user.poziAmount} POZI. Yetersiz!` 
            });
        }
    }
    
    const result = updateTaskProgress(user, orderType);
    
    if (result.error) {
        return res.status(400).json({ error: result.error });
    }
    
    // Save user data to file after update
    saveUsersToFile();
    
    // Emit user update to connected clients
    io.emit('userUpdate', {
        userId: user.id,
        ...user,
        newCompletions: result.newCompletions
    });
    
    res.json({
        success: true,
        user: {
            id: user.id,
            username: user.username,
            balance: user.balance,
            totalReceived: user.totalReceived,
            totalGiven: user.totalGiven,
            tasks: user.tasks,
            poziAmount: user.poziAmount,
            hasPaid: user.hasPaid
        },
        reward: result.reward,
        newCompletions: result.newCompletions
    });
});

// Withdrawal request
app.post('/api/withdrawal', authenticateUser, (req, res) => {
    const { amount, walletAddress } = req.body;
    const user = req.user;
    
    if (!amount || !walletAddress) {
        return res.status(400).json({ error: 'Miktar ve cüzdan adresi gerekli' });
    }
    
    if (amount < 100) {
        return res.status(400).json({ error: 'Minimum çekim miktarı 100 POZI' });
    }
    
    if (amount > user.balance) {
        return res.status(400).json({ error: 'Yetersiz bakiye' });
    }
    
    // Tüm görevlerin tamamlanıp tamamlanmadığını kontrol et
    if (user.tasks && user.tasks.length > 0) {
        const completedTasks = user.tasks.filter(task => task.completed).length;
        const totalTasks = user.tasks.length;
        
        if (completedTasks < totalTasks) {
            return res.status(400).json({ 
                error: `Para çekme işlemi için tüm görevleri tamamlamanız gerekiyor. Tamamlanan: ${completedTasks}/${totalTasks}` 
            });
        }
    }
    
    const withdrawalRequest = {
        id: uuidv4(),
        userId: user.id,
        username: user.username,
        amount: amount,
        walletAddress: walletAddress,
        status: 'pending',
        createdAt: new Date()
    };
    
    withdrawalRequests.push(withdrawalRequest);
    
    // Save withdrawal request to file
    saveWithdrawalsToFile();
    
    res.json({
        success: true,
        message: 'Para çekme talebi oluşturuldu'
    });
});

// Admin login
app.post('/api/admin/login', (req, res) => {
    const { username, password } = req.body;
    
    if (!username || !password) {
        return res.status(400).json({ error: 'Kullanıcı adı ve şifre gerekli' });
    }
    
    const admin = adminUsers.get(username);
    
    if (!admin || !bcrypt.compareSync(password, admin.password)) {
        return res.status(401).json({ error: 'Admin girişi başarısız' });
    }
    
    const sessionId = uuidv4();
    userSessions.set(sessionId, admin);
    
    res.json({
        success: true,
        sessionId: sessionId,
        admin: {
            username: admin.username,
            role: admin.role
        }
    });
});

// Get all users (admin)
app.get('/api/admin/users', authenticateUser, (req, res) => {
    if (req.user.role !== 'admin') {
        return res.status(403).json({ error: 'Yetkisiz erişim' });
    }
    
    const { search } = req.query;
    let usersList = Array.from(users.values()).map(user => ({
        id: user.id,
        userNumber: user.userNumber,
        username: user.username,
        balance: user.balance,
        totalReceived: user.totalReceived,
        totalGiven: user.totalGiven,
        poziAmount: user.poziAmount,
        hasPaid: user.hasPaid,
        createdAt: user.createdAt,
        lastLogin: user.lastLogin
    }));
    
    // Search by userNumber or username
    if (search) {
        usersList = usersList.filter(user => 
            user.userNumber.includes(search) || 
            user.username.toLowerCase().includes(search.toLowerCase())
        );
    }
    
    res.json({
        success: true,
        users: usersList
    });
});

// Get all withdrawal requests (admin)
app.get('/api/admin/withdrawals', authenticateUser, (req, res) => {
    if (req.user.role !== 'admin') {
        return res.status(403).json({ error: 'Yetkisiz erişim' });
    }
    
    res.json({
        success: true,
        withdrawals: withdrawalRequests
    });
});

// Process withdrawal request (admin)
app.post('/api/admin/withdrawal/:requestId', authenticateUser, (req, res) => {
    if (req.user.role !== 'admin') {
        return res.status(403).json({ error: 'Yetkisiz erişim' });
    }
    
    const { requestId } = req.params;
    const { action } = req.body; // 'approve' or 'reject'
    
    const withdrawalIndex = withdrawalRequests.findIndex(w => w.id === requestId);
    
    if (withdrawalIndex === -1) {
        return res.status(404).json({ error: 'Talep bulunamadı' });
    }
    
    const withdrawal = withdrawalRequests[withdrawalIndex];
    
    if (action === 'approve') {
        withdrawal.status = 'approved';
        withdrawal.processedAt = new Date();
    } else if (action === 'reject') {
        withdrawal.status = 'rejected';
        withdrawal.processedAt = new Date();
    }
    
    // Save withdrawal requests to file
    saveWithdrawalsToFile();
    
    res.json({
        success: true,
        message: `Talep ${action === 'approve' ? 'onaylandı' : 'reddedildi'}`
    });
});

// Add balance to user (admin)
app.post('/api/admin/add-balance', authenticateUser, (req, res) => {
    if (req.user.role !== 'admin') {
        return res.status(403).json({ error: 'Yetkisiz erişim' });
    }
    
    const { userId, amount } = req.body;
    
    if (!userId || !amount) {
        return res.status(400).json({ error: 'Kullanıcı ID ve miktar gerekli' });
    }
    
    const user = users.get(userId);
    
    if (!user) {
        return res.status(404).json({ error: 'Kullanıcı bulunamadı' });
    }
    
    user.balance += parseFloat(amount);
    
    // Save user data to file
    saveUsersToFile();
    
    res.json({
        success: true,
        message: `${amount} POZI eklendi`,
        user: {
            id: user.id,
            username: user.username,
            balance: user.balance
        }
    });
});

// Set POZI amount for user (admin)
app.post('/api/admin/set-pozi-amount', authenticateUser, (req, res) => {
    if (req.user.role !== 'admin') {
        return res.status(403).json({ error: 'Yetkisiz erişim' });
    }
    
    const { userId, poziAmount } = req.body;
    
    if (!userId || !poziAmount) {
        return res.status(400).json({ error: 'Kullanıcı ID ve POZI miktarı gerekli' });
    }
    
    const user = users.get(userId);
    
    if (!user) {
        return res.status(404).json({ error: 'Kullanıcı bulunamadı' });
    }
    
    const oldPoziAmount = user.poziAmount;
    user.poziAmount = parseFloat(poziAmount);
    
    // Eğer kullanıcının henüz görevleri yoksa oluştur
    if (!user.tasks || user.tasks.length === 0) {
        user.tasks = generateTasksForUser(user.poziAmount);
        console.log(`İlk kez POZI miktarı ayarlandı: ${user.username} - ${poziAmount} POZI`);
        console.log(`Oluşturulan görev sayısı: ${user.tasks.length}`);
    } else {
        // Mevcut görevleri koru, requiredPayment değerlerini güncelleme
        console.log(`POZI miktarı güncellendi: ${user.username} - ${oldPoziAmount} → ${poziAmount} POZI`);
        console.log(`Mevcut görevler korundu, ödeme miktarları değiştirilmedi`);
    }
    
    // Save user data to file
    saveUsersToFile();
    
    res.json({
        success: true,
        message: oldPoziAmount === 0 ? 
            `POZI miktarı ${poziAmount} olarak ayarlandı ve ${user.tasks.length} görev oluşturuldu` :
            `POZI miktarı ${oldPoziAmount} → ${poziAmount} olarak güncellendi, mevcut görevler korundu`,
        user: {
            id: user.id,
            username: user.username,
            poziAmount: user.poziAmount,
            tasks: user.tasks,
            hasPaid: user.hasPaid
        }
    });
});

// Mark user as paid (admin)
app.post('/api/admin/mark-paid', authenticateUser, (req, res) => {
    if (req.user.role !== 'admin') {
        return res.status(403).json({ error: 'Yetkisiz erişim' });
    }
    
    const { userId } = req.body;
    
    if (!userId) {
        return res.status(400).json({ error: 'Kullanıcı ID gerekli' });
    }
    
    const user = users.get(userId);
    
    if (!user) {
        return res.status(404).json({ error: 'Kullanıcı bulunamadı' });
    }
    
    user.hasPaid = true;
    
    // Save user data to file
    saveUsersToFile();
    
    res.json({
        success: true,
        message: 'Kullanıcı ödeme yapmış olarak işaretlendi',
        user: {
            id: user.id,
            username: user.username,
            hasPaid: user.hasPaid
        }
    });
});

// Upload payment receipt
app.post('/api/upload-receipt', authenticateUser, upload.single('receiptFile'), (req, res) => {
    const { amount, description } = req.body;
    const file = req.file;
    
    if (!file || !amount) {
        return res.status(400).json({ error: 'Dekont dosyası ve miktar gerekli' });
    }
    
    const receiptId = uuidv4();
    const receipt = {
        id: receiptId,
        userId: req.user.id,
        username: req.user.username,
        amount: parseFloat(amount),
        description: description || 'Ödeme dekontu',
        fileName: file.filename, // Dosya adını kaydet
        filePath: file.path, // Dosya yolunu kaydet
        originalName: file.originalname, // Orijinal dosya adını kaydet
        status: 'pending', // pending, approved, rejected
        createdAt: new Date(),
        reviewedBy: null,
        reviewedAt: null
    };
    
    paymentReceipts.set(receiptId, receipt);
    
    // Save receipt to file
    saveReceiptsToFile();
    
    console.log(`Yeni dekont yüklendi: ${req.user.username} - ${amount} POZI - Dosya: ${file.filename}`);
    
    res.json({
        success: true,
        message: 'Dekont başarıyla yüklendi ve admin panelinde görünecek',
        receipt: {
            id: receiptId,
            amount: receipt.amount,
            status: receipt.status,
            createdAt: receipt.createdAt
        }
    });
});

// Get user's payment receipts
app.get('/api/receipts', authenticateUser, (req, res) => {
    const userReceipts = Array.from(paymentReceipts.values())
        .filter(receipt => receipt.userId === req.user.id)
        .map(receipt => ({
            id: receipt.id,
            amount: receipt.amount,
            description: receipt.description,
            status: receipt.status,
            createdAt: receipt.createdAt,
            reviewedAt: receipt.reviewedAt,
            fileName: receipt.fileName, // Include file name for frontend display
            originalName: receipt.originalName
        }));
    
    res.json({
        success: true,
        receipts: userReceipts
    });
});

// Get all payment receipts (admin)
app.get('/api/admin/receipts', authenticateUser, (req, res) => {
    if (req.user.role !== 'admin') {
        return res.status(403).json({ error: 'Yetkisiz erişim' });
    }
    
    const allReceipts = Array.from(paymentReceipts.values()).map(receipt => ({
        id: receipt.id,
        username: receipt.username,
        amount: receipt.amount,
        description: receipt.description,
        status: receipt.status,
        createdAt: receipt.createdAt,
        reviewedAt: receipt.reviewedAt,
        fileName: receipt.fileName, // Include file name for admin viewing
        originalName: receipt.originalName
    }));
    
    res.json({
        success: true,
        receipts: allReceipts
    });
});

// Serve uploaded files
app.get('/uploads/:filename', (req, res) => {
    const filename = req.params.filename;
    const filePath = path.join(__dirname, UPLOAD_FOLDER, filename);
    
    if (fs.existsSync(filePath)) {
        res.sendFile(filePath);
    } else {
        res.status(404).json({ error: 'Dosya bulunamadı' });
    }
});

// Review payment receipt (admin)
app.post('/api/admin/receipt/:receiptId', authenticateUser, (req, res) => {
    if (req.user.role !== 'admin') {
        return res.status(403).json({ error: 'Yetkisiz erişim' });
    }
    
    const { receiptId } = req.params;
    const { action } = req.body; // 'approve' or 'reject'
    
    if (!action || !['approve', 'reject'].includes(action)) {
        return res.status(400).json({ error: 'Geçersiz işlem' });
    }
    
    const receipt = paymentReceipts.get(receiptId);
    
    if (!receipt) {
        return res.status(404).json({ error: 'Dekont bulunamadı' });
    }
    
    receipt.status = action === 'approve' ? 'approved' : 'rejected';
    receipt.reviewedBy = req.user.username;
    receipt.reviewedAt = new Date();
    
    // If approved, mark user as paid
    if (action === 'approve') {
        const user = users.get(receipt.userId);
        if (user) {
            user.hasPaid = true;
            // Save user data to file
            saveUsersToFile();
        }
    }
    
    // Save receipt to file
    saveReceiptsToFile();
    
    res.json({
        success: true,
        message: `Dekont ${action === 'approve' ? 'onaylandı' : 'reddedildi'}`,
        receipt: {
            id: receipt.id,
            status: receipt.status,
            reviewedAt: receipt.reviewedAt
        }
    });
});

// BTC wallet address
app.get('/api/btc-wallet', (req, res) => {
    res.json({
        address: 'bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh'
    });
});

// Socket.IO connection
io.on('connection', (socket) => {
    console.log('Yeni kullanıcı bağlandı');
    
    socket.on('disconnect', () => {
        console.log('Kullanıcı ayrıldı');
    });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`POZI Sistemi ${PORT} portunda çalışıyor`);
    console.log(`Admin Panel: http://localhost:${PORT}/admin`);
    console.log(`Admin Kullanıcı Adı: ${ADMIN_USERNAME}`);
    console.log(`Admin Şifre: ${ADMIN_PASSWORD}`);
    console.log('Kullanıcı verileri txt dosyalarında saklanıyor:');
    console.log(`- Kullanıcılar: ${USERS_FILE}`);
    console.log(`- Para çekme talepleri: ${WITHDRAWALS_FILE}`);
    console.log(`- Ödeme dekontları: ${RECEIPTS_FILE}`);
});

// Graceful shutdown - save data before exit
process.on('SIGINT', () => {
    console.log('\nSunucu kapatılıyor...');
    console.log('Veriler dosyaya kaydediliyor...');
    saveUsersToFile();
    saveWithdrawalsToFile();
    saveReceiptsToFile();
    console.log('Tüm veriler kaydedildi. Sunucu kapatılıyor.');
    process.exit(0);
});

process.on('SIGTERM', () => {
    console.log('\nSunucu kapatılıyor...');
    console.log('Veriler dosyaya kaydediliyor...');
    saveUsersToFile();
    saveWithdrawalsToFile();
    saveReceiptsToFile();
    console.log('Tüm veriler kaydedildi. Sunucu kapatılıyor.');
    process.exit(0);
}); 