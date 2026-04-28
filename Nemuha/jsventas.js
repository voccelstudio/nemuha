// ════════════════════════════════════════
// ÑEMUHA — jsventas.js
// Ventas, Compras, Caja, Reportes
// ════════════════════════════════════════

// ── Ventas ──
const Ventas = {
    items: [], total: 0,
    _CANALES: { presencial: '🏪 Presencial', whatsapp: '💬 WhatsApp', instagram: '📸 Instagram', facebook: '👍 Facebook', web: '🌐 Web', telefono: '📞 Teléfono', subvendedor: '🤝 Sub-vendedor', comisionista: '💰 Comisionista' },
    _ENTREGAS: { pickup: '🏪 Pick Up', delivery_propio: '🛵 Delivery propio', delivery_tercero: '📦 Delivery tercerizado', encomienda: '✈️ Encomienda', digital: '💻 Digital' },

    render() {
        const tbody = document.getElementById('tabla-ventas'); if (!tbody) return;
        const ventas = DB.data.ventas.filter(v => !v.programada || v.estadoEntrega === 'entregado');
        if (!ventas.length) { tbody.innerHTML = '<tr><td colspan="9" class="empty-state"><div class="empty-state-icon">📭</div>Sin ventas registradas</td></tr>'; return; }
        tbody.innerHTML = ventas.slice().reverse().map(v => `
        <tr>
            <td><code>${v.id}</code></td><td>${FMT.date(v.fecha)}</td>
            <td>${v.cliente?.nombre || '<span class="text-muted">Ocasional</span>'}</td>
            <td>${v.vendedor?.nombre || '-'}</td>
            <td><span class="badge badge-info" style="font-size:0.68rem">${this._CANALES[v.canal] || v.canal || 'presencial'}</span></td>
            <td><span class="badge badge-purple" style="font-size:0.68rem">${this._ENTREGAS[v.entrega] || v.entrega || 'pickup'}</span></td>
            <td><strong>${FMT.money(v.total)}</strong></td>
            <td><span class="badge badge-${v.estado === 'pagada' ? 'success' : 'warning'}">${v.estado}</span></td>
            <td class="flex gap-1">
                <button class="btn btn-secondary btn-sm" onclick="Ventas.ver('${v.id}')">👁️</button>
                ${v.estado === 'pendiente' ? `<button class="btn btn-success btn-sm" onclick="Ventas.cobrar('${v.id}')">💰</button>` : ''}
            </td>
        </tr>`).join('');
    },

    filtrar(t) { document.querySelectorAll('#tabla-ventas tr').forEach(r => { r.style.display = r.textContent.toLowerCase().includes(t.toLowerCase()) ? '' : 'none'; }); },

    ver(id) {
        const v = DB.data.ventas.find(x => x.id === id); if (!v) return;
        alert(`📝 ${v.id}\n📅 ${FMT.date(v.fecha)}\n👤 ${v.cliente?.nombre || 'Ocasional'}\n🧑‍💼 ${v.vendedor?.nombre || '-'}\n📡 Canal: ${this._CANALES[v.canal] || '-'}\n🚚 Entrega: ${this._ENTREGAS[v.entrega] || '-'}${v.direccionEntrega ? '\n📍 ' + v.direccionEntrega : ''}${v.costoDelivery ? '\n🚚 Delivery: ' + FMT.mr(v.costoDelivery, 'PYG') : ''}\n💳 Pago: ${v.metodo}${v.notas ? '\n📝 ' + v.notas : ''}\n\n${v.items.map(i => `• ${i.nombre} x${i.cantidad} = ${FMT.money(i.precio * i.cantidad * (1 - (i.desc || 0) / 100))}`).join('\n')}\n\nSubtotal: ${FMT.money(v.subtotal)}\nIVA: ${FMT.money(v.iva)}\nTOTAL: ${FMT.money(v.total)}`);
    },

    cobrar(id) {
        const v = DB.data.ventas.find(x => x.id === id); if (!v) return;
        if (confirm(`¿Cobrar ${id} por ${FMT.money(v.total)}?`)) {
            v.estado = 'pagada'; v.fechaCobro = new Date().toISOString();
            DB.movCaja('entrada', `Cobro crédito ${id}`, v.total, 'PYG'); DB.guardar();
            this.render(); Caja.render(); Toast.show('Crédito cobrado');
        }
    },

    abrirModal() {
        this.items = []; this.total = 0; this.renderItems();
        document.getElementById('v-cliente').innerHTML = '<option value="">🚶 Cliente ocasional</option>' + DB.data.clientes.map(c => `<option value="${c.id}">${c.nombre}${c.limiteCredito > 0 ? ' (Cta. Cte.)' : ''}</option>`).join('');
        document.getElementById('v-vendedor').innerHTML = '<option value="">Seleccionar vendedor...</option>' + DB.data.vendedores.filter(v => v.activo).map(v => `<option value="${v.id}">${v.nombre}</option>`).join('');
        document.getElementById('v-producto').innerHTML = '<option value="">🔍 Buscar producto...</option>' + DB.data.productos.filter(p => (p.stock || 0) > 0 || (p.categoria === 'digital')).map(p => `<option value="${p.id}">${p.nombre} — ${FMT.mr(p.precio, 'PYG')} (Stock: ${p.stock || '∞'})</option>`).join('');
        document.getElementById('v-metodo').value = 'efectivo'; this.onMetodoChange('efectivo');
        document.getElementById('v-canal').value = 'presencial'; this.onCanalChange('presencial');
        document.getElementById('v-entrega').value = 'pickup'; this.onEntregaChange('pickup');
        document.getElementById('v-programada').value = 'no'; this.onProgramadaChange('no');
        document.getElementById('v-costo-delivery').value = '0';
        document.getElementById('v-notas').value = '';
        document.getElementById('modal-venta').classList.add('active');
    },

    onCanalChange(c) { document.getElementById('v-comisionista-fields').style.display = c === 'comisionista' ? 'block' : 'none'; this.renderItems(); },

    onEntregaChange(e) {
        const hasAddr = ['delivery_propio', 'delivery_tercero', 'encomienda'].includes(e);
        document.getElementById('v-delivery-fields').style.display = hasAddr ? 'block' : 'none';
        document.getElementById('v-empresa-delivery-group').style.display = (e === 'delivery_tercero' || e === 'encomienda') ? 'block' : 'none';
        document.getElementById('v-digital-fields').style.display = e === 'digital' ? 'block' : 'none';
        if (!hasAddr) document.getElementById('v-costo-delivery').value = '0';
        this.renderItems();
    },

    onProgramadaChange(v) {
        document.getElementById('v-fecha-entrega-group').style.display = v === 'si' ? 'block' : 'none';
        if (v === 'si') { const d = new Date(); d.setDate(d.getDate() + 1); document.getElementById('v-fecha-entrega').value = d.toISOString().slice(0, 16); }
    },

    onMetodoChange(m) {
        document.getElementById('v-credito-group').style.display = m === 'credito' ? 'block' : 'none';
        const ef = m === 'efectivo' || m === 'efectivo_usd';
        document.getElementById('v-pago-efectivo').style.display = ef ? 'flex' : 'none';
        if (ef) { document.getElementById('v-recibido').value = ''; document.getElementById('v-cambio-display').textContent = FMT.mr(0, 'PYG'); }
    },

    calcularCambio() {
        const rec = parseFloat(document.getElementById('v-recibido').value) || 0;
        const cambio = rec - this.total;
        const el = document.getElementById('v-cambio-display');
        el.textContent = FMT.money(Math.max(0, cambio));
        el.style.color = cambio >= 0 ? 'var(--success)' : 'var(--danger)';
    },

    agregarItem() {
        const pid = document.getElementById('v-producto').value;
        if (!pid) return Toast.show('Selecciona un producto', 'error');
        const cant = parseInt(document.getElementById('v-cantidad').value) || 1;
        const desc = parseFloat(document.getElementById('v-descuento').value) || 0;
        const prod = DB.data.productos.find(p => p.id === pid);
        if (!prod) return Toast.show('Producto no encontrado', 'error');
        if (prod.categoria !== 'digital') {
            const enC = this.items.filter(i => i.id === pid).reduce((s, i) => s + i.cantidad, 0);
            if (enC + cant > prod.stock) return Toast.show(`Stock insuficiente. Disponible: ${prod.stock - enC}`, 'error');
        }
        this.items.push({ id: prod.id, codigo: prod.codigo, nombre: prod.nombre, cantidad: cant, precio: prod.precio, desc, digital: prod.categoria === 'digital' });
        this.renderItems();
        document.getElementById('v-producto').value = '';
        document.getElementById('v-cantidad').value = '1';
        document.getElementById('v-descuento').value = '0';
    },

    quitarItem(i) { this.items.splice(i, 1); this.renderItems(); },

    renderItems() {
        const t = Calc.totales(this.items, DB.data.config.iva);
        const delivery = parseFloat(document.getElementById('v-costo-delivery')?.value) || 0;
        const isC = document.getElementById('v-canal')?.value === 'comisionista';
        const cPct = isC ? (parseFloat(document.getElementById('v-comisionista-pct')?.value) || 0) : 0;
        const cMonto = Math.round(t.total * cPct / 100);
        const totalFinal = t.total + delivery;
        document.getElementById('v-items').innerHTML = this.items.map((it, i) => {
            const sub = it.precio * it.cantidad * (1 - (it.desc || 0) / 100);
            return `<tr><td><strong>${it.nombre}</strong>${it.digital ? ' <span class="badge badge-purple">Digital</span>' : ''}<br><small class="text-muted">${it.codigo}</small></td><td>${it.cantidad}</td><td>${FMT.mr(it.precio, 'PYG')}</td><td>${it.desc > 0 ? `<span class="badge badge-warning">${it.desc}%</span>` : '-'}</td><td><strong>${FMT.mr(sub, 'PYG')}</strong></td><td><button onclick="Ventas.quitarItem(${i})" class="btn btn-danger btn-sm">×</button></td></tr>`;
        }).join('');
        document.getElementById('v-subtotal').textContent = FMT.mr(t.subtotal, 'PYG');
        document.getElementById('v-iva').textContent = FMT.mr(t.iva, 'PYG');
        document.getElementById('v-total').textContent = FMT.mr(totalFinal, 'PYG');
        const dl = document.getElementById('v-delivery-line'); const dlm = document.getElementById('v-delivery-monto');
        if (dl && dlm) { dl.style.display = delivery > 0 ? 'flex' : 'none'; dlm.textContent = FMT.mr(delivery, 'PYG'); }
        const cl = document.getElementById('v-comision-line'); const clm = document.getElementById('v-comision-monto');
        if (cl && clm) { cl.style.display = isC && cMonto > 0 ? 'flex' : 'none'; clm.textContent = FMT.mr(cMonto, 'PYG'); }
        this.total = totalFinal;
        const m = document.getElementById('v-metodo')?.value;
        if (m === 'efectivo' || m === 'efectivo_usd') this.calcularCambio();
    },

    guardar() {
        if (!this.items.length) return Toast.show('Agrega al menos un producto', 'error');
        const vendId = document.getElementById('v-vendedor').value;
        if (!vendId) return Toast.show('Selecciona un vendedor', 'error');
        const cliId = document.getElementById('v-cliente').value;
        const metodo = document.getElementById('v-metodo').value;
        const canal = document.getElementById('v-canal').value;
        const entrega = document.getElementById('v-entrega').value;
        const programada = document.getElementById('v-programada').value === 'si';
        const cliente = cliId ? DB.data.clientes.find(c => c.id === cliId) : null;
        if (metodo === 'credito') {
            if (!cliente) return Toast.show('Selecciona un cliente para crédito', 'error');
            const usado = DB.data.ventas.filter(v => v.cliente?.id === cliId && v.estado === 'pendiente').reduce((s, v) => s + v.total, 0);
            if (usado + this.total > (cliente.limiteCredito || 0)) return Toast.show(`Límite excedido. Disponible: ${FMT.money((cliente.limiteCredito || 0) - usado)}`, 'error');
        }
        if ((metodo === 'efectivo' || metodo === 'efectivo_usd') && document.getElementById('v-recibido').value) {
            if (parseFloat(document.getElementById('v-recibido').value) < this.total) return Toast.show('Monto recibido insuficiente', 'error');
        }
        const delivery = parseFloat(document.getElementById('v-costo-delivery')?.value) || 0;
        const isC = canal === 'comisionista';
        const cPct = isC ? (parseFloat(document.getElementById('v-comisionista-pct')?.value) || 0) : 0;
        const t = Calc.totales(this.items, DB.data.config.iva);
        const venta = {
            id: DB.id('ventas'), fecha: new Date().toISOString(), cliente,
            vendedor: DB.data.vendedores.find(v => v.id === vendId),
            items: [...this.items], metodo, canal, entrega,
            costoDelivery: delivery,
            direccionEntrega: document.getElementById('v-direccion-entrega')?.value || '',
            empresaDelivery: document.getElementById('v-empresa-delivery')?.value || '',
            digitalLink: document.getElementById('v-digital-link')?.value || '',
            comisionistaExterno: isC ? { nombre: document.getElementById('v-comisionista-nombre')?.value || '', pct: cPct, monto: Math.round(t.total * cPct / 100) } : null,
            notas: document.getElementById('v-notas')?.value || '',
            cuotas: metodo === 'credito' ? +document.getElementById('v-cuotas').value : 1,
            subtotal: t.subtotal, iva: t.iva, total: this.total,
            programada,
            fechaEntrega: programada ? document.getElementById('v-fecha-entrega')?.value || null : null,
            estadoEntrega: programada ? 'pendiente_entrega' : 'entregado',
            estado: metodo === 'credito' ? 'pendiente' : 'pagada'
        };
        this.items.forEach(it => {
            if (!it.digital) { const p = DB.data.productos.find(x => x.id === it.id); if (p) { p.stock = (p.stock || 0) - it.cantidad; p.ultimaVenta = new Date().toISOString(); } }
        });
        if (metodo !== 'credito' && !programada) {
            const mon = metodo === 'efectivo_usd' ? 'USD' : 'PYG';
            DB.movCaja('entrada', `Venta ${venta.id} [${this._CANALES[canal] || canal}]`, mon === 'USD' ? DB.convertir(venta.total, 'PYG', 'USD') : venta.total, mon);
        }
        DB.data.ventas.push(venta); DB.guardar();
        Toast.show(programada ? `Pedido ${venta.id} programado ✓` : `Venta ${venta.id} guardada ✓`);
        this.cerrar(); App.renderNav(); App.actualizarStats();
    },

    cerrar() { document.getElementById('modal-venta').classList.remove('active'); this.items = []; this.total = 0; }
};

