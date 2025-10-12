// Global variables
let appointments = [];
let users = [];
let currentUser = null;
let customers = [];
let services = [];
let staff = [];
let settings = {
    autoConfirm: false,
    whatsappReminder: true,
    reminderHours: 6,
    autoSendReminders: false
};
let expenses = [];
let transactions = [];

// Firebase imports
let firebase = null;
let auth = null;
let db = null;
let database = null;

// Firebase functions (will be imported when Firebase loads)
let get = null;
let set = null;
let ref = null;
let push = null;
let remove = null;

// Service categories and subcategories
const serviceCategories = {
    'epilasyon': {
        name: 'Epilasyon',
        icon: 'fas fa-cut',
        subcategories: [
            { value: 'tum-vucut', name: 'Tüm Vücut', duration: 60, price: 300 },
            { value: 'kol', name: 'Kol', duration: 30, price: 150 },
            { value: 'bacak', name: 'Bacak', duration: 45, price: 200 },
            { value: 'kas', name: 'Kaş', duration: 15, price: 50 },
            { value: 'bikini', name: 'Bikini', duration: 30, price: 100 }
        ]
    },
    'zayiflama': {
        name: 'Zayıflama',
        icon: 'fas fa-weight',
        subcategories: [
            { value: 'kavitasyon', name: 'Kavitasyon', duration: 60, price: 400 },
            { value: 'lpg', name: 'LPG', duration: 45, price: 250 },
            { value: 'mezoterapi', name: 'Mezoterapi', duration: 30, price: 300 }
        ]
    },
    'cilt-bakimi': {
        name: 'Cilt Bakımı',
        icon: 'fas fa-leaf',
        subcategories: [
            { value: 'temizlik', name: 'Cilt Temizliği', duration: 60, price: 300 },
            { value: 'peeling', name: 'Peeling', duration: 45, price: 200 },
            { value: 'maske', name: 'Maske', duration: 30, price: 150 }
        ]
    },
    'sac-bakimi': {
        name: 'Saç Bakımı',
        icon: 'fas fa-cut',
        subcategories: [
            { value: 'kesim', name: 'Saç Kesimi', duration: 30, price: 150 },
            { value: 'boyama', name: 'Saç Boyama', duration: 120, price: 400 },
            { value: 'bakim', name: 'Saç Bakımı', duration: 45, price: 200 }
        ]
    },
    'makyaj': {
        name: 'Makyaj',
        icon: 'fas fa-palette',
        subcategories: [
            { value: 'gunluk', name: 'Günlük Makyaj', duration: 30, price: 100 },
            { value: 'ozel', name: 'Özel Gün Makyajı', duration: 60, price: 250 },
            { value: 'gelin', name: 'Gelin Makyajı', duration: 90, price: 500 }
        ]
    }
};

// Staff data
const defaultStaff = [
    { id: 1, name: 'Ayşe Yılmaz', specialty: 'Epilasyon', avatar: '👩‍⚕️' },
    { id: 2, name: 'Fatma Demir', specialty: 'Cilt Bakımı', avatar: '👩‍⚕️' },
    { id: 3, name: 'Zeynep Kaya', specialty: 'Saç Bakımı', avatar: '👩‍⚕️' },
    { id: 4, name: 'Elif Özkan', specialty: 'Makyaj', avatar: '👩‍⚕️' }
];

// Initialize staff if empty
if (staff.length === 0) {
    staff = defaultStaff;
    localStorage.setItem('staff', JSON.stringify(staff));
}

// Initialize admin user
const adminUser = {
    id: 1,
    name: 'Admin',
    email: 'admin@gmail.com',
    password: '123456789',
    role: 'admin',
    createdAt: new Date().toISOString()
};

// Initialize admin user in Firebase
async function initializeAdminUser() {
    try {
        if (database) {
            const basePath = 'AbeautySaloon';
            // Check if admin user exists
            const usersSnapshot = await get(ref(database, `${basePath}/users`));
            if (!usersSnapshot.exists()) {
                // Create admin user in Firebase
                await set(ref(database, `${basePath}/users`), [adminUser]);
                users = [adminUser];
            } else {
                users = Object.values(usersSnapshot.val());
            }
        } else {
            // Fallback to localStorage
            users = [adminUser];
            localStorage.setItem('users', JSON.stringify(users));
        }
        
        // Also try to create Firebase Auth user
        await createFirebaseAdminUser();
    } catch (error) {
        console.error('Error initializing admin user:', error);
        users = [adminUser];
        localStorage.setItem('users', JSON.stringify(users));
    }
}

// Create Firebase Authentication admin user
async function createFirebaseAdminUser() {
    try {
        if (auth) {
            const { createUserWithEmailAndPassword, updateProfile } = await import('https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js');
            
            // Check if admin user already exists
            const { signInWithEmailAndPassword } = await import('https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js');
            try {
                await signInWithEmailAndPassword(auth, 'admin@gmail.com', '123456789');
                console.log('Admin user already exists in Firebase Auth');
            } catch (error) {
                // User doesn't exist, create it
                const userCredential = await createUserWithEmailAndPassword(auth, 'admin@gmail.com', '123456789');
                await updateProfile(userCredential.user, {
                    displayName: 'Admin'
                });
                console.log('Admin user created in Firebase Auth');
            }
        }
    } catch (error) {
        console.log('Firebase Auth admin user creation failed:', error);
    }
}

// Initialize the app
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
                initializeAdminUser();
                initializeApp();
                setupEventListeners();
                loadDataFromFirebase();
                setupScrollEffects();
                requestNotificationPermission();
                
                // Check for reminders every 5 minutes
                setInterval(checkReminders, 5 * 60 * 1000);
            });
        }
    }, 100);
});

// Firebase data management functions
async function loadDataFromFirebase() {
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
        } else {
            // Initialize default staff
            await set(ref(database, `${basePath}/staff`), defaultStaff);
            staff = defaultStaff;
        }
        
        // Load settings
        const settingsSnapshot = await get(ref(database, `${basePath}/settings`));
        if (settingsSnapshot.exists()) {
            settings = settingsSnapshot.val();
        } else {
            await set(ref(database, `${basePath}/settings`), settings);
        }
        
        // Load expenses
        const expensesSnapshot = await get(ref(database, `${basePath}/expenses`));
        if (expensesSnapshot.exists()) {
            expenses = Object.values(expensesSnapshot.val());
        }
        
        // Load users
        const usersSnapshot = await get(ref(database, `${basePath}/users`));
        if (usersSnapshot.exists()) {
            users = Object.values(usersSnapshot.val());
        } else {
            // Initialize admin user
            await set(ref(database, `${basePath}/users`), [adminUser]);
            users = [adminUser];
        }
        
        console.log('Firebase data loaded successfully from AbeautySaloon');
    } catch (error) {
        console.error('Error loading data from Firebase:', error);
        // Fallback to localStorage
        loadFromLocalStorage();
    }
}

function loadFromLocalStorage() {
    appointments = JSON.parse(localStorage.getItem('appointments')) || [];
    users = JSON.parse(localStorage.getItem('users')) || [adminUser];
    currentUser = JSON.parse(localStorage.getItem('currentUser')) || null;
    customers = JSON.parse(localStorage.getItem('customers')) || [];
    services = JSON.parse(localStorage.getItem('services')) || [];
    staff = JSON.parse(localStorage.getItem('staff')) || defaultStaff;
    settings = JSON.parse(localStorage.getItem('settings')) || settings;
    expenses = JSON.parse(localStorage.getItem('expenses')) || [];
    transactions = JSON.parse(localStorage.getItem('transactions')) || [];
}

// Save data to Firebase
async function saveToFirebase(dataType, data) {
    try {
        if (database) {
            const basePath = 'AbeautySaloon';
            await set(ref(database, `${basePath}/${dataType}`), data);
            console.log(`${dataType} saved to Firebase under AbeautySaloon`);
        }
    } catch (error) {
        console.error(`Error saving ${dataType} to Firebase:`, error);
        // Fallback to localStorage
        localStorage.setItem(dataType, JSON.stringify(data));
    }
}

