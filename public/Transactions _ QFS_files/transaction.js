// public/js/transactions.js
class TransactionManager {
    constructor() {
        this.currentPage = 1;
        this.isLoading = false;
        this.hasMore = true;
        this.filters = {
            type: 'all',
            status: 'all',
            wallet: 'all',
            from: '',
            to: ''
        };
        this.init();
    }

    init() {
        this.bindEvents();
        this.loadTransactions();
    }

    bindEvents() {
        // Filter form submission
        document.getElementById('filterForm')?.addEventListener('submit', (e) => {
            e.preventDefault();
            this.handleFilterSubmit();
        });

        // Reset filters
        document.getElementById('resetFilters')?.addEventListener('click', (e) => {
            e.preventDefault();
            this.resetFilters();
        });

        // Load more transactions
        document.getElementById('loadMoreBtn')?.addEventListener('click', () => {
            this.loadMoreTransactions();
        });

        // Initialize date range picker if available
        if (typeof $('#daterange-btn').daterangepicker !== 'undefined') {
            this.initDateRangePicker();
        }
    }

    initDateRangePicker() {
        $('#daterange-btn').daterangepicker({
            opens: 'left',
            ranges: {
                'Today': [moment(), moment()],
                'Yesterday': [moment().subtract(1, 'days'), moment().subtract(1, 'days')],
                'Last 7 Days': [moment().subtract(6, 'days'), moment()],
                'Last 30 Days': [moment().subtract(29, 'days'), moment()],
                'This Month': [moment().startOf('month'), moment().endOf('month')],
                'Last Month': [moment().subtract(1, 'month').startOf('month'), moment().subtract(1, 'month').endOf('month')]
            },
            locale: {
                format: 'YYYY-MM-DD'
            }
        }, this.handleDateRangeChange.bind(this));
    }

    handleDateRangeChange(start, end) {
        this.filters.from = start.format('YYYY-MM-DD');
        this.filters.to = end.format('YYYY-MM-DD');
        document.getElementById('startfrom').value = this.filters.from;
        document.getElementById('endto').value = this.filters.to;
    }

    async handleFilterSubmit() {
        // Get current filter values
        this.filters.type = document.getElementById('type').value;
        this.filters.status = document.getElementById('status').value;
        this.filters.wallet = document.getElementById('wallet').value;

        this.currentPage = 1;
        this.hasMore = true;
        await this.loadTransactions();
    }

    resetFilters() {
        // Reset form elements
        document.getElementById('filterForm').reset();
        this.filters = {
            type: 'all',
            status: 'all',
            wallet: 'all',
            from: '',
            to: ''
        };
        this.currentPage = 1;
        this.hasMore = true;
        this.loadTransactions();
    }

    async loadTransactions() {
        if (this.isLoading) return;

        this.isLoading = true;
        this.showLoading();

        try {
            const queryParams = new URLSearchParams({
                page: this.currentPage.toString(),
                limit: '10',
                ...this.filters
            });

            const response = await fetch(`/api/transactions?${queryParams}`, {
                headers: {
                    'Content-Type': 'application/json',
                    'X-Requested-With': 'XMLHttpRequest'
                }
            });

            if (!response.ok) throw new Error('Failed to fetch transactions');

            const result = await response.json();

            if (result.success) {
                if (this.currentPage === 1) {
                    this.renderTransactions(result.data.transactions);
                } else {
                    this.appendTransactions(result.data.transactions);
                }

                // Update pagination
                this.hasMore = this.currentPage < result.data.pagination.pages;
                this.updateLoadMoreButton();
                
                this.hideLoading();
            }
        } catch (error) {
            console.error('Error loading transactions:', error);
            this.showError('Failed to load transactions');
        } finally {
            this.isLoading = false;
            this.hideLoading();
        }
    }

    async loadMoreTransactions() {
        if (this.isLoading || !this.hasMore) return;

        this.currentPage++;
        await this.loadTransactions();
    }