// ── Compras ──
const Compras = {
    items: [], totalCompra: 0,

    render() {
        const tbody = document.getElementById('tabla-compras'); if (!tbody) return;
        if (!DB.data.compras.length) { tbody.innerHTML = '<tr><td colspan="6" class="empty-state"><div class="empty-state-icon">📭</div>Sin compras</td></tr>'; return; }
        tbody.innerHTML = DB.data.compras.slice().reverse().map(c => `<tr><td><code>${c.id}</code></td><td>${FMT.date(c.fecha)}</td><td>${c.proveedor?.nombre || '-'}</td><td><span class="badge badge-info">${c.items?.length || 0} items</span></td><td><strong>${FMT.money(c.total)}</strong></td><td><span class="badge badge-${c.condicion === 'contado' ? 'success' : 'warning'}">${c.condicion}</span></td></tr>`).join('');
    },

    abrirModal() {
        this.items = []; this.totalCompra = 0; this.renderItems();
        document.getElementById('c-proveedor').innerHTML = '<option value="">Seleccionar...</option>' + DB.data.proveedores.map(p => `<option value="${p.id}">${p.nombre}</option>`).join('');
        document.getElementById('c-producto-existente').innerHTML = '<option value="">➕ Crear nuevo producto</option>' + DB.data.productos.map(p => `<option value="${p.id}">${p.codigo} — ${p.nombre} (Stock:${p.stock})</option>`).join('');
        this.toggleNuevo();
        document.getElementById('modal-compra').classList.add('active');
    },

    toggleNuevo() {
        const esNuevo = !document.getElementById('c-producto-existente').value;
        document.getElementById('c-nuevo-fields').style.display = esNuevo ? 'block' : 'none';
        if (!esNuevo) {
            const prod = DB.data.productos.find(p => p.id === document.getElementById('c-producto-existente').value);
            if (prod) { document.getElementById('c-codigo-nuevo').value = prod.codigo; document.getElementById('c-nombre-nuevo').value = prod.nombre; }
        } else { document.getElementById('c-codigo-nuevo').value = ''; document.getElementById('c-nombre-nuevo').value = ''; }
    },

    agregarItem() {
        const esN = !document.getElementById('c-producto-existente').value;
        const cant = parseInt(document.getElementById('c-cantidad').value) || 0;
        const costo = parseInt(document.getElementById('c-costo').value) || 0;
        const margen = parseInt(document.getElementById('c-margen').value) || 30;
        const mon = document.getElementById('c-moneda').value;
        if (cant <= 0 || costo <= 0) return Toast.show('Cantidad y costo requeridos', 'error');
        const costoPYG = mon === 'USD' ? costo * (DB.data.config.moneda.cambioUSD || 7500) : costo;
        const precio = Math.ceil(costoPYG / (1 - margen / 100) / 50) * 50;
        let item;
        if (esN) {
            const nombre = document.getElementById('c-nombre-nuevo').value.trim();
            const codigo = document.getElementById('c-codigo-nuevo').value.trim();
            if (!nombre || !codigo) return Toast.show('Nombre y código requeridos', 'error');
            if (DB.data.productos.some(p => p.codigo.toLowerCase() === codigo.toLowerCase())) return Toast.show('Código ya existe', 'error');
            item = { esN: true, codigo, nombre, cat: document.getElementById('c-categoria').value, cantidad: cant, costo: costoPYG, costoOrig: costo, mon, precio, margen };
        } else {
            const prod = DB.data.productos.find(p => p.id === document.getElementById('c-producto-existente').value);
            if (!prod) return Toast.show('Producto no encontrado', 'error');
            item = { esN: false, id: prod.id, codigo: prod.codigo, nombre: prod.nombre, cantidad: cant, costo: costoPYG, costoOrig: costo, mon, precio, margen };
        }
        this.items.push(item); this.renderItems();
        document.getElementById('c-cantidad').value = '1'; document.getElementById('c-costo').value = '';
        if (esN) { document.getElementById('c-codigo-nuevo').value = ''; document.getElementById('c-nombre-nuevo').value = ''; }
        Toast.show('Item agregado ✓');
    },

    quitarItem(i) { this.items.splice(i, 1); this.renderItems(); },

    renderItems() {
        document.getElementById('c-items').innerHTML = this.items.map((it, i) => `
        <tr style="${it.esN ? 'background:rgba(16,185,129,0.04)' : ''}">
            <td><code>${it.codigo}</code>${it.esN ? ' <span class="badge badge-success">NUEVO</span>' : ''}</td>
            <td><strong>${it.nombre}</strong></td><td>${it.cantidad}</td>
            <td>${FMT.mr(it.costoOrig, it.mon)}</td>
            <td><span class="text-success font-bold">${FMT.mr(it.precio, 'PYG')}</span><br><small class="text-muted">Margen ${it.margen}%</small></td>
            <td><strong>${FMT.mr(it.costoOrig * it.cantidad, it.mon)}</strong></td>
            <td><button onclick="Compras.quitarItem(${i})" class="btn btn-danger btn-sm">×</button></td>
        </tr>`).join('');
        const totalPYG = this.items.reduce((s, i) => s + i.costo * i.cantidad, 0);
        const mon = document.getElementById('c-moneda')?.value || 'PYG';
        const totalOrig = this.items.reduce((s, i) => s + i.costoOrig * i.cantidad, 0);
        document.getElementById('c-total').textContent = mon === 'PYG' ? FMT.mr(totalPYG, 'PYG') : `${FMT.mr(totalOrig, mon)} (≈ ${FMT.mr(totalPYG, 'PYG')})`;
        this.totalCompra = totalPYG;
    },

    guardar() {
        if (!this.items.length) return Toast.show('Agrega al menos un item', 'error');
        const provId = document.getElementById('c-proveedor').value; if (!provId) return Toast.show('Selecciona proveedor', 'error');
        const condicion = document.getElementById('c-condicion').value;
        const moneda = document.getElementById('c-moneda').value;
        const compra = { id: DB.id('compras'), fecha: new Date().toISOString(), proveedor: DB.data.proveedores.find(p => p.id === provId), items: [], condicion, moneda, total: this.totalCompra, facturaProv: document.getElementById('c-factura').value || null };
        this.items.forEach(it => {
            if (it.esN) { const n = { id: DB.id('productos'), codigo: it.codigo, nombre: it.nombre, categoria: it.cat, stock: it.cantidad, costoPromedio: it.costo, costo: it.costo, precio: it.precio, margen: it.margen, creado: new Date().toISOString() }; DB.data.productos.push(n); compra.items.push({ ...it, id: n.id }); }
            else { const ex = DB.data.productos.find(p => p.id === it.id); if (ex) { ex.costoPromedio = Calc.cpp(ex, { cantidad: it.cantidad, costo: it.costo }); ex.costo = it.costo; ex.stock = (ex.stock || 0) + it.cantidad; ex.precio = it.precio; ex.margen = it.margen; } compra.items.push({ ...it }); }
        });
        if (condicion === 'contado') { const m = moneda === 'USD' ? DB.convertir(compra.total, 'PYG', 'USD') : compra.total; DB.movCaja('salida', `Compra ${compra.id}`, m, moneda); }
        DB.data.compras.push(compra); DB.guardar();
        Toast.show(`Compra ${compra.id} registrada ✓`); this.cerrar(); App.renderNav(); App.actualizarStats();
    },

    cerrar() { document.getElementById('modal-compra').classList.remove('active'); this.items = []; this.totalCompra = 0; }
};

