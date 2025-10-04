// Card Request Modal Functionality with Backend Integration
document.addEventListener('DOMContentLoaded', function() {
    // Check if Bootstrap is loaded
    if (typeof bootstrap === 'undefined') {
        console.error('Bootstrap is not loaded. Please include Bootstrap 5.');
        return;
    }

    const requestCardModal = new bootstrap.Modal(document.getElementById('requestCardModal'));
    let currentCardStep = 1;
    let userBalances = {};
    let cardIssuanceFee = 5.00;

    function initCardModal() {
        console.log('Initializing card modal...');
        loadUserBalances();
        setupEventListeners();
        fixDropdowns();
    }

    function fixDropdowns() {
        // Force dropdown styling
        const selects = document.querySelectorAll('.card-custom-select');
        selects.forEach(select => {
            select.style.display = 'block';
            select.style.opacity = '1';
            select.style.visibility = 'visible';
            select.style.position = 'relative';
        });
    }

    function setupEventListeners() {
        // Open modal when button is clicked
        const requestCardBtn = document.getElementById('requestCardBtn');
        if (requestCardBtn) {
            requestCardBtn.addEventListener('click', function(e) {
                e.preventDefault();
                console.log('Request card button clicked');
                resetCardForm();
                loadUserBalances();
                fixDropdowns();
                requestCardModal.show();
            });
        } else {
            console.error('Request card button not found');
        }
        
        // Step navigation
        document.getElementById('nextToCardStep2').addEventListener('click', function() {
            if (validateCardStep1()) {
                showCardStep(2);
                updateCardConfirmationDetails();
            }
        });
        
        document.getElementById('backToCardStep1').addEventListener('click', function() {
            showCardStep(1);
        });
        
        document.getElementById('confirmCardRequest').addEventListener('click', function() {
            if (validateCardStep2()) {
                processCardRequest();
            }
        });
        
        document.getElementById('requestAnotherCard').addEventListener('click', function() {
            resetCardForm();
            showCardStep(1);
        });
        
        document.getElementById('printCardReceipt').addEventListener('click', function() {
            printCardReceipt();
        });
        
        // Real-time balance check
        document.getElementById('cardAmount').addEventListener('input', checkBalance);
        document.getElementById('cardCurrency').addEventListener('change', checkBalance);
        
        // Fix dropdowns when modal is shown
        document.getElementById('requestCardModal').addEventListener('shown.bs.modal', function() {
            fixDropdowns();
        });
    }

    // Load user balances from backend
    function loadUserBalances() {
        const token = document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') || '';
        
        // Mock balances for testing - replace with actual API call
        userBalances = {
            'USD': 1000.00,
            'BTC': 0.05,
            'ETH': 2.5,
            'LTC': 10.0,
            'XRP': 500.0,
            'DOGE': 1000.0,
            'XDC': 1000.0,
            'XLM': 500.0,
            'MATIC': 100.0,
            'ALGO': 200.0
        };
        
        updateBalanceDisplay();
        
        /* Uncomment for real API call
        fetch('/api/user/balances', {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'X-CSRF-TOKEN': token,
                'X-Requested-With': 'XMLHttpRequest'
            },
            credentials: 'same-origin'
        })
        .then(response => {
            if (!response.ok) {
                throw new Error('Network response was not ok');
            }
            return response.json();
        })
        .then(data => {
            if (data.success) {
                userBalances = data.balances;
                updateBalanceDisplay();
            } else {
                console.error('Failed to load balances:', data.message);
                userBalances = {};
            }
        })
        .catch(error => {
            console.error('Error loading balances:', error);
            userBalances = {};
        });
        */
    }

    function updateBalanceDisplay() {
        const currency = document.getElementById('cardCurrency').value;
        if (currency && userBalances[currency]) {
            document.getElementById('availableBalance').textContent = 
                `${currency} ${parseFloat(userBalances[currency]).toFixed(2)}`;
        } else {
            document.getElementById('availableBalance').textContent = `${currency} 0.00`;
        }
    }

    function showCardStep(step) {
        // Hide all steps
        document.querySelectorAll('.card-step').forEach(el => {
            el.classList.add('d-none');
        });
        
        // Hide all button groups
        document.querySelectorAll('#cardStep1Buttons, #cardStep2Buttons, #cardStep3Buttons').forEach(el => {
            el.classList.add('d-none');
        });
        
        // Show current step
        document.getElementById(`cardStep${step}`).classList.remove('d-none');
        document.getElementById(`cardStep${step}Buttons`).classList.remove('d-none');
        
        currentCardStep = step;
    }
    
    
    function validateCardStep1() {
        const cardType = document.getElementById('cardType').value;
        const currency = document.getElementById('cardCurrency').value;
        const amount = document.getElementById('cardAmount').value;
        
        if (!cardType) {
            showAlert('Please select a card type', 'error');
            return false;
        }
        
        if (!currency) {
            showAlert('Please select a currency', 'error');
            return false;
        }
        
        if (!amount || parseFloat(amount) < 10) {
            showAlert('Please enter a valid amount (minimum $10.00)', 'error');
            return false;
        }
        
        // Check balance
        if (!checkBalance()) {
            showAlert('Insufficient balance! Please add funds to your wallet.', 'error');
            return false;
        }
        
        return true;
    }
    
    function validateCardStep2() {
        const termsAgreed = document.getElementById('termsAgreement').checked;
        
        if (!termsAgreed) {
            showAlert('Please agree to the Terms and Conditions', 'error');
            return false;
        }
        
        return true;
    }
    
    function checkBalance() {
        const amount = parseFloat(document.getElementById('cardAmount').value) || 0;
        const currency = document.getElementById('cardCurrency').value;
        const balanceError = document.getElementById('balanceError');
        
        if (!currency) {
            return false;
        }
        
        const totalCost = amount + cardIssuanceFee;
        const availableBalance = parseFloat(userBalances[currency]) || 0;
        
        // Update display
        document.getElementById('availableBalance').textContent = `${currency} ${availableBalance.toFixed(2)}`;
        document.getElementById('totalCost').textContent = `${currency} ${totalCost.toFixed(2)}`;
        
        // Check if user has sufficient balance
        if (availableBalance < totalCost) {
            balanceError.classList.remove('d-none');
            return false;
        } else {
            balanceError.classList.add('d-none');
            return true;
        }
    }
    
    function updateCardConfirmationDetails() {
        const cardType = document.getElementById('cardType');
        const cardTypeText = cardType.options[cardType.selectedIndex].text;
        const currency = document.getElementById('cardCurrency').value;
        const amount = parseFloat(document.getElementById('cardAmount').value) || 0;
        const total = amount + cardIssuanceFee;
        
        document.getElementById('confirmCardType').textContent = cardTypeText;
        document.getElementById('confirmCurrency').textContent = currency;
        document.getElementById('confirmAmount').textContent = `${currency} ${amount.toFixed(2)}`;
        document.getElementById('confirmFee').textContent = `${currency} ${cardIssuanceFee.toFixed(2)}`;
        document.getElementById('confirmTotal').textContent = `${currency} ${total.toFixed(2)}`;
    }
    
    function processCardRequest() {
        const submitBtn = document.getElementById('confirmCardRequest');
        const originalText = submitBtn.innerHTML;
        
        // Show loading state
        submitBtn.disabled = true;
        submitBtn.innerHTML = '<div class="spinner-border spinner-border-sm me-2" role="status"></div> Processing...';
        
        const cardType = document.getElementById('cardType').value;
        const cardTypeText = document.getElementById('cardType').options[document.getElementById('cardType').selectedIndex].text;
        const currency = document.getElementById('cardCurrency').value;
        const amount = parseFloat(document.getElementById('cardAmount').value) || 0;
        const token = document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') || '';
        
        // Send request to backend
        fetch('/virtualcard/request', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-CSRF-TOKEN': token,
                'X-Requested-With': 'XMLHttpRequest'
            },
            credentials: 'same-origin',
            body: JSON.stringify({
                card_type: cardType,
                currency: currency,
                amount: amount,
                issuance_fee: cardIssuanceFee
            })
        })
        .then(response => {
            if (!response.ok) {
                throw new Error('Network response was not ok');
            }
            return response.json();
        })
        .then(data => {
            if (data.success) {
                // Update success step with real data from backend
                document.getElementById('transactionId').textContent = data.transaction_id || 'TXN-' + Date.now();
                document.getElementById('successCardType').textContent = cardTypeText;
                document.getElementById('successAmount').textContent = `${currency} ${amount.toFixed(2)}`;
                
                // Show success step
                showCardStep(3);
                
                // Refresh balances after successful card request
                loadUserBalances();
                
                showAlert('Card request submitted successfully!', 'success');
            } else {
                throw new Error(data.message || 'Failed to process card request');
            }
        })
        .catch(error => {
            console.error('Error processing card request:', error);
            showAlert(error.message || 'Failed to process card request. Please try again.', 'error');
        })
        .finally(() => {
            // Restore button state
            submitBtn.disabled = false;
            submitBtn.innerHTML = originalText;
        });
    }
    
    function resetCardForm() {
        document.getElementById('cardFormStep1').reset();
        document.getElementById('balanceError').classList.add('d-none');
        document.getElementById('termsAgreement').checked = false;
        currentCardStep = 1;
        showCardStep(1);
    }
    
    function printCardReceipt() {
        const receiptContent = `
            <!DOCTYPE html>
            <html>
                <head>
                    <title>QFS Card Request Receipt</title>
                    <style>
                        body { font-family: Arial, sans-serif; padding: 30px; max-width: 500px; margin: 0 auto; }
                        .receipt-header { text-align: center; margin-bottom: 30px; border-bottom: 2px solid #333; padding-bottom: 20px; }
                        .receipt-details { margin: 25px 0; }
                        .detail-row { display: flex; justify-content: space-between; margin: 12px 0; padding: 8px 0; border-bottom: 1px solid #eee; }
                        .thank-you { text-align: center; margin-top: 40px; font-style: italic; color: #666; }
                        .status-processing { color: #ffc107; font-weight: bold; }
                        @media print {
                            body { padding: 20px; }
                            .thank-you { margin-top: 30px; }
                        }
                    </style>
                </head>
                <body>
                    <div class="receipt-header">
                        <h1 style="margin: 0; color: #333;">QFS</h1>
                        <h2 style="margin: 10px 0; color: #555;">Card Request Receipt</h2>
                        <p style="margin: 5px 0; color: #777;">Date: ${new Date().toLocaleDateString()} | Time: ${new Date().toLocaleTimeString()}</p>
                    </div>
                    <div class="receipt-details">
                        <div class="detail-row">
                            <strong>Transaction ID:</strong>
                            <span>${document.getElementById('transactionId').textContent}</span>
                        </div>
                        <div class="detail-row">
                            <strong>Card Type:</strong>
                            <span>${document.getElementById('successCardType').textContent}</span>
                        </div>
                        <div class="detail-row">
                            <strong>Amount Loaded:</strong>
                            <span>${document.getElementById('successAmount').textContent}</span>
                        </div>
                        <div class="detail-row">
                            <strong>Status:</strong>
                            <span class="status-processing">Processing</span>
                        </div>
                        <div class="detail-row">
                            <strong>Estimated Delivery:</strong>
                            <span>24-48 hours</span>
                        </div>
                    </div>
                    <div class="thank-you">
                        <p>Thank you for choosing QFS Virtual Cards!</p>
                        <p>Your card will be available in your account shortly.</p>
                    </div>
                </body>
            </html>
        `;
        
        const printWindow = window.open('', '_blank');
        printWindow.document.write(receiptContent);
        printWindow.document.close();
        printWindow.focus();
        printWindow.print();
    }

    // Utility function to show alerts
    function showAlert(message, type = 'info') {
        // Remove any existing alerts
        const existingAlert = document.querySelector('.custom-alert');
        if (existingAlert) {
            existingAlert.remove();
        }

        const alertClass = type === 'error' ? 'alert-danger' : 
                          type === 'success' ? 'alert-success' : 'alert-info';
        
        const alertHtml = `
            <div class="alert ${alertClass} custom-alert alert-dismissible fade show position-fixed" 
                 style="top: 20px; right: 20px; z-index: 9999; min-width: 300px;">
                <strong>${type === 'error' ? 'Error!' : type === 'success' ? 'Success!' : 'Info!'}</strong> ${message}
                <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
            </div>
        `;
        
        document.body.insertAdjacentHTML('beforeend', alertHtml);
        
        // Auto remove after 5 seconds
        setTimeout(() => {
            const alert = document.querySelector('.custom-alert');
            if (alert) {
                alert.remove();
            }
        }, 5000);
    }

    // Input validation functions
    function restrictNumberToPrefdecimal(e, type) {
        let decimalFormat = type === "fiat" ? "2" : "8";
        let num = e.value.trim();
        if (num.length > 0 && !isNaN(num)) {
            e.value = digitCheck(num, 8, decimalFormat);
            return e.value;
        }
    }

    function digitCheck(num, beforeDecimal, afterDecimal) {
        return num
            .replace(/[^\d.]/g, "")
            .replace(new RegExp("(^[\\d]{" + beforeDecimal + "})[\\d]", "g"), "$1")
            .replace(/(\..*)\./g, "$1")
            .replace(new RegExp("(\\.[\\d]{" + afterDecimal + "}).", "g"), "$1");
    }

    function isNumberOrDecimalPointKey(value, e) {
        var charCode = (e.which) ? e.which : e.keyCode;

        if (charCode == 46) {
            if (value.value.indexOf('.') === -1) {
                return true;
            } else {
                return false;
            }
        } else {
            if (charCode > 31 && (charCode < 48 || charCode > 57))
                return false;
        }
        return true;
    }

    // Initialize the modal functionality
    initCardModal();
});