// Global variables
let currentUser = null;
let socket = null;
let sessionId = null;

// DOM elements
const authSection = document.getElementById('authSection');
const mainApp = document.getElementById('mainApp');
const loginForm = document.getElementById('loginForm');
const registerForm = document.getElementById('registerForm');
const authTabs = document.querySelectorAll('.auth-tab');
const logoutBtn = document.getElementById('logoutBtn');
const receiveOrderBtn = document.getElementById('receiveOrderBtn');
const giveOrderBtn = document.getElementById('giveOrderBtn');
const withdrawalForm = document.getElementById('withdrawalForm');

// Initialize application
document.addEventListener('DOMContentLoaded', async () => {
    // Check for existing session
    sessionId = localStorage.getItem('sessionId');
    if (sessionId) {
        await loadUserData();
    } else {
        showAuthSection();
    }
    
    setupEventListeners();
    setupSocketListeners();
    loadBTCWallet();
});

// Authentication functions
function showAuthSection() {
    authSection.style.display = 'flex';
    mainApp.style.display = 'none';
}

function showMainApp() {
    authSection.style.display = 'none';
    mainApp.style.display = 'block';
    navigateToPage('main'); // Default to main page
}

// Navigation function
function navigateToPage(pageName) {
    // Hide all pages
    const pages = document.querySelectorAll('.page-content');
    pages.forEach(page => page.classList.remove('active'));
    
    // Show target page
    const targetPage = document.getElementById(pageName + 'Page');
    if (targetPage) {
        targetPage.classList.add('active');
    }
    
    // Update navbar active state
    const navButtons = document.querySelectorAll('.nav-btn');
    navButtons.forEach(btn => {
        btn.classList.remove('active');
        if (btn.dataset.page === pageName) {
            btn.classList.add('active');
        }
    });
    
    // Load specific content for certain pages
    if (pageName === 'deposit') {
        loadBTCWallet();
        loadReceiptHistory();
    } else if (pageName === 'withdrawals') {
        loadWithdrawalsHistory();
    }
}

async function loadUserData() {
    try {
        showLoading();
        
        const response = await fetch('/api/user', {
            headers: {
                'session-id': sessionId
            }
        });
        
        if (response.ok) {
            const data = await response.json();
            currentUser = data.user;
            updateUI();
            showMainApp();
        } else {
            // Session expired or invalid
            localStorage.removeItem('sessionId');
            sessionId = null;
            showAuthSection();
        }
    } catch (error) {
        console.error('Error loading user data:', error);
        showNotification('Kullanıcı verileri yüklenirken hata oluştu', 'error');
        localStorage.removeItem('sessionId');
        sessionId = null;
        showAuthSection();
    } finally {
        hideLoading();
    }
}

// Setup event listeners
function setupEventListeners() {
    // Auth tab switching
    authTabs.forEach(tab => {
        tab.addEventListener('click', () => {
            const targetTab = tab.dataset.tab;
            
            // Update active tab
            authTabs.forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
            
            // Show corresponding form
            document.querySelectorAll('.auth-form').forEach(form => {
                form.classList.remove('active');
            });
            document.getElementById(targetTab + 'Form').classList.add('active');
        });
    });
    
    // Navbar navigation
    const navButtons = document.querySelectorAll('.nav-btn');
    navButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            const targetPage = btn.dataset.page;
            navigateToPage(targetPage);
        });
    });
    
    // Login form
    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        await handleLogin();
    });
    
    // Register form
    registerForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        await handleRegister();
    });
    
    // Logout
    logoutBtn.addEventListener('click', handleLogout);
    
    // Order buttons
    receiveOrderBtn.addEventListener('click', () => handleOrder('receive'));
    giveOrderBtn.addEventListener('click', () => handleOrder('give'));
    
    // Withdrawal form
    withdrawalForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        await handleWithdrawal();
    });
    
    // Receipt form
    const receiptForm = document.getElementById('receiptForm');
    if (receiptForm) {
        receiptForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            await handleReceiptUpload();
        });
    }
    
    // Keyboard shortcuts
    document.addEventListener('keydown', (e) => {
        if (e.key === '1' && currentUser) {
            handleOrder('receive');
        } else if (e.key === '2' && currentUser) {
            handleOrder('give');
        }
    });
    
    // Copy BTC address
    document.getElementById('copyBTCBtn').addEventListener('click', copyBTCAddress);
}

