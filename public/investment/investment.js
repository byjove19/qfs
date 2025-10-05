document.addEventListener('DOMContentLoaded', function() {
  const planSelect = document.getElementById('plan');
  const amountInput = document.getElementById('amount');
  const amountError = document.getElementById('amountError');
  const planDetails = document.getElementById('planDetails');
  
  let currentPlan = null;

  // Plan selection handler
  planSelect.addEventListener('change', function() {
    const selectedOption = this.options[this.selectedIndex];
    
    if (selectedOption.value && selectedOption.value !== '') {
      currentPlan = {
        name: selectedOption.value,
        min: parseFloat(selectedOption.dataset.min),
        max: parseFloat(selectedOption.dataset.max),
        profit: parseFloat(selectedOption.dataset.profit),
        duration: parseInt(selectedOption.dataset.duration)
      };
      
      // Show plan details
      document.getElementById('detailPlanName').textContent = currentPlan.name;
      document.getElementById('detailRange').textContent = `${currentPlan.min} - ${currentPlan.max}`;
      document.getElementById('detailProfit').textContent = currentPlan.profit;
      document.getElementById('detailDuration').textContent = currentPlan.duration;
      planDetails.style.display = 'block';
      
      // Validate current amount if entered
      if (amountInput.value) {
        validateAmount();
      }
    } else {
      currentPlan = null;
      planDetails.style.display = 'none';
    }
  });

  // Amount validation
  function validateAmount() {
    if (!currentPlan || !amountInput.value) {
      amountError.style.display = 'none';
      return true;
    }
    
    const amount = parseFloat(amountInput.value);
    
    if (isNaN(amount) || amount <= 0) {
      amountError.textContent = 'Please enter a valid amount';
      amountError.style.display = 'block';
      return false;
    }
    
    if (amount < currentPlan.min) {
      amountError.textContent = `Minimum amount is ${currentPlan.min}`;
      amountError.style.display = 'block';
      return false;
    }
    
    if (amount > currentPlan.max) {
      amountError.textContent = `Maximum amount is ${currentPlan.max}`;
      amountError.style.display = 'block';
      return false;
    }
    
    amountError.style.display = 'none';
    return true;
  }

  amountInput.addEventListener('input', validateAmount);
  amountInput.addEventListener('blur', validateAmount);

  // Form submission
  document.getElementById('investmentForm').addEventListener('submit', function(e) {
    const planValue = planSelect.value;
    const amountValue = amountInput.value;
    
    // Check if plan is selected
    if (!planValue || planValue === '') {
      e.preventDefault();
      alert('Please select an investment plan');
      planSelect.focus();
      return false;
    }
    
    // Check if amount is entered
    if (!amountValue || amountValue === '') {
      e.preventDefault();
      alert('Please enter an amount');
      amountInput.focus();
      return false;
    }
    
    // Validate amount range
    if (!validateAmount()) {
      e.preventDefault();
      amountInput.focus();
      return false;
    }
    
    // All validations passed
    return true;
  });
});