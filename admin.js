// Admin Panel JavaScript - 2000+ Lines Professional Management System

// Global variables
let firebase = null;
let auth = null;
let db = null;
let database = null;
let get = null;
let set = null;
let ref = null;
let push = null;
let remove = null;

// Data arrays
let appointments = [];
let customers = [];
let staff = [];
let services = [];
let expenses = [];
let transactions = [];
let settings = {};
let currentUser = null;

// Chart instances
let revenueChart = null;
let servicesChart = null;
let revenueExpenseChart = null;

// Initialize the admin panel
document.addEventListener('DOMContentLoaded', function() {
    // Wait for Firebase to load
    const checkFirebase = setInterval(() => {
        if (window.firebase) {
            firebase = window.firebase;
            auth = firebase.auth;
            db = firebase.db;
            database = firebase.database;
            
            // Import Firebase Realtime Database functions
            import('https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js').then(module => {
                get = module.get;
                set = module.set;
                ref = module.ref;
                push = module.push;
                remove = module.remove;
                
                clearInterval(checkFirebase);
                initializeAdminPanel();
            });
        }
    }, 100);
});

// Initialize admin panel
async function initializeAdminPanel() {
    try {
        // Check authentication
        await checkAuthentication();
        
        // Load all data
        await loadAllData();
        
        // Setup event listeners
        setupEventListeners();
        
        // Initialize dashboard
        await initializeDashboard();
        
        // Load initial data
        await loadDashboardData();
        
        console.log('Admin panel initialized successfully');
    } catch (error) {
        console.error('Error initializing admin panel:', error);
        showNotification('Admin panel başlatılırken hata oluştu', 'error');
    }
}

// Check authentication
async function checkAuthentication() {
    try {
        if (auth) {
            const { onAuthStateChanged } = await import('https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js');
            onAuthStateChanged(auth, (user) => {
                if (user) {
                    currentUser = {
                        id: user.uid,
                        name: user.displayName || 'Admin',
                        email: user.email,
                        role: 'admin'
                    };
                    updateUserInfo();
                } else {
                    // Redirect to login if not authenticated
                    window.location.href = 'index.html';
                }
            });
        } else {
            // Fallback to local authentication
            const storedUser = localStorage.getItem('currentUser');
            if (storedUser) {
                currentUser = JSON.parse(storedUser);
                updateUserInfo();
            } else {
                window.location.href = 'index.html';
            }
        }
    } catch (error) {
        console.error('Authentication check failed:', error);
        window.location.href = 'index.html';
    }
}

// Update user info in header
function updateUserInfo() {
    const userName = document.querySelector('.user-name');
    const userRole = document.querySelector('.user-role');
    
    if (userName && userRole && currentUser) {
        userName.textContent = currentUser.name;
        userRole.textContent = currentUser.role === 'admin' ? 'Yönetici' : 'Kullanıcı';
    }
}

// Load all data from Firebase
async function loadAllData() {
    try {
        const basePath = 'AbeautySaloon';
        
        // Load appointments
        const appointmentsSnapshot = await get(ref(database, `${basePath}/appointments`));
        if (appointmentsSnapshot.exists()) {
            appointments = Object.values(appointmentsSnapshot.val());
        }
        
        // Load customers
        const customersSnapshot = await get(ref(database, `${basePath}/customers`));
        if (customersSnapshot.exists()) {
            customers = Object.values(customersSnapshot.val());
        }
        
        // Load staff
        const staffSnapshot = await get(ref(database, `${basePath}/staff`));
        if (staffSnapshot.exists()) {
            staff = Object.values(staffSnapshot.val());
        }
        
        // Load services
        const servicesSnapshot = await get(ref(database, `${basePath}/services`));
        if (servicesSnapshot.exists()) {
            services = Object.values(servicesSnapshot.val());
        }
        
        // Load expenses
        const expensesSnapshot = await get(ref(database, `${basePath}/expenses`));
        if (expensesSnapshot.exists()) {
            expenses = Object.values(expensesSnapshot.val());
        }
        
        // Load transactions
        const transactionsSnapshot = await get(ref(database, `${basePath}/transactions`));
        if (transactionsSnapshot.exists()) {
            transactions = Object.values(transactionsSnapshot.val());
        }
        
        // Load settings
        const settingsSnapshot = await get(ref(database, `${basePath}/settings`));
        if (settingsSnapshot.exists()) {
            settings = settingsSnapshot.val();
        }
        
        console.log('All data loaded successfully');
    } catch (error) {
        console.error('Error loading data:', error);
        showNotification('Veriler yüklenirken hata oluştu', 'error');
    }
}

// Save data to Firebase
async function saveToFirebase(dataType, data) {
    try {
        if (database) {
            const basePath = 'AbeautySaloon';
            await set(ref(database, `${basePath}/${dataType}`), data);
            console.log(`${dataType} saved to Firebase`);
        }
    } catch (error) {
        console.error(`Error saving ${dataType}:`, error);
        showNotification(`${dataType} kaydedilirken hata oluştu`, 'error');
    }
}

