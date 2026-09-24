// ============================================
// public/js/profile.js - COMPLETE VERSION (Merges both scripts)
// ============================================

// CSRF Token handling
function getCSRFToken() {
    return document.querySelector('input[name="_token"]')?.value || 
           document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') || 
           '';
}

// Profile Picture Upload Functionality
function changeProfile() {
    document.getElementById('upload').click();
}

document.getElementById('upload')?.addEventListener('change', function(e) {
    if (e.target.files.length > 0) {
        const file = e.target.files[0];
        const fileError = document.getElementById('file-error');
        
        // Validate file type
        const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/bmp', 'image/svg+xml'];
        if (!validTypes.includes(file.type)) {
            fileError.textContent = 'Please select a valid image file (JPEG, PNG, GIF, BMP, SVG)';
            return;
        }

        // Validate file size (max 5MB)
        if (file.size > 5 * 1024 * 1024) {
            fileError.textContent = 'File size must be less than 5MB';
            return;
        }

        fileError.textContent = '';
        
        // Show preview
        const reader = new FileReader();
        reader.onload = function(e) {
            document.getElementById('profileImage').src = e.target.result;
        };
        reader.readAsDataURL(file);

        // Upload the file
        uploadProfilePicture(file);
    }
});

function uploadProfilePicture(file) {
    const formData = new FormData();
    formData.append('profile_picture', file);
    
    // Show loading state
    const changeProfileBtn = document.getElementById('changeProfile');
    const originalText = changeProfileBtn.innerHTML;
    changeProfileBtn.innerHTML = '<span>Uploading...</span>';
    changeProfileBtn.disabled = true;
    
    fetch('/profile/picture', {
        method: 'POST',
        body: formData,
        headers: {
            'X-CSRF-Token': getCSRFToken()
        }
    })
    .then(response => response.json())
    .then(data => {
        const fileError = document.getElementById('file-error');
        if (data.success) {
            fileError.textContent = '';
            // Update profile image with new URL from server
            if (data.data && data.data.profile_image_url) {
                document.getElementById('profileImage').src = data.data.profile_image_url;
                // Update avatar everywhere on the page
                document.querySelectorAll('.user-avatar, .profile-avatar').forEach(avatar => {
                    avatar.src = data.data.profile_image_url;
                });
            }
            showSuccessMessage('Profile picture updated successfully!');
        } else {
            fileError.textContent = data.message || 'Upload failed';
            showErrorMessage(data.message || 'Upload failed');
        }
    })
    .catch(error => {
        console.error('Error:', error);
        document.getElementById('file-error').textContent = 'Upload failed. Please try again.';
        showErrorMessage('Upload failed. Please try again.');
    })
    .finally(() => {
        // Reset button state
        changeProfileBtn.innerHTML = originalText;
        changeProfileBtn.disabled = false;
    });
}

function handlePasswordChange(form) {
    const submitBtn = form.querySelector('#profileResetPasswordSubmitBtn');
    const submitText = form.querySelector('#profileResetPasswordSubmitBtnText');
    const spinner = form.querySelector('.spinner');
    
    // Get form values
    const old_password = document.getElementById('old_password').value.trim();
    const password = document.getElementById('password').value.trim();
    const password_confirmation = document.getElementById('password_confirmation').value.trim();

    // Client-side validation
    if (!old_password) {
        showErrorMessage('Please enter your current password');
        document.getElementById('old_password').focus();
        return;
    }

    if (!password) {
        showErrorMessage('Please enter a new password');
        document.getElementById('password').focus();
        return;
    }

    if (password.length < 6) {
        showErrorMessage('Password must be at least 6 characters long');
        document.getElementById('password').focus();
        return;
    }

    if (password !== password_confirmation) {
        showErrorMessage('New password and confirmation do not match');
        document.getElementById('password_confirmation').focus();
        return;
    }

    if (old_password === password) {
        showErrorMessage('New password cannot be the same as current password');
        document.getElementById('password').focus();
        return;
    }
    
    // Show loading state
    submitBtn.disabled = true;
    spinner.classList.remove('d-none');
    submitText.textContent = 'Changing Password...';

    // Prepare JSON data
    const requestData = {
        old_password: old_password,
        password: password,
        password_confirmation: password_confirmation
    };
    
    console.log('🔄 Sending password change request...');
    
    fetch('/profile/update_password', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'X-CSRF-Token': getCSRFToken()
        },
        body: JSON.stringify(requestData)
    })
    .then(response => {
        console.log('📨 Response status:', response.status);
        console.log('📨 Response headers:', response.headers);
        return response.json();
    })
    .then(data => {
        console.log('📨 Full server response:', data);
        
        if (data.success) {
            console.log('✅ Password change successful in frontend');
            showSuccessMessage('Password changed successfully! Logging out...');
            form.reset();
            
            // Close modal if exists
            const modalElement = document.getElementById('exampleModal-2');
            if (modalElement) {
                const modal = bootstrap.Modal.getInstance(modalElement);
                if (modal) modal.hide();
            }
            
            // Logout after 1.5 seconds for security
            setTimeout(() => {
                window.location.href = '/logout';
            }, 1500);
        } else {
            console.log('❌ Password change failed in frontend:', data.message);
            showErrorMessage(data.message || 'Password change failed');
        }
    })
    .catch(error => {
        console.error('❌ Network error:', error);
        showErrorMessage('Password change failed. Please try again.');
    })
    .finally(() => {
        // Reset button state
        submitBtn.disabled = false;
        spinner.classList.add('d-none');
        submitText.textContent = 'Save Changes';
    });
}

