const navToggles = document.querySelectorAll('.mobile-nav-toggle');
const nav = document.querySelector('.navigation');

navToggles.forEach(navToggle => {
    navToggle.addEventListener('click', () => {
        const isVisible = nav.hasAttribute('data-visible');
        navToggles.forEach(toggle => {
            toggle.setAttribute('aria-expanded', !isVisible);
        });
        nav.toggleAttribute('data-visible');
        document.body.classList.toggle("no-scroll");
    });
});

