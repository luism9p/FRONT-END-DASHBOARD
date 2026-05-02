document.addEventListener('DOMContentLoaded', () => {
    // Referencias al DOM
    const btnNuevoServicio = document.getElementById('btnNuevoServicio');
    const servicioModal = document.getElementById('servicioModal');
    const servicioModalClose = document.getElementById('servicioModalClose');
    const servicioModalCancel = document.getElementById('servicioModalCancel');
    const servicioForm = document.getElementById('servicioForm');
    const serviciosTableBody = document.getElementById('serviciosTableBody');
    const servicioModalTitle = document.getElementById('servicioModalTitle');

    // Referencias para el Modal de Eliminación (Misión 1)
    const deleteConfirmModal = document.getElementById('deleteConfirmModal');
    const btnCancelDelete = document.getElementById('btnCancelDelete');
    const btnConfirmDelete = document.getElementById('btnConfirmDelete');
    let servicioIdAEliminar = null;

    // API config
    const API_URL = 'http://localhost:3000/api/servicios';

    // ==========================================
    // Sistema de Notificaciones Toast (Misión)
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

        let iconClass = 'pi pi-info-circle';
        let iconColor = 'var(--primary-color)';
        let title = 'Notificación';

        if (tipo === 'success') {
            iconClass = 'pi pi-check-circle';
            iconColor = 'var(--green-500)';
            title = 'Éxito';
        } else if (tipo === 'error') {
            iconClass = 'pi pi-times-circle';
            iconColor = 'var(--red-500)';
            title = 'Error';
        }

        toast.innerHTML = `
            <i class="${iconClass}" style="color: ${iconColor}; font-size: 1.5rem;"></i>
            <div class="toast-message">
                <div class="toast-title">${title}</div>
                <div class="toast-text">${mensaje}</div>
            </div>
            <button class="modal-close" style="margin-left: auto; border: none; background: transparent; cursor: pointer;" onclick="this.parentElement.remove()"><i class="pi pi-times"></i></button>
        `;

        container.appendChild(toast);

        // Auto-destrucción suave
        setTimeout(() => {
            toast.style.transition = 'all 0.3s ease';
            toast.style.opacity = '0';
            toast.style.transform = 'translateX(100px)';
            setTimeout(() => {
                if (toast.parentElement) toast.remove();
            }, 300);
        }, 3000);
    }

    // Helper para armar Headers de fetch
    function getHeaders() {
        const token = localStorage.getItem('token');
        return {
            'Content-Type': 'application/json',
            'Authorization': token ? `Bearer ${token}` : ''
        };
    }

    // ==========================================
    // Cargar Servicios (GET)
    // ==========================================
    async function cargarServicios() {
        try {
            serviciosTableBody.innerHTML = '<tr><td colspan="5" style="text-align:center; padding: 1rem;">Cargando servicios...</td></tr>';

            const response = await fetch(API_URL, {
                method: 'GET',
                headers: getHeaders()
            });

            if (!response.ok) throw new Error('Error al obtener los servicios');

            const servicios = await response.json();
            dibujarTabla(servicios);

        } catch (error) {
            console.error(error);
            serviciosTableBody.innerHTML = `<tr><td colspan="5" style="text-align:center; padding: 1rem; color: var(--red-500);">${error.message}</td></tr>`;
        }
    }

    // Dibujar las filas de la tabla dinámicamente
    function dibujarTabla(servicios) {
        serviciosTableBody.innerHTML = '';

        if (!servicios || servicios.length === 0) {
            serviciosTableBody.innerHTML = '<tr><td colspan="5" style="text-align:center; padding: 1rem;">No hay servicios registrados.</td></tr>';
            return;
        }

        servicios.forEach(servicio => {
            const tr = document.createElement('tr');
            tr.style.borderBottom = '1px solid var(--surface-border)';

            const estadoBadge = servicio.activo !== false
                ? '<span class="badge badge-confirmed" style="background: var(--green-100); color: var(--green-700); padding: 0.25rem 0.5rem; border-radius: 4px; font-size: 0.875rem;">Activo</span>'
                : '<span class="badge badge-cancelled" style="background: var(--red-100); color: var(--red-700); padding: 0.25rem 0.5rem; border-radius: 4px; font-size: 0.875rem;">Inactivo</span>';

            tr.innerHTML = `
                <td style="padding:1rem; color:var(--surface-900); font-weight: 500;">${servicio.nombre_servicio}</td>
                <td style="padding:1rem;">${servicio.duracion_minutos} min</td>
                <td style="padding:1rem;">$${parseFloat(servicio.precio).toFixed(2)}</td>
                <td style="padding:1rem;">${estadoBadge}</td>
                <td style="padding:1rem; text-align:right;">
                    <button class="btn btn-sm btn-secondary btn-editar" style="padding:0.4rem; margin-right:0.5rem; background: var(--surface-200); border: none; color: var(--surface-700);" title="Editar">
                        <i class="pi pi-pencil"></i>
                    </button>
                    <button class="btn btn-sm btn-danger btn-eliminar" style="padding:0.4rem; background: var(--red-500); border: none; color: white;" title="Eliminar">
                        <i class="pi pi-trash"></i>
                    </button>
                </td>
            `;

            // Misión 2: Pasar todos los datos renderizados a la función de edición
            tr.querySelector('.btn-editar').addEventListener('click', () => {
                editarServicio(
                    servicio.id_servicio,
                    servicio.nombre_servicio,
                    servicio.duracion_minutos,
                    servicio.precio,
                    servicio.activo
                );
            });

            // Misión 1: Disparar el modal de eliminación con el ID
            tr.querySelector('.btn-eliminar').addEventListener('click', () => {
                eliminarServicio(servicio.id_servicio);
            });

            serviciosTableBody.appendChild(tr);
        });
    }

    // ==========================================
    // Manejo del Modal
    // ==========================================
    btnNuevoServicio.addEventListener('click', () => {
        servicioForm.reset();
        document.getElementById('servicioId').value = '';
        servicioModalTitle.innerHTML = '<i class="pi pi-briefcase" style="margin-right:.5rem;color:var(--primary-color)"></i> Nuevo Servicio';
        servicioModal.classList.add('show');
    });

    function cerrarModal() {
        servicioModal.classList.remove('show');
    }

    servicioModalClose.addEventListener('click', cerrarModal);
    servicioModalCancel.addEventListener('click', cerrarModal);

    // ==========================================
    // Guardar Servicio (POST/PUT)
    // ==========================================
    servicioForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        const id = document.getElementById('servicioId').value;
        const nombre = document.getElementById('servicioNombre').value;
        const duracion = parseInt(document.getElementById('servicioDuracion').value, 10);
        const precio = parseFloat(document.getElementById('servicioPrecio').value);
        const activo = document.getElementById('servicioActivo').checked;

        const payload = { nombre, duracion, precio, activo };

        try {
            let response;
            if (id) {
                // Editar (PUT)
                response = await fetch(`${API_URL}/${id}`, {
                    method: 'PUT',
                    headers: getHeaders(),
                    body: JSON.stringify(payload)
                });
            } else {
                // Crear (POST)
                response = await fetch(API_URL, {
                    method: 'POST',
                    headers: getHeaders(),
                    body: JSON.stringify(payload)
                });
            }

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.message || 'Error al guardar el servicio');
            }

            mostrarToast(id ? 'Servicio actualizado correctamente' : 'Servicio creado correctamente', 'success');
            cerrarModal();
            cargarServicios(); // Refrescar la tabla

        } catch (error) {
            console.error(error);
            mostrarToast(error.message, 'error');
        }
    });

    // ==========================================
    // Cargar datos para edición (Misión 2 - Optimizado sin fetch extra)
    // ==========================================
    function editarServicio(id, nombre, duracion, precio, activo) {
        document.getElementById('servicioId').value = id;
        document.getElementById('servicioNombre').value = nombre;
        document.getElementById('servicioDuracion').value = duracion;
        document.getElementById('servicioPrecio').value = precio;
        document.getElementById('servicioActivo').checked = activo !== false;

        servicioModalTitle.innerHTML = '<i class="pi pi-pencil" style="margin-right:.5rem;color:var(--primary-color)"></i> Editar Servicio';
        servicioModal.classList.add('show');
    }

    // ==========================================
    // Eliminar Servicio (Misión 1 - Modal Personalizado)
    // ==========================================
    function eliminarServicio(id) {
        servicioIdAEliminar = id;
        deleteConfirmModal.classList.add('show'); // Abrimos el nuevo modal
    }

    // Cancelar la eliminación cerrando el modal
    btnCancelDelete.addEventListener('click', () => {
        deleteConfirmModal.classList.remove('show');
        servicioIdAEliminar = null;
    });

    // Confirmar la eliminación disparando el fetch (DELETE)
    btnConfirmDelete.addEventListener('click', async () => {
        if (!servicioIdAEliminar) return;

        try {
            const response = await fetch(`${API_URL}/${servicioIdAEliminar}`, {
                method: 'DELETE',
                headers: getHeaders()
            });

            if (!response.ok) throw new Error('Error al eliminar el servicio');

            mostrarToast('Servicio eliminado correctamente', 'success');

            // Limpiar y cerrar modal
            deleteConfirmModal.classList.remove('show');
            servicioIdAEliminar = null;

            // Recargar tabla
            cargarServicios();

        } catch (error) {
            console.error(error);
            mostrarToast(error.message, 'error');
            deleteConfirmModal.classList.remove('show');
        }
    });

    // ==========================================
    // Carga de datos perezosa (Lazy loading)
    // ==========================================
    // Dispara la carga de datos solo cuando la vista "Servicios" se vuelve visible
    const observer = new MutationObserver((mutations) => {
        mutations.forEach((mutation) => {
            if (mutation.target.id === 'viewServicios' && mutation.target.style.display !== 'none') {
                if (serviciosTableBody.innerHTML.trim() === '') {
                    cargarServicios();
                }
            }
        });
    });

    const viewServicios = document.getElementById('viewServicios');
    if (viewServicios) {
        observer.observe(viewServicios, { attributes: true, attributeFilter: ['style'] });

        // Si el usuario refresca estando en esta vista activa por defecto
        if (viewServicios.style.display !== 'none') {
            cargarServicios();
        }
    }

    // Forzar la carga inicial en segundo plano
    cargarServicios();
});
