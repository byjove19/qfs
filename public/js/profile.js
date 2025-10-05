
// profile.js
document.addEventListener('DOMContentLoaded', function() {
  // Initialize user data from EJS template
  const userData = {
    id: userId,
    first_name: document.getElementById('first_name')?.value || '',
    last_name: document.getElementById('last_name')?.value || '',
    email: document.querySelector('.responsive-mail-text')?.textContent || '',
    phone: document.getElementById('phone')?.value || '',
    address_1: document.getElementById('address_1')?.value || '',
    address_2: document.getElementById('address_2')?.value || '',
    city: document.getElementById('city')?.value || '',
    state: document.getElementById('state')?.value || '',
    country_id: document.getElementById('country_id')?.value || '',
    timezone: document.getElementById('timezone')?.value || '',
    default_wallet: document.getElementById('default_wallet')?.value || ''
  };

  
  // Initialize phone input
  initializePhoneInput();

  // Handle profile form submission
  const profileForm = document.getElementById('profileUpdateForm');
  if (profileForm) {
    profileForm.addEventListener('submit', async function(e) {
      e.preventDefault();
      
      const submitBtn = document.getElementById('profileUpdateSubmitBtn');
      const submitText = document.getElementById('profileUpdateSubmitBtnText');
      const spinner = submitBtn.querySelector('.spinner');
      
      // Show loading state
      submitBtn.disabled = true;
      submitText.textContent = 'Updating...';
      spinner.classList.remove('d-none');
      
      try {
        const formData = new FormData(this);
        
        // Add phone validation
        const phoneInput = document.getElementById('phone');
        if (phoneInput && !isValidPhoneNumber(phoneInput.value)) {
          showNotification('Please enter a valid phone number', 'error');
          return;
        }

        const response = await fetch('/profile/update', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-CSRF-TOKEN': csrfToken
          },
          body: JSON.stringify(Object.fromEntries(formData))
        });
        
        const result = await response.json();
        
        if (result.success) {
          showNotification('Profile updated successfully', 'success');
          // Update displayed user data
          updateUserDisplayData(formData);
          // Reload page to show updated data
          setTimeout(() => location.reload(), 1500);
        } else {
          showNotification(result.message || 'Update failed', 'error');
        }
      } catch (error) {
        showNotification('An error occurred while updating profile', 'error');
        console.error('Profile update error:', error);
      } finally {
        // Reset button state
        submitBtn.disabled = false;
        submitText.textContent = 'Save Changes';
        spinner.classList.add('d-none');
      }
    });
  }
  
  // Handle password change form
  const passwordForm = document.getElementById('profileResetPasswordForm');
  if (passwordForm) {
    passwordForm.addEventListener('submit', async function(e) {
      e.preventDefault();
      
      const submitBtn = document.getElementById('profileResetPasswordSubmitBtn');
      const submitText = document.getElementById('profileResetPasswordSubmitBtnText');
      const spinner = submitBtn.querySelector('.spinner');
      
      // Validate password
      const password = document.getElementById('password').value;
      const confirmPassword = document.getElementById('password_confirmation').value;
      
      if (password.length < 6) {
        showNotification('Password must be at least 6 characters long', 'error');
        return;
      }
      
      if (password !== confirmPassword) {
        showNotification('Passwords do not match', 'error');
        return;
      }
      
      // Show loading state
      submitBtn.disabled = true;
      submitText.textContent = 'Updating...';
      spinner.classList.remove('d-none');
      
      try {
        const formData = new FormData(this);
        const response = await fetch('/profile/change-password', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-CSRF-TOKEN': csrfToken
          },
          body: JSON.stringify(Object.fromEntries(formData))
        });
        
        const result = await response.json();
        
        if (result.success) {
          showNotification('Password updated successfully', 'success');
          passwordForm.reset();
          // Close modal if exists
          const modal = bootstrap.Modal.getInstance(document.getElementById('exampleModal-2'));
          if (modal) modal.hide();
        } else {
          showNotification(result.message || 'Password change failed', 'error');
        }
      } catch (error) {
        showNotification('An error occurred while changing password', 'error');
        console.error('Password change error:', error);
      } finally {
        // Reset button state
        submitBtn.disabled = false;
        submitText.textContent = 'Save Changes';
        spinner.classList.add('d-none');
      }
    });
  }

  // Handle default currency form
  const defaultCurrencyForm = document.getElementById('defaultCurrencyForm');
  if (defaultCurrencyForm) {
    defaultCurrencyForm.addEventListener('submit', async function(e) {
      e.preventDefault();
      
      const submitBtn = document.getElementById('defaultCurrencySubmitBtn');
      const submitText = document.getElementById('defaultCurrencySubmitBtnText');
      const spinner = submitBtn.querySelector('.spinner');
      
      // Show loading state
      submitBtn.disabled = true;
      submitText.textContent = 'Updating...';
      spinner.classList.remove('d-none');
      
      try {
        const formData = new FormData(this);
        const response = await fetch('/profile/change-default-currency', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-CSRF-TOKEN': csrfToken
          },
          body: JSON.stringify(Object.fromEntries(formData))
        });
        
        const result = await response.json();
        
        if (result.success) {
          showNotification('Default wallet updated successfully', 'success');
          // Update displayed default wallet
          const selectedOption = document.getElementById('default_wallet').options[document.getElementById('default_wallet').selectedIndex];
          document.querySelector('.default-wallet-div p:last-child').textContent = selectedOption.text;
          
          // Close modal
          const modal = bootstrap.Modal.getInstance(document.getElementById('exampleModal'));
          if (modal) modal.hide();
        } else {
          showNotification(result.message || 'Update failed', 'error');
        }
      } catch (error) {
        showNotification('An error occurred while updating default wallet', 'error');
        console.error('Default wallet update error:', error);
      } finally {
        // Reset button state
        submitBtn.disabled = false;
        submitText.textContent = 'Save Changes';
        spinner.classList.add('d-none');
      }
    });
  }

  // QR Code functionality
  const printQrCodeBtn = document.getElementById('printQrCodeBtn');
  if (printQrCodeBtn) {
    printQrCodeBtn.addEventListener('click', function() {
      window.open(printQrCodeUrl, '_blank');
    });
  }

  const updateQrCodeBtn = document.getElementById('updateQrCodeBtn');
  if (updateQrCodeBtn) {
    updateQrCodeBtn.addEventListener('click', async function() {
      const btnText = document.getElementById('updateQrCodeBtnText');
      const originalText = btnText.textContent;
      
      btnText.textContent = loadingText;
      updateQrCodeBtn.disabled = true;
      
      try {
        const response = await fetch(updateQrCodeUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-CSRF-TOKEN': csrfToken
          },
          body: JSON.stringify({ user_id: userId })
        });
        
        const result = await response.json();
        
        if (result.success) {
          showNotification('QR Code updated successfully', 'success');
          // Update QR code image
          const qrCodeImage = document.querySelector('.qrCodeImage');
          if (qrCodeImage && result.qr_code) {
            qrCodeImage.src = result.qr_code + '?t=' + new Date().getTime();
          }
        } else {
          showNotification(result.message || 'QR Code update failed', 'error');
        }
      } catch (error) {
        showNotification('An error occurred while updating QR code', 'error');
        console.error('QR code update error:', error);
      } finally {
        btnText.textContent = originalText;
        updateQrCodeBtn.disabled = false;
      }
    });
  }

  // Profile image upload functionality
  const profileImageUpload = document.getElementById('upload');
  if (profileImageUpload) {
    profileImageUpload.addEventListener('change', function(e) {
      const file = e.target.files[0];
      if (file) {
        uploadProfileImage(file);
      }
    });
  }

  // Password visibility toggle
  const showHidePassword = document.getElementById('show_hide_password');
  if (showHidePassword) {
    const passwordInput = showHidePassword.querySelector('input');
    const eyeIconHide = document.getElementById('eye-icon-hide');
    const eyeIconShow = document.getElementById('eye-icon-show');
    
    if (eyeIconHide && eyeIconShow) {
      eyeIconHide.addEventListener('click', function() {
        passwordInput.type = 'text';
        eyeIconHide.classList.add('d-none');
        eyeIconShow.classList.remove('d-none');
      });
      
      eyeIconShow.addEventListener('click', function() {
        passwordInput.type = 'password';
        eyeIconShow.classList.add('d-none');
        eyeIconHide.classList.remove('d-none');
      });
    }
  }

  // Helper Functions
  function initializePhoneInput() {
    const phoneInput = document.getElementById('phone');
    if (phoneInput) {
      // Initialize intl-tel-input
      $(phoneInput).intlTelInput({
        initialCountry: defaultCountry,
        separateDialCode: true,
        utilsScript: utilsScriptLoadingPath
      });

      // Update hidden fields when phone number changes
      $(phoneInput).on('countrychange', function() {
        const countryData = $(this).intlTelInput('getSelectedCountryData');
        document.getElementById('defaultCountry').value = countryData.iso2;
        document.getElementById('carrierCode').value = countryData.dialCode;
      });

      $(phoneInput).on('input', function() {
        const intlNumber = $(this).intlTelInput('getNumber');
        document.getElementById('formattedPhone').value = intlNumber;
      });
    }
  }

 // Frontend JavaScript for profile picture upload
