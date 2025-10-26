// 🚀 Gen Z Landing Page JavaScript

// 🎯 Global Variables
let typingTexts = ['Vibe', 'Energy', 'Mood', 'Story', 'Journey'];
let currentTextIndex = 0;
let isTyping = false;

// 🎪 Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    initializeAnimations();
    initializeNavigation();
    initializeAuth();
    startTypingAnimation();
    animateCounters();
});

// ✨ Initialize Animations
function initializeAnimations() {
    // 🌟 Intersection Observer for scroll animations
    const observerOptions = {
        threshold: 0.1,
        rootMargin: '0px 0px -50px 0px'
    };

    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.style.opacity = '1';
                entry.target.style.transform = 'translateY(0)';
            }
        });
    }, observerOptions);

    // 📱 Observe elements for scroll animations
    document.querySelectorAll('.feature-card, .stat').forEach(el => {
        el.style.opacity = '0';
        el.style.transform = 'translateY(20px)';
        el.style.transition = 'opacity 0.6s ease, transform 0.6s ease';
        observer.observe(el);
    });
}

// 🧭 Navigation Functions
function initializeNavigation() {
    // 📱 Mobile menu toggle
    const mobileToggle = document.querySelector('.mobile-menu-toggle');
    const navLinks = document.querySelector('.nav-links');

    if (mobileToggle) {
        mobileToggle.addEventListener('click', () => {
            navLinks.classList.toggle('active');
            mobileToggle.classList.toggle('active');
        });
    }

    // 🌊 Smooth scrolling for navigation links
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

    // 🔥 Navbar scroll effect
    window.addEventListener('scroll', () => {
        const navbar = document.querySelector('.navbar');
        if (window.scrollY > 50) {
            navbar.style.background = 'rgba(15, 15, 15, 0.95)';
        } else {
            navbar.style.background = 'rgba(15, 15, 15, 0.9)';
        }
    });
}

// ⌨️ Typing Animation
function startTypingAnimation() {
    const typingElement = document.getElementById('typing-text');
    if (!typingElement) return;

    function typeText() {
        if (isTyping) return;
        isTyping = true;

        const currentText = typingTexts[currentTextIndex];
        let charIndex = 0;

        // Clear current text
        typingElement.textContent = '';

        const typeInterval = setInterval(() => {
            if (charIndex < currentText.length) {
                typingElement.textContent += currentText.charAt(charIndex);
                charIndex++;
            } else {
                clearInterval(typeInterval);
                
                // Wait before deleting
                setTimeout(() => {
                    deleteText();
                }, 2000);
            }
        }, 100);
    }

    function deleteText() {
        const currentText = typingElement.textContent;
        let charIndex = currentText.length;

        const deleteInterval = setInterval(() => {
            if (charIndex > 0) {
                typingElement.textContent = currentText.substring(0, charIndex - 1);
                charIndex--;
            } else {
                clearInterval(deleteInterval);
                currentTextIndex = (currentTextIndex + 1) % typingTexts.length;
                isTyping = false;
                
                // Wait before typing next text
                setTimeout(() => {
                    typeText();
                }, 500);
            }
        }, 50);
    }

    // Start the animation
    typeText();
}

// 📊 Counter Animation
function animateCounters() {
    const counters = document.querySelectorAll('.stat-number');
    
    counters.forEach(counter => {
        const target = parseInt(counter.getAttribute('data-count'));
        const increment = target / 100;
        let current = 0;

        const timer = setInterval(() => {
            current += increment;
            if (current >= target) {
                counter.textContent = target.toLocaleString();
                clearInterval(timer);
            } else {
                counter.textContent = Math.floor(current).toLocaleString();
            }
        }, 20);
    });
}

// 🔐 Authentication Functions
function initializeAuth() {
    // 📝 Username availability checker
    const usernameInput = document.getElementById('registerUsername');
    if (usernameInput) {
        let debounceTimer;
        usernameInput.addEventListener('input', (e) => {
            clearTimeout(debounceTimer);
            debounceTimer = setTimeout(() => {
                checkUsernameAvailability(e.target.value);
            }, 500);
        });
    }

    // 🔒 Form validation
    setupFormValidation();
}

async function checkUsernameAvailability(username) {
    const checkElement = document.querySelector('.username-check');
    if (!checkElement || username.length < 3) {
        checkElement.textContent = '';
        return;
    }

    try {
        const response = await fetch(`/api/auth/check-username/${username}`);
        const data = await response.json();
        
        if (data.available) {
            checkElement.innerHTML = '<span style="color: #10b981;">✓ Available</span>';
        } else {
            checkElement.innerHTML = '<span style="color: #ef4444;">✗ Taken</span>';
        }
    } catch (error) {
        checkElement.innerHTML = '<span style="color: #f59e0b;">? Error</span>';
    }
}