// Initialize app
function initializeApp() {
    // Set minimum date to today
    const today = new Date().toISOString().split('T')[0];
    document.getElementById('date').setAttribute('min', today);
    
    // Check if user is logged in
    if (currentUser) {
        updateNavForLoggedInUser();
    }
}

// Setup event listeners
function setupEventListeners() {
    // Appointment form
    document.getElementById('appointmentForm').addEventListener('submit', handleAppointmentSubmit);
    
    // Phone appointment form
    document.getElementById('phoneAppointmentForm').addEventListener('submit', handlePhoneAppointmentSubmit);
    
    // Login form
    document.getElementById('loginForm').addEventListener('submit', handleLogin);
    
    // Register form
    document.getElementById('registerForm').addEventListener('submit', handleRegister);
    
    // Service category cards
    document.querySelectorAll('.service-category-card').forEach(card => {
        card.addEventListener('click', handleServiceCategoryCardClick);
    });
    
    // Phone service category cards
    document.querySelectorAll('#phone-service-category-cards .service-category-card').forEach(card => {
        card.addEventListener('click', handlePhoneServiceCategoryCardClick);
    });
    
    // Customer name input for suggestions
    document.getElementById('name').addEventListener('input', handleCustomerNameInput);
    document.getElementById('phoneName').addEventListener('input', handlePhoneCustomerNameInput);
    
    // Date change for time slots
    document.getElementById('date').addEventListener('change', handleDateChange);
    document.getElementById('phoneDate').addEventListener('change', handlePhoneDateChange);
    
    // Smooth scrolling for navigation links
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function (e) {
            e.preventDefault();
            const target = document.querySelector(this.getAttribute('href'));
            if (target) {
                target.scrollIntoView({
                    behavior: 'smooth',
                    block: 'start'
                });
            }
        });
    });
    
    // Animation on scroll
    window.addEventListener('scroll', handleScrollAnimation);
}

// Handle appointment form submission
function handleAppointmentSubmit(e) {
    e.preventDefault();
    
    const formData = new FormData(e.target);
    const serviceCategory = formData.get('service-category');
    const serviceSubcategory = formData.get('service-subcategory');
    const selectedStaff = formData.get('staff');
    const autoConfirm = formData.get('auto-confirm') === 'on';
    
    // Get service details
    const serviceDetails = serviceCategories[serviceCategory]?.subcategories.find(sub => sub.value === serviceSubcategory);
    
    const appointment = {
        id: Date.now(),
        name: formData.get('name'),
        phone: formData.get('phone'),
        serviceCategory: serviceCategory,
        serviceSubcategory: serviceSubcategory,
        serviceName: serviceDetails?.name || '',
        servicePrice: serviceDetails?.price || 0,
        serviceDuration: serviceDetails?.duration || 30,
        staff: selectedStaff,
        date: formData.get('date'),
        time: formData.get('time'),
        notes: formData.get('notes'),
        status: autoConfirm ? 'confirmed' : 'pending',
        createdAt: new Date().toISOString(),
        source: 'online'
    };
    
    // Validate appointment
    if (validateAppointment(appointment)) {
        appointments.push(appointment);
        
        // Save to Firebase
        await saveToFirebase('appointments', appointments);
        
        // Add customer if new
        await addCustomerIfNew(appointment.name, appointment.phone);
        
        // Show success message
        const message = autoConfirm ? 
            'Randevunuz başarıyla alındı ve onaylandı!' : 
            'Randevunuz başarıyla alındı! En kısa sürede sizinle iletişime geçeceğiz.';
        showSuccessMessage(message);
        
        // Send WhatsApp message
        sendWhatsAppMessage(appointment);
        
        // Reset form
        e.target.reset();
        resetAppointmentForm();
        
        // Update appointments display
        loadAppointments();
    }
}

// Handle phone appointment form submission
function handlePhoneAppointmentSubmit(e) {
    e.preventDefault();
    
    const formData = new FormData(e.target);
    const serviceCategory = formData.get('service-category');
    const serviceSubcategory = formData.get('service-subcategory');
    const selectedStaff = formData.get('staff');
    const autoConfirm = formData.get('auto-confirm') === 'on';
    
    // Get service details
    const serviceDetails = serviceCategories[serviceCategory]?.subcategories.find(sub => sub.value === serviceSubcategory);
    
    const appointment = {
        id: Date.now(),
        name: formData.get('name'),
        phone: formData.get('phone'),
        serviceCategory: serviceCategory,
        serviceSubcategory: serviceSubcategory,
        serviceName: serviceDetails?.name || '',
        servicePrice: serviceDetails?.price || 0,
        serviceDuration: serviceDetails?.duration || 30,
        staff: selectedStaff,
        date: formData.get('date'),
        time: formData.get('time'),
        notes: formData.get('notes'),
        status: autoConfirm ? 'confirmed' : 'pending',
        createdAt: new Date().toISOString(),
        source: 'phone'
    };
    
    // Validate appointment
    if (validateAppointment(appointment)) {
        appointments.push(appointment);
        localStorage.setItem('appointments', JSON.stringify(appointments));
        
        // Add customer if new
        addCustomerIfNew(appointment.name, appointment.phone);
        
        // Show success message
        const message = autoConfirm ? 
            'Telefon randevusu başarıyla oluşturuldu ve onaylandı!' : 
            'Telefon randevusu başarıyla oluşturuldu!';
        showSuccessMessage(message);
        
        // Close modal
        closeModal('phoneAppointmentModal');
        
        // Reset form
        e.target.reset();
        resetPhoneAppointmentForm();
        
        // Update appointments display
        loadAppointments();
    }
}

// Validate appointment
function validateAppointment(appointment) {
    // Check if time slot is available
    const existingAppointment = appointments.find(apt => 
        apt.date === appointment.date && 
        apt.time === appointment.time &&
        apt.status !== 'cancelled'
    );
    
    if (existingAppointment) {
        showErrorMessage('Bu saat dilimi dolu. Lütfen başka bir saat seçin.');
        return false;
    }
    
    return true;
}

// Handle login
async function handleLogin(e) {
    e.preventDefault();
    
    const formData = new FormData(e.target);
    const email = formData.get('email');
    const password = formData.get('password');
    
    console.log('Giriş denemesi:', { email, password });
    
    try {
        // Try Firebase Authentication first
        if (auth) {
            const { signInWithEmailAndPassword } = await import('https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js');
            const userCredential = await signInWithEmailAndPassword(auth, email, password);
            const user = userCredential.user;
            
            currentUser = {
                id: user.uid,
                name: user.displayName || 'Admin',
                email: user.email,
                role: 'admin'
            };
            
            localStorage.setItem('currentUser', JSON.stringify(currentUser));
            closeModal('loginModal');
            updateNavForLoggedInUser();
            showSuccessMessage('Başarıyla giriş yaptınız!');
            return;
        }
    } catch (error) {
        console.log('Firebase auth failed, trying local auth:', error);
    }
    
    // Fallback to local authentication
    const user = users.find(u => u.email === email && u.password === password);
    
    if (user) {
        currentUser = user;
        localStorage.setItem('currentUser', JSON.stringify(currentUser));
        closeModal('loginModal');
        updateNavForLoggedInUser();
        showSuccessMessage('Başarıyla giriş yaptınız!');
    } else {
        console.log('Giriş başarısız - kullanıcı bulunamadı');
        showErrorMessage('E-posta veya şifre hatalı!');
    }
}

// Handle registration
function handleRegister(e) {
    e.preventDefault();
    
    const formData = new FormData(e.target);
    const user = {
        id: Date.now(),
        name: formData.get('name'),
        email: formData.get('email'),
        phone: formData.get('phone'),
        password: formData.get('password'),
        createdAt: new Date().toISOString()
    };
    
    // Check if user already exists
    const existingUser = users.find(u => u.email === user.email);
    if (existingUser) {
        showErrorMessage('Bu e-posta adresi zaten kayıtlı!');
        return;
    }
    
    users.push(user);
    localStorage.setItem('users', JSON.stringify(users));
    
    closeModal('registerModal');
    showSuccessMessage('Kayıt başarılı! Şimdi giriş yapabilirsiniz.');
}

