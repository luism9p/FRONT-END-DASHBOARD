// La variable citasGlobales se declara en calendario.js
document.addEventListener('DOMContentLoaded', () => {
    // Referencias al DOM del Modal de Citas
    const btnNuevaCita = document.getElementById('btnNuevaCita');
    const btnExportarExcel = document.getElementById('btnExportarExcel');
    const citaModal = document.getElementById('citaModal');
    const citaModalClose = document.getElementById('citaModalClose');
    const citaModalCancel = document.getElementById('citaModalCancel');
    const citaForm = document.getElementById('citaForm');
    const citasTableBody = document.getElementById('citasTableBody');
    const citaModalTitle = document.getElementById('citaModalTitle');

    // Select de servicios
    const idServicioCita = document.getElementById('idServicioCita');

    // Referencias para el Modal de Eliminación (Reutilizado)
    const deleteConfirmModal = document.getElementById('deleteConfirmModal');
    const btnConfirmDelete = document.getElementById('btnConfirmDelete');
    let citaIdAEliminar = null;

    // API configs
    const API_CITAS = 'http://localhost:3000/api/citas';
    const API_SERVICIOS = 'http://localhost:3000/api/servicios';

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
        return {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer ' + localStorage.getItem('barberia_token')
        };
    }

    // ==========================================
    // Cargar Servicios (GET) para el Select
    // ==========================================
    async function cargarServiciosParaCitas() {
        try {
            const response = await fetch(API_SERVICIOS, { method: 'GET', headers: getHeaders() });
            if (!response.ok) throw new Error('Error al obtener los servicios');

            const servicios = await response.json();

            idServicioCita.innerHTML = '<option value="">Seleccione un servicio...</option>';

            // Filtrar solo los servicios activos
            servicios.forEach(servicio => {
                if (servicio.activo !== false) {
                    const option = document.createElement('option');
                    option.value = servicio.id_servicio;
                    option.textContent = `${servicio.nombre_servicio} ($${servicio.precio})`;
                    idServicioCita.appendChild(option);
                }
            });
        } catch (error) {
            console.error(error);
            mostrarToast('No se pudieron cargar los servicios: ' + error.message, 'error');
        }
    }

    // ==========================================
    // Cargar Clientes y Barberos (GET) para Selects
    // ==========================================
    async function cargarOpcionesModal() {
        try {
            const [clientesRes, barberosRes] = await Promise.all([
                fetch('http://localhost:3000/api/clientes', { method: 'GET', headers: getHeaders() }),
                fetch('http://localhost:3000/api/barberos', { method: 'GET', headers: getHeaders() })
            ]);

            if (!clientesRes.ok || !barberosRes.ok) throw new Error('Error al obtener clientes o barberos');

            const clientes = await clientesRes.json();
            const barberos = await barberosRes.json();

            const selectCliente = document.getElementById('cita-cliente');
            const selectBarbero = document.getElementById('cita-barbero');

            if (selectCliente) {
                selectCliente.innerHTML = '<option value="">Seleccione un cliente...</option>';
                clientes.forEach(cliente => {
                    const option = document.createElement('option');
                    option.value = cliente.id_cliente;
                    option.textContent = cliente.nombre;
                    selectCliente.appendChild(option);
                });
            }

            if (selectBarbero) {
                selectBarbero.innerHTML = '<option value="">Seleccione un barbero...</option>';
                barberos.forEach(barbero => {
                    if (barbero.activo !== false) {
                        const option = document.createElement('option');
                        option.value = barbero.id_barbero || barbero.id;
                        option.textContent = barbero.nombre || barbero.nombre_barbero || barbero.nombre_completo || 'Barbero';
                        selectBarbero.appendChild(option);
                    }
                });
            }
        } catch (error) {
            console.error(error);
            mostrarToast('Error al cargar opciones: ' + error.message, 'error');
        }
    }

    // ==========================================
    // Cargar Citas (GET) para la Tabla y Reactividad
    // ==========================================
    async function cargarTablaCitas() {
        try {
            citasTableBody.innerHTML = '<tr><td colspan="7" style="text-align:center; padding: 1rem;">Cargando citas...</td></tr>';
            const response = await fetch(API_CITAS, { method: 'GET', headers: getHeaders() });
            if (!response.ok) throw new Error('Error al obtener las citas');

            const data = await response.json();

            // 1. Actualizar variable global
            citasGlobales = data;

            // 2. Redibujar la tabla
            dibujarTabla(citasGlobales);

            // 3. Actualizar el Calendario (Reactividad visual)
            if (window.calendar) {
                window.calendar.removeAllEvents();
                window.calendar.addEventSource(citasGlobales);
            }

            // 4. Actualizar el Dashboard en tiempo real
            actualizarTarjetasDashboard(citasGlobales);

        } catch (error) {
            console.error(error);
            citasTableBody.innerHTML = `<tr><td colspan="7" style="text-align:center; padding: 1rem; color: var(--red-500);">${error.message}</td></tr>`;
        }
    }

    // Exponer la función globalmente para que otros archivos puedan llamarla
    window.cargarTablaCitas = cargarTablaCitas;

    // Función extra: Actualizar tarjetas del Dashboard localmente
    function actualizarTarjetasDashboard(citas) {
        let ingresos = 0;
        let canceladas = 0;

        citas.forEach(cita => {
            const props = cita.extendedProps || cita;
            const estado = (props.estado || '').toLowerCase();
            const precio = parseFloat(props.precio) || 0;

            if (estado.includes('cancelada')) {
                canceladas++;
            } else {
                ingresos += precio;
            }
        });

        const statIngresos = document.getElementById('stat-ingresos');
        const statCanceladas = document.getElementById('stat-canceladas');

        if (statIngresos) statIngresos.innerText = `$${ingresos.toFixed(2)}`;
        if (statCanceladas) statCanceladas.innerText = canceladas;

        // Llama a la original por si acaso tienes otros KPIs en el backend
        if (typeof window.actualizarEstadisticas === 'function') {
            window.actualizarEstadisticas();
        }
    }

    // Dibujar Tabla de Citas
    function dibujarTabla(citas) {
        citasTableBody.innerHTML = '';
        if (!citas || citas.length === 0) {
            citasTableBody.innerHTML = '<tr><td colspan="7" style="text-align:center; padding: 1rem;">No hay citas registradas.</td></tr>';
            return;
        }

        citas.forEach(cita => {
            // Soportar tanto formato FullCalendar (extendedProps) como objeto plano de la BD
            const props = cita.extendedProps || cita;
            const idCita = cita.id_cita || props.id_cita;

            if (!idCita) return; // Si no existe el id_cita, saltamos este registro

            const tr = document.createElement('tr');
            tr.style.borderBottom = '1px solid var(--surface-border)';

            let badgeClass = 'badge-pending';
            let badgeBg = 'var(--orange-100)';
            let badgeColor = 'var(--orange-700)';

            if (props.estado === 'confirmada' || props.estado === 'completada') {
                badgeClass = 'badge-confirmed';
                badgeBg = 'var(--green-100)';
                badgeColor = 'var(--green-700)';
            } else if (props.estado === 'cancelada') {
                badgeClass = 'badge-cancelled';
                badgeBg = 'var(--red-100)';
                badgeColor = 'var(--red-700)';
            }

            const estadoBadge = `<span class="badge ${badgeClass}" style="background: ${badgeBg}; color: ${badgeColor}; padding: 0.25rem 0.5rem; border-radius: 4px; font-size: 0.875rem; text-transform: capitalize;">${props.estado || 'Pendiente'}</span>`;

            // Formatear hora (HH:MM)
            const horaStr = props.hora_inicio ? props.hora_inicio.substring(0, 5) : '-';

            tr.innerHTML = `
                <td style="padding:1rem; color:var(--surface-900); font-weight: 500;">${props.fecha_formateada || props.fecha || '-'}</td>
                <td style="padding:1rem;">${horaStr}</td>
                <td style="padding:1rem;">${props.nombre_cliente || '-'}</td>
                <td style="padding:1rem;">${props.nombre_barbero || '-'}</td>
                <td style="padding:1rem;">${props.nombre_servicio || '-'}</td>
                <td style="padding:1rem;">${estadoBadge}</td>
                <td style="padding:1rem; text-align:right;">
                    <button class="btn btn-sm btn-danger btn-eliminar" data-id="${idCita}" style="padding:0.4rem; background: var(--red-500); border: none; color: white;" title="Eliminar Cita">
                        <i class="pi pi-trash"></i>
                    </button>
                </td>
            `;

            // Capturamos el id leyendo el atributo data-id del botón en el que se hizo click
            tr.querySelector('.btn-eliminar').addEventListener('click', (e) => {
                const capturedId = e.target.closest('button').dataset.id;
                eliminarCita(capturedId);
            });

            citasTableBody.appendChild(tr);
        });
    }

    // ==========================================
    // Manejo del Modal Citas
    // ==========================================
    btnNuevaCita.addEventListener('click', async () => {
        citaForm.reset();
        document.getElementById('citaId').value = '';

        // Forzar recarga de clientes y barberos para tener datos frescos
        await cargarOpcionesModal();
        // Opcionalmente, puedes descomentar esto si también cambian los servicios sin recargar
        // await cargarServiciosParaCitas();

        citaModalTitle.innerHTML = '<i class="pi pi-calendar-plus" style="margin-right:.5rem;color:var(--primary-color)"></i> Nueva Cita';
        citaModal.classList.add('show');
    });

    function cerrarModal() { citaModal.classList.remove('show'); }
    citaModalClose.addEventListener('click', cerrarModal);
    citaModalCancel.addEventListener('click', cerrarModal);

    // ==========================================
    // Guardar Cita (POST)
    // ==========================================
    citaForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        // El prompt pide enviar: id_cliente, id_barbero, id_servicio, fecha, hora_inicio, notas
        const payload = {
            id_cliente: document.getElementById('cita-cliente').value,
            id_barbero: document.getElementById('cita-barbero').value,
            id_servicio: document.getElementById('idServicioCita').value,
            fecha: document.getElementById('citaFecha').value,
            hora_inicio: document.getElementById('citaHora').value,
            notas: document.getElementById('citaNotas').value
        };

        try {
            const response = await fetch(API_CITAS, {
                method: 'POST',
                headers: getHeaders(),
                body: JSON.stringify(payload)
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.message || 'Error al guardar la cita');
            }

            mostrarToast('Cita creada correctamente', 'success');
            cerrarModal();

            // Evitar duplicados limpiando el calendario antes de la recarga
            if (window.calendar) {
                window.calendar.removeAllEvents();
            }

            cargarTablaCitas();
        } catch (error) {
            console.error(error);
            mostrarToast(error.message, 'error');
        }
    });

    // ==========================================
    // Eliminar Cita (Reutilizando Modal)
    // ==========================================
    function eliminarCita(id) {
        citaIdAEliminar = id;
        const modalTitle = deleteConfirmModal.querySelector('h3');
        if (modalTitle) modalTitle.innerText = '¿Eliminar Cita?';
        deleteConfirmModal.classList.add('show');
    }

    // Guardia para aislar evento de los otros CRUDs
    btnConfirmDelete.addEventListener('click', async () => {
        if (!citaIdAEliminar) return;

        try {
            const response = await fetch(`${API_CITAS}/${citaIdAEliminar}`, {
                method: 'DELETE',
                headers: getHeaders()
            });

            if (!response.ok) throw new Error('Error al eliminar la cita');

            mostrarToast('Cita eliminada correctamente', 'success');
            deleteConfirmModal.classList.remove('show');
            citaIdAEliminar = null;

            // Recargar tabla
            cargarTablaCitas();

            // Opcional: refrescar FullCalendar si está en la vista
            if (window.calendar) {
                window.calendar.refetchEvents();
            }

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
    // Lazy Loading
    // ==========================================
    const observer = new MutationObserver((mutations) => {
        mutations.forEach((mutation) => {
            if (mutation.target.id === 'viewCitas' && mutation.target.style.display !== 'none') {
                if (citasTableBody.innerHTML.trim() === '') cargarTablaCitas();
            }
        });
    });

    const viewCitas = document.getElementById('viewCitas');
    if (viewCitas) {
        observer.observe(viewCitas, { attributes: true, attributeFilter: ['style'] });
        if (viewCitas.style.display !== 'none') cargarTablaCitas();
    }

    // ==========================================
    // Reactivar Cita
    // ==========================================
    window.reactivarCita = async function (id) {
        try {
            const response = await fetch(`http://localhost:3000/api/citas/reactivar/${id}`, {
                method: 'PUT',
                headers: getHeaders()
            });

            if (response.ok) {
                // Cierra el modal de Bootstrap/Personalizado si está abierto
                const appointmentModal = document.getElementById('appointmentModal');
                if (appointmentModal) appointmentModal.style.display = 'none';

                // Refresco total
                cargarTablaCitas();

                // SweetAlert2 Profesional
                Swal.fire({
                    title: 'Éxito',
                    text: 'La cita fue reactivada',
                    icon: 'success',
                    timer: 2000,
                    showConfirmButton: false
                });

                if (typeof window.cargarCitasBackend === 'function') {
                    await window.cargarCitasBackend();
                }
            } else {
                Swal.fire({ title: 'Error', text: 'No se pudo reactivar la cita', icon: 'error', timer: 2000, showConfirmButton: false });
            }
        } catch (error) {
            console.error(error);
            mostrarToast('Error de conexión', 'error');
        }
    };

    // ==========================================
    // Exportar Citas a Excel (SheetJS)
    // ==========================================
    function exportarCitasAExcel() {
        if (!citasGlobales || citasGlobales.length === 0) {
            mostrarToast('No hay citas para exportar', 'error');
            return;
        }

        // 1. Cálculos Previos
        let totalCitas = citasGlobales.length;
        let citasCanceladas = 0;
        let ingresosEstimados = 0;

        citasGlobales.forEach(cita => {
            const props = cita.extendedProps || cita;
            const estado = (props.estado || '').toLowerCase();
            const precio = parseFloat(props.precio) || 0;

            if (estado.includes('cancelada')) {
                citasCanceladas++;
            } else {
                ingresosEstimados += precio;
            }
        });

        // 2. Estructura del Documento (Arreglo de Arreglos)
        const aoa = [
            ["Reporte de Citas - FlowHive"],
            [], // Fila vacía para dar respiro
            ["Resumen del Periodo:"],
            ["Total de Citas:", totalCitas],
            ["Citas Canceladas:", citasCanceladas],
            ["Ingresos Estimados:", "$" + ingresosEstimados.toFixed(2)],
            [], // Fila vacía antes de las cabeceras
            ["Fecha", "Hora", "Cliente", "Barbero", "Servicio", "Precio", "Estado"] // Cabeceras
        ];

        // 3. Inserción de Datos
        citasGlobales.forEach(cita => {
            const props = cita.extendedProps || cita;

            // Extracción y limpieza de datos
            const fecha = props.fecha_formateada || props.fecha || '-';
            const hora = props.hora_inicio ? props.hora_inicio.substring(0, 5) : '-';
            const cliente = props.nombre_cliente || '-';
            const barbero = props.nombre_barbero || '-';
            const servicio = props.nombre_servicio || '-';

            // Formateo del precio
            const precioVal = parseFloat(props.precio) || 0;
            const precioStr = "$" + precioVal.toFixed(2);

            // Capitalizar la primera letra del estado
            const estadoStr = props.estado || 'pendiente';
            const estado = estadoStr.charAt(0).toUpperCase() + estadoStr.slice(1);

            // Agregar la fila de la cita al AoA
            aoa.push([fecha, hora, cliente, barbero, servicio, precioStr, estado]);
        });

        // 4. Renderizado SheetJS y Estilos (xlsx-js-style)
        // Convertir el Arreglo de Arreglos en una hoja de trabajo de Excel
        const hoja = XLSX.utils.aoa_to_sheet(aoa);

        // Aplicar estilos a las celdas
        Object.keys(hoja).forEach(key => {
            // Ignorar propiedades especiales de SheetJS (empiezan con !)
            if (key.startsWith('!')) return;

            const celda = hoja[key];
            const columna = key.replace(/[0-9]/g, '');
            const fila = parseInt(key.replace(/[^0-9]/g, ''));

            // Definición de bordes delgados
            const bordesDelgados = {
                top: { style: 'thin' },
                bottom: { style: 'thin' },
                left: { style: 'thin' },
                right: { style: 'thin' }
            };

            // Fila 1: Título Principal
            if (fila === 1) {
                celda.s = {
                    font: { bold: true, sz: 14 }
                };
            }
            // Filas 3 a 6: Resumen (Columna A en negrita)
            else if (fila >= 3 && fila <= 6) {
                if (columna === 'A') {
                    celda.s = {
                        font: { bold: true }
                    };
                }
            }
            // Fila 8: Cabeceras de la Tabla
            else if (fila === 8) {
                celda.s = {
                    fill: { fgColor: { rgb: "1F2937" } },
                    font: { color: { rgb: "FFFFFF" }, bold: true },
                    alignment: { horizontal: "center", vertical: "center" },
                    border: bordesDelgados
                };
            }
            // Fila 9 en adelante: Datos de la Tabla
            else if (fila >= 9) {
                celda.s = {
                    border: bordesDelgados
                };
            }
        });

        // Configurar el ancho de las columnas usando la propiedad !cols
        hoja['!cols'] = [
            { wch: 15 }, // Fecha
            { wch: 10 }, // Hora
            { wch: 25 }, // Cliente
            { wch: 20 }, // Barbero
            { wch: 30 }, // Servicio
            { wch: 10 }, // Precio
            { wch: 15 }  // Estado
        ];

        // Crear un nuevo libro de trabajo
        const libro = XLSX.utils.book_new();

        // Agregar la hoja creada al libro de trabajo
        XLSX.utils.book_append_sheet(libro, hoja, "Reporte");

        // Disparar la descarga del archivo XLSX
        XLSX.writeFile(libro, "Reporte_Citas_FlowHive.xlsx");
    }

    if (btnExportarExcel) {
        btnExportarExcel.addEventListener('click', exportarCitasAExcel);
    }

    // ==========================================
    // Exportar Citas a PDF
    // ==========================================
    const btnExportarPDF = document.getElementById('btnExportarPDF');

    function exportarCitasAPDF() {
        if (!citasGlobales || citasGlobales.length === 0) {
            mostrarToast('No hay citas para exportar', 'error');
            return;
        }

        // 1. Inicializar el documento
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF();

        // 2. Agregar Título centrado
        const title = "Reporte de Citas - FlowHive";
        doc.setFontSize(18);
        doc.setTextColor(40, 40, 40);
        // Calcular la coordenada X para centrar el texto
        const textWidth = doc.getStringUnitWidth(title) * doc.internal.getFontSize() / doc.internal.scaleFactor;
        const textOffset = (doc.internal.pageSize.width - textWidth) / 2;
        doc.text(title, textOffset, 20);

        // 3. Cálculos de Estadísticas (Resumen Financiero)
        let totalCitas = citasGlobales.length;
        let citasCanceladas = 0;
        let ingresosTotales = 0;

        citasGlobales.forEach(cita => {
            const props = cita.extendedProps || cita;
            // Forzamos todo a minúsculas para que no haya errores
            const estado = (props.estado || '').toLowerCase();
            const precio = parseFloat(props.precio) || 0;

            // Si el estado INCLUYE la palabra 'cancelada' (ej. cancelada_admin, Cancelada)
            if (estado.includes('cancelada')) {
                citasCanceladas++;
            } else {
                ingresosTotales += precio;
            }
        });

        // 4. Imprimir Resumen en el PDF
        doc.setFontSize(12);
        doc.setFont("helvetica", "bold");
        doc.text("Resumen del Periodo:", 14, 32);

        doc.setFontSize(10);
        doc.setFont("helvetica", "normal");
        doc.text(`Total de Citas: ${totalCitas}`, 14, 38);
        doc.text(`Citas Canceladas: ${citasCanceladas}`, 14, 44);
        doc.text(`Ingresos Estimados: $${ingresosTotales.toFixed(2)}`, 14, 50);

        // 5. Preparar columnas y mapear filas (Añadiendo Precio)
        const head = [["Fecha", "Hora", "Cliente", "Barbero", "Servicio", "Precio", "Estado"]];
        const body = citasGlobales.map(cita => {
            const props = cita.extendedProps || cita;

            const fecha = props.fecha_formateada || props.fecha || '-';
            const hora = props.hora_inicio ? props.hora_inicio.substring(0, 5) : '-';
            const cliente = props.nombre_cliente || '-';
            const barbero = props.nombre_barbero || '-';
            const servicio = props.nombre_servicio || '-';

            // Procesar Precio
            const precioVal = parseFloat(props.precio) || 0;
            const precioStr = `$${precioVal.toFixed(2)}`;

            // Capitalizar la primera letra del estado
            const estadoStr = props.estado || 'pendiente';
            const estado = estadoStr.charAt(0).toUpperCase() + estadoStr.slice(1);

            return [fecha, hora, cliente, barbero, servicio, precioStr, estado];
        });

        // 6. Dibujar la tabla autoTable (Desplazada hacia abajo con startY: 58)
        doc.autoTable({
            head: head,
            body: body,
            startY: 58, // Inicia debajo del resumen
            theme: 'grid', // Estilo en cuadrícula
            styles: {
                fontSize: 10,
                cellPadding: 3
            },
            headStyles: {
                fillColor: [30, 41, 59], // Color moderno estilo pizarra para la cabecera
                textColor: [255, 255, 255],
                fontStyle: 'bold',
                halign: 'center'
            },
            columnStyles: {
                0: { halign: 'center' }, // Fecha
                1: { halign: 'center' }, // Hora
                5: { halign: 'right' },  // Precio (alineado a la derecha por buenas prácticas financieras)
                6: { halign: 'center' }  // Estado
            }
        });

        // 7. Generar Nombre Dinámico (YYYY-MM-DD)
        const hoy = new Date();
        const year = hoy.getFullYear();
        const month = String(hoy.getMonth() + 1).padStart(2, '0');
        const day = String(hoy.getDate()).padStart(2, '0');
        const nombreArchivo = `reporte_citas_${year}-${month}-${day}.pdf`;

        // 8. Guardar y descargar el archivo
        doc.save(nombreArchivo);
    }

    // Agregar el listener al botón (asegurar que el DOM ya cargó)
    if (btnExportarPDF) {
        btnExportarPDF.addEventListener('click', exportarCitasAPDF);
    }

    // Forzar la carga inicial de los catálogos y la tabla
    cargarServiciosParaCitas();
    cargarOpcionesModal();
    cargarTablaCitas();
});
