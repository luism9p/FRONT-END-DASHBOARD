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