// Update navigation for logged in user
function updateNavForLoggedInUser() {
    const navActions = document.querySelector('.nav-actions');
    navActions.innerHTML = `
        <span class="user-info">Hoş geldin, ${currentUser.name}!</span>
        <button class="btn-login" onclick="showPhoneAppointmentModal()">
            <i class="fas fa-phone"></i> Telefon Randevu
        </button>
        <button class="btn-login" onclick="showAdminPanel()">Yönetim</button>
        <button class="btn-register" onclick="logout()">Çıkış</button>
    `;
}

// Logout function
function logout() {
    currentUser = null;
    localStorage.removeItem('currentUser');
    location.reload();
}

// Show admin panel
function showAdminPanel() {
    if (!currentUser) return;
    
    const adminHTML = `
        <div class="admin-panel">
            <h2><i class="fas fa-cogs"></i> Yönetim Paneli</h2>
            <div class="admin-tabs">
                <button class="tab-btn active" onclick="showTab('appointments')">
                    <i class="fas fa-calendar-alt"></i> Randevular
                </button>
                <button class="tab-btn" onclick="showTab('revenue')">
                    <i class="fas fa-chart-line"></i> Gelir-Gider
                </button>
                <button class="tab-btn" onclick="showTab('customers')">
                    <i class="fas fa-users"></i> Müşteriler
                </button>
                <button class="tab-btn" onclick="showTab('services')">
                    <i class="fas fa-spa"></i> Hizmetler
                </button>
                <button class="tab-btn" onclick="showTab('staff')">
                    <i class="fas fa-user-tie"></i> Personel
                </button>
                <button class="tab-btn" onclick="showTab('settings')">
                    <i class="fas fa-cog"></i> Ayarlar
                </button>
            </div>
            <div id="appointments-tab" class="tab-content active">
                <div class="tab-header">
                    <h3><i class="fas fa-calendar-alt"></i> Randevu Yönetimi</h3>
                    <button class="btn-primary" onclick="showPhoneAppointmentModal()">
                        <i class="fas fa-phone"></i> Telefon Randevu
                    </button>
                </div>
                <div class="appointment-filters">
                    <select id="status-filter" onchange="filterAppointments()">
                        <option value="">Tüm Durumlar</option>
                        <option value="pending">Beklemede</option>
                        <option value="confirmed">Onaylandı</option>
                        <option value="completed">Tamamlandı</option>
                        <option value="cancelled">İptal</option>
                    </select>
                    <input type="date" id="date-filter" onchange="filterAppointments()">
                </div>
                <div id="appointments-list"></div>
            </div>
            <div id="revenue-tab" class="tab-content">
                <h3><i class="fas fa-chart-line"></i> Gelir-Gider Takibi</h3>
                <div class="revenue-stats">
                    <div class="stat-card">
                        <h4>Toplam Gelir</h4>
                        <span id="total-revenue">0₺</span>
                    </div>
                    <div class="stat-card">
                        <h4>Bu Ay</h4>
                        <span id="monthly-revenue">0₺</span>
                    </div>
                    <div class="stat-card">
                        <h4>Bugün</h4>
                        <span id="daily-revenue">0₺</span>
                    </div>
                    <div class="stat-card">
                        <h4>Toplam Randevu</h4>
                        <span id="total-appointments">0</span>
                    </div>
                </div>
                <div class="revenue-actions">
                    <button class="btn-primary" onclick="showAddExpenseModal()">
                        <i class="fas fa-plus"></i> Gider Ekle
                    </button>
                    <button class="btn-primary" onclick="showRevenueReport()">
                        <i class="fas fa-chart-bar"></i> Rapor
                    </button>
                </div>
                <div id="revenue-list"></div>
            </div>
            <div id="customers-tab" class="tab-content">
                <h3><i class="fas fa-users"></i> Müşteri Yönetimi</h3>
                <div class="customer-actions">
                    <button class="btn-primary" onclick="sendBulkWhatsAppMessage()">
                        <i class="fab fa-whatsapp"></i> Toplu Mesaj
                    </button>
                </div>
                <div id="customers-list"></div>
            </div>
            <div id="services-tab" class="tab-content">
                <h3><i class="fas fa-spa"></i> Hizmet Yönetimi</h3>
                <div class="service-actions">
                    <button class="btn-primary" onclick="showAddServiceModal()">
                        <i class="fas fa-plus"></i> Hizmet Ekle
                    </button>
                </div>
                <div id="services-list"></div>
            </div>
            <div id="staff-tab" class="tab-content">
                <h3><i class="fas fa-user-tie"></i> Personel Yönetimi</h3>
                <div class="staff-actions">
                    <button class="btn-primary" onclick="showAddStaffModal()">
                        <i class="fas fa-plus"></i> Personel Ekle
                    </button>
                </div>
                <div id="staff-list"></div>
            </div>
            <div id="settings-tab" class="tab-content">
                <h3><i class="fas fa-cog"></i> Sistem Ayarları</h3>
                <div class="settings-grid">
                    <div class="setting-item">
                        <label>Otomatik Onay</label>
                        <input type="checkbox" id="auto-confirm-setting" onchange="updateSetting('autoConfirm', this.checked)">
                    </div>
                    <div class="setting-item">
                        <label>WhatsApp Hatırlatma</label>
                        <input type="checkbox" id="whatsapp-reminder-setting" onchange="updateSetting('whatsappReminder', this.checked)">
                    </div>
                    <div class="setting-item">
                        <label>Hatırlatma Saati (saat öncesi)</label>
                        <input type="number" id="reminder-hours-setting" onchange="updateSetting('reminderHours', this.value)" min="1" max="24">
                    </div>
                </div>
            </div>
        </div>
    `;
    
    // Create modal for admin panel
    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.id = 'adminModal';
    modal.innerHTML = `
        <div class="modal-content admin-modal">
            <span class="close" onclick="closeModal('adminModal')">&times;</span>
            ${adminHTML}
        </div>
    `;
    
    document.body.appendChild(modal);
    modal.style.display = 'block';
    
    // Load admin data
    loadAdminData();
}

// Show tab content
function showTab(tabName) {
    // Hide all tabs
    document.querySelectorAll('.tab-content').forEach(tab => {
        tab.classList.remove('active');
    });
    
    // Remove active class from all buttons
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    
    // Show selected tab
    document.getElementById(tabName + '-tab').classList.add('active');
    event.target.classList.add('active');
    
    // Load data for the tab
    if (tabName === 'appointments') {
        loadAppointmentsList();
    } else if (tabName === 'revenue') {
        loadRevenueData();
    } else if (tabName === 'customers') {
        loadCustomersList();
    }
}

// Load admin data
function loadAdminData() {
    loadAppointmentsList();
    loadRevenueData();
    loadCustomersList();
    loadServicesList();
    loadStaffList();
    loadSettings();
}

// Load appointments list
function loadAppointmentsList() {
    const appointmentsList = document.getElementById('appointments-list');
    if (!appointmentsList) return;
    
    const appointmentsHTML = appointments.map(appointment => `
        <div class="appointment-item">
            <div class="appointment-info">
                <h4>${appointment.name}</h4>
                <p>${appointment.service} - ${appointment.date} ${appointment.time}</p>
                <p>Tel: ${appointment.phone}</p>
                ${appointment.notes ? `<p>Not: ${appointment.notes}</p>` : ''}
            </div>
            <div class="appointment-actions">
                <select onchange="updateAppointmentStatus(${appointment.id}, this.value)">
                    <option value="pending" ${appointment.status === 'pending' ? 'selected' : ''}>Beklemede</option>
                    <option value="confirmed" ${appointment.status === 'confirmed' ? 'selected' : ''}>Onaylandı</option>
                    <option value="completed" ${appointment.status === 'completed' ? 'selected' : ''}>Tamamlandı</option>
                    <option value="cancelled" ${appointment.status === 'cancelled' ? 'selected' : ''}>İptal</option>
                </select>
                <button onclick="deleteAppointment(${appointment.id})" class="btn-delete">Sil</button>
            </div>
        </div>
    `).join('');
    
    appointmentsList.innerHTML = appointmentsHTML;
}

// Update appointment status
function updateAppointmentStatus(id, status) {
    const appointment = appointments.find(apt => apt.id === id);
    if (appointment) {
        appointment.status = status;
        localStorage.setItem('appointments', JSON.stringify(appointments));
        loadAppointmentsList();
    }
}