// Authentication handlers
async function handleLogin() {
    const username = document.getElementById('loginUsername').value;
    const password = document.getElementById('loginPassword').value;
    
    if (!username || !password) {
        showNotification('Kullanıcı adı ve şifre gerekli', 'error');
        return;
    }
    
    try {
        showLoading();
        
        const response = await fetch('/api/login', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ username, password })
        });
        
        const data = await response.json();
        
        if (response.ok) {
            sessionId = data.sessionId;
            localStorage.setItem('sessionId', sessionId);
            currentUser = data.user;
            updateUI();
            showMainApp();
            showNotification('Başarıyla giriş yapıldı', 'success');
        } else {
            showNotification(data.error || 'Giriş başarısız', 'error');
        }
    } catch (error) {
        console.error('Login error:', error);
        showNotification('Giriş yapılırken hata oluştu', 'error');
    } finally {
        hideLoading();
    }
}

async function handleRegister() {
    const username = document.getElementById('registerUsername').value;
    const password = document.getElementById('registerPassword').value;
    const confirmPassword = document.getElementById('confirmPassword').value;
    
    if (!username || !password || !confirmPassword) {
        showNotification('Tüm alanları doldurun', 'error');
        return;
    }
    
    if (username.length < 3) {
        showNotification('Kullanıcı adı en az 3 karakter olmalı', 'error');
        return;
    }
    
    if (password.length < 6) {
        showNotification('Şifre en az 6 karakter olmalı', 'error');
        return;
    }
    
    if (password !== confirmPassword) {
        showNotification('Şifreler eşleşmiyor', 'error');
        return;
    }
    
    try {
        showLoading();
        
        const response = await fetch('/api/register', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ username, password })
        });
        
        const data = await response.json();
        
        if (response.ok) {
            sessionId = data.sessionId;
            localStorage.setItem('sessionId', sessionId);
            currentUser = data.user;
            updateUI();
            showMainApp();
            showNotification('Hesap başarıyla oluşturuldu', 'success');
        } else {
            showNotification(data.error || 'Kayıt başarısız', 'error');
        }
    } catch (error) {
        console.error('Register error:', error);
        showNotification('Kayıt olurken hata oluştu', 'error');
    } finally {
        hideLoading();
    }
}

function handleLogout() {
    localStorage.removeItem('sessionId');
    sessionId = null;
    currentUser = null;
    showAuthSection();
    
    // Clear forms
    loginForm.reset();
    registerForm.reset();
    
    showNotification('Çıkış yapıldı', 'info');
}

// Order handling
async function handleOrder(orderType) {
    if (!currentUser) return;
    
    try {
        showLoading();
        
        const response = await fetch('/api/order', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'session-id': sessionId
            },
            body: JSON.stringify({ orderType })
        });
        
        const data = await response.json();
        
        if (response.ok) {
            currentUser = data.user;
            updateUI();
            
            // Show reward notification
            if (data.reward > 0) {
                showNotification(`+${data.reward} POZI kazandınız!`, 'success');
            }
            
            // Celebrate new task completions
            if (data.newCompletions && data.newCompletions.length > 0) {
                data.newCompletions.forEach(task => {
                    celebrateTaskCompletion(task);
                });
            }
            
            addButtonClickEffect(orderType === 'receive' ? receiveOrderBtn : giveOrderBtn);
        } else {
            showNotification(data.error || 'İşlem başarısız', 'error');
        }
    } catch (error) {
        console.error('Order error:', error);
        showNotification('İşlem yapılırken hata oluştu', 'error');
    } finally {
        hideLoading();
    }
}

// Withdrawal handling
async function handleWithdrawal() {
    if (!currentUser) return;
    
    const amount = parseFloat(document.getElementById('withdrawalAmount').value);
    const walletAddress = document.getElementById('walletAddress').value;
    
    if (!amount || !walletAddress) {
        showNotification('Tüm alanları doldurun', 'error');
        return;
    }
    
    if (amount < 100) {
        showNotification('Minimum çekim miktarı 100 POZI', 'error');
        return;
    }
    
    if (amount > currentUser.balance) {
        showNotification('Yetersiz bakiye', 'error');
        return;
    }
    
    try {
        showLoading();
        
        const response = await fetch('/api/withdrawal', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'session-id': sessionId
            },
            body: JSON.stringify({ amount, walletAddress })
        });
        
        const data = await response.json();
        
        if (response.ok) {
            showNotification('Para çekme talebi oluşturuldu', 'success');
            withdrawalForm.reset();
        } else {
            showNotification(data.error || 'Talep oluşturulamadı', 'error');
        }
    } catch (error) {
        console.error('Withdrawal error:', error);
        showNotification('Talep oluşturulurken hata oluştu', 'error');
    } finally {
        hideLoading();
    }
}

