// Global variables
let adminSessionId = null;
let adminData = null;
let autoRefreshInterval = null;

// DOM elements
const adminLoginSection = document.getElementById('adminLoginSection');
const adminDashboard = document.getElementById('adminDashboard');
const adminLoginForm = document.getElementById('adminLoginForm');
const logoutBtn = document.getElementById('adminLogoutBtn');

// Initialize admin panel
document.addEventListener('DOMContentLoaded', () => {
    // Check for existing admin session
    adminSessionId = localStorage.getItem('adminSessionId');
    if (adminSessionId) {
        showAdminDashboard();
        loadAdminData();
    } else {
        showAdminLogin();
    }
    
    setupAdminEventListeners();
});

// Setup event listeners
function setupAdminEventListeners() {
    // Admin login form
    adminLoginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        await handleAdminLogin();
    });
    
    // Logout button
    logoutBtn.addEventListener('click', handleAdminLogout);
    
    // Navigation buttons
    document.getElementById('overviewBtn').addEventListener('click', () => switchSection('overview'));
    document.getElementById('usersBtn').addEventListener('click', () => switchSection('users'));
    document.getElementById('withdrawalsBtn').addEventListener('click', () => switchSection('withdrawals'));
    document.getElementById('poziAmountBtn').addEventListener('click', () => switchSection('poziAmount'));
    document.getElementById('paymentsBtn').addEventListener('click', () => switchSection('payments'));
    document.getElementById('receiptsBtn').addEventListener('click', () => switchSection('receipts'));
    document.getElementById('settingsBtn').addEventListener('click', () => switchSection('settings'));
    
    // Search functionality
    const userSearchBtn = document.getElementById('userSearchBtn');
    const userSearchInput = document.getElementById('userSearchInput');
    
    if (userSearchBtn) {
        userSearchBtn.addEventListener('click', () => {
            const searchTerm = userSearchInput.value.trim();
            loadUsersData(searchTerm);
        });
    }
    
    if (userSearchInput) {
        userSearchInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                const searchTerm = userSearchInput.value.trim();
                loadUsersData(searchTerm);
            }
        });
    }
    
    // BTC Address Update
    const updateBtcAddressBtn = document.getElementById('updateBtcAddressBtn');
    if (updateBtcAddressBtn) {
        updateBtcAddressBtn.addEventListener('click', handleUpdateBtcAddress);
    }
}

// Show/hide functions
function showAdminLogin() {
    adminLoginSection.style.display = 'flex';
    adminDashboard.style.display = 'none';
}

function showAdminDashboard() {
    adminLoginSection.style.display = 'none';
    adminDashboard.style.display = 'block';
}

// API base path'i otomatik algıla
const API_BASE = window.location.pathname.includes('zirveclub') ? '/zirveclub' : '';

// Admin login handler
async function handleAdminLogin() {
    const username = document.getElementById('adminUsername').value;
    const password = document.getElementById('adminPassword').value;
    
    if (!username || !password) {
        showNotification('Kullanıcı adı ve şifre gerekli', 'error');
        return;
    }
    
    try {
        showLoading();
        
        const response = await fetch(`${API_BASE}/api/admin/login`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ username, password })
        });
        
        const data = await response.json();
        
        if (response.ok) {
            adminSessionId = data.sessionId;
            localStorage.setItem('adminSessionId', adminSessionId);
            adminData = data.admin;
            showAdminDashboard();
            loadAdminData();
            startAutoRefresh();
            showNotification('Admin paneline başarıyla giriş yapıldı', 'success');
        } else {
            showNotification(data.error || 'Giriş başarısız', 'error');
        }
    } catch (error) {
        console.error('Admin login error:', error);
        showNotification('Giriş yapılırken hata oluştu', 'error');
    } finally {
        hideLoading();
    }
}

// Admin logout handler
function handleAdminLogout() {
    stopAutoRefresh();
    localStorage.removeItem('adminSessionId');
    adminSessionId = null;
    adminData = null;
    showAdminLogin();
    adminLoginForm.reset();
    showNotification('Çıkış yapıldı', 'info');
}

// Auto refresh functions
function startAutoRefresh() {
    // Stop existing interval if any
    stopAutoRefresh();
    
    // Start new interval - refresh every 30 seconds
    autoRefreshInterval = setInterval(() => {
        if (adminSessionId) {
            loadAdminData();
        }
    }, 30000); // 30 seconds
}

