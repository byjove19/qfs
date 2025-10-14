// Global variables
let searchTimeout;
let currentSearchTerm = '';
let currentFormData = {};

document.addEventListener('DOMContentLoaded', function() {
    setTimeout(() => {
        initializeSendMoneyForm();
        initializeModalEventListeners();
    }, 100);
});

function initializeSendMoneyForm() {
    console.log('🚀 Initializing Send Money Form...');
    
    // Get DOM elements
    const recipientSearch = document.getElementById('recipientSearch');
    const recipientResults = document.getElementById('recipientResults');
    const amountInput = document.getElementById('amount');
    const availableBalanceSpan = document.getElementById('availableBalance');
    const balanceErrorDiv = document.getElementById('balanceError');
    const submitBtn = document.getElementById('sendMoneyCreateSubmitBtn');
    const form = document.getElementById('sendMoneyCreateForm');
    const clearRecipientBtn = document.getElementById('clearRecipientBtn');
    const currencySelect = document.getElementById('currency');

    // Initialize Select2 for currency dropdown
    if (typeof $ !== 'undefined' && typeof $.fn.select2 !== 'undefined') {
        try {
            if ($(currencySelect).data('select2')) {
                $(currencySelect).select2('destroy');
            }

            const modalParent = $('#sendMoneyCreate');
            const initOptions = {
                placeholder: "Select Currency",
                allowClear: false,
                width: '100%',
                minimumResultsForSearch: -1
            };

            if (modalParent.length > 0) {
                initOptions.dropdownParent = modalParent;
            }

            $(currencySelect).select2(initOptions).on('change', function() {
                console.log('💰 Currency changed:', this.value);
                updateBalanceDisplay();
                validateForm();
            });
            
            console.log('✅ Select2 initialized successfully');
        } catch (error) {
            console.error('❌ Select2 initialization error:', error);
            setupStandardSelect();
        }
    } else {
        setupStandardSelect();
    }

    function setupStandardSelect() {
        if (currencySelect) {
            currencySelect.addEventListener('change', function() {
                console.log('💰 Currency changed (standard):', this.value);
                updateBalanceDisplay();
                validateForm();
            });
        }
    }

    // Recipient search functionality
    if (recipientSearch) {
        recipientSearch.addEventListener('input', function() {
            const searchTerm = this.value.trim();
            
            if (searchTimeout) {
                clearTimeout(searchTimeout);
            }
            
            if (searchTerm.length === 0) {
                if (recipientResults) recipientResults.style.display = 'none';
                return;
            }
            
            searchTimeout = setTimeout(() => {
                if (searchTerm.length >= 2) {
                    searchRecipients(searchTerm);
                }
            }, 300);
        });

        recipientSearch.addEventListener('keydown', function(e) {
            if (e.key === 'Enter') {
                e.preventDefault();
            }
        });
    }

    // Hide results when clicking outside
    document.addEventListener('click', function(e) {
        if (recipientSearch && recipientResults && 
            !recipientSearch.contains(e.target) && 
            !recipientResults.contains(e.target)) {
            recipientResults.style.display = 'none';
        }
    });

    // Amount validation
    if (amountInput) {
        amountInput.addEventListener('input', validateForm);
        amountInput.addEventListener('blur', validateForm);
        amountInput.addEventListener('keydown', function(e) {
            if (e.key === '-' || e.key === 'e' || e.key === 'E') {
                e.preventDefault();
            }
        });
    }

    // Submit button click event
    if (submitBtn) {
        submitBtn.addEventListener('click', showConfirmationModal);
    }

    // Clear recipient button
    if (clearRecipientBtn) {
        clearRecipientBtn.addEventListener('click', clearRecipient);
    }

    // Initialize form state
    updateBalanceDisplay();
    validateForm();
    
    console.log('✅ Send money form initialized successfully');
}

// Initialize modal event listeners
function initializeModalEventListeners() {
    // Confirm payment button in confirmation modal
    const confirmPaymentBtn = document.getElementById('confirmPaymentBtn');
    if (confirmPaymentBtn) {
        confirmPaymentBtn.addEventListener('click', showPasswordModal);
    }

    // Submit payment button in password modal
    const submitPaymentBtn = document.getElementById('submitPaymentBtn');
    if (submitPaymentBtn) {
        submitPaymentBtn.addEventListener('click', submitPayment);
    }

    // Password input enter key support
    const userPassword = document.getElementById('userPassword');
    if (userPassword) {
        userPassword.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') {
                submitPayment();
            }
        });
    }

    // Modal hidden events to reset states
    const confirmationModal = document.getElementById('confirmationModal');
    if (confirmationModal) {
        confirmationModal.addEventListener('hidden.bs.modal', function() {
            // Reset any modal-specific states if needed
        });
    }

    const passwordModal = document.getElementById('passwordModal');
    if (passwordModal) {
        passwordModal.addEventListener('hidden.bs.modal', function() {
            // Reset password field when modal is closed
            const passwordInput = document.getElementById('userPassword');
            const passwordError = document.getElementById('passwordError');
            if (passwordInput) {
                passwordInput.value = '';
                passwordInput.classList.remove('is-invalid');
            }
            if (passwordError) {
                passwordError.textContent = '';
            }
        });
    }
}

