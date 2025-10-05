class TransactionManager {
    constructor() {
        this.currentPage = 1;
        this.isLoading = false;
        this.hasMore = true;
        this.init();
    }

    init() {
        console.log('TransactionManager initialized');
        setTimeout(() => {
            this.loadTransactions();
            this.setupEventListeners();
        }, 100);
    }

    async loadTransactions(page = 1, append = false) {
        if (this.isLoading) return;
        
        this.isLoading = true;
        this.currentPage = page;

        try {
            console.log('Loading transactions, page:', page);
            
            const container = document.getElementById('transactionsContainer');
            if (!container) return;

            // Show loading indicator
            if (!append) {
                container.innerHTML = `
                    <div class="text-center py-4">
                        <div class="spinner-border text-primary" role="status">
                            <span class="visually-hidden">Loading...</span>
                        </div>
                        <p class="mt-2 text-muted">Loading transactions...</p>
                    </div>
                `;
            }

            const queryParams = new URLSearchParams({
                page: page.toString(),
                limit: '10'
            });

            const apiUrl = `/transactions/api/transactions?${queryParams}`;
            console.log('Fetching from:', apiUrl);

            const response = await fetch(apiUrl, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json'
                },
                credentials: 'include'
            });

            console.log('Response status:', response.status);

            if (response.status === 401) {
                const errorData = await response.json();
                console.log('401 Error:', errorData);
                this.showError(errorData.message || 'Your session has expired. Please refresh the page to log in again.');
                return;
            }

            if (response.status === 404) {
                // Handle 404 gracefully - show "no transactions" instead of error
                console.log('No transactions found (404)');
                this.renderNoTransactions();
                return;
            }

            if (!response.ok) {
                throw new Error(`Failed to load transactions: ${response.status}`);
            }

            const data = await response.json();
            console.log('Transactions data:', data);

            if (data.success) {
                // Check if we actually have transactions
                if (data.data.transactions && data.data.transactions.length > 0) {
                    this.renderTransactions(data.data.transactions, append);
                    this.hasMore = data.data.pagination.hasMore || false;
                    this.updatePaginationInfo(data.data.pagination);
                } else {
                    // No transactions in response
                    if (!append) {
                        this.renderNoTransactions();
                    }
                    this.hasMore = false;
                }
            } else {
                // API returned success: false but with 200 status
                if (data.message && data.message.includes('not found') || data.message.includes('No transactions')) {
                    this.renderNoTransactions();
                } else {
                    throw new Error(data.message || 'Failed to load transactions');
                }
            }

        } catch (error) {
            console.error('Error loading transactions:', error);
            
            // Check if it's a "no transactions" type error
            if (error.message.includes('not found') || 
                error.message.includes('No transactions') || 
                error.message.includes('404')) {
                this.renderNoTransactions();
            } else if (error.message.includes('Failed to fetch')) {
                this.showError('Network error. Please check your connection and try again.');
            } else {
                this.showError(error.message);
            }
        } finally {
            this.isLoading = false;
            this.updateLoadMoreButton();
        }
    }

    renderTransactions(transactions, append = false) {
        const container = document.getElementById('transactionsContainer');
        if (!container) return;

        if (!append) {
            container.innerHTML = '';
        }

        if (!transactions || transactions.length === 0) {
            if (!append) {
                this.renderNoTransactions();
            }
            return;
        }

        transactions.forEach(transaction => {
            const transactionEl = this.createTransactionElement(transaction);
            container.appendChild(transactionEl);
        });
    }

    renderNoTransactions() {
        const container = document.getElementById('transactionsContainer');
        if (!container) return;

        container.innerHTML = `
            <div class="text-center py-5">
                <div class="empty-state">
                    <i class="fas fa-exchange-alt fa-4x text-muted mb-4 opacity-50"></i>
                    <h5 class="text-muted mb-3">No Transactions Yet</h5>
                    <p class="text-muted mb-4">You haven't made any transactions yet. Your transactions will appear here once you start using the platform.</p>
                    <div class="d-flex justify-content-center gap-3">
                        <button class="btn btn-primary" onclick="window.location.href='/dashboard'">
                            <i class="fas fa-home me-2"></i>Go to Dashboard
                        </button>
                        <button class="btn btn-outline-primary" onclick="transactionManager.loadTransactions(1)">
                            <i class="fas fa-refresh me-2"></i>Refresh
                        </button>
                    </div>
                </div>
            </div>
        `;
        
        // Also hide pagination and load more button when no transactions
        this.hasMore = false;
        this.updateLoadMoreButton();
        
        const paginationInfo = document.getElementById('paginationInfo');
        if (paginationInfo) {
            paginationInfo.textContent = 'No transactions';
        }
    }

    createTransactionElement(transaction) {
        const div = document.createElement('div');
        div.className = 'transaction-card border rounded p-3 mb-3';
        div.innerHTML = `
            <div class="d-flex justify-content-between align-items-center">
                <div>
                    <p class="mb-0 f-15 gilroy-medium text-dark">
                        ${this.escapeHtml(transaction.type)} 
                        <span class="text-muted">|</span> 
                        <span class="${transaction.statusClass}">${this.escapeHtml(transaction.statusText)}</span>
                    </p>
                    <p class="mb-0 text-gray-100 f-13">
                        ${this.escapeHtml(transaction.formattedDate)}
                    </p>
                    ${transaction.description ? `
                        <p class="mb-0 text-gray-100 f-12">
                            ${this.escapeHtml(transaction.description)}
                        </p>
                    ` : ''}
                </div>
                <p class="mb-0 f-15 gilroy-semibold ${transaction.isPositive ? 'text-success' : 'text-danger'}">
                    ${transaction.isPositive ? '+' : '-'}${this.escapeHtml(transaction.displayAmount)}
                </p>
            </div>
        `;
        return div;
    }

    escapeHtml(text) {
        if (text === null || text === undefined) return '';
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    updatePaginationInfo(pagination) {
        const paginationInfo = document.getElementById('paginationInfo');
        if (paginationInfo && pagagination) {
            paginationInfo.textContent = `Page ${pagination.current} of ${pagination.pages}`;
        } else if (paginationInfo) {
            paginationInfo.textContent = '';
        }
    }

    updateLoadMoreButton() {
        const loadMoreBtn = document.getElementById('loadMoreBtn');
        if (loadMoreBtn) {
            if (this.hasMore) {
                loadMoreBtn.style.display = 'block';
                loadMoreBtn.disabled = this.isLoading;
                loadMoreBtn.innerHTML = this.isLoading ? 
                    '<i class="fas fa-spinner fa-spin me-2"></i>Loading...' : 
                    '<i class="fas fa-plus me-2"></i>Load More Transactions';
            } else {
                loadMoreBtn.style.display = 'none';
            }
        }
    }

    showError(message) {
        const container = document.getElementById('transactionsContainer');
        if (container) {
            container.innerHTML = `
                <div class="alert alert-warning">
                    <div class="d-flex align-items-center">
                        <i class="fas fa-exclamation-triangle me-3 fs-5"></i>
                        <div class="flex-grow-1">
                            <strong>Unable to Load Transactions</strong>
                            <p class="mb-0 mt-1">${this.escapeHtml(message)}</p>
                        </div>
                    </div>
                    <div class="mt-3 d-flex gap-2">
                        <button class="btn btn-sm btn-warning" onclick="transactionManager.loadTransactions(1)">
                            <i class="fas fa-refresh me-2"></i>Try Again
                        </button>
                        <button class="btn btn-sm btn-outline-secondary" onclick="window.location.reload()">
                            <i class="fas fa-redo me-2"></i>Reload Page
                        </button>
                    </div>
                </div>
            `;
        }
    }

    setupEventListeners() {
        const loadMoreBtn = document.getElementById('loadMoreBtn');
        if (loadMoreBtn) {
            loadMoreBtn.addEventListener('click', () => {
                this.loadTransactions(this.currentPage + 1, true);
            });
        }

        // Add refresh button listener if exists
        const refreshBtn = document.getElementById('refreshTransactions');
        if (refreshBtn) {
            refreshBtn.addEventListener('click', () => {
                this.loadTransactions(1);
            });
        }
    }

    // Method to manually trigger refresh
    refresh() {
        this.loadTransactions(1);
    }
}

// Initialize with better error handling
document.addEventListener('DOMContentLoaded', function() {
    console.log('DOM loaded, initializing TransactionManager');
    try {
        window.transactionManager = new TransactionManager();
    } catch (error) {
        console.error('Failed to initialize TransactionManager:', error);
        
        // Show user-friendly error message
        const container = document.getElementById('transactionsContainer');
        if (container) {
            container.innerHTML = `
                <div class="alert alert-danger">
                    <i class="fas fa-exclamation-circle me-2"></i>
                    Failed to initialize transactions. Please refresh the page.
                    <button class="btn btn-sm btn-outline-danger ms-2" onclick="window.location.reload()">
                        Refresh Page
                    </button>
                </div>
            `;
        }
    }
});

// Make it available globally for manual refresh
if (typeof window !== 'undefined') {
    window.refreshTransactions = function() {
        if (window.transactionManager) {
            window.transactionManager.refresh();
        }
    };
}