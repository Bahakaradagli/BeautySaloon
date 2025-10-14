// Global variables
let appointments = [];
let users = [];
let currentUser = null;
let customers = [];
let services = [];
let staff = [];
let staffSalaries = []; // Personel maaş bilgileri
let staffAccounts = []; // Personel hesapları
let staffAvailability = []; // Personel müsaitlik bilgileri
let staffAppointments = []; // Personel atanan randevular
let invoices = []; // Adisyon/fatura sistemi
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
let get = null;
let set = null;
let ref = null;
let push = null;
let remove = null;

// Service categories and subcategories
// Service categories - Start with empty object, will be loaded from Firebase
let serviceCategories = {};

// Staff data - Start with empty array, will be loaded from Firebase
const defaultStaff = [];

// Admin user will be created in Firebase
const adminUser = {
    id: 1,
    name: 'Admin',
    email: 'admingülcemal@gmail.com',
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
    // Force hide admin panel on page load
    const adminPanel = document.getElementById('admin-panel');
    if (adminPanel) {
        adminPanel.style.display = 'none';
        adminPanel.style.visibility = 'hidden';
    }
    
    // Setup event listeners first
    setupEventListeners();
    
    // Check if user is already logged in on page load
    checkUserLoginStatus();
    
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
                
                console.log('Firebase database functions loaded:', { get: !!get, set: !!set, ref: !!ref, push: !!push, remove: !!remove });
                console.log('Database object:', database);
                
                clearInterval(checkFirebase);
                
                // Initialize admin user
                initializeAdminUser();
                
                // Load data from Firebase
                loadDataFromFirebase();
                
                // Setup scroll effects
                setupScrollEffects();
                
                // Request notification permission
                requestNotificationPermission();
                
                // Auto-fill appointment form for logged-in users
                autoFillAppointmentForm();
                
                // Check for reminders every 5 minutes
                setInterval(checkReminders, 5 * 60 * 1000);
            }).catch(error => {
                console.error('Firebase import failed:', error);
                clearInterval(checkFirebase);
                
                // Fallback to localStorage
                loadDataFromLocalStorage();
                setupScrollEffects();
                requestNotificationPermission();
                autoFillAppointmentForm();
            });
        }
    }, 100);
});

// Check if user is logged in and get user info
function getLoggedInUser() {
    const currentUser = localStorage.getItem('currentUser');
    if (currentUser) {
        try {
            return JSON.parse(currentUser);
        } catch (error) {
            console.error('Error parsing current user:', error);
            return null;
        }
    }
    return null;
}

// Auto-fill appointment form for logged-in users
function autoFillAppointmentForm() {
    const user = getLoggedInUser();
    if (user) {
        // Fill the form fields
        const firstNameInput = document.getElementById('firstName');
        const lastNameInput = document.getElementById('lastName');
        const phoneInput = document.getElementById('phone');
        
        if (firstNameInput) firstNameInput.value = user.firstName || '';
        if (lastNameInput) lastNameInput.value = user.lastName || '';
        if (phoneInput) phoneInput.value = user.phone || '';
        
        // Show a subtle indicator that the form is pre-filled
        if (firstNameInput && lastNameInput && phoneInput) {
            showInfoMessage('Form bilgileriniz otomatik olarak dolduruldu.');
        }
    }
}

// Load services for homepage
async function loadHomepageServices() {
    const servicesGrid = document.getElementById('services-grid');
    if (!servicesGrid) return;
    
    try {
        // Load service categories from Firebase
        await loadServiceCategoriesFromFirebase();
        
        let servicesHTML = '';
        
        if (Object.keys(serviceCategories).length === 0) {
            servicesHTML = `
                <div class="empty-services">
                    <i class="fas fa-spa"></i>
                    <h3>Henüz hizmet eklenmemiş</h3>
                    <p>Hizmetler yakında eklenecek</p>
                </div>
            `;
        } else {
            // Generate services from categories and subcategories
            Object.values(serviceCategories).forEach(category => {
                // Show category card
                servicesHTML += `
                    <div class="service-category-card">
                        <div class="category-header">
                            <h3>${category.name}</h3>
                        </div>
                        <div class="subcategories-grid">
                `;
                
                // Show subcategories
                if (category.subcategories && category.subcategories.length > 0) {
                    category.subcategories.forEach(subcategory => {
                        servicesHTML += `
                            <div class="subcategory-card" onclick="selectServiceForAppointment('${subcategory.name}', ${subcategory.price}, ${subcategory.duration})">
                                <h4>${subcategory.name}</h4>
                                <div class="subcategory-details">
                                    <span class="price">${subcategory.price}₺</span>
                                    <span class="duration">${subcategory.duration}dk</span>
                                </div>
                            </div>
                        `;
                    });
                } else {
                    servicesHTML += `
                        <div class="no-subcategories">
                            <p>Bu kategoride henüz hizmet yok</p>
                        </div>
                    `;
                }
                
                servicesHTML += `
                        </div>
                    </div>
                `;
            });
        }
        
        servicesGrid.innerHTML = servicesHTML;
    } catch (error) {
        console.error('Error loading homepage services:', error);
        servicesGrid.innerHTML = `
            <div class="error-services">
                <i class="fas fa-exclamation-triangle"></i>
                <h3>Hizmetler yüklenemedi</h3>
                <p>Lütfen sayfayı yenileyin</p>
            </div>
        `;
    }
}

// Load service categories for appointment form
async function loadAppointmentServiceCategories() {
    const categoryCards = document.getElementById('service-category-cards');
    if (!categoryCards) return;
    
    try {
        // Load service categories from Firebase
        await loadServiceCategoriesFromFirebase();
        
        let categoriesHTML = '';
        
        if (Object.keys(serviceCategories).length === 0) {
            categoriesHTML = `
                <div class="empty-categories">
                    <i class="fas fa-spa"></i>
                    <h3>Henüz hizmet kategorisi yok</h3>
                    <p>Hizmet kategorileri yakında eklenecek</p>
                </div>
            `;
        } else {
            // Generate categories from Firebase data
            Object.entries(serviceCategories).forEach(([categoryKey, category]) => {
                categoriesHTML += `
                    <div class="service-category-card" data-category="${categoryKey}" onclick="selectServiceCategory('${categoryKey}')">
                        <h4>${category.name}</h4>
                    </div>
                `;
            });
        }
        
        categoryCards.innerHTML = categoriesHTML;
    } catch (error) {
        console.error('Error loading appointment service categories:', error);
        categoryCards.innerHTML = `
            <div class="error-categories">
                <i class="fas fa-exclamation-triangle"></i>
                <h3>Hizmet kategorileri yüklenemedi</h3>
                <p>Lütfen sayfayı yenileyin</p>
            </div>
        `;
    }
}

// Select service category
function selectServiceCategory(categoryKey) {
    // Remove previous selection
    document.querySelectorAll('.service-category-card').forEach(card => {
        card.classList.remove('selected');
    });
    
    // Add selection to clicked card
    const selectedCard = document.querySelector(`[data-category="${categoryKey}"]`);
    if (selectedCard) {
        selectedCard.classList.add('selected');
    }
    
    // Set hidden input value
    document.getElementById('service-category').value = categoryKey;
    
    // Load subcategories
    loadAppointmentSubcategories(categoryKey);
    
    // Show subcategory group
    document.getElementById('subcategory-group').style.display = 'block';
}

// Load subcategories for selected category
function loadAppointmentSubcategories(categoryKey) {
    const subcategoryCards = document.getElementById('subcategory-cards');
    if (!subcategoryCards) return;
    
    const category = serviceCategories[categoryKey];
    if (!category || !category.subcategories) {
        subcategoryCards.innerHTML = `
            <div class="no-subcategories">
                <i class="fas fa-info-circle"></i>
                <p>Bu kategoride henüz alt hizmet yok</p>
            </div>
        `;
        return;
    }
    
    let subcategoriesHTML = '';
    category.subcategories.forEach((subcategory, index) => {
        subcategoriesHTML += `
            <div class="service-category-card subcategory-card" data-subcategory="${subcategory.value || subcategory.name}" onclick="selectServiceSubcategory('${subcategory.value || subcategory.name}')">
                <h4>${subcategory.name}</h4>
                <div class="subcategory-info">
                    <span class="price">${subcategory.price}₺</span>
                    <span class="duration">${subcategory.duration}dk</span>
                </div>
            </div>
        `;
    });
    
    subcategoryCards.innerHTML = subcategoriesHTML;
}

// Select service subcategory
function selectServiceSubcategory(subcategoryValue) {
    // Remove previous selection
    document.querySelectorAll('.subcategory-card').forEach(card => {
        card.classList.remove('selected');
    });
    
    // Add selection to clicked card
    const selectedCard = document.querySelector(`[data-subcategory="${subcategoryValue}"]`);
    if (selectedCard) {
        selectedCard.classList.add('selected');
    }
    
    // Set hidden input value
    document.getElementById('service-subcategory').value = subcategoryValue;
    
    // Store service details in data attributes for later use
    const serviceCategory = document.getElementById('service-category').value;
    if (serviceCategory && serviceCategories[serviceCategory]) {
        const serviceDetails = serviceCategories[serviceCategory].subcategories.find(sub => 
            sub.value === subcategoryValue || sub.name === subcategoryValue
        );
        
        console.log('Service category:', serviceCategory);
        console.log('Subcategory value:', subcategoryValue);
        console.log('Service details found:', serviceDetails);
        
        if (serviceDetails) {
            // Store service details in hidden inputs
            const serviceNameInput = document.getElementById('service-name');
            const servicePriceInput = document.getElementById('service-price');
            const serviceDurationInput = document.getElementById('service-duration');
            
            if (serviceNameInput) {
                serviceNameInput.value = serviceDetails.name;
                console.log('Service name set:', serviceDetails.name);
            }
            if (servicePriceInput) {
                servicePriceInput.value = serviceDetails.price;
                console.log('Service price set:', serviceDetails.price);
            }
            if (serviceDurationInput) {
                serviceDurationInput.value = serviceDetails.duration;
                console.log('Service duration set:', serviceDetails.duration);
            }
        } else {
            console.warn('Service details not found for:', subcategoryValue);
        }
    } else {
        console.warn('Service category not found:', serviceCategory);
    }
}

// Select service for appointment
function selectServiceForAppointment(serviceName, servicePrice, serviceDuration) {
    // Fill the appointment form with selected service
    const serviceSelect = document.getElementById('service');
    if (serviceSelect) {
        // Create option if it doesn't exist
        let option = serviceSelect.querySelector(`option[value="${serviceName}"]`);
        if (!option) {
            option = document.createElement('option');
            option.value = serviceName;
            option.textContent = serviceName;
            serviceSelect.appendChild(option);
        }
        serviceSelect.value = serviceName;
    }
    
    // Update price and duration if fields exist
    const priceField = document.getElementById('price');
    if (priceField) {
        priceField.value = servicePrice;
    }
    
    const durationField = document.getElementById('duration');
    if (durationField) {
        durationField.value = serviceDuration;
    }
    
    // Scroll to appointment section
    document.getElementById('appointment').scrollIntoView({ behavior: 'smooth' });
    
    // Show success message
    showSuccessMessage('Hizmet seçildi! Randevu formunu doldurun.');
}

// Firebase data management functions
async function loadDataFromFirebase() {
    try {
        if (!database || !get || !ref || !set) {
            console.warn('Firebase database functions not available, loading from localStorage');
            loadFromLocalStorage();
            return;
        }
        
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
        
        // Load service categories
        console.log('Loading service categories from Firebase...');
        await loadServiceCategoriesFromFirebase();
        console.log('After Firebase load, categories count:', Object.keys(serviceCategories).length);
        
        // If no categories loaded from Firebase, try localStorage
        if (Object.keys(serviceCategories).length === 0) {
            console.log('No categories from Firebase, trying localStorage...');
            loadServiceCategoriesFromLocalStorage();
            console.log('After localStorage load, categories count:', Object.keys(serviceCategories).length);
        }
        
        console.log('Firebase data loaded successfully from AbeautySaloon');
        
        // Load homepage services
        await loadHomepageServices();
        
        // Load appointment form service categories
        await loadAppointmentServiceCategories();
        
        // Check remember me
        checkRememberMe();
    } catch (error) {
        console.error('Error loading data from Firebase:', error);
        // Fallback to localStorage
        loadFromLocalStorage();
        
        // Still try to load homepage services and appointment categories
        await loadHomepageServices();
        await loadAppointmentServiceCategories();
        
        // Check remember me
        checkRememberMe();
    }
}

// Check user login status on page load
function checkUserLoginStatus() {
    // Load current user from localStorage
    const savedUser = localStorage.getItem('currentUser');
    if (savedUser) {
        try {
            currentUser = JSON.parse(savedUser);
            console.log('User found in localStorage:', currentUser);
            
            // Update navigation for logged in user
            updateNavForLoggedInUser();
        } catch (error) {
            console.error('Error parsing saved user:', error);
            localStorage.removeItem('currentUser');
        }
    }
}

// Check remember me functionality
function checkRememberMe() {
    const rememberMe = localStorage.getItem('rememberMe');
    const rememberedEmail = localStorage.getItem('rememberedEmail');
    
    if (rememberMe === 'true' && rememberedEmail) {
        // Auto-fill email in login form
        const loginEmailInput = document.getElementById('loginEmail');
        if (loginEmailInput) {
            loginEmailInput.value = rememberedEmail;
        }
        
        // Check if user is already logged in
        if (currentUser) {
            updateNavForLoggedInUser();
        }
    }
}

function loadFromLocalStorage() {
    // Load from localStorage as fallback, but prefer Firebase data
    appointments = JSON.parse(localStorage.getItem('appointments')) || [];
    users = JSON.parse(localStorage.getItem('users')) || [];
    currentUser = JSON.parse(localStorage.getItem('currentUser')) || null;
    customers = JSON.parse(localStorage.getItem('customers')) || [];
    services = JSON.parse(localStorage.getItem('services')) || [];
    staff = JSON.parse(localStorage.getItem('staff')) || [];
    staffSalaries = JSON.parse(localStorage.getItem('staffSalaries')) || [];
    staffAccounts = JSON.parse(localStorage.getItem('staffAccounts')) || [];
    staffAvailability = JSON.parse(localStorage.getItem('staffAvailability')) || [];
    invoices = JSON.parse(localStorage.getItem('invoices')) || [];
    settings = JSON.parse(localStorage.getItem('settings')) || settings;
    expenses = JSON.parse(localStorage.getItem('expenses')) || [];
    transactions = JSON.parse(localStorage.getItem('transactions')) || [];
    
    // Load service categories from localStorage
    loadServiceCategoriesFromLocalStorage();
}

// Save data to Firebase
async function saveToFirebase(dataType, data) {
    try {
        if (database && set && ref) {
            const basePath = 'AbeautySaloon';
            await set(ref(database, `${basePath}/${dataType}`), data);
            console.log(`${dataType} saved to Firebase under AbeautySaloon`);
        } else {
            console.warn('Firebase database functions not available, saving to localStorage only');
        }
    } catch (error) {
        console.error(`Error saving ${dataType} to Firebase:`, error);
    }
    
    // Always save to localStorage as backup
    localStorage.setItem(dataType, JSON.stringify(data));
}

// Firebase Service Categories Management
async function saveServiceCategoriesToFirebase() {
    try {
        if (database && set && ref) {
            const basePath = 'AbeautySaloon/serviceCategories';
            await set(ref(database, basePath), serviceCategories);
            console.log('Service categories saved to Firebase');
        } else {
            console.warn('Firebase database functions not available, saving to localStorage only');
            localStorage.setItem('serviceCategories', JSON.stringify(serviceCategories));
        }
    } catch (error) {
        console.error('Error saving service categories to Firebase:', error);
        // Fallback to localStorage
        localStorage.setItem('serviceCategories', JSON.stringify(serviceCategories));
        throw error;
    }
}

async function loadServiceCategoriesFromFirebase() {
    try {
        if (database && get && ref) {
            const basePath = 'AbeautySaloon/serviceCategories';
            const snapshot = await get(ref(database, basePath));
            if (snapshot.exists()) {
                const firebaseCategories = snapshot.val();
                // Replace the entire serviceCategories object with Firebase data
                serviceCategories = firebaseCategories;
                
                // Ensure all categories have subcategories array
                Object.keys(serviceCategories).forEach(key => {
                    if (!serviceCategories[key].subcategories || !Array.isArray(serviceCategories[key].subcategories)) {
                        serviceCategories[key].subcategories = [];
                    }
                });
                
                console.log('Service categories loaded from Firebase:', serviceCategories);
            } else {
                console.log('No service categories found in Firebase, using default data');
            }
        } else {
            console.warn('Firebase database functions not available, loading from localStorage');
            loadServiceCategoriesFromLocalStorage();
        }
    } catch (error) {
        console.error('Error loading service categories from Firebase:', error);
        // Fallback to localStorage
        loadServiceCategoriesFromLocalStorage();
    }
}

function loadServiceCategoriesFromLocalStorage() {
    try {
        const localCategories = localStorage.getItem('serviceCategories');
        if (localCategories) {
            const parsed = JSON.parse(localCategories);
            serviceCategories = parsed;
            
            // Ensure all categories have subcategories array
            Object.keys(serviceCategories).forEach(key => {
                if (!serviceCategories[key].subcategories || !Array.isArray(serviceCategories[key].subcategories)) {
                    serviceCategories[key].subcategories = [];
                }
            });
            
            console.log('Service categories loaded from localStorage:', serviceCategories);
        } else {
            console.log('No service categories found in localStorage, using default data');
        }
    } catch (error) {
        console.error('Error loading service categories from localStorage:', error);
    }
}


async function updateServiceCategoryInFirebase(categoryKey, categoryData) {
    try {
        if (database && set && ref) {
            const basePath = `AbeautySaloon/serviceCategories/${categoryKey}`;
            await set(ref(database, basePath), categoryData);
            console.log(`Service category ${categoryKey} updated in Firebase`);
        } else {
            console.warn('Firebase database functions not available, saving to localStorage only');
            localStorage.setItem('serviceCategories', JSON.stringify(serviceCategories));
        }
    } catch (error) {
        console.error('Error updating service category in Firebase:', error);
        // Fallback to localStorage
        localStorage.setItem('serviceCategories', JSON.stringify(serviceCategories));
        throw error;
    }
}