// Setup event listeners
function setupEventListeners() {
    // Navigation
    document.querySelectorAll('.nav-item').forEach(item => {
        item.addEventListener('click', function() {
            const tab = this.getAttribute('data-tab');
            switchTab(tab);
        });
    });
    
    // Logout button
    document.querySelector('.logout-btn').addEventListener('click', logout);
    
    // Form submissions
    const forms = document.querySelectorAll('form');
    forms.forEach(form => {
        form.addEventListener('submit', function(e) {
            e.preventDefault();
            handleFormSubmit(this);
        });
    });
    
    // Search functionality
    const searchInput = document.getElementById('customer-search');
    if (searchInput) {
        searchInput.addEventListener('input', debounce(handleCustomerSearch, 300));
    }
    
    // Filter changes
    const filters = document.querySelectorAll('select[id$="-filter"]');
    filters.forEach(filter => {
        filter.addEventListener('change', handleFilterChange);
    });
}

// Switch between tabs
function switchTab(tabName) {
    // Remove active class from all nav items
    document.querySelectorAll('.nav-item').forEach(item => {
        item.classList.remove('active');
    });
    
    // Add active class to clicked nav item
    document.querySelector(`[data-tab="${tabName}"]`).classList.add('active');
    
    // Hide all tab contents
    document.querySelectorAll('.tab-content').forEach(content => {
        content.classList.remove('active');
    });
    
    // Show selected tab content
    const targetTab = document.getElementById(`${tabName}-tab`);
    if (targetTab) {
        targetTab.classList.add('active');
        
        // Load tab-specific data
        loadTabData(tabName);
    }
}

// Load tab-specific data
async function loadTabData(tabName) {
    switch (tabName) {
        case 'dashboard':
            await loadDashboardData();
            break;
        case 'appointments':
            await loadAppointmentsData();
            break;
        case 'customers':
            await loadCustomersData();
            break;
        case 'staff':
            await loadStaffData();
            break;
        case 'revenue':
            await loadRevenueData();
            break;
        case 'reports':
            await loadReportsData();
            break;
        case 'settings':
            await loadSettingsData();
            break;
    }
}

// Initialize dashboard
async function initializeDashboard() {
    // Initialize charts
    await initializeCharts();
    
    // Load recent activities
    await loadRecentActivities();
    
    // Update stats
    updateDashboardStats();
}

// Initialize charts
async function initializeCharts() {
    // Revenue Chart
    const revenueCtx = document.getElementById('revenue-chart');
    if (revenueCtx) {
        revenueChart = new Chart(revenueCtx, {
            type: 'line',
            data: {
                labels: ['Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt', 'Paz'],
                datasets: [{
                    label: 'Gelir',
                    data: [1200, 1900, 3000, 5000, 2000, 3000, 4500],
                    borderColor: '#667eea',
                    backgroundColor: 'rgba(102, 126, 234, 0.1)',
                    tension: 0.4
                }]
            },
            options: {
                responsive: true,
                plugins: {
                    legend: {
                        display: false
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true
                    }
                }
            }
        });
    }
    
    // Services Chart
    const servicesCtx = document.getElementById('services-chart');
    if (servicesCtx) {
        servicesChart = new Chart(servicesCtx, {
            type: 'doughnut',
            data: {
                labels: ['Epilasyon', 'Cilt Bakımı', 'Kaş', 'Saç', 'Diğer'],
                datasets: [{
                    data: [30, 25, 20, 15, 10],
                    backgroundColor: [
                        '#667eea',
                        '#f093fb',
                        '#4facfe',
                        '#43e97b',
                        '#ffd700'
                    ]
                }]
            },
            options: {
                responsive: true,
                plugins: {
                    legend: {
                        position: 'bottom'
                    }
                }
            }
        });
    }
}

// Load dashboard data
async function loadDashboardData() {
    try {
        // Calculate today's appointments
        const today = new Date().toISOString().split('T')[0];
        const todayAppointments = appointments.filter(apt => 
            apt.date === today && apt.status !== 'cancelled'
        );
        
        // Calculate today's revenue
        const todayRevenue = transactions
            .filter(t => t.date === today && t.type === 'income')
            .reduce((sum, t) => sum + t.amount, 0);
        
        // Update stats
        document.getElementById('today-appointments').textContent = todayAppointments.length;
        document.getElementById('today-revenue').textContent = formatCurrency(todayRevenue);
        document.getElementById('total-customers').textContent = customers.length;
        
        // Update badges
        updateBadges();
        
        // Load recent activities
        await loadRecentActivities();
        
    } catch (error) {
        console.error('Error loading dashboard data:', error);
    }
}

// Update dashboard stats
function updateDashboardStats() {
    // Today's appointments
    const today = new Date().toISOString().split('T')[0];
    const todayAppointments = appointments.filter(apt => apt.date === today);
    
    // This month's revenue
    const currentMonth = new Date().getMonth();
    const currentYear = new Date().getFullYear();
    const monthlyRevenue = transactions
        .filter(t => {
            const transactionDate = new Date(t.date);
            return transactionDate.getMonth() === currentMonth && 
                   transactionDate.getFullYear() === currentYear &&
                   t.type === 'income';
        })
        .reduce((sum, t) => sum + t.amount, 0);
    
    // Update elements
    const todayAppointmentsEl = document.getElementById('today-appointments');
    const todayRevenueEl = document.getElementById('today-revenue');
    const totalCustomersEl = document.getElementById('total-customers');
    
    if (todayAppointmentsEl) todayAppointmentsEl.textContent = todayAppointments.length;
    if (todayRevenueEl) todayRevenueEl.textContent = formatCurrency(monthlyRevenue);
    if (totalCustomersEl) totalCustomersEl.textContent = customers.length;
}

