// Place this script at the END of your tickets page, just before </body>
// Make sure jQuery is loaded BEFORE this script

$(document).ready(function() {
    console.log('✅ Ticket submission script initialized');
    
    // Wire up the submit button
    $('#submitTicketBtn').off('click').on('click', function(e) {
        e.preventDefault();
        e.stopPropagation();
        console.log('📤 Submit button clicked');
        createTicket();
    });
    
    // Handle form submission
    $('#ticketForm').off('submit').on('submit', function(e) {
        e.preventDefault();
        e.stopPropagation();
        console.log('📤 Form submitted');
        createTicket();
    });
    
    // Main ticket creation function
    function createTicket() {
        const submitBtn = $('#submitTicketBtn');
        const originalText = submitBtn.html();
        
        console.log('🎫 Creating ticket...');
        
        // Show loading state
        submitBtn.html('<span class="spinner-border spinner-border-sm me-2"></span>Submitting...');
        submitBtn.prop('disabled', true);

        // Get form data
        const formData = {
            subject: $('#ticketSubject').val().trim(),
            priority: $('#ticketPriority').val(),
            category: $('#ticketCategory').val(),
            message: $('#ticketMessage').val().trim()
        };

        console.log('📝 Form data:', formData);

        // Validate form
        if (!formData.subject) {
            showError('Please enter a subject');
            resetButton(submitBtn, originalText);
            return;
        }
        
        if (!formData.priority) {
            showError('Please select a priority');
            resetButton(submitBtn, originalText);
            return;
        }
        
        if (!formData.category) {
            showError('Please select a category');
            resetButton(submitBtn, originalText);
            return;
        }
        
        if (!formData.message) {
            showError('Please enter a message');
            resetButton(submitBtn, originalText);
            return;
        }

        // Get CSRF token
        const csrfToken = $('meta[name="csrf-token"]').attr('content') || 
                         $('input[name="_csrf"]').val() || 
                         $('input[name="_token"]').val();

        console.log('🔒 CSRF Token:', csrfToken ? 'Found' : 'Not found');

        // Send AJAX request
        $.ajax({
            url: '/api/tickets/create',
            method: 'POST',
            contentType: 'application/json',
            data: JSON.stringify(formData),
            headers: csrfToken ? { 'X-CSRF-TOKEN': csrfToken } : {},
            timeout: 30000, // 30 second timeout
            success: function(response) {
                console.log('✅ Success response:', response);
                
                if (response.success) {
                    // Close create modal
                    $('#createTicketModal').modal('hide');
                    
                    // Show success modal
                    const ticketNumber = response.ticketNumber || 'N/A';
                    $('#successMessage').text('Ticket #' + ticketNumber + ' created successfully! Our support team will review it shortly.');
                    $('#successModal').modal('show');
                    
                    // Reset form
                    $('#ticketForm')[0].reset();
                    
                    // Reload page after modal closes
                    $('#successModal').off('hidden.bs.modal').on('hidden.bs.modal', function() {
                        console.log('🔄 Reloading page...');
                        window.location.reload();
                    });
                } else {
                    showError(response.message || 'Failed to create ticket');
                }
            },
            error: function(xhr, status, error) {
                console.error('❌ Error creating ticket:', {
                    status: xhr.status,
                    statusText: xhr.statusText,
                    responseText: xhr.responseText ? xhr.responseText.substring(0, 200) : 'No response',
                    error: error
                });
                
                let errorMessage = 'Failed to create ticket. Please try again.';
                
                // Check for specific error codes
                if (xhr.status === 404) {
                    errorMessage = 'Ticket creation endpoint not found. Please contact support.';
                    console.error('⚠️ 404 Error: The route /api/tickets/create is not registered!');
                } else if (xhr.status === 401) {
                    errorMessage = 'Session expired. Please login again.';
                    setTimeout(function() {
                        window.location.href = '/auth/login';
                    }, 2000);
                } else if (xhr.status === 500) {
                    errorMessage = 'Server error. Please try again later.';
                } else if (xhr.responseJSON && xhr.responseJSON.message) {
                    errorMessage = xhr.responseJSON.message;
                }
                
                showError(errorMessage);
            },
            complete: function() {
                console.log('✅ Request complete');
                resetButton(submitBtn, originalText);
            }
        });
    }
    
    // Helper function to reset button
    function resetButton(btn, originalText) {
        btn.html(originalText);
        btn.prop('disabled', false);
    }
    
    // Helper function to show errors
    function showError(message) {
        if (typeof Swal !== 'undefined') {
            Swal.fire({
                icon: 'error',
                title: 'Error',
                text: message,
                confirmButtonColor: '#dc3545'
            });
        } else {
            alert('Error: ' + message);
        }
    }
    
    // Handle success modal close
    $('#successModal').off('hidden.bs.modal').on('hidden.bs.modal', function() {
        console.log('🔄 Reloading page from modal close...');
        window.location.reload();
    });
    
    // Add validation on blur
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
    
    console.log('✅ All event handlers attached successfully');
});

