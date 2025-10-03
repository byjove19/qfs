// dashboard-functions.js - CSP Compliant
document.addEventListener('DOMContentLoaded', function() {
    console.log('Dashboard functions loaded');

    // ===== DARK MODE TOGGLE =====
    const themeSwitch = document.getElementById('themeSwitch');
    if (themeSwitch) {
        // Load saved theme
        const savedTheme = localStorage.getItem('theme');
        if (savedTheme === 'dark') {
            enableDarkMode();
        }

        // Theme switch event
        themeSwitch.addEventListener('change', function() {
            if (this.checked) {
                enableDarkMode();
            } else {
                disableDarkMode();
            }
        });
    }

    function enableDarkMode() {
        document.body.classList.add('dark-mode');
        localStorage.setItem('theme', 'dark');
    }

    function disableDarkMode() {
        document.body.classList.remove('dark-mode');
        localStorage.setItem('theme', 'light');
    }

    // ===== MOBILE SIDEBAR TOGGLE =====
    const menuBtn = document.getElementById('menu-btn');
    const sidebar = document.getElementById('sidebar');
    
    if (menuBtn && sidebar) {
        menuBtn.addEventListener('click', function(e) {
            e.preventDefault();
            sidebar.classList.toggle('active-nav');
        });
    }

    // ===== PRINT QR CODE =====
    const printQrBtn = document.getElementById('printQrCodeBtn');
    if (printQrBtn) {
        printQrBtn.addEventListener('click', function(e) {
            e.preventDefault();
            window.print();
        });
    }

    // ===== RESPONSIVE BEHAVIOR =====
    function handleResponsive() {
        if (window.innerWidth < 992) {
            sidebar.classList.remove('active-nav');
        } else {
            sidebar.classList.add('active-nav');
        }
    }

    handleResponsive();
    window.addEventListener('resize', handleResponsive);
});

// Add CSS via JavaScript (CSP compliant)
function addDarkModeStyles() {
    const style = document.createElement('style');
    style.textContent = `
        .dark-mode {
            background-color: #0f1117 !important;
            color: #e2e8f0 !important;
        }
        
        .dark-mode .bg-white {
            background-color: #1a1d29 !important;
            border-color: #2d3748 !important;
        }
        
        .dark-mode .text-dark {
            color: #e2e8f0 !important;
        }
        
        .dark-mode .top-navbar {
            background-color: #1a1d29 !important;
            border-bottom-color: #2d3748 !important;
        }
        
        .dark-mode .border-bottom,
        .dark-mode .border-top {
            border-color: #2d3748 !important;
        }
        
        /* Mobile Sidebar */
        @media (max-width: 991.98px) {
            #sidebar {
                transform: translateX(-100%);
                transition: transform 0.3s ease;
                z-index: 1050;
            }
            
            #sidebar.active-nav {
                transform: translateX(0);
            }
        }
        
        /* Layout improvements */
        .container-fluid {
            max-width: 1400px;
            margin: 0 auto;
            padding-left: 1rem;
            padding-right: 1rem;
        }
        
        .dasboard-wallet-card {
            justify-content: center;
            gap: 1rem;
        }
        
        .dash-wallet-box {
            margin: 0.5rem;
        }
    `;
    document.head.appendChild(style);
}

// Initialize styles
addDarkModeStyles();