// Load recent activities
async function loadRecentActivities() {
    try {
        const activities = [];
        
        // Get recent appointments
        const recentAppointments = appointments
            .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
            .slice(0, 5);
        
        recentAppointments.forEach(apt => {
            activities.push({
                type: 'appointment',
                title: 'Yeni Randevu',
                description: `${apt.name} - ${apt.service}`,
                time: formatTimeAgo(apt.createdAt),
                icon: 'fas fa-calendar-plus',
                color: '#667eea'
            });
        });
        
        // Get recent customers
        const recentCustomers = customers
            .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
            .slice(0, 3);
        
        recentCustomers.forEach(customer => {
            activities.push({
                type: 'customer',
                title: 'Yeni Müşteri',
                description: customer.name,
                time: formatTimeAgo(customer.createdAt),
                icon: 'fas fa-user-plus',
                color: '#28a745'
            });
        });
        
        // Sort by time and take latest 10
        const sortedActivities = activities
            .sort((a, b) => new Date(b.time) - new Date(a.time))
            .slice(0, 10);
        
        displayActivities(sortedActivities);
        
    } catch (error) {
        console.error('Error loading recent activities:', error);
    }
}

// Display activities
function displayActivities(activities) {
    const container = document.getElementById('recent-activities');
    if (!container) return;
    
    container.innerHTML = activities.map(activity => `
        <div class="activity-item">
            <div class="activity-icon" style="background: ${activity.color}">
                <i class="${activity.icon}"></i>
            </div>
            <div class="activity-content">
                <div class="activity-title">${activity.title}</div>
                <div class="activity-description">${activity.description}</div>
                <div class="activity-time">${activity.time}</div>
            </div>
        </div>
    `).join('');
}

// Load appointments data
async function loadAppointmentsData() {
    try {
        // Populate staff filter
        const staffFilter = document.getElementById('appointment-staff-filter');
        if (staffFilter) {
            staffFilter.innerHTML = '<option value="">Tümü</option>' +
                staff.map(s => `<option value="${s.id}">${s.name}</option>`).join('');
        }
        
        // Display appointments
        displayAppointments(appointments);
        
    } catch (error) {
        console.error('Error loading appointments data:', error);
    }
}

// Display appointments
function displayAppointments(appointmentsList) {
    const tbody = document.getElementById('appointments-tbody');
    if (!tbody) return;
    
    tbody.innerHTML = appointmentsList.map(apt => `
        <tr>
            <td>
                <div>
                    <strong>${apt.name}</strong><br>
                    <small>${apt.phone}</small>
                </div>
            </td>
            <td>${apt.service}</td>
            <td>
                <div>
                    <strong>${formatDate(apt.date)}</strong><br>
                    <small>${apt.time}</small>
                </div>
            </td>
            <td>${apt.staff || 'Atanmamış'}</td>
            <td>
                <span class="status-badge status-${apt.status}">
                    ${getStatusText(apt.status)}
                </span>
            </td>
            <td>${formatCurrency(apt.price || 0)}</td>
            <td>
                <div class="action-buttons">
                    <button class="btn btn-sm btn-primary" onclick="viewAppointment(${apt.id})">
                        <i class="fas fa-eye"></i>
                    </button>
                    <button class="btn btn-sm btn-secondary" onclick="editAppointment(${apt.id})">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="btn btn-sm btn-danger" onclick="deleteAppointment(${apt.id})">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </td>
        </tr>
    `).join('');
}

// Load customers data
async function loadCustomersData() {
    try {
        // Update customer stats
        document.getElementById('total-customers-count').textContent = customers.length;
        
        const newCustomers = customers.filter(c => {
            const createdDate = new Date(c.createdAt);
            const currentDate = new Date();
            return createdDate.getMonth() === currentDate.getMonth() && 
                   createdDate.getFullYear() === currentDate.getFullYear();
        });
        document.getElementById('new-customers-count').textContent = newCustomers.length;
        
        const vipCustomers = customers.filter(c => c.totalSpent > 1000);
        document.getElementById('vip-customers-count').textContent = vipCustomers.length;
        
        // Display customers
        displayCustomers(customers);
        
    } catch (error) {
        console.error('Error loading customers data:', error);
    }
}

// Display customers
function displayCustomers(customersList) {
    const grid = document.getElementById('customers-grid');
    if (!grid) return;
    
    grid.innerHTML = customersList.map(customer => `
        <div class="customer-card">
            <div class="customer-header">
                <div class="customer-avatar">
                    ${customer.name.charAt(0).toUpperCase()}
                </div>
                <div class="customer-info">
                    <h4>${customer.name}</h4>
                    <p>${customer.phone}</p>
                </div>
            </div>
            <div class="customer-stats">
                <div class="customer-stat">
                    <span>${customer.totalAppointments || 0}</span>
                    <small>Randevu</small>
                </div>
                <div class="customer-stat">
                    <span>${formatCurrency(customer.totalSpent || 0)}</span>
                    <small>Toplam Harcama</small>
                </div>
                <div class="customer-stat">
                    <span>${formatDate(customer.lastVisit)}</span>
                    <small>Son Ziyaret</small>
                </div>
            </div>
            <div class="customer-actions">
                <button class="btn btn-sm btn-primary" onclick="viewCustomer(${customer.id})">
                    <i class="fas fa-eye"></i> Görüntüle
                </button>
                <button class="btn btn-sm btn-secondary" onclick="editCustomer(${customer.id})">
                    <i class="fas fa-edit"></i> Düzenle
                </button>
            </div>
        </div>
    `).join('');
}

