// ════════════════════════════════════════
// ÑEMUHA — jsui.js
// UI helpers: Backup, Entidades, Vendedores,
// PagosProveedores, Pedidos, Reportes,
// Temas, DeviceAPI
// ════════════════════════════════════════

// ── Backup Excel + JSON ──
const Backup = {

    exportarJSON() { DB.exportarJSON(); Toast.show('Backup JSON exportado ✓'); },

    exportarExcel() {
        if (typeof XLSX === 'undefined') return Toast.show('SheetJS no cargó. Verificá tu conexión.', 'error');
        const wb = XLSX.utils.book_new();
        const fecha = new Date().toISOString().split('T')[0];

        const ventasData = [
            ['Factura', 'Fecha', 'Cliente', 'Vendedor', 'Método', 'Subtotal PYG', 'IVA PYG', 'Total PYG', 'Estado'],
            ...DB.data.ventas.map(v => [v.id, v.fecha ? new Date(v.fecha).toLocaleDateString('es-PY') : '', v.cliente?.nombre || 'Ocasional', v.vendedor?.nombre || '-', v.metodo || '-', v.subtotal || 0, v.iva || 0, v.total || 0, v.estado || '-'])
        ];
        const wsV = XLSX.utils.aoa_to_sheet(ventasData);
        wsV['!cols'] = [{ wch: 18 }, { wch: 14 }, { wch: 22 }, { wch: 18 }, { wch: 14 }, { wch: 14 }, { wch: 12 }, { wch: 14 }, { wch: 10 }];
        XLSX.utils.book_append_sheet(wb, wsV, 'Ventas');

        const comprasData = [
            ['N° Compra', 'Fecha', 'Proveedor', 'Items', 'Total PYG', 'Condición', 'Factura Prov.'],
            ...DB.data.compras.map(c => [c.id, c.fecha ? new Date(c.fecha).toLocaleDateString('es-PY') : '', c.proveedor?.nombre || '-', c.items?.length || 0, c.total || 0, c.condicion || '-', c.facturaProv || '-'])
        ];
        const wsC = XLSX.utils.aoa_to_sheet(comprasData);
        wsC['!cols'] = [{ wch: 18 }, { wch: 14 }, { wch: 22 }, { wch: 8 }, { wch: 14 }, { wch: 12 }, { wch: 16 }];
        XLSX.utils.book_append_sheet(wb, wsC, 'Compras');

        const invData = [
            ['Código', 'Nombre', 'Categoría', 'Stock', 'Costo Promedio PYG', 'Precio Venta PYG', 'Margen %', 'Origen'],
            ...DB.data.productos.map(p => [p.codigo, p.nombre, p.categoria || 'general', p.stock || 0, p.costoPromedio || p.costo || 0, p.precio || 0, p.margen || 0, p.origen || 'compra'])
        ];
        const wsI = XLSX.utils.aoa_to_sheet(invData);
        wsI['!cols'] = [{ wch: 14 }, { wch: 28 }, { wch: 14 }, { wch: 8 }, { wch: 18 }, { wch: 18 }, { wch: 10 }, { wch: 12 }];
        XLSX.utils.book_append_sheet(wb, wsI, 'Inventario');

        XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([
            ['ID', 'Nombre', 'RUC/CI', 'Teléfono', 'Email', 'Dirección', 'Límite Crédito PYG'],
            ...DB.data.clientes.map(c => [c.id, c.nombre, c.ruc || '', c.telefono || '', c.email || '', c.direccion || '', c.limiteCredito || 0])
        ]), 'Clientes');

        XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([
            ['ID', 'Razón Social', 'RUC', 'Teléfono', 'Email'],
            ...DB.data.proveedores.map(p => [p.id, p.nombre, p.ruc || '', p.telefono || '', p.email || ''])
        ]), 'Proveedores');

        XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([
            ['ID', 'Nombre', 'CI', 'Teléfono', 'Email', 'Comisión %', 'Activo'],
            ...DB.data.vendedores.map(v => [v.id, v.nombre, v.ci || '', v.telefono || '', v.email || '', v.comision || 0, v.activo ? 'Sí' : 'No'])
        ]), 'Vendedores');

        XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([
            ['ID', 'Fecha', 'Proveedor', 'Compra Ref.', 'Concepto', 'Monto', 'Moneda', 'Método'],
            ...(DB.data.pagosProveedores || []).map(p => [p.id, p.fecha ? new Date(p.fecha).toLocaleDateString('es-PY') : '', p.proveedor?.nombre || '-', p.compraId || '-', p.concepto || '-', p.monto || 0, p.moneda || 'PYG', p.metodo || '-'])
        ]), 'Pagos Proveedores');

        const movs = DB.cajaHoy?.movimientos || [];
        XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([
            ['Hora', 'Tipo', 'Concepto', 'Moneda', 'Monto'],
            ...movs.map(m => [m.hora, m.tipo, m.concepto, m.moneda || 'PYG', m.monto || 0])
        ]), 'Caja Hoy');

        XLSX.writeFile(wb, `erp_export_${fecha}.xlsx`);
        Toast.show('Excel exportado con todas las tablas ✓', 'success');
    }
};

