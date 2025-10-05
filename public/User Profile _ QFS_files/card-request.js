// card-request.js
document.addEventListener('DOMContentLoaded', function() {
    const requestCardBtn = document.getElementById('requestCardBtn');
    const requestCardModal = new bootstrap.Modal(document.getElementById('requestCardModal'));
    
    // Step navigation elements
    const cardStep1 = document.getElementById('cardStep1');
    const cardStep2 = document.getElementById('cardStep2');
    const cardStep3 = document.getElementById('cardStep3');
    
    // Step buttons
    const cardStep1Buttons = document.getElementById('cardStep1Buttons');
    const cardStep2Buttons = document.getElementById('cardStep2Buttons');
    const cardStep3Buttons = document.getElementById('cardStep3Buttons');
    
    // Navigation buttons
    const nextToCardStep2 = document.getElementById('nextToCardStep2');
    const backToCardStep1 = document.getElementById('backToCardStep1');
    const confirmCardRequest = document.getElementById('confirmCardRequest');
    const requestAnotherCard = document.getElementById('requestAnotherCard');
    
    // Form elements
    const cardType = document.getElementById('cardType');
    const cardCurrency = document.getElementById('cardCurrency');
    const cardAmount = document.getElementById('cardAmount');
    const termsAgreement = document.getElementById('termsAgreement');
    
    // Confirmation display elements
    const confirmCardType = document.getElementById('confirmCardType');
    const confirmCurrency = document.getElementById('confirmCurrency');
    const confirmAmount = document.getElementById('confirmAmount');
    const confirmFee = document.getElementById('confirmFee');
    const confirmTotal = document.getElementById('confirmTotal');
    
    // Success display elements
    const transactionId = document.getElementById('transactionId');
    const successCardType = document.getElementById('successCardType');
    const successAmount = document.getElementById('successAmount');
    
    // Balance elements
    const availableBalance = document.getElementById('availableBalance');
    const totalCost = document.getElementById('totalCost');
    const balanceError = document.getElementById('balanceError');

    // Open modal when request card button is clicked
    if (requestCardBtn) {
        requestCardBtn.addEventListener('click', function() {
            resetModal();
            requestCardModal.show();
        });
    }

    // Navigation to step 2
    if (nextToCardStep2) {
        nextToCardStep2.addEventListener('click', function() {
            if (validateStep1()) {
                updateConfirmationDetails();
                showStep(2);
            }
        });
    }

    // Navigation back to step 1
    if (backToCardStep1) {
        backToCardStep1.addEventListener('click', function() {
            showStep(1);
        });
    }

    // Confirm card request - THIS IS THE MAIN FUNCTION YOU NEEDED
    if (confirmCardRequest) {
        confirmCardRequest.addEventListener('click', function() {
            if (!termsAgreement.checked) {
                alert('Please agree to the Terms and Conditions and Privacy Policy');
                return;
            }

            // Disable button and show loading state
            confirmCardRequest.disabled = true;
            confirmCardRequest.innerHTML = '<i class="fa fa-spinner fa-spin me-2"></i> Processing...';

            // Prepare the card request data
            const cardRequestData = {
                card_type: cardType.value,
                currency: cardCurrency.value,
                amount: parseFloat(cardAmount.value),
                user_id: getCurrentUserId(), // You'll need to implement this function
                user_email: getCurrentUserEmail(), // You'll need to implement this function
                user_name: getCurrentUserName(), // You'll need to implement this function
                timestamp: new Date().toISOString(),
                status: 'pending',
                _token: document.querySelector('meta[name="csrf-token"]').getAttribute('content')
            };

            // Send request to admin
            sendCardRequestToAdmin(cardRequestData);
        });
    }

    // Request another card
    if (requestAnotherCard) {
        requestAnotherCard.addEventListener('click', function() {
            resetModal();
            showStep(1);
        });
    }

    // Print receipt
    document.getElementById('printCardReceipt')?.addEventListener('click', function() {
        window.print();
    });

    // Real-time calculations
    if (cardAmount && cardCurrency) {
        cardAmount.addEventListener('input', calculateTotalCost);
        cardCurrency.addEventListener('change', calculateTotalCost);
    }

    // Function to send card request to admin
    function sendCardRequestToAdmin(cardData) {
        // You can use AJAX, Fetch API, or form submission here
        // Example using Fetch API:
        
        fetch('/admin/card-requests', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-CSRF-TOKEN': cardData._token,
                'X-Requested-With': 'XMLHttpRequest'
            },
            body: JSON.stringify(cardData)
        })
        .then(response => {
            if (!response.ok) {
                throw new Error('Network response was not ok');
            }
            return response.json();
        })
        .then(data => {
            // Handle success response
            if (data.success) {
                // Update success step with transaction details
                transactionId.textContent = data.transaction_id || 'TXN-' + Date.now();
                successCardType.textContent = getCardTypeDisplayName(cardData.card_type);
                successAmount.textContent = formatCurrency(cardData.amount, cardData.currency);
                
                // Show success step
                showStep(3);
                
                // Show success notification
                showNotification('Card request submitted successfully! The admin will review your request.', 'success');
            } else {
                throw new Error(data.message || 'Failed to submit card request');
            }
        })
        .catch(error => {
            console.error('Error submitting card request:', error);
            
            // Re-enable button
            confirmCardRequest.disabled = false;
            confirmCardRequest.innerHTML = 'Confirm Request';
            
            // Show error message
            showNotification('Failed to submit card request. Please try again.', 'error');
            alert('Error: ' + error.message);
        });

        // Alternative: Using AJAX (jQuery)
        /*
        $.ajax({
            url: '/admin/card-requests',
            method: 'POST',
            data: cardData,
            success: function(response) {
                if (response.success) {
                    transactionId.textContent = response.transaction_id;
                    showStep(3);
                    showNotification('Card request submitted successfully!', 'success');
                } else {
                    throw new Error(response.message);
                }
            },
            error: function(xhr, status, error) {
                console.error('Error:', error);
                confirmCardRequest.disabled = false;
                confirmCardRequest.innerHTML = 'Confirm Request';
                alert('Error submitting request: ' + error);
            }
        });
        */

        // Alternative: Simple form submission (if you prefer traditional form)
        /*
        const form = document.createElement('form');
        form.method = 'POST';
        form.action = '/admin/card-requests';
        
        for (const key in cardData) {
            const input = document.createElement('input');
            input.type = 'hidden';
            input.name = key;
            input.value = cardData[key];
            form.appendChild(input);
        }
        
        document.body.appendChild(form);
        form.submit();
        */
    }

    // Helper functions
    function validateStep1() {
        if (!cardType.value) {
            alert('Please select a card type');
            cardType.focus();
            return false;
        }
        
        if (!cardCurrency.value) {
            alert('Please select a currency');
            cardCurrency.focus();
            return false;
        }
        
        const amount = parseFloat(cardAmount.value);
        if (!amount || amount < 10) {
            alert('Please enter a valid amount (minimum $10.00)');
            cardAmount.focus();
            return false;
        }
        
        // Check balance (you'll need to implement actual balance check)
        if (!hasSufficientBalance(amount, cardCurrency.value)) {
            balanceError.classList.remove('d-none');
            return false;
        }
        
        balanceError.classList.add('d-none');
        return true;
    }

    function updateConfirmationDetails() {
        const cardTypeDisplay = getCardTypeDisplayName(cardType.value);
        const amount = parseFloat(cardAmount.value);
        const currency = cardCurrency.value;
        const fee = calculateFee(amount);
        const total = amount + fee;
        
        confirmCardType.textContent = cardTypeDisplay;
        confirmCurrency.textContent = currency;
        confirmAmount.textContent = formatCurrency(amount, currency);
        confirmFee.textContent = formatCurrency(fee, 'USD');
        confirmTotal.textContent = formatCurrency(total, currency);
    }

    function calculateTotalCost() {
        const amount = parseFloat(cardAmount.value) || 0;
        const fee = calculateFee(amount);
        const total = amount + fee;
        
        totalCost.textContent = formatCurrency(total, cardCurrency.value);
        
        // Update available balance (you'll need to get this from your backend)
        updateAvailableBalance();
    }

    function calculateFee(amount) {
        // Example fee calculation: 2% of amount with $1 minimum
        return Math.max(amount * 0.02, 1.00);
    }

    function formatCurrency(amount, currency) {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: currency
        }).format(amount);
    }

    function getCardTypeDisplayName(type) {
        const types = {
            'amex': 'QFS American Express',
            'mastercard': 'QFS Mastercard',
            'verve': 'QFS Verve Card',
            'visa': 'QFS Visa Card'
        };
        return types[type] || type;
    }

    function showStep(step) {
        // Hide all steps
        cardStep1.classList.add('d-none');
        cardStep2.classList.add('d-none');
        cardStep3.classList.add('d-none');
        cardStep1Buttons.classList.add('d-none');
        cardStep2Buttons.classList.add('d-none');
        cardStep3Buttons.classList.add('d-none');
        
        // Show selected step
        switch(step) {
            case 1:
                cardStep1.classList.remove('d-none');
                cardStep1Buttons.classList.remove('d-none');
                break;
            case 2:
                cardStep2.classList.remove('d-none');
                cardStep2Buttons.classList.remove('d-none');
                break;
            case 3:
                cardStep3.classList.remove('d-none');
                cardStep3Buttons.classList.remove('d-none');
                break;
        }
    }

    function resetModal() {
        // Reset form
        document.getElementById('cardFormStep1').reset();
        
        // Reset confirmation details
        confirmCardType.textContent = '-';
        confirmCurrency.textContent = '-';
        confirmAmount.textContent = '-';
        confirmFee.textContent = 'USD 0.00';
        confirmTotal.textContent = 'USD 0.00';
        
        // Reset terms agreement
        termsAgreement.checked = false;
        
        // Reset balance error
        balanceError.classList.add('d-none');
        
        // Reset button states
        confirmCardRequest.disabled = false;
        confirmCardRequest.innerHTML = 'Confirm Request';
        
        // Show step 1
        showStep(1);
    }

    function updateAvailableBalance() {
        // You'll need to implement this to fetch actual user balance from your backend
        // For now, using a placeholder
        availableBalance.textContent = formatCurrency(1000, cardCurrency.value); // Example balance
    }

    function hasSufficientBalance(amount, currency) {
        // You'll need to implement actual balance checking logic
        // For now, using a placeholder
        const userBalance = 1000; // Example balance - get this from your backend
        const totalCost = amount + calculateFee(amount);
        return userBalance >= totalCost;
    }

    function getCurrentUserId() {
        // Implement this to get the current user's ID from your system
        // This could be from a data attribute, global variable, or API call
        return document.querySelector('meta[name="user-id"]')?.getAttribute('content') || 'unknown';
    }

    function getCurrentUserEmail() {
        // Implement this to get the current user's email
        return document.querySelector('meta[name="user-email"]')?.getAttribute('content') || 'user@example.com';
    }

    function getCurrentUserName() {
        // Implement this to get the current user's name
        return document.querySelector('.user-name')?.textContent || 'User';
    }

    function showNotification(message, type = 'info') {
        // You can implement a toast notification system here
        // For now, using alert as fallback
        alert(message);
        
        // Example for toast notification:
        /*
        const toast = document.createElement('div');
        toast.className = `alert alert-${type} alert-dismissible fade show`;
        toast.innerHTML = `
            ${message}
            <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
        `;
        document.body.appendChild(toast);
        
        setTimeout(() => {
            toast.remove();
        }, 5000);
        */
    }

    // Initialize modal when page loads
    updateAvailableBalance();
});