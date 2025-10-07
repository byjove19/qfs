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

        // Wallet Address Management Functions
        function toggleEdit(currency) {
            const input = document.getElementById(`${currency}-address`);
            const controls = document.getElementById(`${currency}-controls`);
            
            if (input.readOnly) {
                input.readOnly = false;
                input.focus();
                controls.style.display = 'block';
            } else {
                input.readOnly = true;
                controls.style.display = 'none';
            }
        }

        function cancelEdit(currency) {
            const input = document.getElementById(`${currency}-address`);
            const controls = document.getElementById(`${currency}-controls`);
            
            // Reset to original value (in a real app, you'd fetch from server)
            input.value = input.defaultValue;
            input.readOnly = true;
            controls.style.display = 'none';
        }

        function saveAddress(currency) {
            const input = document.getElementById(`${currency}-address`);
            const controls = document.getElementById(`${currency}-controls`);
            const newAddress = input.value.trim();
            
            if (!newAddress) {
                showError('Please enter a valid wallet address');
                return;
            }
            
            // In a real application, you would send this to your server
            // For now, we'll just simulate the save
            showSuccess('Wallet address updated successfully!');
            
            input.defaultValue = newAddress;
            input.readOnly = true;
            controls.style.display = 'none';
            
            // Simulate API call
            simulateAPICall('save', currency, newAddress);
        }

        function publishToFrontend() {
            // Collect all wallet addresses
            const wallets = {
                btc: document.getElementById('btc-address').value,
                eth: document.getElementById('eth-address').value,
                usdtErc20: document.getElementById('usdt-erc20-address').value,
                xrp: document.getElementById('xrp-address').value,
                ltc: document.getElementById('ltc-address').value
            };
            
            // In a real application, you would send this to your server
            // For now, we'll just simulate the API call
            showSuccess('Wallet addresses published to frontend successfully!');
            
            // Simulate API call
            simulateAPICall('publish', wallets);
        }

        function simulateAPICall(action, data, address = null) {
            // This would be replaced with actual API calls in a real application
            console.log(`API Call: ${action}`, data, address);
            
            // Simulate API delay
            setTimeout(() => {
                console.log(`API Response: ${action} successful`);
            }, 1000);
        }

        function showSuccess(message) {
            const successAlert = document.getElementById('successAlert');
            const successMessage = document.getElementById('successMessage');
            
            successMessage.textContent = message;
            successAlert.style.display = 'block';
            
            // Hide after 5 seconds
            setTimeout(() => {
                successAlert.style.display = 'none';
            }, 5000);
        }

        function showError(message) {
            const errorAlert = document.getElementById('errorAlert');
            const errorMessage = document.getElementById('errorMessage');
            
            errorMessage.textContent = message;
            errorAlert.style.display = 'block';
            
            // Hide after 5 seconds
            setTimeout(() => {
                errorAlert.style.display = 'none';
            }, 5000);
        }

        async function copyToClipboard(elementId) {
            try {
                const element = document.getElementById(elementId);
                await navigator.clipboard.writeText(element.value);
                showSuccess('Address copied to clipboard!');
            } catch (err) {
                console.error('Failed to copy text: ', err);
                showError('Failed to copy address to clipboard. Please try again.');
            }
        }

        function showQRCode(currency, elementId) {
            const address = document.getElementById(elementId).value;
            const qrModal = document.getElementById('qrModal');
            const qrImage = document.getElementById('qrImage');
            const qrAddress = document.getElementById('qrAddress');
            const qrModalTitle = document.getElementById('qrModalTitle');
            
            qrModalTitle.textContent = `${currency} QR Code`;
            qrAddress.textContent = address;
            qrImage.src = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(address)}`;
            qrModal.style.display = 'flex';
        }

        function copyQRAddress() {
            const qrAddress = document.getElementById('qrAddress');
            copyToClipboardFromElement(qrAddress);
        }

        async function copyToClipboardFromElement(element) {
            try {
                await navigator.clipboard.writeText(element.textContent);
                showSuccess('Address copied to clipboard!');
            } catch (err) {
                console.error('Failed to copy text: ', err);
                showError('Failed to copy address to clipboard. Please try again.');
            }
        }

        // Close QR modal
        document.getElementById('qrModalClose').addEventListener('click', function() {
            document.getElementById('qrModal').style.display = 'none';
        });

        // Close modal when clicking outside
        document.getElementById('qrModal').addEventListener('click', function(event) {
            if (event.target === this) {
                this.style.display = 'none';
            }
        });

        // Refresh button functionality
        document.getElementById('refreshBtn').addEventListener('click', function() {
            location.reload();
        });

        // Publish button functionality
        document.getElementById('publishBtn').addEventListener('click', function() {
            publishToFrontend();
        });

        // Add loading animation for cards
        document.addEventListener('DOMContentLoaded', function() {
            const cards = document.querySelectorAll('.wallet-card');
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