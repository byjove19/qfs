/**
 * MOBILE HEADER NAVIGATION SCRIPT
 * Add this JavaScript to your project
 */

(function() {
  'use strict';

  // Mobile Menu Elements
  const mobileToggler = document.querySelector('.mobile-nav-toggler');
  const mobileMenu = document.querySelector('.tgmobile__menu');
  const mobileBackdrop = document.querySelector('.tgmobile__menu-backdrop');
  const closeBtn = document.querySelector('.tgmobile__menu .close-btn');
  const mobileLinks = document.querySelectorAll('.tgmobile__menu .navigation a');

  // Check if elements exist
  if (!mobileToggler || !mobileMenu || !mobileBackdrop || !closeBtn) {
    console.warn('Mobile menu elements not found');
    return;
  }

  /**
   * Open Mobile Menu
   */
  function openMobileMenu() {
    mobileMenu.classList.add('active');
    mobileBackdrop.classList.add('active');
    document.body.classList.add('mobile-menu-visible');
    document.body.style.overflow = 'hidden';
  }

  /**
   * Close Mobile Menu
   */
  function closeMobileMenu() {
    mobileMenu.classList.remove('active');
    mobileBackdrop.classList.remove('active');
    document.body.classList.remove('mobile-menu-visible');
    document.body.style.overflow = '';
  }

  /**
   * Toggle Mobile Menu
   */
  function toggleMobileMenu() {
    if (mobileMenu.classList.contains('active')) {
      closeMobileMenu();
    } else {
      openMobileMenu();
    }
  }

  // Event Listeners
  mobileToggler.addEventListener('click', openMobileMenu);
  closeBtn.addEventListener('click', closeMobileMenu);
  mobileBackdrop.addEventListener('click', closeMobileMenu);

  // Close menu when clicking navigation links
  mobileLinks.forEach(link => {
    link.addEventListener('click', function(e) {
      // Close menu after a short delay for smooth transition
      setTimeout(closeMobileMenu, 300);
    });
  });

  // Handle submenu dropdowns (if you have submenus)
  const dropdownBtns = document.querySelectorAll('.tgmobile__menu .dropdown-btn');
  dropdownBtns.forEach(btn => {
    btn.addEventListener('click', function(e) {
      e.preventDefault();
      e.stopPropagation();
      
      const parentLi = this.closest('li');
      const subMenu = parentLi.querySelector('.sub-menu');
      
      if (subMenu) {
        this.classList.toggle('open');
        
        if (subMenu.style.display === 'block') {
          subMenu.style.display = 'none';
        } else {
          // Close other open submenus
          const openSubMenus = document.querySelectorAll('.tgmobile__menu .sub-menu');
          openSubMenus.forEach(menu => {
            if (menu !== subMenu) {
              menu.style.display = 'none';
              menu.closest('li').querySelector('.dropdown-btn').classList.remove('open');
            }
          });
          
          subMenu.style.display = 'block';
        }
      }
    });
  });

  // Close menu on escape key press
  document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape' && mobileMenu.classList.contains('active')) {
      closeMobileMenu();
    }
  });

  // Prevent body scroll when menu is open but allow menu scroll
  mobileMenu.addEventListener('touchmove', function(e) {
    e.stopPropagation();
  }, { passive: true });

  // Close menu on window resize if open
  let resizeTimer;
  window.addEventListener('resize', function() {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(function() {
      // Close mobile menu if screen is resized to desktop size
      if (window.innerWidth >= 1200 && mobileMenu.classList.contains('active')) {
        closeMobileMenu();
      }
    }, 250);
  });

  // Handle active menu item based on current page
  function setActiveMenuItem() {
    const currentPath = window.location.pathname;
    const currentHash = window.location.hash;
    
    // Desktop menu
    const desktopMenuLinks = document.querySelectorAll('.tgmenu__navbar-wrap .navigation a');
    desktopMenuLinks.forEach(link => {
      const linkPath = link.getAttribute('href');
      const parentLi = link.closest('li');
      
      if (linkPath === currentPath || linkPath === currentHash || 
          (currentPath === '/' && linkPath === '/index.html')) {
        parentLi.classList.add('active');
      } else {
        parentLi.classList.remove('active');
      }
    });
    
    // Mobile menu
    mobileLinks.forEach(link => {
      const linkPath = link.getAttribute('href');
      const parentLi = link.closest('li');
      
      if (linkPath === currentPath || linkPath === currentHash || 
          (currentPath === '/' && linkPath === '/index.html')) {
        parentLi.classList.add('active');
      } else {
        parentLi.classList.remove('active');
      }
    });
  }

  // Set active menu item on page load
  setActiveMenuItem();

  // Update active menu item on hash change
  window.addEventListener('hashchange', setActiveMenuItem);

  // Smooth scroll for anchor links
  const anchorLinks = document.querySelectorAll('a[href^="#"]');
  anchorLinks.forEach(link => {
    link.addEventListener('click', function(e) {
      const href = this.getAttribute('href');
      
      // Skip if it's just "#"
      if (href === '#') {
        e.preventDefault();
        return;
      }
      
      const targetElement = document.querySelector(href);
      
      if (targetElement) {
        e.preventDefault();
        
        // Close mobile menu if open
        if (mobileMenu.classList.contains('active')) {
          closeMobileMenu();
        }
        
        // Smooth scroll to target
        const headerOffset = 80; // Adjust based on your fixed header height
        const elementPosition = targetElement.getBoundingClientRect().top;
        const offsetPosition = elementPosition + window.pageYOffset - headerOffset;
        
        window.scrollTo({
          top: offsetPosition,
          behavior: 'smooth'
        });
        
        // Update URL hash
        history.pushState(null, null, href);
      }
    });
  });

  // Sticky header on scroll
  let lastScrollTop = 0;
  const header = document.getElementById('sticky-header');
  const headerFixedHeight = document.getElementById('header-fixed-height');
  
  if (header) {
    window.addEventListener('scroll', function() {
      const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
      
      if (scrollTop > 200) {
        header.classList.add('sticky-menu');
        if (headerFixedHeight) {
          headerFixedHeight.classList.add('active-height');
        }
      } else {
        header.classList.remove('sticky-menu');
        if (headerFixedHeight) {
          headerFixedHeight.classList.remove('active-height');
        }
      }
      
      lastScrollTop = scrollTop;
    });
  }

  console.log('Mobile menu initialized successfully');
})();