// ── Caja ──
const Caja = {
    filtro: 'todos',

    render() {
        const s = DB.saldoCaja();
        document.getElementById('caja-pyg').textContent = FMT.mr(s.PYG, 'PYG');
        document.getElementById('caja-usd').textContent = FMT.mr(s.USD, 'USD');
        document.getElementById('caja-eur').textContent = FMT.mr(s.EUR, 'EUR');
        document.getElementById('caja-apertura').textContent = DB.cajaHoy.apertura.hora;
        this._movs();
    },

    _movs() {
        const tbody = document.getElementById('caja-movimientos'); if (!tbody) return;
        let movs = [...DB.cajaHoy.movimientos];
        if (this.filtro !== 'todos') movs = movs.filter(m => m.tipo === this.filtro);
        if (!movs.length) { tbody.innerHTML = '<tr><td colspan="5" class="empty-state"><div class="empty-state-icon">📭</div>Sin movimientos</td></tr>'; return; }
        tbody.innerHTML = movs.reverse().map(m => `
        <tr>
            <td><strong>${m.hora}</strong></td>
            <td><span class="badge badge-${m.tipo === 'entrada' ? 'success' : 'danger'}">${m.tipo === 'entrada' ? 'INGRESO' : 'EGRESO'}</span></td>
            <td>${m.concepto}</td>
            <td><span class="badge badge-info">${m.moneda || 'PYG'}</span></td>
            <td style="font-weight:700;color:${m.tipo === 'entrada' ? 'var(--success)' : 'var(--danger)'}">
                ${m.tipo === 'entrada' ? '+' : '-'} ${FMT.mr(m.monto, m.moneda || 'PYG')}
            </td>
        </tr>`).join('');
    },

    filtrar(t) { this.filtro = t; this._movs(); },

    mov(tipo) {
        const concepto = document.getElementById('m-concepto').value.trim();
        const monto = parseFloat(document.getElementById('m-monto').value) || 0;
        const moneda = document.getElementById('m-moneda').value;
        if (!concepto) return Toast.show('Ingresa un concepto', 'error');
        if (monto <= 0) return Toast.show('Ingresa un monto válido', 'error');
        const s = DB.saldoCaja();
        if (tipo === 'salida' && monto > (s[moneda] || 0)) return Toast.show(`Fondos insuficientes en ${moneda}`, 'error');
        DB.movCaja(tipo, concepto, monto, moneda); this.render();
        document.getElementById('m-concepto').value = ''; document.getElementById('m-monto').value = '';
        Toast.show(`${tipo === 'entrada' ? 'Ingreso' : 'Egreso'}: ${FMT.mr(monto, moneda)}`);
    },

    cerrar() {
        if (!confirm('⚠️ ¿Cerrar caja? No habrá más movimientos hoy.')) return;
        const s = DB.saldoCaja();
        const ef = parseInt(prompt(`₲ Efectivo real (PYG)\nEsperado: ${FMT.mr(s.PYG, 'PYG')}`) || '0');
        const usd = parseFloat(prompt(`$ Dólares reales (USD)\nEsperado: ${FMT.mr(s.USD, 'USD')}`) || '0');
        const eur = parseFloat(prompt(`€ Euros reales (EUR)\nEsperado: ${FMT.mr(s.EUR, 'EUR')}`) || '0');
        DB.cajaHoy.cierre = { hora: new Date().toTimeString().slice(0, 5), esperado: s, real: { PYG: ef, USD: usd, EUR: eur }, diferencia: { PYG: ef - s.PYG, USD: usd - (s.USD || 0), EUR: eur - (s.EUR || 0) } };
        DB.guardar();
        const d = DB.cajaHoy.cierre.diferencia;
        alert(`✅ Caja cerrada\nDif PYG: ${d.PYG >= 0 ? '+' : ''}${FMT.mr(d.PYG, 'PYG')}\nDif USD: ${d.USD >= 0 ? '+' : ''}${FMT.mr(d.USD, 'USD')}\nDif EUR: ${d.EUR >= 0 ? '+' : ''}${FMT.mr(d.EUR, 'EUR')}`);
        location.reload();
    }
};

