document.addEventListener('DOMContentLoaded', () => {
    // Referencias al DOM del Modal de Clientes
    const btnNuevoCliente = document.getElementById('btnNuevoCliente');
    const clienteModal = document.getElementById('clienteModal');
    const clienteModalClose = document.getElementById('clienteModalClose');
    const clienteModalCancel = document.getElementById('clienteModalCancel');
    const clienteForm = document.getElementById('clienteForm');
    const clientesTableBody = document.getElementById('clientesTableBody');
    const clienteModalTitle = document.getElementById('clienteModalTitle');

    // Referencias para el Modal de Eliminación (Reutilizado)
    const deleteConfirmModal = document.getElementById('deleteConfirmModal');
    const btnCancelDelete = document.getElementById('btnCancelDelete');
    const btnConfirmDelete = document.getElementById('btnConfirmDelete');
    let clienteIdAEliminar = null;

    // API config
    const API_URL = 'http://localhost:3000/api/clientes';

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
            setTimeout(() => {
                if (toast.parentElement) toast.remove();
            }, 300);
        }, 3000);
    }

    // Helper para armar Headers de fetch
    function getHeaders() {
        const token = localStorage.getItem('barberia_token');
        return {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
        };
    }

    // ==========================================
    // CRM — Modal de Perfil Avanzado del Cliente
    // ==========================================
    const crmPerfilModal = document.getElementById('crmPerfilModal');
    const crmModalClose = document.getElementById('crmModalClose');
    const crmModalCloseBtn = document.getElementById('crmModalCloseBtn');

    function cerrarCrmModal() {
        crmPerfilModal.classList.remove('show');
    }

    if (crmModalClose) crmModalClose.addEventListener('click', cerrarCrmModal);
    if (crmModalCloseBtn) crmModalCloseBtn.addEventListener('click', cerrarCrmModal);

    // Close on overlay click
    if (crmPerfilModal) {
        crmPerfilModal.addEventListener('click', (e) => {
            if (e.target === crmPerfilModal) cerrarCrmModal();
        });
    }

    /**
     * Abre el modal CRM y consume GET /api/clientes/:id/historial
     */
    async function abrirPerfilCRM(idCliente) {
        // Show modal with loading state
        const historialBody = document.getElementById('crmHistorialBody');
        const kpiGrid = document.getElementById('crmKpiGrid');
        const historialSection = document.querySelector('.crm-historial-section');

        // Reset to loading state
        document.getElementById('crmAvatar').textContent = '…';
        document.getElementById('crmNombre').textContent = 'Cargando…';
        document.getElementById('crmTelefono').textContent = '—';
        document.getElementById('crmEmail').textContent = '—';
        document.getElementById('crmTotalCitas').textContent = '—';
        document.getElementById('crmTotalGastado').textContent = '—';
        document.getElementById('crmServicioFav').textContent = '—';
        document.getElementById('crmBarberoFav').textContent = '—';
        historialBody.innerHTML = '<tr><td colspan="6" style="text-align:center; padding:1.5rem; color:var(--text-color-secondary)"><i class="pi pi-spin pi-spinner" style="font-size:1.25rem"></i> Cargando historial…</td></tr>';

        crmPerfilModal.classList.add('show');

        try {
            const response = await fetch(`${API_URL}/${idCliente}/historial`, {
                method: 'GET',
                headers: getHeaders()
            });

            if (!response.ok) throw new Error('Error al obtener el perfil del cliente');

            const data = await response.json();

            if (!data.success) throw new Error('La API respondió con un error');

            // --- Populate Header ---
            const cliente = data.cliente;
            const nombre = cliente.nombre || 'Sin nombre';
            const initials = nombre.split(' ').map(p => p.charAt(0).toUpperCase()).slice(0, 2).join('');

            document.getElementById('crmAvatar').textContent = initials;
            document.getElementById('crmNombre').textContent = nombre;
            document.getElementById('crmTelefono').textContent = cliente.telefono || 'No registrado';
            document.getElementById('crmEmail').textContent = cliente.email || 'No registrado';

            // --- Populate KPIs ---
            const stats = data.estadisticas || {};
            document.getElementById('crmTotalCitas').textContent = stats.total_citas ?? 0;

            const totalGastado = parseFloat(stats.total_gastado || 0);
            document.getElementById('crmTotalGastado').textContent = '$' + totalGastado.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

            document.getElementById('crmServicioFav').textContent = stats.servicio_favorito || 'N/A';
            document.getElementById('crmBarberoFav').textContent = stats.barbero_favorito || 'N/A';

            // --- Populate Historial Table ---
            const historial = data.historial || [];
            historialBody.innerHTML = '';

            if (historial.length === 0) {
                historialBody.innerHTML = `
                    <tr>
                        <td colspan="6">
                            <div class="crm-empty">
                                <i class="pi pi-calendar-times"></i>
                                <p>Este cliente aún no tiene citas registradas.</p>
                            </div>
                        </td>
                    </tr>`;
                return;
            }

            historial.forEach(cita => {
                // Map estado to badge class
                let badgeClass = 'badge-pending';
                let estadoLabel = cita.estado || 'pendiente';
                if (estadoLabel.toLowerCase() === 'confirmada') badgeClass = 'badge-confirmed';
                else if (estadoLabel.toLowerCase() === 'cancelada') badgeClass = 'badge-cancelled';

                // Format date
                let fechaFormatted = cita.fecha;
                try {
                    const d = new Date(cita.fecha);
                    if (!isNaN(d)) fechaFormatted = d.toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' });
                } catch (_) { /* keep original */ }

                // Format hora
                const hora = cita.hora_inicio ? cita.hora_inicio.substring(0, 5) : '—';

                // Format precio
                const precio = cita.precio != null ? '$' + parseFloat(cita.precio).toFixed(2) : '—';

                const tr = document.createElement('tr');
                tr.innerHTML = `
                    <td>${fechaFormatted}</td>
                    <td>${hora}</td>
                    <td style="font-weight:500">${cita.nombre_servicio || '—'}</td>
                    <td>${cita.nombre_barbero || '—'}</td>
                    <td style="font-weight:600">${precio}</td>
                    <td><span class="badge ${badgeClass}">${estadoLabel.charAt(0).toUpperCase() + estadoLabel.slice(1)}</span></td>
                `;
                historialBody.appendChild(tr);
            });

        } catch (error) {
            console.error('Error CRM:', error);
            historialBody.innerHTML = `<tr><td colspan="6" style="text-align:center; padding:1.5rem; color:var(--red-500)"><i class="pi pi-exclamation-triangle" style="margin-right:.5rem"></i>${error.message}</td></tr>`;
        }
    }

    // ==========================================
    // Cargar Clientes (GET)
    // ==========================================
    async function cargarClientes() {
        try {
            clientesTableBody.innerHTML = '<tr><td colspan="5" style="text-align:center; padding: 1rem;">Cargando clientes...</td></tr>';
            
            const response = await fetch(API_URL, {
                method: 'GET',
                headers: getHeaders()
            });

            if (!response.ok) throw new Error('Error al obtener los clientes');

            const clientes = await response.json();
            dibujarTabla(clientes);

        } catch (error) {
            console.error(error);
            clientesTableBody.innerHTML = `<tr><td colspan="5" style="text-align:center; padding: 1rem; color: var(--red-500);">${error.message}</td></tr>`;
        }
    }

    // Dibujar las filas de la tabla dinámicamente
    function dibujarTabla(clientes) {
        clientesTableBody.innerHTML = '';

        if (!clientes || clientes.length === 0) {
            clientesTableBody.innerHTML = '<tr><td colspan="5" style="text-align:center; padding: 1rem;">No hay clientes registrados.</td></tr>';
            return;
        }

        clientes.forEach(cliente => {
            const tr = document.createElement('tr');
            tr.style.borderBottom = '1px solid var(--surface-border)';

            tr.innerHTML = `
                <td style="padding:1rem; color:var(--surface-900); font-weight: 500;">${cliente.nombre}</td>
                <td style="padding:1rem;">${cliente.telefono || '-'}</td>
                <td style="padding:1rem;">${cliente.email || '-'}</td>
                <td style="padding:1rem;">${cliente.notas || '-'}</td>
                <td style="padding:1rem; text-align:right;">
                    <button class="btn btn-sm btn-ver-perfil" style="padding:0.4rem; margin-right:0.5rem; background: var(--primary-50); border: 1px solid var(--primary-200); color: var(--primary-color);" title="Ver Perfil">
                        <i class="pi pi-eye"></i>
                    </button>
                    <button class="btn btn-sm btn-secondary btn-editar" style="padding:0.4rem; margin-right:0.5rem; background: var(--surface-200); border: none; color: var(--surface-700);" title="Editar">
                        <i class="pi pi-pencil"></i>
                    </button>
                    <button class="btn btn-sm btn-danger btn-eliminar" style="padding:0.4rem; background: var(--red-500); border: none; color: white;" title="Eliminar">
                        <i class="pi pi-trash"></i>
                    </button>
                </td>
            `;

            // Asignar evento de Ver Perfil CRM
            tr.querySelector('.btn-ver-perfil').addEventListener('click', () => {
                abrirPerfilCRM(cliente.id_cliente);
            });

            // Asignar evento de edición
            tr.querySelector('.btn-editar').addEventListener('click', () => {
                editarCliente(
                    cliente.id_cliente,
                    cliente.nombre,
                    cliente.telefono,
                    cliente.email,
                    cliente.notas
                );
            });

            // Asignar evento de eliminación
            tr.querySelector('.btn-eliminar').addEventListener('click', () => {
                eliminarCliente(cliente.id_cliente);
            });

            clientesTableBody.appendChild(tr);
        });
    }

    // ==========================================
    // Manejo del Modal de Creación/Edición
    // ==========================================
    btnNuevoCliente.addEventListener('click', () => {
        clienteForm.reset();
        document.getElementById('clienteId').value = '';
        clienteModalTitle.innerHTML = '<i class="pi pi-user" style="margin-right:.5rem;color:var(--primary-color)"></i> Nuevo Cliente';
        clienteModal.classList.add('show');
    });

    function cerrarModal() {
        clienteModal.classList.remove('show');
    }
    
    clienteModalClose.addEventListener('click', cerrarModal);
    clienteModalCancel.addEventListener('click', cerrarModal);

    // ==========================================
    // Cargar datos para edición (Misión 2 - Optimizado sin fetch extra)
    // ==========================================
    function editarCliente(id, nombre, telefono, email, notas) {
        document.getElementById('clienteId').value = id;
        document.getElementById('clienteNombre').value = nombre;
        document.getElementById('clienteTelefono').value = telefono || '';
        document.getElementById('clienteEmail').value = email || '';
        document.getElementById('clienteNotas').value = notas || '';

        clienteModalTitle.innerHTML = '<i class="pi pi-pencil" style="margin-right:.5rem;color:var(--primary-color)"></i> Editar Cliente';
        clienteModal.classList.add('show');
    }

    // Si quieres usarlo con onclick="editarCliente(...)" en el HTML (no recomendado con vanilla js encapsulado, pero solicitado en el prompt):
    window.editarCliente = editarCliente;

    // ==========================================
    // Guardar Cliente (POST/PUT)
    // ==========================================
    clienteForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        const id = document.getElementById('clienteId').value;
        const nombre = document.getElementById('clienteNombre').value;
        const telefono = document.getElementById('clienteTelefono').value;
        const email = document.getElementById('clienteEmail').value;
        const notas = document.getElementById('clienteNotas').value;

        const payload = { nombre, telefono, email, notas };

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
                throw new Error(errorData.message || 'Error al guardar el cliente');
            }

            mostrarToast(id ? 'Cliente actualizado correctamente' : 'Cliente creado correctamente', 'success');
            cerrarModal();
            cargarClientes(); // Refrescar la tabla

        } catch (error) {
            console.error(error);
            mostrarToast(error.message, 'error');
        }
    });

    // ==========================================
    // Eliminar Cliente (Reutilizando Modal de Confirmación)
    // ==========================================
    function eliminarCliente(id) {
        clienteIdAEliminar = id;
        
        // Cambiar título dinámicamente si existe (opcional pero UX friendly)
        const modalTitle = deleteConfirmModal.querySelector('h3');
        if(modalTitle) modalTitle.innerText = '¿Eliminar Cliente?';
        
        deleteConfirmModal.classList.add('show');
    }

    // Confirmar la eliminación disparando el fetch (DELETE)
    // NOTA: Como servicios.js tiene su propio listener, usamos una guardia (if !clienteIdAEliminar)
    // para asegurar que esta función solo se ejecute cuando se intenta eliminar un CLIENTE.
    btnConfirmDelete.addEventListener('click', async () => {
        if (!clienteIdAEliminar) return; // Si es null, es porque estamos borrando un Servicio.

        try {
            const response = await fetch(`${API_URL}/${clienteIdAEliminar}`, {
                method: 'DELETE',
                headers: getHeaders()
            });

            if (!response.ok) throw new Error('Error al eliminar el cliente');

            mostrarToast('Cliente eliminado correctamente', 'success');
            
            // Limpiar y cerrar modal
            deleteConfirmModal.classList.remove('show');
            clienteIdAEliminar = null;
            
            // Restaurar título del modal para servicios (por limpieza)
            const modalTitle = deleteConfirmModal.querySelector('h3');
            if(modalTitle) modalTitle.innerText = '¿Eliminar Servicio?';
            
            // Recargar tabla
            cargarClientes();

            // Actualizar estadísticas del dashboard
            if (window.actualizarEstadisticas) {
                window.actualizarEstadisticas();
            }

        } catch (error) {
            console.error(error);
            mostrarToast(error.message, 'error');
            deleteConfirmModal.classList.remove('show');
        }
    });

    // ==========================================
    // Carga de datos perezosa (Lazy loading)
    // ==========================================
    // Dispara la carga de datos solo cuando la vista "Clientes" se vuelve visible
    const observer = new MutationObserver((mutations) => {
        mutations.forEach((mutation) => {
            if (mutation.target.id === 'viewClientes' && mutation.target.style.display !== 'none') {
                if (clientesTableBody.innerHTML.trim() === '') {
                    cargarClientes();
                }
            }
        });
    });

    const viewClientes = document.getElementById('viewClientes');
    if (viewClientes) {
        observer.observe(viewClientes, { attributes: true, attributeFilter: ['style'] });
        
        if (viewClientes.style.display !== 'none') {
            cargarClientes();
        }
    }

    // Forzar la carga inicial en segundo plano
    cargarClientes();
});