// UI Update functions
function updateUI() {
    if (!currentUser) return;
    
    // Update user display
    document.getElementById('userDisplayName').textContent = currentUser.username;
    document.getElementById('userNumberDisplay').textContent = `#${currentUser.userNumber}`;
    
    // Update stats
    document.getElementById('userBalance').textContent = `${currentUser.balance} POZI (Kazanılan)`;
    if (currentUser.poziBalance !== undefined) {
        document.getElementById('userBalance').textContent += ` | ${currentUser.poziBalance} POZI (POZI Bakiye)`;
    }
    document.getElementById('totalReceived').textContent = currentUser.totalReceived;
    document.getElementById('totalGiven').textContent = currentUser.totalGiven;
    
    // Update task progress
    const completedTasks = currentUser.tasks ? currentUser.tasks.filter(task => task.completed).length : 0;
    document.getElementById('completedTasks').textContent = `${completedTasks}/25`;
    
    // Update progress bar
    const progressPercentage = (completedTasks / 25) * 100;
    document.getElementById('taskProgress').style.width = `${progressPercentage}%`;
    
    // Show POZI amount status
    if (currentUser.poziAmount > 0) {
        document.getElementById('poziAmountStatus').textContent = `${currentUser.poziAmount} POZI`;
        document.getElementById('poziAmountStatus').style.color = '#28a745';
    } else {
        document.getElementById('poziAmountStatus').textContent = 'Admin tarafından belirlenmemiş';
        document.getElementById('poziAmountStatus').style.color = '#dc3545';
    }
    
    // Show payment status
    if (currentUser.hasPaid) {
        document.getElementById('paymentStatus').textContent = 'Ödendi';
        document.getElementById('paymentStatus').style.color = '#28a745';
    } else if (currentUser.poziAmount > 0) {
        document.getElementById('paymentStatus').textContent = 'Ödenmedi';
        document.getElementById('paymentStatus').style.color = '#ffc107';
    } else {
        document.getElementById('paymentStatus').textContent = 'POZI miktarı belirlenmemiş';
        document.getElementById('paymentStatus').style.color = '#6c757d';
    }
    
    // Render tasks
    renderTasks();
    
    // Load receipt history
    loadReceiptHistory();
}

function renderTasks() {
    if (!currentUser) return;
    
    const tasksContainer = document.getElementById('tasksContainer');
    tasksContainer.innerHTML = '';
    
    if (!currentUser.tasks || currentUser.tasks.length === 0) {
        tasksContainer.innerHTML = '<div class="no-tasks">Admin tarafından POZI miktarı henüz belirlenmemiş.</div>';
        return;
    }
    
    currentUser.tasks.forEach(task => {
        const taskElement = createTaskElement(task);
        tasksContainer.appendChild(taskElement);
    });
}

function createTaskElement(task) {
    const taskDiv = document.createElement('div');
    taskDiv.className = `task-card ${task.completed ? 'completed' : ''}`;
    
    const progressPercentage = Math.min((task.progress / task.target) * 100, 100);
    const reward = calculateReward(10, currentUser.balance);
    
    let paymentInfo = '';
    if (task.requiredPayment > 0) {
        // Show payment requirement without incorrect multiplier calculation
        paymentInfo = `<div class="task-payment">Ödeme Gerekli: ${task.requiredPayment} POZI</div>`;
    }
    
    taskDiv.innerHTML = `
        <div class="task-header">
            <div>
                <div class="task-title">${task.title}</div>
                <div class="task-description">${task.description}</div>
                ${paymentInfo}
            </div>
            <div class="task-reward">+${reward} POZI</div>
        </div>
        <div class="task-progress">
            <div class="progress-info">
                <span>İlerleme: ${task.progress}/${task.target}</span>
                <span>${Math.round(progressPercentage)}%</span>
            </div>
            <div class="task-progress-bar">
                <div class="task-progress-fill" style="width: ${progressPercentage}%"></div>
            </div>
        </div>
    `;
    
    return taskDiv;
}

