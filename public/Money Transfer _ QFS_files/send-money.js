// In the searchRecipients function, update the AJAX call:
function searchRecipients(searchTerm) {
    // Get CSRF token from meta tag or form input
    const csrfToken = document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') || 
                     document.querySelector('input[name="_token"]')?.value;

    $.ajax({
        url: '/api/recipients/search',
        method: 'POST',
        data: {
            search: searchTerm,
            _token: csrfToken
        },
        success: function(response) {
            if (response.success) {
                displayRecipientResults(response.recipients);
            } else {
                showAlert('Error searching recipients: ' + response.message, 'error');
            }
        },
        error: function(xhr, status, error) {
            console.error('Search error:', error);
            showAlert('Error searching recipients', 'error');
        }
    });
}