function handleCurrencyChange(form) {
    const submitBtn = form.querySelector('#defaultCurrencySubmitBtn');
    const submitText = form.querySelector('#defaultCurrencySubmitBtnText');
    const spinner = form.querySelector('.spinner');
    
    // Show loading state
    submitBtn.disabled = true;
    spinner.classList.remove('d-none');
    submitText.textContent = 'Saving...';

    const formData = new FormData(form);
    
    fetch('/profile/change-default-currency', {
        method: 'POST',
        body: formData,
        headers: {
            'X-CSRF-Token': getCSRFToken()
        }
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            showSuccessMessage('Default currency updated successfully!');
            // Update the displayed currency
            const currencyDisplay = document.querySelector('.default-wallet-div .text-primary');
            if (currencyDisplay && data.data && data.data.currency) {
                currencyDisplay.textContent = data.data.currency;
            }
            // Close modal if exists
            const modalElement = document.getElementById('exampleModal');
            if (modalElement) {
                const modal = bootstrap.Modal.getInstance(modalElement);
                if (modal) modal.hide();
            }
        } else {
            showErrorMessage(data.message || 'Currency update failed');
        }
    })
    .catch(error => {
        console.error('Error:', error);
        showErrorMessage('Currency update failed. Please try again.');
    })
    .finally(() => {
        // Reset button state
        submitBtn.disabled = false;
        spinner.classList.add('d-none');
        submitText.textContent = 'Save Changes';
    });
}

function handleProfileUpdate(form) {
    const submitBtn = form.querySelector('#profileUpdateSubmitBtn');
    const submitText = form.querySelector('#profileUpdateSubmitBtnText');
    const spinner = form.querySelector('.spinner');
    
    // Show loading state
    submitBtn.disabled = true;
    spinner.classList.remove('d-none');
    submitText.textContent = 'Saving...';

    const formData = new FormData(form);
    
    fetch('/profile/update', {
        method: 'POST',
        body: formData,
        headers: {
            'X-CSRF-Token': getCSRFToken()
        }
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            showSuccessMessage('Profile updated successfully!');
            // Close modal if exists
            const modalElement = document.getElementById('exampleModal-3');
            if (modalElement) {
                const modal = bootstrap.Modal.getInstance(modalElement);
                if (modal) modal.hide();
            }
            // Reload to show updated data
            setTimeout(() => {
                window.location.reload();
            }, 1500);
        } else {
            showErrorMessage(data.message || 'Profile update failed');
        }
    })
    .catch(error => {
        console.error('Error:', error);
        showErrorMessage('Profile update failed. Please try again.');
    })
    .finally(() => {
        // Reset button state
        submitBtn.disabled = false;
        spinner.classList.add('d-none');
        submitText.textContent = 'Save Changes';
    });
}

// QR Code functionality
document.getElementById('updateQrCodeBtn')?.addEventListener('click', function() {
    updateQRCode();
});

// Utility functions for messages
function showSuccessMessage(message) {
    // You can use SweetAlert, toast, or custom notification
    if (typeof Swal !== 'undefined') {
        Swal.fire({
            icon: 'success',
            title: 'Success',
            text: message,
            timer: 3000,
            showConfirmButton: false
        });
    } else {
        alert('Success: ' + message);
    }
}

function showErrorMessage(message) {
    if (typeof Swal !== 'undefined') {
        Swal.fire({
            icon: 'error',
            title: 'Error',
            text: message,
            timer: 3000,
            showConfirmButton: false
        });
    } else {
        alert('Error: ' + message);
    }
}

