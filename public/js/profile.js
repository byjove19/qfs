
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

  async function uploadProfileImage(file) {
    const validTypes = ['image/jpeg', 'image/png', 'image/bmp', 'image/gif', 'image/svg+xml'];
    const maxSize = 5 * 1024 * 1024; // 5MB
    
    if (!validTypes.includes(file.type)) {
      showNotification('Please select a valid image format (JPEG, PNG, BMP, GIF, or SVG)', 'error');
      return;
    }
    
    if (file.size > maxSize) {
      showNotification('Image size should be less than 5MB', 'error');
      return;
    }
    
    const changeProfileBtn = document.getElementById('changeProfile');
    const originalText = changeProfileBtn.querySelector('span').textContent;
    
    changeProfileBtn.querySelector('span').textContent = pleaseWaitText;
    changeProfileBtn.disabled = true;
    
    try {
      const formData = new FormData();
      formData.append('profile_image', file);
      formData.append('_token', csrfToken);
      formData.append('user_id', userId);
      
      const response = await fetch(profileImageUploadUrl, {
        method: 'POST',
        body: formData
      });
      
      const result = await response.json();
      
      if (result.success) {
        showNotification('Profile image updated successfully', 'success');
        // Update profile image
        const profileImage = document.getElementById('profileImage');
        if (profileImage && result.image_url) {
          profileImage.src = result.image_url + '?t=' + new Date().getTime();
        }
        // Update navbar image
        const navbarImages = document.querySelectorAll('.user-list img, .user-dp img');
        navbarImages.forEach(img => {
          img.src = result.image_url + '?t=' + new Date().getTime();
        });
      } else {
        showNotification(result.message || 'Image upload failed', 'error');
      }
    } catch (error) {
      showNotification('An error occurred while uploading image', 'error');
      console.error('Image upload error:', error);
    } finally {
      changeProfileBtn.querySelector('span').textContent = originalText;
      changeProfileBtn.disabled = false;
      // Reset file input
      document.getElementById('upload').value = '';
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