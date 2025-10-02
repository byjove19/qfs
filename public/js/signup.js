document.addEventListener("DOMContentLoaded", function () {
    // Initialize phone input
    const phoneInput = document.querySelector("#phone");
    if (phoneInput) {
        window.intlTelInput(phoneInput, {
            initialCountry: "us",
            separateDialCode: true,
            utilsScript:
                "https://cdnjs.cloudflare.com/ajax/libs/intl-tel-input/17.0.19/js/utils.js",
            preferredCountries: ["us", "gb", "ca", "au"],
        });
    }

    // Theme toggle
    const themeToggle = document.getElementById("themeToggle");
    const themeIcon = document.getElementById("themeIcon");
    const currentTheme = localStorage.getItem("theme") || "dark";
    document.documentElement.setAttribute("data-theme", currentTheme);
    updateThemeIcon(currentTheme);

    if (themeToggle) {
        themeToggle.addEventListener("click", function () {
            const theme = document.documentElement.getAttribute("data-theme");
            const newTheme = theme === "dark" ? "light" : "dark";
            document.documentElement.setAttribute("data-theme", newTheme);
            localStorage.setItem("theme", newTheme);
            updateThemeIcon(newTheme);
        });
    }

    function updateThemeIcon(theme) {
        if (!themeIcon) return;
        if (theme === "dark") {
            themeIcon.innerHTML =
                '<path d="M12,7C9.24,7 7,9.24 7,12C7,14.76 9.24,17 12,17C14.76,17 17,14.76 17,12C17,9.24 14.76,7 12,7M12,2L14.39,5.42C13.65,5.15 12.84,5 12,5C11.16,5 10.35,5.15 9.61,5.42L12,2M3.34,7L7.5,6.65C6.9,7.16 6.36,7.78 5.94,8.5C5.5,9.24 5.25,10 5.11,10.79L3.34,7M3.36,17L5.12,13.23C5.26,14 5.53,14.78 5.95,15.5C6.37,16.24 6.91,16.86 7.5,17.37L3.36,17M20.65,7L18.88,10.79C18.74,10 18.47,9.23 18.05,8.5C17.63,7.78 17.1,7.15 16.5,6.64L20.65,7M20.64,17L16.5,17.36C17.09,16.85 17.62,16.22 18.04,15.5C18.46,14.77 18.73,14 18.87,13.21L20.64,17M12,22L9.59,18.56C10.33,18.83 11.14,19 12,19C12.82,19 13.63,18.83 14.37,18.56L12,22Z" />';
        } else {
            themeIcon.innerHTML =
                '<path d="M12,18C11.11,18 10.26,17.8 9.5,17.45C11.56,16.5 13,14.42 13,12C13,9.58 11.56,7.5 9.5,6.55C10.26,6.2 11.11,6 12,6A6,6 0 0,1 18,12A6,6 0 0,1 12,18M20,8.69V4H15.31L12,0.69L8.69,4H4V8.69L0.69,12L4,15.31V20H8.69L12,23.31L15.31,20H20V15.31L23.31,12L20,8.69Z" />';
        }
    }

    // Toggle password visibility
    const togglePassword = document.getElementById("toggle-password");
    if (togglePassword) {
        togglePassword.addEventListener("click", function () {
            const passwordInput = document.getElementById("password");
            if (!passwordInput) return;
            const type =
                passwordInput.getAttribute("type") === "password"
                    ? "text"
                    : "password";
            passwordInput.setAttribute("type", type);
        });
    }

    // Clear errors on input
    document.querySelectorAll("input").forEach((input) => {
        input.addEventListener("input", () => {
            const errorField = document.getElementById(`${input.id}_error`);
            if (errorField) errorField.textContent = "";
        });
    });

    // Confirm password check
    const passwordConfirmation = document.getElementById("password_confirmation");
    if (passwordConfirmation) {
        passwordConfirmation.addEventListener("input", () => {
            const password = document.getElementById("password").value;
            const confirmPassword = passwordConfirmation.value;
            const errorField = document.getElementById("password_confirmation_error");
            if (errorField) {
                if (confirmPassword && password !== confirmPassword) {
                    errorField.textContent = "Passwords do not match.";
                } else {
                    errorField.textContent = "";
                }
            }
        });
    }

    // Form submission
    const form = document.getElementById("registration-form");
    if (form) {
        form.addEventListener("submit", async (e) => {
            e.preventDefault();

            if (!validateForm()) return;

            // Show loading state
            document.getElementById("spinner")?.classList.remove("d-none");
            document.getElementById("btnText").textContent = "Processing...";
            document.getElementById("submitBtn").disabled = true;

            try {
                // Prepare form data
                const formData = {
                    firstName: document.getElementById("first_name").value.trim(),
                    lastName: document.getElementById("last_name").value.trim(),
                    email: document.getElementById("email").value.trim(),
                    phone: document.getElementById("phone").value.trim(),
                    password: document.getElementById("password").value,
                    confirmPassword: document.getElementById("password_confirmation").value
                };

                // Send to backend API
                const response = await fetch('/api/auth/register', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify(formData)
                });

                const result = await response.json();

                if (response.ok) {
                    // Success - store tokens and redirect to dashboard
                    showMessage(result.message || "Registration successful! Redirecting to dashboard...", "success");
                    
                    // Store tokens in localStorage
                    if (result.data.token) {
                        localStorage.setItem('authToken', result.data.token);
                        localStorage.setItem('refreshToken', result.data.refreshToken);
                    }
                    
                    // Redirect to dashboard
                    setTimeout(() => {
                        window.location.href = "/dashboard";
                    }, 1500);
                    
                } else {
                    // Error from server
                    showMessage(result.message || "Registration failed. Please try again.", "error");
                    
                    // Show field-specific errors if provided
                    if (result.errors) {
                        Object.keys(result.errors).forEach(field => {
                            const errorField = document.getElementById(`${field}_error`);
                            if (errorField) {
                                errorField.textContent = result.errors[field];
                            }
                        });
                    }
                    
                    // Reset loading state
                    resetFormState();
                }

            } catch (error) {
                // Network error
                console.error('Registration error:', error);
                showMessage("Network error. Please check your connection and try again.", "error");
                resetFormState();
            }
        });
    }

    function validateForm() {
        let isValid = true;

        const firstName = document.getElementById("first_name");
        if (firstName && firstName.value.trim().length < 2) {
            document.getElementById("first_name_error").textContent =
                "First name must be at least 2 characters.";
            isValid = false;
        }

        const lastName = document.getElementById("last_name");
        if (lastName && lastName.value.trim().length < 2) {
            document.getElementById("last_name_error").textContent =
                "Last name must be at least 2 characters.";
            isValid = false;
        }

        const email = document.getElementById("email");
        if (
            email &&
            !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.value.trim())
        ) {
            document.getElementById("email_error").textContent =
                "Please enter a valid email address.";
            isValid = false;
        }

        const password = document.getElementById("password");
        if (password && password.value.length < 6) {
            document.getElementById("password_error").textContent =
                "Password must be at least 6 characters.";
            isValid = false;
        }

        const confirmPassword = document.getElementById("password_confirmation");
        if (password && confirmPassword && password.value !== confirmPassword.value) {
            document.getElementById("password_confirmation_error").textContent =
                "Passwords do not match.";
            isValid = false;
        }

        return isValid;
    }

    function showMessage(message, type) {
        const messageDiv = document.getElementById("form-messages");
        if (!messageDiv) return;
        
        messageDiv.className = `alert ${type === 'success' ? 'alert-success' : 'alert-danger'}`;
        messageDiv.textContent = message;
        messageDiv.style.display = "block";

        if (type === "success") {
            setTimeout(() => (messageDiv.style.display = "none"), 5000);
        }
    }

    function resetFormState() {
        document.getElementById("spinner")?.classList.add("d-none");
        document.getElementById("btnText").textContent = "Continue";
        document.getElementById("submitBtn").disabled = false;
    }
});