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
    
    let depositModal = null;
    let currentStep = 1;
    let selectedCurrency = '';
    
    // Initialize modal
    try {
        depositModal = new bootstrap.Modal(depositModalElement, {
            backdrop: true,
            keyboard: true,
            focus: true
        });
        console.log('Modal initialized successfully');
    } catch (error) {
        console.error('Modal initialization error:', error);
        return;
    }

    // FIX: Proper modal event listeners for cleanup
    depositModalElement.addEventListener('hidden.bs.modal', function () {
        console.log('Modal hidden - cleaning up');
        cleanupModal();
    });

    depositModalElement.addEventListener('show.bs.modal', function () {
        console.log('Modal showing - resetting form');
        resetDepositForm();
    });

    // Update all deposit buttons to open the modal with correct currency
    document.querySelectorAll('.deposit-modal-trigger').forEach(button => {
        button.addEventListener('click', function(e) {
            e.preventDefault();
            selectedCurrency = this.getAttribute('data-currency') || 'USD';
            console.log('Opening modal for currency:', selectedCurrency);
            
            // Set the currency in the select
            const currencySelect = document.getElementById('currencySelect');
            if (currencySelect) {
                currencySelect.value = selectedCurrency;
            }
            
            if (depositModal) {
                depositModal.show();
            }
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
            if (validateStep1()) {
                showStep(2);
                updateConfirmationDetails();
            }
        });
    }
    
    if (backToStep1) {
        backToStep1.addEventListener('click', function(e) {
            e.preventDefault();
            showStep(1);
        });
    }
    
    if (confirmDeposit) {
        confirmDeposit.addEventListener('click', function(e) {
            e.preventDefault();
            if (validateStep2()) {
                processDeposit();
            }
        });
    }
    
    if (depositAgain) {
        depositAgain.addEventListener('click', function(e) {
            e.preventDefault();
            resetDepositForm();
            showStep(1);
        });
    }
    
    if (printReceipt) {
        printReceipt.addEventListener('click', function(e) {
            e.preventDefault();
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
    }
    
    // Amount change handler
    const depositAmount = document.getElementById('depositAmount');
    if (depositAmount) {
        depositAmount.addEventListener('input', updateConfirmationDetails);
    }

    // FIX: Add manual close button handler
    const closeButtons = depositModalElement.querySelectorAll('[data-bs-dismiss="modal"]');
    closeButtons.forEach(button => {
        button.addEventListener('click', function(e) {
            e.preventDefault();
            if (depositModal) {
                depositModal.hide();
            }
        });
    });

    function cleanupModal() {
        console.log('Cleaning up modal state');
        // Reset to step 1
        showStep(1);
        
        // Clear any form data
        const forms = depositModalElement.querySelectorAll('form');
        forms.forEach(form => {
            form.reset();
        });
        
        // Hide any error messages
        const bankError = document.getElementById('bankError');
        if (bankError) bankError.classList.add('d-none');
        
        // Remove any backdrop manually (safety check)
        const existingBackdrops = document.querySelectorAll('.modal-backdrop');
        existingBackdrops.forEach(backdrop => {
            backdrop.remove();
        });
        
        // Remove any modal-open classes
        document.body.classList.remove('modal-open');
        document.body.style.overflow = '';
        document.body.style.paddingRight = '';
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
        const fee = 0;
        const total = amount + fee;
        
        const confirmAmount = document.getElementById('confirmAmount');
        const confirmFee = document.getElementById('confirmFee');
        const confirmTotal = document.getElementById('confirmTotal');
        
        if (confirmAmount) confirmAmount.textContent = `${currency} ${amount.toFixed(2)}`;
        if (confirmFee) confirmFee.textContent = `${currency} ${fee.toFixed(2)}`;
        if (confirmTotal) confirmTotal.textContent = `${currency} ${total.toFixed(2)}`;
    }
    
    async function processDeposit() {
        const amount = parseFloat(document.getElementById('depositAmount').value) || 0;
        const currency = document.getElementById('currencySelect').value || 'USD';
        const paymentMethod = document.getElementById('paymentMethod').value;
        const fileInput = document.getElementById('depositFile');
        
        // Show loading state
        const confirmBtn = document.getElementById('confirmDeposit');
        const originalText = confirmBtn.innerHTML;
        confirmBtn.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span> Processing...';
        confirmBtn.disabled = true;
        
        try {
            const formData = new FormData();
            formData.append('amount', amount);
            formData.append('currency', currency);
            formData.append('paymentMethod', paymentMethod);
            formData.append('description', `Deposit via ${paymentMethod}`);
            
            if (fileInput && fileInput.files.length > 0) {
                formData.append('deposit_proof', fileInput.files[0]);
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
                // Update final amount display
                const finalAmount = document.getElementById('finalAmount');
                if (finalAmount) {
                    finalAmount.textContent = `${currency} ${amount.toFixed(2)}`;
                }
                
                showStep(3);
                showAlert('Deposit request submitted successfully! It will be processed after admin approval.', 'success');
                console.log('Deposit processed successfully:', result.data);
            } else {
                showAlert(result.message || 'Deposit failed. Please try again.', 'error');
            }
        } catch (error) {
            console.error('Deposit processing error:', error);
            showAlert('Network error. Please check your connection and try again.', 'error');
        } finally {
            // Restore button state
            confirmBtn.innerHTML = originalText;
            confirmBtn.disabled = false;
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
        
        // Reset to step 1
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
                            color: #28a745; 
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
                            <span>${'TXN' + Date.now()}</span>
                        </div>
                        <div class="detail-row">
                            <strong>Status:</strong>
                            <span class="status-pending">Pending Approval</span>
                        </div>
                        <div class="detail-row">
                            <strong>Payment Method:</strong>
                            <span>Manual Transfer</span>
                        </div>
                        <div class="amount-highlight">${finalAmount.textContent}</div>
                    </div>
                    <div class="thank-you">
                        <p>Your deposit request has been submitted and is pending admin approval.</p>
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
            
            // Auto-print after a short delay
            setTimeout(() => {
                printWindow.print();
            }, 500);
        }
    }
    
    function showAlert(message, type = 'info') {
        // Use SweetAlert if available, otherwise fallback to basic alert
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