// ── Entidades (Clientes / Proveedores) ──
const Entidades = {
    guardar(tipo) {
        const nombre = document.getElementById(`${tipo}-nombre`).value.trim();
        if (!nombre) return;
        const obj = { id: DB.id(tipo), nombre, ruc: document.getElementById(`${tipo}-ruc`)?.value || '', telefono: document.getElementById(`${tipo}-tel`)?.value || '', email: document.getElementById(`${tipo}-email`)?.value || '', creado: new Date().toISOString() };
        if (tipo === 'clientes') { obj.direccion = document.getElementById('clientes-direccion')?.value || ''; obj.limiteCredito = parseInt(document.getElementById('cliente-limite')?.value) || 0; obj.creditoUsado = 0; }
        DB.data[tipo].push(obj); DB.guardar();
        Toast.show(`${tipo === 'clientes' ? 'Cliente' : 'Proveedor'} guardado ✓`);
        document.getElementById(`${tipo}-nombre`).value = '';
        document.getElementById(`${tipo}-ruc`).value = '';
        if (document.getElementById(`${tipo}-tel`)) document.getElementById(`${tipo}-tel`).value = '';
        if (document.getElementById(`${tipo}-email`)) document.getElementById(`${tipo}-email`).value = '';
        if (tipo === 'clientes' && document.getElementById('clientes-direccion')) document.getElementById('clientes-direccion').value = '';
        if (tipo === 'clientes' && document.getElementById('cliente-limite')) document.getElementById('cliente-limite').value = '0';
        this.render(tipo); App.renderNav();
    },

    render(tipo) {
        if (tipo === 'clientes') {
            const tbody = document.getElementById('lista-clientes'); if (!tbody) return;
            if (!DB.data.clientes.length) { tbody.innerHTML = '<tr><td colspan="7" class="empty-state"><div class="empty-state-icon">📭</div>Sin clientes</td></tr>'; return; }
            tbody.innerHTML = DB.data.clientes.map(c => {
                const usado = DB.data.ventas.filter(v => v.cliente?.id === c.id && v.estado === 'pendiente').reduce((s, v) => s + v.total, 0);
                const disp = Math.max(0, (c.limiteCredito || 0) - usado);
                return `<tr>
                    <td><strong>${c.nombre}</strong></td><td>${c.ruc || '-'}</td>
                    <td>${c.telefono || '-'}${c.email ? `<br><small class="text-muted">${c.email}</small>` : ''}</td>
                    <td>${FMT.mr(c.limiteCredito || 0, 'PYG')}</td>
                    <td style="${usado > 0 ? 'color:var(--warning);font-weight:700' : ''}">${FMT.mr(usado, 'PYG')}</td>
                    <td style="${disp < (c.limiteCredito || 0) * 0.2 && c.limiteCredito > 0 ? 'color:var(--danger);font-weight:700' : 'color:var(--success);font-weight:700'}">${FMT.mr(disp, 'PYG')}</td>
                    <td><button class="btn btn-danger btn-sm" onclick="Entidades.eliminar('clientes','${c.id}')">🗑️</button></td>
                </tr>`;
            }).join('');
        } else {
            const tbody = document.getElementById('lista-proveedores'); if (!tbody) return;
            if (!DB.data.proveedores.length) { tbody.innerHTML = '<tr><td colspan="6" class="empty-state"><div class="empty-state-icon">📭</div>Sin proveedores</td></tr>'; return; }
            tbody.innerHTML = DB.data.proveedores.map(p => {
                const compras = DB.data.compras.filter(c => c.proveedor?.id === p.id);
                const total = compras.reduce((s, c) => s + c.total, 0);
                return `<tr>
                    <td><strong>${p.nombre}</strong></td><td>${p.ruc || '-'}</td>
                    <td>${p.telefono || '-'}${p.email ? `<br><small>${p.email}</small>` : ''}</td>
                    <td>${compras.length}</td><td><strong>${FMT.mr(total, 'PYG')}</strong></td>
                    <td><button class="btn btn-danger btn-sm" onclick="Entidades.eliminar('proveedores','${p.id}')">🗑️</button></td>
                </tr>`;
            }).join('');
        }
    },

    eliminar(tipo, id) {
        if (!confirm('¿Eliminar este registro?')) return;
        DB.data[tipo] = DB.data[tipo].filter(x => x.id !== id); DB.guardar(); this.render(tipo); App.renderNav(); Toast.show('Eliminado');
    },

    filtrar(tipo, t) { document.querySelectorAll(`#lista-${tipo} tr`).forEach(r => { r.style.display = r.textContent.toLowerCase().includes(t.toLowerCase()) ? '' : 'none'; }); }
};

// ── Vendedores ──
const Vendedores = {
    guardar() {
        const nombre = document.getElementById('vend-nombre').value.trim();
        if (!nombre) return;
        const v = { id: DB.id('vendedores'), nombre, ci: document.getElementById('vend-ci').value, telefono: document.getElementById('vend-tel').value, email: document.getElementById('vend-email').value, comision: parseFloat(document.getElementById('vend-comision').value) || 0, activo: document.getElementById('vend-estado').value === 'true', creado: new Date().toISOString() };
        DB.data.vendedores.push(v); DB.guardar();
        Toast.show(`Vendedor ${nombre} guardado ✓`);
        ['vend-nombre', 'vend-ci', 'vend-tel', 'vend-email'].forEach(id => { const e = document.getElementById(id); if (e) e.value = ''; });
        document.getElementById('vend-comision').value = '5';
        this.render(); App.renderNav();
    },

    render() {
        const tbody = document.getElementById('lista-vendedores'); if (!tbody) return;
        tbody.innerHTML = DB.data.vendedores.map(v => {
            const ventas = DB.data.ventas.filter(x => x.vendedor?.id === v.id);
            const total = ventas.reduce((s, x) => s + x.total, 0);
            const comision = total * (v.comision || 0) / 100;
            return `<tr>
                <td><strong>${v.nombre}</strong>${v.ci ? `<br><small class="text-muted">CI: ${v.ci}</small>` : ''}</td>
                <td>${v.telefono || '-'}${v.email ? `<br><small class="text-muted">${v.email}</small>` : ''}</td>
                <td>${v.comision || 0}%</td>
                <td>${ventas.length}</td>
                <td><strong>${FMT.mr(total, 'PYG')}</strong></td>
                <td class="text-success font-bold">${FMT.mr(comision, 'PYG')}</td>
                <td><span class="badge badge-${v.activo ? 'success' : 'danger'}">${v.activo ? '✅ Activo' : '❌ Inactivo'}</span></td>
                <td><button class="btn btn-danger btn-sm" onclick="Vendedores.eliminar('${v.id}')">🗑️</button></td>
            </tr>`;
        }).join('');
    },

    eliminar(id) {
        if (id === 'VEND-20250308-0001') return Toast.show('No se puede eliminar el Administrador', 'error');
        if (!confirm('¿Eliminar este vendedor?')) return;
        DB.data.vendedores = DB.data.vendedores.filter(x => x.id !== id);
        DB.guardar(); this.render(); App.renderNav(); Toast.show('Vendedor eliminado');
    }
};

