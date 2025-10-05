    // Modal Functions
        function openModal(modalId) {
            document.getElementById(modalId).classList.add('active');
        }

        function closeModal(modalId) {
            document.getElementById(modalId).classList.remove('active');
        }

        window.onclick = function(event) {
            if (event.target.classList.contains('modal')) {
                event.target.classList.remove('active');
            }
        }

        function openBalanceModal(userId, balance, name) {
            document.getElementById('balanceUserId').value = userId;
            document.getElementById('currentBalance').textContent = '$' + parseFloat(balance || 0).toFixed(2);
            openModal('balanceModal');
        }

        function setTransactionType(type) {
            document.getElementById('balanceType').value = type;
            document.querySelectorAll('.type-btn').forEach(btn => btn.classList.remove('active'));
            event.target.closest('.type-btn').classList.add('active');
        }

        function openCurrencyModal(userId, currency) {
            document.getElementById('currencyUserId').value = userId;
            document.getElementById('userCurrency').textContent = currency || 'USD';
            document.querySelectorAll('.currency-option').forEach(opt => {
                opt.classList.remove('selected');
                if (opt.dataset.currency === currency) opt.classList.add('selected');
            });
            openModal('currencyModal');
        }

        document.querySelectorAll('.currency-option').forEach(option => {
            option.addEventListener('click', function() {
                document.querySelectorAll('.currency-option').forEach(opt => opt.classList.remove('selected'));
                this.classList.add('selected');
                document.getElementById('selectedCurrency').value = this.dataset.currency;
                const rates = { USD: 1.00, EUR: 0.92, GBP: 0.79, CAD: 1.36, AUD: 1.52, JPY: 149.50 };
                document.getElementById('exchangeRate').textContent = rates[this.dataset.currency].toFixed(2);
            });
        });

        function openWalletModal(userId, balance) {
            document.getElementById('walletBalance').textContent = '$' + parseFloat(balance || 0).toFixed(2);
            openModal('walletModal');
        }

        // Theme toggle functionality
        const themeToggle = document.getElementById('themeToggle');
        const themeIcon = document.getElementById('themeIcon');
        
        // Initialize theme
        const currentTheme = localStorage.getItem('theme') || 'dark';
        document.documentElement.setAttribute('data-theme', currentTheme);
        updateThemeIcon(currentTheme);
        
        themeToggle.addEventListener('click', function() {
            const currentTheme = document.documentElement.getAttribute('data-theme');
            const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
            
            document.documentElement.setAttribute('data-theme', newTheme);
            localStorage.setItem('theme', newTheme);
            updateThemeIcon(newTheme);
            
            // Add click animation
            themeToggle.style.transform = 'scale(0.9)';
            setTimeout(() => {
                themeToggle.style.transform = 'scale(1)';
            }, 150);
        });
        
        function updateThemeIcon(theme) {
            if (theme === 'dark') {
                themeIcon.innerHTML = '<path d="M12,18C11.11,18 10.26,17.8 9.5,17.45C11.56,16.5 13,14.42 13,12C13,9.58 11.56,7.5 9.5,6.55C10.26,6.2 11.11,6 12,6A6,6 0 0,1 18,12A6,6 0 0,1 12,18M20,8.69V4H15.31L12,0.69L8.69,4H4V8.69L0.69,12L4,15.31V20H8.69L12,23.31L15.31,20H20V15.31L23.31,12L20,8.69Z" />';
            } else {
                themeIcon.innerHTML = '<path d="M17.75,4.09L15.22,6.03L16.13,9.09L13.5,7.28L10.87,9.09L11.78,6.03L9.25,4.09L12.44,4L13.5,1L14.56,4L17.75,4.09M21.25,11L19.61,12.25L20.2,14.23L18.5,13.06L16.8,14.23L17.39,12.25L15.75,11L17.81,10.95L18.5,9L19.19,10.95L21.25,11M18.97,15.95C19.8,15.87 20.69,17.05 20.16,17.8C19.84,18.25 19.5,18.67 19.08,19.07C15.17,23 8.84,23 4.94,19.07C1.03,15.17 1.03,8.83 4.94,4.93C5.34,4.53 5.76,4.17 6.21,3.85C6.96,3.32 8.14,4.21 8.06,5.04C7.79,7.9 8.75,10.87 10.95,13.06C13.14,15.26 16.1,16.22 18.97,15.95M17.33,17.97C14.5,17.81 11.7,16.64 9.53,14.5C7.36,12.31 6.2,9.5 6.04,6.68C3.23,9.82 3.34,14.64 6.35,17.66C9.37,20.67 14.19,20.78 17.33,17.97Z" />';
            }
        }

        // Sidebar functionality
        const sidebarToggle = document.getElementById('sidebarToggle');
        const sidebarClose = document.getElementById('sidebarClose');
        const adminSidebar = document.getElementById('adminSidebar');
        const adminWrapper = document.querySelector('.admin-wrapper');

        // Desktop sidebar toggle (collapse/expand)
        sidebarToggle.addEventListener('click', function() {
            if (window.innerWidth > 768) {
                adminWrapper.classList.toggle('sidebar-collapsed');
            } else {
                // Mobile sidebar open
                adminSidebar.classList.add('sidebar-open');
            }
        });

        // Mobile sidebar close
        sidebarClose.addEventListener('click', function() {
            adminSidebar.classList.remove('sidebar-open');
        });

        // Close sidebar when clicking outside on mobile
        document.addEventListener('click', function(event) {
            if (window.innerWidth <= 768 && 
                adminSidebar.classList.contains('sidebar-open') &&
                !adminSidebar.contains(event.target) &&
                !sidebarToggle.contains(event.target)) {
                adminSidebar.classList.remove('sidebar-open');
            }
        });

        // Handle window resize
        window.addEventListener('resize', function() {
            if (window.innerWidth > 768) {
                adminSidebar.classList.remove('sidebar-open');
                adminWrapper.classList.remove('sidebar-collapsed');
            }
        });

        // User status toggle function
        function toggleUserStatus(userId, isCurrentlyActive) {
            if (confirm(`Are you sure you want to ${isCurrentlyActive ? 'deactivate' : 'activate'} this user?`)) {
                // This would typically make an API call to update user status
                fetch(`/admin/users/${userId}/status`, {
                    method: 'PUT',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        isActive: !isCurrentlyActive
                    })
                })
                .then(response => response.json())
                .then(data => {
                    if (data.success) {
                        alert(`User ${!isCurrentlyActive ? 'activated' : 'deactivated'} successfully!`);
                        window.location.reload();
                    } else {
                        alert('Error updating user status: ' + data.message);
                    }
                })
                .catch(error => {
                    console.error('Error:', error);
                    alert('Error updating user status. Please try again.');
                });
            }
        }

        // Add loading animation for cards
        document.addEventListener('DOMContentLoaded', function() {
            const cards = document.querySelectorAll('.card, .stat-card, .info-card');
            cards.forEach((card, index) => {
                card.style.opacity = '0';
                card.style.transform = 'translateY(20px)';
                
                setTimeout(() => {
                    card.style.transition = 'all 0.5s ease';
                    card.style.opacity = '1';
                    card.style.transform = 'translateY(0)';
                }, index * 100);
            });
        });