async function deleteServiceCategoryFromFirebase(categoryKey) {
    try {
        if (database && remove && ref) {
            const basePath = `AbeautySaloon/serviceCategories/${categoryKey}`;
            await remove(ref(database, basePath));
            console.log(`Service category ${categoryKey} deleted from Firebase`);
        } else {
            console.warn('Firebase database functions not available, saving to localStorage only');
            localStorage.setItem('serviceCategories', JSON.stringify(serviceCategories));
        }
    } catch (error) {
        console.error('Error deleting service category from Firebase:', error);
        // Fallback to localStorage
        localStorage.setItem('serviceCategories', JSON.stringify(serviceCategories));
        throw error;
    }
}

async function addSubcategoryToFirebase(categoryKey, subcategoryData) {
    try {
        if (database && set && ref) {
            // Instead of using push, update the entire category with the new subcategories array
            const categoryData = serviceCategories[categoryKey];
            const basePath = `AbeautySaloon/serviceCategories/${categoryKey}`;
            await set(ref(database, basePath), categoryData);
            console.log(`Subcategory added to Firebase for category ${categoryKey}`);
        } else {
            console.warn('Firebase database functions not available, saving to localStorage only');
            localStorage.setItem('serviceCategories', JSON.stringify(serviceCategories));
        }
    } catch (error) {
        console.error('Error adding subcategory to Firebase:', error);
        // Fallback to localStorage
        localStorage.setItem('serviceCategories', JSON.stringify(serviceCategories));
        throw error;
    }
}

async function updateSubcategoryInFirebase(categoryKey, subcategoryIndex, subcategoryData) {
    try {
        if (database && set && ref) {
            // Update the entire category with the updated subcategories array
            const categoryData = serviceCategories[categoryKey];
            const basePath = `AbeautySaloon/serviceCategories/${categoryKey}`;
            await set(ref(database, basePath), categoryData);
            console.log(`Subcategory ${subcategoryIndex} updated in Firebase for category ${categoryKey}`);
        } else {
            console.warn('Firebase database functions not available, saving to localStorage only');
            localStorage.setItem('serviceCategories', JSON.stringify(serviceCategories));
        }
    } catch (error) {
        console.error('Error updating subcategory in Firebase:', error);
        // Fallback to localStorage
        localStorage.setItem('serviceCategories', JSON.stringify(serviceCategories));
        throw error;
    }
}

async function deleteSubcategoryFromFirebase(categoryKey, subcategoryIndex) {
    try {
        if (database && set && ref) {
            // Update the entire category with the updated subcategories array
            const categoryData = serviceCategories[categoryKey];
            const basePath = `AbeautySaloon/serviceCategories/${categoryKey}`;
            await set(ref(database, basePath), categoryData);
            console.log(`Subcategory ${subcategoryIndex} deleted from Firebase for category ${categoryKey}`);
        } else {
            console.warn('Firebase database functions not available, saving to localStorage only');
            localStorage.setItem('serviceCategories', JSON.stringify(serviceCategories));
        }
    } catch (error) {
        console.error('Error deleting subcategory from Firebase:', error);
        // Fallback to localStorage
        localStorage.setItem('serviceCategories', JSON.stringify(serviceCategories));
        throw error;
    }
}