function setupFormValidation() {
    // 📧 Email validation
    const emailInput = document.getElementById('registerEmail');
    if (emailInput) {
        emailInput.addEventListener('blur', (e) => {
            validateEmail(e.target.value);
        });
    }

    // 🔑 Password strength checker
    const passwordInput = document.getElementById('registerPassword');
    if (passwordInput) {
        passwordInput.addEventListener('input', (e) => {
            checkPasswordStrength(e.target.value);
        });
    }
}

function validateEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
}

function checkPasswordStrength(password) {
    // Simple password strength checker
    const strength = {
        weak: password.length < 6,
        medium: password.length >= 6 && password.length < 10,
        strong: password.length >= 10 && /[A-Z]/.test(password) && /[0-9]/.test(password)
    };
    
    // You can add visual feedback here
    return strength;
}

// 📱 Modal Functions
function showAuthModal(mode = 'login') {
    const modal = document.getElementById('authModal');
    const loginForm = document.getElementById('loginForm');
    const registerForm = document.getElementById('registerForm');
    
    modal.classList.add('active');
    document.body.style.overflow = 'hidden';
    
    if (mode === 'login') {
        loginForm.style.display = 'block';
        registerForm.style.display = 'none';
    } else {
        loginForm.style.display = 'none';
        registerForm.style.display = 'block';
    }
}

function closeAuthModal() {
    const modal = document.getElementById('authModal');
    modal.classList.remove('active');
    document.body.style.overflow = 'auto';
    clearAuthForms();
}

function switchAuthMode(mode) {
    const loginForm = document.getElementById('loginForm');
    const registerForm = document.getElementById('registerForm');
    
    if (mode === 'login') {
        loginForm.style.display = 'block';
        registerForm.style.display = 'none';
    } else {
        loginForm.style.display = 'none';
        registerForm.style.display = 'block';
    }
    clearAuthForms();
}

function clearAuthForms() {
    document.querySelectorAll('.auth-form input').forEach(input => {
        input.value = '';
    });
    document.querySelector('.username-check').textContent = '';
}

// 🔐 Authentication Handlers
async function handleLogin(event) {
    event.preventDefault();
    
    const btn = document.getElementById('loginBtn');
    const identifier = document.getElementById('loginIdentifier').value.trim();
    const password = document.getElementById('loginPassword').value;
    
    if (!identifier || !password) {
        showToast('Please fill in all fields', 'error');
        return;
    }
    
    setButtonLoading(btn, true);
    
    try {
        const response = await fetch('/api/auth/login', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ identifier, password })
        });
        
        const data = await response.json();
        
        if (data.success) {
            // 🎉 Login successful
            localStorage.setItem('token', data.token);
            localStorage.setItem('user', JSON.stringify(data.user));
            
            showToast(data.message, 'success');
            showLoadingOverlay('Logging you in...');
            
            setTimeout(() => {
                window.location.href = '/feed';
            }, 1500);
        } else {
            showToast(data.message, 'error');
        }
    } catch (error) {
        console.error('Login error:', error);
        showToast('Something went wrong. Please try again.', 'error');
    } finally {
        setButtonLoading(btn, false);
    }
}

async function handleRegister(event) {
    event.preventDefault();
    
    const btn = document.getElementById('registerBtn');
    const username = document.getElementById('registerUsername').value.trim();
    const email = document.getElementById('registerEmail').value.trim();
    const displayName = document.getElementById('registerDisplayName').value.trim();
    const password = document.getElementById('registerPassword').value;
    
    // 🔍 Validation
    if (!username || !email || !displayName || !password) {
        showToast('Please fill in all fields', 'error');
        return;
    }
    
    if (username.length < 3 || username.length > 20) {
        showToast('Username must be 3-20 characters', 'error');
        return;
    }
    
    if (!validateEmail(email)) {
        showToast('Please enter a valid email', 'error');
        return;
    }
    
    if (password.length < 6) {
        showToast('Password must be at least 6 characters', 'error');
        return;
    }
    
    setButtonLoading(btn, true);
    
    try {
        const response = await fetch('/api/auth/register', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ username, email, displayName, password })
        });
        
        const data = await response.json();
        
        if (data.success) {
            // 🎉 Registration successful
            localStorage.setItem('token', data.token);
            localStorage.setItem('user', JSON.stringify(data.user));
            
            showToast(data.message, 'success');
            showLoadingOverlay('Setting up your profile...');
            
            setTimeout(() => {
                window.location.href = '/feed';
            }, 2000);
        } else {
            if (data.errors) {
                data.errors.forEach(error => {
                    showToast(error.msg, 'error');
                });
            } else {
                showToast(data.message, 'error');
            }
        }
    } catch (error) {
        console.error('Registration error:', error);
        showToast('Something went wrong. Please try again.', 'error');
    } finally {
        setButtonLoading(btn, false);
    }
}