// ── Pagos a Proveedores ──
const PagosProveedores = {
    filtroEstado: 'todos',

    _estadoCompra(compra) {
        if (!compra) return 'pendiente';
        const totalPagado = this._pagadoDeCompra(compra.id);
        if (totalPagado <= 0) return 'pendiente';
        if (totalPagado >= compra.total) return 'pagada';
        return 'parcial';
    },

    _pagadoDeCompra(compraId) {
        return (DB.data.pagosProveedores || []).filter(p => p.compraId === compraId).reduce((s, p) => {
            const enPYG = p.moneda === 'PYG' ? p.monto : DB.convertir(p.monto, p.moneda, 'PYG');
            return s + enPYG;
        }, 0);
    },

    render() {
        if (!DB.data.pagosProveedores) DB.data.pagosProveedores = [];
        const compras = DB.data.compras;
        let pendiente = 0, parcialMonto = 0, pagadoMes = 0, provsConDeuda = new Set();
        const inicioMes = new Date(new Date().getFullYear(), new Date().getMonth(), 1);

        compras.forEach(c => {
            const estado = this._estadoCompra(c);
            const pagado = this._pagadoDeCompra(c.id);
            const saldo = (c.total || 0) - pagado;
            if (estado === 'pendiente') { pendiente += c.total || 0; provsConDeuda.add(c.proveedor?.id); }
            else if (estado === 'parcial') { parcialMonto += saldo; provsConDeuda.add(c.proveedor?.id); }
        });
        DB.data.pagosProveedores.forEach(p => {
            if (new Date(p.fecha) >= inicioMes) {
                pagadoMes += p.moneda === 'PYG' ? p.monto : DB.convertir(p.monto, p.moneda, 'PYG');
            }
        });

        const se = (id, t) => { const e = document.getElementById(id); if (e) e.textContent = t; };
        se('pp-stat-pendiente', FMT.mr(pendiente, 'PYG'));
        se('pp-stat-parcial', FMT.mr(parcialMonto, 'PYG'));
        se('pp-stat-pagado', FMT.mr(pagadoMes, 'PYG'));
        se('pp-stat-provs', provsConDeuda.size);

        const fpsel = document.getElementById('pp-filtro-prov');
        if (fpsel) {
            const cur = fpsel.value;
            fpsel.innerHTML = '<option value="">Todos los proveedores</option>' + DB.data.proveedores.map(p => `<option value="${p.id}">${p.nombre}</option>`).join('');
            fpsel.value = cur;
        }

        const lista = document.getElementById('pp-lista'); if (!lista) return;
        let filtradas = compras.filter(c => {
            if (this.filtroEstado !== 'todos' && this._estadoCompra(c) !== this.filtroEstado) return false;
            const fpv = document.getElementById('pp-filtro-prov')?.value;
            if (fpv && c.proveedor?.id !== fpv) return false;
            return true;
        }).sort((a, b) => new Date(b.fecha) - new Date(a.fecha));

        if (!filtradas.length) {
            lista.innerHTML = `<div class="card"><div class="empty-state"><div class="empty-state-icon">✅</div>${this.filtroEstado === 'todos' ? 'Sin compras registradas' : 'Sin compras con este estado'}</div></div>`;
        } else {
            lista.innerHTML = filtradas.map(c => {
                const estado = this._estadoCompra(c);
                const pagado = this._pagadoDeCompra(c.id);
                const saldo = Math.max(0, (c.total || 0) - pagado);
                const pct = c.total > 0 ? Math.min(100, Math.round(pagado / c.total * 100)) : 0;
                const colorBar = estado === 'pagada' ? 'var(--success)' : estado === 'parcial' ? 'var(--warning)' : 'var(--danger)';
                return `<div class="card deuda-card ${estado}">
                    <div class="flex justify-between items-center flex-wrap gap-1">
                        <div>
                            <strong>${c.proveedor?.nombre || 'Sin proveedor'}</strong>
                            <span class="badge badge-info" style="margin-left:0.5rem">${c.id}</span>
                            <span class="badge badge-${estado === 'pagada' ? 'success' : estado === 'parcial' ? 'warning' : 'danger'}" style="margin-left:0.4rem">${estado === 'pagada' ? '✅ Pagada' : estado === 'parcial' ? '🔶 Parcial' : '⏳ Pendiente'}</span>
                        </div>
                        <div class="flex gap-1 items-center">
                            <span style="font-size:0.8rem;color:var(--text-muted)">${FMT.date(c.fecha)}</span>
                            ${estado !== 'pagada' ? `<button class="btn btn-primary btn-sm" onclick="PagosProveedores.abrirModal('${c.id}')">💳 Pagar</button>` : ''}
                        </div>
                    </div>
                    <div class="flex gap-2 mt-1 flex-wrap" style="font-size:0.85rem">
                        <span>Total: <strong>${FMT.mr(c.total || 0, 'PYG')}</strong></span>
                        <span>Pagado: <strong class="text-success">${FMT.mr(pagado, 'PYG')}</strong></span>
                        <span>Saldo: <strong style="color:${colorBar}">${FMT.mr(saldo, 'PYG')}</strong></span>
                        <span class="text-muted">${c.condicion === 'credito' ? '📋 Crédito' : '💵 Contado'}</span>
                    </div>
                    <div class="progress-bar"><div class="progress-fill" style="width:${pct}%;background:${colorBar}"></div></div>
                    <div style="font-size:0.72rem;color:var(--text-muted);margin-top:0.25rem">${pct}% pagado — ${c.items?.length || 0} items</div>
                </div>`;
            }).join('');
        }
        this._renderHistorial();
        App.renderNav();
    },

    _renderHistorial() {
        const tbody = document.getElementById('pp-historial'); if (!tbody) return;
        const pagos = [...(DB.data.pagosProveedores || [])].reverse();
        if (!pagos.length) { tbody.innerHTML = '<tr><td colspan="7" class="empty-state"><div class="empty-state-icon">📭</div>Sin pagos registrados</td></tr>'; return; }
        tbody.innerHTML = pagos.map(p => `<tr>
            <td>${FMT.date(p.fecha)}</td>
            <td><strong>${p.proveedor?.nombre || '-'}</strong></td>
            <td>${p.compraId ? `<code>${p.compraId}</code>` : '<span class="text-muted">—</span>'}</td>
            <td>${p.concepto || '-'}</td>
            <td><span class="badge badge-info">${p.moneda || 'PYG'}</span></td>
            <td><strong>${FMT.mr(p.monto, p.moneda || 'PYG')}</strong></td>
            <td><span class="badge badge-purple">${p.metodo || 'efectivo'}</span></td>
        </tr>`).join('');
    },

    filtrar(estado) { this.filtroEstado = estado; this.render(); },

    abrirModal(compraId = null) {
        if (!DB.data.pagosProveedores) DB.data.pagosProveedores = [];
        const provSel = document.getElementById('pp-prov');
        provSel.innerHTML = '<option value="">Seleccionar...</option>' + DB.data.proveedores.map(p => `<option value="${p.id}">${p.nombre}</option>`).join('');
        document.getElementById('pp-fecha').value = new Date().toISOString().split('T')[0];
        document.getElementById('pp-monto').value = '';
        document.getElementById('pp-concepto').value = '';
        document.getElementById('pp-deuda-info').style.display = 'none';
        if (compraId) {
            const compra = DB.data.compras.find(c => c.id === compraId);
            if (compra?.proveedor) {
                provSel.value = compra.proveedor.id;
                this.onProvChange();
                document.getElementById('pp-compra-ref').value = compraId;
                this._mostrarDeuda(compraId);
            }
        }
        document.getElementById('modal-pago').classList.add('active');
    },

    onProvChange() {
        const provId = document.getElementById('pp-prov').value;
        const refSel = document.getElementById('pp-compra-ref');
        refSel.innerHTML = '<option value="">Pago general / sin referencia</option>';
        if (provId) {
            DB.data.compras.filter(c => c.proveedor?.id === provId && this._estadoCompra(c) !== 'pagada').forEach(c => {
                const saldo = (c.total || 0) - this._pagadoDeCompra(c.id);
                refSel.add(new Option(`${c.id} — Saldo: ${FMT.mr(saldo, 'PYG')}`, c.id));
            });
        }
        document.getElementById('pp-deuda-info').style.display = 'none';
        refSel.onchange = () => this._mostrarDeuda(refSel.value);
    },

    _mostrarDeuda(compraId) {
        if (!compraId) { document.getElementById('pp-deuda-info').style.display = 'none'; return; }
        const c = DB.data.compras.find(x => x.id === compraId); if (!c) return;
        const pagado = this._pagadoDeCompra(compraId);
        const saldo = Math.max(0, (c.total || 0) - pagado);
        document.getElementById('pp-deuda-total').textContent = FMT.mr(c.total || 0, 'PYG');
        document.getElementById('pp-deuda-pagado').textContent = FMT.mr(pagado, 'PYG');
        document.getElementById('pp-deuda-saldo').textContent = FMT.mr(saldo, 'PYG');
        document.getElementById('pp-deuda-info').style.display = 'block';
        if (!document.getElementById('pp-monto').value) document.getElementById('pp-monto').value = saldo;
    },

    onMontoChange() {
        const moneda = document.getElementById('pp-moneda').value;
        const alerta = document.getElementById('pp-alerta-caja');
        if (alerta) alerta.classList.toggle('hidden', moneda !== 'PYG');
    },

    guardar() {
        const provId = document.getElementById('pp-prov').value;
        if (!provId) return Toast.show('Seleccioná un proveedor', 'error');
        const monto = parseFloat(document.getElementById('pp-monto').value) || 0;
        if (monto <= 0) return Toast.show('Ingresá un monto válido', 'error');
        const moneda = document.getElementById('pp-moneda').value;
        const metodo = document.getElementById('pp-metodo').value;
        const compraId = document.getElementById('pp-compra-ref').value || null;
        const concepto = document.getElementById('pp-concepto').value.trim() || `Pago a proveedor${compraId ? ' - ' + compraId : ''}`;
        const fecha = document.getElementById('pp-fecha').value || new Date().toISOString().split('T')[0];

        if (compraId) {
            const c = DB.data.compras.find(x => x.id === compraId);
            if (c) {
                const montoPYG = moneda === 'PYG' ? monto : DB.convertir(monto, moneda, 'PYG');
                const saldo = Math.max(0, (c.total || 0) - this._pagadoDeCompra(compraId));
                if (montoPYG > saldo + 1) return Toast.show(`El monto excede el saldo pendiente (${FMT.mr(saldo, 'PYG')})`, 'error');
            }
        }

        const pago = {
            id: 'PAG-' + Date.now(),
            fecha: new Date(fecha + 'T' + new Date().toTimeString().slice(0, 5)).toISOString(),
            proveedor: DB.data.proveedores.find(p => p.id === provId),
            compraId, concepto, monto, moneda, metodo
        };
        DB.data.pagosProveedores.push(pago);
        if (metodo === 'efectivo') {
            DB.movCaja('salida', concepto, moneda === 'PYG' ? monto : DB.convertir(monto, moneda, 'PYG'), 'PYG');
        }
        DB.guardar();
        Toast.show(`Pago de ${FMT.mr(monto, moneda)} registrado ✓`);
        this.cerrarModal();
        this.render();
    },

    cerrarModal() { document.getElementById('modal-pago').classList.remove('active'); }
};