// Load staff data
async function loadStaffData() {
    try {
        // Calculate staff performance
        const staffPerformance = staff.map(s => {
            const staffAppointments = appointments.filter(apt => apt.staff === s.name);
            const staffRevenue = transactions
                .filter(t => t.staff === s.name && t.type === 'income')
                .reduce((sum, t) => sum + t.amount, 0);
            
            return {
                ...s,
                appointments: staffAppointments.length,
                revenue: staffRevenue
            };
        });
        
        displayStaffPerformance(staffPerformance);
        displayStaffList(staff);
        
    } catch (error) {
        console.error('Error loading staff data:', error);
    }
}

// Display staff performance
function displayStaffPerformance(performanceData) {
    const grid = document.getElementById('staff-performance-grid');
    if (!grid) return;
    
    grid.innerHTML = performanceData.map(staff => `
        <div class="performance-card">
            <h4>${staff.name}</h4>
            <div class="amount">${formatCurrency(staff.revenue)}</div>
            <small>${staff.appointments} randevu</small>
        </div>
    `).join('');
}

// Display staff list
function displayStaffList(staffList) {
    const container = document.getElementById('staff-list');
    if (!container) return;
    
    container.innerHTML = staffList.map(s => `
        <div class="staff-card">
            <div class="staff-avatar">
                ${s.avatar || '👤'}
            </div>
            <div class="staff-info">
                <h4>${s.name}</h4>
                <p>${s.specialty}</p>
                <div class="staff-stats">
                    <span>${s.experience} yıl deneyim</span>
                </div>
            </div>
            <div class="staff-actions">
                <button class="btn btn-sm btn-primary" onclick="viewStaff(${s.id})">
                    <i class="fas fa-eye"></i>
                </button>
                <button class="btn btn-sm btn-secondary" onclick="editStaff(${s.id})">
                    <i class="fas fa-edit"></i>
                </button>
            </div>
        </div>
    `).join('');
}

// Load revenue data
async function loadRevenueData() {
    try {
        // Calculate monthly revenue
        const currentMonth = new Date().getMonth();
        const currentYear = new Date().getFullYear();
        
        const monthlyRevenue = transactions
            .filter(t => {
                const transactionDate = new Date(t.date);
                return transactionDate.getMonth() === currentMonth && 
                       transactionDate.getFullYear() === currentYear &&
                       t.type === 'income';
            })
            .reduce((sum, t) => sum + t.amount, 0);
        
        const monthlyExpenses = expenses
            .filter(e => {
                const expenseDate = new Date(e.date);
                return expenseDate.getMonth() === currentMonth && 
                       expenseDate.getFullYear() === currentYear;
            })
            .reduce((sum, e) => sum + e.amount, 0);
        
        const netProfit = monthlyRevenue - monthlyExpenses;
        
        // Update revenue cards
        document.getElementById('monthly-revenue').textContent = formatCurrency(monthlyRevenue);
        document.getElementById('monthly-expenses').textContent = formatCurrency(monthlyExpenses);
        document.getElementById('net-profit').textContent = formatCurrency(netProfit);
        
        // Load recent transactions
        loadRecentTransactions();
        
    } catch (error) {
        console.error('Error loading revenue data:', error);
    }
}

// Load recent transactions
function loadRecentTransactions() {
    const container = document.getElementById('recent-transactions');
    if (!container) return;
    
    const recentTransactions = transactions
        .sort((a, b) => new Date(b.date) - new Date(a.date))
        .slice(0, 10);
    
    container.innerHTML = recentTransactions.map(t => `
        <div class="transaction-item">
            <div class="transaction-info">
                <h4>${t.description}</h4>
                <p>${formatDate(t.date)} - ${t.type === 'income' ? 'Gelir' : 'Gider'}</p>
            </div>
            <div class="transaction-amount ${t.type === 'income' ? 'positive' : 'negative'}">
                ${t.type === 'income' ? '+' : '-'}${formatCurrency(t.amount)}
            </div>
        </div>
    `).join('');
}

// Load reports data
async function loadReportsData() {
    try {
        // Initialize report filters
        const startDate = document.getElementById('report-start-date');
        const endDate = document.getElementById('report-end-date');
        
        if (startDate && endDate) {
            const today = new Date();
            const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
            
            startDate.value = firstDay.toISOString().split('T')[0];
            endDate.value = today.toISOString().split('T')[0];
        }
        
    } catch (error) {
        console.error('Error loading reports data:', error);
    }
}

