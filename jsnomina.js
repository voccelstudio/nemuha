// ════════════════════════════════════════
// ÑEMUHA — jsnomina.js
// Nómina y Empleados
// ════════════════════════════════════════

const Nomina = {
    _editId: null,

    render() {
        if (!DB.data.empleados) DB.data.empleados = [];
        if (!DB.data.pagosEmpleados) DB.data.pagosEmpleados = [];
        const mesActual = new Date().toISOString().slice(0, 7);
        const empleadosActivos = DB.data.empleados.filter(e => e.activo !== false);
        const masaSalarial = empleadosActivos.reduce((s, e) => s + (e.salario || 0), 0);
        const pagadoMes = DB.data.pagosEmpleados.filter(p => p.periodo === mesActual).reduce((s, p) => s + p.monto, 0);
        const pendiente = Math.max(0, masaSalarial - pagadoMes);
        const se = (id, v) => { const e = document.getElementById(id); if (e) e.textContent = v; };
        se('nom-stat-masa', FMT.mr(masaSalarial, 'PYG'));
        se('nom-stat-pendiente', FMT.mr(pendiente, 'PYG'));
        se('nom-stat-pagado', FMT.mr(pagadoMes, 'PYG'));
        se('nom-stat-empleados', empleadosActivos.length);
        const meses = [...new Set(DB.data.pagosEmpleados.map(p => p.periodo))].sort().reverse();
        const filtSel = document.getElementById('nom-filtro-mes');
        if (filtSel) { const cur = filtSel.value; filtSel.innerHTML = '<option value="">Todos</option>' + meses.map(m => `<option value="${m}">${m}</option>`).join(''); filtSel.value = cur; }
        this._renderEmpleados(mesActual);
        this._renderHistorial();
    },

    _renderEmpleados(mesActual) {
        const tbody = document.getElementById('nom-empleados'); if (!tbody) return;
        if (!DB.data.empleados.length) { tbody.innerHTML = '<tr><td colspan="8" class="empty-state"><div class="empty-state-icon">📭</div>Sin empleados registrados</td></tr>'; return; }
        const TIPOS = { mensual: '📅 Mensual', quincenal: '📅 Quincenal', semanal: '📅 Semanal', jornal: '📆 Jornal', comision: '💸 Comisión', mixto: '🔀 Mixto' };
        tbody.innerHTML = DB.data.empleados.map(e => {
            const pagadoMes = DB.data.pagosEmpleados.filter(p => p.empleadoId === e.id && p.periodo === mesActual).reduce((s, p) => s + p.monto, 0);
            const ultimoPago = DB.data.pagosEmpleados.filter(p => p.empleadoId === e.id).sort((a, b) => new Date(b.fecha) - new Date(a.fecha))[0];
            const estadoMes = pagadoMes >= (e.salario || 0) ? 'success' : pagadoMes > 0 ? 'warning' : 'danger';
            const estadoLbl = pagadoMes >= (e.salario || 0) ? '✅ Pagado' : pagadoMes > 0 ? '🔶 Parcial' : '⏳ Pendiente';
            return `<tr>
                <td><input type="checkbox" class="nom-emp-check" data-id="${e.id}" onchange="Nomina._updateDeleteBtn()"></td>
                <td><strong>${e.nombre}</strong>${e.ci ? `<br><small class="text-muted">CI: ${e.ci}</small>` : ''}</td>
                <td>${e.cargo || '-'}</td>
                <td class="font-bold">${FMT.mr(e.salario || 0, 'PYG')}</td>
                <td><span class="badge badge-info">${TIPOS[e.tipo] || e.tipo || '-'}</span></td>
                <td>${FMT.date(ultimoPago?.fecha)}</td>
                <td><span class="badge badge-${estadoMes}">${estadoLbl}<br><small>${FMT.mr(pagadoMes, 'PYG')} / ${FMT.mr(e.salario || 0, 'PYG')}</small></span></td>
                <td class="flex gap-1">
                    <button class="btn btn-primary btn-sm" onclick="Nomina.abrirModalPago('${e.id}')">💸 Pagar</button>
                    <button class="btn btn-secondary btn-sm" onclick="Nomina.editarEmpleado('${e.id}')">✏️</button>
                    <button class="btn btn-danger btn-sm" onclick="Nomina.toggleActivo('${e.id}')">${e.activo === false ? '🟢' : '⏸'}</button>
                </td>
            </tr>`;
        }).join('');
    },

    _renderHistorial() {
        const tbody = document.getElementById('nom-historial'); if (!tbody) return;
        const filtro = document.getElementById('nom-filtro-mes')?.value || '';
        let pagos = [...DB.data.pagosEmpleados].filter(p => !filtro || p.periodo === filtro).sort((a, b) => new Date(b.fecha) - new Date(a.fecha));
        if (!pagos.length) { tbody.innerHTML = '<tr><td colspan="6" class="empty-state"><div class="empty-state-icon">📭</div>Sin pagos registrados</td></tr>'; return; }
        tbody.innerHTML = pagos.map(p => {
            const emp = DB.data.empleados.find(e => e.id === p.empleadoId);
            return `<tr>
                <td>${FMT.date(p.fecha)}</td>
                <td><strong>${emp?.nombre || p.empleadoNombre || '-'}</strong></td>
                <td><span class="badge badge-info">${p.concepto || 'salario'}</span></td>
                <td class="font-bold text-success">${FMT.mr(p.monto, 'PYG')}</td>
                <td><span class="badge badge-purple">${p.metodo || 'efectivo'}</span></td>
                <td>${p.periodo || '-'}</td>
            </tr>`;
        }).join('');
    },

    abrirModalEmpleado() {
        this._editId = null;
        document.getElementById('modal-empleado-title').textContent = '👷 Nuevo Empleado';
        ['emp-nombre', 'emp-ci', 'emp-cargo', 'emp-tel', 'emp-notas'].forEach(id => { const e = document.getElementById(id); if (e) e.value = ''; });
        document.getElementById('emp-salario').value = '0';
        document.getElementById('emp-comision').value = '0';
        document.getElementById('emp-tipo').value = 'mensual';
        document.getElementById('emp-ingreso').value = new Date().toISOString().split('T')[0];
        document.getElementById('modal-empleado').classList.add('active');
    },

    editarEmpleado(id) {
        const e = DB.data.empleados.find(x => x.id === id); if (!e) return;
        this._editId = id;
        document.getElementById('modal-empleado-title').textContent = '✏️ Editar Empleado';
        const sv = (elId, v) => { const el = document.getElementById(elId); if (el) el.value = v || ''; };
        sv('emp-nombre', e.nombre); sv('emp-ci', e.ci); sv('emp-cargo', e.cargo); sv('emp-tel', e.telefono);
        sv('emp-salario', e.salario); sv('emp-comision', e.comision); sv('emp-tipo', e.tipo);
        sv('emp-ingreso', e.ingreso?.split('T')[0]); sv('emp-notas', e.notas);
        document.getElementById('modal-empleado').classList.add('active');
    },

    guardarEmpleado() {
        const nombre = document.getElementById('emp-nombre').value.trim();
        if (!nombre) return Toast.show('El nombre es requerido', 'error');
        const emp = {
            nombre, ci: document.getElementById('emp-ci').value,
            cargo: document.getElementById('emp-cargo').value,
            telefono: document.getElementById('emp-tel').value,
            salario: parseInt(document.getElementById('emp-salario').value) || 0,
            comision: parseFloat(document.getElementById('emp-comision').value) || 0,
            tipo: document.getElementById('emp-tipo').value,
            ingreso: document.getElementById('emp-ingreso').value || new Date().toISOString().split('T')[0],
            notas: document.getElementById('emp-notas').value,
            activo: true
        };
        if (this._editId) {
            const idx = DB.data.empleados.findIndex(e => e.id === this._editId);
            if (idx >= 0) DB.data.empleados[idx] = { ...DB.data.empleados[idx], ...emp };
        } else {
            emp.id = 'EMP-' + Date.now();
            DB.data.empleados.push(emp);
        }
        DB.guardar(); Toast.show(`Empleado ${nombre} guardado ✓`);
        this.cerrarModalEmpleado(); this.render();
    },

    cerrarModalEmpleado() { document.getElementById('modal-empleado').classList.remove('active'); this._editId = null; },

    abrirModalPago(empId = null) {
        const sel = document.getElementById('pago-emp-id');
        sel.innerHTML = '<option value="">Seleccionar...</option>' + DB.data.empleados.filter(e => e.activo !== false).map(e => `<option value="${e.id}">${e.nombre}</option>`).join('');
        if (empId) { sel.value = empId; this.onEmpChange(); }
        document.getElementById('pago-emp-monto').value = '';
        document.getElementById('pago-emp-notas').value = '';
        document.getElementById('pago-emp-metodo').value = 'efectivo';
        document.getElementById('pago-emp-concepto').value = 'salario';
        document.getElementById('pago-emp-periodo').value = new Date().toISOString().slice(0, 7);
        document.getElementById('modal-pago-empleado').classList.add('active');
    },

    onEmpChange() {
        const empId = document.getElementById('pago-emp-id').value;
        const infoEl = document.getElementById('pago-emp-info');
        if (!empId) { infoEl.style.display = 'none'; return; }
        const emp = DB.data.empleados.find(e => e.id === empId); if (!emp) return;
        const periodo = document.getElementById('pago-emp-periodo').value || new Date().toISOString().slice(0, 7);
        const pagado = DB.data.pagosEmpleados.filter(p => p.empleadoId === empId && p.periodo === periodo).reduce((s, p) => s + p.monto, 0);
        const pendiente = Math.max(0, (emp.salario || 0) - pagado);
        document.getElementById('pago-emp-salario').textContent = FMT.mr(emp.salario || 0, 'PYG');
        document.getElementById('pago-emp-pagado').textContent = FMT.mr(pagado, 'PYG');
        document.getElementById('pago-emp-pendiente').textContent = FMT.mr(pendiente, 'PYG');
        infoEl.style.display = 'block';
        if (!document.getElementById('pago-emp-monto').value) document.getElementById('pago-emp-monto').value = pendiente;
    },

    guardarPago() {
        const empId = document.getElementById('pago-emp-id').value;
        if (!empId) return Toast.show('Selecciona un empleado', 'error');
        const monto = parseFloat(document.getElementById('pago-emp-monto').value) || 0;
        if (monto <= 0) return Toast.show('Ingresa un monto válido', 'error');
        const emp = DB.data.empleados.find(e => e.id === empId);
        const metodo = document.getElementById('pago-emp-metodo').value;
        const pago = {
            id: 'PEMP-' + Date.now(),
            fecha: new Date().toISOString(),
            empleadoId: empId,
            empleadoNombre: emp?.nombre || '-',
            monto, metodo,
            concepto: document.getElementById('pago-emp-concepto').value,
            periodo: document.getElementById('pago-emp-periodo').value || new Date().toISOString().slice(0, 7),
            notas: document.getElementById('pago-emp-notas').value
        };
        DB.data.pagosEmpleados.push(pago);
        if (metodo === 'efectivo') DB.movCaja('salida', `Salario ${emp?.nombre || ''} (${pago.concepto})`, monto, 'PYG');
        DB.guardar();
        Toast.show(`Pago de ${FMT.mr(monto, 'PYG')} a ${emp?.nombre} registrado ✓`);
        this.cerrarModalPago(); this.render();
    },

    cerrarModalPago() { document.getElementById('modal-pago-empleado').classList.remove('active'); },

    toggleActivo(id) {
        const e = DB.data.empleados.find(x => x.id === id); if (!e) return;
        e.activo = e.activo === false ? true : false;
        DB.guardar(); this.render(); Toast.show(`${e.nombre} ${e.activo ? 'activado' : 'desactivado'}`);
    },

    toggleSelectAll(cb) { document.querySelectorAll('.nom-emp-check').forEach(c => c.checked = cb.checked); this._updateDeleteBtn(); },

    _updateDeleteBtn() {
        const sel = document.querySelectorAll('.nom-emp-check:checked');
        const btn = document.getElementById('btn-eliminar-empleado');
        if (btn) btn.style.display = sel.length > 0 ? '' : 'none';
    },

    eliminarSeleccionado() {
        const ids = [...document.querySelectorAll('.nom-emp-check:checked')].map(c => c.dataset.id);
        if (!ids.length) return;
        if (!confirm(`¿Eliminar ${ids.length} empleado(s)? Esta acción no se puede deshacer.`)) return;
        DB.data.empleados = DB.data.empleados.filter(e => !ids.includes(e.id));
        DB.guardar(); this.render();
        document.getElementById('btn-eliminar-empleado').style.display = 'none';
        Toast.show(`${ids.length} empleado(s) eliminado(s)`, 'success');
    }
};
