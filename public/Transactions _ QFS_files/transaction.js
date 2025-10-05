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
                credentials: 'include' // This is crucial for session cookies
            });

            console.log('Response status:', response.status);

            if (response.status === 401) {
                const errorData = await response.json();
                console.log('401 Error:', errorData);
                
                // Show error message but DON'T redirect
                this.showError(errorData.message || 'Your session has expired. Please refresh the page to log in again.');
                return; // Stop here, don't throw
            }

            if (!response.ok) {
                throw new Error(`Failed to load transactions: ${response.status}`);
            }

            const data = await response.json();
            console.log('Transactions data:', data);

            if (data.success) {
                this.renderTransactions(data.data.transactions, append);
                this.hasMore = data.data.pagination.hasMore || false;
                this.updatePaginationInfo(data.data.pagination);
            } else {
                throw new Error(data.message || 'Failed to load transactions');
            }

        } catch (error) {
            console.error('Error loading transactions:', error);
            
            // Different error messages for different scenarios
            if (error.message.includes('Failed to fetch')) {
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
                container.innerHTML = `
                    <div class="text-center py-5">
                        <i class="fas fa-exchange-alt fa-3x text-muted mb-3"></i>
                        <p class="text-muted">No transactions found.</p>
                    </div>
                `;
            }
            return;
        }

        transactions.forEach(transaction => {
            const transactionEl = this.createTransactionElement(transaction);
            container.appendChild(transactionEl);
        });
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
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    updatePaginationInfo(pagination) {
        const paginationInfo = document.getElementById('paginationInfo');
        if (paginationInfo && pagination) {
            paginationInfo.textContent = `Page ${pagination.current} of ${pagination.pages}`;
        }
    }

    updateLoadMoreButton() {
        const loadMoreBtn = document.getElementById('loadMoreBtn');
        if (loadMoreBtn) {
            loadMoreBtn.style.display = this.hasMore ? 'block' : 'none';
            loadMoreBtn.disabled = this.isLoading;
            loadMoreBtn.textContent = this.isLoading ? 'Loading...' : 'Load More Transactions';
        }
    }

    showError(message) {
        const container = document.getElementById('transactionsContainer');
        if (container) {
            container.innerHTML = `
                <div class="alert alert-warning">
                    <i class="fas fa-exclamation-triangle me-2"></i>
                    ${this.escapeHtml(message)}
                    <button class="btn btn-sm btn-outline-warning ms-2" onclick="transactionManager.loadTransactions(1)">
                        Try Again
                    </button>
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
    }
}

// Initialize
document.addEventListener('DOMContentLoaded', function() {
    console.log('DOM loaded, initializing TransactionManager');
    window.transactionManager = new TransactionManager();
});