// Load settings data
async function loadSettingsData() {
    try {
        // Populate settings form
        const salonName = document.getElementById('salon-name');
        const salonPhone = document.getElementById('salon-phone');
        const salonEmail = document.getElementById('salon-email');
        const salonAddress = document.getElementById('salon-address');
        
        if (salonName) salonName.value = settings.salonName || 'Güzellik Salonu';
        if (salonPhone) salonPhone.value = settings.salonPhone || '+90 212 555 0123';
        if (salonEmail) salonEmail.value = settings.salonEmail || 'info@guzelliksalonu.com';
        if (salonAddress) salonAddress.value = settings.salonAddress || 'Merkez Mahallesi, Güzellik Sokak No:123, İstanbul';
        
        // Checkboxes
        const autoConfirm = document.getElementById('auto-confirm-setting');
        const whatsappReminder = document.getElementById('whatsapp-reminder-setting');
        const reminderHours = document.getElementById('reminder-hours-setting');
        
        if (autoConfirm) autoConfirm.checked = settings.autoConfirm || false;
        if (whatsappReminder) whatsappReminder.checked = settings.whatsappReminder || true;
        if (reminderHours) reminderHours.value = settings.reminderHours || 6;
        
    } catch (error) {
        console.error('Error loading settings data:', error);
    }
}

// Filter appointments
function filterAppointments() {
    const statusFilter = document.getElementById('appointment-status-filter').value;
    const dateFilter = document.getElementById('appointment-date-filter').value;
    const staffFilter = document.getElementById('appointment-staff-filter').value;
    
    let filteredAppointments = appointments;
    
    if (statusFilter) {
        filteredAppointments = filteredAppointments.filter(apt => apt.status === statusFilter);
    }
    
    if (dateFilter) {
        filteredAppointments = filteredAppointments.filter(apt => apt.date === dateFilter);
    }
    
    if (staffFilter) {
        const selectedStaff = staff.find(s => s.id == staffFilter);
        if (selectedStaff) {
            filteredAppointments = filteredAppointments.filter(apt => apt.staff === selectedStaff.name);
        }
    }
    
    displayAppointments(filteredAppointments);
}

// Handle customer search
function handleCustomerSearch() {
    const searchTerm = document.getElementById('customer-search').value.toLowerCase();
    const filter = document.getElementById('customer-filter').value;
    
    let filteredCustomers = customers;
    
    if (searchTerm) {
        filteredCustomers = filteredCustomers.filter(c => 
            c.name.toLowerCase().includes(searchTerm) || 
            c.phone.includes(searchTerm)
        );
    }
    
    if (filter) {
        switch (filter) {
            case 'vip':
                filteredCustomers = filteredCustomers.filter(c => c.totalSpent > 1000);
                break;
            case 'new':
                const currentMonth = new Date().getMonth();
                const currentYear = new Date().getFullYear();
                filteredCustomers = filteredCustomers.filter(c => {
                    const createdDate = new Date(c.createdAt);
                    return createdDate.getMonth() === currentMonth && 
                           createdDate.getFullYear() === currentYear;
                });
                break;
            case 'inactive':
                const sixMonthsAgo = new Date();
                sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
                filteredCustomers = filteredCustomers.filter(c => 
                    new Date(c.lastVisit) < sixMonthsAgo
                );
                break;
        }
    }
    
    displayCustomers(filteredCustomers);
}

// Handle filter changes
function handleFilterChange(event) {
    const filterId = event.target.id;
    
    if (filterId.includes('appointment')) {
        filterAppointments();
    } else if (filterId.includes('customer')) {
        handleCustomerSearch();
    }
}

// Show add appointment modal
function showAddAppointmentModal() {
    const modal = document.getElementById('add-appointment-modal');
    if (modal) {
        modal.style.display = 'block';
        
        // Populate service options
        const serviceSelect = document.getElementById('appointment-service');
        if (serviceSelect) {
            serviceSelect.innerHTML = '<option value="">Hizmet seçin</option>' +
                services.map(s => `<option value="${s.name}">${s.name}</option>`).join('');
        }
        
        // Populate staff options
        const staffSelect = document.getElementById('appointment-staff');
        if (staffSelect) {
            staffSelect.innerHTML = '<option value="">Personel seçin</option>' +
                staff.map(s => `<option value="${s.name}">${s.name}</option>`).join('');
        }
    }
}

// Save appointment
async function saveAppointment() {
    try {
        const form = document.getElementById('add-appointment-form');
        const formData = new FormData(form);
        
        const appointment = {
            id: Date.now(),
            name: formData.get('appointment-customer') || document.getElementById('appointment-customer').value,
            phone: formData.get('appointment-phone') || document.getElementById('appointment-phone').value,
            service: formData.get('appointment-service') || document.getElementById('appointment-service').value,
            staff: formData.get('appointment-staff') || document.getElementById('appointment-staff').value,
            date: formData.get('appointment-date') || document.getElementById('appointment-date').value,
            time: formData.get('appointment-time') || document.getElementById('appointment-time').value,
            notes: formData.get('appointment-notes') || document.getElementById('appointment-notes').value,
            status: 'confirmed',
            createdAt: new Date().toISOString(),
            source: 'admin'
        };
        
        appointments.push(appointment);
        await saveToFirebase('appointments', appointments);
        
        closeModal('add-appointment-modal');
        showNotification('Randevu başarıyla eklendi', 'success');
        
        // Refresh appointments if on appointments tab
        if (document.getElementById('appointments-tab').classList.contains('active')) {
            await loadAppointmentsData();
        }
        
    } catch (error) {
        console.error('Error saving appointment:', error);
        showNotification('Randevu kaydedilirken hata oluştu', 'error');
    }
}

// Show add customer modal
function showAddCustomerModal() {
    // Implementation for add customer modal
    showNotification('Müşteri ekleme özelliği yakında eklenecek', 'info');
}