// Show confirmation modal
function showConfirmationModal() {
    if (!validateForm()) {
        showAlert('Please fix the errors before submitting', 'error');
        return;
    }

    // Collect form data
    const recipientEmail = document.getElementById('recipientEmail')?.value;
    const recipientName = document.getElementById('selectedRecipientName')?.textContent;
    const amount = document.getElementById('amount')?.value;
    const currency = document.getElementById('currency')?.value;
    const note = document.getElementById('description')?.value;

    // Store current form data
    currentFormData = {
        recipientEmail,
        recipientName,
        amount,
        currency,
        note,
        _token: document.querySelector('input[name="_token"]')?.value
    };

    // Update confirmation modal content
    document.getElementById('confirmRecipient').textContent = `${recipientName} (${recipientEmail})`;
    document.getElementById('confirmAmount').textContent = `${amount} ${currency}`;
    document.getElementById('confirmCurrency').textContent = currency;
    document.getElementById('confirmNote').textContent = note || 'No note provided';

    // Show confirmation modal
    const confirmationModal = new bootstrap.Modal(document.getElementById('confirmationModal'));
    confirmationModal.show();
}

// Show password authentication modal
function showPasswordModal() {
    // Hide confirmation modal
    const confirmationModal = bootstrap.Modal.getInstance(document.getElementById('confirmationModal'));
    if (confirmationModal) {
        confirmationModal.hide();
    }

    // Reset password field
    const passwordInput = document.getElementById('userPassword');
    const passwordError = document.getElementById('passwordError');
    if (passwordInput) {
        passwordInput.value = '';
        passwordInput.classList.remove('is-invalid');
    }
    if (passwordError) {
        passwordError.textContent = '';
    }

    // Show password modal after a short delay
    setTimeout(() => {
        const passwordModal = new bootstrap.Modal(document.getElementById('passwordModal'));
        passwordModal.show();
        
        // Focus on password input
        setTimeout(() => {
            if (passwordInput) {
                passwordInput.focus();
            }
        }, 500);
    }, 300);
}

// Submit payment with password authentication
function submitPayment() {
    const password = document.getElementById('userPassword')?.value;
    const submitBtn = document.getElementById('submitPaymentBtn');
    const spinner = submitBtn?.querySelector('.spinner-border');
    const originalText = submitBtn?.innerHTML;

    if (!password) {
        const passwordInput = document.getElementById('userPassword');
        const passwordError = document.getElementById('passwordError');
        if (passwordInput) passwordInput.classList.add('is-invalid');
        if (passwordError) passwordError.textContent = 'Please enter your password';
        return;
    }

    // Show loading state
    if (spinner) spinner.classList.remove('d-none');
    if (submitBtn) submitBtn.disabled = true;

    // Verify password and submit payment
    verifyPasswordAndSubmit(password);
}

// Verify password and submit payment
function verifyPasswordAndSubmit(password) {
    const csrfToken = document.querySelector('input[name="_token"]')?.value;

    console.log('=== FRONTEND DEBUG ===');
    console.log('CSRF Token present:', !!csrfToken);
    console.log('Password present:', !!password);
    console.log('==================');

    $.ajax({
        url: '/auth/verify-password',
        method: 'POST',
        data: {
            password: password,
            _token: csrfToken
        },
        success: function(response) {
            console.log('✅ Password verification SUCCESS:', response);
            if (response.success) {
                // Password verified, submit the payment
                submitPaymentToServer();
            } else {
                console.log('❌ Password verification failed:', response.message);
                handlePasswordError(response.message || 'Invalid password');
            }
        },
        error: function(xhr, status, error) {
            console.log('❌ AJAX ERROR:');
            console.log('Status:', xhr.status);
            console.log('Response:', xhr.responseText);
            console.log('Error:', error);
            
            let errorMessage = 'Password verification failed';
            if (xhr.responseJSON?.message) {
                errorMessage = xhr.responseJSON.message;
            } else if (xhr.status === 401) {
                errorMessage = 'Authentication failed. Please log in again.';
            }
            handlePasswordError(errorMessage);
        }
    });
}