// ── Pedidos programados ──
const Pedidos = {
    filtroEstado: 'todos',
    _ESTADOS: { pendiente_entrega: { lbl: '⏳ Pendiente', cls: 'warning' }, confirmado: { lbl: '✅ Confirmado', cls: 'success' }, en_camino: { lbl: '🛵 En camino', cls: 'info' }, entregado: { lbl: '📦 Entregado', cls: 'success' }, cancelado: { lbl: '❌ Cancelado', cls: 'danger' } },

    render() {
        const pedidos = DB.data.ventas.filter(v => v.programada);
        const hoy = new Date().toISOString().split('T')[0];
        const ahora = new Date();
        const pend = pedidos.filter(p => p.estadoEntrega === 'pendiente_entrega').length;
        const conf = pedidos.filter(p => p.estadoEntrega === 'confirmado').length;
        const entHoy = pedidos.filter(p => p.estadoEntrega === 'entregado' && p.fechaEntregaReal?.startsWith(hoy)).length;
        const venc = pedidos.filter(p => ['pendiente_entrega', 'confirmado', 'en_camino'].includes(p.estadoEntrega) && p.fechaEntrega && new Date(p.fechaEntrega) < ahora).length;
        const se = (id, v) => { const e = document.getElementById(id); if (e) e.textContent = v; };
        se('ped-stat-pendientes', pend); se('ped-stat-confirmados', conf); se('ped-stat-entregados', entHoy); se('ped-stat-vencidos', venc);

        const lista = document.getElementById('pedidos-lista'); if (!lista) return;
        let filtrados = pedidos.filter(p => this.filtroEstado === 'todos' || p.estadoEntrega === this.filtroEstado);
        filtrados.sort((a, b) => new Date(a.fechaEntrega || a.fecha) - new Date(b.fechaEntrega || b.fecha));

        if (!filtrados.length) { lista.innerHTML = '<div class="empty-state"><div class="empty-state-icon">📅</div>Sin pedidos en este estado</div>'; return; }

        lista.innerHTML = filtrados.map(p => {
            const vencido = ['pendiente_entrega', 'confirmado', 'en_camino'].includes(p.estadoEntrega) && p.fechaEntrega && new Date(p.fechaEntrega) < ahora;
            const est = this._ESTADOS[p.estadoEntrega] || { lbl: p.estadoEntrega, cls: 'info' };
            const canal = Ventas._CANALES[p.canal] || p.canal || '-';
            const entrega = Ventas._ENTREGAS[p.entrega] || p.entrega || '-';
            return `<div class="deuda-card">
                <div class="flex justify-between items-center flex-wrap gap-1">
                    <div>
                        <code>${p.id}</code>
                        <span class="badge badge-${est.cls}" style="margin-left:0.5rem">${est.lbl}</span>
                        ${vencido ? '<span class="badge badge-danger" style="margin-left:0.4rem">⚠️ VENCIDO</span>' : ''}
                    </div>
                    <div class="flex gap-1 flex-wrap">
                        ${p.estadoEntrega === 'pendiente_entrega' ? `<button class="btn btn-secondary btn-sm" onclick="Pedidos.cambiarEstado('${p.id}','confirmado')">✅ Confirmar</button>` : ''}
                        ${p.estadoEntrega === 'confirmado' ? `<button class="btn btn-primary btn-sm" onclick="Pedidos.cambiarEstado('${p.id}','en_camino')">🛵 Despachar</button>` : ''}
                        ${p.estadoEntrega === 'en_camino' ? `<button class="btn btn-success btn-sm" onclick="Pedidos.cambiarEstado('${p.id}','entregado')">📦 Entregado</button>` : ''}
                        ${['pendiente_entrega', 'confirmado'].includes(p.estadoEntrega) ? `<button class="btn btn-danger btn-sm" onclick="Pedidos.cambiarEstado('${p.id}','cancelado')">❌</button>` : ''}
                    </div>
                </div>
                <div class="flex gap-2 mt-1 flex-wrap" style="font-size:0.83rem">
                    <span>👤 ${p.cliente?.nombre || 'Ocasional'}</span>
                    <span>🧑‍💼 ${p.vendedor?.nombre || '-'}</span>
                    <span>📡 ${canal}</span>
                    <span>🚚 ${entrega}</span>
                    <span>💳 ${p.metodo}</span>
                    <strong>${FMT.mr(p.total, 'PYG')}</strong>
                </div>
                ${p.fechaEntrega ? `<div style="font-size:0.8rem;margin-top:0.3rem;color:${vencido ? 'var(--danger)' : 'var(--text-muted)'}">📅 Entrega: ${new Date(p.fechaEntrega).toLocaleString('es-PY')}</div>` : ''}
                ${p.direccionEntrega ? `<div style="font-size:0.8rem;color:var(--text-muted)">📍 ${p.direccionEntrega}</div>` : ''}
                ${p.notas ? `<div style="font-size:0.8rem;color:var(--text-muted)">📝 ${p.notas}</div>` : ''}
            </div>`;
        }).join('');
    },

    filtrar(estado) { this.filtroEstado = estado; this.render(); },

    cambiarEstado(id, nuevoEstado) {
        const v = DB.data.ventas.find(x => x.id === id); if (!v) return;
        v.estadoEntrega = nuevoEstado;
        if (nuevoEstado === 'entregado') {
            v.fechaEntregaReal = new Date().toISOString();
            if (v.metodo !== 'credito' && v.estado === 'pagada') {
                DB.movCaja('entrada', `Entrega pedido ${id}`, v.total, 'PYG');
            }
        }
        if (nuevoEstado === 'cancelado') {
            v.estado = 'cancelado';
            v.items?.forEach(it => { if (!it.digital) { const p = DB.data.productos.find(x => x.id === it.id); if (p) p.stock = (p.stock || 0) + it.cantidad; } });
        }
        DB.guardar(); this.render(); App.renderNav();
        Toast.show(`Pedido ${id}: ${this._ESTADOS[nuevoEstado]?.lbl || nuevoEstado}`);
    }
};