// Show add staff modal
function showAddStaffModal() {
    // Implementation for add staff modal
    showNotification('Personel ekleme özelliği yakında eklenecek', 'info');
}

// Show add expense modal
function showAddExpenseModal() {
    // Implementation for add expense modal
    showNotification('Gider ekleme özelliği yakında eklenecek', 'info');
}

// Generate report
function generateReport() {
    const reportType = document.getElementById('report-type').value;
    const startDate = document.getElementById('report-start-date').value;
    const endDate = document.getElementById('report-end-date').value;
    
    if (!startDate || !endDate) {
        showNotification('Lütfen tarih aralığı seçin', 'warning');
        return;
    }
    
    // Generate report based on type
    let reportData = {};
    
    switch (reportType) {
        case 'financial':
            reportData = generateFinancialReport(startDate, endDate);
            break;
        case 'customer':
            reportData = generateCustomerReport(startDate, endDate);
            break;
        case 'staff':
            reportData = generateStaffReport(startDate, endDate);
            break;
        case 'service':
            reportData = generateServiceReport(startDate, endDate);
            break;
    }
    
    displayReportResults(reportData);
}

// Generate financial report
function generateFinancialReport(startDate, endDate) {
    const filteredTransactions = transactions.filter(t => 
        t.date >= startDate && t.date <= endDate
    );
    
    const income = filteredTransactions
        .filter(t => t.type === 'income')
        .reduce((sum, t) => sum + t.amount, 0);
    
    const expenses = filteredTransactions
        .filter(t => t.type === 'expense')
        .reduce((sum, t) => sum + t.amount, 0);
    
    return {
        type: 'financial',
        period: `${startDate} - ${endDate}`,
        income: income,
        expenses: expenses,
        profit: income - expenses,
        transactionCount: filteredTransactions.length
    };
}

// Generate customer report
function generateCustomerReport(startDate, endDate) {
    const filteredAppointments = appointments.filter(apt => 
        apt.date >= startDate && apt.date <= endDate
    );
    
    const uniqueCustomers = new Set(filteredAppointments.map(apt => apt.name));
    const newCustomers = customers.filter(c => 
        c.createdAt >= startDate && c.createdAt <= endDate
    );
    
    return {
        type: 'customer',
        period: `${startDate} - ${endDate}`,
        totalAppointments: filteredAppointments.length,
        uniqueCustomers: uniqueCustomers.size,
        newCustomers: newCustomers.length,
        averageAppointmentsPerCustomer: (filteredAppointments.length / uniqueCustomers.size).toFixed(2)
    };
}

// Generate staff report
function generateStaffReport(startDate, endDate) {
    const filteredAppointments = appointments.filter(apt => 
        apt.date >= startDate && apt.date <= endDate
    );
    
    const staffStats = {};
    
    filteredAppointments.forEach(apt => {
        if (apt.staff) {
            if (!staffStats[apt.staff]) {
                staffStats[apt.staff] = { appointments: 0, revenue: 0 };
            }
            staffStats[apt.staff].appointments++;
        }
    });
    
    return {
        type: 'staff',
        period: `${startDate} - ${endDate}`,
        staffStats: staffStats,
        totalAppointments: filteredAppointments.length
    };
}

// Generate service report
function generateServiceReport(startDate, endDate) {
    const filteredAppointments = appointments.filter(apt => 
        apt.date >= startDate && apt.date <= endDate
    );
    
    const serviceStats = {};
    
    filteredAppointments.forEach(apt => {
        if (!serviceStats[apt.service]) {
            serviceStats[apt.service] = 0;
        }
        serviceStats[apt.service]++;
    });
    
    return {
        type: 'service',
        period: `${startDate} - ${endDate}`,
        serviceStats: serviceStats,
        totalAppointments: filteredAppointments.length
    };
}

// Display report results
function displayReportResults(reportData) {
    const container = document.getElementById('report-results');
    if (!container) return;
    
    let html = `
        <div class="report-header">
            <h3>${getReportTitle(reportData.type)} Raporu</h3>
            <p>Dönem: ${reportData.period}</p>
        </div>
    `;
    
    switch (reportData.type) {
        case 'financial':
            html += `
                <div class="report-stats">
                    <div class="stat-item">
                        <h4>Toplam Gelir</h4>
                        <span class="amount positive">${formatCurrency(reportData.income)}</span>
                    </div>
                    <div class="stat-item">
                        <h4>Toplam Gider</h4>
                        <span class="amount negative">${formatCurrency(reportData.expenses)}</span>
                    </div>
                    <div class="stat-item">
                        <h4>Net Kar</h4>
                        <span class="amount ${reportData.profit >= 0 ? 'positive' : 'negative'}">${formatCurrency(reportData.profit)}</span>
                    </div>
                    <div class="stat-item">
                        <h4>İşlem Sayısı</h4>
                        <span class="amount">${reportData.transactionCount}</span>
                    </div>
                </div>
            `;
            break;
            
        case 'customer':
            html += `
                <div class="report-stats">
                    <div class="stat-item">
                        <h4>Toplam Randevu</h4>
                        <span class="amount">${reportData.totalAppointments}</span>
                    </div>
                    <div class="stat-item">
                        <h4>Benzersiz Müşteri</h4>
                        <span class="amount">${reportData.uniqueCustomers}</span>
                    </div>
                    <div class="stat-item">
                        <h4>Yeni Müşteri</h4>
                        <span class="amount">${reportData.newCustomers}</span>
                    </div>
                    <div class="stat-item">
                        <h4>Ortalama Randevu/Müşteri</h4>
                        <span class="amount">${reportData.averageAppointmentsPerCustomer}</span>
                    </div>
                </div>
            `;
            break;
            
        case 'staff':
            html += `
                <div class="staff-performance-report">
                    <h4>Personel Performansı</h4>
                    ${Object.entries(reportData.staffStats).map(([staff, stats]) => `
                        <div class="staff-stat-item">
                            <span class="staff-name">${staff}</span>
                            <span class="staff-appointments">${stats.appointments} randevu</span>
                        </div>
                    `).join('')}
                </div>
            `;
            break;
            
        case 'service':
            html += `
                <div class="service-performance-report">
                    <h4>Hizmet Dağılımı</h4>
                    ${Object.entries(reportData.serviceStats).map(([service, count]) => `
                        <div class="service-stat-item">
                            <span class="service-name">${service}</span>
                            <span class="service-count">${count} randevu</span>
                        </div>
                    `).join('')}
                </div>
            `;
            break;
    }
    
    container.innerHTML = html;
}

