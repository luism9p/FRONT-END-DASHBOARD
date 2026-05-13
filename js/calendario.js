let citasGlobales = []; // Declaración global para todo el proyecto

document.addEventListener('DOMContentLoaded', function () {
    let filtroActual = 'all'; // Variable global para saber qué filtro está activo
    let citaActualId = null;

    const calendarEl = document.getElementById('calendar');

    // Elementos del Modal
    const appointmentModal = document.getElementById('appointmentModal');
    const rescheduleModal = document.getElementById('rescheduleModal');


    // Función global para notificaciones hermosas
    const mostrarToast = (mensaje, tipo) => {
        Swal.fire({
            toast: true, position: 'top-end',
            icon: tipo, title: mensaje,
            showConfirmButton: false, timer: 3000
        });
    };

    // --- 1. FUNCIÓN PARA ACTUALIZAR NÚMEROS REALES (KPIs) ---
    function actualizarKPIs(citas) {
        let hoy = 0, confirmadas = 0, pendientes = 0, canceladas = 0;
        const fechaHoyStr = new Date().toISOString().split('T')[0];

        citas.forEach(cita => {
            const estado = cita.extendedProps ? cita.extendedProps.estado : (cita.estado || cita.estado_cita || '');
            if (estado === 'confirmada') confirmadas++;
            if (estado === 'pendiente') pendientes++;
            if (estado === 'cancelada') canceladas++;

            const fechaCita = cita.fecha || (cita.start ? cita.start.split('T')[0] : '');
            if (fechaCita === fechaHoyStr) hoy++;
        });

        if (document.getElementById('kpiToday')) document.getElementById('kpiToday').textContent = hoy;
        if (document.getElementById('kpiConfirmed')) document.getElementById('kpiConfirmed').textContent = confirmadas;
        if (document.getElementById('kpiPending')) document.getElementById('kpiPending').textContent = pendientes;
        if (document.getElementById('kpiCancelled')) document.getElementById('kpiCancelled').textContent = canceladas;
    }

    // --- 2. INICIALIZAR EL CALENDARIO ---
    if (!calendarEl) return;

    window.calendar = new FullCalendar.Calendar(calendarEl, {
        initialView: 'timeGridWeek',
        locale: 'es',
        slotMinTime: '08:00:00',
        slotMaxTime: '22:00:00',
        allDaySlot: false,
        height: 'auto',

        headerToolbar: {
            left: 'title',
            center: '',
            right: 'prev,next' // Al no poner "today", el botón azul desaparece
        },

        eventClick: function (info) {
            info.jsEvent.preventDefault();
            const evento = info.event;
            const citaId = info.event.id || info.event.extendedProps.id_cita;
            citaActualId = citaId;

            // Formatear textos
            const opcionesFecha = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' };
            document.getElementById('modalService').textContent = evento.title;
            document.getElementById('modalDate').textContent = evento.start.toLocaleDateString('es-ES', opcionesFecha);

            const estado = evento.extendedProps.estado || 'pendiente';
            const modalStatus = document.getElementById('modalStatus');
            modalStatus.textContent = estado.toUpperCase();

            if (estado === 'confirmada') modalStatus.style.color = '#28a745';
            else if (estado === 'cancelada') modalStatus.style.color = '#dc3545';
            else modalStatus.style.color = '#ffc107';

            document.getElementById('modalClient').textContent = "Cliente Registrado";
            document.getElementById('modalBarber').textContent = "Barbero Asignado";

            // --- NUEVO: VALIDACIÓN PARA OCULTAR O MOSTRAR BOTONES SEGÚN ESTADO ---
            const modalCancelBtn = document.getElementById('modalCancelBtn');
            let btnReactivar = document.getElementById('btnReactivar');

            if (!btnReactivar) {
                btnReactivar = document.createElement('button');
                btnReactivar.id = 'btnReactivar';
                btnReactivar.className = 'btn btn-success btn-sm';
                btnReactivar.style.backgroundColor = 'var(--green-500)';
                btnReactivar.style.border = 'none';
                btnReactivar.style.color = 'white';
                btnReactivar.style.padding = '0.5rem 1rem';
                btnReactivar.style.borderRadius = '4px';
                btnReactivar.style.cursor = 'pointer';
                btnReactivar.innerHTML = '<i class="pi pi-check-circle"></i> Reactivar Cita';

                if (modalCancelBtn && modalCancelBtn.parentNode) {
                    modalCancelBtn.parentNode.insertBefore(btnReactivar, modalCancelBtn);
                }
            }

            if (btnReactivar) {
                btnReactivar.setAttribute('data-id', citaId);
                btnReactivar.onclick = function () {
                    const id = this.getAttribute('data-id');
                    if (typeof window.reactivarCita === 'function') {
                        window.reactivarCita(id);
                    } else if (typeof reactivarCitaHandler === 'function') {
                        // Fallback por si usan el handler local
                        citaActualId = id;
                        reactivarCitaHandler({ target: this });
                    }
                };
            }

            if (modalCancelBtn) {
                modalCancelBtn.setAttribute('data-id', citaId);
                modalCancelBtn.onclick = function () {
                    const id = this.getAttribute('data-id');
                    if (typeof window.cancelarCita === 'function') {
                        window.cancelarCita(id);
                    }
                };
            }

            const modalRescheduleBtn = document.getElementById('modalRescheduleBtn');

            if (estado.toLowerCase().includes('cancelada')) {
                if (modalCancelBtn) modalCancelBtn.style.display = 'none';
                if (btnReactivar) btnReactivar.style.display = 'inline-flex';
                if (modalRescheduleBtn) modalRescheduleBtn.style.display = 'none';
            } else {
                if (modalCancelBtn) modalCancelBtn.style.display = 'inline-flex';
                if (btnReactivar) btnReactivar.style.display = 'none';
                if (modalRescheduleBtn) modalRescheduleBtn.style.display = 'inline-flex';
            }

            appointmentModal.style.display = 'flex';
        }
    });
    calendar.render();

    window.cargarCitasBackend = async function () {
        try {
            const response = await fetch('http://localhost:3000/api/citas', {
                headers: { 'Authorization': 'Bearer ' + localStorage.getItem('barberia_token') }
            });
            if (!response.ok) throw new Error('Error de conexión');

            window.citasGlobales = await response.json();
            actualizarKPIs(window.citasGlobales);

            // Una vez cargada la data, forzamos el renderizado inicial
            window.filtrarCalendario('all');
        } catch (error) {
            console.error('Error al cargar backend:', error);
        }
    };

    window.cargarCitasBackend();

    window.filtroEstadoActual = 'all';

    window.filtrarCalendario = function (tipo) {
        if (!window.calendar || !window.citasGlobales) return;

        window.filtroEstadoActual = tipo;

        if (tipo === 'today') {
            window.calendar.today();
        }

        // 1. Limpieza absoluta del DOM
        window.calendar.removeAllEvents();

        // 2. Mapeo de colores y formato
        const citasMapeadas = window.citasGlobales.map(cita => {
            const props = cita.extendedProps || cita;
            const id = cita.id || cita.id_cita || props.id_cita || `temp-${Math.random()}`;
            const title = cita.title || `${props.nombre_servicio || cita.nombre_servicio || 'Servicio'} - ${props.nombre_cliente || cita.nombre_cliente || 'Cliente'}`;

            let start = cita.start || (props.fecha && props.hora_inicio ? `${props.fecha}T${props.hora_inicio}` : '');
            let end = cita.end || (props.fecha && props.hora_fin ? `${props.fecha}T${props.hora_fin}` : '');

            const estadoSeguro = (cita.estado || cita.estado_cita || cita.status || props.estado || props.estado_cita || props.status || '').toString().toLowerCase();

            let bgColor = '#3b82f6'; let borderColor = '#2563eb';
            if (estadoSeguro.includes('cancelada')) { bgColor = '#ef4444'; borderColor = '#dc2626'; }
            else if (estadoSeguro.includes('confirmada')) { bgColor = '#22c55e'; borderColor = '#16a34a'; }

            return {
                id: String(id), title: title, start: start, end: end,
                backgroundColor: bgColor, borderColor: borderColor,
                extendedProps: { ...cita, ...props, estadoSeguro: estadoSeguro }
            };
        });

        // 3. Filtrado
        const citasFiltradas = citasMapeadas.filter(cita => {
            const estado = cita.extendedProps.estadoSeguro;
            if (tipo === 'all') return true;
            if (tipo === 'confirmada') return estado.includes('confirmada');
            if (tipo === 'cancelada') return estado.includes('cancelada');
            if (tipo === 'today') {
                const hoy = new Date();
                const hoyStr = `${hoy.getFullYear()}-${String(hoy.getMonth() + 1).padStart(2, '0')}-${String(hoy.getDate()).padStart(2, '0')}`;
                return cita.start && cita.start.startsWith(hoyStr);
            }
            return false;
        });

        // 4. Inyección manual limpia
        citasFiltradas.forEach(evento => {
            window.calendar.addEvent(evento);
        });
    };

    // --- ESCUCHAR LOS BOTONES DE FILTRO ---
    const botonesFiltro = document.querySelectorAll('.filter-btn');

    botonesFiltro.forEach(boton => {
        boton.addEventListener('click', (e) => {
            // Quitar clase activa a todos
            botonesFiltro.forEach(btn => btn.classList.remove('active'));

            // Poner clase activa al seleccionado
            e.target.classList.add('active');

            // Leer el tipo de filtro del atributo 'data-filter'
            const tipo = e.target.getAttribute('data-filter');

            // Llamar a la función centralizada
            window.filtrarCalendario(tipo);
        });
    });

    // --- 4. LÓGICA DE MODALES Y BOTONES ---

    // Cerrar modales
    const cerrarModal = () => appointmentModal.style.display = 'none';
    document.getElementById('modalCloseBtn')?.addEventListener('click', cerrarModal);
    document.getElementById('modalClose')?.addEventListener('click', cerrarModal);
    document.getElementById('rescheduleClose')?.addEventListener('click', () => rescheduleModal.style.display = 'none');
    document.getElementById('rescheduleCancel')?.addEventListener('click', () => rescheduleModal.style.display = 'none');

    // Botón: Abrir modal de Reprogramar
    document.getElementById('modalRescheduleBtn')?.addEventListener('click', () => {
        appointmentModal.style.display = 'none';
        rescheduleModal.style.display = 'flex';
    });

    // Botón: Confirmar Reprogramación
    document.getElementById('rescheduleConfirm')?.addEventListener('click', async (e) => {
        const btn = e.target;
        const newDate = document.getElementById('newDate').value;
        const newTime = document.getElementById('newTime').value;

        if (!newDate || !newTime) return mostrarToast("Selecciona fecha y hora", "error");

        btn.innerHTML = 'Guardando...';
        try {
            const response = await fetch(`http://localhost:3000/api/citas/reprogramar/${citaActualId}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': 'Bearer ' + localStorage.getItem('barberia_token')
                },
                body: JSON.stringify({ nuevaFecha: newDate, nuevaHora: newTime })
            });
            if (response.ok) {
                rescheduleModal.style.display = 'none';
                if (window.cargarCitasBackend) window.cargarCitasBackend();
                window.actualizarEstadisticas();
                mostrarToast("Cita reprogramada con éxito", "success");
            } else mostrarToast("Error al reprogramar", "error");
        } catch (error) {
            mostrarToast("Error de servidor", "error");
        } finally {
            btn.innerHTML = '<i class="pi pi-check"></i> Confirmar';
        }
    });

    // Botón: Cancelar Cita (Rojo)
    window.cancelarCita = async (id) => {
        // 1. Alerta de confirmación hermosa
        const confirmacion = await Swal.fire({
            title: '¿Estás seguro?',
            text: "La cita será marcada como cancelada.",
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#d33',
            cancelButtonColor: '#3085d6',
            confirmButtonText: 'Sí, cancelar cita',
            cancelButtonText: 'No, volver'
        });

        // Si el usuario dice que no, nos detenemos aquí
        if (!confirmacion.isConfirmed) return;

        const btn = document.getElementById('modalCancelBtn');
        if (btn) btn.innerHTML = 'Cancelando...';
        try {
            const response = await fetch(`http://localhost:3000/api/citas/cancelar/${id}`, {
                method: 'PUT',
                headers: {
                    'Authorization': 'Bearer ' + localStorage.getItem('barberia_token')
                }
            });

            if (response.ok) {
                cerrarModal(); // Si este es tu método para cerrar el modal

                // Refresco total de la tabla y UI
                if (typeof window.cargarTablaCitas === 'function') {
                    window.cargarTablaCitas();
                }

                Swal.fire({
                    title: 'Éxito',
                    text: 'La cita fue cancelada',
                    icon: 'success',
                    timer: 2000,
                    showConfirmButton: false
                });

                if (typeof window.cargarCitasBackend === 'function') {
                    await window.cargarCitasBackend();
                }
            } else {
                Swal.fire({ title: 'Error', text: 'No se pudo cancelar la cita', icon: 'error', timer: 2000, showConfirmButton: false });
            }
        } catch (error) {
            console.error(error);
            mostrarToast("Error de servidor", "error");
        } finally {
            if (btn) btn.innerHTML = '<i class="pi pi-times"></i> Cancelar Cita';
        }
    };

    // --- FUNCIÓN PARA REACTIVAR CITAS CANCELADAS ---
    async function reactivarCitaHandler(e) {
        if (!citaActualId) return;

        const btn = e.target.closest('button');
        const contenidoOriginal = btn.innerHTML;
        btn.innerHTML = 'Reactivando...';

        try {
            const response = await fetch(`http://localhost:3000/api/citas/reactivar/${citaActualId}`, {
                method: 'PUT',
                headers: {
                    'Authorization': 'Bearer ' + localStorage.getItem('barberia_token')
                }
            });

            if (response.ok) {
                document.getElementById('appointmentModal').style.display = 'none';
                
                if (typeof window.actualizarEstadisticas === 'function') {
                    window.actualizarEstadisticas();
                }
                if (typeof window.cargarTablaCitas === 'function') {
                    window.cargarTablaCitas();
                }
                mostrarToast("Cita reactivada exitosamente", "success");

                if (typeof window.cargarCitasBackend === 'function') {
                    await window.cargarCitasBackend();
                }
            } else {
                mostrarToast("No se pudo reactivar la cita", "error");
            }
        } catch (error) {
            console.error("Error al reactivar:", error);
            mostrarToast("Error de conexión", "error");
        } finally {
            btn.innerHTML = contenidoOriginal;
        }
    }
});