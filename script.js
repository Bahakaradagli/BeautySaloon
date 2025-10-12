// Global variables
let appointments = JSON.parse(localStorage.getItem('appointments')) || [];
let users = JSON.parse(localStorage.getItem('users')) || [];
let currentUser = JSON.parse(localStorage.getItem('currentUser')) || null;
let customers = JSON.parse(localStorage.getItem('customers')) || [];
let services = JSON.parse(localStorage.getItem('services')) || [];
let staff = JSON.parse(localStorage.getItem('staff')) || [];
let settings = JSON.parse(localStorage.getItem('settings')) || {
    autoConfirm: false,
    whatsappReminder: true,
    reminderHours: 6
};

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

// Initialize the app
document.addEventListener('DOMContentLoaded', function() {
    initializeApp();
    setupEventListeners();
    loadAppointments();
    setupScrollEffects();
});

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
    
    // Service category change
    document.getElementById('service-category').addEventListener('change', handleServiceCategoryChange);
    document.getElementById('phoneServiceCategory').addEventListener('change', handlePhoneServiceCategoryChange);
    
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
        localStorage.setItem('appointments', JSON.stringify(appointments));
        
        // Add customer if new
        addCustomerIfNew(appointment.name, appointment.phone);
        
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
function handleLogin(e) {
    e.preventDefault();
    
    const formData = new FormData(e.target);
    const email = formData.get('email');
    const password = formData.get('password');
    
    const user = users.find(u => u.email === email && u.password === password);
    
    if (user) {
        currentUser = user;
        localStorage.setItem('currentUser', JSON.stringify(currentUser));
        closeModal('loginModal');
        updateNavForLoggedInUser();
        showSuccessMessage('Başarıyla giriş yaptınız!');
    } else {
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
            <h2>Yönetim Paneli</h2>
            <div class="admin-tabs">
                <button class="tab-btn active" onclick="showTab('appointments')">Randevular</button>
                <button class="tab-btn" onclick="showTab('revenue')">Gelir-Gider</button>
                <button class="tab-btn" onclick="showTab('customers')">Müşteriler</button>
            </div>
            <div id="appointments-tab" class="tab-content active">
                <h3>Randevu Listesi</h3>
                <div id="appointments-list"></div>
            </div>
            <div id="revenue-tab" class="tab-content">
                <h3>Gelir-Gider Takibi</h3>
                <div class="revenue-stats">
                    <div class="stat-card">
                        <h4>Toplam Gelir</h4>
                        <span id="total-revenue">0₺</span>
                    </div>
                    <div class="stat-card">
                        <h4>Bu Ay</h4>
                        <span id="monthly-revenue">0₺</span>
                    </div>
                </div>
                <div id="revenue-list"></div>
            </div>
            <div id="customers-tab" class="tab-content">
                <h3>Müşteri Listesi</h3>
                <div id="customers-list"></div>
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
    const totalRevenue = appointments
        .filter(apt => apt.status === 'completed')
        .reduce((sum, apt) => {
            const servicePrices = {
                'haircut': 150,
                'makeup': 200,
                'manicure': 100,
                'skincare': 300
            };
            return sum + (servicePrices[apt.service] || 0);
        }, 0);
    
    document.getElementById('total-revenue').textContent = totalRevenue + '₺';
    
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
        .reduce((sum, apt) => {
            const servicePrices = {
                'haircut': 150,
                'makeup': 200,
                'manicure': 100,
                'skincare': 300
            };
            return sum + (servicePrices[apt.service] || 0);
        }, 0);
    
    document.getElementById('monthly-revenue').textContent = monthlyRevenue + '₺';
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
                appointments: []
            });
        }
        customerMap.get(apt.phone).appointments.push(apt);
    });
    
    const customersHTML = Array.from(customerMap.values()).map(customer => `
        <div class="customer-item">
            <div class="customer-info">
                <h4>${customer.name}</h4>
                <p>Tel: ${customer.phone}</p>
                <p>Toplam Randevu: ${customer.appointments.length}</p>
            </div>
            <div class="customer-actions">
                <button onclick="sendWhatsAppMessage('${customer.phone}')" class="btn-whatsapp">
                    <i class="fab fa-whatsapp"></i> WhatsApp
                </button>
            </div>
        </div>
    `).join('');
    
    customersList.innerHTML = customersHTML;
}

// Send WhatsApp message
function sendWhatsAppMessage(appointment) {
    const message = `Merhaba ${appointment.name}! Randevunuz alındı. Tarih: ${appointment.date}, Saat: ${appointment.time}. Teşekkürler!`;
    const phone = appointment.phone || appointment;
    const whatsappUrl = `https://wa.me/90${phone.replace(/\D/g, '')}?text=${encodeURIComponent(message)}`;
    window.open(whatsappUrl, '_blank');
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

// Service category change handlers
function handleServiceCategoryChange(e) {
    const category = e.target.value;
    const subcategoryGroup = document.getElementById('subcategory-group');
    const subcategorySelect = document.getElementById('service-subcategory');
    const staffGroup = document.getElementById('staff-group');
    const staffSelect = document.getElementById('staff');
    
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
    const timeSelect = document.getElementById('time');
    
    if (date) {
        generateTimeSlots(date, timeSelect);
    }
}

function handlePhoneDateChange(e) {
    const date = e.target.value;
    const timeSelect = document.getElementById('phoneTime');
    
    if (date) {
        generateTimeSlots(date, timeSelect);
    }
}

// Generate time slots
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