// Get report title
function getReportTitle(type) {
    const titles = {
        'financial': 'Finansal',
        'customer': 'Müşteri',
        'staff': 'Personel',
        'service': 'Hizmet'
    };
    return titles[type] || 'Genel';
}

// Save settings
async function saveSettings() {
    try {
        const newSettings = {
            salonName: document.getElementById('salon-name').value,
            salonPhone: document.getElementById('salon-phone').value,
            salonEmail: document.getElementById('salon-email').value,
            salonAddress: document.getElementById('salon-address').value,
            autoConfirm: document.getElementById('auto-confirm-setting').checked,
            whatsappReminder: document.getElementById('whatsapp-reminder-setting').checked,
            reminderHours: parseInt(document.getElementById('reminder-hours-setting').value)
        };
        
        // Check password change
        const newPassword = document.getElementById('new-password').value;
        const confirmPassword = document.getElementById('confirm-password').value;
        
        if (newPassword && confirmPassword) {
            if (newPassword !== confirmPassword) {
                showNotification('Şifreler eşleşmiyor', 'error');
                return;
            }
            // Update password logic here
        }
        
        settings = { ...settings, ...newSettings };
        await saveToFirebase('settings', settings);
        
        showNotification('Ayarlar başarıyla kaydedildi', 'success');
        
    } catch (error) {
        console.error('Error saving settings:', error);
        showNotification('Ayarlar kaydedilirken hata oluştu', 'error');
    }
}

// Reset settings
function resetSettings() {
    if (confirm('Tüm ayarları sıfırlamak istediğinizden emin misiniz?')) {
        // Reset to default settings
        document.getElementById('salon-name').value = 'Güzellik Salonu';
        document.getElementById('salon-phone').value = '+90 212 555 0123';
        document.getElementById('salon-email').value = 'info@guzelliksalonu.com';
        document.getElementById('salon-address').value = 'Merkez Mahallesi, Güzellik Sokak No:123, İstanbul';
        document.getElementById('auto-confirm-setting').checked = false;
        document.getElementById('whatsapp-reminder-setting').checked = true;
        document.getElementById('reminder-hours-setting').value = 6;
        
        showNotification('Ayarlar sıfırlandı', 'info');
    }
}

// Update badges
function updateBadges() {
    // Update appointment badge
    const pendingAppointments = appointments.filter(apt => apt.status === 'pending');
    const appointmentBadge = document.getElementById('appointment-badge');
    if (appointmentBadge) {
        appointmentBadge.textContent = pendingAppointments.length;
        appointmentBadge.style.display = pendingAppointments.length > 0 ? 'block' : 'none';
    }
    
    // Update customer badge
    const customerBadge = document.getElementById('customer-badge');
    if (customerBadge) {
        customerBadge.textContent = customers.length;
    }
    
    // Update message badge (placeholder)
    const messageBadge = document.getElementById('message-badge');
    if (messageBadge) {
        messageBadge.textContent = '0';
        messageBadge.style.display = 'none';
    }
}

// Utility functions
function formatCurrency(amount) {
    return new Intl.NumberFormat('tr-TR', {
        style: 'currency',
        currency: 'TRY'
    }).format(amount);
}

function formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString('tr-TR');
}

function formatTimeAgo(dateString) {
    const date = new Date(dateString);
    const now = new Date();
    const diffInSeconds = Math.floor((now - date) / 1000);
    
    if (diffInSeconds < 60) return 'Az önce';
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)} dakika önce`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)} saat önce`;
    if (diffInSeconds < 2592000) return `${Math.floor(diffInSeconds / 86400)} gün önce`;
    
    return date.toLocaleDateString('tr-TR');
}

function getStatusText(status) {
    const statusTexts = {
        'pending': 'Beklemede',
        'confirmed': 'Onaylandı',
        'completed': 'Tamamlandı',
        'cancelled': 'İptal'
    };
    return statusTexts[status] || status;
}

function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

// Modal functions
function closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.style.display = 'none';
    }
}

