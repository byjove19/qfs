// send-money.js
$(document).ready(function() {
    'use strict';

    // Initialize Select2
    $('.select2').select2({
        minimumResultsForSearch: Infinity,
        width: '100%'
    });

    // Currency conversion
    $('.currency-from, .currency-to, .amount').on('input', function() {
        calculateConversion();
    });

    function calculateConversion() {
        const fromCurrency = $('.currency-from').val();
        const toCurrency = $('.currency-to').val();
        const amount = parseFloat($('.amount').val()) || 0;

        if (fromCurrency && toCurrency && amount > 0) {
            // Simulate conversion rate (replace with actual API call)
            const conversionRates = {
                'USD_EUR': 0.85,
                'USD_GBP': 0.73,
                'EUR_USD': 1.18,
                'EUR_GBP': 0.86,
                'GBP_USD': 1.37,
                'GBP_EUR': 1.16
            };

            const rateKey = `${fromCurrency}_${toCurrency}`;
            const rate = conversionRates[rateKey] || 1;
            const convertedAmount = amount * rate;

            $('.converted-amount').text(convertedAmount.toFixed(2));
            $('.conversion-rate').text(`1 ${fromCurrency} = ${rate.toFixed(4)} ${toCurrency}`);
        }
    }

    // Wallet balance check
    $('.amount').on('blur', function() {
        const amount = parseFloat($(this).val()) || 0;
        const walletBalance = parseFloat($('.wallet-balance').data('balance')) || 0;

        if (amount > walletBalance) {
            showAlert('Insufficient balance in your wallet.', 'error');
            $(this).val('');
            $('.submit-btn').prop('disabled', true);
        } else {
            $('.submit-btn').prop('disabled', false);
        }
    });

    // Recipient search and validation
    $('.recipient-search').on('input', debounce(function() {
        const searchTerm = $(this).val();
        
        if (searchTerm.length >= 3) {
            searchRecipients(searchTerm);
        } else {
            $('.recipient-results').hide();
        }
    }, 300));

    function searchRecipients(searchTerm) {
        $.ajax({
            url: '/api/recipients/search',
            method: 'POST',
            data: {
                search: searchTerm,
                _token: $('meta[name="csrf-token"]').attr('content')
            },
            success: function(response) {
                displayRecipientResults(response.recipients);
            },
            error: function() {
                showAlert('Error searching recipients', 'error');
            }
        });
    }

    function displayRecipientResults(recipients) {
        const $results = $('.recipient-results');
        $results.empty();

        if (recipients.length > 0) {
            recipients.forEach(recipient => {
                $results.append(`
                    <div class="recipient-item" data-id="${recipient.id}" data-email="${recipient.email}">
                        <div class="recipient-avatar">
                            <img src="${recipient.avatar || '/images/default-avatar.png'}" alt="${recipient.name}">
                        </div>
                        <div class="recipient-info">
                            <div class="recipient-name">${recipient.name}</div>
                            <div class="recipient-email">${recipient.email}</div>
                        </div>
                    </div>
                `);
            });
            $results.show();
        } else {
            $results.hide();
        }
    }

    // Select recipient from search results
    $(document).on('click', '.recipient-item', function() {
        const recipientId = $(this).data('id');
        const recipientEmail = $(this).data('email');
        const recipientName = $(this).find('.recipient-name').text();

        $('.recipient-id').val(recipientId);
        $('.recipient-email').val(recipientEmail);
        $('.recipient-search').val(recipientName);
        $('.recipient-results').hide();

        validateForm();
    });

    // QR code scanning
    $('.scan-qr-btn').on('click', function() {
        if (typeof Html5QrcodeScanner !== 'undefined') {
            initializeQRScanner();
        } else {
            showAlert('QR scanner not available', 'error');
        }
    });

    function initializeQRScanner() {
        const scanner = new Html5QrcodeScanner("qr-reader", { 
            fps: 10, 
            qrbox: 250 
        });

        scanner.render((decodedText) => {
            // Parse QR code data (assuming it contains recipient info)
            try {
                const qrData = JSON.parse(decodedText);
                if (qrData.email && qrData.user_id) {
                    $('.recipient-id').val(qrData.user_id);
                    $('.recipient-email').val(qrData.email);
                    $('.recipient-search').val(qrData.name || qrData.email);
                    scanner.clear();
                    $('#qrScannerModal').modal('hide');
                    showAlert('Recipient scanned successfully!', 'success');
                }
            } catch (e) {
                showAlert('Invalid QR code', 'error');
            }
        });
    }

    // Form submission
    $('.send-money-form').on('submit', function(e) {
        e.preventDefault();

        if (!validateForm()) {
            return false;
        }

        const formData = new FormData(this);
        
        // Show loading state
        $('.submit-btn').prop('disabled', true).html(`
            <span class="spinner-border spinner-border-sm" role="status"></span>
            Processing...
        `);

        $.ajax({
            url: $(this).attr('action'),
            method: 'POST',
            data: formData,
            processData: false,
            contentType: false,
            success: function(response) {
                if (response.success) {
                    showAlert(response.message, 'success');
                    resetForm();
                    
                    // Redirect to transaction details or show success modal
                    setTimeout(() => {
                        window.location.href = response.redirect_url || '/transactions';
                    }, 2000);
                } else {
                    showAlert(response.message, 'error');
                }
            },
            error: function(xhr) {
                const errorMessage = xhr.responseJSON?.message || 'An error occurred. Please try again.';
                showAlert(errorMessage, 'error');
            },
            complete: function() {
                $('.submit-btn').prop('disabled', false).html('Send Money');
            }
        });
    });

    // Form validation
    function validateForm() {
        const recipientId = $('.recipient-id').val();
        const amount = parseFloat($('.amount').val()) || 0;
        const currency = $('.currency-from').val();
        const walletBalance = parseFloat($('.wallet-balance').data('balance')) || 0;

        let isValid = true;

        // Validate recipient
        if (!recipientId) {
            showFieldError('.recipient-search', 'Please select a recipient');
            isValid = false;
        } else {
            clearFieldError('.recipient-search');
        }

        // Validate amount
        if (amount <= 0) {
            showFieldError('.amount', 'Please enter a valid amount');
            isValid = false;
        } else if (amount > walletBalance) {
            showFieldError('.amount', 'Insufficient balance');
            isValid = false;
        } else {
            clearFieldError('.amount');
        }

        // Validate currency
        if (!currency) {
            showFieldError('.currency-from', 'Please select a currency');
            isValid = false;
        } else {
            clearFieldError('.currency-from');
        }

        $('.submit-btn').prop('disabled', !isValid);
        return isValid;
    }

    // Utility functions
    function debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    }

    function showAlert(message, type) {
        // Remove existing alerts
        $('.alert').remove();

        const alertClass = type === 'success' ? 'alert-success' : 'alert-danger';
        const alertHtml = `
            <div class="alert ${alertClass} alert-dismissible fade show" role="alert">
                ${message}
                <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
            </div>
        `;

        $('.send-money-form').prepend(alertHtml);

        // Auto dismiss after 5 seconds
        setTimeout(() => {
            $('.alert').alert('close');
        }, 5000);
    }

    function showFieldError(selector, message) {
        $(selector).addClass('is-invalid');
        let $errorDiv = $(selector).siblings('.invalid-feedback');
        
        if ($errorDiv.length === 0) {
            $errorDiv = $(`<div class="invalid-feedback">${message}</div>`);
            $(selector).after($errorDiv);
        } else {
            $errorDiv.text(message);
        }
        
        $errorDiv.show();
    }

    function clearFieldError(selector) {
        $(selector).removeClass('is-invalid');
        $(selector).siblings('.invalid-feedback').hide();
    }

    function resetForm() {
        $('.send-money-form')[0].reset();
        $('.recipient-id').val('');
        $('.converted-amount').text('0.00');
        $('.conversion-rate').text('');
        $('.recipient-results').hide();
        $('.is-invalid').removeClass('is-invalid');
        $('.invalid-feedback').hide();
    }

    // Fee calculation
    $('.amount, .currency-from').on('change', function() {
        calculateFees();
    });

    function calculateFees() {
        const amount = parseFloat($('.amount').val()) || 0;
        const currency = $('.currency-from').val();
        
        if (amount > 0 && currency) {
            // Simulate fee calculation (replace with actual logic)
            const feePercentage = 1.5; // 1.5% fee
            const fixedFee = 0.30; // $0.30 fixed fee
            
            const percentageFee = (amount * feePercentage) / 100;
            const totalFee = percentageFee + fixedFee;
            const netAmount = amount - totalFee;

            $('.transaction-fee').text(`${totalFee.toFixed(2)} ${currency}`);
            $('.net-amount').text(`${netAmount.toFixed(2)} ${currency}`);
        }
    }

    // Recent recipients
    function loadRecentRecipients() {
        $.ajax({
            url: '/api/recipients/recent',
            method: 'GET',
            success: function(response) {
                displayRecentRecipients(response.recipients);
            }
        });
    }

    function displayRecentRecipients(recipients) {
        const $container = $('.recent-recipients');
        $container.empty();

        recipients.forEach(recipient => {
            $container.append(`
                <div class="recent-recipient" data-id="${recipient.id}" data-email="${recipient.email}">
                    <img src="${recipient.avatar || '/images/default-avatar.png'}" alt="${recipient.name}">
                    <span>${recipient.name}</span>
                </div>
            `);
        });
    }

    // Click on recent recipient
    $(document).on('click', '.recent-recipient', function() {
        const recipientId = $(this).data('id');
        const recipientEmail = $(this).data('email');
        const recipientName = $(this).find('span').text();

        $('.recipient-id').val(recipientId);
        $('.recipient-email').val(recipientEmail);
        $('.recipient-search').val(recipientName);

        validateForm();
    });

    // Initialize on page load
    loadRecentRecipients();
    calculateFees();
});