// Submit payment to server - SIMPLIFIED VERSION
function submitPaymentToServer() {
    console.log('=== SUBMITTING PAYMENT DEBUG ===');
    
    const form = document.getElementById('sendMoneyCreateForm');
    if (!form) {
        console.error('Form not found');
        showAlert('Form not found. Please refresh the page.', 'error');
        return;
    }

    // Get fresh form data directly from the form
    const formData = new FormData(form);
    
    // Log what we're sending
    console.log('FormData contents:');
    for (let [key, value] of formData.entries()) {
        console.log(`${key}: ${value}`);
    }

    // Validate required fields
    const recipientEmail = formData.get('recipientEmail');
    const amount = formData.get('amount');
    const currency = formData.get('currency');

    if (!recipientEmail || !amount || !currency) {
        console.error('❌ Missing required fields in form data');
        showAlert('Missing required fields. Please check the form.', 'error');
        showLoadingState(false);
        return;
    }

    // Show loading state in main button
    showLoadingState(true);

    // Hide password modal
    const passwordModal = bootstrap.Modal.getInstance(document.getElementById('passwordModal'));
    if (passwordModal) {
        passwordModal.hide();
    }

    // Submit the form using the form's action URL
    fetch(form.action, {
        method: 'POST',
        body: formData,
        headers: {
            'X-Requested-With': 'XMLHttpRequest'
        }
    })
    .then(response => {
        console.log('Response status:', response.status);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        return response.json();
    })
    .then(data => {
        console.log('Server response:', data);
        if (data.success) {
            showAlert(data.message || 'Payment submitted successfully! Waiting for admin approval.', 'success');
            // Redirect to transactions page after success
            setTimeout(() => {
                window.location.href = '';
            }, 2000);
        } else {
            showAlert(data.message || 'Payment submission failed', 'error');
            showLoadingState(false);
        }
    })
    .catch(error => {
        console.error('Payment submission error:', error);
        showAlert('Payment submission failed. Please try again.', 'error');
        showLoadingState(false);
    });
}

function handlePasswordError(errorMessage) {
    const passwordInput = document.getElementById('userPassword');
    const passwordError = document.getElementById('passwordError');
    const submitBtn = document.getElementById('submitPaymentBtn');
    const spinner = submitBtn?.querySelector('.spinner-border');

    if (passwordInput) passwordInput.classList.add('is-invalid');
    if (passwordError) passwordError.textContent = errorMessage;
    
    if (spinner) spinner.classList.add('d-none');
    if (submitBtn) submitBtn.disabled = false;
    
    // Clear password field and focus
    if (passwordInput) {
        passwordInput.value = '';
        passwordInput.focus();
    }
}

function searchRecipients(searchTerm) {
    currentSearchTerm = searchTerm;
    
    const csrfToken = document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') || 
                     document.querySelector('input[name="_token"]')?.value;

    if (!csrfToken) {
        console.error('CSRF token not found');
        showAlert('Security token missing. Please refresh the page.', 'error');
        return;
    }

    const recipientResults = document.getElementById('recipientResults');
    if (!recipientResults) {
        console.error('Recipient results container not found');
        return;
    }
    
    recipientResults.innerHTML = '<div class="p-3 text-center text-muted">Searching...</div>';
    recipientResults.style.display = 'block';

    $.ajax({
        url: '/api/recipients/search',
        method: 'POST',
        data: { search: searchTerm, _token: csrfToken },
        success: function(response) {
            if (searchTerm !== currentSearchTerm) return;
            
            if (response.success && response.recipients) {
                displayRecipientResults(response.recipients);
            } else {
                recipientResults.innerHTML = '<div class="p-3 text-center text-muted">Error searching recipients</div>';
                showAlert('Error searching recipients: ' + (response.message || 'Unknown error'), 'error');
            }
        },
        error: function(xhr) {
            recipientResults.innerHTML = '<div class="p-3 text-center text-muted">Search failed. Please try again.</div>';
            let errorMessage = 'Search failed';
            if (xhr.responseJSON?.message) {
                errorMessage += ': ' + xhr.responseJSON.message;
            }
            showAlert(errorMessage, 'error');
        }
    });
}