function stopAutoRefresh() {
    if (autoRefreshInterval) {
        clearInterval(autoRefreshInterval);
        autoRefreshInterval = null;
    }
}

// Switch between sections
function switchSection(sectionName) {
    // Hide all sections
    document.querySelectorAll('.admin-section').forEach(section => {
        section.style.display = 'none';
    });
    
    // Show selected section
    document.getElementById(sectionName + 'Section').style.display = 'block';
    
    // Update active button
    document.querySelectorAll('.nav-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    document.getElementById(sectionName + 'Btn').classList.add('active');
    
    // Load section data
    switch (sectionName) {
        case 'overview':
            loadOverviewData();
            break;
        case 'users':
            loadUsersData();
            break;
        case 'withdrawals':
            loadWithdrawalsData();
            break;
        case 'poziAmount':
            loadPoziAmountData();
            break;
        case 'payments':
            loadPaymentsData();
            break;
        case 'receipts':
            loadReceiptsData();
            break;
        case 'settings':
            loadSettingsData();
            break;
    }
}

// Load admin data
async function loadAdminData() {
    await loadOverviewData();
    switchSection('overview');
}

// Load overview data
async function loadOverviewData() {
    try {
        const [usersResponse, withdrawalsResponse] = await Promise.all([
            fetch(`${API_BASE}/api/admin/users`, {
                headers: { 'session-id': adminSessionId }
            }),
            fetch(`${API_BASE}/api/admin/withdrawals`, {
                headers: { 'session-id': adminSessionId }
            })
        ]);
        
        const usersData = await usersResponse.json();
        const withdrawalsData = await withdrawalsResponse.json();
        
        if (usersData.success && withdrawalsData.success) {
            updateOverviewStats(usersData.users, withdrawalsData.withdrawals);
        }
    } catch (error) {
        console.error('Error loading overview data:', error);
        showNotification('Veriler yüklenirken hata oluştu', 'error');
    }
}

// Load users data
async function loadUsersData(searchTerm = '') {
    try {
        let url = `${API_BASE}/api/admin/users`;
        if (searchTerm) {
            url += `?search=${encodeURIComponent(searchTerm)}`;
        }
        
        const response = await fetch(url, {
            headers: { 'session-id': adminSessionId }
        });
        
        const data = await response.json();
        
        if (data.success) {
            renderUsersTable(data.users);
        }
    } catch (error) {
        console.error('Error loading users data:', error);
        showNotification('Kullanıcı verileri yüklenirken hata oluştu', 'error');
    }
}

// Load withdrawals data
async function loadWithdrawalsData() {
    try {
        const response = await fetch(`${API_BASE}/api/admin/withdrawals`, {
            headers: { 'session-id': adminSessionId }
        });
        
        const data = await response.json();
        
        if (data.success) {
            renderWithdrawalsTable(data.withdrawals);
        }
    } catch (error) {
        console.error('Error loading withdrawals data:', error);
        showNotification('Para çekme verileri yüklenirken hata oluştu', 'error');
    }
}

// Load POZI amount data
async function loadPoziAmountData() {
    try {
        const response = await fetch(`${API_BASE}/api/admin/users`, {
            headers: { 'session-id': adminSessionId }
        });
        
        const data = await response.json();
        
        if (data.success) {
            renderPoziAmountTable(data.users);
        }
    } catch (error) {
        console.error('Error loading POZI amount data:', error);
        showNotification('POZI miktarı verileri yüklenirken hata oluştu', 'error');
    }
}

// Load payments data
async function loadPaymentsData() {
    try {
        const response = await fetch(`${API_BASE}/api/admin/users`, {
            headers: { 'session-id': adminSessionId }
        });
        
        const data = await response.json();
        
        if (data.success) {
            renderPaymentsTable(data.users);
        }
    } catch (error) {
        console.error('Error loading payments data:', error);
        showNotification('Ödeme verileri yüklenirken hata oluştu', 'error');
    }
}

// Load receipts data
async function loadReceiptsData() {
    try {
        const response = await fetch(`${API_BASE}/api/admin/receipts`, {
            headers: { 'session-id': adminSessionId }
        });
        
        const data = await response.json();
        
        if (data.success) {
            renderReceiptsTable(data.receipts);
        }
    } catch (error) {
        console.error('Error loading receipts data:', error);
        showNotification('Dekont verileri yüklenirken hata oluştu', 'error');
    }
}

async function loadSettingsData() {
    try {
        const response = await fetch(`${API_BASE}/api/btc-wallet`);
        const data = await response.json();
        
        if (data.address) {
            document.getElementById('currentBtcAddress').textContent = data.address;
            document.getElementById('btcAddressInput').value = data.address;
        }
    } catch (error) {
        console.error('Error loading BTC address:', error);
        showNotification('BTC adresi yüklenirken hata oluştu', 'error');
    }
}

async function handleUpdateBtcAddress() {
    const newAddress = document.getElementById('btcAddressInput').value.trim();
    
    if (!newAddress) {
        showNotification('BTC adresi gerekli', 'error');
        return;
    }
    
    try {
        showLoading();
        
        const response = await fetch(`${API_BASE}/api/admin/update-btc-address`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'session-id': adminSessionId
            },
            body: JSON.stringify({ address: newAddress })
        });
        
        const data = await response.json();
        
        if (response.ok) {
            showNotification('BTC adresi başarıyla güncellendi', 'success');
            document.getElementById('currentBtcAddress').textContent = newAddress;
        } else {
            showNotification(data.error || 'BTC adresi güncellenirken hata oluştu', 'error');
        }
    } catch (error) {
        console.error('Error updating BTC address:', error);
        showNotification('BTC adresi güncellenirken hata oluştu', 'error');
    } finally {
        hideLoading();
    }
}