// ── Reportes ──
const Reportes = {
    activeTab: 'ventas-tab',

    tab(id) {
        this.activeTab = id;
        document.querySelectorAll('.report-tab').forEach((b, i) => {
            const tabs = ['ventas-tab', 'productos-tab', 'vendedores-tab', 'clientes-tab', 'compras-tab'];
            b.classList.toggle('active', tabs[i] === id);
        });
        document.querySelectorAll('.report-panel').forEach(p => { p.classList.toggle('active', p.id === id); });
        this.render();
    },

    _periodo() { const dias = parseInt(document.getElementById('rep-periodo')?.value) || 30; const desde = new Date(); desde.setDate(desde.getDate() - dias); return { dias, desde }; },
    _filtrarVentas() { const { desde } = this._periodo(); return DB.data.ventas.filter(v => v.fecha && new Date(v.fecha) >= desde); },
    _filtrarCompras() { const { desde } = this._periodo(); return DB.data.compras.filter(c => c.fecha && new Date(c.fecha) >= desde); },

    render() {
        const tab = this.activeTab;
        if (tab === 'ventas-tab') this._renderVentas();
        else if (tab === 'productos-tab') this._renderProductos();
        else if (tab === 'vendedores-tab') this._renderVendedores();
        else if (tab === 'clientes-tab') this._renderClientes();
        else if (tab === 'compras-tab') this._renderCompras();
    },

    _kpi(containerId, items) {
        const el = document.getElementById(containerId); if (!el) return;
        el.innerHTML = items.map(k => `<div class="kpi"><div class="kpi-val">${k.val}</div><div class="kpi-lbl">${k.lbl}</div></div>`).join('');
    },

    _renderVentas() {
        const ventas = this._filtrarVentas();
        const total = ventas.reduce((s, v) => s + v.total, 0);
        const pagadas = ventas.filter(v => v.estado === 'pagada');
        const pendientes = ventas.filter(v => v.estado === 'pendiente');
        const ticket = ventas.length ? Math.round(total / ventas.length) : 0;
        this._kpi('rep-kpi-ventas', [{ val: ventas.length, lbl: 'Total Ventas' }, { val: FMT.mr(total, 'PYG'), lbl: 'Monto Total' }, { val: FMT.mr(ticket, 'PYG'), lbl: 'Ticket Promedio' }, { val: pagadas.length, lbl: 'Pagadas' }, { val: pendientes.length, lbl: 'Crédito Pendiente' }, { val: FMT.mr(pendientes.reduce((s, v) => s + v.total, 0), 'PYG'), lbl: 'Total Crédito' }]);
        const porDia = {}; ventas.forEach(v => { const d = v.fecha.split('T')[0]; porDia[d] = (porDia[d] || 0) + v.total; });
        const dias = Object.keys(porDia).sort().slice(-14);
        const colores = ['var(--primary-gradient)', 'linear-gradient(135deg,#10b981,#34d399)', 'linear-gradient(135deg,#f59e0b,#fbbf24)', 'linear-gradient(135deg,#6366f1,#818cf8)', 'linear-gradient(135deg,#0ea5e9,#38bdf8)'];
        Charts.bar('rep-chart-diario', dias.map(d => ({ lbl: FMT.short(d), val: porDia[d], label2: FMT.mr(porDia[d], 'PYG') })), { height: 160, colors: colores });
        const metodos = {}; ventas.forEach(v => { metodos[v.metodo] = (metodos[v.metodo] || 0) + v.total; });
        const coloresM = ['#6366f1', '#10b981', '#f59e0b', '#0ea5e9', '#ef4444'];
        const donutData = Object.entries(metodos).map(([k, v], i) => ({ lbl: k, val: v, color: coloresM[i % coloresM.length] }));
        Charts.donut('rep-donut', 'rep-donut-legend', donutData.length ? donutData : [{ lbl: 'Sin datos', val: 1, color: '#94a3b8' }]);
        const tbody = document.getElementById('rep-tabla-ventas'); if (!tbody) return;
        if (!ventas.length) { tbody.innerHTML = '<tr><td colspan="7" class="empty-state"><div class="empty-state-icon">📭</div>Sin ventas en este período</td></tr>'; return; }
        tbody.innerHTML = ventas.slice().reverse().map(v => `<tr><td><code>${v.id}</code></td><td>${FMT.date(v.fecha)}</td><td>${v.cliente?.nombre || 'Ocasional'}</td><td>${v.vendedor?.nombre || '-'}</td><td><span class="badge badge-info">${v.metodo}</span></td><td><strong>${FMT.mr(v.total, 'PYG')}</strong></td><td><span class="badge badge-${v.estado === 'pagada' ? 'success' : 'warning'}">${v.estado}</span></td></tr>`).join('');
    },

    _renderProductos() {
        const ventas = this._filtrarVentas();
        const vendidos = {}; ventas.forEach(v => { v.items?.forEach(it => { if (!vendidos[it.id]) vendidos[it.id] = { nombre: it.nombre, cantidad: 0, total: 0 }; vendidos[it.id].cantidad += it.cantidad; vendidos[it.id].total += it.precio * it.cantidad * (1 - (it.desc || 0) / 100); }); });
        const topArr = Object.values(vendidos).sort((a, b) => b.total - a.total).slice(0, 10);
        const totalStock = DB.data.productos.reduce((s, p) => s + (p.stock || 0), 0);
        const stockCrit = DB.data.productos.filter(p => (p.stock || 0) < 10).length;
        const valorStock = DB.data.productos.reduce((s, p) => s + (p.costoPromedio || p.costo || 0) * (p.stock || 0), 0);
        this._kpi('rep-kpi-productos', [{ val: DB.data.productos.length, lbl: 'Productos Total' }, { val: totalStock, lbl: 'Unidades en Stock' }, { val: stockCrit, lbl: 'Stock Crítico' }, { val: FMT.mr(valorStock, 'PYG'), lbl: 'Valor del Stock' }, { val: FMT.mr(topArr.reduce((s, p) => s + p.total, 0), 'PYG'), lbl: 'Total Vendido (período)' }]);
        const gradients = ['var(--primary-gradient)', 'linear-gradient(135deg,#10b981,#34d399)', 'linear-gradient(135deg,#f59e0b,#fbbf24)', 'linear-gradient(135deg,#0ea5e9,#38bdf8)', 'linear-gradient(135deg,#ec4899,#f472b6)'];
        Charts.bar('rep-top-productos', topArr.map(p => ({ lbl: p.nombre.slice(0, 12), val: p.total, label2: FMT.mr(p.total, 'PYG') })), { height: 200, colors: gradients });
        const tbody = document.getElementById('rep-stock-critico'); if (!tbody) return;
        const crit = DB.data.productos.filter(p => (p.stock || 0) < 10).sort((a, b) => (a.stock || 0) - (b.stock || 0));
        if (!crit.length) { tbody.innerHTML = '<tr><td colspan="6" class="text-center text-muted" style="padding:1.5rem">✅ Sin productos críticos</td></tr>'; }
        else tbody.innerHTML = crit.map(p => `<tr><td><code>${p.codigo}</code></td><td>${p.nombre}</td><td style="font-weight:800;color:var(--danger)">${p.stock || 0}</td><td>${FMT.mr(p.costoPromedio || p.costo || 0, 'PYG')}</td><td class="text-success font-bold">${FMT.mr(p.precio || 0, 'PYG')}</td><td><span class="badge badge-${(p.stock || 0) === 0 ? 'info' : 'danger'}">${(p.stock || 0) === 0 ? 'Sin stock' : 'Crítico'}</span></td></tr>`).join('');
        const porCat = {}; ventas.forEach(v => { v.items?.forEach(it => { const cat = (DB.data.productos.find(p => p.id === it.id)?.categoria) || 'general'; porCat[cat] = (porCat[cat] || 0) + it.precio * it.cantidad * (1 - (it.desc || 0) / 100); }); });
        Charts.bar('rep-chart-categorias', Object.entries(porCat).map(([k, v]) => ({ lbl: k, val: v, label2: FMT.mr(v, 'PYG') })), { height: 160, colors: gradients });
    },

    _renderVendedores() {
        const ventas = this._filtrarVentas();
        const datos = DB.data.vendedores.map(v => { const vv = ventas.filter(x => x.vendedor?.id === v.id); const total = vv.reduce((s, x) => s + x.total, 0); return { ...v, cantVentas: vv.length, totalVendido: total, comisionGanada: total * (v.comision || 0) / 100, ticket: vv.length ? Math.round(total / vv.length) : 0 }; }).sort((a, b) => b.totalVendido - a.totalVendido);
        const totalComisiones = datos.reduce((s, v) => s + v.comisionGanada, 0);
        this._kpi('rep-kpi-vendedores', [{ val: datos.filter(v => v.activo).length, lbl: 'Vendedores Activos' }, { val: FMT.mr(datos.reduce((s, v) => s + v.totalVendido, 0), 'PYG'), lbl: 'Total Vendido' }, { val: datos[0]?.nombre || '-', lbl: 'Top Vendedor' }, { val: FMT.mr(totalComisiones, 'PYG'), lbl: 'Total Comisiones' }]);
        const gradients = ['var(--primary-gradient)', 'linear-gradient(135deg,#10b981,#34d399)', 'linear-gradient(135deg,#f59e0b,#fbbf24)', 'linear-gradient(135deg,#0ea5e9,#38bdf8)', 'linear-gradient(135deg,#ec4899,#f472b6)'];
        Charts.bar('rep-ranking-vendedores', datos.map(v => ({ lbl: v.nombre.split(' ')[0], val: v.totalVendido, label2: FMT.mr(v.totalVendido, 'PYG') })), { height: 200, colors: gradients });
        const tbody = document.getElementById('rep-tabla-vendedores'); if (!tbody) return;
        tbody.innerHTML = datos.map(v => `<tr><td><strong>${v.nombre}</strong></td><td>${v.cantVentas}</td><td><strong>${FMT.mr(v.totalVendido, 'PYG')}</strong></td><td>${FMT.mr(v.ticket, 'PYG')}</td><td>${v.comision || 0}%</td><td class="text-success font-bold">${FMT.mr(v.comisionGanada, 'PYG')}</td></tr>`).join('');
    },

    _renderClientes() {
        const ventas = this._filtrarVentas();
        const datos = DB.data.clientes.map(c => { const cv = ventas.filter(v => v.cliente?.id === c.id); const total = cv.reduce((s, v) => s + v.total, 0); const pendiente = DB.data.ventas.filter(v => v.cliente?.id === c.id && v.estado === 'pendiente').reduce((s, v) => s + v.total, 0); return { ...c, cantCompras: cv.length, totalComprado: total, ticket: cv.length ? Math.round(total / cv.length) : 0, creditoPendiente: pendiente, ultimaCompra: cv.length ? cv[cv.length - 1].fecha : null }; }).sort((a, b) => b.totalComprado - a.totalComprado);
        this._kpi('rep-kpi-clientes', [{ val: DB.data.clientes.length, lbl: 'Clientes Registrados' }, { val: ventas.filter(v => !v.cliente).length, lbl: 'Compras Ocasionales' }, { val: datos[0]?.nombre || '-', lbl: 'Mejor Cliente' }, { val: FMT.mr(datos.reduce((s, c) => s + c.creditoPendiente, 0), 'PYG'), lbl: 'Crédito Total Pendiente' }]);
        const gradients = ['var(--primary-gradient)', 'linear-gradient(135deg,#10b981,#34d399)', 'linear-gradient(135deg,#f59e0b,#fbbf24)', 'linear-gradient(135deg,#0ea5e9,#38bdf8)', 'linear-gradient(135deg,#ec4899,#f472b6)'];
        Charts.bar('rep-top-clientes', datos.slice(0, 8).map(c => ({ lbl: c.nombre.split(' ')[0], val: c.totalComprado, label2: FMT.mr(c.totalComprado, 'PYG') })), { height: 200, colors: gradients });
        const tbody = document.getElementById('rep-tabla-clientes'); if (!tbody) return;
        if (!datos.length) { tbody.innerHTML = '<tr><td colspan="6" class="empty-state"><div class="empty-state-icon">📭</div>Sin clientes</td></tr>'; return; }
        tbody.innerHTML = datos.map(c => `<tr><td><strong>${c.nombre}</strong>${c.ruc ? `<br><small class="text-muted">${c.ruc}</small>` : ''}</td><td>${c.cantCompras}</td><td><strong>${FMT.mr(c.totalComprado, 'PYG')}</strong></td><td>${FMT.mr(c.ticket, 'PYG')}</td><td>${FMT.date(c.ultimaCompra)}</td><td style="${c.creditoPendiente > 0 ? 'color:var(--warning);font-weight:700' : ''}">${FMT.mr(c.creditoPendiente, 'PYG')}</td></tr>`).join('');
    },

    _renderCompras() {
        const compras = this._filtrarCompras();
        const total = compras.reduce((s, c) => s + c.total, 0);
        const contado = compras.filter(c => c.condicion === 'contado').reduce((s, c) => s + c.total, 0);
        const credito = compras.filter(c => c.condicion === 'credito').reduce((s, c) => s + c.total, 0);
        this._kpi('rep-kpi-compras', [{ val: compras.length, lbl: 'Total Compras' }, { val: FMT.mr(total, 'PYG'), lbl: 'Monto Total' }, { val: FMT.mr(contado, 'PYG'), lbl: 'Al Contado' }, { val: FMT.mr(credito, 'PYG'), lbl: 'A Crédito' }, { val: new Set(compras.map(c => c.proveedor?.id)).size, lbl: 'Proveedores' }]);
        const porDia = {}; compras.forEach(c => { const d = c.fecha.split('T')[0]; porDia[d] = (porDia[d] || 0) + c.total; });
        const dias = Object.keys(porDia).sort().slice(-14);
        Charts.bar('rep-chart-compras', dias.map(d => ({ lbl: FMT.short(d), val: porDia[d], label2: FMT.mr(porDia[d], 'PYG') })), { height: 160, colors: ['linear-gradient(135deg,#10b981,#34d399)'] });
        const porProv = {}; compras.forEach(c => { const k = c.proveedor?.id || 'sin'; if (!porProv[k]) porProv[k] = { nombre: c.proveedor?.nombre || 'Sin proveedor', total: 0, count: 0, ultima: null }; porProv[k].total += c.total; porProv[k].count++; porProv[k].ultima = c.fecha; });
        const tbody = document.getElementById('rep-tabla-compras'); if (!tbody) return;
        if (!Object.keys(porProv).length) { tbody.innerHTML = '<tr><td colspan="5" class="empty-state"><div class="empty-state-icon">📭</div>Sin compras en este período</td></tr>'; return; }
        tbody.innerHTML = Object.values(porProv).sort((a, b) => b.total - a.total).map(p => `<tr><td><strong>${p.nombre}</strong></td><td>${p.count}</td><td><strong>${FMT.mr(p.total, 'PYG')}</strong></td><td>${FMT.date(p.ultima)}</td><td><span class="badge badge-success">Activo</span></td></tr>`).join('');
    },

    exportarCSV() {
        const ventas = this._filtrarVentas();
        const csv = [['Factura', 'Fecha', 'Cliente', 'Vendedor', 'Método', 'Subtotal', 'IVA', 'Total', 'Estado'].join(','), ...ventas.map(v => [v.id, FMT.date(v.fecha), `"${v.cliente?.nombre || 'Ocasional'}"`, `"${v.vendedor?.nombre || '-'}"`, v.metodo, v.subtotal, v.iva, v.total, v.estado].join(','))].join('\n');
        const a = Object.assign(document.createElement('a'), { href: URL.createObjectURL(new Blob([csv], { type: 'text/csv' })), download: `reporte_ventas_${new Date().toISOString().split('T')[0]}.csv` });
        a.click(); Toast.show('Reporte exportado ✓');
    }
};