    renderTransactions(transactions) {
        const container = document.getElementById('transactionsContainer');
        const modalContainer = document.getElementById('transactionModalContainer');
        
        if (!container) return;

        if (transactions.length === 0) {
            container.innerHTML = this.getEmptyStateHTML();
            modalContainer.innerHTML = '';
            return;
        }

        let transactionsHTML = '';
        let modalsHTML = '';

        transactions.forEach((transaction, index) => {
            transactionsHTML += this.createTransactionHTML(transaction, index);
            modalsHTML += this.createTransactionModalHTML(transaction, index);
        });

        container.innerHTML = transactionsHTML;
        modalContainer.innerHTML = modalsHTML;

        // Re-bind modal events
        this.bindModalEvents();
    }

    appendTransactions(transactions) {
        const container = document.getElementById('transactionsContainer');
        const modalContainer = document.getElementById('transactionModalContainer');
        
        if (!container || transactions.length === 0) return;

        transactions.forEach((transaction, index) => {
            const actualIndex = container.children.length + index;
            container.insertAdjacentHTML('beforeend', this.createTransactionHTML(transaction, actualIndex));
            modalContainer.insertAdjacentHTML('beforeend', this.createTransactionModalHTML(transaction, actualIndex));
        });

        // Re-bind modal events for new elements
        this.bindModalEvents();
    }