// Delete appointment
function deleteAppointment(id) {
    if (confirm('Bu randevuyu silmek istediğinizden emin misiniz?')) {
        appointments = appointments.filter(apt => apt.id !== id);
        localStorage.setItem('appointments', JSON.stringify(appointments));
        loadAppointmentsList();
    }
}

// Load revenue data
function loadRevenueData() {
    // Calculate total revenue from completed appointments
    const totalRevenue = appointments
        .filter(apt => apt.status === 'completed')
        .reduce((sum, apt) => sum + (apt.servicePrice || 0), 0);
    
    // Calculate monthly revenue
    const currentMonth = new Date().getMonth();
    const currentYear = new Date().getFullYear();
    const monthlyRevenue = appointments
        .filter(apt => {
            const aptDate = new Date(apt.date);
            return apt.status === 'completed' && 
                   aptDate.getMonth() === currentMonth && 
                   aptDate.getFullYear() === currentYear;
        })
        .reduce((sum, apt) => sum + (apt.servicePrice || 0), 0);
    
    // Calculate daily revenue
    const today = new Date().toISOString().split('T')[0];
    const dailyRevenue = appointments
        .filter(apt => apt.status === 'completed' && apt.date === today)
        .reduce((sum, apt) => sum + (apt.servicePrice || 0), 0);
    
    // Calculate total expenses
    const totalExpenses = expenses.reduce((sum, expense) => sum + expense.amount, 0);
    
    // Calculate net profit
    const netProfit = totalRevenue - totalExpenses;
    
    // Update display
    document.getElementById('total-revenue').textContent = totalRevenue + '₺';
    document.getElementById('monthly-revenue').textContent = monthlyRevenue + '₺';
    document.getElementById('daily-revenue').textContent = dailyRevenue + '₺';
    document.getElementById('total-appointments').textContent = appointments.length;
    
    // Load revenue list
    loadRevenueList();
}

// Load revenue list
function loadRevenueList() {
    const revenueList = document.getElementById('revenue-list');
    if (!revenueList) return;
    
    let revenueHTML = '<h4>Son İşlemler</h4>';
    
    // Add completed appointments
    const completedAppointments = appointments
        .filter(apt => apt.status === 'completed')
        .sort((a, b) => new Date(b.date) - new Date(a.date))
        .slice(0, 10);
    
    completedAppointments.forEach(apt => {
        revenueHTML += `
            <div class="revenue-item">
                <div class="revenue-info">
                    <h5>${apt.name} - ${apt.serviceName}</h5>
                    <p>${apt.date} ${apt.time}</p>
                </div>
                <div class="revenue-amount">
                    <span class="amount positive">+${apt.servicePrice}₺</span>
                </div>
            </div>
        `;
    });
    
    // Add expenses
    const recentExpenses = expenses
        .sort((a, b) => new Date(b.date) - new Date(a.date))
        .slice(0, 5);
    
    if (recentExpenses.length > 0) {
        revenueHTML += '<h4>Son Giderler</h4>';
        recentExpenses.forEach(expense => {
            revenueHTML += `
                <div class="revenue-item">
                    <div class="revenue-info">
                        <h5>${expense.description}</h5>
                        <p>${expense.date}</p>
                    </div>
                    <div class="revenue-amount">
                        <span class="amount negative">-${expense.amount}₺</span>
                    </div>
                </div>
            `;
        });
    }
    
    revenueList.innerHTML = revenueHTML;
}

// Show add expense modal
function showAddExpenseModal() {
    const expenseHTML = `
        <div class="expense-form">
            <h3>Gider Ekle</h3>
            <form id="expenseForm">
                <div class="form-group">
                    <label for="expenseDescription">Açıklama</label>
                    <input type="text" id="expenseDescription" name="description" required>
                </div>
                <div class="form-group">
                    <label for="expenseAmount">Tutar</label>
                    <input type="number" id="expenseAmount" name="amount" required min="0" step="0.01">
                </div>
                <div class="form-group">
                    <label for="expenseDate">Tarih</label>
                    <input type="date" id="expenseDate" name="date" required>
                </div>
                <div class="form-group">
                    <label for="expenseCategory">Kategori</label>
                    <select id="expenseCategory" name="category">
                        <option value="market">Market</option>
                        <option value="yemek">Yemek</option>
                        <option value="elektrik">Elektrik</option>
                        <option value="kira">Kira</option>
                        <option value="malzeme">Malzeme</option>
                        <option value="diger">Diğer</option>
                    </select>
                </div>
                <button type="submit" class="btn-submit">Gider Ekle</button>
            </form>
        </div>
    `;
    
    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.id = 'expenseModal';
    modal.innerHTML = `
        <div class="modal-content">
            <span class="close" onclick="closeModal('expenseModal')">&times;</span>
            ${expenseHTML}
        </div>
    `;
    
    document.body.appendChild(modal);
    modal.style.display = 'block';
    
    // Set today's date
    document.getElementById('expenseDate').value = new Date().toISOString().split('T')[0];
    
    // Add form submit handler
    document.getElementById('expenseForm').addEventListener('submit', handleExpenseSubmit);
}

// Handle expense form submission
function handleExpenseSubmit(e) {
    e.preventDefault();
    
    const formData = new FormData(e.target);
    const expense = {
        id: Date.now(),
        description: formData.get('description'),
        amount: parseFloat(formData.get('amount')),
        date: formData.get('date'),
        category: formData.get('category'),
        createdAt: new Date().toISOString()
    };
    
    expenses.push(expense);
    localStorage.setItem('expenses', JSON.stringify(expenses));
    
    closeModal('expenseModal');
    showSuccessMessage('Gider başarıyla eklendi!');
    
    // Reload revenue data
    loadRevenueData();
}

// Show revenue report
function showRevenueReport() {
    const currentMonth = new Date().getMonth();
    const currentYear = new Date().getFullYear();
    
    // Calculate monthly data
    const monthlyAppointments = appointments.filter(apt => {
        const aptDate = new Date(apt.date);
        return apt.status === 'completed' && 
               aptDate.getMonth() === currentMonth && 
               aptDate.getFullYear() === currentYear;
    });
    
    const monthlyRevenue = monthlyAppointments.reduce((sum, apt) => sum + (apt.servicePrice || 0), 0);
    const monthlyExpenses = expenses.filter(exp => {
        const expDate = new Date(exp.date);
        return expDate.getMonth() === currentMonth && expDate.getFullYear() === currentYear;
    }).reduce((sum, exp) => sum + exp.amount, 0);
    
    const netProfit = monthlyRevenue - monthlyExpenses;
    
    const reportHTML = `
        <div class="revenue-report">
            <h3>Aylık Rapor - ${new Date().toLocaleDateString('tr-TR', { month: 'long', year: 'numeric' })}</h3>
            <div class="report-stats">
                <div class="stat-item">
                    <h4>Toplam Gelir</h4>
                    <span class="positive">${monthlyRevenue}₺</span>
                </div>
                <div class="stat-item">
                    <h4>Toplam Gider</h4>
                    <span class="negative">${monthlyExpenses}₺</span>
                </div>
                <div class="stat-item">
                    <h4>Net Kar</h4>
                    <span class="${netProfit >= 0 ? 'positive' : 'negative'}">${netProfit}₺</span>
                </div>
                <div class="stat-item">
                    <h4>Toplam Randevu</h4>
                    <span>${monthlyAppointments.length}</span>
                </div>
            </div>
            <div class="report-actions">
                <button onclick="printReport()" class="btn-primary">
                    <i class="fas fa-print"></i> Yazdır
                </button>
                <button onclick="exportReport()" class="btn-primary">
                    <i class="fas fa-download"></i> Dışa Aktar
                </button>
            </div>
        </div>
    `;
    
    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.id = 'reportModal';
    modal.innerHTML = `
        <div class="modal-content">
            <span class="close" onclick="closeModal('reportModal')">&times;</span>
            ${reportHTML}
        </div>
    `;
    
    document.body.appendChild(modal);
    modal.style.display = 'block';
}

// Print report
function printReport() {
    window.print();
}

