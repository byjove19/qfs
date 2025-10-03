// Wait for DOM to be fully loaded
document.addEventListener('DOMContentLoaded', function() {
    console.log('DOM loaded, initializing deposit modal...');
    // Small delay to ensure Bootstrap is ready
    setTimeout(initDepositModal, 200);
});

function initDepositModal() {
    // Check if Bootstrap is available
    if (typeof bootstrap === 'undefined') {
        console.error('Bootstrap is not loaded. Please include Bootstrap 5.');
        return;
    }

    const depositModalElement = document.getElementById('depositModal');
    if (!depositModalElement) {
        console.error('Deposit modal element not found');
        return;
    }

    console.log('Bootstrap found, modal element found');
    
    const depositModal = new bootstrap.Modal(depositModalElement, {
        backdrop: 'static',
        keyboard: false,
        focus: true
    });
    
    let currentStep = 1;
    let selectedCurrency = '';
    
    // Update all deposit buttons to open the modal with correct currency
    document.querySelectorAll('.deposit-modal-trigger').forEach(button => {
        button.addEventListener('click', function(e) {
            e.preventDefault();
            selectedCurrency = this.getAttribute('data-currency') || 'USD';
            console.log('Opening modal for currency:', selectedCurrency);
            resetDepositForm();
            depositModal.show();
        });
    });
    
    // Fix for select dropdowns - ensure they're clickable
    depositModalElement.addEventListener('shown.bs.modal', function () {
        // Remove any aria-hidden that might block interaction
        depositModalElement.removeAttribute('aria-hidden');
        
        // Ensure selects are interactive
        const selects = depositModalElement.querySelectorAll('select');
        selects.forEach(select => {
            select.style.pointerEvents = 'auto';
            select.style.position = 'relative';
            select.style.zIndex = '1';
        });
    });
    
    // Step navigation
    const nextToStep2 = document.getElementById('nextToStep2');
    const backToStep1 = document.getElementById('backToStep1');
    const confirmDeposit = document.getElementById('confirmDeposit');
    const depositAgain = document.getElementById('depositAgain');
    const printReceipt = document.getElementById('printReceipt');
    
    if (nextToStep2) {
        nextToStep2.addEventListener('click', function(e) {
            e.preventDefault();
            e.stopPropagation();
            if (validateStep1()) {
                showStep(2);
                updateConfirmationDetails();
            }
        });
    }
    
    if (backToStep1) {
        backToStep1.addEventListener('click', function(e) {
            e.preventDefault();
            e.stopPropagation();
            showStep(1);
        });
    }
    
    if (confirmDeposit) {
        confirmDeposit.addEventListener('click', function(e) {
            e.preventDefault();
            e.stopPropagation();
            if (validateStep2()) {
                processDeposit();
            }
        });
    }
    
    if (depositAgain) {
        depositAgain.addEventListener('click', function(e) {
            e.preventDefault();
            e.stopPropagation();
            resetDepositForm();
            showStep(1);
        });
    }
    
    if (printReceipt) {
        printReceipt.addEventListener('click', function(e) {
            e.preventDefault();
            e.stopPropagation();
            printReceiptFunction();
        });
    }
    
    // Payment method change handler
    const paymentMethod = document.getElementById('paymentMethod');
    if (paymentMethod) {
        paymentMethod.addEventListener('change', function() {
            console.log('Payment method changed to:', this.value);
            const method = this.value;
            const currency = document.getElementById('currencySelect').value;
            
            if (method === 'bank' && currency) {
                document.getElementById('bankError').classList.remove('d-none');
            } else {
                document.getElementById('bankError').classList.add('d-none');
            }
        });
        
        // Also listen for click to ensure dropdown opens
        paymentMethod.addEventListener('click', function(e) {
            console.log('Payment method clicked');
            e.stopPropagation();
        });
    }
    
    // Currency change handler
    const currencySelect = document.getElementById('currencySelect');
    if (currencySelect) {
        currencySelect.addEventListener('change', function() {
            console.log('Currency changed to:', this.value);
            const method = document.getElementById('paymentMethod').value;
            
            if (method === 'bank' && this.value) {
                document.getElementById('bankError').classList.remove('d-none');
            } else {
                document.getElementById('bankError').classList.add('d-none');
            }
        });
        
        // Also listen for click to ensure dropdown opens
        currencySelect.addEventListener('click', function(e) {
            console.log('Currency select clicked');
            e.stopPropagation();
        });
    }
    
    // Amount change handler
    const depositAmount = document.getElementById('depositAmount');
    if (depositAmount) {
        depositAmount.addEventListener('input', updateConfirmationDetails);
    }
    
    function showStep(step) {
        console.log('Showing step:', step);
        
        document.querySelectorAll('.deposit-step').forEach(el => {
            el.classList.add('d-none');
        });
        
        document.querySelectorAll('#step1Buttons, #step2Buttons, #step3Buttons').forEach(el => {
            el.classList.add('d-none');
        });
        
        const stepElement = document.getElementById(`step${step}`);
        const buttonsElement = document.getElementById(`step${step}Buttons`);
        
        if (stepElement) stepElement.classList.remove('d-none');
        if (buttonsElement) buttonsElement.classList.remove('d-none');
        
        currentStep = step;
    }
    
    function validateStep1() {
        const currency = document.getElementById('currencySelect').value;
        const amount = document.getElementById('depositAmount').value;
        const method = document.getElementById('paymentMethod').value;
        
        console.log('Validating step 1:', { currency, amount, method });
        
        if (!currency) {
            alert('Please select a currency');
            return false;
        }
        
        if (!amount || parseFloat(amount) <= 0) {
            alert('Please enter a valid amount');
            return false;
        }
        
        if (!method) {
            alert('Please select a payment method');
            return false;
        }
        
        if (method === 'bank') {
            document.getElementById('bankError').classList.remove('d-none');
            alert('Bank transfer is not available for the selected currency. Please choose Manual Transfer.');
            return false;
        }
        
        return true;
    }
    
    function validateStep2() {
        const fileInput = document.getElementById('depositFile');
        
        if (fileInput && fileInput.files.length > 0) {
            const fileSize = fileInput.files[0].size / 1024 / 1024;
            if (fileSize > 20) {
                alert('File size exceeds 20 MB limit');
                return false;
            }
        }
        
        return true;
    }
    
    function updateConfirmationDetails() {
        const amount = parseFloat(document.getElementById('depositAmount').value) || 0;
        const currency = document.getElementById('currencySelect').value || 'USD';
        const fee = 0;
        const total = amount + fee;
        
        const confirmAmount = document.getElementById('confirmAmount');
        const confirmFee = document.getElementById('confirmFee');
        const confirmTotal = document.getElementById('confirmTotal');
        
        if (confirmAmount) confirmAmount.textContent = `${currency} ${amount.toFixed(2)}`;
        if (confirmFee) confirmFee.textContent = `${currency} ${fee.toFixed(2)}`;
        if (confirmTotal) confirmTotal.textContent = `${currency} ${total.toFixed(2)}`;
    }
    
    function processDeposit() {
        const amount = parseFloat(document.getElementById('depositAmount').value) || 0;
        const currency = document.getElementById('currencySelect').value || 'USD';
        
        const finalAmount = document.getElementById('finalAmount');
        if (finalAmount) {
            finalAmount.textContent = `${currency} ${amount.toFixed(2)}`;
        }
        
        showStep(3);
        console.log('Deposit processed:', { currency, amount });
    }
    
    function resetDepositForm() {
        console.log('Resetting deposit form');
        
        const form1 = document.getElementById('depositFormStep1');
        const form2 = document.getElementById('depositFormStep2');
        const bankError = document.getElementById('bankError');
        
        if (form1) form1.reset();
        if (form2) form2.reset();
        if (bankError) bankError.classList.add('d-none');
        
        const currencySelect = document.getElementById('currencySelect');
        if (currencySelect && selectedCurrency) {
            currencySelect.value = selectedCurrency;
        }
        
        currentStep = 1;
        showStep(1);
    }
    
    function printReceiptFunction() {
        const finalAmount = document.getElementById('finalAmount');
        if (!finalAmount) return;
        
        const receiptContent = `
            <!DOCTYPE html>
            <html>
                <head>
                    <title>QFS Deposit Receipt</title>
                    <style>
                        body { font-family: Arial, sans-serif; padding: 30px; max-width: 500px; margin: 0 auto; color: #333; }
                        .receipt-header { text-align: center; margin-bottom: 30px; border-bottom: 2px solid #333; padding-bottom: 20px; }
                        .receipt-details { margin: 25px 0; }
                        .detail-row { display: flex; justify-content: space-between; margin: 12px 0; padding: 8px 0; border-bottom: 1px solid #eee; }
                        .thank-you { text-align: center; margin-top: 40px; font-style: italic; color: #666; }
                        .amount-highlight { font-size: 24px; font-weight: bold; color: #28a745; text-align: center; margin: 20px 0; }
                        @media print { body { padding: 20px; } }
                    </style>
                </head>
                <body>
                    <div class="receipt-header">
                        <h1 style="margin: 0; color: #333;">QFS</h1>
                        <h2 style="margin: 10px 0; color: #555;">Deposit Receipt</h2>
                        <p style="margin: 5px 0; color: #777;">Date: ${new Date().toLocaleDateString()} | Time: ${new Date().toLocaleTimeString()}</p>
                    </div>
                    <div class="receipt-details">
                        <div class="detail-row">
                            <strong>Transaction ID:</strong>
                            <span>${'TXN' + Date.now()}</span>
                        </div>
                        <div class="detail-row">
                            <strong>Status:</strong>
                            <span style="color: #28a745; font-weight: bold;">Completed</span>
                        </div>
                        <div class="amount-highlight">${finalAmount.textContent}</div>
                    </div>
                    <div class="thank-you"><p>Thank you for choosing QFS!</p></div>
                </body>
            </html>
        `;
        
        const printWindow = window.open('', '_blank');
        if (printWindow) {
            printWindow.document.write(receiptContent);
            printWindow.document.close();
            printWindow.focus();
            
            // Wait for content to load before printing
            printWindow.onload = function() {
                printWindow.print();
            };
        }
    }
    
    console.log('Deposit modal initialized successfully');
}