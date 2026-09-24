class TransactionManager {
    constructor() {
        this.currentPage = 1;
        this.isLoading = false;
        this.hasMore = true;
        this.init();
    }

    init() {
        console.log('TransactionManager initialized');
        this.setupEventListeners();

        const existingTransactions = document.querySelectorAll('.transaction-card');
        if (existingTransactions.length === 0) {
            this.loadTransactions(1);
        } else {
            this.updateLoadMoreButton();
        }
    }

    async loadTransactions(page = 1, append = false) {
        if (this.isLoading) return;

        this.isLoading = true;
        this.currentPage = page;

        try {
            const container = document.getElementById('transactionsContainer');
            if (!container) return;

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

            const queryParams = new URLSearchParams({ page: page.toString(), limit: '10' });

            const response = await fetch(`/transactions/api/transactions?${queryParams}`, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json'
                },
                credentials: 'include'
            });

            if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);

            const data = await response.json();
            if (data.success && data.data && data.data.transactions) {
                this.renderTransactions(data.data.transactions, append);
                this.hasMore = data.data.pagination?.hasMore || false;
            } else {
                this.renderNoTransactions();
            }

        } catch (error) {
            console.error('Error loading transactions:', error);
            this.showError('Failed to load transactions. Please try again.');
        } finally {
            this.isLoading = false;
            this.updateLoadMoreButton();
        }
    }

    renderTransactions(transactions, append = false) {
        const container = document.getElementById('transactionsContainer');
        if (!container) return;

        if (!append) container.innerHTML = '';
        if (!transactions || transactions.length === 0) return this.renderNoTransactions();

        transactions.forEach(transaction => {
            const el = this.createTransactionElement(transaction);
            container.appendChild(el);
        });
    }

    createTransactionElement(transaction) {
        const div = document.createElement('div');
        div.className = 'transaction-card border rounded p-3 mb-3 cursor-pointer';
        div.setAttribute('data-bs-toggle', 'modal');
        div.setAttribute('data-bs-target', `#transactionModal${transaction._id}`);

        const statusClass = transaction.status === 'completed'
            ? 'text-success'
            : transaction.status === 'pending'
            ? 'text-warning'
            : 'text-danger';
        const statusText = transaction.status.charAt(0).toUpperCase() + transaction.status.slice(1);

        const isPositive = transaction.type === 'receive' || transaction.type === 'deposit';
        const amountDisplay = `$${transaction.amount?.toLocaleString() || '0'}`;

        div.innerHTML = `
            <div class="d-flex justify-content-between align-items-center">
                <div>
                    <p class="mb-0 f-15 gilroy-medium text-dark">
                        ${this.escapeHtml(transaction.type)} 
                        <span class="text-muted">|</span> 
                        <span class="${statusClass}">${this.escapeHtml(statusText)}</span>
                    </p>
                    <p class="mb-0 text-gray-100 f-13">
                        ${transaction.createdAt ? new Date(transaction.createdAt).toLocaleDateString() : 'Unknown Date'}
                    </p>
                </div>
                <p class="mb-0 f-15 gilroy-semibold ${isPositive ? 'text-success' : 'text-primary'}">
                    ${amountDisplay}
                </p>
            </div>
        `;
        return div;
    }

    // ✅ FIXED print function (no stray slash)
    printTransaction(transactionId) {
        const modal = document.getElementById(`transactionModal${transactionId}`);
        if (!modal) {
            alert("Transaction details not found!");
            return;
        }

        const printContent = modal.querySelector('.modal-content').cloneNode(true);
        if (!printContent) return;

        const modalFooter = printContent.querySelector('.modal-footer');
        if (modalFooter) modalFooter.remove();

        const printWindow = window.open('', '_blank', 'width=800,height=700');

        printWindow.document.write(`
            <!DOCTYPE html>
            <html>
            <head>
                <title>Transaction Receipt</title>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/css/bootstrap.min.css" rel="stylesheet">
                <style>
                    body { font-family: Arial, sans-serif; margin: 20px; color: #333; }
                    .receipt-container { max-width: 600px; margin: auto; border: 1px solid #ccc;
                        border-radius: 10px; padding: 20px; background: #fff; }
                    .receipt-header { text-align: center; border-bottom: 2px solid #007bff;
                        padding-bottom: 10px; margin-bottom: 20px; }
                    .receipt-header h3 { color: #007bff; }
                    .print-buttons { text-align: center; margin-top: 30px; }
                    @media print { .print-buttons { display: none; } body { margin: 0; background: #fff; } }
                </style>
            </head>
            <body>
                <div class="receipt-container">
                    <div class="receipt-header">
                        <h3>Transaction Receipt</h3>
                        <small>Generated on: ${new Date().toLocaleString()}</small>
                    </div>
                    ${printContent.innerHTML}
                </div>
                <div class="print-buttons">
                    <button class="btn btn-primary me-2" onclick="window.print()">Print Receipt</button>
                    <button class="btn btn-outline-secondary" onclick="window.close()">Close</button>
                </div>
            </body>
            </html>
        `);
        printWindow.document.close();
    }

    renderNoTransactions() {
        const container = document.getElementById('transactionsContainer');
        if (!container) return;
        container.innerHTML = `
            <div class="text-center py-5">
                <p class="mt-2 text-gray-100">No transactions found.</p>
            </div>
        `;
        this.hasMore = false;
        this.updateLoadMoreButton();
    }

    escapeHtml(text) {
        if (!text) return '';
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    updateLoadMoreButton() {
        const loadMoreBtn = document.getElementById('loadMoreBtn');
        const loadMoreContainer = document.getElementById('loadMoreContainer');

        if (loadMoreContainer) {
            loadMoreContainer.classList.toggle('d-none', !this.hasMore);
        }
        if (loadMoreBtn) {
            loadMoreBtn.disabled = this.isLoading;
            loadMoreBtn.innerHTML = this.isLoading
                ? '<i class="fas fa-spinner fa-spin me-2"></i>Loading...'
                : 'Load More Transactions';
        }
    }

    showError(message) {
        const container = document.getElementById('transactionsContainer');
        if (container) {
            container.innerHTML = `
                <div class="alert alert-danger">
                    <i class="fas fa-exclamation-triangle me-2"></i>
                    ${this.escapeHtml(message)}
                    <button class="btn btn-sm btn-outline-danger ms-2" onclick="transactionManager.loadTransactions(1)">
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

// ✅ Initialize once DOM loads
document.addEventListener('DOMContentLoaded', () => {
    window.transactionManager = new TransactionManager();
});