// Initialize app
function initializeApp() {
    // Set minimum date to today
    const today = new Date().toISOString().split('T')[0];
    const dateInput = document.getElementById('date');
    if (dateInput) {
        dateInput.setAttribute('min', today);
    }
    
    // Ensure admin panel is hidden by default
    const adminPanel = document.getElementById('admin-panel');
    if (adminPanel) {
        adminPanel.style.display = 'none';
        adminPanel.style.visibility = 'hidden';
    }
    
    // Check if user is logged in
    if (currentUser) {
        updateNavForLoggedInUser();
    } else {
        // If no user is logged in, ensure regular view is shown
        showRegularView();
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
    
    // Service category cards
    document.querySelectorAll('.service-category-card').forEach(card => {
        card.addEventListener('click', handleServiceCategoryCardClick);
    });
    
    
    // Customer name input for suggestions
    const nameInput = document.getElementById('name');
    if (nameInput) nameInput.addEventListener('input', handleCustomerNameInput);
    
    
    // Date change for time slots
    const dateInput = document.getElementById('date');
    if (dateInput) dateInput.addEventListener('change', handleDateChange);
    
    
    // Turkish phone number formatting
    const regPhoneInput = document.getElementById('regPhone');
    if (regPhoneInput) {
        regPhoneInput.addEventListener('input', function(e) {
            formatTurkishPhone(e.target);
        });
    }
    
    
    const mainPhoneInput = document.getElementById('phone');
    if (mainPhoneInput) {
        mainPhoneInput.addEventListener('input', function(e) {
            formatTurkishPhone(e.target);
        });
    }
    
    // Password confirmation validation
    const regConfirmPasswordInput = document.getElementById('regConfirmPassword');
    if (regConfirmPasswordInput) {
        regConfirmPasswordInput.addEventListener('input', function(e) {
            const password = document.getElementById('regPassword').value;
            const confirmPassword = e.target.value;
            
            if (confirmPassword && password !== confirmPassword) {
                e.target.setCustomValidity('Şifreler eşleşmiyor');
            } else {
                e.target.setCustomValidity('');
            }
        });
    }
    
    // Real-time password validation
    const regPasswordInput = document.getElementById('regPassword');
    if (regPasswordInput) {
        regPasswordInput.addEventListener('input', function(e) {
            const confirmPassword = document.getElementById('regConfirmPassword');
            if (confirmPassword && confirmPassword.value && e.target.value !== confirmPassword.value) {
                confirmPassword.setCustomValidity('Şifreler eşleşmiyor');
            } else if (confirmPassword) {
                confirmPassword.setCustomValidity('');
            }
        });
    }
    
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
    
    // Close profile dropdown when clicking outside
    document.addEventListener('click', function(e) {
        const profileDropdown = document.getElementById('profile-dropdown');
        const profileToggle = document.querySelector('.profile-toggle');
        
        if (profileDropdown && profileToggle && !profileDropdown.contains(e.target) && !profileToggle.contains(e.target)) {
            closeProfileDropdown();
        }
    });
}

// Handle appointment form submission
async function handleAppointmentSubmit(e) {
    e.preventDefault();
    
    // Check if user is logged in
    if (!currentUser) {
        showErrorMessage('Randevu oluşturmak için giriş yapmanız gerekiyor.');
        // Show login modal
        showLoginModal();
        return;
    }
    
    const formData = new FormData(e.target);
    const serviceCategory = formData.get('service-category');
    const serviceSubcategory = formData.get('service-subcategory');
    const selectedStaff = formData.get('staff');
    const autoConfirm = true; // Always auto-confirm appointments
    
    // Get service details from hidden inputs first, then fallback to serviceCategories
    const serviceName = formData.get('service-name') || '';
    const servicePrice = parseFloat(formData.get('service-price')) || 0;
    const serviceDuration = parseInt(formData.get('service-duration')) || 30;
    
    // Fallback: try to get from serviceCategories
    const serviceDetails = serviceCategories[serviceCategory]?.subcategories.find(sub => sub.value === serviceSubcategory);
    
    console.log('Creating appointment with staff ID:', selectedStaff, 'type:', typeof selectedStaff);
    console.log('Available staff at creation time:', staff);
    console.log('Service Category:', serviceCategory);
    console.log('Service Subcategory:', serviceSubcategory);
    console.log('Service Name from form:', serviceName);
    console.log('Service Price from form:', servicePrice);
    console.log('Service Duration from form:', serviceDuration);
    console.log('Service Categories:', serviceCategories);
    console.log('Service Details:', serviceDetails);
    
    // Final service details to be saved
    const finalServiceName = serviceName || serviceDetails?.name || serviceSubcategory || 'Hizmet';
    const finalServicePrice = servicePrice || serviceDetails?.price || 0;
    const finalServiceDuration = serviceDuration || serviceDetails?.duration || 30;
    
    console.log('Final service details:', {
        name: finalServiceName,
        price: finalServicePrice,
        duration: finalServiceDuration
    });
    
    const appointment = {
        id: Date.now(),
        firstName: formData.get('firstName'),
        lastName: formData.get('lastName'),
        name: `${formData.get('firstName')} ${formData.get('lastName')}`,
        phone: processPhoneNumber(formData.get('phone')),
        serviceCategory: serviceCategory,
        serviceSubcategory: serviceSubcategory,
        serviceName: finalServiceName,
        servicePrice: finalServicePrice,
        serviceDuration: finalServiceDuration,
        staff: selectedStaff,
        date: formData.get('date'),
        time: formData.get('time'),
        notes: formData.get('notes'),
        status: autoConfirm ? 'confirmed' : 'pending',
        createdAt: new Date().toISOString(),
        source: 'online'
    };
    
    console.log('Created appointment:', appointment);
    
    // Validate appointment
    if (validateAppointment(appointment)) {
        appointments.push(appointment);
        
        // Save to localStorage (fallback)
        localStorage.setItem('appointments', JSON.stringify(appointments));
        
        // Save to Firebase
        await saveToFirebase('appointments', appointments);
        
        // Add customer if new
        await addCustomerIfNew(appointment.name, appointment.phone);
        
        // Show success message
        const message = 'Randevunuz başarıyla alındı ve otomatik olarak onaylandı!';
        showSuccessMessage(message);
        
        // Send WhatsApp message
        sendWhatsAppMessage(appointment);
        
        // Reset form and go back to step 1
        e.target.reset();
        resetAppointmentForm();
        currentStep = 1;
        document.querySelectorAll('.wizard-step').forEach(step => step.classList.remove('active'));
        
        // Show my appointments modal after a short delay
        setTimeout(() => {
            showMyAppointments();
        }, 2000);
        
        // Refresh the page after showing appointments
        setTimeout(() => {
            window.location.reload();
        }, 5000);
        document.querySelectorAll('.progress-step').forEach(step => {
            step.classList.remove('active', 'completed');
        });
        document.getElementById('step-1').classList.add('active');
        document.querySelector('[data-step="1"]').classList.add('active');
        
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
    const rememberMe = formData.get('rememberMe') === 'on';
    
    console.log('Giriş denemesi:', { email, password, rememberMe });
    
    // Validate email format (allowing Turkish characters)
    if (!isValidEmail(email)) {
        showErrorMessage('Geçerli bir e-posta adresi girin!');
        return;
    }
    
    // Check for specific admin credentials
    if (email === 'admingülcemal@gmail.com' && password === '123456789') {
        currentUser = {
            id: 'admin-001',
            name: 'Admin Gülcemal',
            email: 'admingülcemal@gmail.com',
            role: 'admin',
            firstName: 'Admin',
            lastName: 'Gülcemal'
        };
        
        localStorage.setItem('currentUser', JSON.stringify(currentUser));
        
        // Set remember me
        if (rememberMe) {
            localStorage.setItem('rememberMe', 'true');
            localStorage.setItem('rememberedEmail', email);
        } else {
            localStorage.removeItem('rememberMe');
            localStorage.removeItem('rememberedEmail');
        }
        
        closeModal('loginModal');
        updateNavForLoggedInUser();
        showSuccessMessage('Başarıyla giriş yaptınız!');
        
        // Auto-fill appointment form for logged-in user
        autoFillAppointmentForm();
        return;
    }
    
    // For all other users, check regular user database
    const user = users.find(u => u.email === email && u.password === password);
    
    if (user) {
        currentUser = user;
        localStorage.setItem('currentUser', JSON.stringify(currentUser));
        
        // Set remember me
        if (rememberMe) {
            localStorage.setItem('rememberMe', 'true');
            localStorage.setItem('rememberedEmail', email);
        } else {
            localStorage.removeItem('rememberMe');
            localStorage.removeItem('rememberedEmail');
        }
        
        closeModal('loginModal');
        updateNavForLoggedInUser();
        showSuccessMessage('Başarıyla giriş yaptınız!');
        
        // Auto-fill appointment form for logged-in user
        autoFillAppointmentForm();
    } else {
        console.log('Giriş başarısız - kullanıcı bulunamadı');
        showErrorMessage('E-posta veya şifre hatalı!');
    }
}

// Handle registration
async function handleRegister(e) {
    e.preventDefault();
    
    const formData = new FormData(e.target);
    const firstName = formData.get('firstName').trim();
    const lastName = formData.get('lastName').trim();
    const email = formData.get('email').trim();
    const phone = formData.get('phone').trim();
    const password = formData.get('password');
    const confirmPassword = formData.get('confirmPassword');
    
    // Validation
    if (!firstName || !lastName) {
        showErrorMessage('Ad ve soyad alanları zorunludur!');
        return;
    }
    
    if (password !== confirmPassword) {
        showErrorMessage('Şifreler eşleşmiyor!');
        return;
    }
    
    if (password.length < 6) {
        showErrorMessage('Şifre en az 6 karakter olmalıdır!');
        return;
    }
    
    // Validate Turkish phone number (before processing)
    if (!validateTurkishPhone(phone)) {
        showErrorMessage('Geçerli bir Türk telefon numarası girin! (XXX XXX XX XX)');
        return;
    }
    
    // Process phone number to add +90 prefix
    const processedPhone = processPhoneNumber(phone);
    
    const user = {
        id: Date.now(),
        firstName: firstName,
        lastName: lastName,
        name: `${firstName} ${lastName}`,
        email: email,
        phone: processedPhone,
        password: password,
        createdAt: new Date().toISOString()
    };
    
    // Check if user already exists
    const existingUser = users.find(u => u.email === user.email);
    if (existingUser) {
        showErrorMessage('Bu e-posta adresi zaten kayıtlı!');
        return;
    }
    
    // Check if phone already exists
    const existingPhone = users.find(u => u.phone === user.phone);
    if (existingPhone) {
        showErrorMessage('Bu telefon numarası zaten kayıtlı!');
        return;
    }
    
    users.push(user);
    
    // Save to localStorage (fallback)
    localStorage.setItem('users', JSON.stringify(users));
    
    // Save to Firebase
    await saveToFirebase('users', users);
    
    closeModal('registerModal');
    showSuccessMessage('Kayıt başarılı! Şimdi giriş yapabilirsiniz.');
}

// Validate Turkish phone number
function validateTurkishPhone(phone) {
    // Remove all non-digit characters
    const cleanPhone = phone.replace(/\D/g, '');
    
    // Accept 10-digit numbers starting with 5 (Turkish mobile format)
    if (cleanPhone.length === 10 && cleanPhone.startsWith('5')) {
        return true;
    }
    
    // Accept 11-digit numbers starting with 05 (with leading zero)
    if (cleanPhone.length === 11 && cleanPhone.startsWith('05')) {
        return true;
    }
    
    return false;
}

// Validate email format (supporting Turkish characters)
function isValidEmail(email) {
    // Email regex that supports Turkish characters (ü, ğ, ş, ı, ö, ç)
    const emailRegex = /^[a-zA-Z0-9üÜğĞşŞıİöÖçÇ._%+-]+@[a-zA-Z0-9üÜğĞşŞıİöÖçÇ.-]+\.[a-zA-Z]{2,}$/;
    return emailRegex.test(email);
}

// Format Turkish phone number as user types
function formatTurkishPhone(input) {
    let value = input.value.replace(/\D/g, '');
    
    // Remove leading 0 if present
    if (value.startsWith('0')) {
        value = value.substring(1);
    }
    
    // Limit to 10 digits (Turkish mobile number without country code)
    if (value.length > 10) {
        value = value.slice(0, 10);
    }
    
    // Format as XXX XXX XX XX
    if (value.length > 0) {
        if (value.length <= 3) {
            value = value;
        } else if (value.length <= 6) {
            value = value.slice(0, 3) + ' ' + value.slice(3);
        } else if (value.length <= 8) {
            value = value.slice(0, 3) + ' ' + value.slice(3, 6) + ' ' + value.slice(6);
        } else {
            value = value.slice(0, 3) + ' ' + value.slice(3, 6) + ' ' + value.slice(6, 8) + ' ' + value.slice(8);
        }
    }
    
    input.value = value;
}

// Process phone number to add +90 prefix
function processPhoneNumber(phone) {
    if (!phone) return phone;
    
    // Remove all non-digit characters
    let cleanPhone = phone.replace(/\D/g, '');
    
    // Remove leading 0 if present
    if (cleanPhone.startsWith('0')) {
        cleanPhone = cleanPhone.substring(1);
    }
    
    // Add +90 prefix
    return '+90' + cleanPhone;
}

// Update navigation for logged in user
function updateNavForLoggedInUser() {
    console.log('updateNavForLoggedInUser called, currentUser:', currentUser);
    
    if (!currentUser) {
        console.log('No current user, showing regular nav');
        showRegularView();
        return;
    }
    
    const navActions = document.querySelector('.nav-actions');
    const authButtons = document.getElementById('auth-buttons');
    const profileDropdown = document.getElementById('profile-dropdown');
    
    // Check if user is the specific admin
    const isAdmin = currentUser && currentUser.email === 'admingülcemal@gmail.com';
    console.log('Is admin:', isAdmin);
    
    // Hide nav actions for admin
    if (isAdmin) {
        if (navActions) {
            navActions.style.display = 'none';
        }
        console.log('Calling showAdminView for admin user');
        showAdminView();
    } else {
        if (navActions) {
            navActions.style.display = 'flex';
        }
        
        // Hide auth buttons and show profile dropdown
        if (authButtons) {
            authButtons.style.display = 'none';
        }
        if (profileDropdown) {
            profileDropdown.style.display = 'block';
            updateProfileInfo();
        }
        
        console.log('Calling showRegularView for regular user');
        showRegularView();
    }
}

// Show regular view (hide admin panel, show regular sections)
function showRegularView() {
    console.log('showRegularView called');
    
    // Hide admin panel
    const adminPanel = document.getElementById('admin-panel');
    if (adminPanel) {
        adminPanel.style.display = 'none';
        adminPanel.style.visibility = 'hidden';
    }
    
    // Show regular sections
    const sections = ['home', 'services', 'appointment', 'contact', 'footer'];
    sections.forEach(sectionId => {
        const section = document.getElementById(sectionId);
        if (section) {
            section.style.display = 'block';
            section.style.visibility = 'visible';
        }
    });
    
    // Remove admin-mode class from body
    document.body.classList.remove('admin-mode');
}

// Show admin view (hide regular sections, show admin panel)
function showAdminView() {
    console.log('showAdminView called');
    
    // Add admin-mode class to body for CSS control
    document.body.classList.add('admin-mode');
    
    // Hide regular sections with more aggressive hiding
    const homeSection = document.getElementById('home');
    const servicesSection = document.getElementById('services');
    const appointmentSection = document.getElementById('appointment');
    const contactSection = document.getElementById('contact');
    const footerSection = document.getElementById('footer');
    
    if (homeSection) {
        homeSection.style.display = 'none';
        homeSection.style.visibility = 'hidden';
        homeSection.style.height = '0';
        homeSection.style.overflow = 'hidden';
        console.log('Home section hidden');
    }
    if (servicesSection) {
        servicesSection.style.display = 'none';
        servicesSection.style.visibility = 'hidden';
        servicesSection.style.height = '0';
        servicesSection.style.overflow = 'hidden';
        console.log('Services section hidden');
    }
    if (appointmentSection) {
        appointmentSection.style.display = 'none';
        appointmentSection.style.visibility = 'hidden';
        appointmentSection.style.height = '0';
        appointmentSection.style.overflow = 'hidden';
        console.log('Appointment section hidden');
    }
    if (contactSection) {
        contactSection.style.display = 'none';
        contactSection.style.visibility = 'hidden';
        contactSection.style.height = '0';
        contactSection.style.overflow = 'hidden';
        console.log('Contact section hidden');
    }
    if (footerSection) {
        footerSection.style.display = 'none';
        footerSection.style.visibility = 'hidden';
        footerSection.style.height = '0';
        footerSection.style.overflow = 'hidden';
        console.log('Footer section hidden');
    }
    
    // Show admin panel
    const adminPanel = document.getElementById('admin-panel');
    if (adminPanel) {
        adminPanel.style.display = 'block';
        adminPanel.style.visibility = 'visible';
        adminPanel.style.height = 'auto';
        adminPanel.style.overflow = 'visible';
        console.log('Admin panel shown');
        // Load admin data
        loadAdminData();
        // Load default tab (appointments)
        showAdminTab('appointments');
    } else {
        console.error('Admin panel element not found!');
    }
}

// Admin Tab Navigation
function showAdminTab(tabName) {
    // Update active nav item
    document.querySelectorAll('.nav-item').forEach(item => {
        item.classList.remove('active');
    });
    event.target.closest('.nav-item').classList.add('active');
    
    // Update section title and content
    const sectionTitles = {
        'appointments': { title: 'Randevu Yönetimi', icon: 'fas fa-calendar-alt' },
        'revenue': { title: 'Gelir-Gider Takibi', icon: 'fas fa-chart-line' },
        'customers': { title: 'Müşteri Yönetimi', icon: 'fas fa-users' },
        'services': { title: 'Hizmet Yönetimi', icon: 'fas fa-spa' },
        'staff': { title: 'Personel Yönetimi', icon: 'fas fa-user-tie' },
        'settings': { title: 'Sistem Ayarları', icon: 'fas fa-cog' }
    };
    
    const section = sectionTitles[tabName];
    if (section) {
        document.getElementById('admin-section-title').innerHTML = `
            <i class="${section.icon}"></i>
            ${section.title}
        `;
    }
    
    // Load content based on tab
    loadAdminTabContent(tabName);
}

// Load admin tab content
function loadAdminTabContent(tabName) {
    const content = document.getElementById('admin-main-content');
    
    switch(tabName) {
        case 'appointments':
            loadAppointmentsContent();
            break;
        case 'revenue':
            loadRevenueContent();
            break;
        case 'customers':
            loadCustomersContent();
            break;
        case 'services':
            loadServicesContent();
            break;
        case 'staff':
            loadStaffContent();
            break;
        case 'settings':
            loadSettingsContent();
            break;
    }
}

// Load appointments content
function loadAppointmentsContent() {
    const content = document.getElementById('admin-main-content');
    
    // Show admin filters for appointments section
    const adminFilters = document.getElementById('admin-filters');
    if (adminFilters) {
        adminFilters.style.display = 'flex';
    }
    
    const appointmentsHTML = `
        <div class="appointments-management">
            <div class="appointments-stats">
                <div class="stat-card">
                    <h4>Toplam Randevu</h4>
                    <span class="stat-number">${appointments.length}</span>
                </div>
                <div class="stat-card">
                    <h4>Bu Ay</h4>
                    <span class="stat-number">${appointments.filter(apt => {
                        const aptDate = new Date(apt.date);
                        const now = new Date();
                        return aptDate.getMonth() === now.getMonth() && aptDate.getFullYear() === now.getFullYear();
                    }).length}</span>
                </div>
                <div class="stat-card">
                    <h4>Bugün</h4>
                    <span class="stat-number">${appointments.filter(apt => apt.date === new Date().toISOString().split('T')[0]).length}</span>
                </div>
            </div>
            
            <div class="appointments-list">
                <h3>Randevu Listesi</h3>
                <div class="appointments-table-container">
                    <table class="appointments-table">
                        <thead>
                            <tr>
                                <th>Müşteri</th>
                                <th>Tarih</th>
                                <th>Saat</th>
                                <th>Hizmet</th>
                                <th>Personel</th>
                                <th>Telefon</th>
                                <th>Durum</th>
                                <th>İşlemler</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${appointments.map(appointment => `
                                <tr class="appointment-row ${appointment.status}">
                                    <td class="customer-cell">
                                        <div class="customer-info">
                                            <strong>${appointment.name}</strong>
                                            ${appointment.notes ? `<small class="notes">${appointment.notes}</small>` : ''}
                                        </div>
                                    </td>
                                    <td class="date-cell">
                                        <i class="fas fa-calendar"></i>
                                        ${formatDate(appointment.date)}
                                    </td>
                                    <td class="time-cell">
                                        <i class="fas fa-clock"></i>
                                        ${appointment.time}
                                    </td>
                                    <td class="service-cell">
                                        <div class="service-info">
                                            <strong>${appointment.serviceName}</strong>
                                            <small>${appointment.servicePrice}₺ - ${appointment.serviceDuration}dk</small>
                                        </div>
                                    </td>
                                    <td class="staff-cell">
                                        <i class="fas fa-user-md"></i>
                                        ${getStaffName(appointment.staff)}
                                    </td>
                                    <td class="phone-cell">
                                        <i class="fas fa-phone"></i>
                                        ${appointment.phone}
                                    </td>
                                    <td class="status-cell">
                                        <span class="status-badge ${appointment.status}">
                                            ${getStatusText(appointment.status)}
                                        </span>
                                    </td>
                                    <td class="actions-cell">
                                        <div class="table-actions">
                                            <select onchange="updateAppointmentStatus(${appointment.id}, this.value)" class="status-select">
                                                <option value="pending" ${appointment.status === 'pending' ? 'selected' : ''}>Beklemede</option>
                                                <option value="confirmed" ${appointment.status === 'confirmed' ? 'selected' : ''}>Onaylandı</option>
                                                <option value="completed" ${appointment.status === 'completed' ? 'selected' : ''}>Tamamlandı</option>
                                                <option value="cancelled" ${appointment.status === 'cancelled' ? 'selected' : ''}>İptal</option>
                                            </select>
                                            <button class="admin-btn admin-btn-sm admin-btn-whatsapp admin-btn-icon" onclick="sendWhatsAppMessage('${appointment.phone}')" title="WhatsApp">
                                                <i class="fab fa-whatsapp"></i>
                                            </button>
                                            <button class="admin-btn admin-btn-sm admin-btn-delete admin-btn-icon" onclick="deleteAppointment(${appointment.id})" title="Sil">
                                                <i class="fas fa-trash"></i>
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    `;
    
    content.innerHTML = appointmentsHTML;
}

// Load revenue content
function loadRevenueContent() {
    const content = document.getElementById('admin-main-content');
    
    const totalRevenue = appointments
        .filter(apt => apt.status === 'completed')
        .reduce((sum, apt) => sum + (apt.servicePrice || 0), 0);
    
    const monthlyRevenue = appointments
        .filter(apt => {
            const aptDate = new Date(apt.date);
            const now = new Date();
            return apt.status === 'completed' && 
                   aptDate.getMonth() === now.getMonth() && 
                   aptDate.getFullYear() === now.getFullYear();
        })
        .reduce((sum, apt) => sum + (apt.servicePrice || 0), 0);
    
    const contentHTML = `
        <div class="revenue-management">
            <div class="revenue-stats">
                <div class="stat-card">
                    <h4>Toplam Gelir</h4>
                    <span class="stat-number">${totalRevenue}₺</span>
                </div>
                <div class="stat-card">
                    <h4>Bu Ay</h4>
                    <span class="stat-number">${monthlyRevenue}₺</span>
                </div>
                <div class="stat-card">
                    <h4>Toplam Randevu</h4>
                    <span class="stat-number">${appointments.length}</span>
                </div>
            </div>
            
            <div class="revenue-actions">
                <button class="admin-btn admin-btn-md admin-btn-primary" onclick="showAddExpenseModal()">
                    <i class="fas fa-plus"></i> Gider Ekle
                </button>
                <button class="admin-btn admin-btn-md admin-btn-primary" onclick="showRevenueReport()">
                    <i class="fas fa-chart-bar"></i> Rapor
                </button>
            </div>
            
            <div id="revenue-list"></div>
        </div>
    `;
    
    content.innerHTML = contentHTML;
    loadRevenueList();
}

// Load services content
function loadServicesContent() {
    const content = document.getElementById('admin-main-content');
    
    // Hide admin filters for services section
    const adminFilters = document.getElementById('admin-filters');
    if (adminFilters) {
        adminFilters.style.display = 'none';
    }
    
    const contentHTML = `
        <div class="services-management">
            <div class="service-actions">
                <button class="admin-btn admin-btn-md admin-btn-primary" onclick="showAddServiceModal()">
                    <i class="fas fa-plus"></i> Yeni Kategori Ekle
                </button>
                <button class="admin-btn admin-btn-md admin-btn-secondary" onclick="showEditServiceModal()">
                    <i class="fas fa-edit"></i> Kategorileri Düzenle
                </button>
                <button class="admin-btn admin-btn-md admin-btn-info" onclick="exportServices()">
                    <i class="fas fa-download"></i> Hizmetleri Dışa Aktar
                </button>
                <button class="admin-btn admin-btn-md admin-btn-warning" onclick="importServices()">
                    <i class="fas fa-upload"></i> Hizmetleri İçe Aktar
                </button>
            </div>
            
            <div class="services-stats">
                <div class="stat-card">
                    <h4>Toplam Kategori</h4>
                    <span class="stat-number">${Object.keys(serviceCategories).length}</span>
                </div>
                <div class="stat-card">
                    <h4>Toplam Alt Hizmet</h4>
                    <span class="stat-number">${Object.values(serviceCategories).reduce((total, category) => total + category.subcategories.length, 0)}</span>
                </div>
                <div class="stat-card">
                    <h4>Ortalama Fiyat</h4>
                    <span class="stat-number">${calculateAveragePrice()}₺</span>
                </div>
            </div>
            
            <div id="services-list"></div>
        </div>
    `;
    
    content.innerHTML = contentHTML;
    loadServicesList();
}

// Load staff content
function loadStaffContent() {
    const content = document.getElementById('admin-main-content');
    
    const contentHTML = `
        <div class="staff-management">
            <div class="staff-actions">
                <button class="admin-btn admin-btn-md admin-btn-primary" onclick="showAddStaffModal()">
                    <i class="fas fa-plus"></i> Personel Ekle
                </button>
                <button class="admin-btn admin-btn-md admin-btn-secondary" onclick="showStaffSalaryModal()">
                    <i class="fas fa-money-bill-wave"></i> Maaş Yönetimi
                </button>
                <button class="admin-btn admin-btn-md admin-btn-info" onclick="showStaffAccountsModal()">
                    <i class="fas fa-key"></i> Personel Hesapları
                </button>
                <button class="admin-btn admin-btn-md admin-btn-success" onclick="showStaffAvailabilityModal()">
                    <i class="fas fa-calendar-check"></i> Müsaitlik Yönetimi
                </button>
                <button class="admin-btn admin-btn-md admin-btn-warning" onclick="showStaffAppointmentsModal()">
                    <i class="fas fa-calendar-alt"></i> Atanan Randevular
                </button>
            </div>
            <div id="staff-list"></div>
        </div>
    `;
    
    content.innerHTML = contentHTML;
    loadStaffList();
}

// Load customers content
function loadCustomersContent() {
    const content = document.getElementById('admin-main-content');
    // Hide admin filters for customers section
    const adminFilters = document.getElementById('admin-filters');
    if (adminFilters) {
        adminFilters.style.display = 'none';
    }
    
    const contentHTML = `
        <div class="customers-management">
            <div class="customer-actions">
                <button class="admin-btn admin-btn-md admin-btn-whatsapp" onclick="sendBulkWhatsAppMessage()">
                    <i class="fab fa-whatsapp"></i> Toplu Mesaj
                </button>
            </div>
            <div id="customers-list"></div>
        </div>
    `;
    
    content.innerHTML = contentHTML;
    loadCustomersList();
}

// Load settings content
function loadSettingsContent() {
    const content = document.getElementById('admin-main-content');
    
    const contentHTML = `
        <div class="settings-management">
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
    `;
    
    content.innerHTML = contentHTML;
    loadSettings();
}


// Go to home page function
function goToHomePage() {
    logout();
}

// Personel Müsaitlik Yönetimi
function showStaffAvailabilityModal() {
    const modalHTML = `
        <div class="staff-availability-management">
            <h3>Personel Müsaitlik Yönetimi</h3>
            <div class="availability-list">
                ${staff.map(member => {
                    const availability = staffAvailability.find(a => a.staffId === member.id) || { 
                        workingDays: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'],
                        workingHours: { start: '09:00', end: '18:00' },
                        offDays: [],
                        isActive: true
                    };
                    return `
                        <div class="availability-item">
                            <div class="staff-info">
                                <div class="staff-avatar">${member.avatar}</div>
                                <div>
                                    <h4>${member.name}</h4>
                                    <p>${member.specialty}</p>
                                </div>
                            </div>
                            <div class="availability-form">
                                <div class="form-group">
                                    <label>Çalışma Durumu</label>
                                    <select onchange="updateStaffAvailability(${member.id}, 'isActive', this.value)">
                                        <option value="true" ${availability.isActive ? 'selected' : ''}>Aktif</option>
                                        <option value="false" ${!availability.isActive ? 'selected' : ''}>Pasif</option>
                                    </select>
                                </div>
                                <div class="form-group">
                                    <label>Çalışma Günleri</label>
                                    <div class="days-selector">
                                        ${['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'].map(day => `
                                            <label class="day-checkbox">
                                                <input type="checkbox" 
                                                       value="${day}" 
                                                       ${availability.workingDays.includes(day) ? 'checked' : ''}
                                                       onchange="updateWorkingDays(${member.id}, '${day}', this.checked)">
                                                <span>${getDayName(day)}</span>
                                            </label>
                                        `).join('')}
                                    </div>
                                </div>
                                <div class="form-group">
                                    <label>Çalışma Saatleri</label>
                                    <div class="time-inputs">
                                        <input type="time" value="${availability.workingHours.start}" 
                                               onchange="updateWorkingHours(${member.id}, 'start', this.value)">
                                        <span>-</span>
                                        <input type="time" value="${availability.workingHours.end}" 
                                               onchange="updateWorkingHours(${member.id}, 'end', this.value)">
                                    </div>
                                </div>
                                <div class="form-group">
                                    <label>İzin Günleri</label>
                                    <div class="off-days">
                                        <input type="date" id="off-day-${member.id}" class="off-day-input">
                                        <button class="admin-btn admin-btn-sm admin-btn-primary" onclick="addOffDay(${member.id})">
                                            <i class="fas fa-plus"></i> İzin Ekle
                                        </button>
                                    </div>
                                    <div class="off-days-list">
                                        ${availability.offDays.map(day => `
                                            <span class="off-day-tag">
                                                ${formatDate(day)}
                                                <button onclick="removeOffDay(${member.id}, '${day}')">×</button>
                                            </span>
                                        `).join('')}
                                    </div>
                                </div>
                            </div>
                        </div>
                    `;
                }).join('')}
            </div>
        </div>
    `;
    
    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.id = 'staffAvailabilityModal';
    modal.innerHTML = `
        <div class="modal-content large-modal">
            <span class="close" onclick="closeModal('staffAvailabilityModal')">&times;</span>
            ${modalHTML}
        </div>
    `;
    
    document.body.appendChild(modal);
    modal.style.display = 'block';
}

// Personel Atanan Randevular
function showStaffAppointmentsModal() {
    const modalHTML = `
        <div class="staff-appointments-management">
            <h3>Personel Atanan Randevular</h3>
            <div class="appointments-actions">
                <button class="admin-btn admin-btn-md admin-btn-primary" onclick="showManualAppointmentModal()">
                    <i class="fas fa-plus"></i> Manuel Randevu Oluştur
                </button>
            </div>
            <div class="staff-appointments-list">
                ${staff.map(member => {
                    const memberAppointments = appointments.filter(apt => 
                        apt.staffId === member.id && apt.status !== 'cancelled'
                    );
                    return `
                        <div class="staff-appointment-group">
                            <h4>${member.name} - ${memberAppointments.length} Randevu</h4>
                            <div class="appointments-grid">
                                ${memberAppointments.map(appointment => `
                                    <div class="appointment-card" onclick="showAppointmentDetails(${appointment.id})">
                                        <div class="appointment-header">
                                            <h5>${appointment.name}</h5>
                                            <span class="status-badge ${appointment.status}">${getStatusText(appointment.status)}</span>
                                        </div>
                                        <div class="appointment-details">
                                            <p><i class="fas fa-calendar"></i> ${formatDate(appointment.date)}</p>
                                            <p><i class="fas fa-clock"></i> ${appointment.time}</p>
                                            <p><i class="fas fa-spa"></i> ${appointment.serviceName}</p>
                                            <p><i class="fas fa-phone"></i> ${appointment.phone}</p>
                                        </div>
                                        <div class="appointment-actions">
                                            ${appointment.status === 'pending' ? `
                                                <button class="admin-btn admin-btn-sm admin-btn-warning" onclick="cancelAppointment(${appointment.id})">
                                                    <i class="fas fa-times"></i> İptal Et
                                                </button>
                                            ` : ''}
                                            ${appointment.status === 'confirmed' ? `
                                                <button class="admin-btn admin-btn-sm admin-btn-success" onclick="showInvoiceModal(${appointment.id})">
                                                    <i class="fas fa-receipt"></i> Adisyon Aç
                                                </button>
                                            ` : ''}
                                        </div>
                                    </div>
                                `).join('')}
                            </div>
                        </div>
                    `;
                }).join('')}
            </div>
        </div>
    `;
    
    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.id = 'staffAppointmentsModal';
    modal.innerHTML = `
        <div class="modal-content large-modal">
            <span class="close" onclick="closeModal('staffAppointmentsModal')">&times;</span>
            ${modalHTML}
        </div>
    `;
    
    document.body.appendChild(modal);
    modal.style.display = 'block';
}

// Manuel Randevu Oluşturma
function showManualAppointmentModal() {
    const modalHTML = `
        <div class="manual-appointment-form">
            <h3>Manuel Randevu Oluştur</h3>
            <form id="manualAppointmentForm">
                <div class="form-row">
                    <div class="form-group">
                        <label for="manualCustomerName">Müşteri Adı</label>
                        <input type="text" id="manualCustomerName" name="customerName" required>
                    </div>
                    <div class="form-group">
                        <label for="manualCustomerPhone">Telefon</label>
                        <input type="tel" id="manualCustomerPhone" name="customerPhone" required>
                    </div>
                </div>
                <div class="form-row">
                    <div class="form-group">
                        <label for="manualStaff">Personel</label>
                        <select id="manualStaff" name="staffId" required>
                            <option value="">Personel Seçin</option>
                            ${staff.map(member => `
                                <option value="${member.id}">${member.name} - ${member.specialty}</option>
                            `).join('')}
                        </select>
                    </div>
                    <div class="form-group">
                        <label for="manualService">Hizmet</label>
                        <select id="manualService" name="serviceName" required>
                            <option value="">Hizmet Seçin</option>
                            ${Object.values(serviceCategories).flatMap(category => 
                                category.subcategories.map(sub => `
                                    <option value="${sub.name}" data-price="${sub.price}">${sub.name} - ${sub.price}₺</option>
                                `)
                            ).join('')}
                        </select>
                    </div>
                </div>
                <div class="form-row">
                    <div class="form-group">
                        <label for="manualDate">Tarih</label>
                        <input type="date" id="manualDate" name="date" required>
                    </div>
                    <div class="form-group">
                        <label for="manualTime">Saat</label>
                        <input type="time" id="manualTime" name="time" required>
                    </div>
                </div>
                <div class="form-group">
                    <label for="manualNotes">Notlar</label>
                    <textarea id="manualNotes" name="notes" rows="3" placeholder="Randevu notları..."></textarea>
                </div>
                <button type="submit" class="admin-btn admin-btn-md admin-btn-primary">Randevu Oluştur</button>
            </form>
        </div>
    `;
    
    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.id = 'manualAppointmentModal';
    modal.innerHTML = `
        <div class="modal-content">
            <span class="close" onclick="closeModal('manualAppointmentModal')">&times;</span>
            ${modalHTML}
        </div>
    `;
    
    document.body.appendChild(modal);
    modal.style.display = 'block';
    
    // Set today's date as default
    document.getElementById('manualDate').value = new Date().toISOString().split('T')[0];
    
    document.getElementById('manualAppointmentForm').addEventListener('submit', handleManualAppointmentSubmit);
}

// Adisyon Modal
function showInvoiceModal(appointmentId) {
    const appointment = appointments.find(apt => apt.id === appointmentId);
    if (!appointment) return;
    
    const modalHTML = `
        <div class="invoice-form">
            <h3>Adisyon - ${appointment.name}</h3>
            <div class="invoice-details">
                <div class="customer-info">
                    <h4>Müşteri Bilgileri</h4>
                    <p><strong>Ad:</strong> ${appointment.name}</p>
                    <p><strong>Telefon:</strong> ${appointment.phone}</p>
                    <p><strong>Hizmet:</strong> ${appointment.serviceName}</p>
                    <p><strong>Tarih:</strong> ${formatDate(appointment.date)} ${appointment.time}</p>
                </div>
                
                <div class="invoice-items">
                    <h4>Hizmetler</h4>
                    <div class="invoice-item">
                        <span class="item-name">${appointment.serviceName}</span>
                        <span class="item-price">${appointment.servicePrice || 0}₺</span>
                    </div>
                    
                    <div id="additional-services">
                        <!-- Ek hizmetler buraya eklenecek -->
                    </div>
                    
                    <div class="add-service">
                        <select id="additionalServiceSelect">
                            <option value="">Ek Hizmet Seçin</option>
                            ${Object.values(serviceCategories).flatMap(category => 
                                category.subcategories.map(sub => `
                                    <option value="${sub.name}" data-price="${sub.price}">${sub.name} - ${sub.price}₺</option>
                                `)
                            ).join('')}
                        </select>
                        <button type="button" onclick="addAdditionalService()" class="admin-btn admin-btn-sm admin-btn-primary">
                            <i class="fas fa-plus"></i> Ekle
                        </button>
                    </div>
                </div>
                
                <div class="invoice-total">
                    <div class="total-row">
                        <span>Ara Toplam:</span>
                        <span id="subtotal">${appointment.servicePrice || 0}₺</span>
                    </div>
                    <div class="total-row">
                        <span>KDV (%18):</span>
                        <span id="tax">0₺</span>
                    </div>
                    <div class="total-row total">
                        <span>Toplam:</span>
                        <span id="total">${appointment.servicePrice || 0}₺</span>
                    </div>
                </div>
                
                <div class="payment-section">
                    <h4>Ödeme</h4>
                    <div class="payment-methods">
                        <label class="payment-method">
                            <input type="radio" name="paymentMethod" value="cash" checked>
                            <span>Nakit</span>
                        </label>
                        <label class="payment-method">
                            <input type="radio" name="paymentMethod" value="card">
                            <span>Kart</span>
                        </label>
                        <label class="payment-method">
                            <input type="radio" name="paymentMethod" value="transfer">
                            <span>Havale</span>
                        </label>
                    </div>
                </div>
                
                <div class="invoice-actions">
                    <button class="admin-btn admin-btn-md admin-btn-success" onclick="completeAppointment(${appointmentId})">
                        <i class="fas fa-check"></i> Randevuyu Tamamla
                    </button>
                    <button class="admin-btn admin-btn-md admin-btn-secondary" onclick="closeModal('invoiceModal')">
                        <i class="fas fa-times"></i> İptal
                    </button>
                </div>
            </div>
        </div>
    `;
    
    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.id = 'invoiceModal';
    modal.innerHTML = `
        <div class="modal-content large-modal">
            <span class="close" onclick="closeModal('invoiceModal')">&times;</span>
            ${modalHTML}
        </div>
    `;
    
    document.body.appendChild(modal);
    modal.style.display = 'block';
}

// Show regular view (hide admin panel, show regular sections)
function showRegularView() {
    // Remove admin-mode class from body
    document.body.classList.remove('admin-mode');
    
    // Force hide admin panel first
    const adminPanel = document.getElementById('admin-panel');
    if (adminPanel) {
        adminPanel.style.display = 'none';
        adminPanel.style.visibility = 'hidden';
        adminPanel.style.height = '0';
        adminPanel.style.overflow = 'hidden';
    }
    
    // Show regular sections
    const homeSection = document.getElementById('home');
    const servicesSection = document.getElementById('services');
    const appointmentSection = document.getElementById('appointment');
    const contactSection = document.getElementById('contact');
    const footerSection = document.getElementById('footer');
    
    if (homeSection) {
        homeSection.style.display = 'flex';
        homeSection.style.visibility = 'visible';
        homeSection.style.height = 'auto';
        homeSection.style.overflow = 'visible';
    }
    if (servicesSection) {
        servicesSection.style.display = 'block';
        servicesSection.style.visibility = 'visible';
        servicesSection.style.height = 'auto';
        servicesSection.style.overflow = 'visible';
    }
    if (appointmentSection) {
        appointmentSection.style.display = 'block';
        appointmentSection.style.visibility = 'visible';
        appointmentSection.style.height = 'auto';
        appointmentSection.style.overflow = 'visible';
    }
    if (contactSection) {
        contactSection.style.display = 'block';
        contactSection.style.visibility = 'visible';
        contactSection.style.height = 'auto';
        contactSection.style.overflow = 'visible';
    }
    if (footerSection) {
        footerSection.style.display = 'block';
        footerSection.style.visibility = 'visible';
        footerSection.style.height = 'auto';
        footerSection.style.overflow = 'visible';
    }
}

// Logout function
function logout() {
    currentUser = null;
    localStorage.removeItem('currentUser');
    
    // Clear appointment form fields
    const firstNameInput = document.getElementById('firstName');
    const lastNameInput = document.getElementById('lastName');
    const phoneInput = document.getElementById('phone');
    
    if (firstNameInput) firstNameInput.value = '';
    if (lastNameInput) lastNameInput.value = '';
    if (phoneInput) phoneInput.value = '';
    
    // Force hide admin panel first
    const adminPanel = document.getElementById('admin-panel');
    if (adminPanel) {
        adminPanel.style.display = 'none';
    }
    
    // Show regular view
    showRegularView();
    
    // Reset navigation to show auth buttons
    const navActions = document.querySelector('.nav-actions');
    const authButtons = document.getElementById('auth-buttons');
    const profileDropdown = document.getElementById('profile-dropdown');
    
    if (navActions) {
        navActions.style.display = 'flex';
    }
    
    if (authButtons) {
        authButtons.style.display = 'flex';
    }
    
    if (profileDropdown) {
        profileDropdown.style.display = 'none';
    }
}

// Update profile information in dropdown
function updateProfileInfo() {
    if (!currentUser) return;
    
    const profileName = document.getElementById('profile-name');
    const profileEmail = document.getElementById('profile-email');
    const profileMenuName = document.getElementById('profile-menu-name');
    const profileMenuEmail = document.getElementById('profile-menu-email');
    
    if (profileName) {
        profileName.textContent = currentUser.name || 'Kullanıcı';
    }
    if (profileEmail) {
        profileEmail.textContent = currentUser.email || 'email@example.com';
    }
    if (profileMenuName) {
        profileMenuName.textContent = currentUser.name || 'Kullanıcı Adı';
    }
    if (profileMenuEmail) {
        profileMenuEmail.textContent = currentUser.email || 'email@example.com';
    }
}

// Toggle profile dropdown
function toggleProfileDropdown() {
    const profileDropdown = document.getElementById('profile-dropdown');
    if (profileDropdown) {
        profileDropdown.classList.toggle('active');
    }
}

// Close profile dropdown when clicking outside
function closeProfileDropdown() {
    const profileDropdown = document.getElementById('profile-dropdown');
    if (profileDropdown) {
        profileDropdown.classList.remove('active');
    }
}

// Show my appointments
function showMyAppointments() {
    if (!currentUser) return;
    
    document.getElementById('myAppointmentsModal').style.display = 'block';
    loadMyAppointments();
}

// Load user's appointments
function loadMyAppointments() {
    const content = document.getElementById('my-appointments-content');
    
    // Filter appointments for current user (exclude cancelled appointments)
    const userAppointments = appointments.filter(apt => 
        (apt.phone === currentUser.phone || 
        (apt.name && apt.name.toLowerCase().includes(currentUser.name.toLowerCase()))) &&
        apt.status !== 'cancelled'
    );
    
    if (userAppointments.length === 0) {
        content.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-calendar-times"></i>
                <h3>Henüz randevunuz yok</h3>
                <p>Yeni bir randevu oluşturmak için ana sayfadaki randevu formunu kullanabilirsiniz.</p>
            </div>
        `;
        return;
    }
    
    // Sort appointments by date (newest first)
    userAppointments.sort((a, b) => new Date(b.date) - new Date(a.date));
    
    // Debug: Log appointment details
    console.log('User appointments:', userAppointments);
    userAppointments.forEach(apt => {
        console.log('Appointment details:', {
            id: apt.id,
            serviceName: apt.serviceName,
            servicePrice: apt.servicePrice,
            serviceDuration: apt.serviceDuration,
            status: apt.status
        });
    });
    
    content.innerHTML = `
        <div class="my-appointments-header">
            <h3><i class="fas fa-calendar-check"></i> Randevularım</h3>
            <p>Toplam ${userAppointments.length} randevunuz bulunuyor</p>
        </div>
        <div class="my-appointments-list">
            ${userAppointments.map(appointment => `
                <div class="my-appointment-card ${appointment.status}">
                    <div class="appointment-card-header">
                        <div class="service-info">
                            <div class="service-icon">
                                <i class="fas fa-spa"></i>
                            </div>
                            <div class="service-details">
                                <h4>${appointment.serviceName || appointment.serviceSubcategory || 'Hizmet'}</h4>
                                <p class="service-category">${appointment.serviceCategory || 'Kategori'}</p>
                                <div class="service-meta">
                                    <span class="service-price">${appointment.servicePrice || 0}₺</span>
                                    <span class="service-duration">${appointment.serviceDuration || 30} dk</span>
                                </div>
                            </div>
                        </div>
                        <div class="appointment-status">
                            <span class="status-badge ${appointment.status}">
                                ${getStatusText(appointment.status)}
                            </span>
                        </div>
                    </div>
                    
                    <div class="appointment-details-grid">
                        <div class="detail-item">
                            <div class="detail-icon">
                                <i class="fas fa-calendar-alt"></i>
                            </div>
                            <div class="detail-content">
                                <span class="detail-label">Tarih</span>
                                <span class="detail-value">${formatDate(appointment.date)}</span>
                            </div>
                        </div>
                        
                        <div class="detail-item">
                            <div class="detail-icon">
                                <i class="fas fa-clock"></i>
                            </div>
                            <div class="detail-content">
                                <span class="detail-label">Saat</span>
                                <span class="detail-value">${appointment.time}</span>
                            </div>
                        </div>
                        
                        <div class="detail-item">
                            <div class="detail-icon">
                                <i class="fas fa-user-md"></i>
                            </div>
                            <div class="detail-content">
                                <span class="detail-label">Personel</span>
                                <span class="detail-value">${getStaffName(appointment.staff)}</span>
                            </div>
                        </div>
                        
                        <div class="detail-item">
                            <div class="detail-icon">
                                <i class="fas fa-lira-sign"></i>
                            </div>
                            <div class="detail-content">
                                <span class="detail-label">Fiyat</span>
                                <span class="detail-value">${appointment.servicePrice}₺</span>
                            </div>
                        </div>
                        
                        <div class="detail-item">
                            <div class="detail-icon">
                                <i class="fas fa-hourglass-half"></i>
                            </div>
                            <div class="detail-content">
                                <span class="detail-label">Süre</span>
                                <span class="detail-value">${appointment.serviceDuration} dk</span>
                            </div>
                        </div>
                    </div>
                    
                    ${appointment.notes ? `
                        <div class="appointment-notes">
                            <div class="notes-header">
                                <i class="fas fa-sticky-note"></i>
                                <span>Notlar</span>
                            </div>
                            <p>${appointment.notes}</p>
                        </div>
                    ` : ''}
                    
                    <div class="appointment-actions">
                        ${appointment.status === 'confirmed' || appointment.status === 'pending' ? `
                            <button class="admin-btn admin-btn-sm admin-btn-warning" onclick="cancelAppointment(${appointment.id})">
                                <i class="fas fa-times"></i> İptal Et
                            </button>
                        ` : ''}
                        ${appointment.status === 'completed' ? `
                            <button class="admin-btn admin-btn-sm admin-btn-success" disabled>
                                <i class="fas fa-check-circle"></i> Tamamlandı
                            </button>
                        ` : ''}
                        ${appointment.status === 'cancelled' ? `
                            <button class="admin-btn admin-btn-sm admin-btn-danger" disabled>
                                <i class="fas fa-times-circle"></i> İptal Edildi
                            </button>
                        ` : ''}
                    </div>
                </div>
            `).join('')}
        </div>
    `;
}

// Get staff name by ID
function getStaffName(staffId) {
    console.log('getStaffName called with staffId:', staffId, 'type:', typeof staffId);
    console.log('Available staff:', staff);
    
    // Staff data will be loaded from Firebase
    
    if (!staffId) {
        console.log('No staffId provided');
        return 'Belirtilmemiş';
    }
    
    // Try to find staff by ID (convert to number if needed)
    let staffMember = staff.find(s => s.id == staffId);
    
    // If not found by ID, try to find by name
    if (!staffMember) {
        staffMember = staff.find(s => s.name === staffId);
    }
    
    if (staffMember) {
        console.log('Found staff member:', staffMember);
        return staffMember.name;
    } else {
        console.log('Staff member not found for ID:', staffId);
        return 'Belirtilmemiş';
    }
}

// Get status text in Turkish
function getStatusText(status) {
    const statusTexts = {
        'pending': 'Beklemede',
        'confirmed': 'Onaylandı',
        'cancelled': 'İptal Edildi',
        'completed': 'Tamamlandı'
    };
    return statusTexts[status] || status;
}

// Format date for display
function formatDate(dateString) {
    const date = new Date(dateString);
    const options = { 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric',
        weekday: 'long'
    };
    return date.toLocaleDateString('tr-TR', options);
}

// Cancel appointment
async function cancelAppointment(appointmentId) {
    if (!confirm('Bu randevuyu iptal etmek istediğinizden emin misiniz?')) {
        return;
    }
    
    const appointmentIndex = appointments.findIndex(apt => apt.id === appointmentId);
    if (appointmentIndex !== -1) {
        appointments[appointmentIndex].status = 'cancelled';
        
        // Save to localStorage (fallback)
        localStorage.setItem('appointments', JSON.stringify(appointments));
        
        // Save to Firebase
        await saveToFirebase('appointments', appointments);
        
        showSuccessMessage('Randevu başarıyla iptal edildi!');
        loadMyAppointments();
    }
}


// Show admin panel
function showAdminPanel() {
    console.log('showAdminPanel called');
    if (!currentUser) {
        console.log('No current user');
        return;
    }
    
    // Only allow specific admin user
    if (currentUser.email !== 'admingülcemal@gmail.com') {
        console.log('Not admin user:', currentUser.email);
        showErrorMessage('Bu sayfaya erişim yetkiniz yok!');
        return;
    }
    
    console.log('Switching to admin view');
    // Switch to admin view
    showAdminView();
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
    if (tabName === 'revenue') {
        loadRevenueData();
    } else if (tabName === 'customers') {
        loadCustomersList();
    }
}

// Load admin data
function loadAdminData() {
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
                <button onclick="deleteAppointment(${appointment.id})" class="admin-btn admin-btn-sm admin-btn-delete">Sil</button>
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
        
        // Save to Firebase and localStorage
        saveToFirebase('appointments', appointments);
        localStorage.setItem('appointments', JSON.stringify(appointments));
        
        // Refresh lists
        loadAppointmentsList();
        if (typeof loadAppointmentsContent === 'function') {
            loadAppointmentsContent();
        }
        
        console.log('Appointment deleted:', id);
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
                <button type="submit" class="admin-btn admin-btn-md admin-btn-primary">Gider Ekle</button>
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
                <button onclick="printReport()" class="admin-btn admin-btn-md admin-btn-primary">
                    <i class="fas fa-print"></i> Yazdır
                </button>
                <button onclick="exportReport()" class="admin-btn admin-btn-md admin-btn-primary">
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

    // Aggregate unique customers from appointments
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
        const entry = customerMap.get(apt.phone);
        entry.appointments.push(apt);
        if (new Date(apt.date) > new Date(entry.lastVisit)) {
            entry.lastVisit = apt.date;
        }
    });

    // Sort by last visit desc
    const sortedCustomers = Array.from(customerMap.values())
        .sort((a, b) => new Date(b.lastVisit) - new Date(a.lastVisit));

    // Helper to create initials
    const getInitials = (name) => {
        if (!name) return '?';
        const parts = name.trim().split(/\s+/);
        const first = parts[0]?.[0] || '';
        const last = parts.length > 1 ? parts[parts.length - 1][0] : '';
        return (first + last).toUpperCase();
    };

    const customersHTML = sortedCustomers.map(customer => `
        <div class="customer-card">
            <div class="customer-avatar" aria-hidden="true">${getInitials(customer.name)}</div>
            <div class="customer-main">
                <h4 class="customer-name">${customer.name}</h4>
                <div class="customer-meta">
                    <span class="badge badge-phone"><i class="fas fa-phone"></i>${customer.phone}</span>
                    <span class="badge badge-visits"><i class="fas fa-calendar-check"></i>${customer.appointments.length} randevu</span>
                    <span class="badge badge-last"><i class="fas fa-clock"></i>${new Date(customer.lastVisit).toLocaleDateString('tr-TR')}</span>
                </div>
            </div>
            <div class="customer-actions">
                <button onclick="sendWhatsAppMessage('${customer.phone}')" class="admin-btn admin-btn-sm admin-btn-whatsapp" title="WhatsApp">
                    <i class="fab fa-whatsapp"></i>
                </button>
                <button onclick="viewCustomerHistory('${customer.phone}')" class="admin-btn admin-btn-sm admin-btn-primary" title="Geçmiş">
                    <i class="fas fa-history"></i>
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
    
    if (Object.keys(serviceCategories).length === 0) {
        servicesHTML = `
            <div class="empty-state">
                <i class="fas fa-spa"></i>
                <h3>Henüz hizmet kategorisi yok</h3>
                <p>Yeni hizmet kategorisi eklemek için "Yeni Kategori Ekle" butonuna tıklayın.</p>
            </div>
        `;
    } else {
        Object.keys(serviceCategories).forEach(categoryKey => {
            const category = serviceCategories[categoryKey];
            
            // Ensure subcategories is an array
            if (!category.subcategories || !Array.isArray(category.subcategories)) {
                category.subcategories = [];
            }
            
            servicesHTML += `
                <div class="service-category-card">
                    <div class="category-header">
                        <div class="category-icon">
                            <i class="${category.icon}"></i>
                        </div>
                        <div class="category-details">
                            <span class="category-label">Kategori</span>
                            <h3 class="category-name">${category.name}</h3>
                            <span class="category-count">${category.subcategories.length} alt hizmet</span>
                        </div>
                        <div class="category-actions">
                            <button class="admin-btn admin-btn-sm admin-btn-success" onclick="addSubcategory('${categoryKey}')" title="Alt Hizmet Ekle">
                                <i class="fas fa-plus"></i>
                            </button>
                            <button class="admin-btn admin-btn-sm admin-btn-primary" onclick="editServiceCategory('${categoryKey}')" title="Düzenle">
                                <i class="fas fa-edit"></i>
                            </button>
                            <button class="admin-btn admin-btn-sm admin-btn-danger" onclick="deleteServiceCategory('${categoryKey}')" title="Sil">
                                <i class="fas fa-trash"></i>
                            </button>
                        </div>
                    </div>
                    
                    <div class="subcategory-grid">
                        ${category.subcategories && category.subcategories.length > 0 ? category.subcategories.map((sub, index) => `
                            <div class="subcategory-card">
                                <div class="subcategory-header">
                                    <h4 class="subcategory-name">${sub.name}</h4>
                                    <div class="subcategory-meta">
                                        <span class="subcategory-duration">
                                            <i class="fas fa-clock"></i> ${sub.duration} dk
                                        </span>
                                        <span class="subcategory-price">
                                            <i class="fas fa-lira-sign"></i> ${sub.price}₺
                                        </span>
                                    </div>
                                </div>
                                <div class="subcategory-actions">
                                    <button class="admin-btn admin-btn-sm admin-btn-warning" onclick="editSubcategory('${categoryKey}', ${index})" title="Düzenle">
                                        <i class="fas fa-edit"></i>
                                    </button>
                                    <button class="admin-btn admin-btn-sm admin-btn-danger" onclick="deleteSubcategory('${categoryKey}', ${index})" title="Sil">
                                        <i class="fas fa-trash"></i>
                                    </button>
                                </div>
                            </div>
                        `).join('') : `
                            <div class="empty-subcategory">
                                <div class="empty-icon">
                                    <i class="fas fa-plus-circle"></i>
                                </div>
                                <p>Bu kategoride henüz alt hizmet yok.</p>
                                <button class="admin-btn admin-btn-sm admin-btn-success" onclick="addSubcategory('${categoryKey}')">
                                    <i class="fas fa-plus"></i> İlk Alt Hizmeti Ekle
                                </button>
                            </div>
                        `}
                    </div>
                </div>
            `;
        });
    }
    
    servicesList.innerHTML = servicesHTML;
}

// Calculate average price of all services
function calculateAveragePrice() {
    const allPrices = [];
    Object.values(serviceCategories).forEach(category => {
        if (category.subcategories && Array.isArray(category.subcategories)) {
            category.subcategories.forEach(sub => {
                if (sub.price && typeof sub.price === 'number') {
                    allPrices.push(sub.price);
                }
            });
        }
    });
    
    if (allPrices.length === 0) return '0';
    
    const average = allPrices.reduce((sum, price) => sum + price, 0) / allPrices.length;
    return Math.round(average);
}

// Edit subcategory
function editSubcategory(categoryKey, subcategoryIndex) {
    const category = serviceCategories[categoryKey];
    const subcategory = category.subcategories[subcategoryIndex];
    
    const modalHTML = `
        <div class="service-form">
            <h3>Alt Hizmet Düzenle</h3>
            <form id="editSubcategoryForm">
                <div class="form-group">
                    <label for="editSubcategoryName">Alt Hizmet Adı</label>
                    <input type="text" id="editSubcategoryName" name="subcategoryName" value="${subcategory.name}" required>
                </div>
                <div class="form-group">
                    <label for="editSubcategoryPrice">Fiyat (₺)</label>
                    <input type="number" id="editSubcategoryPrice" name="subcategoryPrice" value="${subcategory.price}" required min="0" step="0.01">
                </div>
                <div class="form-group">
                    <label for="editSubcategoryDuration">Süre (dakika)</label>
                    <input type="number" id="editSubcategoryDuration" name="subcategoryDuration" value="${subcategory.duration}" required min="1">
                </div>
                <button type="submit" class="btn-submit">Güncelle</button>
            </form>
        </div>
    `;
    
    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.id = 'editSubcategoryModal';
    modal.innerHTML = `
        <div class="modal-content">
            <span class="close" onclick="closeModal('editSubcategoryModal')">&times;</span>
            ${modalHTML}
        </div>
    `;
    
    document.body.appendChild(modal);
    modal.style.display = 'block';
    
    document.getElementById('editSubcategoryForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        const formData = new FormData(e.target);
        
        const updatedSubcategory = {
            name: formData.get('subcategoryName').trim(),
            price: parseFloat(formData.get('subcategoryPrice')),
            duration: parseInt(formData.get('subcategoryDuration'))
        };
        
        try {
            // Update local data
            serviceCategories[categoryKey].subcategories[subcategoryIndex] = updatedSubcategory;
            
            // Update in Firebase
            await updateSubcategoryInFirebase(categoryKey, subcategoryIndex, updatedSubcategory);
            
            // Also save to localStorage as backup
            localStorage.setItem('serviceCategories', JSON.stringify(serviceCategories));
            
            closeModal('editSubcategoryModal');
            loadServicesList();
            alert('Alt hizmet başarıyla güncellendi!');
        } catch (error) {
            console.error('Error updating subcategory:', error);
            alert('Alt hizmet güncellenirken hata oluştu. Lütfen tekrar deneyin.');
        }
    });
}

// Delete subcategory
async function deleteSubcategory(categoryKey, subcategoryIndex) {
    if (confirm('Bu alt hizmeti silmek istediğinizden emin misiniz?')) {
        try {
            // Remove from local data
            serviceCategories[categoryKey].subcategories.splice(subcategoryIndex, 1);
            
            // Delete from Firebase
            await deleteSubcategoryFromFirebase(categoryKey, subcategoryIndex);
            
            // Also save to localStorage as backup
            localStorage.setItem('serviceCategories', JSON.stringify(serviceCategories));
            
            loadServicesList();
            alert('Alt hizmet başarıyla silindi!');
        } catch (error) {
            console.error('Error deleting subcategory:', error);
            alert('Alt hizmet silinirken hata oluştu. Lütfen tekrar deneyin.');
        }
    }
}

// Export services
function exportServices() {
    const dataStr = JSON.stringify(serviceCategories, null, 2);
    const dataBlob = new Blob([dataStr], {type: 'application/json'});
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'services-backup.json';
    link.click();
    URL.revokeObjectURL(url);
}

// Import services
function importServices() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = (e) => {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (e) => {
                try {
                    const importedData = JSON.parse(e.target.result);
                    if (confirm('Mevcut hizmetler silinecek ve yeni hizmetler yüklenecek. Devam etmek istiyor musunuz?')) {
                        Object.assign(serviceCategories, importedData);
                        localStorage.setItem('serviceCategories', JSON.stringify(serviceCategories));
                        loadServicesList();
                        alert('Hizmetler başarıyla içe aktarıldı!');
                    }
                } catch (error) {
                    alert('Dosya formatı hatalı!');
                }
            };
            reader.readAsText(file);
        }
    };
    input.click();
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
                <button onclick="editStaff(${member.id})" class="admin-btn admin-btn-sm admin-btn-primary">
                    <i class="fas fa-edit"></i> Düzenle
                </button>
                <button onclick="deleteStaff(${member.id})" class="admin-btn admin-btn-sm admin-btn-delete">
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

// Load and display users
function loadUsers() {
    const usersList = document.getElementById('users-list');
    if (!usersList) return;
    
    // Filter out admin users
    const regularUsers = users.filter(user => user.role !== 'admin');
    
    // Update stats
    document.getElementById('total-users').textContent = regularUsers.length;
    document.getElementById('active-users').textContent = regularUsers.filter(user => user.lastLogin).length;
    
    if (regularUsers.length === 0) {
        usersList.innerHTML = '<div class="empty-state"><i class="fas fa-users"></i><p>Henüz kayıtlı kullanıcı yok</p></div>';
        return;
    }
    
    const usersHTML = regularUsers.map(user => `
        <div class="user-card">
            <div class="user-info">
                <div class="user-avatar">
                    <i class="fas fa-user"></i>
                </div>
                <div class="user-details">
                    <h4>${user.name}</h4>
                    <p><i class="fas fa-envelope"></i> ${user.email}</p>
                    <p><i class="fas fa-phone"></i> ${user.phone}</p>
                    <p><i class="fas fa-calendar"></i> Kayıt: ${new Date(user.createdAt).toLocaleDateString('tr-TR')}</p>
                    ${user.lastLogin ? `<p><i class="fas fa-sign-in-alt"></i> Son giriş: ${new Date(user.lastLogin).toLocaleDateString('tr-TR')}</p>` : ''}
                </div>
            </div>
            <div class="user-actions">
                <button class="admin-btn admin-btn-sm admin-btn-whatsapp" onclick="sendUserMessage('${user.phone}', '${user.name}')">
                    <i class="fab fa-whatsapp"></i> Mesaj
                </button>
                <button class="admin-btn admin-btn-sm admin-btn-secondary" onclick="viewUserAppointments('${user.email}')">
                    <i class="fas fa-calendar"></i> Randevular
                </button>
            </div>
        </div>
    `).join('');
    
    usersList.innerHTML = usersHTML;
}

// Export users to CSV
function exportUsers() {
    const regularUsers = users.filter(user => user.role !== 'admin');
    
    if (regularUsers.length === 0) {
        showErrorMessage('Dışa aktarılacak kullanıcı bulunamadı!');
        return;
    }
    
    const csvContent = [
        ['Ad', 'Soyad', 'E-posta', 'Telefon', 'Kayıt Tarihi', 'Son Giriş'].join(','),
        ...regularUsers.map(user => [
            user.firstName,
            user.lastName,
            user.email,
            user.phone,
            new Date(user.createdAt).toLocaleDateString('tr-TR'),
            user.lastLogin ? new Date(user.lastLogin).toLocaleDateString('tr-TR') : 'Hiç giriş yapmamış'
        ].join(','))
    ].join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `kullanicilar_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    showSuccessMessage('Kullanıcılar başarıyla dışa aktarıldı!');
}