function displayRecipientResults(recipients) {
    const recipientResults = document.getElementById('recipientResults');
    if (!recipientResults) return;
    
    if (!recipients || recipients.length === 0) {
        recipientResults.innerHTML = '<div class="p-3 text-center text-muted">No users found</div>';
        recipientResults.style.display = 'block';
        return;
    }
    
    let resultsHTML = '';
    
    recipients.forEach(recipient => {
        const email = recipient.email || '';
        const firstName = recipient.firstName || '';
        const lastName = recipient.lastName || '';
        const phone = recipient.phone || '';
        
        let displayName = '';
        if (firstName || lastName) {
            displayName = `${firstName} ${lastName}`.trim();
        } else if (email) {
            const emailName = email.split('@')[0];
            displayName = emailName.charAt(0).toUpperCase() + emailName.slice(1);
        } else {
            displayName = 'User';
        }
        
        resultsHTML += `
            <div class="p-3 border-bottom recipient-item" 
                 style="cursor: pointer;" 
                 data-email="${escapeHtml(email)}" 
                 data-firstname="${escapeHtml(firstName)}" 
                 data-lastname="${escapeHtml(lastName)}">
                <div class="d-flex justify-content-between align-items-center">
                    <div class="flex-grow-1">
                        <strong class="d-block">${escapeHtml(displayName)}</strong>
                        <small class="text-muted d-block">${escapeHtml(email)}</small>
                        ${phone ? `<small class="text-muted d-block">${escapeHtml(phone)}</small>` : ''}
                    </div>
                    <div class="text-success ms-3">
                        <small>Select</small>
                    </div>
                </div>
            </div>
        `;
    });
    
    recipientResults.innerHTML = resultsHTML;
    recipientResults.style.display = 'block';
    attachRecipientEventListeners();
}

function attachRecipientEventListeners() {
    const recipientItems = document.querySelectorAll('.recipient-item');
    recipientItems.forEach(item => {
        item.replaceWith(item.cloneNode(true));
    });
    
    const freshRecipientItems = document.querySelectorAll('.recipient-item');
    freshRecipientItems.forEach(item => {
        item.addEventListener('click', function() {
            const email = this.getAttribute('data-email');
            const firstName = this.getAttribute('data-firstname');
            const lastName = this.getAttribute('data-lastname');
            if (email) selectRecipient(email, firstName, lastName);
        });
        
        item.addEventListener('mouseenter', function() {
            this.style.backgroundColor = '#f8f9fa';
        });
        item.addEventListener('mouseleave', function() {
            this.style.backgroundColor = '';
        });
    });
}

function selectRecipient(email, firstName, lastName) {
    const recipientResults = document.getElementById('recipientResults');
    const recipientSearch = document.getElementById('recipientSearch');
    const selectedSection = document.getElementById('selectedRecipientSection');
    const selectedName = document.getElementById('selectedRecipientName');
    const selectedEmail = document.getElementById('selectedRecipientEmail');
    const recipientEmailInput = document.getElementById('recipientEmail');
    
    if (recipientResults) recipientResults.style.display = 'none';
    if (recipientSearch) recipientSearch.value = '';
    
    if (selectedSection && selectedName && selectedEmail && recipientEmailInput) {
        selectedSection.style.display = 'block';
        
        let displayName = '';
        if (firstName || lastName) {
            displayName = `${firstName || ''} ${lastName || ''}`.trim();
        } else if (email) {
            const emailName = email.split('@')[0];
            displayName = emailName.charAt(0).toUpperCase() + emailName.slice(1);
        } else {
            displayName = 'User';
        }
        
        selectedName.textContent = displayName;
        selectedEmail.textContent = email || '';
        recipientEmailInput.value = email || '';
        
        validateForm();
    }
}

function clearRecipient() {
    const selectedSection = document.getElementById('selectedRecipientSection');
    const recipientEmailInput = document.getElementById('recipientEmail');
    const recipientSearch = document.getElementById('recipientSearch');
    
    if (selectedSection) selectedSection.style.display = 'none';
    if (recipientEmailInput) recipientEmailInput.value = '';
    if (recipientSearch) {
        recipientSearch.value = '';
        recipientSearch.focus();
    }
    
    validateForm();
}


function updateBalanceDisplay() {
    const currencySelect = document.getElementById('currency');
    const availableBalanceSpan = document.getElementById('availableBalance');
    
    if (!currencySelect || !availableBalanceSpan) return;
    
    const selectedOption = currencySelect.options[currencySelect.selectedIndex];
    const balance = parseFloat(selectedOption?.getAttribute('data-balance')) || 0;
    const currency = selectedOption?.value || '';
    
    if (currency) {
        availableBalanceSpan.textContent = `${balance.toLocaleString()} ${currency}`;
        availableBalanceSpan.className = 'text-success fw-bold';
    } else {
        availableBalanceSpan.textContent = '0.00';
        availableBalanceSpan.className = 'text-muted';
    }
}

