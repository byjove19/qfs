// public/js/tickets.js - FIXED VERSION
$(document).ready(function() {
  console.log('✅ Tickets page loaded');
  
  let isSubmitting = false;

  // Handle ticket creation
  $('#submitTicketBtn').click(function(e) {
    e.preventDefault();
    
    if (isSubmitting) return;
    isSubmitting = true;
    
    const submitBtn = $(this);
    const originalText = submitBtn.html();
    
    // Show loading
    submitBtn.html('<span class="spinner-border spinner-border-sm me-2"></span> Creating...').prop('disabled', true);

    const formData = {
      subject: $('#ticketSubject').val().trim(),
      priority: $('#ticketPriority').val(),
      category: $('#ticketCategory').val(),
      message: $('#ticketMessage').val().trim()
    };

    // Validate
    if (!formData.subject || !formData.priority || !formData.category || !formData.message) {
      alert('Please fill all fields');
      resetButton();
      return;
    }

    // Submit
    $.ajax({
      url: '/tickets/create-ajax',
      method: 'POST',
      contentType: 'application/json',
      data: JSON.stringify(formData),
      headers: { 
        'X-CSRF-TOKEN': $('meta[name="csrf-token"]').attr('content') 
      },
      success: function(response) {
        console.log('✅ Success:', response);
        if (response.success) {
          $('#createTicketModal').modal('hide');
          $('#ticketForm')[0].reset();
          
          // Show success message
          $('#successMessage').text('Ticket #' + response.ticketNumber + ' created successfully!');
          $('#successModal').modal('show');
          
          // Reload after modal closes
          $('#successModal').off('hidden.bs.modal').on('hidden.bs.modal', function() {
            window.location.reload();
          });
        } else {
          alert('Error: ' + response.message);
        }
      },
      error: function(xhr, status, error) {
        console.error('❌ Error:', error);
        let message = 'Failed to create ticket. Please try again.';
        if (xhr.responseJSON && xhr.responseJSON.message) {
          message = xhr.responseJSON.message;
        }
        alert('Error: ' + message);
      },
      complete: function() {
        resetButton();
      }
    });

    function resetButton() {
      isSubmitting = false;
      submitBtn.html(originalText).prop('disabled', false);
    }
  });

  // Handle filter changes
  $('#ticketStatus').change(function() {
    console.log('🔄 Filter changed to:', $(this).val());
    $('#ticketSearchForm').submit();
  });

  // Add basic validation
  $('#ticketSubject, #ticketMessage').on('blur', function() {
    if ($(this).val().trim() === '') {
      $(this).addClass('is-invalid');
    } else {
      $(this).removeClass('is-invalid');
    }
  });

  $('#ticketPriority, #ticketCategory').on('change', function() {
    if ($(this).val() === '') {
      $(this).addClass('is-invalid');
    } else {
      $(this).removeClass('is-invalid');
    }
  });
});