// ── Temas Visuales ──
const Themes = {
    _themes: [
        { id: 'light', name: 'Índigo Clásico', sidebar: '#0f172a', bg: '#f0f4f8', card: 'rgba(255,255,255,0.92)', accent: '#6366f1', accent2: '#8b5cf6', textPrimary: '#1e293b', textSecondary: '#64748b', textMuted: '#94a3b8', textSidebar: '#f1f5f9', border: 'rgba(226,232,240,0.7)', hover: 'rgba(99,102,241,0.08)', dark: false },
        { id: 'dark', name: 'Oscuro Noche', sidebar: '#020617', bg: '#0f172a', card: 'rgba(30,41,59,0.93)', accent: '#818cf8', accent2: '#a78bfa', textPrimary: '#f8fafc', textSecondary: '#94a3b8', textMuted: '#64748b', textSidebar: '#f1f5f9', border: 'rgba(51,65,85,0.6)', hover: 'rgba(99,102,241,0.15)', dark: true },
        { id: 'vaporwave', name: 'Vaporwave', sidebar: '#1a0040', bg: '#0d0221', card: 'rgba(26,0,64,0.85)', accent: '#ff71ce', accent2: '#01cdfe', textPrimary: '#f0e6ff', textSecondary: '#b39ddb', textMuted: '#7e57c2', textSidebar: '#f0e6ff', border: 'rgba(255,113,206,0.2)', hover: 'rgba(255,113,206,0.1)', dark: true },
        { id: 'frutiger', name: 'Frutiger Aero', sidebar: '#006ea0', bg: '#dff0f7', card: 'rgba(255,255,255,0.9)', accent: '#0099cc', accent2: '#00cc88', textPrimary: '#003d5c', textSecondary: '#005f7f', textMuted: '#4fa8c5', textSidebar: '#e8f7fd', border: 'rgba(0,153,204,0.25)', hover: 'rgba(0,153,204,0.08)', dark: false },
        { id: 'nature', name: 'Verde Natura', sidebar: '#052e16', bg: '#f0fdf4', card: 'rgba(255,255,255,0.92)', accent: '#16a34a', accent2: '#059669', textPrimary: '#052e16', textSecondary: '#166534', textMuted: '#6b7280', textSidebar: '#dcfce7', border: 'rgba(22,163,74,0.2)', hover: 'rgba(22,163,74,0.08)', dark: false },
        { id: 'ocean', name: 'Azul Oceánico', sidebar: '#031a3a', bg: '#f0f9ff', card: 'rgba(255,255,255,0.92)', accent: '#0284c7', accent2: '#0ea5e9', textPrimary: '#0c1a2e', textSecondary: '#0369a1', textMuted: '#64748b', textSidebar: '#e0f2fe', border: 'rgba(2,132,199,0.2)', hover: 'rgba(2,132,199,0.08)', dark: false },
        { id: 'galaxy', name: 'Galaxia Dark', sidebar: '#08021e', bg: '#0a0014', card: 'rgba(20,5,45,0.9)', accent: '#9333ea', accent2: '#ec4899', textPrimary: '#f3e8ff', textSecondary: '#c084fc', textMuted: '#7c3aed', textSidebar: '#f3e8ff', border: 'rgba(147,51,234,0.25)', hover: 'rgba(147,51,234,0.12)', dark: true },
        { id: 'corporate', name: 'Rojo Corporativo', sidebar: '#1e0808', bg: '#fef2f2', card: 'rgba(255,255,255,0.94)', accent: '#dc2626', accent2: '#ef4444', textPrimary: '#1e0808', textSecondary: '#7f1d1d', textMuted: '#9ca3af', textSidebar: '#ffe4e6', border: 'rgba(220,38,38,0.2)', hover: 'rgba(220,38,38,0.07)', dark: false },
        { id: 'dark-emerald', name: 'Esmeralda Oscuro', sidebar: '#010c08', bg: '#011a0f', card: 'rgba(1,30,18,0.92)', accent: '#10b981', accent2: '#06b6d4', textPrimary: '#d1fae5', textSecondary: '#6ee7b7', textMuted: '#34d399', textSidebar: '#d1fae5', border: 'rgba(16,185,129,0.2)', hover: 'rgba(16,185,129,0.1)', dark: true },
        { id: 'monokai', name: 'Monokai', sidebar: '#141412', bg: '#272822', card: 'rgba(45,45,40,0.97)', accent: '#f92672', accent2: '#ae81ff', textPrimary: '#f8f8f2', textSecondary: '#cfcfc2', textMuted: '#75715e', textSidebar: '#f8f8f2', border: 'rgba(248,248,242,0.1)', hover: 'rgba(249,38,114,0.1)', dark: true },
        { id: 'minimal', name: 'Minimalista', sidebar: '#111827', bg: '#f9fafb', card: 'rgba(255,255,255,0.97)', accent: '#374151', accent2: '#4b5563', textPrimary: '#111827', textSecondary: '#6b7280', textMuted: '#9ca3af', textSidebar: '#f3f4f6', border: 'rgba(107,114,128,0.2)', hover: 'rgba(55,65,81,0.06)', dark: false },
    ],
    _current: 'light',
    _styleEl: null,

    init() {
        this._styleEl = document.getElementById('erp-theme-vars');
        if (!this._styleEl) { this._styleEl = document.createElement('style'); this._styleEl.id = 'erp-theme-vars'; document.head.appendChild(this._styleEl); }
        const saved = localStorage.getItem('erp_theme') || 'light';
        const fontSize = localStorage.getItem('erp_fontsize') || '14';
        const sidebarW = localStorage.getItem('erp_sidebar_w') || '270';
        const compact = localStorage.getItem('erp_compact') === 'true';
        const rounded = localStorage.getItem('erp_rounded') === 'square';
        const anim = localStorage.getItem('erp_anim') === 'off';
        this.applyTheme(saved, false);
        document.body.style.fontSize = fontSize + 'px';
        document.documentElement.style.setProperty('--sidebar-w', sidebarW + 'px');
        if (compact) document.documentElement.setAttribute('data-compact', 'true');
        if (rounded) document.documentElement.setAttribute('data-rounded', 'square');
        if (anim) document.documentElement.setAttribute('data-animations', 'off');
        this._renderGrid();
        const fsl = document.getElementById('font-size-slider');
        if (fsl) { fsl.value = fontSize; document.getElementById('font-size-val').textContent = fontSize + 'px'; }
        const swl = document.getElementById('sidebar-w-slider');
        if (swl) { swl.value = sidebarW; document.getElementById('sidebar-w-val').textContent = sidebarW + 'px'; }
        if (compact) { const b = document.getElementById('btn-compact'); if (b) { b.classList.add('btn-primary'); b.classList.remove('btn-secondary'); } }
        if (rounded) { const b = document.getElementById('btn-rounded'); if (b) { b.classList.add('btn-warning'); b.classList.remove('btn-secondary'); } }
        if (anim) { const b = document.getElementById('btn-anim'); if (b) { b.classList.add('btn-danger'); b.classList.remove('btn-secondary'); } }
    },

    _renderGrid() {
        const grid = document.getElementById('theme-grid'); if (!grid) return;
        grid.innerHTML = this._themes.map(t => `
            <div class="theme-swatch ${this._current === t.id ? 'active' : ''}" onclick="Themes.applyTheme('${t.id}')">
                <div class="theme-preview">
                    <div class="theme-preview-sidebar" style="background:${t.sidebar}"></div>
                    <div class="theme-preview-content" style="background:${t.bg}">
                        <div class="theme-preview-bar wide" style="background:${t.accent}"></div>
                        <div class="theme-preview-bar medium" style="background:${t.accent2};opacity:0.7"></div>
                        <div class="theme-preview-bar narrow" style="background:${t.accent};opacity:0.5"></div>
                    </div>
                </div>
                <div class="theme-label" style="background:${t.bg};color:${t.textPrimary};border-top:1px solid ${t.border}">${t.name}</div>
            </div>`).join('');
    },

    applyTheme(id, save = true) {
        const t = this._themes.find(x => x.id === id) || this._themes[0];
        this._current = t.id;
        if (!this._styleEl) { this._styleEl = document.createElement('style'); this._styleEl.id = 'erp-theme-vars'; document.head.appendChild(this._styleEl); }
        const grad = `linear-gradient(135deg,${t.accent} 0%,${t.accent2} 100%)`;
        const hex2rgb = h => { const r = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(h); return r ? `${parseInt(r[1], 16)},${parseInt(r[2], 16)},${parseInt(r[3], 16)}` : null; };
        const rgb = hex2rgb(t.accent);
        const glow = rgb ? `0 0 20px rgba(${rgb},0.35)` : '0 0 20px rgba(99,102,241,0.3)';
        const shadow = t.dark ? '0 4px 6px -1px rgba(0,0,0,0.4),0 2px 4px -1px rgba(0,0,0,0.2)' : '0 4px 6px -1px rgba(0,0,0,0.1),0 2px 4px -1px rgba(0,0,0,0.06)';
        const shadowLg = t.dark ? '0 10px 15px -3px rgba(0,0,0,0.5),0 4px 6px -2px rgba(0,0,0,0.3)' : '0 10px 15px -3px rgba(0,0,0,0.1),0 4px 6px -2px rgba(0,0,0,0.05)';
        this._styleEl.textContent = `:root {
            --primary:${t.accent};--primary-light:${t.accent2};--primary-dark:${t.accent};
            --primary-gradient:${grad};--bg-body:${t.bg};--bg-card:${t.card};
            --bg-sidebar:${t.sidebar};--bg-hover:${t.hover};
            --text-primary:${t.textPrimary};--text-secondary:${t.textSecondary};
            --text-muted:${t.textMuted};--text-sidebar:${t.textSidebar};
            --border:${t.border};--shadow:${shadow};--shadow-lg:${shadowLg};--shadow-glow:${glow};
        }`;
        document.documentElement.setAttribute('data-theme', t.dark ? 'dark' : t.id);
        document.documentElement.setAttribute('data-theme-id', t.id);
        if (save) { localStorage.setItem('erp_theme', t.id); this._renderGrid(); Toast.show(`Tema "${t.name}" aplicado ✓`); }
    },

    openModal() { const el = document.getElementById('theme-modal-overlay'); if (el) { el.classList.add('open'); this._renderGrid(); } },
    closeModal() { const el = document.getElementById('theme-modal-overlay'); if (el) el.classList.remove('open'); },
    toggle() { this.openModal(); },

    setFontSize(v) { document.body.style.fontSize = v + 'px'; localStorage.setItem('erp_fontsize', v); const el = document.getElementById('font-size-val'); if (el) el.textContent = v + 'px'; },
    setSidebarWidth(v) { document.documentElement.style.setProperty('--sidebar-w', v + 'px'); localStorage.setItem('erp_sidebar_w', v); const el = document.getElementById('sidebar-w-val'); if (el) el.textContent = v + 'px'; },
    toggleCompact() { const html = document.documentElement; const on = html.getAttribute('data-compact') === 'true'; html.setAttribute('data-compact', on ? 'false' : 'true'); localStorage.setItem('erp_compact', on ? 'false' : 'true'); const b = document.getElementById('btn-compact'); if (b) { b.classList.toggle('btn-primary', !on); b.classList.toggle('btn-secondary', on); } },
    toggleRounded() { const html = document.documentElement; const sq = html.getAttribute('data-rounded') === 'square'; html.setAttribute('data-rounded', sq ? '' : 'square'); localStorage.setItem('erp_rounded', sq ? '' : 'square'); const b = document.getElementById('btn-rounded'); if (b) { b.classList.toggle('btn-warning', !sq); b.classList.toggle('btn-secondary', sq); } },
    toggleAnimations() { const html = document.documentElement; const off = html.getAttribute('data-animations') === 'off'; html.setAttribute('data-animations', off ? '' : 'off'); localStorage.setItem('erp_anim', off ? '' : 'off'); const b = document.getElementById('btn-anim'); if (b) { b.classList.toggle('btn-danger', !off); b.classList.toggle('btn-secondary', off); } },

    reset() {
        ['erp_theme', 'erp_fontsize', 'erp_sidebar_w', 'erp_compact', 'erp_rounded', 'erp_anim'].forEach(k => localStorage.removeItem(k));
        const html = document.documentElement;
        html.removeAttribute('data-compact'); html.removeAttribute('data-rounded'); html.removeAttribute('data-animations');
        document.body.style.fontSize = '14px';
        document.documentElement.style.setProperty('--sidebar-w', '270px');
        this.applyTheme('light', false);
        this._renderGrid();
        const fsl = document.getElementById('font-size-slider'); if (fsl) fsl.value = 14;
        const fvl = document.getElementById('font-size-val'); if (fvl) fvl.textContent = '14px';
        const swl = document.getElementById('sidebar-w-slider'); if (swl) swl.value = 270;
        const wvl = document.getElementById('sidebar-w-val'); if (wvl) wvl.textContent = '270px';
        ['btn-compact', 'btn-rounded', 'btn-anim'].forEach(id => { const b = document.getElementById(id); if (b) { b.className = 'btn btn-secondary btn-sm'; b.style.flex = '1'; } });
        Toast.show('Apariencia restablecida');
    }
};