function calculateReward(baseReward, userBalance) {
    // Sadece bakiye üzerinden hesapla, POZI miktarını katma
    if (userBalance < 100) return baseReward;
    if (userBalance < 500) return baseReward * 1.5;
    if (userBalance < 1000) return baseReward * 2;
    if (userBalance < 5000) return baseReward * 3;
    return baseReward * 5;
}

// Socket.IO setup
function setupSocketListeners() {
    socket = io();
    
    socket.on('connect', () => {
        console.log('Socket.IO bağlantısı kuruldu');
    });
    
    socket.on('userUpdate', (data) => {
        if (currentUser && data.userId === currentUser.id) {
            currentUser = data;
            updateUI();
            
            // Check for new completions
            if (data.newCompletions && data.newCompletions.length > 0) {
                data.newCompletions.forEach(task => {
                    celebrateTaskCompletion(task);
                });
            }
        }
    });
    
    socket.on('disconnect', () => {
        console.log('Socket.IO bağlantısı kesildi');
    });
}

// Utility functions
async function loadBTCWallet() {
    try {
        const response = await fetch('/api/btc-wallet');
        const data = await response.json();
        document.getElementById('btcAddress').textContent = data.address;
    } catch (error) {
        console.error('BTC wallet error:', error);
        document.getElementById('btcAddress').textContent = 'Yüklenemedi';
    }
}

// Receipt upload handler
async function handleReceiptUpload() {
    const amount = document.getElementById('receiptAmount').value;
    const description = document.getElementById('receiptDescription').value;
    const fileInput = document.getElementById('receiptFile');
    
    if (!amount || !description || !fileInput.files[0]) {
        showNotification('Tüm alanları doldurun', 'error');
        return;
    }
    
    try {
        showLoading();
        
        // Use FormData for file upload
        const formData = new FormData();
        formData.append('amount', amount);
        formData.append('description', description);
        formData.append('receiptFile', fileInput.files[0]);
        
        const response = await fetch('/api/upload-receipt', {
            method: 'POST',
            headers: {
                'session-id': sessionId
            },
            body: formData
        });
        
        if (response.ok) {
            showNotification('Dekont başarıyla yüklendi', 'success');
            document.getElementById('receiptForm').reset();
            await loadReceiptHistory();
        } else {
            const error = await response.json();
            showNotification(error.error || 'Dekont yüklenirken hata oluştu', 'error');
        }
        
    } catch (error) {
        console.error('Error uploading receipt:', error);
        showNotification('Dekont yüklenirken hata oluştu', 'error');
    } finally {
        hideLoading();
    }
}

// Load receipt history
async function loadReceiptHistory() {
    try {
        const response = await fetch('/api/receipts', {
            headers: {
                'session-id': sessionId
            }
        });
        
        if (response.ok) {
            const data = await response.json();
            renderReceiptHistory(data.receipts);
        }
    } catch (error) {
        console.error('Error loading receipt history:', error);
    }
}

// Render receipt history
function renderReceiptHistory(receipts) {
    const container = document.getElementById('receiptHistory');
    
    if (!receipts || receipts.length === 0) {
        container.innerHTML = '<div class="no-receipts">Henüz dekont yüklenmemiş</div>';
        return;
    }
    
    container.innerHTML = receipts.map(receipt => `
        <div class="receipt-item ${receipt.status}">
            <div class="receipt-header">
                <span class="receipt-amount">${receipt.amount} POZI</span>
                <span class="receipt-status">${getStatusText(receipt.status)}</span>
            </div>
            <div class="receipt-description">${receipt.description}</div>
            <div class="receipt-date">${new Date(receipt.createdAt).toLocaleString('tr-TR')}</div>
            ${receipt.fileName ? `
                <div class="receipt-file">
                    <button onclick="viewReceiptFile('${receipt.fileName}', '${receipt.originalName}')" class="view-receipt-btn">
                        📄 Dekontu Görüntüle
                    </button>
                </div>
            ` : ''}
            ${receipt.status === 'pending' ? '<div class="receipt-note">Admin onayı bekleniyor</div>' : ''}
        </div>
    `).join('');
}

// Get status text
function getStatusText(status) {
    switch (status) {
        case 'pending': return 'Beklemede';
        case 'approved': return 'Onaylandı';
        case 'rejected': return 'Reddedildi';
        default: return 'Bilinmiyor';
    }
}

