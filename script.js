// Global variables
let appointments = JSON.parse(localStorage.getItem('appointments')) || [];
let users = JSON.parse(localStorage.getItem('users')) || [];
let currentUser = JSON.parse(localStorage.getItem('currentUser')) || null;

// Initialize the app
document.addEventListener('DOMContentLoaded', function() {
    initializeApp();
    setupEventListeners();
    loadAppointments();
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
    
    // Login form
    document.getElementById('loginForm').addEventListener('submit', handleLogin);
    
    // Register form
    document.getElementById('registerForm').addEventListener('submit', handleRegister);
    
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
    const appointment = {
        id: Date.now(),
        name: formData.get('name'),
        phone: formData.get('phone'),
        service: formData.get('service'),
        date: formData.get('date'),
        time: formData.get('time'),
        notes: formData.get('notes'),
        status: 'pending',
        createdAt: new Date().toISOString()
    };
    
    // Validate appointment
    if (validateAppointment(appointment)) {
        appointments.push(appointment);
        localStorage.setItem('appointments', JSON.stringify(appointments));
        
        // Show success message
        showSuccessMessage('Randevunuz başarıyla alındı! En kısa sürede sizinle iletişime geçeceğiz.');
        
        // Send WhatsApp message
        sendWhatsAppMessage(appointment);
        
        // Reset form
        e.target.reset();
        
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