function validateForm() {
    const recipientEmail = document.getElementById('recipientEmail')?.value;
    const currencySelect = document.getElementById('currency');
    const amountInput = document.getElementById('amount');
    const submitBtn = document.getElementById('sendMoneyCreateSubmitBtn');
    const balanceErrorDiv = document.getElementById('balanceError');
    
    if (!currencySelect || !amountInput || !submitBtn) return false;
    
    const currency = currencySelect.value;
    const amount = parseFloat(amountInput.value) || 0;
    const selectedOption = currencySelect.options[currencySelect.selectedIndex];
    const balance = parseFloat(selectedOption?.getAttribute('data-balance')) || 0;
    
    let isValid = true;
    let errorMessage = '';
    
    if (!recipientEmail) {
        isValid = false;
        errorMessage = 'Please select a recipient';
    } else if (!currency) {
        isValid = false;
        errorMessage = 'Please select a currency';
    } else if (amount <= 0) {
        isValid = false;
        errorMessage = 'Please enter a valid amount greater than 0';
    } else if (isNaN(amount)) {
        isValid = false;
        errorMessage = 'Please enter a valid number';
    } else if (amount > balance) {
        isValid = false;
        errorMessage = `Insufficient balance. Available: ${balance.toLocaleString()} ${currency}`;
    } else if (amount < 0.01) {
        isValid = false;
        errorMessage = 'Minimum amount is 0.01';
    }
    
    if (balanceErrorDiv) {
        if (!isValid) {
            balanceErrorDiv.textContent = errorMessage;
            balanceErrorDiv.style.display = 'block';
            balanceErrorDiv.className = 'text-danger f-12 mt-1';
        } else {
            balanceErrorDiv.style.display = 'none';
        }
    }
    
    if (submitBtn) submitBtn.disabled = !isValid;
    return isValid;
}

function showLoadingState(show) {
    const spinner = document.querySelector('#sendMoneyCreateSubmitBtn .spinner');
    const btnText = document.getElementById('sendMoneyCreateSubmitBtnText');
    const submitBtn = document.getElementById('sendMoneyCreateSubmitBtn');
    
    if (spinner && btnText && submitBtn) {
        if (show) {
            spinner.classList.remove('d-none');
            btnText.textContent = 'Processing...';
            submitBtn.disabled = true;
        } else {
            spinner.classList.add('d-none');
            btnText.textContent = 'Send Money';
            submitBtn.disabled = false;
        }
    }
}

function showAlert(message, type = 'info') {
    let alertContainer = document.getElementById('alertContainer');
    if (!alertContainer) {
        // Create alert container if it doesn't exist
        alertContainer = document.createElement('div');
        alertContainer.id = 'alertContainer';
        alertContainer.className = 'position-fixed top-0 end-0 p-3';
        alertContainer.style.zIndex = '9999';
        document.body.appendChild(alertContainer);
    }
    
    const alertId = 'alert-' + Date.now();
    const alertClass = {
        'success': 'alert-success',
        'error': 'alert-danger',
        'warning': 'alert-warning',
        'info': 'alert-info'
    }[type] || 'alert-info';
    
    const icon = {
        'success': '✓',
        'error': '✗',
        'warning': '⚠',
        'info': 'ℹ'
    }[type] || 'ℹ';
    
    const alertHTML = `
        <div id="${alertId}" class="alert ${alertClass} alert-dismissible fade show" role="alert">
            <strong>${icon}</strong> ${message}
            <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
        </div>
    `;
    
    alertContainer.insertAdjacentHTML('beforeend', alertHTML);
    setTimeout(() => {
        const alertElement = document.getElementById(alertId);
        if (alertElement) {
            alertElement.remove();
        }
    }, 5000);
}

function escapeHtml(unsafe) {
    if (unsafe === null || unsafe === undefined) return '';
    return unsafe.toString()
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

// Export functions for global access
window.initializeSendMoneyForm = initializeSendMoneyForm;
window.searchRecipients = searchRecipients;
window.selectRecipient = selectRecipient;
window.clearRecipient = clearRecipient;
window.validateForm = validateForm;
window.showAlert = showAlert;
window.showConfirmationModal = showConfirmationModal;
window.showPasswordModal = showPasswordModal;
window.submitPayment = submitPayment;