// js/app.js - SOLO LÓGICA DE INTERFAZ (MENÚS Y VISTAS)

(function () {
    'use strict';

    const layoutWrapper = document.getElementById('layoutWrapper');
    const layoutMask = document.getElementById('layoutMask');
    const menuToggle = document.getElementById('menuToggle');
    const topbarMenuToggle = document.getElementById('topbarMenuToggle');
    const topbarMenu = document.getElementById('topbarMenu');
    const logoutBtn = document.getElementById('logoutBtn');
    const menuItems = document.querySelectorAll('.menu-item[data-view]');
    const viewSections = document.querySelectorAll('.view-section');

    // Cargar info del usuario en la barra superior
    function loadUserInfo() {
        try {
            // Lee el token para sacar el correo (puedes mejorarlo luego)
            document.getElementById('userName').textContent = "Admin";
            document.getElementById('userInitials').textContent = "A";
        } catch (e) { console.error(e); }
    }

    // Controles del Menú Lateral (Sidebar)
    if (menuToggle) {
        menuToggle.addEventListener('click', () => {
            if (window.innerWidth <= 991) layoutWrapper.classList.toggle('mobile-active');
        });
    }

    if (layoutMask) {
        layoutMask.addEventListener('click', () => layoutWrapper.classList.remove('mobile-active'));
    }

    if (topbarMenuToggle) {
        topbarMenuToggle.addEventListener('click', () => topbarMenu.classList.toggle('show'));
    }

    // Cambiar de vistas (Dashboard -> Citas -> Servicios)
    function switchView(viewName) {
        viewSections.forEach(section => section.style.display = 'none');
        const target = document.getElementById('view' + viewName.charAt(0).toUpperCase() + viewName.slice(1));
        if (target) target.style.display = 'block';

        menuItems.forEach(item => {
            item.classList.toggle('active', item.dataset.view === viewName);
        });
        layoutWrapper.classList.remove('mobile-active');

        // Magia para el calendario y tarjetas
        if (viewName === 'dashboard') {
            setTimeout(() => {
                if (window.calendar) {
                    window.calendar.render();
                }
            }, 100);

            if (window.actualizarEstadisticas) {
                window.actualizarEstadisticas();
            }
        }
    }

    // 👇 ESTO ES LO QUE PROBABLEMENTE SE BORRÓ SIN QUERER 👇
    menuItems.forEach(item => {
        item.addEventListener('click', (e) => {
            e.preventDefault(); // Esto evita que cambie la URL a #citas
            switchView(item.dataset.view);
        });
    });
    // 👆 LA MAGIA TERMINA AQUÍ 👆

    // Cerrar sesión
    if (logoutBtn) {
        logoutBtn.addEventListener('click', () => {
            localStorage.removeItem('barberia_token');
            window.location.replace('login.html');
        });
    }

    loadUserInfo();
})();