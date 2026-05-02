// js/estadisticas.js

// 1. Función principal GLOBAL para cargar estadísticas
window.actualizarEstadisticas = async () => {
    try {
        // Helper para headers con token (como lo tenías)
        const token = localStorage.getItem('barberia_token');
        const headers = {
            'Content-Type': 'application/json',
            ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        };

        const response = await fetch('http://localhost:3000/api/dashboard/estadisticas', { headers });
        const data = await response.json();

        // 2. Inyectar datos de forma segura
        // Usamos variables y verificamos que existan para que no de error si algún ID cambia en el HTML
        const statIngresos = document.getElementById('stat-ingresos');
        if (statIngresos) statIngresos.innerText = `$${data.ingresosTotales.toFixed(2)}`;

        // Validamos ambas formas de escribir "citas hoy" por si en tu HTML está diferente
        const statCitasHoy = document.getElementById('stat-citas-hoy') || document.getElementById('stat-citashoy');
        if (statCitasHoy) statCitasHoy.innerText = data.citasHoy;

        const statConfirmadas = document.getElementById('stat-confirmadas');
        if (statConfirmadas) statConfirmadas.innerText = data.confirmadas;

        const statPendientes = document.getElementById('stat-pendientes');
        if (statPendientes) statPendientes.innerText = data.pendientes;

        const statCanceladas = document.getElementById('stat-canceladas');
        if (statCanceladas) statCanceladas.innerText = data.canceladas;

    } catch (error) {
        console.error("Error al actualizar KPIs:", error);
    }
};

// 3. Ejecutar solo la primera vez que carga la página
document.addEventListener('DOMContentLoaded', () => {
    window.actualizarEstadisticas();
});