// ── DeviceAPI — hooks para hardware externo ──
const DeviceAPI = {
    enabled: false,

    init() {
        if (!this.enabled) return;
        this._initBarcode();
        this._initScale();
        console.log('[DeviceAPI] Inicializado');
    },

    _barcodeBuffer: '',
    _lastKeyTime: 0,
    _initBarcode() {
        document.addEventListener('keypress', e => {
            const now = Date.now();
            if (now - this._lastKeyTime > 300) this._barcodeBuffer = '';
            this._lastKeyTime = now;
            if (e.key === 'Enter') {
                if (this._barcodeBuffer.length > 2) this.onBarcodeRead(this._barcodeBuffer.trim());
                this._barcodeBuffer = '';
            } else { this._barcodeBuffer += e.key; }
        });
    },

    onBarcodeRead(codigo) {
        const prod = DB.data.productos.find(p => p.codigo === codigo || p.codigoBarras === codigo);
        if (prod) {
            const modalVenta = document.getElementById('modal-venta');
            if (modalVenta?.classList.contains('active')) {
                const sel = document.getElementById('v-producto');
                if (sel) { sel.value = prod.id; Ventas.agregarItem(); }
            } else { Toast.show(`📦 ${prod.nombre} — Stock: ${prod.stock}`, 'info'); }
        } else { Toast.show(`Código ${codigo} no encontrado`, 'warning'); }
    },

    async _initScale() {
        if (!('serial' in navigator)) return console.warn('[DeviceAPI] Web Serial no disponible');
        console.log('[DeviceAPI] Web Serial disponible — balanza lista para conectar');
    },

    async conectarBalanza() {
        if (!('serial' in navigator)) return Toast.show('Web Serial no disponible en este navegador', 'error');
        try {
            const port = await navigator.serial.requestPort();
            await port.open({ baudRate: 9600 });
            Toast.show('Balanza conectada ✓', 'success');
        } catch (e) { if (e.name !== 'NotFoundError') Toast.show('Error al conectar balanza', 'error'); }
    },

    onWeightRead(grams) {
        const campoKg = document.getElementById('v-cantidad');
        if (campoKg && document.getElementById('modal-venta')?.classList.contains('active')) {
            campoKg.value = (grams / 1000).toFixed(3);
        }
    },

    imprimirTicket(venta) {
        if (!this.enabled) { this._imprimirNavegador(venta); return; }
        console.log('[DeviceAPI] Imprimir ticket:', venta);
    },

    _imprimirNavegador(venta) {
        const w = window.open('', '_blank', 'width=300,height=600');
        const empresa = DB.data.config.empresa;
        w.document.write(`<html><head><title>Ticket</title>
        <style>body{font-family:monospace;font-size:12px;margin:10px;width:260px}
        .center{text-align:center}.bold{font-weight:bold}.line{border-top:1px dashed #000;margin:6px 0}
        </style></head><body>
        <div class="center bold">${empresa.nombre || 'Ñemuha'}</div>
        ${empresa.ruc ? `<div class="center">RUC: ${empresa.ruc}</div>` : ''}
        ${empresa.telefono ? `<div class="center">Tel: ${empresa.telefono}</div>` : ''}
        <div class="line"></div>
        <div>Factura: ${venta.id}</div>
        <div>Fecha: ${FMT.date(venta.fecha)}</div>
        <div>Cliente: ${venta.cliente?.nombre || 'Ocasional'}</div>
        <div class="line"></div>
        ${venta.items.map(i => `<div>${i.nombre}<br>&nbsp;&nbsp;${i.cantidad} x ${FMT.mr(i.precio, 'PYG')} = ${FMT.mr(i.precio * i.cantidad, 'PYG')}</div>`).join('')}
        <div class="line"></div>
        <div>Subtotal: ${FMT.mr(venta.subtotal, 'PYG')}</div>
        <div>IVA (10%): ${FMT.mr(venta.iva, 'PYG')}</div>
        <div class="bold">TOTAL: ${FMT.mr(venta.total, 'PYG')}</div>
        <div class="line"></div>
        <div class="center">¡Gracias por su compra!</div>
        </body></html>`);
        w.document.close();
        setTimeout(() => { w.print(); w.close(); }, 500);
    }
};