// Alternative: Vanilla JavaScript version (if jQuery fails)
document.addEventListener('DOMContentLoaded', function() {
    const submitBtn = document.getElementById('submitTicketBtn');
    const ticketForm = document.getElementById('ticketForm');
    
    if (!submitBtn || !ticketForm) {
        console.warn('⚠️ Ticket form elements not found');
        return;
    }
    
    console.log('✅ Vanilla JS ticket handler attached');
    
    submitBtn.addEventListener('click', function(e) {
        e.preventDefault();
        submitTicketVanilla();
    });
    
    ticketForm.addEventListener('submit', function(e) {
        e.preventDefault();
        submitTicketVanilla();
    });
    
    function submitTicketVanilla() {
        console.log('🎫 Submitting ticket (Vanilla JS)...');
        
        const originalText = submitBtn.innerHTML;
        submitBtn.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span>Submitting...';
        submitBtn.disabled = true;

        const formData = {
            subject: document.getElementById('ticketSubject').value.trim(),
            priority: document.getElementById('ticketPriority').value,
            category: document.getElementById('ticketCategory').value,
            message: document.getElementById('ticketMessage').value.trim()
        };

        // Validate
        if (!formData.subject || !formData.priority || !formData.category || !formData.message) {
            alert('Please fill in all required fields.');
            submitBtn.innerHTML = originalText;
            submitBtn.disabled = false;
            return;
        }

        const csrfToken = document.querySelector('meta[name="csrf-token"]')?.content || '';

        fetch('/api/tickets/create', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-CSRF-TOKEN': csrfToken
            },
            body: JSON.stringify(formData)
        })
        .then(response => {
            console.log('Response status:', response.status);
            if (!response.ok && response.status === 404) {
                throw new Error('Ticket creation endpoint not found (404). Please contact support.');
            }
            return response.json();
        })
        .then(data => {
            console.log('✅ Success:', data);
            
            if (data.success) {
                const createModal = bootstrap.Modal.getInstance(document.getElementById('createTicketModal'));
                if (createModal) createModal.hide();
                
                document.getElementById('successMessage').textContent = 
                    'Ticket #' + (data.ticketNumber || 'N/A') + ' created successfully!';
                
                const successModal = new bootstrap.Modal(document.getElementById('successModal'));
                successModal.show();
                
                document.getElementById('ticketForm').reset();
                
                document.getElementById('successModal').addEventListener('hidden.bs.modal', function() {
                    window.location.reload();
                }, { once: true });
            } else {
                alert('Error: ' + (data.message || 'Failed to create ticket'));
            }
        })
        .catch(error => {
            console.error('❌ Error:', error);
            alert(error.message || 'Failed to create ticket. Please try again.');
        })
        .finally(() => {
            submitBtn.innerHTML = originalText;
            submitBtn.disabled = false;
        });
    }
});

console.log('🎫 Ticket submission script loaded at:', new Date().toISOString());