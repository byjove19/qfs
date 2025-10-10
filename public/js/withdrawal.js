document.addEventListener('DOMContentLoaded', function() {
    initializeWithdrawalSystem();
});

function initializeWithdrawalSystem() {
    const methodSelect = document.getElementById('withdrawal_method');
    const amountInput = document.getElementById('amount');
    const currencySelect = document.getElementById('currency');
    const form = document.getElementById('withdrawalFormStep1');

    console.log('Initializing withdrawal system...');

    // Add event listeners
    if (methodSelect) {
        methodSelect.addEventListener('change', handleMethodChange);
        console.log('Method select event listener added');
    }
    
    if (amountInput) amountInput.addEventListener('input', updateFeeCalculation);
    if (currencySelect) currencySelect.addEventListener('change', updateBalanceDisplay);
    if (form) form.addEventListener('submit', handleFormSubmit);

    // Initialize step navigation
    document.getElementById('backToStep1')?.addEventListener('click', showStep1);
    document.getElementById('confirmWithdrawal')?.addEventListener('click', submitWithdrawal);
    document.getElementById('closeModal')?.addEventListener('click', closeModal);

    // Initialize display - use setTimeout to ensure DOM is ready
    setTimeout(() => {
        console.log('Running initial display setup');
        handleMethodChange(); // Call this once to set initial state
        updateBalanceDisplay();
        updateFeeCalculation();
    }, 100);
}

function handleMethodChange() {
    const methodSelect = document.getElementById('withdrawal_method');
    const method = methodSelect?.value || '';
    
    console.log('Method changed to:', method);
    
    // Hide all method details
    const methodDetails = document.querySelectorAll('.method-details');
    methodDetails.forEach(detail => {
        detail.style.display = 'none';
        // Remove required attributes when hidden
        const inputs = detail.querySelectorAll('input, select');
        inputs.forEach(input => {
            input.required = false;
            input.disabled = true;
        });
    });
    
    // Show the relevant method details based on selection
    let targetElement = null;
    
    if (method === 'bank') {
        targetElement = document.getElementById('bankDetails');
        console.log('Showing bank details');
    } 
    else if (method === 'crypto') {
        targetElement = document.getElementById('cryptoDetails');
        console.log('Showing crypto details');
    } 
    else if (['paypal', 'skrill', 'neteller'].includes(method)) {
        targetElement = document.getElementById('ewalletDetails');
        console.log('Showing ewallet details for:', method);
    }
    
    if (targetElement) {
        targetElement.style.display = 'block';
        // Add required attributes and enable inputs
        const inputs = targetElement.querySelectorAll('input, select');
        inputs.forEach(input => {
            input.required = true;
            input.disabled = false;
        });
    } else {
        console.log('No method selected or method details not found');
    }
    
    updateFeeCalculation();
}

// Rest of your existing functions remain the same...
function updateBalanceDisplay() {
    const currencySelect = document.getElementById('currency');
    const currency = currencySelect?.value || '';
    
    // Hide all balance displays
    document.querySelectorAll('[class*="balance-"]').forEach(el => {
        el.style.display = 'none';
    });
    
    // Show balance for selected currency
    const balanceElement = document.querySelector('.balance-' + currency);
    if (balanceElement) {
        balanceElement.style.display = 'inline';
    }
    
    updateFeeCalculation();
}