// Update overview statistics
function updateOverviewStats(users, withdrawals) {
    const totalUsers = users.length;
    const totalBalance = users.reduce((sum, user) => sum + user.balance, 0);
    const pendingWithdrawals = withdrawals.filter(w => w.status === 'pending').length;
    const usersWithPoziAmount = users.filter(u => u.poziAmount > 0).length;
    const paidUsers = users.filter(u => u.hasPaid).length;
    
    document.getElementById('totalUsers').textContent = totalUsers;
    document.getElementById('totalBalance').textContent = `${totalBalance} POZI`;
    document.getElementById('pendingWithdrawals').textContent = pendingWithdrawals;
    document.getElementById('usersWithPozi').textContent = usersWithPoziAmount;
    document.getElementById('paidUsers').textContent = paidUsers;
}

// Render users table
function renderUsersTable(users) {
    const tbody = document.querySelector('#usersTable tbody');
    tbody.innerHTML = '';
    
    users.forEach(user => {
        const completedTasks = user.tasks && user.tasks.length > 0 ? user.tasks.filter(t => t.completed).length : 0;
        const totalTasks = user.tasks && user.tasks.length > 0 ? user.tasks.length : 0;
        
        const row = document.createElement('tr');
        row.innerHTML = `
            <td><strong>${user.userNumber}</strong></td>
            <td>${user.username}</td>
            <td>${user.balance} POZI</td>
            <td>${user.totalReceived}</td>
            <td>${user.totalGiven}</td>
            <td>${user.poziAmount > 0 ? user.poziAmount + ' POZI' : 'Belirlenmemiş'}</td>
            <td>${user.hasPaid ? 'Evet' : 'Hayır'}</td>
            <td>${completedTasks}/${totalTasks}</td>
            <td>
                <button onclick="addBalanceToUser('${user.id}', '${user.username}')" class="btn btn-primary btn-sm">Bakiye Ekle</button>
                <button onclick="setPoziAmountFromUsers('${user.id}', '${user.username}')" class="btn btn-success btn-sm">POZI Ayarla</button>
            </td>
        `;
        tbody.appendChild(row);
    });
}

// Render withdrawals table
function renderWithdrawalsTable(withdrawals) {
    const tbody = document.querySelector('#withdrawalsTable tbody');
    tbody.innerHTML = '';
    
    withdrawals.forEach(withdrawal => {
        const row = document.createElement('tr');
        const statusClass = withdrawal.status === 'pending' ? 'warning' : 
                          withdrawal.status === 'approved' ? 'success' : 'danger';
        const statusText = withdrawal.status === 'pending' ? 'Bekliyor' :
                          withdrawal.status === 'approved' ? 'Onaylandı' : 'Reddedildi';
        
        row.innerHTML = `
            <td>${withdrawal.username}</td>
            <td>${withdrawal.amount} POZI</td>
            <td>${withdrawal.walletAddress}</td>
            <td><span class="badge badge-${statusClass}">${statusText}</span></td>
            <td>${new Date(withdrawal.createdAt).toLocaleDateString('tr-TR')}</td>
            <td>
                ${withdrawal.status === 'pending' ? `
                    <button onclick="handleWithdrawalAction('${withdrawal.id}', 'approve')" class="btn btn-success btn-sm">Onayla</button>
                    <button onclick="handleWithdrawalAction('${withdrawal.id}', 'reject')" class="btn btn-danger btn-sm">Reddet</button>
                ` : '-'}
            </td>
        `;
        tbody.appendChild(row);
    });
}

