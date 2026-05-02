document.addEventListener('DOMContentLoaded', () => {
    // Referencias al DOM
    const ajustesForm = document.getElementById('ajustesForm');
    const ajustesId = document.getElementById('ajustesId');
    const ajustesNombre = document.getElementById('ajustesNombre');
    const ajustesTelefono = document.getElementById('ajustesTelefono');
    const ajustesDireccion = document.getElementById('ajustesDireccion');
    const ajustesApertura = document.getElementById('ajustesApertura');
    const ajustesCierre = document.getElementById('ajustesCierre');
    const ajustesIntervalo = document.getElementById('ajustesIntervalo');

    // API config
    const API_URL = 'http://localhost:3000/api/ajustes';

    // ==========================================
    // Sistema de Notificaciones Toast
    // ==========================================
    function mostrarToast(mensaje, tipo = 'success') {
        let container = document.getElementById('toastContainer');
        if (!container) {
            container = document.createElement('div');
            container.id = 'toastContainer';
            container.className = 'toast-container';
            document.body.appendChild(container);
        }

        const toast = document.createElement('div');
        toast.className = `toast ${tipo}`;
        
        let iconClass = tipo === 'success' ? 'pi pi-check-circle' : 'pi pi-times-circle';
        let iconColor = tipo === 'success' ? 'var(--green-500)' : 'var(--red-500)';
        let title = tipo === 'success' ? 'Éxito' : 'Error';

        toast.innerHTML = `
            <i class="${iconClass}" style="color: ${iconColor}; font-size: 1.5rem;"></i>
            <div class="toast-message">
                <div class="toast-title">${title}</div>
                <div class="toast-text">${mensaje}</div>
            </div>
            <button class="modal-close" style="margin-left: auto; border: none; background: transparent; cursor: pointer;" onclick="this.parentElement.remove()"><i class="pi pi-times"></i></button>
        `;

        container.appendChild(toast);

        setTimeout(() => {
            toast.style.transition = 'all 0.3s ease';
            toast.style.opacity = '0';
            toast.style.transform = 'translateX(100px)';
            setTimeout(() => { if (toast.parentElement) toast.remove(); }, 300);
        }, 3000);
    }

    // Helper para armar Headers
    function getHeaders() {
        const token = localStorage.getItem('token');
        return {
            'Content-Type': 'application/json',
            'Authorization': token ? `Bearer ${token}` : ''
        };
    }

    // ==========================================
    // Formateador de Hora (HH:MM:SS -> HH:MM)
    // ==========================================
    const formatTime = (timeStr) => {
        if (!timeStr) return '';
        // Si ya viene como HH:MM, lo dejamos; si es HH:MM:SS, recortamos
        return timeStr.substring(0, 5);
    };

    // ==========================================
    // Cargar Ajustes (GET)
    // ==========================================
    async function cargarAjustes() {
        try {
            const response = await fetch(API_URL, { method: 'GET', headers: getHeaders() });
            
            if (!response.ok) throw new Error('Error al obtener la configuración');

            const ajustes = await response.json();

            // Si hay datos, rellenamos el formulario
            if (ajustes) {
                ajustesId.value = ajustes.id_barberia || '';
                ajustesNombre.value = ajustes.nombre_comercial || '';
                ajustesDireccion.value = ajustes.direccion || '';
                ajustesTelefono.value = ajustes.telefono_contacto || '';
                ajustesApertura.value = formatTime(ajustes.horario_apertura);
                ajustesCierre.value = formatTime(ajustes.horario_cierre);
                ajustesIntervalo.value = ajustes.intervalo_turno || '';
            }
        } catch (error) {
            console.error(error);
            mostrarToast('No se pudieron cargar los ajustes: ' + error.message, 'error');
        }
    }

    // ==========================================
    // Guardar Ajustes (PUT)
    // ==========================================
    ajustesForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const payload = {
            id_barberia: ajustesId.value || undefined, // Por si el backend necesita el ID
            nombre_comercial: ajustesNombre.value,
            direccion: ajustesDireccion.value,
            telefono_contacto: ajustesTelefono.value,
            horario_apertura: ajustesApertura.value,
            horario_cierre: ajustesCierre.value,
            intervalo_turno: parseInt(ajustesIntervalo.value, 10)
        };

        try {
            const response = await fetch(API_URL, {
                method: 'PUT',
                headers: getHeaders(),
                body: JSON.stringify(payload)
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.message || 'Error al guardar la configuración');
            }
            
            mostrarToast('Configuración guardada correctamente', 'success');
            
            // Refrescar opcional para asegurar sincronización
            cargarAjustes();
        } catch (error) {
            console.error(error);
            mostrarToast(error.message, 'error');
        }
    });

    // ==========================================
    // Lazy Loading y Forzado Inicial
    // ==========================================
    const observer = new MutationObserver((mutations) => {
        mutations.forEach((mutation) => {
            if (mutation.target.id === 'viewAjustes' && mutation.target.style.display !== 'none') {
                // Solo recargamos si el input principal está vacío (como validación básica)
                if (!ajustesNombre.value) {
                    cargarAjustes();
                }
            }
        });
    });

    const viewAjustes = document.getElementById('viewAjustes');
    if (viewAjustes) {
        observer.observe(viewAjustes, { attributes: true, attributeFilter: ['style'] });
        if (viewAjustes.style.display !== 'none') cargarAjustes();
    }

    // Forzar la carga inicial en segundo plano
    cargarAjustes();
});