// Export report
function exportReport() {
    const reportData = {
        date: new Date().toISOString(),
        monthlyRevenue: document.querySelector('.positive').textContent,
        monthlyExpenses: document.querySelector('.negative').textContent,
        netProfit: document.querySelector('.stat-item:last-child span').textContent
    };
    
    const dataStr = JSON.stringify(reportData, null, 2);
    const dataBlob = new Blob([dataStr], {type: 'application/json'});
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `rapor-${new Date().toISOString().split('T')[0]}.json`;
    link.click();
}

// Load customers list
function loadCustomersList() {
    const customersList = document.getElementById('customers-list');
    if (!customersList) return;
    
    // Get unique customers from appointments
    const customerMap = new Map();
    appointments.forEach(apt => {
        if (!customerMap.has(apt.phone)) {
            customerMap.set(apt.phone, {
                name: apt.name,
                phone: apt.phone,
                appointments: [],
                lastVisit: apt.date
            });
        }
        customerMap.get(apt.phone).appointments.push(apt);
        if (new Date(apt.date) > new Date(customerMap.get(apt.phone).lastVisit)) {
            customerMap.get(apt.phone).lastVisit = apt.date;
        }
    });
    
    const customersHTML = Array.from(customerMap.values()).map(customer => `
        <div class="customer-item">
            <div class="customer-info">
                <h4>${customer.name}</h4>
                <p>Tel: ${customer.phone}</p>
                <p>Toplam Randevu: ${customer.appointments.length}</p>
                <p>Son Ziyaret: ${new Date(customer.lastVisit).toLocaleDateString('tr-TR')}</p>
            </div>
            <div class="customer-actions">
                <button onclick="sendWhatsAppMessage('${customer.phone}')" class="btn-whatsapp">
                    <i class="fab fa-whatsapp"></i> WhatsApp
                </button>
                <button onclick="viewCustomerHistory('${customer.phone}')" class="btn-primary">
                    <i class="fas fa-history"></i> Geçmiş
                </button>
            </div>
        </div>
    `).join('');
    
    customersList.innerHTML = customersHTML;
}

// Load services list
function loadServicesList() {
    const servicesList = document.getElementById('services-list');
    if (!servicesList) return;
    
    let servicesHTML = '';
    Object.keys(serviceCategories).forEach(categoryKey => {
        const category = serviceCategories[categoryKey];
        servicesHTML += `
            <div class="service-category-item">
                <h4>${category.name}</h4>
                <div class="subcategory-list">
                    ${category.subcategories.map(sub => `
                        <div class="subcategory-item">
                            <span>${sub.name}</span>
                            <span>${sub.duration} dk</span>
                            <span>${sub.price}₺</span>
                        </div>
                    `).join('')}
                </div>
            </div>
        `;
    });
    
    servicesList.innerHTML = servicesHTML;
}

// Load staff list
function loadStaffList() {
    const staffList = document.getElementById('staff-list');
    if (!staffList) return;
    
    const staffHTML = staff.map(member => `
        <div class="staff-item">
            <div class="staff-info">
                <div class="staff-avatar">${member.avatar}</div>
                <div>
                    <h4>${member.name}</h4>
                    <p>Uzmanlık: ${member.specialty}</p>
                </div>
            </div>
            <div class="staff-actions">
                <button onclick="editStaff(${member.id})" class="btn-primary">
                    <i class="fas fa-edit"></i> Düzenle
                </button>
                <button onclick="deleteStaff(${member.id})" class="btn-delete">
                    <i class="fas fa-trash"></i> Sil
                </button>
            </div>
        </div>
    `).join('');
    
    staffList.innerHTML = staffHTML;
}

// Load settings
function loadSettings() {
    document.getElementById('auto-confirm-setting').checked = settings.autoConfirm;
    document.getElementById('whatsapp-reminder-setting').checked = settings.whatsappReminder;
    document.getElementById('reminder-hours-setting').value = settings.reminderHours;
}

// Update setting
function updateSetting(key, value) {
    settings[key] = value;
    localStorage.setItem('settings', JSON.stringify(settings));
}

// Filter appointments
function filterAppointments() {
    const statusFilter = document.getElementById('status-filter').value;
    const dateFilter = document.getElementById('date-filter').value;
    
    let filteredAppointments = appointments;
    
    if (statusFilter) {
        filteredAppointments = filteredAppointments.filter(apt => apt.status === statusFilter);
    }
    
    if (dateFilter) {
        filteredAppointments = filteredAppointments.filter(apt => apt.date === dateFilter);
    }
    
    displayFilteredAppointments(filteredAppointments);
}

// Display filtered appointments
function displayFilteredAppointments(filteredAppointments) {
    const appointmentsList = document.getElementById('appointments-list');
    if (!appointmentsList) return;
    
    const appointmentsHTML = filteredAppointments.map(appointment => `
        <div class="appointment-item">
            <div class="appointment-info">
                <h4>${appointment.name}</h4>
                <p>${appointment.serviceName} - ${appointment.date} ${appointment.time}</p>
                <p>Tel: ${appointment.phone}</p>
                <p>Durum: <span class="status-${appointment.status}">${getStatusText(appointment.status)}</span></p>
                ${appointment.notes ? `<p>Not: ${appointment.notes}</p>` : ''}
            </div>
            <div class="appointment-actions">
                <select onchange="updateAppointmentStatus(${appointment.id}, this.value)">
                    <option value="pending" ${appointment.status === 'pending' ? 'selected' : ''}>Beklemede</option>
                    <option value="confirmed" ${appointment.status === 'confirmed' ? 'selected' : ''}>Onaylandı</option>
                    <option value="completed" ${appointment.status === 'completed' ? 'selected' : ''}>Tamamlandı</option>
                    <option value="cancelled" ${appointment.status === 'cancelled' ? 'selected' : ''}>İptal</option>
                </select>
                <button onclick="sendWhatsAppMessage('${appointment.phone}')" class="btn-whatsapp">
                    <i class="fab fa-whatsapp"></i>
                </button>
                <button onclick="deleteAppointment(${appointment.id})" class="btn-delete">
                    <i class="fas fa-trash"></i>
                </button>
            </div>
        </div>
    `).join('');
    
    appointmentsList.innerHTML = appointmentsHTML;
}

// Get status text
function getStatusText(status) {
    const statusTexts = {
        'pending': 'Beklemede',
        'confirmed': 'Onaylandı',
        'completed': 'Tamamlandı',
        'cancelled': 'İptal'
    };
    return statusTexts[status] || status;
}

// Send WhatsApp message
function sendWhatsAppMessage(appointment) {
    let message;
    let phone;
    
    if (typeof appointment === 'string') {
        // Direct phone number
        phone = appointment;
        message = `Merhaba! Güzellik salonumuzdan size ulaşıyoruz. Size özel kampanyalarımız hakkında bilgi almak ister misiniz?`;
    } else {
        // Appointment object
        phone = appointment.phone;
        const serviceName = appointment.serviceName || 'Hizmet';
        const servicePrice = appointment.servicePrice || 0;
        
        if (appointment.status === 'confirmed') {
            message = `Merhaba ${appointment.name}! Randevunuz onaylandı. 
📅 Tarih: ${appointment.date}
🕐 Saat: ${appointment.time}
💆‍♀️ Hizmet: ${serviceName}
💰 Fiyat: ${servicePrice}₺
📍 Adres: Merkez Mahallesi, Güzellik Sokak No:123, İstanbul

Randevunuzdan ${settings.reminderHours} saat önce hatırlatma mesajı göndereceğiz. Teşekkürler!`;
        } else {
            message = `Merhaba ${appointment.name}! Randevunuz alındı. 
📅 Tarih: ${appointment.date}
🕐 Saat: ${appointment.time}
💆‍♀️ Hizmet: ${serviceName}
💰 Fiyat: ${servicePrice}₺

En kısa sürede sizinle iletişime geçeceğiz. Teşekkürler!`;
        }
    }
    
    const whatsappUrl = `https://wa.me/90${phone.replace(/\D/g, '')}?text=${encodeURIComponent(message)}`;
    window.open(whatsappUrl, '_blank');
}