class ProfilePictureUpload {
    constructor() {
        this.uploadInput = document.getElementById('upload');
        this.profileImage = document.getElementById('profileImage');
        this.changeProfileBtn = document.getElementById('changeProfile');
        this.fileError = document.getElementById('file-error');
        this.init();
    }

    init() {
        if (this.uploadInput) {
            this.uploadInput.addEventListener('change', (e) => this.handleFileSelect(e));
        }
        
        if (this.changeProfileBtn) {
            this.changeProfileBtn.addEventListener('click', () => this.triggerFileInput());
        }
    }

    triggerFileInput() {
        if (this.uploadInput) {
            this.uploadInput.click();
        }
    }

    handleFileSelect(event) {
        const file = event.target.files[0];
        if (!file) return;

        // Validate file
        if (!this.validateFile(file)) {
            return;
        }

        // Show preview
        this.showPreview(file);

        // Upload file
        this.uploadFile(file);
    }

    validateFile(file) {
        const validTypes = ['image/jpeg', 'image/png', 'image/bmp', 'image/gif', 'image/svg+xml'];
        const maxSize = 5 * 1024 * 1024; // 5MB

        if (!validTypes.includes(file.type)) {
            this.showError('Please select a valid image file (JPEG, PNG, BMP, GIF, or SVG)');
            return false;
        }

        if (file.size > maxSize) {
            this.showError('File size must be less than 5MB');
            return false;
        }

        this.hideError();
        return true;
    }