// Render POZI amount table
function renderPoziAmountTable(users) {
    const tbody = document.querySelector('#poziAmountTable tbody');
    tbody.innerHTML = '';
    
    users.forEach(user => {
        const completedTasks = user.tasks && user.tasks.length > 0 ? user.tasks.filter(t => t.completed).length : 0;
        const totalTasks = user.tasks && user.tasks.length > 0 ? user.tasks.length : 0;
        
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${user.username}</td>
            <td>${user.poziAmount > 0 ? user.poziAmount + ' POZI' : 'Belirlenmemiş'}</td>
            <td>${completedTasks}/${totalTasks}</td>
            <td>
                <input type="number" id="poziAmount_${user.id}" value="${user.poziAmount}" min="1" class="form-control" style="width: 100px;">
                <button onclick="setPoziAmount('${user.id}', '${user.username}')" class="btn btn-primary btn-sm">Ayarla</button>
            </td>
        `;
        tbody.appendChild(row);
    });
}

// Render payments table
function renderPaymentsTable(users) {
    const tbody = document.querySelector('#paymentsTable tbody');
    tbody.innerHTML = '';
    
    users.forEach(user => {
        if (user.poziAmount > 0) {
            const row = document.createElement('tr');
            const paymentStatus = user.hasPaid ? 'Ödendi' : 'Ödenmedi';
            const paymentClass = user.hasPaid ? 'success' : 'warning';
            
            // Calculate required payment based on payment count
            const paymentCount = user.paymentCount || 0;
            const multiplier = (paymentCount + 1) * 2; // 2, 4, 6, 8, 10, 12, 14, 16
            const requiredPayment = user.poziAmount * multiplier;
            
            row.innerHTML = `
                <td>${user.username}</td>
                <td>${user.poziAmount} POZI</td>
                <td>${requiredPayment} POZI (${multiplier}x)</td>
                <td><span class="badge badge-${paymentClass}">${paymentStatus}</span></td>
                <td>
                    ${!user.hasPaid ? `
                        <button onclick="markUserAsPaid('${user.id}', '${user.username}')" class="btn btn-success btn-sm">Ödendi İşaretle</button>
                    ` : '-'}
                </td>
            `;
            tbody.appendChild(row);
        }
    });
}

// Render receipts table
function renderReceiptsTable(receipts) {
    const tbody = document.querySelector('#receiptsTable tbody');
    tbody.innerHTML = '';
    
    receipts.forEach(receipt => {
        const row = document.createElement('tr');
        const statusClass = receipt.status === 'pending' ? 'warning' : 
                          receipt.status === 'approved' ? 'success' : 'danger';
        const statusText = receipt.status === 'pending' ? 'Bekliyor' :
                          receipt.status === 'approved' ? 'Onaylandı' : 'Reddedildi';
        
        row.innerHTML = `
            <td>${receipt.username}</td>
            <td>${receipt.amount} POZI</td>
            <td>${receipt.description}</td>
            <td><span class="badge badge-${statusClass}">${statusText}</span></td>
            <td>${new Date(receipt.createdAt).toLocaleDateString('tr-TR')}</td>
            <td>
                <button onclick="viewReceipt(${JSON.stringify(receipt).replace(/"/g, '&quot;')})" class="btn btn-primary btn-sm">Görüntüle</button>
            </td>
            <td>
                ${receipt.status === 'pending' ? `
                    <button onclick="handleReceiptAction('${receipt.id}', 'approve')" class="btn btn-success btn-sm">Onayla</button>
                    <button onclick="handleReceiptAction('${receipt.id}', 'reject')" class="btn btn-danger btn-sm">Reddet</button>
                ` : '-'}
            </td>
        `;
        tbody.appendChild(row);
    });
}

// Handle receipt actions
async function handleReceiptAction(receiptId, action) {
    try {
        showLoading();
        
        const response = await fetch(`${API_BASE}/api/admin/receipt/${receiptId}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'session-id': adminSessionId
            },
            body: JSON.stringify({ action })
        });
        
        const data = await response.json();
        
        if (response.ok) {
            showNotification(data.message, 'success');
            loadReceiptsData();
        } else {
            showNotification(data.error || 'İşlem başarısız', 'error');
        }
    } catch (error) {
        console.error('Receipt action error:', error);
        showNotification('İşlem yapılırken hata oluştu', 'error');
    } finally {
        hideLoading();
    }
}