// Send bulk WhatsApp message
function sendBulkWhatsAppMessage() {
    const message = prompt('Göndermek istediğiniz mesajı yazın:');
    if (!message) return;
    
    // Get all unique customers
    const customerMap = new Map();
    appointments.forEach(apt => {
        if (!customerMap.has(apt.phone)) {
            customerMap.set(apt.phone, apt.name);
        }
    });
    
    // Send to first customer as example
    const firstCustomer = Array.from(customerMap.keys())[0];
    if (firstCustomer) {
        const whatsappUrl = `https://wa.me/90${firstCustomer.replace(/\D/g, '')}?text=${encodeURIComponent(message)}`;
        window.open(whatsappUrl, '_blank');
        
        // Show info about bulk sending
        alert(`Toplu mesaj gönderimi başlatıldı. ${customerMap.size} müşteriye mesaj gönderilecek. WhatsApp'ta "Broadcast" özelliğini kullanarak tüm müşterilere aynı anda mesaj gönderebilirsiniz.`);
    }
}

// Schedule reminder messages
function scheduleReminderMessages() {
    if (!settings.whatsappReminder) return;
    
    const now = new Date();
    const reminderTime = new Date(now.getTime() + (settings.reminderHours * 60 * 60 * 1000));
    
    appointments.forEach(appointment => {
        if (appointment.status === 'confirmed') {
            const appointmentDateTime = new Date(`${appointment.date}T${appointment.time}`);
            const timeDiff = appointmentDateTime.getTime() - now.getTime();
            const hoursUntilAppointment = timeDiff / (1000 * 60 * 60);
            
            // If appointment is within reminder time
            if (hoursUntilAppointment <= settings.reminderHours && hoursUntilAppointment > 0) {
                sendReminderMessage(appointment);
            }
        }
    });
}

// Send reminder message
function sendReminderMessage(appointment) {
    const message = `🔔 Randevu Hatırlatması

Merhaba ${appointment.name}!

Randevunuz yaklaşıyor:
📅 Tarih: ${appointment.date}
🕐 Saat: ${appointment.time}
💆‍♀️ Hizmet: ${appointment.serviceName}

Randevunuzdan önce:
• Cildinizi temiz tutun
• Ağda/epilasyon için tüyleri uzatın
• Alerjiniz varsa önceden bildirin

Sorularınız için bize ulaşabilirsiniz. Görüşmek üzere! 💫`;

    const whatsappUrl = `https://wa.me/90${appointment.phone.replace(/\D/g, '')}?text=${encodeURIComponent(message)}`;
    window.open(whatsappUrl, '_blank');
}

// Check for appointments that need reminders
function checkReminders() {
    const now = new Date();
    
    appointments.forEach(appointment => {
        if (appointment.status === 'confirmed') {
            const appointmentDateTime = new Date(`${appointment.date}T${appointment.time}`);
            const timeDiff = appointmentDateTime.getTime() - now.getTime();
            const hoursUntilAppointment = timeDiff / (1000 * 60 * 60);
            
            // If appointment is within reminder time and hasn't been reminded
            if (hoursUntilAppointment <= settings.reminderHours && hoursUntilAppointment > 0 && !appointment.reminderSent) {
                appointment.reminderSent = true;
                localStorage.setItem('appointments', JSON.stringify(appointments));
                
                // Show notification
                showReminderNotification(appointment);
            }
        }
    });
}

// Show reminder notification
function showReminderNotification(appointment) {
    if (Notification.permission === 'granted') {
        new Notification('Randevu Hatırlatması', {
            body: `${appointment.name} için randevu hatırlatması gönderilecek`,
            icon: '/favicon.ico'
        });
    }
    
    // Auto-send reminder if enabled
    if (settings.autoSendReminders) {
        sendReminderMessage(appointment);
    }
}

// Request notification permission
function requestNotificationPermission() {
    if ('Notification' in window && Notification.permission === 'default') {
        Notification.requestPermission();
    }
}

// View customer history
function viewCustomerHistory(phone) {
    const customerAppointments = appointments.filter(apt => apt.phone === phone);
    const customer = customers.find(c => c.phone === phone);
    
    const historyHTML = `
        <div class="customer-history">
            <h3>${customer ? customer.name : 'Müşteri'} - Randevu Geçmişi</h3>
            <div class="customer-stats">
                <div class="stat-item">
                    <h4>Toplam Randevu</h4>
                    <span>${customerAppointments.length}</span>
                </div>
                <div class="stat-item">
                    <h4>Tamamlanan</h4>
                    <span>${customerAppointments.filter(apt => apt.status === 'completed').length}</span>
                </div>
                <div class="stat-item">
                    <h4>Toplam Harcama</h4>
                    <span>${customerAppointments.filter(apt => apt.status === 'completed').reduce((sum, apt) => sum + (apt.servicePrice || 0), 0)}₺</span>
                </div>
            </div>
            <div class="appointments-history">
                <h4>Randevu Geçmişi</h4>
                ${customerAppointments.map(apt => `
                    <div class="appointment-history-item">
                        <div class="appointment-info">
                            <h5>${apt.serviceName}</h5>
                            <p>${apt.date} ${apt.time}</p>
                            <p>Durum: <span class="status-${apt.status}">${getStatusText(apt.status)}</span></p>
                            ${apt.servicePrice ? `<p>Fiyat: ${apt.servicePrice}₺</p>` : ''}
                        </div>
                        <div class="appointment-actions">
                            <button onclick="sendWhatsAppMessage('${apt.phone}')" class="btn-whatsapp">
                                <i class="fab fa-whatsapp"></i>
                            </button>
                        </div>
                    </div>
                `).join('')}
            </div>
        </div>
    `;
    
    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.id = 'customerHistoryModal';
    modal.innerHTML = `
        <div class="modal-content">
            <span class="close" onclick="closeModal('customerHistoryModal')">&times;</span>
            ${historyHTML}
        </div>
    `;
    
    document.body.appendChild(modal);
    modal.style.display = 'block';
}

// Add customer if new
async function addCustomerIfNew(name, phone) {
    const existingCustomer = customers.find(customer => 
        customer.phone === phone || customer.name === name
    );
    
    if (!existingCustomer) {
        const newCustomer = {
            id: Date.now(),
            name: name,
            phone: phone,
            createdAt: new Date().toISOString(),
            lastVisit: new Date().toISOString(),
            totalAppointments: 1,
            totalSpent: 0
        };
        customers.push(newCustomer);
        await saveToFirebase('customers', customers);
    } else {
        // Update last visit and appointment count
        existingCustomer.lastVisit = new Date().toISOString();
        existingCustomer.totalAppointments = (existingCustomer.totalAppointments || 0) + 1;
        await saveToFirebase('customers', customers);
    }
}

// Update customer spending
function updateCustomerSpending(phone, amount) {
    const customer = customers.find(c => c.phone === phone);
    if (customer) {
        customer.totalSpent = (customer.totalSpent || 0) + amount;
        localStorage.setItem('customers', JSON.stringify(customers));
    }
}

// Modal functions
function showLoginModal() {
    document.getElementById('loginModal').style.display = 'block';
}

function showRegisterModal() {
    document.getElementById('registerModal').style.display = 'block';
}

function closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.style.display = 'none';
        if (modalId === 'adminModal') {
            modal.remove();
        }
    }
}

// Scroll to appointment section
function scrollToAppointment() {
    document.getElementById('appointment').scrollIntoView({
        behavior: 'smooth'
    });
}

// Handle scroll animation
function handleScrollAnimation() {
    const elements = document.querySelectorAll('.fade-in');
    elements.forEach(element => {
        const elementTop = element.getBoundingClientRect().top;
        const elementVisible = 150;
        
        if (elementTop < window.innerHeight - elementVisible) {
            element.classList.add('visible');
        }
    });
}

// Show success message
function showSuccessMessage(message) {
    const successDiv = document.createElement('div');
    successDiv.className = 'success-message';
    successDiv.textContent = message;
    successDiv.style.display = 'block';
    
    document.body.appendChild(successDiv);
    
    setTimeout(() => {
        successDiv.remove();
    }, 5000);
}

// Show error message
function showErrorMessage(message) {
    alert(message);
}

// Load appointments (for display purposes)
function loadAppointments() {
    // This function can be used to display appointments on the page
    // Currently just storing in localStorage
}

