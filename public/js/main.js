(function ($) {
	"use strict";


/*===========================================
	=            Windows Load          =
=============================================*/
$(window).on('load', function () {
    preloader();
    wowAnimation();
});


/*===========================================
	=            Preloader          =
=============================================*/
function preloader() {
	$('#preloader').delay(0).fadeOut();
}


/*===========================================
	=    		Mobile Menu			      =
=============================================*/
//SubMenu Dropdown Toggle
if ($('.tgmenu__wrap li.menu-item-has-children ul').length) {
	$('.tgmenu__wrap .navigation li.menu-item-has-children').append('<div class="dropdown-btn"><span class="plus-line"></span></div>');
}

//Mobile Nav Hide Show
if ($('.tgmobile__menu').length) {

	var mobileMenuContent = $('.tgmenu__wrap .tgmenu__main-menu').html();
	$('.tgmobile__menu .tgmobile__menu-box .tgmobile__menu-outer').append(mobileMenuContent);

	//Dropdown Button
	$('.tgmobile__menu li.menu-item-has-children .dropdown-btn').on('click', function () {
		$(this).toggleClass('open');
		$(this).prev('ul').slideToggle(300);
	});
	//Menu Toggle Btn
	$('.mobile-nav-toggler').on('click', function () {
		$('body').addClass('mobile-menu-visible');
	});

	//Menu Toggle Btn
	$('.tgmobile__menu-backdrop, .tgmobile__menu .close-btn').on('click', function () {
		$('body').removeClass('mobile-menu-visible');
	});
}


/*===========================================
	=     Menu sticky & Scroll to top      =
=============================================*/
$(window).on('scroll', function () {
	var scroll = $(window).scrollTop();
	if (scroll < 245) {
		$("#sticky-header").removeClass("sticky-menu");
		$('.scroll-to-target').removeClass('open');
        $("#header-fixed-height").removeClass("active-height");

	} else {
		$("#sticky-header").addClass("sticky-menu");
		$('.scroll-to-target').addClass('open');
        $("#header-fixed-height").addClass("active-height");
	}
});


/*===========================================
	=           Scroll Up  	         =
=============================================*/
if ($('.scroll-to-target').length) {
  $(".scroll-to-target").on('click', function () {
    var target = $(this).attr('data-target');
    // animate
    $('html, body').animate({
      scrollTop: $(target).offset().top
    }, 0);

  });
}


/*===========================================
	=          Data Background    =
=============================================*/
$("[data-background]").each(function () {
	$(this).css("background-image", "url(" + $(this).attr("data-background") + ")")
});

$("[data-bg-color]").each(function () {
	$(this).css("background-color", $(this).attr("data-bg-color"));
});



/*=============================================
	=          One page Menu               =
=============================================*/
var scrollLink = $('.section-link');
// Active link switching
$(window).on('scroll', function () {
	var scrollbarLocation = $(this).scrollTop();

	scrollLink.each(function () {

		var sectionOffset = $(this.hash).offset().top - 90;

		if (sectionOffset <= scrollbarLocation) {
			$(this).parent().addClass('active');
			$(this).parent().siblings().removeClass('active');
		}
	});
});
//jQuery for page scrolling feature - requires jQuery Easing plugin
$(function () {
	$('a.section-link[href*="#"]:not([href="#"])').on('click', function () {
		if (location.pathname.replace(/^\//, '') == this.pathname.replace(/^\//, '') && location.hostname == this.hostname) {
			var target = $(this.hash);
			target = target.length ? target : $('[name=' + this.hash.slice(1) + ']');
			if (target.length) {
				$('html, body').animate({
					scrollTop: (target.offset().top - 85)
				}, 1200, "easeInOutExpo");
				return false;
			}
		}
	});
});


/*=============================================
	=        Brand Active		      =
=============================================*/
var brandSwiper = new Swiper('.brand-active', {
    // Optional parameters
    slidesPerView: 6,
    spaceBetween: 24,
    loop: true,
    breakpoints: {
        '1500': {
            slidesPerView: 6,
        },
        '1200': {
            slidesPerView: 5,
        },
        '992': {
            slidesPerView: 4,
        },
        '768': {
            slidesPerView: 3,
        },
        '576': {
            slidesPerView: 3,
        },
        '0': {
            slidesPerView: 2,
        },
    },
});



/*=============================================
	=        Ticker Active	      =
=============================================*/
var swiper = new Swiper(".ticker-active", {
    loop: true,
    freemode: true,
    slidesPerView: 'auto',
    spaceBetween: 60,
    centeredSlides: true,
    allowTouchMove: false,
    speed: 5000,
    autoplay: {
        delay: 1,
        disableOnInteraction: true,
    },
    breakpoints: {
        '1500': {
            spaceBetween: 60,
        },
        '1200': {
            spaceBetween: 60,
        },
        '992': {
            spaceBetween: 40,
        },
        '768': {
            spaceBetween: 30,
        },
        '576': {
            spaceBetween: 20,
        },
        '0': {
            spaceBetween: 20,
        },
    },
});


/*=============================================
	=    	  Countdown Active  	         =
=============================================*/
$('[data-countdown]').each(function () {
	var $this = $(this), finalDate = $(this).data('countdown');
	$this.countdown(finalDate, function (event) {
		$this.html(event.strftime('<div class="time-count day"><span>%D</span>Days</div><div class="time-count hour"><span>%H</span>hour</div><div class="time-count min"><span>%M</span>minute</div><div class="time-count sec"><span>%S</span>second</div>'));
	});
});



/*===========================================
	=         Marquee Active         =
=============================================*/
if ($(".marquee_mode").length) {
    $('.marquee_mode').marquee({
        speed: 20,
        gap: 20,
        delayBeforeStart: 0,
        direction: 'left',
        duplicated: true,
        startVisible:true,
    });
}




/*===========================================
      =       Odometer Active    =
=============================================*/
$('.odometer').appear(function (e) {
	var odo = $(".odometer");
	odo.each(function () {
		var countNumber = $(this).attr("data-count");
		$(this).html(countNumber);
	});
});


/*===========================================
	=        Wow Active      =
=============================================*/
function wowAnimation() {
	var wow = new WOW({
		boxClass: 'wow',
		animateClass: 'animated',
		offset: 0,
		mobile: false,
		live: true
	});
	wow.init();
}
    $(document).ready(function() {
            // Initialize phone input
            const phoneInput = document.querySelector("#phone");
            const iti = window.intlTelInput(phoneInput, {
                initialCountry: "us",
                separateDialCode: true,
                utilsScript: "https://cdnjs.cloudflare.com/ajax/libs/intl-tel-input/17.0.19/js/utils.js",
                preferredCountries: ['us', 'gb', 'ca', 'au']
            });

            // Theme toggle
            const themeToggle = document.getElementById('themeToggle');
            const themeIcon = document.getElementById('themeIcon');
            const currentTheme = localStorage.getItem('theme') || 'dark';
            document.documentElement.setAttribute('data-theme', currentTheme);
            updateThemeIcon(currentTheme);

            themeToggle.addEventListener('click', function() {
                let theme = document.documentElement.getAttribute('data-theme');
                let newTheme = theme === 'dark' ? 'light' : 'dark';
                document.documentElement.setAttribute('data-theme', newTheme);
                localStorage.setItem('theme', newTheme);
                updateThemeIcon(newTheme);
            });

            function updateThemeIcon(theme) {
                if (theme === 'dark') {
                    themeIcon.innerHTML = '<path d="M12,7C9.24,7 7,9.24 7,12C7,14.76 9.24,17 12,17C14.76,17 17,14.76 17,12C17,9.24 14.76,7 12,7M12,2L14.39,5.42C13.65,5.15 12.84,5 12,5C11.16,5 10.35,5.15 9.61,5.42L12,2M3.34,7L7.5,6.65C6.9,7.16 6.36,7.78 5.94,8.5C5.5,9.24 5.25,10 5.11,10.79L3.34,7M3.36,17L5.12,13.23C5.26,14 5.53,14.78 5.95,15.5C6.37,16.24 6.91,16.86 7.5,17.37L3.36,17M20.65,7L18.88,10.79C18.74,10 18.47,9.23 18.05,8.5C17.63,7.78 17.1,7.15 16.5,6.64L20.65,7M20.64,17L16.5,17.36C17.09,16.85 17.62,16.22 18.04,15.5C18.46,14.77 18.73,14 18.87,13.21L20.64,17M12,22L9.59,18.56C10.33,18.83 11.14,19 12,19C12.82,19 13.63,18.83 14.37,18.56L12,22Z" />';
                } else {
                    themeIcon.innerHTML = '<path d="M12,18C11.11,18 10.26,17.8 9.5,17.45C11.56,16.5 13,14.42 13,12C13,9.58 11.56,7.5 9.5,6.55C10.26,6.2 11.11,6 12,6A6,6 0 0,1 18,12A6,6 0 0,1 12,18M20,8.69V4H15.31L12,0.69L8.69,4H4V8.69L0.69,12L4,15.31V20H8.69L12,23.31L15.31,20H20V15.31L23.31,12L20,8.69Z" />';
                }
            }

            // Toggle password visibility
            $('#toggle-password').on('click', function() {
                const passwordInput = $('#password');
                const type = passwordInput.attr('type') === 'password' ? 'text' : 'password';
                passwordInput.attr('type', type);
            });

            // Form validation
            $('input').on('input', function() {
                const fieldName = $(this).attr('id');
                $(`#${fieldName}_error`).text('');
            });

            $('#password_confirmation').on('input', function() {
                const password = $('#password').val();
                const confirmPassword = $(this).val();
                if (confirmPassword && password !== confirmPassword) {
                    $('#password_confirmation_error').text('Passwords do not match.');
                } else {
                    $('#password_confirmation_error').text('');
                }
            });

            // Form submission
            $('#registration-form').on('submit', function(e) {
                e.preventDefault();
                
                if (!validateForm()) return;

                $('#spinner').removeClass('d-none');
                $('#btnText').text('Processing...');
                $('#submitBtn').prop('disabled', true);

                // Simulate API call
                setTimeout(() => {
                    const isSuccess = Math.random() > 0.2;
                    
                    if (isSuccess) {
                        showMessage('Registration successful! Redirecting...', 'success');
                        setTimeout(() => {
                            window.location.href = '/login';
                        }, 2000);
                    } else {
                        showMessage('Registration failed. Please try again.', 'error');
                        $('#spinner').addClass('d-none');
                        $('#btnText').text('Continue');
                        $('#submitBtn').prop('disabled', false);
                    }
                }, 2000);
            });

            function validateForm() {
                let isValid = true;
                
                const firstName = $('#first_name').val().trim();
                if (!firstName || firstName.length < 2) {
                    $('#first_name_error').text('First name must be at least 2 characters.');
                    isValid = false;
                }

                const lastName = $('#last_name').val().trim();
                if (!lastName || lastName.length < 2) {
                    $('#last_name_error').text('Last name must be at least 2 characters.');
                    isValid = false;
                }

                const email = $('#email').val().trim();
                if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
                    $('#email_error').text('Please enter a valid email address.');
                    isValid = false;
                }

                const password = $('#password').val();
                if (!password || password.length < 6) {
                    $('#password_error').text('Password must be at least 6 characters.');
                    isValid = false;
                }

                const confirmPassword = $('#password_confirmation').val();
                if (password !== confirmPassword) {
                    $('#password_confirmation_error').text('Passwords do not match.');
                    isValid = false;
                }

                return isValid;
            }

            function showMessage(message, type) {
                const messageDiv = $('#form-messages');
                messageDiv.removeClass('alert-success alert-danger')
                    .addClass(`alert-${type === 'success' ? 'success' : 'danger'}`)
                    .text(message)
                    .show();
                
                if (type === 'success') {
                    setTimeout(() => messageDiv.hide(), 5000);
                }
            }
        });

})(jQuery);