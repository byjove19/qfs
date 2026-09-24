// Logout function
async function logoutUser() {
    try {
        // Show confirmation dialog
        const confirmLogout = confirm('Are you sure you want to log out?');
        if (!confirmLogout) return;

        // Get the auth token
        const token = localStorage.getItem('authToken');
        
        if (!token) {
            // If no token, just clear local storage and redirect
            clearAuthData();
            window.location.href = '/login';
            return;
        }

        // Show loading state if you have a logout button
        const logoutBtn = document.getElementById('logoutBtn');
        if (logoutBtn) {
            logoutBtn.disabled = true;
            logoutBtn.innerHTML = '<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Logging out...';
        }

        // Send logout request to backend
        const response = await fetch('/api/auth/logout', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            }
        });

        // Clear local storage regardless of response
        clearAuthData();

        if (response.ok) {
            // Successfully logged out
            showNotification('Logout successful', 'success');
        } else {
            console.warn('Logout API call failed, but local data cleared');
        }

        // Redirect to login page
        setTimeout(() => {
            window.location.href = '/login';
        }, 1000);

    } catch (error) {
        console.error('Logout error:', error);
        // Still clear local data and redirect even if there's an error
        clearAuthData();
        window.location.href = '/login';
    }
}

// Function to clear all auth data
function clearAuthData() {
    localStorage.removeItem('authToken');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('user');
    sessionStorage.removeItem('authToken');
    
    // Clear any other auth-related data
    const authKeys = Object.keys(localStorage).filter(key => 
        key.includes('auth') || key.includes('token') || key.includes('user')
    );
    authKeys.forEach(key => localStorage.removeItem(key));
}

// Function to show notification
function showNotification(message, type = 'info') {
    // You can use your existing notification system or create a simple one
    const notification = document.createElement('div');
    notification.className = `alert alert-${type} alert-dismissible fade show`;
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        z-index: 9999;
        min-width: 300px;
    `;
    notification.innerHTML = `
        ${message}
        <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
    `;
    
    document.body.appendChild(notification);
    
    // Auto remove after 5 seconds
    setTimeout(() => {
        if (notification.parentNode) {
            notification.parentNode.removeChild(notification);
        }
    }, 5000);
}

// Auto-logout for inactive users (optional)
function setupAutoLogout() {
    let inactivityTime = function () {
        let time;
        window.onload = resetTimer;
        document.onmousemove = resetTimer;
        document.onkeypress = resetTimer;
        
        function logout() {
            // Only auto-logout if user is logged in
            if (localStorage.getItem('authToken')) {
                console.log('Auto-logout due to inactivity');
                logoutUser();
            }
        }
        
        function resetTimer() {
            clearTimeout(time);
            // 30 minutes = 1800000 milliseconds
            time = setTimeout(logout, 1800000);
        }
    };
    
    inactivityTime();
}

// Check authentication status on page load
function checkAuthStatus() {
    const token = localStorage.getItem('authToken');
    const currentPath = window.location.pathname;
    
    // If no token and trying to access protected pages, redirect to login
    if (!token && !['/login', '/signup', '/', '/index'].includes(currentPath)) {
        window.location.href = '/login';
        return;
    }
    
    // If token exists and on login/signup page, redirect to dashboard
    if (token && ['/login', '/signup'].includes(currentPath)) {
        window.location.href = '/dashboard';
        return;
    }
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    checkAuthStatus();
    setupAutoLogout();
    
    // Add logout event listener to logout buttons
    const logoutButtons = document.querySelectorAll('[data-logout]');
    logoutButtons.forEach(button => {
        button.addEventListener('click', logoutUser);
    });
});

// Make logout function globally available
window.logoutUser = logoutUser;
window.clearAuthData = clearAuthData;