// Close modal when clicking outside
window.onclick = function(event) {
    const modals = document.querySelectorAll('.modal');
    modals.forEach(modal => {
        if (event.target === modal) {
            modal.style.display = 'none';
            if (modal.id === 'adminModal') {
                modal.remove();
            }
        }
    });
}

// Add fade-in class to elements
document.addEventListener('DOMContentLoaded', function() {
    const elements = document.querySelectorAll('.service-card, .contact-item, .appointment-form');
    elements.forEach(element => {
        element.classList.add('fade-in');
    });
});

// Service prices for calculations
const servicePrices = {
    'haircut': 150,
    'makeup': 200,
    'manicure': 100,
    'skincare': 300
};

// Mobile menu functions
function toggleMobileMenu() {
    const navMenu = document.querySelector('.nav-menu');
    const toggle = document.querySelector('.mobile-menu-toggle');
    
    navMenu.classList.toggle('active');
    toggle.classList.toggle('active');
}

function closeMobileMenu() {
    const navMenu = document.querySelector('.nav-menu');
    const toggle = document.querySelector('.mobile-menu-toggle');
    
    navMenu.classList.remove('active');
    toggle.classList.remove('active');
}

// Scroll effects
function setupScrollEffects() {
    // Header scroll effect
    window.addEventListener('scroll', function() {
        const header = document.querySelector('.header');
        if (window.scrollY > 100) {
            header.classList.add('scrolled');
        } else {
            header.classList.remove('scrolled');
        }
    });
    
    // Smooth scroll for anchor links
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function (e) {
            e.preventDefault();
            const target = document.querySelector(this.getAttribute('href'));
            if (target) {
                const headerHeight = document.querySelector('.header').offsetHeight;
                const targetPosition = target.offsetTop - headerHeight;
                
                window.scrollTo({
                    top: targetPosition,
                    behavior: 'smooth'
                });
            }
        });
    });
}

// Loading animation
function showLoading(element) {
    element.innerHTML = '<div class="loading"></div>';
}

// Touch-friendly interactions
function setupTouchInteractions() {
    // Add touch feedback to buttons
    document.querySelectorAll('button, .btn-primary, .btn-login, .btn-register').forEach(button => {
        button.addEventListener('touchstart', function() {
            this.style.transform = 'scale(0.95)';
        });
        
        button.addEventListener('touchend', function() {
            this.style.transform = '';
        });
    });
}

// Initialize touch interactions
document.addEventListener('DOMContentLoaded', function() {
    setupTouchInteractions();
});

// Service category card click handler
function handleServiceCategoryCardClick(e) {
    const category = e.currentTarget.dataset.category;
    const subcategoryGroup = document.getElementById('subcategory-group');
    const subcategoryCards = document.getElementById('subcategory-cards');
    const staffGroup = document.getElementById('staff-group');
    const staffCards = document.getElementById('staff-cards');
    
    // Remove active class from all category cards
    document.querySelectorAll('.service-category-card').forEach(card => {
        card.classList.remove('selected');
    });
    
    // Add active class to clicked card
    e.currentTarget.classList.add('selected');
    
    // Set hidden input value
    document.getElementById('service-category').value = category;
    
    if (category && serviceCategories[category]) {
        // Show subcategory group
        subcategoryGroup.style.display = 'block';
        
        // Populate subcategories
        subcategoryCards.innerHTML = '';
        serviceCategories[category].subcategories.forEach(sub => {
            const card = document.createElement('div');
            card.className = 'service-category-card';
            card.dataset.subcategory = sub.value;
            card.innerHTML = `
                <i class="fas fa-spa"></i>
                <h4>${sub.name}</h4>
                <p>${sub.duration} dk - ${sub.price}₺</p>
            `;
            card.addEventListener('click', handleSubcategoryCardClick);
            subcategoryCards.appendChild(card);
        });
        
        // Show staff group
        staffGroup.style.display = 'block';
        
        // Populate staff
        staffCards.innerHTML = '';
        staff.forEach(member => {
            if (member.specialty === serviceCategories[category].name || member.specialty === 'Tümü') {
                const card = document.createElement('div');
                card.className = 'staff-card';
                card.dataset.staff = member.id;
                card.innerHTML = `
                    <div class="staff-avatar">${member.avatar}</div>
                    <h4>${member.name}</h4>
                    <p>${member.specialty}</p>
                `;
                card.addEventListener('click', handleStaffCardClick);
                staffCards.appendChild(card);
            }
        });
    } else {
        subcategoryGroup.style.display = 'none';
        staffGroup.style.display = 'none';
    }
}

// Subcategory card click handler
function handleSubcategoryCardClick(e) {
    const subcategory = e.currentTarget.dataset.subcategory;
    
    // Remove active class from all subcategory cards
    document.querySelectorAll('#subcategory-cards .service-category-card').forEach(card => {
        card.classList.remove('selected');
    });
    
    // Add active class to clicked card
    e.currentTarget.classList.add('selected');
    
    // Set hidden input value
    document.getElementById('service-subcategory').value = subcategory;
}

// Staff card click handler
function handleStaffCardClick(e) {
    const staffId = e.currentTarget.dataset.staff;
    
    // Remove active class from all staff cards
    document.querySelectorAll('#staff-cards .staff-card').forEach(card => {
        card.classList.remove('selected');
    });
    
    // Add active class to clicked card
    e.currentTarget.classList.add('selected');
    
    // Set hidden input value
    document.getElementById('staff').value = staffId;
}

// Phone service category card click handler
function handlePhoneServiceCategoryCardClick(e) {
    const category = e.currentTarget.dataset.category;
    const subcategoryGroup = document.getElementById('phoneSubcategoryGroup');
    const subcategoryCards = document.getElementById('phone-subcategory-cards');
    const staffGroup = document.getElementById('phoneStaffGroup');
    const staffCards = document.getElementById('phone-staff-cards');
    
    // Remove active class from all phone category cards
    document.querySelectorAll('#phone-service-category-cards .service-category-card').forEach(card => {
        card.classList.remove('selected');
    });
    
    // Add active class to clicked card
    e.currentTarget.classList.add('selected');
    
    // Set hidden input value
    document.getElementById('phoneServiceCategory').value = category;
    
    if (category && serviceCategories[category]) {
        // Show subcategory group
        subcategoryGroup.style.display = 'block';
        
        // Populate subcategories
        subcategoryCards.innerHTML = '';
        serviceCategories[category].subcategories.forEach(sub => {
            const card = document.createElement('div');
            card.className = 'service-category-card';
            card.dataset.subcategory = sub.value;
            card.innerHTML = `
                <i class="fas fa-spa"></i>
                <h4>${sub.name}</h4>
                <p>${sub.duration} dk - ${sub.price}₺</p>
            `;
            card.addEventListener('click', handlePhoneSubcategoryCardClick);
            subcategoryCards.appendChild(card);
        });
        
        // Show staff group
        staffGroup.style.display = 'block';
        
        // Populate staff
        staffCards.innerHTML = '';
        staff.forEach(member => {
            if (member.specialty === serviceCategories[category].name || member.specialty === 'Tümü') {
                const card = document.createElement('div');
                card.className = 'staff-card';
                card.dataset.staff = member.id;
                card.innerHTML = `
                    <div class="staff-avatar">${member.avatar}</div>
                    <h4>${member.name}</h4>
                    <p>${member.specialty}</p>
                `;
                card.addEventListener('click', handlePhoneStaffCardClick);
                staffCards.appendChild(card);
            }
        });
    } else {
        subcategoryGroup.style.display = 'none';
        staffGroup.style.display = 'none';
    }
}

// Phone subcategory card click handler
function handlePhoneSubcategoryCardClick(e) {
    const subcategory = e.currentTarget.dataset.subcategory;
    
    // Remove active class from all phone subcategory cards
    document.querySelectorAll('#phone-subcategory-cards .service-category-card').forEach(card => {
        card.classList.remove('selected');
    });
    
    // Add active class to clicked card
    e.currentTarget.classList.add('selected');
    
    // Set hidden input value
    document.getElementById('phoneServiceSubcategory').value = subcategory;
}

