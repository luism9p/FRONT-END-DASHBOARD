document.addEventListener('DOMContentLoaded', () => {
    // Referencias al DOM del Modal de Barberos
    const btnNuevoBarbero = document.getElementById('btnNuevoBarbero');
    const barberoModal = document.getElementById('barberoModal');
    const barberoModalClose = document.getElementById('barberoModalClose');
    const barberoModalCancel = document.getElementById('barberoModalCancel');
    const barberoForm = document.getElementById('barberoForm');
    const barberosTableBody = document.getElementById('barberosTableBody');
    const barberoModalTitle = document.getElementById('barberoModalTitle');

    // Referencias para el Modal de Eliminación (Reutilizado)
    const deleteConfirmModal = document.getElementById('deleteConfirmModal');
    const btnConfirmDelete = document.getElementById('btnConfirmDelete');
    let barberoIdAEliminar = null;

    // Referencias para el Modal de Comisiones
    const comisionesModal = document.getElementById('comisionesModal');
    const comisionesForm = document.getElementById('comisionesForm');
    const comisionesModalClose = document.getElementById('comisionesModalClose');
    const comisionesModalCloseBtn = document.getElementById('comisionesModalCloseBtn');
    let comisionBarberoId = null;

    // API config
    const API_URL = 'http://localhost:3000/api/barberos';

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
    // Cargar Barberos (GET)
    // ==========================================
    async function cargarBarberos() {
        try {
            barberosTableBody.innerHTML = '<tr><td colspan="6" style="text-align:center; padding: 1rem;">Cargando barberos...</td></tr>';
            const response = await fetch(API_URL, { method: 'GET', headers: getHeaders() });
            if (!response.ok) throw new Error('Error al obtener los barberos');

            const barberos = await response.json();
            dibujarTabla(barberos);
        } catch (error) {
            console.error(error);
            barberosTableBody.innerHTML = `<tr><td colspan="6" style="text-align:center; padding: 1rem; color: var(--red-500);">${error.message}</td></tr>`;
        }
    }

    // Dibujar Tabla
    function dibujarTabla(barberos) {
        barberosTableBody.innerHTML = '';
        if (!barberos || barberos.length === 0) {
            barberosTableBody.innerHTML = '<tr><td colspan="6" style="text-align:center; padding: 1rem;">No hay barberos registrados.</td></tr>';
            return;
        }

        barberos.forEach(barbero => {
            const tr = document.createElement('tr');
            tr.style.borderBottom = '1px solid var(--surface-border)';

            const estadoBadge = barbero.activo !== false
                ? '<span class="badge badge-confirmed" style="background: var(--green-100); color: var(--green-700); padding: 0.25rem 0.5rem; border-radius: 4px; font-size: 0.875rem;">Activo</span>'
                : '<span class="badge badge-cancelled" style="background: var(--red-100); color: var(--red-700); padding: 0.25rem 0.5rem; border-radius: 4px; font-size: 0.875rem;">Inactivo</span>';

            tr.innerHTML = `
                <td style="padding:1rem; color:var(--surface-900); font-weight: 500;">${barbero.nombre_barbero}</td>
                <td style="padding:1rem;">${barbero.telefono_barbero || '-'}</td>
                <td style="padding:1rem;">${barbero.email_barbero || '-'}</td>
                <td style="padding:1rem;">${barbero.especialidad || '-'}</td>
                <td style="padding:1rem;">${estadoBadge}</td>
                <td style="padding:1rem; text-align:right;">
                    <button class="btn btn-sm btn-comision" title="Calcular Pago">
                        <i class="pi pi-dollar"></i>
                    </button>
                    <button class="btn btn-sm btn-secondary btn-editar" style="padding:0.4rem; margin-right:0.5rem; background: var(--surface-200); border: none; color: var(--surface-700);" title="Editar">
                        <i class="pi pi-pencil"></i>
                    </button>
                    <button class="btn btn-sm btn-danger btn-eliminar" style="padding:0.4rem; background: var(--red-500); border: none; color: white;" title="Eliminar">
                        <i class="pi pi-trash"></i>
                    </button>
                </td>
            `;

            // Pasar datos embebidos al hacer click
            tr.querySelector('.btn-editar').addEventListener('click', () => {
                editarBarbero(
                    barbero.id_barbero,
                    barbero.nombre_barbero,
                    barbero.telefono_barbero,
                    barbero.email_barbero,
                    barbero.especialidad,
                    barbero.activo,
                    barbero.porcentaje_comision
                );
            });

            tr.querySelector('.btn-eliminar').addEventListener('click', () => {
                eliminarBarbero(barbero.id_barbero);
            });

            tr.querySelector('.btn-comision').addEventListener('click', () => {
                abrirComisionesModal(barbero.id_barbero, barbero.nombre_barbero);
            });

            barberosTableBody.appendChild(tr);
        });
    }

    // ==========================================
    // Manejo del Modal Barberos
    // ==========================================
    btnNuevoBarbero.addEventListener('click', () => {
        barberoForm.reset();
        document.getElementById('barberoId').value = '';
        document.getElementById('barberoActivo').checked = true;
        document.getElementById('barberoPorcentaje').value = 50;
        barberoModalTitle.innerHTML = '<i class="pi pi-user" style="margin-right:.5rem;color:var(--primary-color)"></i> Nuevo Barbero';
        barberoModal.classList.add('show');
    });

    function cerrarModal() { barberoModal.classList.remove('show'); }
    barberoModalClose.addEventListener('click', cerrarModal);
    barberoModalCancel.addEventListener('click', cerrarModal);

    function editarBarbero(id, nombre, telefono, email, especialidad, activo, porcentaje) {
        document.getElementById('barberoId').value = id;
        document.getElementById('barberoNombre').value = nombre;
        document.getElementById('barberoTelefono').value = telefono || '';
        document.getElementById('barberoEmail').value = email || '';
        document.getElementById('barberoEspecialidad').value = especialidad || '';
        document.getElementById('barberoActivo').checked = activo !== false;
        document.getElementById('barberoPorcentaje').value = porcentaje != null ? porcentaje : 50;
        
        barberoModalTitle.innerHTML = '<i class="pi pi-pencil" style="margin-right:.5rem;color:var(--primary-color)"></i> Editar Barbero';
        barberoModal.classList.add('show');
    }

    window.editarBarbero = editarBarbero;

    // ==========================================
    // Guardar (POST/PUT)
    // ==========================================
    barberoForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const id = document.getElementById('barberoId').value;
        const payload = {
            nombre_barbero: document.getElementById('barberoNombre').value,
            telefono_barbero: document.getElementById('barberoTelefono').value,
            email_barbero: document.getElementById('barberoEmail').value,
            especialidad: document.getElementById('barberoEspecialidad').value,
            porcentaje_comision: Number(document.getElementById('barberoPorcentaje').value) || 50,
            activo: document.getElementById('barberoActivo').checked
        };

        try {
            let response = await fetch(id ? `${API_URL}/${id}` : API_URL, {
                method: id ? 'PUT' : 'POST',
                headers: getHeaders(),
                body: JSON.stringify(payload)
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.message || 'Error al guardar el barbero');
            }
            
            mostrarToast(id ? 'Barbero actualizado correctamente' : 'Barbero creado correctamente', 'success');
            cerrarModal();
            cargarBarberos();
        } catch (error) {
            console.error(error);
            mostrarToast(error.message, 'error');
        }
    });

    // ==========================================
    // Eliminar (Reutilizando Modal)
    // ==========================================
    function eliminarBarbero(id) {
        barberoIdAEliminar = id;
        const modalTitle = deleteConfirmModal.querySelector('h3');
        if(modalTitle) modalTitle.innerText = '¿Eliminar Barbero?';
        deleteConfirmModal.classList.add('show');
    }

    // Guardia para aislar evento de clientes.js y servicios.js
    btnConfirmDelete.addEventListener('click', async () => {
        if (!barberoIdAEliminar) return; 

        try {
            const response = await fetch(`${API_URL}/${barberoIdAEliminar}`, {
                method: 'DELETE',
                headers: getHeaders()
            });

            if (!response.ok) throw new Error('Error al eliminar el barbero');

            mostrarToast('Barbero eliminado correctamente', 'success');
            deleteConfirmModal.classList.remove('show');
            barberoIdAEliminar = null;
            
            // Recargar tabla
            cargarBarberos();
        } catch (error) {
            console.error(error);
            mostrarToast(error.message, 'error');
            deleteConfirmModal.classList.remove('show');
        }
    });

    // ==========================================
    // Comisiones Modal
    // ==========================================
    function abrirComisionesModal(id, nombre) {
        comisionBarberoId = id;
        document.getElementById('comisionesNombreBarbero').textContent = nombre;
        document.getElementById('comisionesResultados').style.display = 'none';
        document.getElementById('comisionesLoading').style.display = 'none';
        comisionesForm.reset();
        // Default: primera semana del mes actual
        const hoy = new Date();
        const inicio = new Date(hoy.getFullYear(), hoy.getMonth(), 1);
        document.getElementById('comisionInicio').value = formatDateInput(inicio);
        document.getElementById('comisionFin').value = formatDateInput(hoy);
        comisionesModal.classList.add('show');
    }

    function formatDateInput(d) {
        return d.toISOString().split('T')[0];
    }

    function cerrarComisionesModal() {
        comisionesModal.classList.remove('show');
    }

    comisionesModalClose.addEventListener('click', cerrarComisionesModal);
    comisionesModalCloseBtn.addEventListener('click', cerrarComisionesModal);

    comisionesForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const inicio = document.getElementById('comisionInicio').value;
        const fin = document.getElementById('comisionFin').value;
        if (!inicio || !fin) return;

        const resultados = document.getElementById('comisionesResultados');
        const loading = document.getElementById('comisionesLoading');
        resultados.style.display = 'none';
        loading.style.display = 'flex';

        try {
            const response = await fetch(
                `${API_URL}/${comisionBarberoId}/comisiones?inicio=${inicio}&fin=${fin}`,
                { method: 'GET', headers: getHeaders() }
            );
            if (!response.ok) throw new Error('Error al calcular comisiones');
            const data = await response.json();
            renderComisiones(data);
        } catch (error) {
            console.error(error);
            mostrarToast(error.message, 'error');
        } finally {
            loading.style.display = 'none';
        }
    });

    function renderComisiones(data) {
        const { resumen, detalle_citas } = data;
        const resultados = document.getElementById('comisionesResultados');

        // KPI values
        document.getElementById('comKpiPago').textContent = `$${Number(resumen.total_a_pagar_barbero).toFixed(2)}`;
        document.getElementById('comKpiIngreso').textContent = `$${Number(resumen.total_generado_local).toFixed(2)}`;
        document.getElementById('comKpiPorcentaje').textContent = `${resumen.porcentaje}%`;
        document.getElementById('comKpiCitas').textContent = `${resumen.total_citas} citas`;

        // Periodo
        document.getElementById('comPeriodoLabel').innerHTML =
            `<i class="pi pi-clock"></i><span>Periodo: <strong>${resumen.periodo}</strong></span>`;

        // Tabla detalle
        const tbody = document.getElementById('comisionesDetalleBody');
        tbody.innerHTML = '';

        if (!detalle_citas || detalle_citas.length === 0) {
            tbody.innerHTML = `<tr><td colspan="5"><div class="comisiones-empty"><i class="pi pi-inbox"></i><p>No hay citas en este periodo</p></div></td></tr>`;
        } else {
            detalle_citas.forEach(cita => {
                const tr = document.createElement('tr');
                tr.innerHTML = `
                    <td>${formatFecha(cita.fecha)}</td>
                    <td>${cita.hora_inicio ? cita.hora_inicio.slice(0, 5) : '-'}</td>
                    <td>${cita.nombre_servicio || '-'}</td>
                    <td class="precio-cell">$${Number(cita.precio).toFixed(2)}</td>
                    <td class="ganancia-cell">$${Number(cita.ganancia_barbero).toFixed(2)}</td>
                `;
                tbody.appendChild(tr);
            });

            // Fila de totales
            const trTotal = document.createElement('tr');
            trTotal.className = 'fila-total';
            trTotal.innerHTML = `
                <td colspan="3" style="text-align:right;">TOTAL</td>
                <td class="precio-cell">$${Number(resumen.total_generado_local).toFixed(2)}</td>
                <td class="ganancia-cell">$${Number(resumen.total_a_pagar_barbero).toFixed(2)}</td>
            `;
            tbody.appendChild(trTotal);
        }

        resultados.style.display = 'block';
    }

    function formatFecha(fechaStr) {
        if (!fechaStr) return '-';
        // Handle ISO datetime strings like "2026-05-05T05:00:00.000Z"
        const soloFecha = fechaStr.includes('T') ? fechaStr.split('T')[0] : fechaStr;
        const partes = soloFecha.split('-');
        if (partes.length === 3) return `${partes[2]}/${partes[1]}/${partes[0]}`;
        return fechaStr;
    }

    // ==========================================
    // Lazy Loading
    // ==========================================
    const observer = new MutationObserver((mutations) => {
        mutations.forEach((mutation) => {
            if (mutation.target.id === 'viewBarberos' && mutation.target.style.display !== 'none') {
                if (barberosTableBody.innerHTML.trim() === '') cargarBarberos();
            }
        });
    });

    const viewBarberos = document.getElementById('viewBarberos');
    if (viewBarberos) {
        observer.observe(viewBarberos, { attributes: true, attributeFilter: ['style'] });
        if (viewBarberos.style.display !== 'none') cargarBarberos();
    }

    // Forzar la carga inicial en segundo plano
    cargarBarberos();
});
