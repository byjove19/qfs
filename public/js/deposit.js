// Wait for DOM to be fully loaded
document.addEventListener('DOMContentLoaded', function() {
    console.log('DOM loaded, initializing deposit modal...');
    setTimeout(initDepositModal, 200);
});

function initDepositModal() {
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
    let selectedPaymentMethod = '';
    let currentDepositData = {};
    
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
        depositModalElement.removeAttribute('aria-hidden');
        
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
                updateMethodInfo();
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
                // First show the receipt/confirmation
                showReceiptStep();
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
            selectedPaymentMethod = this.value;
            const currency = document.getElementById('currencySelect').value;
            
            if (this.value === 'bank' && currency) {
                document.getElementById('bankError').classList.remove('d-none');
            } else {
                document.getElementById('bankError').classList.add('d-none');
            }
        });
        
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
        
        // Hide all steps
        document.querySelectorAll('.deposit-step').forEach(el => {
            el.classList.remove('active');
            el.classList.add('d-none');
        });
        
        // Hide all button groups
        document.querySelectorAll('#step1Buttons, #step2Buttons, #step3Buttons').forEach(el => {
            el.classList.add('d-none');
        });
        
        // Show current step
        const stepElement = document.getElementById(`step${step}`);
        const buttonsElement = document.getElementById(`step${step}Buttons`);
        
        if (stepElement) {
            stepElement.classList.remove('d-none');
            stepElement.classList.add('active');
        }
        if (buttonsElement) buttonsElement.classList.remove('d-none');
        
        currentStep = step;
    }
    
    function showReceiptStep() {
        // Collect all deposit data
        currentDepositData = {
            amount: parseFloat(document.getElementById('depositAmount').value) || 0,
            currency: document.getElementById('currencySelect').value || 'USD',
            paymentMethod: document.getElementById('paymentMethod').value,
            manualNotes: document.getElementById('manualNotes')?.value || '',
            file: document.getElementById('depositFile').files[0],
            transactionId: 'TXN' + Date.now() + Math.random().toString(36).substr(2, 9),
            timestamp: new Date().toISOString()
        };
        
        // Update the receipt display
        const finalAmount = document.getElementById('finalAmount');
        const transactionId = document.getElementById('transactionId');
        const depositMethod = document.getElementById('depositMethod');
        
        if (finalAmount) {
            finalAmount.textContent = `${currentDepositData.currency} ${currentDepositData.amount.toFixed(2)}`;
        }
        
        if (transactionId) {
            transactionId.textContent = currentDepositData.transactionId;
        }
        
        if (depositMethod) {
            depositMethod.textContent = currentDepositData.paymentMethod === 'manual' ? 'Manual Transfer' : 'Bank Transfer';
        }
        
        // Show step 3 (receipt)
        showStep(3);
        
        // Auto-submit to server after showing receipt
        setTimeout(() => {
            processDepositToServer();
        }, 1000);
    }
    
    function updateMethodInfo() {
        const method = document.getElementById('paymentMethod').value;
        selectedPaymentMethod = method;
        
        // Hide all method info sections
        document.querySelectorAll('.method-info').forEach(el => {
            el.classList.add('d-none');
        });
        
        // Show the appropriate method info
        if (method === 'manual') {
            document.getElementById('manualMethodInfo').classList.remove('d-none');
        } else if (method === 'bank') {
            document.getElementById('bankMethodInfo').classList.remove('d-none');
        }
    }
    
    function validateStep1() {
        const currency = document.getElementById('currencySelect').value;
        const amount = document.getElementById('depositAmount').value;
        const method = document.getElementById('paymentMethod').value;
        
        console.log('Validating step 1:', { currency, amount, method });
        
        if (!currency) {
            showAlert('Please select a currency', 'error');
            return false;
        }
        
        if (!amount || parseFloat(amount) <= 0) {
            showAlert('Please enter a valid amount', 'error');
            return false;
        }
        
        if (!method) {
            showAlert('Please select a payment method', 'error');
            return false;
        }
        
        if (method === 'bank') {
            document.getElementById('bankError').classList.remove('d-none');
            showAlert('Bank transfer is not available for the selected currency. Please choose Manual Transfer.', 'error');
            return false;
        }
        
        return true;
    }
    
    function validateStep2() {
        const fileInput = document.getElementById('depositFile');
        
        if (!fileInput || fileInput.files.length === 0) {
            showAlert('Please upload proof of payment. This is required for manual transfers.', 'error');
            return false;
        }
        
        if (fileInput && fileInput.files.length > 0) {
            const fileSize = fileInput.files[0].size / 1024 / 1024;
            if (fileSize > 20) {
                showAlert('File size exceeds 20 MB limit', 'error');
                return false;
            }
            
            // Validate file type
            const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/bmp', 'application/pdf'];
            const fileType = fileInput.files[0].type;
            if (!allowedTypes.includes(fileType)) {
                showAlert('Please upload only images (JPEG, PNG, BMP) or PDF files', 'error');
                return false;
            }
        }
        
        return true;
    }
    
    function updateConfirmationDetails() {
        const amount = parseFloat(document.getElementById('depositAmount').value) || 0;
        const currency = document.getElementById('currencySelect').value || 'USD';
        const method = document.getElementById('paymentMethod').value || 'manual';
        const fee = 0;
        const total = amount + fee;
        
        const confirmAmount = document.getElementById('confirmAmount');
        const confirmFee = document.getElementById('confirmFee');
        const confirmTotal = document.getElementById('confirmTotal');
        const confirmMethod = document.getElementById('confirmMethod');
        
        if (confirmAmount) confirmAmount.textContent = `${currency} ${amount.toFixed(2)}`;
        if (confirmFee) confirmFee.textContent = `${currency} ${fee.toFixed(2)}`;
        if (confirmTotal) confirmTotal.textContent = `${currency} ${total.toFixed(2)}`;
        if (confirmMethod) confirmMethod.textContent = method === 'manual' ? 'Manual Transfer' : 'Bank Transfer';
    }
    
