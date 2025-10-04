document.addEventListener("DOMContentLoaded", function () {
    // Theme toggle (your existing code is fine)
    const themeToggle = document.getElementById('themeToggle');
    const themeIcon = document.getElementById('themeIcon');
    const currentTheme = localStorage.getItem('theme') || 'dark';
    document.documentElement.setAttribute('data-theme', currentTheme);
    updateThemeIcon(currentTheme);

    if (themeToggle) {
        themeToggle.addEventListener('click', function() {
            let theme = document.documentElement.getAttribute('data-theme');
            let newTheme = theme === 'dark' ? 'light' : 'dark';
            document.documentElement.setAttribute('data-theme', newTheme);
            localStorage.setItem('theme', newTheme);
            updateThemeIcon(newTheme);
        });
    }

    function updateThemeIcon(theme) {
        if (!themeIcon) return;
        if (theme === 'dark') {
            themeIcon.innerHTML = '<path d="M12,7C9.24,7 7,9.24 7,12C7,14.76 9.24,17 12,17C14.76,17 17,14.76 17,12C17,9.24 14.76,7 12,7M12,2L14.39,5.42C13.65,5.15 12.84,5 12,5C11.16,5 10.35,5.15 9.61,5.42L12,2M3.34,7L7.5,6.65C6.9,7.16 6.36,7.78 5.94,8.5C5.5,9.24 5.25,10 5.11,10.79L3.34,7M3.36,17L5.12,13.23C5.26,14 5.53,14.78 5.95,15.5C6.37,16.24 6.91,16.86 7.5,17.37L3.36,17M20.65,7L18.88,10.79C18.74,10 18.47,9.23 18.05,8.5C17.63,7.78 17.1,7.15 16.5,6.64L20.65,7M20.64,17L16.5,17.36C17.09,16.85 17.62,16.22 18.04,15.5C18.46,14.77 18.73,14 18.87,13.21L20.64,17M12,22L9.59,18.56C10.33,18.83 11.14,19 12,19C12.82,19 13.63,18.83 14.37,18.56L12,22Z" />';
        } else {
            themeIcon.innerHTML = '<path d="M12,18C11.11,18 10.26,17.8 9.5,17.45C11.56,16.5 13,14.42 13,12C13,9.58 11.56,7.5 9.5,6.55C10.26,6.2 11.11,6 12,6A6,6 0 0,1 18,12A6,6 0 0,1 12,18M20,8.69V4H15.31L12,0.69L8.69,4H4V8.69L0.69,12L4,15.31V20H8.69L12,23.31L15.31,20H20V15.31L23.31,12L20,8.69Z" />';
        }
    }

    // Toggle password visibility
    const togglePassword = document.getElementById('toggle-password');
    if (togglePassword) {
        togglePassword.addEventListener('click', function() {
            const passwordInput = document.getElementById('password');
            if (!passwordInput) return;
            
            const type = passwordInput.getAttribute('type') === 'password' ? 'text' : 'password';
            passwordInput.setAttribute('type', type);
            
            const icon = this.querySelector('svg');
            if (type === 'text') {
                icon.innerHTML = '<path fill-rule="evenodd" clip-rule="evenodd" d="M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5zM12 17c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5zm0-8c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3z" fill="currentColor"/>';
            } else {
                icon.innerHTML = '<path fill-rule="evenodd" clip-rule="evenodd" d="M1.71998 1.71967C2.01287 1.42678 2.48775 1.42678 2.78064 1.71967L5.50969 4.44872C5.55341 4.48345 5.59378 4.52354 5.62977 4.5688L13.423 12.3621C13.4739 12.4011 13.5204 12.4471 13.561 12.5L16.2806 15.2197C16.5735 15.5126 16.5735 15.9874 16.2806 16.2803C15.9877 16.5732 15.5129 16.5732 15.22 16.2803L12.8547 13.915C11.771 14.5491 10.479 15 9.00031 15C6.85406 15 5.10432 14.0515 3.80787 12.9694C2.51318 11.8889 1.62553 10.6393 1.18098 9.93536C1.1751 9.92606 1.16907 9.91657 1.16291 9.90687C1.07468 9.768 0.960135 9.5877 0.902237 9.33506C0.85549 9.13108 0.855506 8.86871 0.902276 8.66474C0.960212 8.41207 1.07508 8.23131 1.16354 8.09212C1.16975 8.08235 1.17583 8.07278 1.18175 8.06341C1.63353 7.34824 2.55099 6.05644 3.89682 4.95717L1.71998 2.78033C1.42709 2.48744 1.42709 2.01256 1.71998 1.71967Z" fill="currentColor"/>';
            }
        });
    }

    // Clear errors on input
    document.querySelectorAll('input').forEach((input) => {
        input.addEventListener('input', function() {
            const fieldName = this.id;
            const errorField = document.getElementById(`${fieldName}_error`);
            if (errorField) errorField.textContent = '';
            
            const messagesDiv = document.getElementById('form-messages');
            if (messagesDiv) messagesDiv.style.display = 'none';
        });
    });

    // Form submission - UPDATED
    const form = document.getElementById('login-form');
    if (form) {
        form.addEventListener('submit', async function(e) {
            e.preventDefault();
            
            if (!validateForm()) return;

            // Show loading state
            document.getElementById('spinner')?.classList.remove('d-none');
            document.getElementById('btnText').textContent = 'Signing In...';
            document.getElementById('submitBtn').disabled = true;

            try {
                const loginData = {
                    email: document.getElementById('email').value.trim(),
                    password: document.getElementById('password').value
                };

                console.log('Sending login data:', loginData);

                const response = await fetch('/auth/login', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify(loginData)
                });

                const result = await response.json();
                console.log('Login response:', result);

                if (response.ok && result.success) {
                    showMessage(result.message || 'Login successful! Redirecting...', 'success');
                    
                    // Use redirect URL from backend or default to /dashboard
                    const redirectUrl = result.data?.redirect || '/dashboard';
                    
                    setTimeout(() => {
                        window.location.href = redirectUrl;
                    }, 1000);
                    
                } else {
                    let errorMessage = result.message || 'Login failed. Please try again.';
                    
                    if (response.status === 401) {
                        errorMessage = 'Invalid email or password. Please try again.';
                    } else if (response.status === 400) {
                        errorMessage = 'Please check your input and try again.';
                    }
                    
                    showMessage(errorMessage, 'error');
                    
                    if (result.errors) {
                        Object.keys(result.errors).forEach(field => {
                            const errorField = document.getElementById(`${field}_error`);
                            if (errorField) {
                                errorField.textContent = result.errors[field];
                            }
                        });
                    }
                    
                    resetFormState();
                }

            } catch (error) {
                console.error('Login network error:', error);
                showMessage('Network error. Please check your connection and try again.', 'error');
                resetFormState();
            }
        });
    }

    function validateForm() {
        let isValid = true;
        
        document.querySelectorAll('.error-message').forEach(el => {
            el.textContent = '';
        });
        
        const email = document.getElementById('email').value.trim();
        const emailError = document.getElementById('email_error');
        if (!email) {
            emailError.textContent = 'Please enter your email address.';
            isValid = false;
        } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
            emailError.textContent = 'Please enter a valid email address.';
            isValid = false;
        }

        const password = document.getElementById('password').value;
        const passwordError = document.getElementById('password_error');
        if (!password) {
            passwordError.textContent = 'Please enter your password.';
            isValid = false;
        }

        return isValid;
    }

    function showMessage(message, type) {
        const messageDiv = document.getElementById('form-messages');
        if (!messageDiv) return;
        
        messageDiv.className = `alert ${type === 'success' ? 'alert-success' : 'alert-danger'}`;
        messageDiv.textContent = message;
        messageDiv.style.display = 'block';
        
        messageDiv.scrollIntoView({ behavior: 'smooth', block: 'center' });
        
        if (type === 'success') {
            setTimeout(() => {
                messageDiv.style.display = 'none';
            }, 5000);
        }
    }

    function resetFormState() {
        const spinner = document.getElementById('spinner');
        const btnText = document.getElementById('btnText');
        const submitBtn = document.getElementById('submitBtn');
        
        if (spinner) spinner.classList.add('d-none');
        if (btnText) btnText.textContent = 'Sign In';
        if (submitBtn) submitBtn.disabled = false;
    }

    // Enter key support
    document.querySelectorAll('#login-form input').forEach(input => {
        input.addEventListener('keypress', function(e) {
            if (e.which === 13) {
                const form = document.getElementById('login-form');
                if (form) form.dispatchEvent(new Event('submit'));
            }
        });
    });
});