// Phone staff card click handler
function handlePhoneStaffCardClick(e) {
    const staffId = e.currentTarget.dataset.staff;
    
    // Remove active class from all phone staff cards
    document.querySelectorAll('#phone-staff-cards .staff-card').forEach(card => {
        card.classList.remove('selected');
    });
    
    // Add active class to clicked card
    e.currentTarget.classList.add('selected');
    
    // Set hidden input value
    document.getElementById('phoneStaff').value = staffId;
}

function handlePhoneServiceCategoryChange(e) {
    const category = e.target.value;
    const subcategoryGroup = document.getElementById('phoneSubcategoryGroup');
    const subcategorySelect = document.getElementById('phoneServiceSubcategory');
    const staffGroup = document.getElementById('phoneStaffGroup');
    const staffSelect = document.getElementById('phoneStaff');
    
    if (category && serviceCategories[category]) {
        // Show subcategory group
        subcategoryGroup.style.display = 'block';
        
        // Populate subcategories
        subcategorySelect.innerHTML = '<option value="">Alt kategori seçin</option>';
        serviceCategories[category].subcategories.forEach(sub => {
            const option = document.createElement('option');
            option.value = sub.value;
            option.textContent = sub.name;
            option.dataset.duration = sub.duration;
            option.dataset.price = sub.price;
            subcategorySelect.appendChild(option);
        });
        
        // Show staff group
        staffGroup.style.display = 'block';
        
        // Populate staff
        staffSelect.innerHTML = '<option value="">Personel seçin</option>';
        staff.forEach(member => {
            if (member.specialty === serviceCategories[category].name || member.specialty === 'Tümü') {
                const option = document.createElement('option');
                option.value = member.id;
                option.textContent = member.name;
                staffSelect.appendChild(option);
            }
        });
    } else {
        subcategoryGroup.style.display = 'none';
        staffGroup.style.display = 'none';
    }
}

// Customer name input handlers
function handleCustomerNameInput(e) {
    const name = e.target.value;
    const suggestions = document.getElementById('customer-suggestions');
    
    if (name.length > 1) {
        const matches = customers.filter(customer => 
            customer.name.toLowerCase().includes(name.toLowerCase())
        );
        
        if (matches.length > 0) {
            suggestions.innerHTML = matches.map(customer => 
                `<div class="suggestion-item" onclick="selectCustomer('${customer.name}', '${customer.phone}')">
                    <strong>${customer.name}</strong><br>
                    <small>${customer.phone}</small>
                </div>`
            ).join('');
            suggestions.style.display = 'block';
        } else {
            suggestions.style.display = 'none';
        }
    } else {
        suggestions.style.display = 'none';
    }
}

function handlePhoneCustomerNameInput(e) {
    const name = e.target.value;
    const suggestions = document.getElementById('phone-customer-suggestions');
    
    if (name.length > 1) {
        const matches = customers.filter(customer => 
            customer.name.toLowerCase().includes(name.toLowerCase())
        );
        
        if (matches.length > 0) {
            suggestions.innerHTML = matches.map(customer => 
                `<div class="suggestion-item" onclick="selectPhoneCustomer('${customer.name}', '${customer.phone}')">
                    <strong>${customer.name}</strong><br>
                    <small>${customer.phone}</small>
                </div>`
            ).join('');
            suggestions.style.display = 'block';
        } else {
            suggestions.style.display = 'none';
        }
    } else {
        suggestions.style.display = 'none';
    }
}

// Customer selection functions
function selectCustomer(name, phone) {
    document.getElementById('name').value = name;
    document.getElementById('phone').value = phone;
    document.getElementById('customer-suggestions').style.display = 'none';
}

function selectPhoneCustomer(name, phone) {
    document.getElementById('phoneName').value = name;
    document.getElementById('phonePhone').value = phone;
    document.getElementById('phone-customer-suggestions').style.display = 'none';
}

// Date change handlers
function handleDateChange(e) {
    const date = e.target.value;
    const timeSlots = document.getElementById('time-slots');
    
    if (date) {
        generateTimeSlotCards(date, timeSlots);
    }
}

function handlePhoneDateChange(e) {
    const date = e.target.value;
    const timeSlots = document.getElementById('phone-time-slots');
    
    if (date) {
        generateTimeSlotCards(date, timeSlots);
    }
}

// Generate time slot cards
function generateTimeSlotCards(date, container) {
    container.innerHTML = '';
    const startHour = 9;
    const endHour = 18;
    
    for (let hour = startHour; hour < endHour; hour++) {
        for (let minute = 0; minute < 60; minute += 15) {
            const timeString = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
            const isAvailable = isTimeSlotAvailable(date, timeString);
            
            const slot = document.createElement('div');
            slot.className = `time-slot ${!isAvailable ? 'unavailable' : ''}`;
            slot.dataset.time = timeString;
            slot.textContent = timeString;
            
            if (isAvailable) {
                slot.addEventListener('click', handleTimeSlotClick);
            }
            
            container.appendChild(slot);
        }
    }
}

// Time slot click handler
function handleTimeSlotClick(e) {
    const time = e.target.dataset.time;
    
    // Remove active class from all time slots
    document.querySelectorAll('.time-slot').forEach(slot => {
        slot.classList.remove('selected');
    });
    
    // Add active class to clicked slot
    e.target.classList.add('selected');
    
    // Set hidden input value
    document.getElementById('time').value = time;
}

// Generate time slots (for phone appointments)
function generateTimeSlots(date, selectElement) {
    const slots = [];
    const startHour = 9;
    const endHour = 18;
    
    for (let hour = startHour; hour < endHour; hour++) {
        for (let minute = 0; minute < 60; minute += 15) {
            const timeString = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
            const isAvailable = isTimeSlotAvailable(date, timeString);
            
            const option = document.createElement('option');
            option.value = timeString;
            option.textContent = timeString;
            option.disabled = !isAvailable;
            if (!isAvailable) {
                option.textContent += ' (Dolu)';
            }
            selectElement.appendChild(option);
        }
    }
}

// Check if time slot is available
function isTimeSlotAvailable(date, time) {
    return !appointments.some(apt => 
        apt.date === date && 
        apt.time === time && 
        apt.status !== 'cancelled'
    );
}

// Add customer if new
function addCustomerIfNew(name, phone) {
    const existingCustomer = customers.find(customer => 
        customer.phone === phone || customer.name === name
    );
    
    if (!existingCustomer) {
        const newCustomer = {
            id: Date.now(),
            name: name,
            phone: phone,
            createdAt: new Date().toISOString(),
            lastVisit: new Date().toISOString()
        };
        customers.push(newCustomer);
        localStorage.setItem('customers', JSON.stringify(customers));
    } else {
        // Update last visit
        existingCustomer.lastVisit = new Date().toISOString();
        localStorage.setItem('customers', JSON.stringify(customers));
    }
}

// Reset forms
function resetAppointmentForm() {
    document.getElementById('subcategory-group').style.display = 'none';
    document.getElementById('staff-group').style.display = 'none';
    document.getElementById('customer-suggestions').style.display = 'none';
}

function resetPhoneAppointmentForm() {
    document.getElementById('phoneSubcategoryGroup').style.display = 'none';
    document.getElementById('phoneStaffGroup').style.display = 'none';
    document.getElementById('phone-customer-suggestions').style.display = 'none';
}

// Show phone appointment modal
function showPhoneAppointmentModal() {
    document.getElementById('phoneAppointmentModal').style.display = 'block';
}

// Export functions for global access
window.showLoginModal = showLoginModal;
window.showRegisterModal = showRegisterModal;
window.closeModal = closeModal;
window.scrollToAppointment = scrollToAppointment;
window.updateAppointmentStatus = updateAppointmentStatus;
window.deleteAppointment = deleteAppointment;
window.sendWhatsAppMessage = sendWhatsAppMessage;
window.showTab = showTab;
window.showAdminPanel = showAdminPanel;
window.logout = logout;
window.toggleMobileMenu = toggleMobileMenu;
window.closeMobileMenu = closeMobileMenu;
window.showPhoneAppointmentModal = showPhoneAppointmentModal;
window.selectCustomer = selectCustomer;
window.selectPhoneCustomer = selectPhoneCustomer;
