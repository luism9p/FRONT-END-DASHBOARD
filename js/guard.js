// js/guard.js

// Función de ejecución inmediata (IIFE) para que corra antes de cargar la página
(function() {
    // 1. Buscamos el token con la clave EXACTA que usamos en auth.js
    const token = localStorage.getItem('barberia_token');

    // 2. Si no hay token, el usuario no ha iniciado sesión
    if (!token) {
        // Redirigimos al login inmediatamente
        window.location.href = 'login.html';
    }
    
    // Opcional: Aquí podrías agregar lógica para decodificar el JWT y verificar
    // si ha expirado, pero por ahora con verificar que exista es suficiente 
    // para el Frontend.
})();

window.aplicarReglasDeRol = function() {
    const rol = localStorage.getItem('barberia_user_rol');
    const nombre = localStorage.getItem('barberia_user_nombre') || 'Usuario';

    // 1. Actualizar el nombre y rol en la esquina superior derecha
    const userNameElement = document.querySelector('.topbar-user-name'); 
    const userRoleElement = document.querySelector('.topbar-user-role'); 
    
    if (userNameElement) userNameElement.textContent = nombre;
    if (userRoleElement) userRoleElement.textContent = rol === 'admin' ? 'Administrador' : 'Barbero';

    // 2. Ocultar elementos si es Barbero
    if (rol === 'barbero') {
        // Ocultar tarjeta de Ingresos (Busca la tarjeta que contiene el texto de ingresos o usa su ID/Clase)
        const tarjetaIngresos = document.querySelector('.card-ingresos'); 
        if (tarjetaIngresos) tarjetaIngresos.style.display = 'none';

        // Ocultar opciones del menú lateral que no le corresponden
        const menuServicios = document.querySelector('a[href*="#servicios"]');
        const menuClientes = document.querySelector('a[href*="#clientes"]');
        const menuBarberos = document.querySelector('a[href*="#barberos"]');
        const menuAjustes = document.querySelector('a[href*="#ajustes"]');

        // Seleccionamos el elemento padre (el <li>) para ocultar toda la fila
        if (menuServicios) menuServicios.parentElement.style.display = 'none';
        if (menuClientes) menuClientes.parentElement.style.display = 'none';
        if (menuBarberos) menuBarberos.parentElement.style.display = 'none';
        if (menuAjustes) menuAjustes.parentElement.style.display = 'none';
    }
};

// Ejecutar al cargar la página
document.addEventListener('DOMContentLoaded', () => {
    window.aplicarReglasDeRol();
});