    showPreview(file) {
        const reader = new FileReader();
        reader.onload = (e) => {
            this.profileImage.src = e.target.result;
        };
        reader.readAsDataURL(file);
    }

    async uploadFile(file) {
        const formData = new FormData();
        formData.append('profile_picture', file);

        try {
            this.showLoading();
            
            const response = await fetch('/profile/picture', {
                method: 'POST',
                body: formData,
                headers: {
                    'X-Requested-With': 'XMLHttpRequest',
                    'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]').getAttribute('content')
                }
            });

            const result = await response.json();

            if (result.success) {
                this.showSuccess('Profile picture updated successfully!');
                // Update profile image with the new URL from server
                if (result.data && result.data.profile_image_url) {
                    this.profileImage.src = result.data.profile_image_url;
                }
            } else {
                this.showError(result.message || 'Failed to upload profile picture');
            }
        } catch (error) {
            console.error('Upload error:', error);
            this.showError('Error uploading profile picture. Please try again.');
        } finally {
            this.hideLoading();
        }
    }

    showLoading() {
        if (this.changeProfileBtn) {
            this.changeProfileBtn.disabled = true;
            this.changeProfileBtn.innerHTML = '<span class="spinner-border spinner-border-sm" role="status"></span> Uploading...';
        }
    }

    hideLoading() {
        if (this.changeProfileBtn) {
            this.changeProfileBtn.disabled = false;
            this.changeProfileBtn.innerHTML = `
                <svg width="18" height="18" viewBox="0 0 18 18" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path fill-rule="evenodd" clip-rule="evenodd" d="M7.1683 0.750003C7.1741 0.750004 7.17995 0.750006 7.18586 0.750006L10.8317 0.750003C10.9144 0.749983 10.9863 0.749965 11.0549 0.754121C11.9225 0.806667 12.6823 1.35427 13.0065 2.16076C13.0321 2.22455 13.0549 2.29277 13.081 2.3712L13.0865 2.38783C13.1213 2.49221 13.1289 2.5138 13.1353 2.52975C13.2433 2.79858 13.4966 2.98112 13.7858 2.99863C13.8028 2.99966 13.8282 3.00001 13.9458 3.00001C13.96 3.00001 13.974 3 13.9877 3C14.2239 2.99995 14.3974 2.99992 14.5458 3.01462C15.9687 3.15561 17.0944 4.28127 17.2354 5.70422C17.2501 5.85261 17.2501 6.01915 17.25 6.24402C17.25 6.25679 17.25 6.26976 17.25 6.28292V12.181C17.25 12.7847 17.25 13.283 17.2169 13.6889C17.1824 14.1104 17.1085 14.498 16.923 14.862C16.6354 15.4265 16.1765 15.8854 15.612 16.173C15.248 16.3585 14.8605 16.4324 14.4389 16.4669C14.033 16.5 13.5347 16.5 12.931 16.5H5.06902C4.4653 16.5 3.96703 16.5 3.56114 16.4669C3.13957 16.4324 2.75204 16.3585 2.38804 16.173C1.82355 15.8854 1.36461 15.4265 1.07699 14.862C0.891523 14.498 0.817599 14.1104 0.783156 13.6889C0.749993 13.283 0.75 12.7847 0.75001 12.181L0.75001 6.28292C0.75001 6.26976 0.750008 6.25679 0.750005 6.24402C0.749959 6.01915 0.749925 5.85261 0.764628 5.70422C0.905612 4.28127 2.03128 3.15561 3.45422 3.01462C3.60266 2.99992 3.77616 2.99995 4.01231 3C4.02606 3 4.04002 3.00001 4.0542 3.00001C4.1718 3.00001 4.19725 2.99966 4.21421 2.99863C4.50342 2.98112 4.75667 2.79858 4.86475 2.52975C4.87116 2.5138 4.8787 2.49222 4.9135 2.38783C4.91537 2.38222 4.91722 2.37666 4.91906 2.37115C4.94517 2.29275 4.96789 2.22453 4.99353 2.16076C5.31775 1.35427 6.0775 0.806667 6.94513 0.754121C7.01375 0.749965 7.08565 0.749983 7.1683 0.750003ZM7.18586 2.25001C7.07584 2.25001 7.05297 2.25034 7.03581 2.25138C6.7466 2.26889 6.49335 2.45143 6.38528 2.72026C6.37886 2.73621 6.37132 2.75779 6.33652 2.86218C6.33465 2.86779 6.3328 2.87335 6.33097 2.87886C6.30485 2.95726 6.28213 3.02548 6.25649 3.08925C5.93227 3.89574 5.17252 4.44334 4.30489 4.49589C4.23623 4.50005 4.16095 4.50003 4.07344 4.50001C4.06709 4.50001 4.06068 4.50001 4.0542 4.50001C3.75811 4.50001 3.66633 4.50095 3.60212 4.50731C2.89064 4.57781 2.32781 5.14064 2.25732 5.85211C2.25093 5.91658 2.25001 6.00223 2.25001 6.28292V12.15C2.25001 12.7924 2.25059 13.2292 2.27817 13.5667C2.30504 13.8955 2.35373 14.0637 2.4135 14.181C2.55731 14.4632 2.78678 14.6927 3.06902 14.8365C3.18632 14.8963 3.35448 14.945 3.68329 14.9718C4.02086 14.9994 4.45758 15 5.10001 15H12.9C13.5424 15 13.9792 14.9994 14.3167 14.9718C14.6455 14.945 14.8137 14.8963 14.931 14.8365C15.2132 14.6927 15.4427 14.4632 15.5865 14.181C15.6463 14.0637 15.695 13.8955 15.7218 13.5667C15.7494 13.2292 15.75 12.7924 15.75 12.15V6.28292C15.75 6.00223 15.7491 5.91658 15.7427 5.85211C15.6722 5.14064 15.1094 4.57781 14.3979 4.50731C14.3337 4.50095 14.2419 4.50001 13.9458 4.50001L13.9266 4.50001C13.8391 4.50003 13.7638 4.50005 13.6951 4.49589C12.8275 4.44334 12.0677 3.89574 11.7435 3.08925C11.7179 3.02547 11.6952 2.95724 11.669 2.87881L11.6635 2.86218C11.6287 2.7578 11.6212 2.73621 11.6147 2.72026C11.5067 2.45143 11.2534 2.26889 10.9642 2.25138C10.947 2.25034 10.9242 2.25001 10.8142 2.25001H7.18586ZM9.00001 7.12501C7.75737 7.12501 6.75001 8.13236 6.75001 9.37501C6.75001 10.6176 7.75737 11.625 9.00001 11.625C10.2427 11.625 11.25 10.6176 11.25 9.37501C11.25 8.13236 10.2427 7.12501 9.00001 7.12501ZM5.25001 9.37501C5.25001 7.30394 6.92894 5.62501 9.00001 5.62501C11.0711 5.62501 12.75 7.30394 12.75 9.37501C12.75 11.4461 11.0711 13.125 9.00001 13.125C6.92894 13.125 5.25001 11.4461 5.25001 9.37501Z" fill="currentColor"></path>
                </svg>
                <span class="f-14 leading-20 text-white mx-2 gilroy-medium">Change Photo</span>
            `;
        }
    }

    showError(message) {
        if (this.fileError) {
            this.fileError.textContent = message;
            this.fileError.style.display = 'block';
            this.fileError.style.color = 'red';
        }
    }

    hideError() {
        if (this.fileError) {
            this.fileError.style.display = 'none';
        }
    }

    showSuccess(message) {
        // You can use SweetAlert or show a notification
        if (typeof Swal !== 'undefined') {
            Swal.fire({
                icon: 'success',
                title: 'Success',
                text: message,
                timer: 3000,
                showConfirmButton: false
            });
        } else {
            alert(message);
        }
    }
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    new ProfilePictureUpload();
});

