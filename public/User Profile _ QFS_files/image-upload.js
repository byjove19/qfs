// Profile Image Upload
function changeProfile() {
    document.getElementById('upload').click();
}

document.getElementById('upload').addEventListener('change', function(e) {
    const file = e.target.files[0];
    if (file) {
        // Validate file type
        const validTypes = ['image/jpeg', 'image/png', 'image/bmp', 'image/gif', 'image/svg+xml'];
        if (!validTypes.includes(file.type)) {
            document.getElementById('file-error').textContent = 'Please select a valid image format (jpeg, png, bmp, gif, svg)';
            return;
        }
        
        // Validate file size (e.g., max 5MB)
        if (file.size > 5 * 1024 * 1024) {
            document.getElementById('file-error').textContent = 'File size must be less than 5MB';
            return;
        }
        
        document.getElementById('file-error').textContent = '';
        
        // Preview image
        const reader = new FileReader();
        reader.onload = function(event) {
            document.getElementById('profileImage').src = event.target.result;
        };
        reader.readAsDataURL(file);
        
        // Upload to server
        const formData = new FormData();
        formData.append('file', file);
        formData.append('_token', document.querySelector('meta[name="csrf-token"]').content);
        
        fetch('/profile/update-image', {
            method: 'POST',
            body: formData
        })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                swal('Success!', 'Profile picture updated successfully', 'success');
            } else {
                swal('Error!', data.message || 'Failed to update profile picture', 'error');
            }
        })
        .catch(error => {
            console.error('Error:', error);
            swal('Error!', 'An error occurred while uploading', 'error');
        });
    }
});

// QR Code Print Functionality
document.getElementById('printQrCodeBtn').addEventListener('click', function() {
    const qrCodeContainer = document.getElementById('userProfileQrCode');
    const printWindow = window.open('', '', 'height=600,width=800');
    
    printWindow.document.write('<html><head><title>QR Code</title>');
    printWindow.document.write('<style>body{text-align:center;padding:20px;}img{max-width:100%;}</style>');
    printWindow.document.write('</head><body>');
    printWindow.document.write(qrCodeContainer.innerHTML);
    printWindow.document.write('</body></html>');
    
    printWindow.document.close();
    printWindow.focus();
    
    setTimeout(function() {
        printWindow.print();
        printWindow.close();
    }, 250);
});

// QR Code Update
document.getElementById('updateQrCodeBtn').addEventListener('click', function() {
    const btn = this;
    const btnText = document.getElementById('updateQrCodeBtnText');
    const originalText = btnText.textContent;
    
    btnText.textContent = 'Updating...';
    btn.disabled = true;
    
    fetch('/profile/update-qr-code', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]').content
        }
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            document.querySelector('.qrCodeImage').src = data.qr_code_url + '?' + new Date().getTime();
            swal('Success!', 'QR Code updated successfully', 'success');
        } else {
            swal('Error!', data.message || 'Failed to update QR code', 'error');
        }
    })
    .catch(error => {
        console.error('Error:', error);
        swal('Error!', 'An error occurred', 'error');
    })
    .finally(() => {
        btnText.textContent = originalText;
        btn.disabled = false;
    });
});

// Password Toggle Visibility
document.getElementById('eye-icon-hide')?.addEventListener('click', function() {
    const passwordInput = document.getElementById('password');
    passwordInput.type = 'text';
    document.getElementById('eye-icon-hide').classList.add('d-none');
    document.getElementById('eye-icon-show').classList.remove('d-none');
});

document.getElementById('eye-icon-show')?.addEventListener('click', function() {
    const passwordInput = document.getElementById('password');
    passwordInput.type = 'password';
    document.getElementById('eye-icon-show').classList.add('d-none');
    document.getElementById('eye-icon-hide').classList.remove('d-none');
});

// Phone Number Validation (requires intlTelInput library)
const phoneInput = document.getElementById('phone');
if (phoneInput) {
    const iti = window.intlTelInput(phoneInput, {
        initialCountry: document.getElementById('defaultCountry').value || 'us',
        separateDialCode: true,
        preferredCountries: ['us'],
        utilsScript: "https://cdnjs.cloudflare.com/ajax/libs/intl-tel-input/17.0.8/js/utils.js"
    });
    
    phoneInput.addEventListener('blur', function() {
        if (phoneInput.value.trim()) {
            if (iti.isValidNumber()) {
                document.getElementById('formattedPhone').value = iti.getNumber();
                document.getElementById('carrierCode').value = iti.getSelectedCountryData().dialCode;
                document.getElementById('phone-error').textContent = '';
            } else {
                document.getElementById('phone-error').textContent = 'Please enter a valid phone number';
            }
        }
    });
}