// 🔄 Loading States
function setButtonLoading(button, loading) {
    if (loading) {
        button.classList.add('loading');
        button.disabled = true;
    } else {
        button.classList.remove('loading');
        button.disabled = false;
    }
}

function showLoadingOverlay(text = 'Loading...') {
    const overlay = document.getElementById('loadingOverlay');
    const loadingText = document.querySelector('.loading-text');
    loadingText.textContent = text;
    overlay.classList.add('active');
}

function hideLoadingOverlay() {
    const overlay = document.getElementById('loadingOverlay');
    overlay.classList.remove('active');
}

// 🍞 Toast Notifications
function showToast(message, type = 'info') {
    const container = document.getElementById('toastContainer');
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.textContent = message;
    
    container.appendChild(toast);
    
    // 🗑️ Auto remove after 4 seconds
    setTimeout(() => {
        toast.style.animation = 'toastSlideOut 0.3s ease';
        setTimeout(() => {
            if (toast.parentNode) {
                toast.parentNode.removeChild(toast);
            }
        }, 300);
    }, 4000);
}

// 🌊 Scroll Functions
function scrollToFeatures() {
    const featuresSection = document.getElementById('features');
    if (featuresSection) {
        featuresSection.scrollIntoView({
            behavior: 'smooth',
            block: 'start'
        });
    }
}

// ⌨️ Keyboard Shortcuts
document.addEventListener('keydown', (e) => {
    // 🔐 ESC to close modal
    if (e.key === 'Escape') {
        closeAuthModal();
        hideLoadingOverlay();
    }
    
    // 🔑 Ctrl/Cmd + K to focus search (if implemented)
    if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        // Focus search input if available
    }
});

// 🎉 Easter Eggs & Fun Interactions
let clickCount = 0;
document.querySelector('.logo-icon').addEventListener('click', () => {
    clickCount++;
    if (clickCount === 5) {
        showToast('🔥 You found the secret! Welcome to the inner circle!', 'success');
        clickCount = 0;
        // Could trigger special animations or unlock features
    }
});

// 🌈 Dynamic Background Based on Time
function updateBackgroundBasedOnTime() {
    const hour = new Date().getHours();
    const bgGradient = document.querySelector('.bg-gradient');
    
    if (hour >= 6 && hour < 12) {
        // Morning vibes
        bgGradient.style.background = 'linear-gradient(135deg, #667eea 0%, #764ba2 50%, #f093fb 100%)';
    } else if (hour >= 12 && hour < 18) {
        // Afternoon energy
        bgGradient.style.background = 'linear-gradient(135deg, #4facfe 0%, #00f2fe 50%, #43e97b 100%)';
    } else if (hour >= 18 && hour < 22) {
        // Evening chill
        bgGradient.style.background = 'linear-gradient(135deg, #fa709a 0%, #fee140 50%, #667eea 100%)';
    } else {
        // Night mode
        bgGradient.style.background = 'linear-gradient(135deg, #2c3e50 0%, #3498db 50%, #9b59b6 100%)';
    }
}

// 🎯 Initialize time-based background
updateBackgroundBasedOnTime();

// 🔄 Update background every hour
setInterval(updateBackgroundBasedOnTime, 3600000);

// 📱 PWA Functions (for future implementation)
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('/sw.js')
            .then(registration => {
                console.log('SW registered: ', registration);
            })
            .catch(registrationError => {
                console.log('SW registration failed: ', registrationError);
            });
    });
}

// 🎵 Add some sound effects (optional, for user interaction)
function playClickSound() {
    // Could add subtle click sounds for buttons
    // const audio = new Audio('/assets/sounds/click.mp3');
    // audio.volume = 0.1;
    // audio.play().catch(() => {}); // Ignore autoplay restrictions
}

console.log('🔥 VIBE Platform loaded successfully! Welcome to the future of social media!');

// CSS Animation for toast slide out
const style = document.createElement('style');
style.textContent = `
    @keyframes toastSlideOut {
        from {
            opacity: 1;
            transform: translateX(0);
        }
        to {
            opacity: 0;
            transform: translateX(100%);
        }
    }
`;
document.head.appendChild(style);