// In your deposit.js, update the processDepositToServer function:

async function processDepositToServer() {
    // Show loading state in step 3
    const depositAgainBtn = document.getElementById('depositAgain');
    const printReceiptBtn = document.getElementById('printReceipt');
    const statusMessage = document.getElementById('statusMessage');
    
    if (statusMessage) {
        statusMessage.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span> Submitting to server...';
    }
    
    if (depositAgainBtn) depositAgainBtn.disabled = true;
    if (printReceiptBtn) printReceiptBtn.disabled = true;
    
    try {
        const formData = new FormData();
        formData.append('amount', currentDepositData.amount);
        formData.append('currency', currentDepositData.currency);
        formData.append('paymentMethod', currentDepositData.paymentMethod);
        formData.append('description', `Deposit via ${currentDepositData.paymentMethod === 'manual' ? 'Manual Transfer' : 'Bank Transfer'}`);
        formData.append('transactionId', currentDepositData.transactionId);
        
        // Add manual notes if provided
        if (currentDepositData.manualNotes) {
            formData.append('userNotes', currentDepositData.manualNotes);
        }
        
        if (currentDepositData.file) {
            formData.append('deposit_proof', currentDepositData.file);
        }
        
        const response = await fetch('/deposit/process', {
            method: 'POST',
            body: formData,
            headers: {
                'X-CSRF-Token': getCSRFToken()
            }
        });
        
        const result = await response.json();
        
        if (result.success) {
            if (statusMessage) {
                statusMessage.innerHTML = '<i class="fas fa-check-circle text-success me-2"></i> Successfully submitted! Pending admin approval.';
            }
            showAlert('Deposit request submitted successfully! It will be processed after admin approval.', 'success');
            console.log('Deposit processed successfully:', result.data);
        } else {
            if (statusMessage) {
                statusMessage.innerHTML = '<i class="fas fa-exclamation-triangle text-warning me-2"></i> Submission failed. Please try again.';
            }
            showAlert(result.message || 'Deposit failed. Please try again.', 'error');
        }
    } catch (error) {
        console.error('Deposit processing error:', error);
        if (statusMessage) {
            statusMessage.innerHTML = '<i class="fas fa-exclamation-triangle text-danger me-2"></i> Network error. Please check connection.';
        }
        showAlert('Network error. Please check your connection and try again.', 'error');
    } finally {
        // Restore button state
        if (depositAgainBtn) depositAgainBtn.disabled = false;
        if (printReceiptBtn) printReceiptBtn.disabled = false;
    }
}
    
    function resetDepositForm() {
        console.log('Resetting deposit form');
        
        const form1 = document.getElementById('depositFormStep1');
        const form2 = document.getElementById('depositFormStep2');
        const bankError = document.getElementById('bankError');
        
        if (form1) form1.reset();
        if (form2) form2.reset();
        if (bankError) bankError.classList.add('d-none');
        
        // Hide all method info
        document.querySelectorAll('.method-info').forEach(el => {
            el.classList.add('d-none');
        });
        
        const currencySelect = document.getElementById('currencySelect');
        if (currencySelect && selectedCurrency) {
            currencySelect.value = selectedCurrency;
        }
        
        currentStep = 1;
        selectedPaymentMethod = '';
        currentDepositData = {};
        showStep(1);
    }
    
    function printReceiptFunction() {
        const finalAmount = document.getElementById('finalAmount');
        const transactionId = document.getElementById('transactionId');
        if (!finalAmount || !transactionId) return;
        
        const receiptContent = `
            <!DOCTYPE html>
            <html>
                <head>
                    <title>QFS Deposit Receipt</title>
                    <style>
                        body { 
                            font-family: Arial, sans-serif; 
                            padding: 30px; 
                            max-width: 500px; 
                            margin: 0 auto; 
                            color: #333; 
                            background: white;
                        }
                        .receipt-header { 
                            text-align: center; 
                            margin-bottom: 30px; 
                            border-bottom: 2px solid #333; 
                            padding-bottom: 20px; 
                        }
                        .receipt-details { 
                            margin: 25px 0; 
                        }
                        .detail-row { 
                            display: flex; 
                            justify-content: space-between; 
                            margin: 12px 0; 
                            padding: 8px 0; 
                            border-bottom: 1px solid #eee; 
                        }
                        .thank-you { 
                            text-align: center; 
                            margin-top: 40px; 
                            font-style: italic; 
                            color: #666; 
                        }
                        .amount-highlight { 
                            font-size: 24px; 
                            font-weight: bold; 
                            color: #283ba7ff; 
                            text-align: center; 
                            margin: 20px 0; 
                            padding: 15px;
                            background: #f8f9fa;
                            border-radius: 8px;
                        }
                        .status-pending {
                            color: #ffc107;
                            font-weight: bold;
                        }
                        .instructions {
                            background: #f8f9fa;
                            padding: 15px;
                            border-radius: 8px;
                            margin: 15px 0;
                            font-size: 14px;
                        }
                        @media print { 
                            body { 
                                padding: 20px; 
                            }
                            .no-print {
                                display: none !important;
                            }
                        }
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
                            <span>${transactionId.textContent}</span>
                        </div>
                        <div class="detail-row">
                            <strong>Status:</strong>
                            <span class="status-pending">Pending Approval</span>
                        </div>
                        <div class="detail-row">
                            <strong>Payment Method:</strong>
                            <span>${currentDepositData.paymentMethod === 'manual' ? 'Manual Transfer' : 'Bank Transfer'}</span>
                        </div>
                        <div class="amount-highlight">${finalAmount.textContent}</div>
                    </div>
                    <div class="instructions">
                        <p><strong>Next Steps:</strong></p>
                        <p>1. Your deposit is pending admin approval</p>
                        <p>2. You will be notified once processed</p>
                        <p>3. Processing time: 1-2 hours</p>
                        <p>4. Keep this receipt for your records</p>
                    </div>
                    <div class="thank-you">
                        <p>Thank you for choosing QFS!</p>
                    </div>
                    <div class="no-print" style="text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee;">
                        <button onclick="window.print()" style="padding: 10px 20px; background: #007bff; color: white; border: none; border-radius: 5px; cursor: pointer;">
                            Print Receipt
                        </button>
                        <button onclick="window.close()" style="padding: 10px 20px; background: #6c757d; color: white; border: none; border-radius: 5px; cursor: pointer; margin-left: 10px;">
                            Close
                        </button>
                    </div>
                </body>
            </html>
        `;
        
        const printWindow = window.open('', '_blank', 'width=600,height=700');
        if (printWindow) {
            printWindow.document.write(receiptContent);
            printWindow.document.close();
            
            setTimeout(() => {
                printWindow.print();
            }, 500);
        }
    }
    
    function showAlert(message, type = 'info') {
        if (typeof Swal !== 'undefined') {
            Swal.fire({
                icon: type,
                title: type === 'error' ? 'Error' : type === 'success' ? 'Success' : 'Info',
                text: message,
                timer: type === 'success' ? 3000 : 5000,
                showConfirmButton: type !== 'success'
            });
        } else {
            alert(`${type.toUpperCase()}: ${message}`);
        }
    }
    
    function getCSRFToken() {
        return document.querySelector('input[name="_token"]')?.value || 
               document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') || 
               '';
    }
    
    console.log('Deposit modal initialized successfully');
}