// DOMContentLoaded - Initialize all event listeners
document.addEventListener('DOMContentLoaded', function() {
    console.log('✅ Profile page loaded');

    // Password Change Form Handling
    const passwordForm = document.getElementById('profileResetPasswordForm');
    if (passwordForm) {
        passwordForm.addEventListener('submit', function(e) {
            e.preventDefault();
            handlePasswordChange(this);
        });
    }

    // Default Currency Form Handling
    const currencyForm = document.getElementById('defaultCurrencyForm');
    if (currencyForm) {
        currencyForm.addEventListener('submit', function(e) {
            e.preventDefault();
            handleCurrencyChange(this);
        });
    }

    // Profile Update Form Handling
    const profileForm = document.getElementById('profileUpdateForm');
    if (profileForm) {
        profileForm.addEventListener('submit', function(e) {
            e.preventDefault();
            handleProfileUpdate(this);
        });
    }

    // Password visibility toggle
    const eyeIconHide = document.getElementById('eye-icon-hide');
    const eyeIconShow = document.getElementById('eye-icon-show');
    const passwordField = document.getElementById('password');

    if (eyeIconHide && eyeIconShow && passwordField) {
        eyeIconHide.addEventListener('click', function() {
            passwordField.type = 'text';
            eyeIconHide.classList.add('d-none');
            eyeIconShow.classList.remove('d-none');
        });

        eyeIconShow.addEventListener('click', function() {
            passwordField.type = 'password';
            eyeIconShow.classList.add('d-none');
            eyeIconHide.classList.remove('d-none');
        });
    }

    // Password strength indicator
    if (passwordField) {
        passwordField.addEventListener('input', function() {
            const password = this.value;
            const length = password.length;
            
            // Remove any existing strength indicator
            const existingIndicator = this.parentElement.querySelector('.password-strength');
            if (existingIndicator) {
                existingIndicator.remove();
            }
            
            if (length === 0) return;
            
            let strength = 'Weak';
            let color = 'danger';
            let percentage = 33;
            
            if (length >= 6 && length < 8) {
                strength = 'Fair';
                color = 'warning';
                percentage = 50;
            } else if (length >= 8 && length < 12) {
                strength = 'Good';
                color = 'info';
                percentage = 75;
            } else if (length >= 12) {
                strength = 'Strong';
                color = 'success';
                percentage = 100;
            }
            
            // Add strength indicator
            const indicator = document.createElement('div');
            indicator.className = 'password-strength mt-2';
            indicator.innerHTML = `
                <div class="progress" style="height: 5px;">
                    <div class="progress-bar bg-${color}" role="progressbar" style="width: ${percentage}%" aria-valuenow="${percentage}" aria-valuemin="0" aria-valuemax="100"></div>
                </div>
                <small class="text-${color}">${strength} password</small>
            `;
            
            this.parentElement.appendChild(indicator);
        });
    }

    // Clear form when modal is closed
    const passwordModal = document.getElementById('exampleModal-2');
    if (passwordModal) {
        passwordModal.addEventListener('hidden.bs.modal', function() {
            if (passwordForm) {
                passwordForm.reset();
            }
            if (eyeIconHide && eyeIconShow && passwordField) {
                eyeIconHide.classList.remove('d-none');
                eyeIconShow.classList.add('d-none');
                passwordField.type = 'password';
            }
            // Remove strength indicator
            const strengthIndicator = document.querySelector('.password-strength');
            if (strengthIndicator) {
                strengthIndicator.remove();
            }
        });
    }

    // Initialize phone input if needed
    if (typeof intlTelInput !== 'undefined' && document.getElementById('phone')) {
        const phoneInput = document.querySelector("#phone");
        const iti = intlTelInput(phoneInput, {
            initialCountry: "auto",
            geoIpLookup: function(callback) {
                fetch("https://ipapi.co/json")
                    .then(function(res) { return res.json(); })
                    .then(function(data) { callback(data.country_code); })
                    .catch(function() { callback("us"); });
            },
            utilsScript: "/utils.js"
        });

        phoneInput.addEventListener('countrychange', function() {
            const countryData = iti.getSelectedCountryData();
            const defaultCountryField = document.getElementById('defaultCountry');
            const carrierCodeField = document.getElementById('carrierCode');
            
            if (defaultCountryField) {
                defaultCountryField.value = countryData.iso2;
            }
            if (carrierCodeField) {
                carrierCodeField.value = countryData.dialCode;
            }
        });
    }
});