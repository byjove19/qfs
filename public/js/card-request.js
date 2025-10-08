// Card Request Modal Handler
document.addEventListener('DOMContentLoaded', function() {
    const requestCardModal = document.getElementById('requestCardModal');
    if (requestCardModal) {
        // Initialize modal event listeners
        initializeCardRequestModal();
    }
});

function initializeCardRequestModal() {
    let currentStep = 1;
    let cardRequestData = {};
    
    // Step navigation
    document.getElementById('nextToCardStep2')?.addEventListener('click', function() {
        if (validateStep1()) {
            showStep(2);
        }
    });
    
    document.getElementById('backToCardStep1')?.addEventListener('click', function() {
        showStep(1);
    });
    
    document.getElementById('confirmCardRequest')?.addEventListener('click', function() {
        if (validateStep2()) {
            submitCardRequest();
        }
    });
    
    // Form validation
    function validateStep1() {
        const cardType = document.getElementById('cardType').value;
        const currency = document.getElementById('cardCurrency').value;
        const amount = document.getElementById('cardAmount').value;
        
        if (!cardType || !currency || !amount || parseFloat(amount) < 10) {
            alert('Please fill all fields correctly. Minimum amount is $10.');
            return false;
        }
        
        // Store data for next steps
        cardRequestData = {
            cardType: cardType,
            currency: currency,
            amount: parseFloat(amount)
        };
        
        updateConfirmationStep();
        return true;
    }
    
    function validateStep2() {
        const termsAgreed = document.getElementById('termsAgreement').checked;
        if (!termsAgreed) {
            alert('Please agree to the terms and conditions');
            return false;
        }
        return true;
    }
    
    function updateConfirmationStep() {
        document.getElementById('confirmCardType').textContent = 
            document.getElementById('cardType').options[document.getElementById('cardType').selectedIndex].text;
        document.getElementById('confirmCurrency').textContent = cardRequestData.currency;
        document.getElementById('confirmAmount').textContent = cardRequestData.amount.toFixed(2);
        document.getElementById('confirmTotal').textContent = (cardRequestData.amount + 10).toFixed(2) + ' ' + cardRequestData.currency;
    }
    
    function showStep(step) {
        // Hide all steps
        document.querySelectorAll('.card-step').forEach(el => el.classList.add('d-none'));
        document.querySelectorAll('[id$="Buttons"]').forEach(el => el.classList.add('d-none'));
        
        // Show current step
        document.getElementById(`cardStep${step}`).classList.remove('d-none');
        document.getElementById(`cardStep${step}Buttons`).classList.remove('d-none');
        
        currentStep = step;
    }
    
    async function submitCardRequest() {
        try {
            const response = await fetch('/transactions/request-card', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(cardRequestData)
            });
            
            const result = await response.json();
            
            if (result.success) {
                // Update success step
                document.getElementById('successCardType').textContent = 
                    document.getElementById('cardType').options[document.getElementById('cardType').selectedIndex].text;
                document.getElementById('successAmount').textContent = 
                    cardRequestData.amount.toFixed(2) + ' ' + cardRequestData.currency;
                document.getElementById('transactionId').textContent = result.data.requestId;
                
                showStep(3);
            } else {
                alert('Error: ' + result.message);
            }
        } catch (error) {
            console.error('Card request error:', error);
            alert('Failed to submit card request. Please try again.');
        }
    }
    
    // Reset modal when closed
    requestCardModal.addEventListener('hidden.bs.modal', function() {
        currentStep = 1;
        cardRequestData = {};
        showStep(1);
        document.getElementById('cardFormStep1').reset();
        document.getElementById('termsAgreement').checked = false;
    });
}