// View receipt
function viewReceipt(receipt) {
    const win = window.open('', '_blank', 'width=800,height=900');
    
    // HTML template with proper styling
    const htmlContent = `
        <!DOCTYPE html>
        <html>
        <head>
            <title>Dekont Detayı</title>
            <style>
                body { 
                    font-family: Arial, sans-serif; 
                    margin: 20px; 
                    background: #f5f5f5;
                }
                .container { 
                    background: white; 
                    padding: 30px; 
                    border-radius: 10px; 
                    box-shadow: 0 2px 10px rgba(0,0,0,0.1);
                }
                h2 { color: #333; margin-bottom: 20px; }
                .receipt-image { 
                    max-width: 100%; 
                    height: auto; 
                    border: 1px solid #ddd; 
                    border-radius: 5px;
                    margin: 10px 0;
                }
                .receipt-pdf-link { 
                    display: inline-block; 
                    padding: 10px 20px; 
                    background: #007bff; 
                    color: white; 
                    text-decoration: none; 
                    border-radius: 5px;
                    margin: 10px 0;
                }
                .receipt-pdf-link:hover { background: #0056b3; }
                .close-btn { 
                    padding: 10px 20px; 
                    background: #dc3545; 
                    color: white; 
                    border: none; 
                    border-radius: 5px; 
                    cursor: pointer;
                    margin-top: 20px;
                }
                .close-btn:hover { background: #c82333; }
                .error-message { color: #dc3545; font-weight: bold; }
                .receipt-info {
                    background: #f8f9fa;
                    padding: 15px;
                    border-radius: 5px;
                    margin: 15px 0;
                }
            </style>
        </head>
        <body>
            <div class="container">
                <h2>Dekont Detayı</h2>
                <div class="receipt-info">
                    <p><strong>Kullanıcı:</strong> ${receipt.username || 'Bilinmiyor'}</p>
                    <p><strong>Miktar:</strong> ${receipt.amount || 0} POZI</p>
                    <p><strong>Açıklama:</strong> ${receipt.description || 'Açıklama yok'}</p>
                    <p><strong>Durum:</strong> ${receipt.status || 'Bilinmiyor'}</p>
                    <p><strong>Tarih:</strong> ${new Date(receipt.createdAt).toLocaleString('tr-TR')}</p>
                </div>
    `;
    
    let content = '';
    if (receipt && receipt.fileName) {
        const fileUrl = `/uploads/${receipt.fileName}`;
        const fileExtension = receipt.fileName.split('.').pop().toLowerCase();
        
        if (['jpg', 'jpeg', 'png', 'gif', 'bmp', 'webp'].includes(fileExtension)) {
            content = `<img src="${fileUrl}" alt="Dekont" class="receipt-image">`;
        } else if (fileExtension === 'pdf') {
            content = `<a href="${fileUrl}" target="_blank" class="receipt-pdf-link">📄 PDF Dekontu Görüntüle</a>`;
        } else {
            content = `<a href="${fileUrl}" target="_blank" class="receipt-pdf-link">📄 Dosyayı Görüntüle</a>`;
        }
    } else {
        content = `<p class="error-message">❌ Dekont dosyası bulunamadı</p>`;
    }
    
    const closingHtml = `
                ${content}
                <button class="close-btn" onclick="window.close()">Kapat</button>
            </div>
        </body>
        </html>
    `;
    
    win.document.write(htmlContent + closingHtml);
    win.document.close();
}