    createTransactionHTML(transaction, index) {
        return `
            <div class="transac-parent cursor-pointer" data-bs-toggle="modal" data-bs-target="#transaction-Info-${index}">
                <div class="d-flex justify-content-between transac-child">
                    <div class="d-flex w-50">
                        <div class="deposit-circle d-flex justify-content-center align-items-center">
                            <img src="${transaction.icon}" alt="${transaction.type}" onerror="this.src='/images/transactions/default.svg'">
                        </div>
                        <div class="ml-20 r-ml-8">
                            <p class="mb-0 text-dark f-16 gilroy-medium theme-tran">${transaction.type}</p>
                            <div class="d-flex flex-wrap">
                                <p class="mb-0 text-gray-100 f-13 leading-17 gilroy-regular tran-title mt-2">${transaction.description}</p>
                                <p class="mb-0 text-gray-100 f-13 leading-17 gilroy-regular tran-title mt-2 d-flex justify-content-center align-items-center">
                                    <svg class="mx-2 text-muted-100" width="4" height="4" viewBox="0 0 4 4" fill="none">
                                        <circle cx="2" cy="2" r="2" fill="currentColor"></circle>
                                    </svg>
                                </p>
                                <p class="mb-0 text-gray-100 f-13 leading-17 gilroy-regular tran-title mt-2">${transaction.formattedDate}</p>
                            </div>
                        </div>
                    </div>
                    <div class="d-flex justify-content-center align-items-center">
                        <div>
                            <p class="mb-0 gilroy-medium ${transaction.isPositive ? 'text-success' : 'text-dark'} r-f-12 f-16 ph-20">
                                ${transaction.isPositive ? `
                                    <svg class="mx-2" width="10" height="10" viewBox="0 0 10 10" fill="#2AAA5E">
                                        <path d="M8.89992 3.84617L7.02742 5.71867L5.88409 6.86784C5.65113 7.10045 5.33538 7.23109 5.00617 7.23109C4.67697 7.23109 4.36122 7.10045 4.12826 6.86784L1.10659 3.84617C0.709923 3.4495 0.995756 2.77284 1.54992 2.77284H8.45659C9.01659 2.77284 9.29659 3.4495 8.89992 3.84617Z" fill="#2AAA5E"></path>
                                    </svg>
                                ` : `
                                    <svg class="mx-2" width="10" height="10" viewBox="0 0 10 10" fill="#DC2626">
                                        <path d="M8.89992 6.15383L7.02742 4.28133L5.88409 3.13216C5.65113 2.89955 5.33538 2.76891 5.00617 2.76891C4.67697 2.76891 4.36122 2.89955 4.12826 3.13216L1.10659 6.15383C0.709923 6.5505 0.995756 7.22716 1.54992 7.22716H8.45659C9.01659 7.22716 9.29659 6.5505 8.89992 6.15383Z" fill="#DC2626"></path>
                                    </svg>
                                `}
                                ${transaction.displayAmount}
                            </p>
                            <p class="${transaction.statusClass} f-13 gilroy-regular text-end mt-6 mb-0 status-info rlt-txt">
                                ${transaction.statusText}
                            </p>
                        </div>
                        <div class="cursor-pointer transaction-arrow ml-28 r-ml-12">
                            <a class="arrow-hovers" data-bs-toggle="modal" data-bs-target="#transaction-Info-${index}">
                                <svg class="nscaleX-1" width="12" height="12" viewBox="0 0 12 12" fill="none">
                                    <path fill-rule="evenodd" clip-rule="evenodd" d="M3.5312 1.52861C3.27085 1.78896 3.27085 2.21107 3.5312 2.47141L7.0598 6.00001L3.5312 9.52861C3.27085 9.78895 3.27085 10.2111 3.5312 10.4714C3.79155 10.7318 4.21366 10.7318 4.47401 10.4714L8.47401 6.47141C8.73436 6.21106 8.73436 5.78895 8.47401 5.52861L4.47401 1.52861C4.21366 1.26826 3.79155 1.26826 3.5312 1.52861Z" fill="currentColor"></path>
                                </svg> 
                            </a>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    createTransactionModalHTML(transaction, index) {
        const senderName = transaction.metadata?.sender ? 
            `${transaction.metadata.sender.firstName} ${transaction.metadata.sender.lastName}` : 
            'N/A';
        
        const recipientName = transaction.metadata?.recipient ? 
            `${transaction.metadata.recipient.firstName} ${transaction.metadata.recipient.lastName}` : 
            'N/A';

        return `
            <div class="modal fade modal-overly" id="transaction-Info-${index}" tabindex="-1" aria-hidden="true">
                <div class="transac modal-dialog modal-dialog-centered modal-lg res-dialog">
                    <div class="modal-content modal-transac transaction-modal">
                        <div class="modal-body modal-themeBody">
                            <div class="d-flex position-relative modal-res">
                                <button type="button" class="cursor-pointer close-btn" data-bs-dismiss="modal" aria-label="Close">
                                    <svg class="position-absolute close-btn text-gray-100" width="20" height="20" viewBox="0 0 20 20" fill="none">
                                        <path fill-rule="evenodd" clip-rule="evenodd" d="M5.24408 5.24408C5.56951 4.91864 6.09715 4.91864 6.42259 5.24408L10 8.82149L13.5774 5.24408C13.9028 4.91864 14.4305 4.91864 14.7559 5.24408C15.0814 5.56951 15.0814 6.09715 14.7559 6.42259L11.1785 10L14.7559 13.5774C15.0814 13.9028 15.0814 14.4305 14.7559 14.7559C14.4305 15.0814 13.9028 15.0814 13.5774 14.7559L10 11.1785L6.42259 14.7559C6.09715 15.0814 5.56951 15.0814 5.24408 14.7559C4.91864 14.4305 4.91864 13.9028 5.24408 13.5774L8.82149 10L5.24408 6.42259C4.91864 6.09715 4.91864 5.56951 5.24408 5.24408Z" fill="currentColor"></path>
                                    </svg>
                                </button>
                                <div class="deposit-transac d-flex flex-column justify-content-center p-4 text-wrap">
                                    <div class="d-flex justify-content-center text-primary align-items-center transac-img">
                                        <img src="${transaction.icon}" alt="${transaction.type}" class="img-fluid" onerror="this.src='/images/transactions/default.svg'">
                                    </div>
                                    <p class="mb-0 mt-28 text-dark gilroy-medium f-15 r-f-12 r-mt-18 text-center">${transaction.type} Amount</p>
                                    <p class="mb-0 text-dark gilroy-Semibold f-24 leading-29 r-f-26 text-center l-s2 mt-10">${transaction.displayAmount}</p>
                                    <p class="mb-0 mt-18 text-gray-100 gilroy-medium f-13 leading-20 r-f-14 text-center">${transaction.formattedDate}</p>
                                    <div class="d-flex justify-content-center">
                                        <a href="#" class="infoBtn-print cursor-pointer f-14 gilroy-medium text-dark mt-35 d-flex justify-content-center align-items-center" onclick="window.print()">
                                            <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                                                <path d="M4.15385 16.5H13.8462V13.5H4.15385V16.5ZM4.15385 9H13.8462V4.5H12.1154C11.8269 4.5 11.5817 4.39062 11.3798 4.17188C11.1779 3.95312 11.0769 3.6875 11.0769 3.375V1.5H4.15385V9ZM16.6154 9.75C16.6154 9.54688 16.5469 9.37109 16.4099 9.22266C16.2728 9.07422 16.1106 9 15.9231 9C15.7356 9 15.5733 9.07422 15.4363 9.22266C15.2993 9.37109 15.2308 9.54688 15.2308 9.75C15.2308 9.95312 15.2993 10.1289 15.4363 10.2773C15.5733 10.4258 15.7356 10.5 15.9231 10.5C16.1106 10.5 16.2728 10.4258 16.4099 10.2773C16.5469 10.1289 16.6154 9.95312 16.6154 9.75ZM18 9.75V14.625C18 14.7266 17.9657 14.8145 17.8972 14.8887C17.8287 14.9629 17.7476 15 17.6538 15H15.2308V16.875C15.2308 17.1875 15.1298 17.4531 14.9279 17.6719C14.726 17.8906 14.4808 18 14.1923 18H3.80769C3.51923 18 3.27404 17.8906 3.07212 17.6719C2.87019 17.4531 2.76923 17.1875 2.76923 16.875V15H0.346154C0.252404 15 0.171274 14.9629 0.102764 14.8887C0.0342548 14.8145 0 14.7266 0 14.625V9.75C0 9.13281 0.203726 8.60352 0.611178 8.16211C1.01863 7.7207 1.50721 7.5 2.07692 7.5H2.76923V1.125C2.76923 0.8125 2.87019 0.546875 3.07212 0.328125C3.27404 0.109375 3.51923 0 3.80769 0H11.0769C11.3654 0 11.6827 0.078125 12.0288 0.234375C12.375 0.390625 12.649 0.578125 12.851 0.796875L14.4952 2.57812C14.6971 2.79688 14.8702 3.09375 15.0144 3.46875C15.1587 3.84375 15.2308 4.1875 15.2308 4.5V7.5H15.9231C16.4928 7.5 16.9814 7.7207 17.3888 8.16211C17.7963 8.60352 18 9.13281 18 9.75Z" fill="currentColor"></path>
                                            </svg>&nbsp;
                                            <span>Print</span>
                                        </a>
                                    </div>
                                </div>
                                <div class="ml-20 trans-details">
                                    <p class="mb-0 mt-9 text-dark dark-5B f-20 gilroy-Semibold transac-title">Transaction Details</p>
                                    
                                    <div class="row gx-sm-5">
                                        <div class="col-6">
                                            <p class="mb-0 mt-4 text-gray-100 gilroy-medium f-13 leading-20 r-f-9 r-mt-11">Transaction ID</p>
                                            <p class="mb-0 mt-5p text-dark gilroy-medium f-15 leading-22 r-text">${transaction.referenceId}</p>
                                        </div>
                                        <div class="col-6">
                                            <p class="mb-0 mt-4 text-gray-100 gilroy-medium f-13 leading-20 r-f-9 r-mt-11">Currency</p>
                                            <p class="mb-0 mt-5p text-dark gilroy-medium f-15 leading-22 r-text">${transaction.currency}</p>
                                        </div>
                                    </div>
                                    <div class="row gx-sm-5">
                                        <div class="col-6">
                                            <p class="mb-0 mt-20 text-gray-100 gilroy-medium f-13 leading-20 r-f-9 r-mt-11">Amount</p>
                                            <p class="mb-0 mt-5p text-dark gilroy-medium f-15 leading-22 r-text">${transaction.currency} ${Math.abs(transaction.amount).toLocaleString()}</p>
                                        </div>
                                        <div class="col-6">
                                            <p class="mb-0 mt-20 text-gray-100 gilroy-medium f-13 leading-20 r-f-9 r-mt-11">Transaction Fee</p>
                                            <p class="mb-0 mt-5p text-dark gilroy-medium f-15 leading-22 r-text">${transaction.fee > 0 ? `${transaction.currency} ${transaction.fee.toLocaleString()}` : '-'}</p>
                                        </div>
                                    </div>
                                    <div class="row gx-sm-5">
                                        <div class="col-6">
                                            <p class="mb-0 mt-20 text-gray-100 gilroy-medium f-13 leading-20 r-f-9 r-mt-11">Status</p>
                                            <p class="mb-0 mt-5p ${transaction.statusClass} gilroy-medium f-15 leading-22 r-text">${transaction.statusText}</p>
                                        </div>
                                    </div>
                                    <p class="hr-border w-100 mb-0"></p>
                                    <div class="row gx-sm-5">
                                        <div class="col-6">
                                            <p class="mb-0 mt-4 text-gray-100 dark-B87 gilroy-medium f-13 leading-20 r-f-9 r-mt-11">Net Amount</p>
                                            <p class="mb-0 mt-5p text-dark dark-CDO gilroy-medium f-15 leading-22 r-text">${transaction.currency} ${Math.abs(transaction.netAmount).toLocaleString()}</p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    bindModalEvents() {
        // Bootstrap modals will handle the events automatically
    }

    getEmptyStateHTML() {
        return `
            <div class="text-center py-5">
                <img src="/images/empty-transactions.svg" alt="No transactions" class="mb-3" style="max-width: 200px;">
                <h5 class="text-dark gilroy-medium">No transactions found</h5>
                <p class="text-gray-100">You don't have any transactions yet.</p>
            </div>
        `;
    }

    showLoading() {
        const container = document.getElementById('transactionsContainer');
        if (container && this.currentPage === 1) {
            container.innerHTML = `
                <div class="text-center py-5">
                    <div class="spinner-border text-primary" role="status">
                        <span class="visually-hidden">Loading transactions...</span>
                    </div>
                    <p class="mt-2 text-gray-100">Loading transactions...</p>
                </div>
            `;
        }
    }

    hideLoading() {
        // Loading state is handled by the render functions
    }

    updateLoadMoreButton() {
        const loadMoreContainer = document.getElementById('loadMoreContainer');
        const loadMoreBtn = document.getElementById('loadMoreBtn');
        
        if (loadMoreContainer && loadMoreBtn) {
            if (this.hasMore) {
                loadMoreContainer.classList.remove('d-none');
                loadMoreBtn.disabled = false;
                loadMoreBtn.textContent = 'Load More Transactions';
            } else {
                loadMoreContainer.classList.add('d-none');
            }
        }
    }

    showError(message) {
        const container = document.getElementById('transactionsContainer');
        if (container) {
            container.innerHTML = `
                <div class="alert alert-danger text-center">
                    <i class="fas fa-exclamation-triangle me-2"></i>
                    ${message}
                    <button class="btn btn-sm btn-outline-danger ms-2" onclick="transactionManager.loadTransactions()">Retry</button>
                </div>
            `;
        }
    }
}

// Initialize when DOM is loaded
let transactionManager;
document.addEventListener('DOMContentLoaded', () => {
    transactionManager = new TransactionManager();
});