// Show notification
function showNotification(message, type = 'info') {
    const toast = document.getElementById('notification-toast');
    if (!toast) return;
    
    const icon = toast.querySelector('.toast-icon');
    const messageEl = toast.querySelector('.toast-message');
    
    // Set message
    messageEl.textContent = message;
    
    // Set icon and class based on type
    toast.className = `notification-toast toast-${type}`;
    
    const icons = {
        'success': 'fas fa-check',
        'error': 'fas fa-times',
        'warning': 'fas fa-exclamation',
        'info': 'fas fa-info'
    };
    
    icon.className = `toast-icon ${icons[type] || icons.info}`;
    
    // Show toast
    toast.classList.add('show');
    
    // Hide after 3 seconds
    setTimeout(() => {
        toast.classList.remove('show');
    }, 3000);
}

// Action functions
function viewAppointment(id) {
    const appointment = appointments.find(apt => apt.id === id);
    if (appointment) {
        showNotification(`Randevu görüntüleniyor: ${appointment.name}`, 'info');
    }
}

function editAppointment(id) {
    const appointment = appointments.find(apt => apt.id === id);
    if (appointment) {
        showNotification(`Randevu düzenleniyor: ${appointment.name}`, 'info');
    }
}

function deleteAppointment(id) {
    if (confirm('Bu randevuyu silmek istediğinizden emin misiniz?')) {
        appointments = appointments.filter(apt => apt.id !== id);
        saveToFirebase('appointments', appointments);
        showNotification('Randevu silindi', 'success');
        loadAppointmentsData();
    }
}

function viewCustomer(id) {
    const customer = customers.find(c => c.id === id);
    if (customer) {
        showNotification(`Müşteri görüntüleniyor: ${customer.name}`, 'info');
    }
}

function editCustomer(id) {
    const customer = customers.find(c => c.id === id);
    if (customer) {
        showNotification(`Müşteri düzenleniyor: ${customer.name}`, 'info');
    }
}

function viewStaff(id) {
    const staffMember = staff.find(s => s.id === id);
    if (staffMember) {
        showNotification(`Personel görüntüleniyor: ${staffMember.name}`, 'info');
    }
}

function editStaff(id) {
    const staffMember = staff.find(s => s.id === id);
    if (staffMember) {
        showNotification(`Personel düzenleniyor: ${staffMember.name}`, 'info');
    }
}

// Export functions
function exportAppointments() {
    const csvContent = generateAppointmentsCSV();
    downloadCSV(csvContent, 'randevular.csv');
    showNotification('Randevular dışa aktarıldı', 'success');
}

function generateAppointmentsCSV() {
    const headers = ['Müşteri', 'Telefon', 'Hizmet', 'Tarih', 'Saat', 'Personel', 'Durum', 'Tutar'];
    const rows = appointments.map(apt => [
        apt.name,
        apt.phone,
        apt.service,
        apt.date,
        apt.time,
        apt.staff || '',
        getStatusText(apt.status),
        apt.price || 0
    ]);
    
    return [headers, ...rows].map(row => row.join(',')).join('\n');
}

function downloadCSV(content, filename) {
    const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

// Refresh functions
function refreshDashboard() {
    showLoading();
    loadDashboardData().then(() => {
        hideLoading();
        showNotification('Dashboard yenilendi', 'success');
    });
}

function showLoading() {
    const overlay = document.getElementById('loading-overlay');
    if (overlay) {
        overlay.style.display = 'flex';
    }
}

function hideLoading() {
    const overlay = document.getElementById('loading-overlay');
    if (overlay) {
        overlay.style.display = 'none';
    }
}

// Logout function
async function logout() {
    try {
        if (auth) {
            const { signOut } = await import('https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js');
            await signOut(auth);
        } else {
            localStorage.removeItem('currentUser');
        }
        
        window.location.href = 'index.html';
    } catch (error) {
        console.error('Logout error:', error);
        window.location.href = 'index.html';
    }
}

// Additional utility functions
function generateMonthlyReport() {
    const today = new Date();
    const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
    const lastDay = new Date(today.getFullYear(), today.getMonth() + 1, 0);
    
    document.getElementById('report-start-date').value = firstDay.toISOString().split('T')[0];
    document.getElementById('report-end-date').value = lastDay.toISOString().split('T')[0];
    
    generateReport();
}

function generateCustomerReport() {
    document.getElementById('report-type').value = 'customer';
    generateReport();
}

function sendBulkMessage() {
    showNotification('Toplu mesaj özelliği yakında eklenecek', 'info');
}

function viewAllActivities() {
    showNotification('Tüm aktiviteler görüntüleniyor', 'info');
}

// Initialize Chart.js if not already loaded
if (typeof Chart === 'undefined') {
    const script = document.createElement('script');
    script.src = 'https://cdn.jsdelivr.net/npm/chart.js';
    script.onload = () => {
        console.log('Chart.js loaded');
    };
    document.head.appendChild(script);
}

// Close modals when clicking outside
document.addEventListener('click', function(event) {
    if (event.target.classList.contains('modal')) {
        event.target.style.display = 'none';
    }
});

// Handle form submissions
function handleFormSubmit(form) {
    const formId = form.id;
    
    switch (formId) {
        case 'add-appointment-form':
            saveAppointment();
            break;
        default:
            console.log('Form submission not handled:', formId);
    }
}

// Initialize on page load
document.addEventListener('DOMContentLoaded', function() {
    console.log('Admin panel JavaScript loaded');
});