// View receipt file
function viewReceiptFile(fileName, originalName) {
    const fileUrl = `/uploads/${fileName}`;
    const fileExtension = fileName.split('.').pop().toLowerCase();
    
    if (['jpg', 'jpeg', 'png', 'gif', 'bmp', 'webp'].includes(fileExtension)) {
        // For images, open in a new window
        const win = window.open('', '_blank', 'width=800,height=600');
        win.document.write(`
            <!DOCTYPE html>
            <html>
            <head>
                <title>Dekont Görüntüle</title>
                <style>
                    body { margin: 0; padding: 20px; background: #f5f5f5; font-family: Arial, sans-serif; }
                    .receipt-container { max-width: 800px; margin: 0 auto; background: white; padding: 20px; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
                    .receipt-title { font-size: 24px; color: #333; margin-bottom: 20px; text-align: center; }
                    .receipt-image { max-width: 100%; height: auto; border: 1px solid #ddd; border-radius: 4px; }
                    .receipt-info { margin-top: 15px; padding: 10px; background: #f9f9f9; border-radius: 4px; }
                    .close-btn { display: inline-block; margin-top: 15px; padding: 10px 20px; background: #007bff; color: white; text-decoration: none; border-radius: 4px; }
                </style>
            </head>
            <body>
                <div class="receipt-container">
                    <div class="receipt-title">Dekont Görüntüle</div>
                    <img src="${fileUrl}" alt="Dekont" class="receipt-image">
                    <div class="receipt-info">
                        <strong>Dosya Adı:</strong> ${originalName}<br>
                        <strong>Dosya Türü:</strong> ${fileExtension.toUpperCase()}
                    </div>
                    <a href="#" onclick="window.close()" class="close-btn">Kapat</a>
                </div>
            </body>
            </html>
        `);
        win.document.close();
    } else if (fileExtension === 'pdf') {
        // For PDFs, open directly
        window.open(fileUrl, '_blank');
    } else {
        // For other files, download
        const link = document.createElement('a');
        link.href = fileUrl;
        link.download = originalName;
        link.click();
    }
}

function copyBTCAddress() {
    const address = document.getElementById('btcAddress').textContent;
    navigator.clipboard.writeText(address).then(() => {
        showNotification('BTC adresi kopyalandı', 'success');
    }).catch(() => {
        showNotification('Kopyalama başarısız', 'error');
    });
}

function celebrateTaskCompletion(task) {
    showNotification(`🎉 "${task.title}" görevi tamamlandı!`, 'success');
    
    // Add celebration animation
    const celebration = document.createElement('div');
    celebration.className = 'celebration';
    celebration.innerHTML = '🎉';
    celebration.style.cssText = `
        position: fixed;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        font-size: 4rem;
        z-index: 1000;
        animation: celebration 2s ease-out forwards;
    `;
    
    document.body.appendChild(celebration);
    
    setTimeout(() => {
        document.body.removeChild(celebration);
    }, 2000);
}

function addButtonClickEffect(button) {
    button.style.transform = 'scale(0.95)';
    setTimeout(() => {
        button.style.transform = '';
    }, 150);
}

function showNotification(message, type = 'info') {
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.textContent = message;
    
    const container = document.getElementById('notificationContainer');
    container.appendChild(notification);
    
    setTimeout(() => {
        notification.style.opacity = '0';
        setTimeout(() => {
            if (container.contains(notification)) {
                container.removeChild(notification);
            }
        }, 300);
    }, 3000);
}

function showLoading() {
    document.getElementById('loadingOverlay').classList.add('show');
}

function hideLoading() {
    document.getElementById('loadingOverlay').classList.remove('show');
}

// Add celebration animation CSS
const style = document.createElement('style');
style.textContent = `
    @keyframes celebration {
        0% {
            transform: translate(-50%, -50%) scale(0);
            opacity: 1;
        }
        50% {
            transform: translate(-50%, -50%) scale(1.5);
            opacity: 1;
        }
        100% {
            transform: translate(-50%, -50%) scale(2);
            opacity: 0;
        }
    }
    
    .no-tasks {
        text-align: center;
        padding: 40px;
        color: #6c757d;
        font-style: italic;
    }
    
    .task-payment {
        font-size: 0.8rem;
        color: #ffc107;
        margin-top: 5px;
        font-weight: bold;
    }
`;
document.head.appendChild(style); 