// Simple function for direct file input usage
function changeProfile() {
    document.getElementById('upload').click();
}

// Handle file input change directly
document.addEventListener('DOMContentLoaded', function() {
    const uploadInput = document.getElementById('upload');
    if (uploadInput) {
        uploadInput.addEventListener('change', function(e) {
            const file = e.target.files[0];
            if (file) {
                // You can add immediate preview here
                const reader = new FileReader();
                reader.onload = function(e) {
                    const profileImage = document.getElementById('profileImage');
                    if (profileImage) {
                        profileImage.src = e.target.result;
                    }
                };
                reader.readAsDataURL(file);
                
                // Auto-upload
                uploadProfilePicture(file);
            }
        });
    }
});

// Simple upload function
async function uploadProfilePicture(file) {
    const formData = new FormData();
    formData.append('profile_picture', file);

    try {
        const response = await fetch('/profile/picture', {
            method: 'POST',
            body: formData,
            headers: {
                'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]').getAttribute('content')
            }
        });

        const result = await response.json();
        
        if (result.success) {
            alert('Profile picture updated successfully!');
            // Refresh the page to show the new image
            location.reload();
        } else {
            alert(result.message || 'Failed to upload profile picture');
        }
    } catch (error) {
        console.error('Upload error:', error);
        alert('Error uploading profile picture');
    }
}
  function updateUserDisplayData(formData) {
    // Update personal information display
    const data = Object.fromEntries(formData);
    
    // Update name display
    if (data.first_name && data.last_name) {
      const fullName = `${data.first_name} ${data.last_name}`;
      document.querySelector('.left-avatar-desc p:first-child').textContent = fullName;
      document.querySelector('.profile-personal-information .profile-info-body .left-profile-info .profile-borders-bottom:first-child p:last-child').textContent = fullName;
    }
    
    // Update phone display
    if (data.phone) {
      document.querySelector('.profile-personal-information .profile-info-body .left-profile-info .profile-borders-bottom:nth-child(2) p:last-child').textContent = data.phone;
    }
    
    // Update address displays
    if (data.address_1) {
      document.querySelector('.profile-personal-information .profile-info-body .left-profile-info .profile-borders-bottom:nth-child(3) p:last-child').textContent = data.address_1;
    }
    
    if (data.address_2) {
      document.querySelector('.profile-personal-information .profile-info-body .left-profile-info .profile-bottom p:last-child').textContent = data.address_2 || 'N/A';
    }
    
    // Update city, state, country, timezone
    if (data.city) {
      document.querySelector('.profile-personal-information .profile-info-body .ml-76 .profile-borders-bottom:first-child p:last-child').textContent = data.city || 'N/A';
    }
    
    if (data.state) {
      document.querySelector('.profile-personal-information .profile-info-body .ml-76 .profile-borders-bottom:nth-child(2) p:last-child').textContent = data.state || 'N/A';
    }
    
    // Update country name
    if (data.country_id) {
      const countrySelect = document.getElementById('country_id');
      const selectedOption = countrySelect.options[countrySelect.selectedIndex];
      document.querySelector('.profile-personal-information .profile-info-body .ml-76 .profile-borders-bottom:nth-child(3) p:last-child').textContent = selectedOption.text;
    }
    
    // Update timezone
    if (data.timezone) {
      const timezoneSelect = document.getElementById('timezone');
      const selectedOption = timezoneSelect.options[timezoneSelect.selectedIndex];
      document.querySelector('.profile-personal-information .profile-info-body .ml-76 .profile-bottom p:last-child').textContent = selectedOption.text;
    }
  }

  function showNotification(message, type = 'info') {
    if (typeof Swal !== 'undefined') {
      Swal.fire({
        icon: type,
        title: message,
        toast: true,
        position: 'top-end',
        showConfirmButton: false,
        timer: 3000
      });
    } else {
      alert(message);
    }
  }

  // Language switcher functionality (from your existing code)
  $("#select_language").on("change", function() {
    const lang = $("#select_language select").val();
    
    if(lang === 'ar'){
      localStorage.setItem('lang', 'ar');
      $("html").attr("dir", "rtl");
    } else {
      localStorage.setItem('lang', lang);
      $("html").removeAttr("dir");
    }

    $.ajax({
      type: 'get',
      url: '/change-lang',
      data: {lang: lang},
      success: function (msg) {
        if (msg == 1) {
          location.reload();
        }
      }
    });
  });

  // Theme switcher functionality
  const themeSwitch = document.getElementById('flexSwitchCheckDefault');
  if (themeSwitch) {
    themeSwitch.addEventListener('change', function() {
      if (this.checked) {
        document.documentElement.classList.add('dark');
        localStorage.setItem('dark', '1');
      } else {
        document.documentElement.classList.remove('dark');
        localStorage.setItem('dark', '0');
      }
    });
  }

  // Initialize theme based on localStorage
  if (localStorage.getItem('dark') === '1') {
    document.documentElement.classList.add('dark');
    if (themeSwitch) themeSwitch.checked = true;
  }
});

// Global function for profile image change (called from HTML)
function changeProfile() {
  document.getElementById('upload').click();
}

// Phone validation function
function isValidPhoneNumber(phoneNumber) {
  // Basic phone validation - you might want to use a more robust solution
  const phoneRegex = /^[\+]?[1-9][\d]{0,15}$/;
  return phoneRegex.test(phoneNumber.replace(/[\s\-\(\)]/g, ''));
}