function updateFeeCalculation() {
    const amountInput = document.getElementById('amount');
    const methodSelect = document.getElementById('withdrawal_method');
    
    const amount = parseFloat(amountInput?.value || 0);
    const method = methodSelect?.value || 'bank';
    
    // Calculate fees based on method
    let feePercentage, fixedFee;
    
    switch(method) {
        case 'crypto':
            feePercentage = 0.005;
            fixedFee = 0;
            break;
        case 'bank':
            feePercentage = 0.025;
            fixedFee = 0.30;
            break;
        case 'paypal':
        case 'skrill':
        case 'neteller':
            feePercentage = 0.03;
            fixedFee = 0.25;
            break;
        default:
            feePercentage = 0.02;
            fixedFee = 0.20;
    }
    
    const fee = (amount * feePercentage) + fixedFee;
    const netAmount = amount - fee;

    // Update fee display
    const pFees = document.querySelector('.pFees');
    const fFees = document.querySelector('.fFees');
    const totalFees = document.querySelector('.total_fees');
    
    if (pFees) pFees.textContent = (feePercentage * 100).toFixed(1);
    if (fFees) fFees.textContent = fixedFee.toFixed(2);
    if (totalFees) totalFees.textContent = fee > 0 ? fee.toFixed(2) : '0.00';

    // Validate amount against balance
    const currencySelect = document.getElementById('currency');
    const currency = currencySelect?.value || '';
    const balanceElement = document.querySelector('.balance-' + currency);
    
    if (balanceElement && amount > 0) {
        const balanceText = balanceElement.textContent.trim();
        const balance = parseFloat(balanceText.replace(/[^\d.-]/g, ''));
        
        if (amount > balance) {
            document.getElementById('amountLimit').textContent = 'Amount exceeds available balance';
            document.getElementById('submitWithdrawal').disabled = true;
        } else if (amount + fee > balance) {
            document.getElementById('amountLimit').textContent = 'Amount + fees exceed available balance';
            document.getElementById('submitWithdrawal').disabled = true;
        } else {
            document.getElementById('amountLimit').textContent = '';
            document.getElementById('submitWithdrawal').disabled = false;
        }
    }
}

function validateForm() {
    const method = document.getElementById('withdrawal_method').value;
    const amount = parseFloat(document.getElementById('amount').value);
    const currency = document.getElementById('currency').value;
    
    if (!amount || amount <= 0) {
        alert('Please enter a valid amount');
        return false;
    }
    
    if (!method) {
        alert('Please select a withdrawal method');
        return false;
    }
    
    if (!currency) {
        alert('Please select a currency');
        return false;
    }
    
    // Method-specific validation
    if (method === 'bank') {
        const bankName = document.getElementById('bank_name').value;
        const accountNumber = document.getElementById('account_number').value;
        const accountHolder = document.getElementById('account_holder').value;
        
        if (!bankName || !accountNumber || !accountHolder) {
            alert('Please fill in all bank details');
            return false;
        }
    } 
    else if (method === 'crypto') {
        const walletAddress = document.getElementById('wallet_address').value;
        const networkType = document.getElementById('network_type').value;
        
        if (!walletAddress) {
            alert('Please enter your wallet address');
            return false;
        }
        if (!networkType) {
            alert('Please select a network type');
            return false;
        }
    } 
    else if (['paypal', 'skrill', 'neteller'].includes(method)) {
        const email = document.getElementById('ewallet_email').value;
        if (!email) {
            alert('Please enter your e-wallet email');
            return false;
        }
    }
    
    return true;
}

function handleFormSubmit(event) {
    event.preventDefault();
    
    if (!validateForm()) {
        return;
    }
    
    showStep2();
}