// Handle withdrawal actions
async function handleWithdrawalAction(requestId, action) {
    try {
        showLoading();
        
        const response = await fetch(`${API_BASE}/api/admin/withdrawal/${requestId}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'session-id': adminSessionId
            },
            body: JSON.stringify({ action })
        });
        
        const data = await response.json();
        
        if (response.ok) {
            showNotification(data.message, 'success');
            loadWithdrawalsData();
        } else {
            showNotification(data.error || 'İşlem başarısız', 'error');
        }
    } catch (error) {
        console.error('Withdrawal action error:', error);
        showNotification('İşlem yapılırken hata oluştu', 'error');
    } finally {
        hideLoading();
    }
}

// Add balance to user
async function addBalanceToUser(userId, username) {
    const amount = prompt(`${username} kullanıcısına eklenecek POZI miktarını girin:`);
    
    if (!amount || isNaN(amount) || parseFloat(amount) <= 0) {
        showNotification('Geçerli bir miktar girin', 'error');
        return;
    }
    
    try {
        showLoading();
        
        const response = await fetch(`${API_BASE}/api/admin/add-balance`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'session-id': adminSessionId
            },
            body: JSON.stringify({ userId, amount: parseFloat(amount) })
        });
        
        const data = await response.json();
        
        if (response.ok) {
            showNotification(data.message, 'success');
            loadUsersData();
            loadOverviewData();
        } else {
            showNotification(data.error || 'Bakiye eklenemedi', 'error');
        }
    } catch (error) {
        console.error('Add balance error:', error);
        showNotification('Bakiye eklenirken hata oluştu', 'error');
    } finally {
        hideLoading();
    }
}

// Set POZI amount for user
async function setPoziAmount(userId, username) {
    const poziAmount = document.getElementById(`poziAmount_${userId}`).value;
    
    if (!poziAmount || isNaN(poziAmount) || parseFloat(poziAmount) <= 0) {
        showNotification('Geçerli bir POZI miktarı girin', 'error');
        return;
    }
    
    try {
        showLoading();
        
        const response = await fetch(`${API_BASE}/api/admin/set-pozi-amount`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'session-id': adminSessionId
            },
            body: JSON.stringify({ userId, poziAmount: parseFloat(poziAmount) })
        });
        
        const data = await response.json();
        
        if (response.ok) {
            showNotification(data.message, 'success');
            // Reload all data to reflect changes
            loadPoziAmountData();
            loadPaymentsData();
            loadOverviewData();
            loadUsersData();
        } else {
            showNotification(data.error || 'POZI miktarı ayarlanamadı', 'error');
        }
    } catch (error) {
        console.error('Set POZI amount error:', error);
        showNotification('POZI miktarı ayarlanırken hata oluştu', 'error');
    } finally {
        hideLoading();
    }
}

// Set POZI amount from users table
async function setPoziAmountFromUsers(userId, username) {
    const poziAmount = prompt(`${username} kullanıcısı için POZI miktarını girin:`);
    
    if (!poziAmount || isNaN(poziAmount) || parseFloat(poziAmount) <= 0) {
        showNotification('Geçerli bir POZI miktarı girin', 'error');
        return;
    }
    
    try {
        showLoading();
        
        const response = await fetch(`${API_BASE}/api/admin/set-pozi-amount`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'session-id': adminSessionId
            },
            body: JSON.stringify({ userId, poziAmount: parseFloat(poziAmount) })
        });
        
        const data = await response.json();
        
        if (response.ok) {
            showNotification(data.message, 'success');
            // Reload all data to reflect changes
            loadUsersData();
            loadPoziAmountData();
            loadPaymentsData();
            loadOverviewData();
        } else {
            showNotification(data.error || 'POZI miktarı ayarlanamadı', 'error');
        }
    } catch (error) {
        console.error('Set POZI amount error:', error);
        showNotification('POZI miktarı ayarlanırken hata oluştu', 'error');
    } finally {
        hideLoading();
    }
}

// Mark user as paid
async function markUserAsPaid(userId, username) {
    if (!confirm(`${username} kullanıcısını ödeme yapmış olarak işaretlemek istediğinizden emin misiniz?`)) {
        return;
    }
    
    try {
        showLoading();
        
        const response = await fetch(`${API_BASE}/api/admin/mark-paid`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'session-id': adminSessionId
            },
            body: JSON.stringify({ userId })
        });
        
        const data = await response.json();
        
        if (response.ok) {
            showNotification(data.message, 'success');
            loadPaymentsData();
            loadOverviewData();
        } else {
            showNotification(data.error || 'İşlem başarısız', 'error');
        }
    } catch (error) {
        console.error('Mark paid error:', error);
        showNotification('İşlem yapılırken hata oluştu', 'error');
    } finally {
        hideLoading();
    }
}

// Utility functions
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

// Make functions global for onclick handlers
window.handleWithdrawalAction = handleWithdrawalAction;
window.addBalanceToUser = addBalanceToUser;
window.setPoziAmount = setPoziAmount;
window.setPoziAmountFromUsers = setPoziAmountFromUsers;
window.markUserAsPaid = markUserAsPaid; 