// Send message to user
function sendUserMessage(phone, name) {
    const message = `Merhaba ${name}! Güzellik salonumuzdan selamlar. Size özel kampanyalarımız hakkında bilgi almak ister misiniz?`;
    const whatsappUrl = `https://wa.me/${phone.replace('+', '')}?text=${encodeURIComponent(message)}`;
    window.open(whatsappUrl, '_blank');
}

// View user appointments
function viewUserAppointments(email) {
    const userAppointments = appointments.filter(apt => apt.email === email);
    
    if (userAppointments.length === 0) {
        showErrorMessage('Bu kullanıcının randevusu bulunamadı!');
        return;
    }
    
    // Switch to appointments tab and filter by user
    showTab('appointments');
    // You can add filtering logic here
    showSuccessMessage(`${userAppointments.length} randevu bulundu!`);
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
                <button onclick="sendWhatsAppMessage('${appointment.phone}')" class="admin-btn admin-btn-sm admin-btn-whatsapp admin-btn-icon">
                    <i class="fab fa-whatsapp"></i>
                </button>
                <button onclick="deleteAppointment(${appointment.id})" class="admin-btn admin-btn-sm admin-btn-delete admin-btn-icon">
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
                            <button onclick="sendWhatsAppMessage('${apt.phone}')" class="admin-btn admin-btn-sm admin-btn-whatsapp admin-btn-icon">
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
        // Remove modal from DOM for certain modals to prevent event listener issues
        if (modalId === 'adminModal' || modalId === 'iconPickerModal' || modalId === 'addServiceModal') {
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

// Scroll to the top of the appointment section (for wizard steps)
function scrollToAppointmentSection() {
    const appointmentSection = document.getElementById('appointment');
    const headerHeight = document.querySelector('.header').offsetHeight;
    const targetPosition = appointmentSection.offsetTop - headerHeight - 20; // 20px extra padding
    
    window.scrollTo({
        top: targetPosition,
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

// Show error message
function showErrorMessage(message) {
    // Remove existing error messages
    const existingError = document.querySelector('.error-message');
    if (existingError) {
        existingError.remove();
    }
    
    // Create error message element
    const errorMessage = document.createElement('div');
    errorMessage.className = 'error-message';
    errorMessage.innerHTML = `
        <div class="error-content">
            <i class="fas fa-exclamation-triangle"></i>
            <div class="error-text">
                <h4>Hata!</h4>
                <p>${message}</p>
            </div>
        </div>
    `;
    
    // Add to body
    document.body.appendChild(errorMessage);
    
    // Auto remove after 5 seconds
    setTimeout(() => {
        if (errorMessage.parentNode) {
            errorMessage.remove();
        }
    }, 5000);
}

// Show success message
function showSuccessMessage(message) {
    const successDiv = document.createElement('div');
    successDiv.className = 'success-message';
    successDiv.innerHTML = `
        <div class="success-content">
            <div class="success-icon">
                <i class="fas fa-check-circle"></i>
            </div>
            <div class="success-text">
                <h4>Başarılı!</h4>
                <p>${message}</p>
            </div>
        </div>
    `;
    successDiv.style.display = 'block';
    
    document.body.appendChild(successDiv);
    
    // Auto remove after 5 seconds
    setTimeout(() => {
        successDiv.style.opacity = '0';
        successDiv.style.transform = 'translateY(-20px)';
        setTimeout(() => {
            successDiv.remove();
        }, 300);
    }, 5000);
}

// Show info message
function showInfoMessage(message) {
    const infoDiv = document.createElement('div');
    infoDiv.className = 'info-message';
    infoDiv.textContent = message;
    infoDiv.style.display = 'block';
    
    document.body.appendChild(infoDiv);
    
    setTimeout(() => {
        infoDiv.remove();
    }, 3000);
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

// Add fade-in class to elements (excluding admin panel and service management elements)
document.addEventListener('DOMContentLoaded', function() {
    const elements = document.querySelectorAll('.service-card, .contact-item, .appointment-form');
    elements.forEach(element => {
        // Only apply fade-in to elements that are NOT in admin panel or service management
        const isInAdminPanel = element.closest('#admin-panel') || 
                              element.closest('.admin-panel-section') ||
                              element.closest('.admin-main-content') ||
                              element.closest('.services-management') ||
                              element.closest('.service-categories-list') ||
                              element.closest('.edit-category-item') ||
                              element.classList.contains('edit-category-item');
        
        if (!isInAdminPanel) {
            element.classList.add('fade-in');
        }
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

// Phone subcategory card click handler

// Phone staff card click handler


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


// Customer selection functions
function selectCustomer(name, phone) {
    document.getElementById('name').value = name;
    document.getElementById('phone').value = phone;
    document.getElementById('customer-suggestions').style.display = 'none';
}


// Date change handlers
function handleDateChange(e) {
    const date = e.target.value;
    const timeSlots = document.getElementById('time-slots');
    
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
    
    // Reset hidden inputs
    document.getElementById('service-category').value = '';
    document.getElementById('service-subcategory').value = '';
    document.getElementById('service-name').value = '';
    document.getElementById('service-price').value = '';
    document.getElementById('service-duration').value = '';
    
    // Reset service category cards selection
    document.querySelectorAll('.service-category-card').forEach(card => {
        card.classList.remove('selected');
    });
    
    // Reset subcategory cards selection
    document.querySelectorAll('.subcategory-card').forEach(card => {
        card.classList.remove('selected');
    });
    
    // Reset staff cards selection
    document.querySelectorAll('.staff-card').forEach(card => {
        card.classList.remove('selected');
    });
}



// Wizard Step Navigation
let currentStep = 1;

function nextStep(stepNumber) {
    // Validate current step before proceeding
    if (!validateCurrentStep(currentStep)) {
        return;
    }
    
    // Hide current step
    document.getElementById(`step-${currentStep}`).classList.remove('active');
    document.querySelector(`[data-step="${currentStep}"]`).classList.remove('active');
    document.querySelector(`[data-step="${currentStep}"]`).classList.add('completed');
    
    // Show next step
    currentStep = stepNumber;
    document.getElementById(`step-${currentStep}`).classList.add('active');
    document.querySelector(`[data-step="${currentStep}"]`).classList.add('active');
    
    // Scroll to the top of the appointment section with a small delay
    setTimeout(() => {
        scrollToAppointmentSection();
    }, 100);
    
    // Load data for the new step
    loadStepData(currentStep);
}

function prevStep(stepNumber) {
    // Hide current step
    document.getElementById(`step-${currentStep}`).classList.remove('active');
    document.querySelector(`[data-step="${currentStep}"]`).classList.remove('active');
    
    // Show previous step
    currentStep = stepNumber;
    document.getElementById(`step-${currentStep}`).classList.add('active');
    document.querySelector(`[data-step="${currentStep}"]`).classList.add('active');
    document.querySelector(`[data-step="${currentStep}"]`).classList.remove('completed');
    
    // Scroll to the top of the appointment section with a small delay
    setTimeout(() => {
        scrollToAppointmentSection();
    }, 100);
}

function validateCurrentStep(step) {
    switch(step) {
        case 1:
            const firstName = document.getElementById('firstName').value.trim();
            const lastName = document.getElementById('lastName').value.trim();
            const phone = document.getElementById('phone').value.trim();
            const serviceCategory = document.getElementById('service-category').value;
            const serviceSubcategory = document.getElementById('service-subcategory').value;
            
            if (!firstName || !lastName || !phone) {
                showErrorMessage('Lütfen tüm kişisel bilgileri doldurun!');
                return false;
            }
            
            if (!serviceCategory) {
                showErrorMessage('Lütfen bir hizmet kategorisi seçin!');
                return false;
            }
            
            if (serviceSubcategory && !serviceSubcategory) {
                showErrorMessage('Lütfen bir alt kategori seçin!');
                return false;
            }
            
            return true;
            
        case 2:
            const staff = document.getElementById('staff').value;
            if (!staff) {
                showErrorMessage('Lütfen bir personel seçin!');
                return false;
            }
            return true;
            
        case 3:
            const date = document.getElementById('date').value;
            if (!date) {
                showErrorMessage('Lütfen bir tarih seçin!');
                return false;
            }
            return true;
            
        case 4:
            const time = document.getElementById('time').value;
            if (!time) {
                showErrorMessage('Lütfen bir saat seçin!');
                return false;
            }
            return true;
            
        default:
            return true;
    }
}

function loadStepData(step) {
    switch(step) {
        case 2:
            // Load staff for selected service
            loadStaffForService();
            break;
        case 3:
            // Set minimum date to today
            const today = new Date().toISOString().split('T')[0];
            document.getElementById('date').setAttribute('min', today);
            break;
        case 4:
            // Load time slots for selected date
            const selectedDate = document.getElementById('date').value;
            if (selectedDate) {
                generateTimeSlotCards(selectedDate, document.getElementById('time-slots'));
            }
            break;
    }
}

function loadStaffForService() {
    const serviceCategory = document.getElementById('service-category').value;
    const staffCards = document.getElementById('staff-cards');
    
    if (!serviceCategory) return;
    
    staffCards.innerHTML = '';
    
    // Filter staff based on service category
    const relevantStaff = staff.filter(member => 
        member.specialty === serviceCategories[serviceCategory]?.name || 
        member.specialty === 'Tümü'
    );
    
    if (relevantStaff.length === 0) {
        // Show all staff if no specific specialty
        staff.forEach(member => {
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
        });
    } else {
        relevantStaff.forEach(member => {
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
        });
    }
}

// Hizmet Yönetimi Fonksiyonları
function showAddServiceModal() {
    const modalHTML = `
        <div class="service-form">
            <h3>Yeni Hizmet Kategorisi Ekle</h3>
            <form id="addServiceForm">
                <div class="form-group">
                    <label for="serviceCategoryName">Kategori Adı</label>
                    <input type="text" id="serviceCategoryName" name="categoryName" required placeholder="Örn: Cilt Bakımları">
                </div>
                <div class="form-group">
                    <label for="serviceCategoryIcon">İkon</label>
                    <div class="icon-input-group">
                        <input type="text" id="serviceCategoryIcon" name="categoryIcon" required placeholder="İkon seçmek için butona tıklayın" readonly>
                        <button type="button" class="btn-icon-picker" onclick="showIconPicker('', 'serviceCategoryIcon')">
                            <i class="fas fa-palette"></i> İkon Seç
                        </button>
                    </div>
                    <div id="selectedIconPreview" style="margin-top: 10px; display: none;">
                        <span>Seçilen İkon: </span>
                        <i id="previewIcon" style="font-size: 1.2rem; margin-left: 5px;"></i>
                    </div>
                </div>
                <button type="submit" class="btn-submit">Kategori Ekle</button>
            </form>
        </div>
    `;
    
    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.id = 'addServiceModal';
    modal.innerHTML = `
        <div class="modal-content">
            <span class="close" onclick="closeModal('addServiceModal')">&times;</span>
            ${modalHTML}
        </div>
    `;
    
    document.body.appendChild(modal);
    modal.style.display = 'block';
    
    document.getElementById('addServiceForm').addEventListener('submit', handleAddServiceSubmit);
}

function showEditServiceModal() {
    const modalHTML = `
        <div class="service-edit-form">
            <h3>Hizmet Düzenle</h3>
            <div class="service-categories-list">
                ${Object.keys(serviceCategories).map(categoryKey => {
                    const category = serviceCategories[categoryKey];
                    return `
                        <div class="edit-category-item">
                            <h4>${category.name}</h4>
                            <div class="category-actions">
                                <button class="admin-btn admin-btn-sm admin-btn-primary" onclick="editCategoryDetails('${categoryKey}')">
                                    <i class="fas fa-edit"></i> Düzenle
                                </button>
                                <button class="admin-btn admin-btn-sm admin-btn-success" onclick="addSubcategory('${categoryKey}')">
                                    <i class="fas fa-plus"></i> Alt Hizmet Ekle
                                </button>
                            </div>
                        </div>
                    `;
                }).join('')}
            </div>
        </div>
    `;
    
    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.id = 'editServiceModal';
    modal.innerHTML = `
        <div class="modal-content">
            <span class="close" onclick="closeModal('editServiceModal')">&times;</span>
            ${modalHTML}
        </div>
    `;
    
    document.body.appendChild(modal);
    modal.style.display = 'block';
}

// Handle add service form submission
async function handleAddServiceSubmit(event) {
    event.preventDefault();
    
    const formData = new FormData(event.target);
    const categoryName = formData.get('categoryName').trim();
    const categoryIcon = formData.get('categoryIcon').trim();
    
    // Debug logging
    console.log('Form submission debug:');
    console.log('Category Name:', categoryName);
    console.log('Category Icon:', categoryIcon);
    console.log('Form data entries:', Array.from(formData.entries()));
    
    if (!categoryName || !categoryIcon) {
        alert('Lütfen tüm alanları doldurun!\nKategori Adı: ' + (categoryName ? '✓' : '✗') + '\nİkon: ' + (categoryIcon ? '✓' : '✗'));
        return;
    }
    
    // Generate category key from category name
    const categoryKey = categoryName
        .toLowerCase()
        .replace(/[^a-z0-9\s]/g, '') // Remove special characters
        .replace(/\s+/g, '-') // Replace spaces with hyphens
        .trim();
    
    console.log('Generated category key:', categoryKey);
    
    // Check if category key already exists
    if (serviceCategories[categoryKey]) {
        alert('Bu kategori adı zaten kullanılıyor! Lütfen farklı bir isim seçin.');
        return;
    }
    
    // Add new service category
    serviceCategories[categoryKey] = {
        name: categoryName,
        icon: categoryIcon,
        subcategories: []
    };
    
    console.log('Added category:', serviceCategories[categoryKey]);
    
    try {
        // Save to Firebase
        await saveServiceCategoriesToFirebase();
        
        // Also save to localStorage as backup
        localStorage.setItem('serviceCategories', JSON.stringify(serviceCategories));
        
        // Close modal and refresh services list
        closeModal('addServiceModal');
        loadServicesList();
        
        alert('Hizmet kategorisi başarıyla eklendi!');
    } catch (error) {
        console.error('Error saving service category:', error);
        alert('Kategori kaydedilirken hata oluştu. Lütfen tekrar deneyin.');
    }
}

// Icon picker data
const iconCategories = {
    'beauty': {
        name: 'Güzellik & Bakım',
        icons: [
            { class: 'fas fa-spa', name: 'Spa' },
            { class: 'fas fa-leaf', name: 'Doğal' },
            { class: 'fas fa-heart', name: 'Kalp' },
            { class: 'fas fa-star', name: 'Yıldız' },
            { class: 'fas fa-gem', name: 'Elmas' },
            { class: 'fas fa-crown', name: 'Taç' },
            { class: 'fas fa-magic', name: 'Sihir' },
            { class: 'fas fa-sparkles', name: 'Parlaklık' }
        ]
    },
    'medical': {
        name: 'Tıbbi & Estetik',
        icons: [
            { class: 'fas fa-user-md', name: 'Doktor' },
            { class: 'fas fa-stethoscope', name: 'Stetoskop' },
            { class: 'fas fa-syringe', name: 'Şırınga' },
            { class: 'fas fa-pills', name: 'İlaç' },
            { class: 'fas fa-band-aid', name: 'Yara Bandı' },
            { class: 'fas fa-thermometer-half', name: 'Termometre' },
            { class: 'fas fa-microscope', name: 'Mikroskop' },
            { class: 'fas fa-x-ray', name: 'Röntgen' }
        ]
    },
    'body': {
        name: 'Vücut & Fitness',
        icons: [
            { class: 'fas fa-dumbbell', name: 'Ağırlık' },
            { class: 'fas fa-running', name: 'Koşu' },
            { class: 'fas fa-bicycle', name: 'Bisiklet' },
            { class: 'fas fa-swimmer', name: 'Yüzme' },
            { class: 'fas fa-weight', name: 'Kilo' },
            { class: 'fas fa-fire', name: 'Ateş' },
            { class: 'fas fa-bolt', name: 'Şimşek' },
            { class: 'fas fa-trophy', name: 'Kupa' }
        ]
    },
    'face': {
        name: 'Yüz & Cilt',
        icons: [
            { class: 'fas fa-eye', name: 'Göz' },
            { class: 'fas fa-smile', name: 'Gülümseme' },
            { class: 'fas fa-kiss', name: 'Öpücük' },
            { class: 'fas fa-mask', name: 'Maske' },
            { class: 'fas fa-sun', name: 'Güneş' },
            { class: 'fas fa-moon', name: 'Ay' },
            { class: 'fas fa-cloud-sun', name: 'Bulutlu Güneş' },
            { class: 'fas fa-rainbow', name: 'Gökkuşağı' }
        ]
    },
    'hands': {
        name: 'El & Ayak',
        icons: [
            { class: 'fas fa-hand-paper', name: 'El' },
            { class: 'fas fa-hand-rock', name: 'Yumruk' },
            { class: 'fas fa-hand-peace', name: 'Barış' },
            { class: 'fas fa-hand-point-up', name: 'İşaret' },
            { class: 'fas fa-fingerprint', name: 'Parmak İzi' },
            { class: 'fas fa-ring', name: 'Yüzük' },
            { class: 'fas fa-gem', name: 'Mücevher' },
            { class: 'fas fa-crown', name: 'Taç' }
        ]
    },
    'tools': {
        name: 'Araçlar & Ekipman',
        icons: [
            { class: 'fas fa-tools', name: 'Araçlar' },
            { class: 'fas fa-cut', name: 'Makas' },
            { class: 'fas fa-palette', name: 'Palet' },
            { class: 'fas fa-paint-brush', name: 'Fırça' },
            { class: 'fas fa-spray-can', name: 'Sprey' },
            { class: 'fas fa-bottle-droplet', name: 'Damla' },
            { class: 'fas fa-flask', name: 'Şişe' },
            { class: 'fas fa-vial', name: 'Tüp' }
        ]
    }
};

// Show icon picker modal
function showIconPicker(currentIcon = '', targetInputId = '') {
    // Remove existing modal if it exists
    const existingModal = document.getElementById('iconPickerModal');
    if (existingModal) {
        existingModal.remove();
    }
    
    const modalHTML = `
        <div class="icon-picker-modal">
            <h3>İkon Seçin</h3>
            <div class="icon-picker-search">
                <input type="text" id="iconSearch" placeholder="İkon ara..." class="icon-search-input">
            </div>
            <div class="icon-categories">
                ${Object.keys(iconCategories).map(categoryKey => {
                    const category = iconCategories[categoryKey];
                    return `
                        <div class="icon-category">
                            <h4>${category.name}</h4>
                            <div class="icon-grid">
                                ${category.icons.map(icon => `
                                    <div class="icon-item ${currentIcon === icon.class ? 'selected' : ''}" 
                                         data-icon="${icon.class}" 
                                         data-name="${icon.name}">
                                        <i class="${icon.class}"></i>
                                        <span>${icon.name}</span>
                                    </div>
                                `).join('')}
                            </div>
                        </div>
                    `;
                }).join('')}
            </div>
            <div class="icon-picker-actions">
                <button class="admin-btn admin-btn-md admin-btn-secondary" onclick="closeModal('iconPickerModal')">İptal</button>
                <button class="admin-btn admin-btn-md admin-btn-primary" id="selectIconBtn" disabled>Seç</button>
            </div>
        </div>
    `;
    
    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.id = 'iconPickerModal';
    modal.innerHTML = `
        <div class="modal-content icon-picker-content">
            <span class="close" onclick="closeModal('iconPickerModal')">&times;</span>
            ${modalHTML}
        </div>
    `;
    
    document.body.appendChild(modal);
    modal.style.display = 'block';
    
    // Store target input ID for later use
    modal.dataset.targetInput = targetInputId;
    
    // Add event listeners with a small delay to ensure DOM is ready
    setTimeout(() => {
        setupIconPickerEvents();
    }, 100);
}

// Setup icon picker event listeners
function setupIconPickerEvents() {
    const modal = document.getElementById('iconPickerModal');
    if (!modal) return;
    
    let selectedIcon = '';
    const selectBtn = document.getElementById('selectIconBtn');
    const searchInput = document.getElementById('iconSearch');
    
    // Remove any existing event listeners by cloning the modal
    const newModal = modal.cloneNode(true);
    modal.parentNode.replaceChild(newModal, modal);
    
    // Get fresh references to elements
    const freshModal = document.getElementById('iconPickerModal');
    const freshSelectBtn = document.getElementById('selectIconBtn');
    const freshSearchInput = document.getElementById('iconSearch');
    
    // Icon selection - use event delegation
    freshModal.addEventListener('click', (e) => {
        const iconItem = e.target.closest('.icon-item');
        if (iconItem) {
            console.log('Icon clicked:', iconItem.dataset.icon);
            // Remove previous selection
            freshModal.querySelectorAll('.icon-item').forEach(item => item.classList.remove('selected'));
            
            // Add selection to clicked item
            iconItem.classList.add('selected');
            selectedIcon = iconItem.dataset.icon;
            console.log('Selected icon set to:', selectedIcon);
            if (freshSelectBtn) {
                freshSelectBtn.disabled = false;
                console.log('Select button enabled');
            }
        }
    });
    
    // Search functionality
    if (freshSearchInput) {
        freshSearchInput.addEventListener('input', (e) => {
            const searchTerm = e.target.value.toLowerCase();
            const iconItems = freshModal.querySelectorAll('.icon-item');
            
            iconItems.forEach(item => {
                const iconName = item.dataset.name.toLowerCase();
                const iconClass = item.dataset.icon.toLowerCase();
                const matches = iconName.includes(searchTerm) || iconClass.includes(searchTerm);
                
                item.style.display = matches ? 'flex' : 'none';
            });
        });
    }
    
    // Select button
    if (freshSelectBtn) {
        freshSelectBtn.addEventListener('click', () => {
            if (selectedIcon) {
                const targetInputId = freshModal.dataset.targetInput;
                const targetInput = document.getElementById(targetInputId);
                console.log('Icon picker debug:');
                console.log('Selected icon:', selectedIcon);
                console.log('Target input ID:', targetInputId);
                console.log('Target input element:', targetInput);
                
                if (targetInput) {
                    targetInput.value = selectedIcon;
                    targetInput.dispatchEvent(new Event('input', { bubbles: true }));
                    console.log('Icon set to input:', targetInput.value);
                    
                    // Update preview if it exists
                    const preview = document.getElementById('selectedIconPreview');
                    const previewIcon = document.getElementById('previewIcon');
                    if (preview && previewIcon) {
                        previewIcon.className = selectedIcon;
                        preview.style.display = 'block';
                    }
                } else {
                    console.error('Target input not found:', targetInputId);
                }
                closeModal('iconPickerModal');
            } else {
                console.log('No icon selected');
            }
        });
    }
}

// Edit service category details
function editCategoryDetails(categoryKey) {
    const category = serviceCategories[categoryKey];
    if (!category) return;
    
    const modalHTML = `
        <div class="service-form">
            <h3>Kategori Düzenle</h3>
            <form id="editCategoryForm">
                <div class="form-group">
                    <label for="editCategoryName">Kategori Adı</label>
                    <input type="text" id="editCategoryName" name="categoryName" value="${category.name}" required>
                </div>
                <div class="form-group">
                    <label for="editCategoryIcon">İkon</label>
                    <div class="icon-input-group">
                        <input type="text" id="editCategoryIcon" name="categoryIcon" value="${category.icon}" required readonly>
                        <button type="button" class="btn-icon-picker" onclick="showIconPicker('${category.icon}', 'editCategoryIcon')">
                            <i class="fas fa-palette"></i> İkon Seç
                        </button>
                    </div>
                </div>
                <button type="submit" class="btn-submit">Güncelle</button>
            </form>
        </div>
    `;
    
    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.id = 'editCategoryModal';
    modal.innerHTML = `
        <div class="modal-content">
            <span class="close" onclick="closeModal('editCategoryModal')">&times;</span>
            ${modalHTML}
        </div>
    `;
    
    document.body.appendChild(modal);
    modal.style.display = 'block';
    
    document.getElementById('editCategoryForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        const formData = new FormData(e.target);
        
        const updatedCategory = {
            name: formData.get('categoryName').trim(),
            icon: formData.get('categoryIcon').trim(),
            subcategories: serviceCategories[categoryKey].subcategories
        };
        
        try {
            // Update local data
            serviceCategories[categoryKey] = updatedCategory;
            
            // Update in Firebase
            await updateServiceCategoryInFirebase(categoryKey, updatedCategory);
            
            // Also save to localStorage as backup
            localStorage.setItem('serviceCategories', JSON.stringify(serviceCategories));
            
            closeModal('editCategoryModal');
            loadServicesList();
            alert('Kategori başarıyla güncellendi!');
        } catch (error) {
            console.error('Error updating category:', error);
            alert('Kategori güncellenirken hata oluştu. Lütfen tekrar deneyin.');
        }
    });
}

// Add subcategory to service category
function addSubcategory(categoryKey) {
    const modalHTML = `
        <div class="service-form">
            <h3>Alt Hizmet Ekle</h3>
            <form id="addSubcategoryForm">
                <div class="form-group">
                    <label for="subcategoryName">Alt Hizmet Adı</label>
                    <input type="text" id="subcategoryName" name="subcategoryName" required placeholder="Örn: Hydrafacial cilt bakımı">
                </div>
                <div class="form-group">
                    <label for="subcategoryPrice">Fiyat (₺)</label>
                    <input type="number" id="subcategoryPrice" name="subcategoryPrice" required placeholder="300" min="0" step="0.01">
                </div>
                <div class="form-group">
                    <label for="subcategoryDuration">Süre (dakika)</label>
                    <input type="number" id="subcategoryDuration" name="subcategoryDuration" required placeholder="60" min="1">
                </div>
                <button type="submit" class="btn-submit">Alt Hizmet Ekle</button>
            </form>
        </div>
    `;
    
    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.id = 'addSubcategoryModal';
    modal.innerHTML = `
        <div class="modal-content">
            <span class="close" onclick="closeModal('addSubcategoryModal')">&times;</span>
            ${modalHTML}
        </div>
    `;
    
    document.body.appendChild(modal);
    modal.style.display = 'block';
    
    document.getElementById('addSubcategoryForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        const formData = new FormData(e.target);
        
        const newSubcategory = {
            name: formData.get('subcategoryName').trim(),
            price: parseFloat(formData.get('subcategoryPrice')),
            duration: parseInt(formData.get('subcategoryDuration'))
        };
        
        try {
            // Add to local data
            serviceCategories[categoryKey].subcategories.push(newSubcategory);
            
            // Add to Firebase
            await addSubcategoryToFirebase(categoryKey, newSubcategory);
            
            // Also save to localStorage as backup
            localStorage.setItem('serviceCategories', JSON.stringify(serviceCategories));
            
            closeModal('addSubcategoryModal');
            loadServicesList();
            
            alert('Alt hizmet başarıyla eklendi!');
        } catch (error) {
            console.error('Error adding subcategory:', error);
            alert('Alt hizmet eklenirken hata oluştu. Lütfen tekrar deneyin.');
        }
    });
}

// Edit service category (inline)
function editServiceCategory(categoryKey) {
    editCategoryDetails(categoryKey);
}

// Delete service category
async function deleteServiceCategory(categoryKey) {
    if (confirm('Bu kategoriyi silmek istediğinizden emin misiniz? Bu işlem geri alınamaz!')) {
        try {
            // Remove from local data
            delete serviceCategories[categoryKey];
            
            // Delete from Firebase
            await deleteServiceCategoryFromFirebase(categoryKey);
            
            // Also save to localStorage as backup
            localStorage.setItem('serviceCategories', JSON.stringify(serviceCategories));
            
            loadServicesList();
            alert('Kategori başarıyla silindi!');
        } catch (error) {
            console.error('Error deleting service category:', error);
            alert('Kategori silinirken hata oluştu. Lütfen tekrar deneyin.');
        }
    }
}

// Personel Maaş Yönetimi
function showStaffSalaryModal() {
    const modalHTML = `
        <div class="salary-management">
            <h3>Personel Maaş Yönetimi</h3>
            <div class="salary-list">
                ${staff.map(member => {
                    const salary = staffSalaries.find(s => s.staffId === member.id) || { type: 'monthly', amount: 0, commission: 0 };
                    return `
                        <div class="salary-item">
                            <div class="staff-info">
                                <div class="staff-avatar">${member.avatar}</div>
                                <div>
                                    <h4>${member.name}</h4>
                                    <p>${member.specialty}</p>
                                </div>
                            </div>
                            <div class="salary-form">
                                <div class="form-group">
                                    <label>Maaş Türü</label>
                                    <select onchange="updateSalaryType(${member.id}, this.value)">
                                        <option value="monthly" ${salary.type === 'monthly' ? 'selected' : ''}>Aylık Maaş</option>
                                        <option value="commission" ${salary.type === 'commission' ? 'selected' : ''}>Komisyon</option>
                                        <option value="hybrid" ${salary.type === 'hybrid' ? 'selected' : ''}>Aylık + Komisyon</option>
                                    </select>
                                </div>
                                <div class="form-group">
                                    <label>Aylık Maaş (₺)</label>
                                    <input type="number" value="${salary.amount}" onchange="updateSalaryAmount(${member.id}, this.value)" min="0">
                                </div>
                                <div class="form-group" style="display: ${salary.type === 'commission' || salary.type === 'hybrid' ? 'block' : 'none'}">
                                    <label>Komisyon (%)</label>
                                    <input type="number" value="${salary.commission}" onchange="updateSalaryCommission(${member.id}, this.value)" min="0" max="100">
                                </div>
                            </div>
                        </div>
                    `;
                }).join('')}
            </div>
        </div>
    `;
    
    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.id = 'staffSalaryModal';
    modal.innerHTML = `
        <div class="modal-content large-modal">
            <span class="close" onclick="closeModal('staffSalaryModal')">&times;</span>
            ${modalHTML}
        </div>
    `;
    
    document.body.appendChild(modal);
    modal.style.display = 'block';
}

// Personel Hesapları
function showStaffAccountsModal() {
    const modalHTML = `
        <div class="staff-accounts">
            <h3>Personel Hesapları</h3>
            <div class="accounts-list">
                ${staff.map(member => {
                    const account = staffAccounts.find(a => a.staffId === member.id);
                    return `
                        <div class="account-item">
                            <div class="staff-info">
                                <div class="staff-avatar">${member.avatar}</div>
                                <div>
                                    <h4>${member.name}</h4>
                                    <p>${member.specialty}</p>
                                </div>
                            </div>
                            <div class="account-details">
                                ${account ? `
                                    <div class="account-info">
                                        <p><strong>Kullanıcı Adı:</strong> ${account.username}</p>
                                        <p><strong>Şifre:</strong> ${account.password}</p>
                                        <p><strong>Oluşturulma:</strong> ${new Date(account.createdAt).toLocaleDateString('tr-TR')}</p>
                                    </div>
                                    <div class="account-actions">
                                        <button class="admin-btn admin-btn-sm admin-btn-warning" onclick="regeneratePassword(${member.id})">
                                            <i class="fas fa-key"></i> Şifre Yenile
                                        </button>
                                        <button class="admin-btn admin-btn-sm admin-btn-danger" onclick="deleteStaffAccount(${member.id})">
                                            <i class="fas fa-trash"></i> Hesap Sil
                                        </button>
                                    </div>
                                ` : `
                                    <div class="no-account">
                                        <p>Henüz hesap oluşturulmamış</p>
                                        <button class="admin-btn admin-btn-sm admin-btn-primary" onclick="createStaffAccount(${member.id})">
                                            <i class="fas fa-plus"></i> Hesap Oluştur
                                        </button>
                                    </div>
                                `}
                            </div>
                        </div>
                    `;
                }).join('')}
            </div>
        </div>
    `;
    
    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.id = 'staffAccountsModal';
    modal.innerHTML = `
        <div class="modal-content large-modal">
            <span class="close" onclick="closeModal('staffAccountsModal')">&times;</span>
            ${modalHTML}
        </div>
    `;
    
    document.body.appendChild(modal);
    modal.style.display = 'block';
}

// Maaş güncelleme fonksiyonları
function updateSalaryType(staffId, type) {
    let salary = staffSalaries.find(s => s.staffId === staffId);
    if (!salary) {
        salary = { staffId, type, amount: 0, commission: 0 };
        staffSalaries.push(salary);
    } else {
        salary.type = type;
    }
    
    // Komisyon alanını göster/gizle
    const commissionField = event.target.closest('.salary-item').querySelector('.form-group:last-child');
    if (type === 'commission' || type === 'hybrid') {
        commissionField.style.display = 'block';
    } else {
        commissionField.style.display = 'none';
    }
    
    saveStaffSalaries();
    updateMonthlyExpenses();
}

function updateSalaryAmount(staffId, amount) {
    let salary = staffSalaries.find(s => s.staffId === staffId);
    if (!salary) {
        salary = { staffId, type: 'monthly', amount: 0, commission: 0 };
        staffSalaries.push(salary);
    }
    salary.amount = parseFloat(amount) || 0;
    saveStaffSalaries();
    updateMonthlyExpenses();
}

function updateSalaryCommission(staffId, commission) {
    let salary = staffSalaries.find(s => s.staffId === staffId);
    if (!salary) {
        salary = { staffId, type: 'commission', amount: 0, commission: 0 };
        staffSalaries.push(salary);
    }
    salary.commission = parseFloat(commission) || 0;
    saveStaffSalaries();
    updateMonthlyExpenses();
}

// Personel hesap oluşturma
function createStaffAccount(staffId) {
    const member = staff.find(s => s.id === staffId);
    if (!member) return;
    
    const username = generateUsername(member.name);
    const password = generatePassword();
    
    const account = {
        staffId,
        username,
        password,
        createdAt: new Date().toISOString(),
        isActive: true
    };
    
    staffAccounts.push(account);
    saveStaffAccounts();
    
    // Kullanıcıyı users array'ine ekle
    const user = {
        id: Date.now(),
        firstName: member.name.split(' ')[0],
        lastName: member.name.split(' ').slice(1).join(' '),
        name: member.name,
        email: `${username}@salon.com`,
        phone: '+905000000000',
        password: password,
        role: 'staff',
        staffId: staffId,
        createdAt: new Date().toISOString()
    };
    
    users.push(user);
    saveToFirebase('users', users);
    
    showSuccessMessage(`${member.name} için hesap oluşturuldu!`);
    showStaffAccountsModal();
}

function generateUsername(name) {
    const cleanName = name.toLowerCase()
        .replace(/[^a-z0-9]/g, '')
        .substring(0, 8);
    const randomNum = Math.floor(Math.random() * 1000);
    return `${cleanName}${randomNum}`;
}

function generatePassword() {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let password = '';
    for (let i = 0; i < 8; i++) {
        password += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return password;
}

// Aylık giderleri güncelle
function updateMonthlyExpenses() {
    const currentMonth = new Date().getMonth();
    const currentYear = new Date().getFullYear();
    
    // Eski maaş giderlerini sil
    expenses = expenses.filter(expense => expense.category !== 'maas');
    
    // Yeni maaş giderlerini ekle
    staffSalaries.forEach(salary => {
        const member = staff.find(s => s.id === salary.staffId);
        if (!member) return;
        
        let monthlyAmount = 0;
        if (salary.type === 'monthly') {
            monthlyAmount = salary.amount;
        } else if (salary.type === 'commission') {
            // Komisyon için varsayılan bir tutar (aylık gelirin %'si)
            monthlyAmount = 0; // Komisyon sadece işlem yapıldığında hesaplanır
        } else if (salary.type === 'hybrid') {
            monthlyAmount = salary.amount;
        }
        
        if (monthlyAmount > 0) {
            const expense = {
                id: Date.now() + Math.random(),
                description: `${member.name} - Aylık Maaş`,
                amount: monthlyAmount,
                date: new Date().toISOString().split('T')[0],
                category: 'maas',
                staffId: salary.staffId,
                createdAt: new Date().toISOString()
            };
            expenses.push(expense);
        }
    });
    
    saveToFirebase('expenses', expenses);
    loadRevenueData();
}

// Veri kaydetme fonksiyonları
function saveStaffSalaries() {
    localStorage.setItem('staffSalaries', JSON.stringify(staffSalaries));
    saveToFirebase('staffSalaries', staffSalaries);
}

function saveStaffAccounts() {
    localStorage.setItem('staffAccounts', JSON.stringify(staffAccounts));
    saveToFirebase('staffAccounts', staffAccounts);
}

function saveStaffAvailability() {
    localStorage.setItem('staffAvailability', JSON.stringify(staffAvailability));
    saveToFirebase('staffAvailability', staffAvailability);
}

function saveInvoices() {
    localStorage.setItem('invoices', JSON.stringify(invoices));
    saveToFirebase('invoices', invoices);
}

// Müsaitlik yönetimi fonksiyonları
function updateStaffAvailability(staffId, field, value) {
    let availability = staffAvailability.find(a => a.staffId === staffId);
    if (!availability) {
        availability = { 
            staffId, 
            workingDays: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'],
            workingHours: { start: '09:00', end: '18:00' },
            offDays: [],
            isActive: true
        };
        staffAvailability.push(availability);
    }
    
    if (field === 'isActive') {
        availability.isActive = value === 'true';
    }
    
    saveStaffAvailability();
}

function updateWorkingDays(staffId, day, isChecked) {
    let availability = staffAvailability.find(a => a.staffId === staffId);
    if (!availability) {
        availability = { 
            staffId, 
            workingDays: [],
            workingHours: { start: '09:00', end: '18:00' },
            offDays: [],
            isActive: true
        };
        staffAvailability.push(availability);
    }
    
    if (isChecked) {
        if (!availability.workingDays.includes(day)) {
            availability.workingDays.push(day);
        }
    } else {
        availability.workingDays = availability.workingDays.filter(d => d !== day);
    }
    
    saveStaffAvailability();
}

function updateWorkingHours(staffId, type, time) {
    let availability = staffAvailability.find(a => a.staffId === staffId);
    if (!availability) {
        availability = { 
            staffId, 
            workingDays: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'],
            workingHours: { start: '09:00', end: '18:00' },
            offDays: [],
            isActive: true
        };
        staffAvailability.push(availability);
    }
    
    availability.workingHours[type] = time;
    saveStaffAvailability();
}

function addOffDay(staffId) {
    const input = document.getElementById(`off-day-${staffId}`);
    const date = input.value;
    if (!date) return;
    
    let availability = staffAvailability.find(a => a.staffId === staffId);
    if (!availability) {
        availability = { 
            staffId, 
            workingDays: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'],
            workingHours: { start: '09:00', end: '18:00' },
            offDays: [],
            isActive: true
        };
        staffAvailability.push(availability);
    }
    
    if (!availability.offDays.includes(date)) {
        availability.offDays.push(date);
        saveStaffAvailability();
        showStaffAvailabilityModal(); // Refresh modal
    }
    
    input.value = '';
}

function removeOffDay(staffId, date) {
    let availability = staffAvailability.find(a => a.staffId === staffId);
    if (availability) {
        availability.offDays = availability.offDays.filter(d => d !== date);
        saveStaffAvailability();
        showStaffAvailabilityModal(); // Refresh modal
    }
}

function getDayName(day) {
    const days = {
        'monday': 'Pazartesi',
        'tuesday': 'Salı',
        'wednesday': 'Çarşamba',
        'thursday': 'Perşembe',
        'friday': 'Cuma',
        'saturday': 'Cumartesi',
        'sunday': 'Pazar'
    };
    return days[day] || day;
}

// Manuel randevu oluşturma
function handleManualAppointmentSubmit(e) {
    e.preventDefault();
    
    const formData = new FormData(e.target);
    const appointment = {
        id: Date.now(),
        name: formData.get('customerName'),
        phone: formData.get('customerPhone'),
        email: '',
        serviceName: formData.get('serviceName'),
        servicePrice: getServicePrice(formData.get('serviceName')),
        date: formData.get('date'),
        time: formData.get('time'),
        staffId: parseInt(formData.get('staffId')),
        status: 'confirmed',
        notes: formData.get('notes') || '',
        createdAt: new Date().toISOString(),
        isManual: true
    };
    
    appointments.push(appointment);
    saveToFirebase('appointments', appointments);
    
    showSuccessMessage('Manuel randevu başarıyla oluşturuldu!');
    closeModal('manualAppointmentModal');
    showStaffAppointmentsModal(); // Refresh modal
}

function getServicePrice(serviceName) {
    for (const category of Object.values(serviceCategories)) {
        for (const sub of category.subcategories) {
            if (sub.name === serviceName) {
                return sub.price;
            }
        }
    }
    return 0;
}

// Randevu iptal etme
function cancelAppointment(appointmentId) {
    if (confirm('Bu randevuyu iptal etmek istediğinizden emin misiniz?')) {
        const appointment = appointments.find(apt => apt.id === appointmentId);
        if (appointment) {
            appointment.status = 'cancelled';
            saveToFirebase('appointments', appointments);
            showSuccessMessage('Randevu iptal edildi!');
            showStaffAppointmentsModal(); // Refresh modal
        }
    }
}

// Ek hizmet ekleme
function addAdditionalService() {
    const select = document.getElementById('additionalServiceSelect');
    const serviceName = select.value;
    const servicePrice = select.selectedOptions[0].dataset.price;
    
    if (!serviceName) return;
    
    const additionalServices = document.getElementById('additional-services');
    const serviceItem = document.createElement('div');
    serviceItem.className = 'invoice-item additional-service';
    serviceItem.innerHTML = `
        <span class="item-name">${serviceName}</span>
        <span class="item-price">${servicePrice}₺</span>
        <button onclick="removeAdditionalService(this)" class="btn-remove">×</button>
    `;
    
    additionalServices.appendChild(serviceItem);
    select.value = '';
    updateInvoiceTotal();
}

function removeAdditionalService(button) {
    button.parentElement.remove();
    updateInvoiceTotal();
}

function updateInvoiceTotal() {
    const basePrice = parseFloat(document.querySelector('.invoice-item:first-child .item-price').textContent) || 0;
    const additionalPrices = Array.from(document.querySelectorAll('.additional-service .item-price'))
        .map(el => parseFloat(el.textContent))
        .reduce((sum, price) => sum + price, 0);
    
    const subtotal = basePrice + additionalPrices;
    const tax = subtotal * 0.18;
    const total = subtotal + tax;
    
    document.getElementById('subtotal').textContent = subtotal.toFixed(2) + '₺';
    document.getElementById('tax').textContent = tax.toFixed(2) + '₺';
    document.getElementById('total').textContent = total.toFixed(2) + '₺';
}

// Randevuyu tamamlama
function completeAppointment(appointmentId) {
    const appointment = appointments.find(apt => apt.id === appointmentId);
    if (!appointment) return;
    
    // Get payment method
    const paymentMethod = document.querySelector('input[name="paymentMethod"]:checked').value;
    
    // Calculate total
    const basePrice = parseFloat(document.querySelector('.invoice-item:first-child .item-price').textContent) || 0;
    const additionalPrices = Array.from(document.querySelectorAll('.additional-service .item-price'))
        .map(el => parseFloat(el.textContent))
        .reduce((sum, price) => sum + price, 0);
    
    const subtotal = basePrice + additionalPrices;
    const tax = subtotal * 0.18;
    const total = subtotal + tax;
    
    // Create invoice
    const invoice = {
        id: Date.now(),
        appointmentId: appointmentId,
        customerName: appointment.name,
        customerPhone: appointment.phone,
        baseService: appointment.serviceName,
        basePrice: basePrice,
        additionalServices: Array.from(document.querySelectorAll('.additional-service')).map(item => ({
            name: item.querySelector('.item-name').textContent,
            price: parseFloat(item.querySelector('.item-price').textContent)
        })),
        subtotal: subtotal,
        tax: tax,
        total: total,
        paymentMethod: paymentMethod,
        createdAt: new Date().toISOString(),
        status: 'completed'
    };
    
    invoices.push(invoice);
    saveInvoices();
    
    // Update appointment status
    appointment.status = 'completed';
    appointment.totalAmount = total;
    appointment.paymentMethod = paymentMethod;
    saveToFirebase('appointments', appointments);
    
    showSuccessMessage('Randevu başarıyla tamamlandı!');
    closeModal('invoiceModal');
    showStaffAppointmentsModal(); // Refresh modal
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
window.showMyAppointments = showMyAppointments;
window.cancelAppointment = cancelAppointment;
window.logout = logout;
window.toggleProfileDropdown = toggleProfileDropdown;
window.closeProfileDropdown = closeProfileDropdown;
window.updateProfileInfo = updateProfileInfo;
window.toggleMobileMenu = toggleMobileMenu;
window.closeMobileMenu = closeMobileMenu;
window.selectCustomer = selectCustomer;
window.nextStep = nextStep;
window.prevStep = prevStep;
window.showAddServiceModal = showAddServiceModal;
window.showEditServiceModal = showEditServiceModal;
window.showStaffSalaryModal = showStaffSalaryModal;
window.showStaffAccountsModal = showStaffAccountsModal;
window.updateSalaryType = updateSalaryType;
window.updateSalaryAmount = updateSalaryAmount;
window.updateSalaryCommission = updateSalaryCommission;
window.createStaffAccount = createStaffAccount;
window.showAdminTab = showAdminTab;
window.goToHomePage = goToHomePage;
window.showStaffAvailabilityModal = showStaffAvailabilityModal;
window.showStaffAppointmentsModal = showStaffAppointmentsModal;
window.showManualAppointmentModal = showManualAppointmentModal;
window.showInvoiceModal = showInvoiceModal;
window.updateStaffAvailability = updateStaffAvailability;
window.updateWorkingDays = updateWorkingDays;
window.updateWorkingHours = updateWorkingHours;
window.addOffDay = addOffDay;
window.removeOffDay = removeOffDay;
window.handleManualAppointmentSubmit = handleManualAppointmentSubmit;
window.cancelAppointment = cancelAppointment;
window.addAdditionalService = addAdditionalService;
window.removeAdditionalService = removeAdditionalService;
window.completeAppointment = completeAppointment;
window.handleAddServiceSubmit = handleAddServiceSubmit;
window.editCategoryDetails = editCategoryDetails;
window.addSubcategory = addSubcategory;
window.editServiceCategory = editServiceCategory;
window.deleteServiceCategory = deleteServiceCategory;
window.editSubcategory = editSubcategory;
window.deleteSubcategory = deleteSubcategory;
window.exportServices = exportServices;
window.importServices = importServices;
window.showIconPicker = showIconPicker;
window.setupIconPickerEvents = setupIconPickerEvents;

// Staff Management Functions
function showAddStaffModal() {
    const modalHTML = `
        <div class="modal" id="addStaffModal">
            <div class="modal-content">
                <div class="modal-header">
                    <h3>Yeni Personel Ekle</h3>
                    <button class="close" onclick="closeModal('addStaffModal')">&times;</button>
                </div>
                <form id="addStaffForm" onsubmit="handleAddStaffSubmit(event)">
                    <div class="form-group">
                        <label for="staffName">Ad Soyad:</label>
                        <input type="text" id="staffName" name="name" required>
                    </div>
                    <div class="form-group">
                        <label for="staffSpecialty">Uzmanlık:</label>
                        <input type="text" id="staffSpecialty" name="specialty" required>
                    </div>
                    <div class="form-group">
                        <label for="staffPhone">Telefon:</label>
                        <input type="tel" id="staffPhone" name="phone" required>
                    </div>
                    <div class="form-group">
                        <label for="staffEmail">E-posta:</label>
                        <input type="email" id="staffEmail" name="email" required>
                    </div>
                    <div class="form-group">
                        <label for="staffAvatar">Avatar:</label>
                        <select id="staffAvatar" name="avatar" required>
                            <option value="👩‍⚕️">👩‍⚕️ Hemşire</option>
                            <option value="👨‍⚕️">👨‍⚕️ Doktor</option>
                            <option value="👩‍💼">👩‍💼 Uzman</option>
                            <option value="👨‍💼">👨‍💼 Uzman</option>
                            <option value="👩‍🎨">👩‍🎨 Sanatçı</option>
                            <option value="👨‍🎨">👨‍🎨 Sanatçı</option>
                        </select>
                    </div>
                    <div class="form-actions">
                        <button type="button" onclick="closeModal('addStaffModal')" class="btn-secondary">İptal</button>
                        <button type="submit" class="btn-primary">Personel Ekle</button>
                    </div>
                </form>
            </div>
        </div>
    `;
    
    document.body.insertAdjacentHTML('beforeend', modalHTML);
    document.getElementById('addStaffModal').style.display = 'flex';
}

function handleAddStaffSubmit(event) {
    event.preventDefault();
    
    const formData = new FormData(event.target);
    const newStaff = {
        id: Date.now(),
        name: formData.get('name'),
        specialty: formData.get('specialty'),
        phone: formData.get('phone'),
        email: formData.get('email'),
        avatar: formData.get('avatar'),
        createdAt: new Date().toISOString()
    };
    
    // Add to staff array
    staff.push(newStaff);
    
    // Save to Firebase and localStorage
    saveToFirebase('staff', staff);
    localStorage.setItem('staff', JSON.stringify(staff));
    
    // Close modal and refresh list
    closeModal('addStaffModal');
    loadStaffList();
    
    console.log('New staff added:', newStaff);
}

function editStaff(staffId) {
    const member = staff.find(s => s.id === staffId);
    if (!member) return;
    
    const modalHTML = `
        <div class="modal" id="editStaffModal">
            <div class="modal-content">
                <div class="modal-header">
                    <h3>Personel Düzenle</h3>
                    <button class="close" onclick="closeModal('editStaffModal')">&times;</button>
                </div>
                <form id="editStaffForm" onsubmit="handleEditStaffSubmit(event, ${staffId})">
                    <div class="form-group">
                        <label for="editStaffName">Ad Soyad:</label>
                        <input type="text" id="editStaffName" name="name" value="${member.name}" required>
                    </div>
                    <div class="form-group">
                        <label for="editStaffSpecialty">Uzmanlık:</label>
                        <input type="text" id="editStaffSpecialty" name="specialty" value="${member.specialty}" required>
                    </div>
                    <div class="form-group">
                        <label for="editStaffPhone">Telefon:</label>
                        <input type="tel" id="editStaffPhone" name="phone" value="${member.phone || ''}" required>
                    </div>
                    <div class="form-group">
                        <label for="editStaffEmail">E-posta:</label>
                        <input type="email" id="editStaffEmail" name="email" value="${member.email || ''}" required>
                    </div>
                    <div class="form-group">
                        <label for="editStaffAvatar">Avatar:</label>
                        <select id="editStaffAvatar" name="avatar" required>
                            <option value="👩‍⚕️" ${member.avatar === '👩‍⚕️' ? 'selected' : ''}>👩‍⚕️ Hemşire</option>
                            <option value="👨‍⚕️" ${member.avatar === '👨‍⚕️' ? 'selected' : ''}>👨‍⚕️ Doktor</option>
                            <option value="👩‍💼" ${member.avatar === '👩‍💼' ? 'selected' : ''}>👩‍💼 Uzman</option>
                            <option value="👨‍💼" ${member.avatar === '👨‍💼' ? 'selected' : ''}>👨‍💼 Uzman</option>
                            <option value="👩‍🎨" ${member.avatar === '👩‍🎨' ? 'selected' : ''}>👩‍🎨 Sanatçı</option>
                            <option value="👨‍🎨" ${member.avatar === '👨‍🎨' ? 'selected' : ''}>👨‍🎨 Sanatçı</option>
                        </select>
                    </div>
                    <div class="form-actions">
                        <button type="button" onclick="closeModal('editStaffModal')" class="btn-secondary">İptal</button>
                        <button type="submit" class="btn-primary">Güncelle</button>
                    </div>
                </form>
            </div>
        </div>
    `;
    
    document.body.insertAdjacentHTML('beforeend', modalHTML);
    document.getElementById('editStaffModal').style.display = 'flex';
}

function handleEditStaffSubmit(event, staffId) {
    event.preventDefault();
    
    const formData = new FormData(event.target);
    const memberIndex = staff.findIndex(s => s.id === staffId);
    
    if (memberIndex !== -1) {
        staff[memberIndex] = {
            ...staff[memberIndex],
            name: formData.get('name'),
            specialty: formData.get('specialty'),
            phone: formData.get('phone'),
            email: formData.get('email'),
            avatar: formData.get('avatar'),
            updatedAt: new Date().toISOString()
        };
        
        // Save to Firebase and localStorage
        saveToFirebase('staff', staff);
        localStorage.setItem('staff', JSON.stringify(staff));
        
        // Close modal and refresh list
        closeModal('editStaffModal');
        loadStaffList();
        
        console.log('Staff updated:', staff[memberIndex]);
    }
}

function deleteStaff(staffId) {
    if (confirm('Bu personeli silmek istediğinizden emin misiniz?')) {
        const memberIndex = staff.findIndex(s => s.id === staffId);
        if (memberIndex !== -1) {
            staff.splice(memberIndex, 1);
            
            // Save to Firebase and localStorage
            saveToFirebase('staff', staff);
            localStorage.setItem('staff', JSON.stringify(staff));
            
            // Refresh list
            loadStaffList();
            
            console.log('Staff deleted:', staffId);
        }
    }
}

// Export functions to window
window.showAddStaffModal = showAddStaffModal;
window.handleAddStaffSubmit = handleAddStaffSubmit;
window.editStaff = editStaff;
window.handleEditStaffSubmit = handleEditStaffSubmit;
window.deleteStaff = deleteStaff;

// ==============================
// Services Section V2 – Redesign
// ==============================
let _svcState = { selectedCategory: 'all', query: '' };

function _renderHomepageServicesV2() {
    const servicesGrid = document.getElementById('services-grid');
    if (!servicesGrid) return;
    const cats = Object.entries(serviceCategories || {});

    if (cats.length === 0) {
        servicesGrid.innerHTML = `
            <div class="empty-services">
                <i class="fas fa-spa"></i>
                <h3>Henüz hizmet eklenmemiş</h3>
                <p>Hizmetler yakında eklenecek</p>
            </div>
        `;
        return;
    }

    const chips = [`<button class="svc-chip ${_svcState.selectedCategory==='all'?'active':''}" data-key="all">Tümü</button>`]
        .concat(cats.map(([key, cat]) => `<button class="svc-chip ${_svcState.selectedCategory===key?'active':''}" data-key="${key}">${cat.name}</button>`))
        .join('');

    const gather = () => {
        let list = [];
        if (_svcState.selectedCategory === 'all') {
            cats.forEach(([_, cat]) => (cat.subcategories || []).forEach(sub => list.push({ catName: cat.name, ...sub })));
        } else {
            const cat = serviceCategories[_svcState.selectedCategory];
            if (cat) (cat.subcategories || []).forEach(sub => list.push({ catName: cat.name, ...sub }));
        }
        const q = (_svcState.query || '').trim().toLowerCase();
        return q ? list.filter(s => String(s.name).toLowerCase().includes(q)) : list;
    };

    const services = gather();
    const cards = services.map(s => `
        <div class="svc-card">
            <div class="svc-card-header">
                <span class="svc-cat">${s.catName}</span>
                <span class="svc-duration"><i class="fas fa-clock"></i> ${s.duration} dk</span>
            </div>
            <h4 class="svc-title">${s.name}</h4>
            <div class="svc-footer">
                <span class="svc-price">${s.price}₺</span>
                <button class="svc-cta" onclick="selectServiceForAppointment('${s.name}', ${s.price}, ${s.duration})">
                    <i class="fas fa-calendar-plus"></i> Randevu Al
                </button>
            </div>
        </div>
    `).join('');

    servicesGrid.innerHTML = `
        <div class="services-v2">
            <div class="svc-toolbar">
                <div class="svc-chips">${chips}</div>
                <div class="svc-search">
                    <i class="fas fa-search"></i>
                    <input id="svc-search-input" type="text" placeholder="Hizmet ara..." value="${_svcState.query}">
                </div>
            </div>
            <div class="svc-grid">${cards || '<div class="svc-empty">Aramanıza uygun hizmet bulunamadı.</div>'}</div>
        </div>
    `;

    // Bind interactions
    servicesGrid.querySelectorAll('.svc-chip').forEach(btn => {
        btn.addEventListener('click', () => {
            _svcState.selectedCategory = btn.dataset.key;
            _renderHomepageServicesV2();
        });
    });
    const searchInput = document.getElementById('svc-search-input');
    if (searchInput) {
        searchInput.addEventListener('input', e => {
            _svcState.query = e.target.value;
            _renderHomepageServicesV2();
        });
    }
}

// Override existing loader with V2 render
async function loadHomepageServices() {
    const servicesGrid = document.getElementById('services-grid');
    if (!servicesGrid) return;
    try {
        await loadServiceCategoriesFromFirebase();
        _renderHomepageServicesV2();
    } catch (err) {
        console.error('Error loading homepage services (v2):', err);
        servicesGrid.innerHTML = `
            <div class="error-services">
                <i class="fas fa-exclamation-triangle"></i>
                <h3>Hizmetler yüklenemedi</h3>
                <p>Lütfen sayfayı yenileyin</p>
            </div>
        `;
    }
}

window.renderHomepageServices = _renderHomepageServicesV2;