function showStep2() {
    document.getElementById('confirmMethod').textContent = getMethodDisplayName(document.getElementById('withdrawal_method').value);
    const amount = parseFloat(document.getElementById('amount').value);
    const fee = parseFloat(document.querySelector('.total_fees').textContent || 0);
    const netAmount = amount - fee;
    
    document.getElementById('confirmAmount').textContent = amount.toFixed(2) + ' ' + document.getElementById('currency').value;
    document.getElementById('confirmFee').textContent = fee.toFixed(2) + ' ' + document.getElementById('currency').value;
    document.getElementById('confirmNetAmount').textContent = netAmount.toFixed(2) + ' ' + document.getElementById('currency').value;
    
    // Populate method-specific details
    const method = document.getElementById('withdrawal_method').value;
    let methodHtml = '';
    
    if (method === 'bank') {
        methodHtml = `
            <div class="row">
                <div class="col-12">
                    <strong>Bank Details:</strong>
                    <p class="mb-0">Bank: ${document.getElementById('bank_name').value}</p>
                    <p class="mb-0">Account: ****${document.getElementById('account_number').value.slice(-4)}</p>
                    <p class="mb-0">Holder: ${document.getElementById('account_holder').value}</p>
                </div>
            </div>
        `;
    } else if (method === 'crypto') {
        methodHtml = `
            <div class="row">
                <div class="col-12">
                    <strong>Crypto Details:</strong>
                    <p class="mb-0">Address: ${document.getElementById('wallet_address').value.substring(0, 16)}...${document.getElementById('wallet_address').value.substring(-8)}</p>
                    <p class="mb-0">Network: ${document.getElementById('network_type').value}</p>
                </div>
            </div>
        `;
    } else if (['paypal', 'skrill', 'neteller'].includes(method)) {
        methodHtml = `
            <div class="row">
                <div class="col-12">
                    <strong>E-Wallet Details:</strong>
                    <p class="mb-0">Email: ${document.getElementById('ewallet_email').value}</p>
                </div>
            </div>
        `;
    }
    
    document.getElementById('methodSpecificConfirm').innerHTML = methodHtml;
    
    // Handle notes
    const notes = document.getElementById('notes').value;
    if (notes) {
        document.getElementById('confirmNotes').textContent = notes;
        document.getElementById('confirmNotesRow').style.display = 'block';
    } else {
        document.getElementById('confirmNotesRow').style.display = 'none';
    }
    
    // Show step 2
    document.getElementById('withdrawalFormStep1').style.display = 'none';
    document.getElementById('withdrawalStep2').style.display = 'block';
    document.getElementById('withdrawalStep3').style.display = 'none';
}

function showStep1() {
    document.getElementById('withdrawalFormStep1').style.display = 'block';
    document.getElementById('withdrawalStep2').style.display = 'none';
    document.getElementById('withdrawalStep3').style.display = 'none';
}

function submitWithdrawal() {
    const submitBtn = document.getElementById('confirmWithdrawal');
    const originalText = submitBtn.innerHTML;
    
    // Show loading state
    submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin me-2"></i> Processing...';
    submitBtn.disabled = true;
    
    // Simulate API call
    setTimeout(() => {
        // Generate mock receipt data
        const receiptId = 'WTX' + Date.now().toString().slice(-8);
        const now = new Date();
        
        document.getElementById('receiptId').textContent = receiptId;
        document.getElementById('receiptMethod').textContent = getMethodDisplayName(document.getElementById('withdrawal_method').value);
        document.getElementById('receiptAmount').textContent = document.getElementById('confirmAmount').textContent;
        document.getElementById('receiptDate').textContent = now.toLocaleString();
        
        // Show success step
        document.getElementById('withdrawalFormStep1').style.display = 'none';
        document.getElementById('withdrawalStep2').style.display = 'none';
        document.getElementById('withdrawalStep3').style.display = 'block';
        
        // Reset button
        submitBtn.innerHTML = originalText;
        submitBtn.disabled = false;
    }, 1500);
}

function closeModal() {
    // Reset form for next use
    document.getElementById('withdrawalFormStep1').reset();
    document.getElementById('withdrawalFormStep1').style.display = 'block';
    document.getElementById('withdrawalStep2').style.display = 'none';
    document.getElementById('withdrawalStep3').style.display = 'none';
    handleMethodChange();
    updateBalanceDisplay();
    updateFeeCalculation();
}

function getMethodDisplayName(method) {
    const methodNames = {
        'bank': 'Bank Transfer',
        'paypal': 'PayPal',
        'crypto': 'Crypto Wallet',
        'skrill': 'Skrill',
        'neteller': 'Neteller'
    };
    return methodNames[method] || method;
}