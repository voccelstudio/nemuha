// ════════════════════════════════════════
// ÑEMUHA — jsinventario.js
// Inventario (tabla + importación Excel + categorías),
// InvVis (visualización warehouse), Warehouse (compat)
// ════════════════════════════════════════

// ── Inventario ──
const Inventario = {
    _datosImportacion: null,

    render() {
        const tbody = document.getElementById('tabla-productos'); if (!tbody) return;
        const ps = [...DB.data.productos].sort((a, b) => (b.stock || 0) - (a.stock || 0));
        document.getElementById('inv-total-productos').textContent = `${ps.length} productos`;
        if (!ps.length) { tbody.innerHTML = '<tr><td colspan="10" class="empty-state"><div class="empty-state-icon">📭</div>Sin productos. Agregá uno manualmente o importá desde Excel.</td></tr>'; return; }
        tbody.innerHTML = ps.map(p => {
            const bajo = (p.stock || 0) < (p.stockMinimo || 10);
            const mg = p.margen || Math.round(((p.precio - (p.costoPromedio || p.costo || 0)) / Math.max(p.precio, 1)) * 100);
            let vencBadge = '<span class="text-muted" style="font-size:0.75rem">—</span>';
            if (p.vencimiento) {
                const hoy = new Date(), venc = new Date(p.vencimiento);
                const dias = Math.ceil((venc - hoy) / (1000 * 60 * 60 * 24));
                const cls = dias < 0 ? 'badge-expiry-expired' : dias < (p.alertaDias || 30) ? 'badge-expiry-warn' : 'badge-expiry-ok';
                vencBadge = `<span class="badge ${cls}" style="display:inline-flex">${dias < 0 ? '⚠️ Vencido' : dias === 0 ? 'Hoy' : 'En ' + dias + 'd'}</span>`;
            }
            return `<tr style="${bajo ? 'background:rgba(239,68,68,0.04)' : ''}">
                <td><code>${p.codigo}</code></td><td><strong>${p.nombre}</strong></td>
                <td><span class="badge badge-info">${p.categoria || 'general'}</span></td>
                <td style="${bajo ? 'color:var(--danger);font-weight:800' : 'font-weight:600'}">${p.stock || 0}${bajo ? ' ⚠️' : ''}</td>
                <td>${FMT.mr(p.costoPromedio || p.costo || 0, 'PYG')}</td>
                <td class="text-success font-bold">${FMT.mr(p.precio, 'PYG')}</td>
                <td>${mg}%</td>
                <td>${vencBadge}</td>
                <td><span class="badge badge-${bajo ? 'danger' : (p.stock || 0) > 50 ? 'success' : 'warning'}">${bajo ? 'CRÍTICO' : (p.stock || 0) > 50 ? 'OK' : 'BAJO'}</span></td>
                <td class="flex gap-1">
                    <button class="btn btn-secondary btn-sm" onclick="Inventario.editar('${p.id}')">✏️</button>
                    <button class="btn btn-danger btn-sm" onclick="Inventario.eliminar('${p.id}')">🗑️</button>
                </td>
            </tr>`;
        }).join('');
    },

    buscar(t) { document.querySelectorAll('#tabla-productos tr').forEach(r => { r.style.display = r.textContent.toLowerCase().includes(t.toLowerCase()) ? '' : 'none'; }); },

    exportar() {
        const csv = [['Código', 'Nombre', 'Categoría', 'Stock', 'Costo', 'Precio', 'Margen'].join(','), ...DB.data.productos.map(p => [p.codigo, `"${p.nombre}"`, p.categoria, p.stock, p.costoPromedio || p.costo, p.precio, p.margen || ''].join(','))].join('\n');
        const a = Object.assign(document.createElement('a'), { href: URL.createObjectURL(new Blob([csv], { type: 'text/csv' })), download: `inventario_${new Date().toISOString().split('T')[0]}.csv` });
        a.click(); Toast.show('CSV exportado');
    },

    // ── Agregar / Editar producto manual ──
    abrirModalAgregar() {
        document.getElementById('prod-codigo').value = '';
        document.getElementById('prod-codigo-barras').value = '';
        document.getElementById('prod-nombre').value = '';
        document.getElementById('prod-categoria').value = 'general';
        document.getElementById('prod-stock').value = '0';
        document.getElementById('prod-stock-min').value = '10';
        document.getElementById('prod-costo').value = '0';
        document.getElementById('prod-margen').value = '30';
        document.getElementById('prod-precio').value = '0';
        document.getElementById('prod-ubicacion').value = '';
        document.getElementById('prod-descripcion').value = '';
        const selProv = document.getElementById('prod-proveedor');
        selProv.innerHTML = '<option value="">Sin proveedor asignado</option>' + DB.data.proveedores.map(p => `<option value="${p.id}">${p.nombre}</option>`).join('');
        this.calcularPrecio();
        // Restaurar botón guardar
        const btn = document.querySelector('#modal-producto-manual .btn-primary');
        if (btn) { btn.textContent = '💾 Guardar Producto'; btn.onclick = () => this.guardarProductoManual(); }
        document.getElementById('modal-producto-manual').classList.add('active');
    },

    cerrarModalAgregar() { document.getElementById('modal-producto-manual').classList.remove('active'); },

    calcularPrecio() {
        const costo = parseInt(document.getElementById('prod-costo').value) || 0;
        const margen = parseFloat(document.getElementById('prod-margen').value) || 0;
        const precio = Math.ceil(costo / (1 - margen / 100) / 50) * 50;
        document.getElementById('prod-precio').value = precio;
        this._actualizarGanancia();
    },

    calcularMargen() {
        const costo = parseInt(document.getElementById('prod-costo').value) || 0;
        const precio = parseInt(document.getElementById('prod-precio').value) || 0;
        if (costo > 0 && precio > 0) { const margen = Math.round(((precio - costo) / precio) * 100); document.getElementById('prod-margen').value = margen; }
        this._actualizarGanancia();
    },

    _actualizarGanancia() {
        const costo = parseInt(document.getElementById('prod-costo').value) || 0;
        const precio = parseInt(document.getElementById('prod-precio').value) || 0;
        const stock = parseInt(document.getElementById('prod-stock').value) || 0;
        document.getElementById('prod-ganancia').textContent = FMT.mr(precio - costo, 'PYG');
        document.getElementById('prod-valor-stock').textContent = FMT.mr(costo * stock, 'PYG');
    },

    guardarProductoManual() {
        const codigo = document.getElementById('prod-codigo').value.trim();
        const nombre = document.getElementById('prod-nombre').value.trim();
        if (!codigo || !nombre) return Toast.show('Código y nombre son requeridos', 'error');
        if (DB.data.productos.some(p => p.codigo.toLowerCase() === codigo.toLowerCase())) return Toast.show('El código ya existe', 'error');
        const costo = parseInt(document.getElementById('prod-costo').value) || 0;
        const precio = parseInt(document.getElementById('prod-precio').value) || 0;
        const margen = parseFloat(document.getElementById('prod-margen').value) || 0;
        const prod = {
            id: DB.id('productos'), codigo,
            codigoBarras: document.getElementById('prod-codigo-barras').value.trim() || null,
            nombre, categoria: document.getElementById('prod-categoria').value,
            stock: parseInt(document.getElementById('prod-stock').value) || 0,
            stockMinimo: parseInt(document.getElementById('prod-stock-min').value) || 10,
            costo, costoPromedio: costo, precio, margen,
            ubicacion: document.getElementById('prod-ubicacion').value.trim() || '',
            proveedorId: document.getElementById('prod-proveedor').value || null,
            descripcion: document.getElementById('prod-descripcion').value.trim() || '',
            vencimiento: document.getElementById('prod-vencimiento')?.value || null,
            alertaDias: parseInt(document.getElementById('prod-alerta-dias')?.value) || 30,
            creado: new Date().toISOString(), origen: 'manual'
        };
        DB.data.productos.push(prod); DB.guardar();
        Toast.show(`Producto ${codigo} agregado ✓`);
        this.cerrarModalAgregar(); this.render(); App.renderNav();
    },

    editar(id) {
        const p = DB.data.productos.find(x => x.id === id); if (!p) return;
        document.getElementById('prod-codigo').value = p.codigo;
        document.getElementById('prod-codigo-barras').value = p.codigoBarras || '';
        document.getElementById('prod-nombre').value = p.nombre;
        document.getElementById('prod-categoria').value = p.categoria || 'general';
        document.getElementById('prod-stock').value = p.stock || 0;
        document.getElementById('prod-stock-min').value = p.stockMinimo || 10;
        document.getElementById('prod-costo').value = p.costo || 0;
        document.getElementById('prod-margen').value = p.margen || 30;
        document.getElementById('prod-precio').value = p.precio || 0;
        document.getElementById('prod-ubicacion').value = p.ubicacion || '';
        document.getElementById('prod-descripcion').value = p.descripcion || '';
        if (document.getElementById('prod-vencimiento')) document.getElementById('prod-vencimiento').value = p.vencimiento || '';
        if (document.getElementById('prod-alerta-dias')) document.getElementById('prod-alerta-dias').value = p.alertaDias || 30;
        const selProv = document.getElementById('prod-proveedor');
        selProv.innerHTML = '<option value="">Sin proveedor asignado</option>' + DB.data.proveedores.map(pr => `<option value="${pr.id}" ${pr.id === p.proveedorId ? 'selected' : ''}>${pr.nombre}</option>`).join('');
        this._actualizarGanancia();
        const btn = document.querySelector('#modal-producto-manual .btn-primary');
        btn.textContent = '💾 Actualizar Producto'; btn.onclick = () => this.actualizarProducto(id);
        document.getElementById('modal-producto-manual').classList.add('active');
    },

    actualizarProducto(id) {
        const p = DB.data.productos.find(x => x.id === id); if (!p) return;
        const codigo = document.getElementById('prod-codigo').value.trim();
        const nombre = document.getElementById('prod-nombre').value.trim();
        if (!codigo || !nombre) return Toast.show('Código y nombre son requeridos', 'error');
        if (DB.data.productos.find(x => x.codigo.toLowerCase() === codigo.toLowerCase() && x.id !== id)) return Toast.show('El código ya existe en otro producto', 'error');
        p.codigo = codigo; p.codigoBarras = document.getElementById('prod-codigo-barras').value.trim() || null;
        p.nombre = nombre; p.categoria = document.getElementById('prod-categoria').value;
        p.stock = parseInt(document.getElementById('prod-stock').value) || 0;
        p.stockMinimo = parseInt(document.getElementById('prod-stock-min').value) || 10;
        p.costo = parseInt(document.getElementById('prod-costo').value) || 0; p.costoPromedio = p.costo;
        p.precio = parseInt(document.getElementById('prod-precio').value) || 0;
        p.margen = parseFloat(document.getElementById('prod-margen').value) || 0;
        p.ubicacion = document.getElementById('prod-ubicacion').value.trim() || '';
        p.proveedorId = document.getElementById('prod-proveedor').value || null;
        p.descripcion = document.getElementById('prod-descripcion').value.trim() || '';
        p.actualizado = new Date().toISOString();
        DB.guardar(); Toast.show(`Producto ${codigo} actualizado ✓`);
        this.cerrarModalAgregar(); this.render();
        const btn = document.querySelector('#modal-producto-manual .btn-primary');
        btn.textContent = '💾 Guardar Producto'; btn.onclick = () => this.guardarProductoManual();
    },

    eliminar(id) {
        if (!confirm('¿Eliminar este producto?')) return;
        DB.data.productos = DB.data.productos.filter(p => p.id !== id);
        DB.guardar(); Toast.show('Producto eliminado'); this.render(); App.renderNav();
    },

    // ── Importación desde Excel ──
    abrirModalImportar() {
        document.getElementById('card-importar').classList.remove('hidden');
        document.getElementById('preview-import').classList.add('hidden');
        document.getElementById('resultado-import').classList.add('hidden');
        this._datosImportacion = null;
        const zone = document.getElementById('drop-zone');
        zone.ondragover = (e) => { e.preventDefault(); zone.classList.add('dragover'); };
        zone.ondragleave = (e) => { e.preventDefault(); zone.classList.remove('dragover'); };
        zone.ondrop = (e) => { e.preventDefault(); zone.classList.remove('dragover'); const files = e.dataTransfer.files; if (files.length) this._procesarArchivo(files[0]); };
    },

    cerrarModalImportar() { document.getElementById('card-importar').classList.add('hidden'); document.getElementById('preview-import').classList.add('hidden'); document.getElementById('resultado-import').classList.add('hidden'); this._datosImportacion = null; },
    cancelarImportacion() { this.cerrarModalImportar(); document.getElementById('import-excel-file').value = ''; },
    procesarExcel(input) { const file = input.files[0]; if (!file) return; this._procesarArchivo(file); },

    _procesarArchivo(file) {
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const data = new Uint8Array(e.target.result);
                const workbook = XLSX.read(data, { type: 'array' });
                const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
                const jsonData = XLSX.utils.sheet_to_json(firstSheet, { header: 1 });
                if (jsonData.length < 2) { Toast.show('El archivo está vacío o no tiene datos', 'error'); return; }
                const headers = jsonData[0].map(h => String(h).toLowerCase().trim());
                const productos = [], errores = [];
                for (let i = 1; i < jsonData.length; i++) {
                    const row = jsonData[i];
                    if (!row.length || !row[0]) continue;
                    const getVal = (...names) => { for (let n of names) { const idx = headers.findIndex(h => h.includes(n.toLowerCase())); if (idx >= 0) return row[idx]; } return null; };
                    const codigo = String(getVal('codigo', 'code', 'sku', 'id') || '').trim();
                    const nombre = String(getVal('nombre', 'name', 'producto', 'descripcion') || '').trim();
                    if (!codigo || !nombre) { errores.push(`Fila ${i + 1}: falta código o nombre`); continue; }
                    if (DB.data.productos.some(p => p.codigo.toLowerCase() === codigo.toLowerCase())) { errores.push(`Fila ${i + 1}: código ${codigo} ya existe`); continue; }
                    const stock = parseInt(getVal('stock', 'cantidad', 'quantity', 'existencia')) || 0;
                    const costo = parseInt(getVal('costo', 'cost', 'precio_costo', 'costo_unitario')) || 0;
                    const precio = parseInt(getVal('precio', 'price', 'precio_venta', 'venta')) || 0;
                    const categoria = String(getVal('categoria', 'category', 'tipo', 'rubro') || 'general').toLowerCase();
                    const margen = precio > 0 ? Math.round(((precio - costo) / precio) * 100) : 30;
                    productos.push({ id: DB.id('productos'), codigo, codigoBarras: String(getVal('barcode', 'ean', 'upc') || '').trim() || null, nombre, categoria, stock, stockMinimo: parseInt(getVal('stock_minimo', 'minimo', 'alerta')) || 10, costo, costoPromedio: costo, precio: precio || Math.ceil(costo / 0.7 / 50) * 50, margen, ubicacion: String(getVal('ubicacion', 'location', 'pasillo') || '').trim(), descripcion: String(getVal('descripcion', 'notas', 'obs') || '').trim(), creado: new Date().toISOString(), origen: 'import_excel', _fila: i + 1 });
                }
                this._datosImportacion = { productos, errores };
                this._mostrarPreview();
            } catch (err) { console.error(err); Toast.show('Error al leer el archivo: ' + err.message, 'error'); }
        };
        reader.readAsArrayBuffer(file);
    },

    _mostrarPreview() {
        const { productos, errores } = this._datosImportacion;
        document.getElementById('preview-count').textContent = productos.length;
        document.getElementById('btn-import-count').textContent = productos.length;
        const tbody = document.getElementById('preview-tbody');
        tbody.innerHTML = productos.slice(0, 50).map(p => `<tr>
            <td><code>${p.codigo}</code></td><td><strong>${p.nombre}</strong></td>
            <td><span class="badge badge-info">${p.categoria}</span></td>
            <td>${p.stock}</td><td>${FMT.mr(p.costo, 'PYG')}</td>
            <td class="text-success font-bold">${FMT.mr(p.precio, 'PYG')}</td>
            <td>${p.margen}%</td><td><span class="badge badge-success">Nuevo</span></td>
        </tr>`).join('');
        if (productos.length > 50) tbody.innerHTML += `<tr><td colspan="8" class="text-center text-muted">... y ${productos.length - 50} productos más</td></tr>`;
        if (errores.length) tbody.innerHTML += `<tr><td colspan="8" style="background:rgba(239,68,68,0.1);padding:1rem;"><strong>⚠️ Errores detectados (${errores.length}):</strong><br><small>${errores.slice(0, 5).join('<br>')}${errores.length > 5 ? '<br>... y más' : ''}</small></td></tr>`;
        document.getElementById('preview-import').classList.remove('hidden');
        document.getElementById('drop-zone').classList.add('hidden');
    },

    confirmarImportacion() {
        if (!this._datosImportacion?.productos.length) { Toast.show('No hay productos para importar', 'error'); return; }
        const { productos } = this._datosImportacion;
        let importados = 0, duplicados = 0;
        productos.forEach(p => {
            if (DB.data.productos.some(x => x.codigo.toLowerCase() === p.codigo.toLowerCase())) { duplicados++; return; }
            delete p._fila;
            DB.data.productos.push(p); importados++;
        });
        DB.guardar();
        document.getElementById('res-importados').textContent = importados;
        document.getElementById('res-duplicados').textContent = duplicados;
        document.getElementById('res-errores').textContent = this._datosImportacion.errores.length;
        document.getElementById('resultado-import').classList.remove('hidden');
        document.getElementById('preview-import').classList.add('hidden');
        Toast.show(`${importados} productos importados ✓`, 'success');
        this.render(); App.renderNav();
        document.getElementById('import-excel-file').value = '';
    },

    // ── Categorías ──
    _getCats() {
        if (!DB.data.categoriasInventario) {
            DB.data.categoriasInventario = [
                { id: 'general', nombre: 'General', emoji: '📦', color: '#6366f1' },
                { id: 'alimentos', nombre: 'Alimentos', emoji: '🍔', color: '#f59e0b' },
                { id: 'bebidas', nombre: 'Bebidas', emoji: '🥤', color: '#0ea5e9' },
                { id: 'limpieza', nombre: 'Limpieza', emoji: '🧴', color: '#10b981' },
                { id: 'tecnologia', nombre: 'Tecnología', emoji: '💻', color: '#8b5cf6' },
                { id: 'moda', nombre: 'Moda', emoji: '👕', color: '#ec4899' },
                { id: 'hogar', nombre: 'Hogar', emoji: '🏠', color: '#f97316' },
                { id: 'digital', nombre: 'Digital/Servicio', emoji: '💻', color: '#06b6d4' },
                { id: 'otros', nombre: 'Otros', emoji: '🔧', color: '#94a3b8' }
            ];
        }
        return DB.data.categoriasInventario;
    },

    _refreshCatSelects() {
        const cats = this._getCats();
        document.querySelectorAll('#prod-categoria, #v-categoria-filter').forEach(sel => {
            if (!sel) return;
            const cur = sel.value;
            sel.innerHTML = cats.map(c => `<option value="${c.id}">${c.emoji} ${c.nombre}</option>`).join('');
            sel.value = cur;
        });
    },

    abrirModalCategorias() { this._getCats(); this._renderCatPanel(); document.getElementById('modal-categorias').classList.add('active'); },

    _renderCatPanel() {
        const cats = this._getCats();
        const chips = document.getElementById('categorias-lista');
        if (chips) chips.innerHTML = cats.map(c => `<span class="cat-chip" style="border-color:${c.color};color:${c.color}">${c.emoji} ${c.nombre}${c.id !== 'general' ? `<span class="chip-del" onclick="Inventario.eliminarCategoria('${c.id}')">✕</span>` : ''}</span>`).join('');
        const tbody = document.getElementById('categorias-tabla');
        if (tbody) tbody.innerHTML = cats.map(c => { const prods = DB.data.productos.filter(p => p.categoria === c.id); const stock = prods.reduce((s, p) => s + (p.stock || 0), 0); const valor = prods.reduce((s, p) => s + (p.costoPromedio || p.costo || 0) * (p.stock || 0), 0); return `<tr><td><span style="color:${c.color};font-weight:700">${c.emoji} ${c.nombre}</span></td><td>${prods.length}</td><td>${stock}</td><td>${FMT.mr(valor, 'PYG')}</td><td>${c.id !== 'general' ? `<button class="btn btn-danger btn-sm" onclick="Inventario.eliminarCategoria('${c.id}')">🗑️</button>` : ''}</td></tr>`; }).join('');
    },

    agregarCategoria() {
        const nombre = document.getElementById('cat-nombre').value.trim();
        if (!nombre) return Toast.show('Ingresá un nombre', 'error');
        const emoji = document.getElementById('cat-emoji').value.trim() || '📦';
        const color = document.getElementById('cat-color').value || '#6366f1';
        const id = nombre.toLowerCase().replace(/[^a-z0-9]/g, '_');
        const cats = this._getCats();
        if (cats.find(c => c.id === id)) return Toast.show('Ya existe esa categoría', 'error');
        cats.push({ id, nombre, emoji, color }); DB.data.categoriasInventario = cats; DB.guardar();
        document.getElementById('cat-nombre').value = ''; this._renderCatPanel(); this._refreshCatSelects();
        Toast.show(`Categoría "${nombre}" agregada ✓`, 'success');
    },

    eliminarCategoria(id) {
        if (!confirm('¿Eliminar esta categoría? Los productos quedarán en "General"')) return;
        DB.data.productos.filter(p => p.categoria === id).forEach(p => p.categoria = 'general');
        DB.data.categoriasInventario = this._getCats().filter(c => c.id !== id); DB.guardar();
        this._renderCatPanel(); this._refreshCatSelects(); this.render(); Toast.show('Categoría eliminada');
    },

    guardarCategorias() { DB.guardar(); this._refreshCatSelects(); document.getElementById('modal-categorias').classList.remove('active'); Toast.show('Categorías guardadas ✓'); },

    guardarDBArchivo() {
        const nombre = document.getElementById('db-filename')?.value.trim() || 'inventario_db';
        const payload = { version: '2.0', tipo: 'inventario', exportado: new Date().toISOString(), empresa: DB.data.config.empresa.nombre || 'Ñemuha', productos: DB.data.productos, categorias: DB.data.categoriasInventario || [] };
        const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
        const a = Object.assign(document.createElement('a'), { href: URL.createObjectURL(blob), download: `${nombre}.json` });
        a.click(); URL.revokeObjectURL(a.href); Toast.show('Base de datos exportada ✓');
    }
};

// ── InvVis — Visualización de Inventario (Warehouse) ──
const InvVis = {
    _busqTerm: '',
    _catEmoji: { general: '📦', alimentos: '🍔', bebidas: '🥤', limpieza: '🧴', tecnologia: '💻', tecnología: '💻', moda: '👕', hogar: '🏠', digital: '💻', otros: '🔧', default: '📦' },
    _catColor: { general: '#6366f1', alimentos: '#f59e0b', bebidas: '#0ea5e9', limpieza: '#10b981', tecnologia: '#8b5cf6', tecnología: '#8b5cf6', moda: '#ec4899', hogar: '#f97316', digital: '#06b6d4', otros: '#94a3b8', default: '#6366f1' },

    render() {
        const ps = DB.data.productos;
        // Stats — IDs del HTML son w3d-stat-*
        const total = ps.length;
        const ok = ps.filter(p => (p.stock || 0) >= (p.stockMinimo || 10)).length;
        const low = ps.filter(p => { const s = p.stock || 0, m = p.stockMinimo || 10; return s > 0 && s < m; }).length;
        const crit = ps.filter(p => (p.stock || 0) === 0).length;
        const valorTotal = ps.reduce((s, p) => s + (p.stock || 0) * (p.costoPromedio || p.costo || 0), 0);
        const se = (id, v) => { const e = document.getElementById(id); if (e) e.textContent = v; };
        se('w3d-stat-total', total); se('w3d-stat-ok', ok); se('w3d-stat-low', low); se('w3d-stat-crit', crit);
        const arr = this._filtrar(ps);
        this._renderCatBars(ps);
        this._renderValorList(ps);
        this._renderCards(arr);
        this._renderTabla(arr);
    },

    _filtrar(ps) {
        const filtroEl = document.getElementById('inv-vis-filtro');
        const ordenEl = document.getElementById('inv-vis-orden');
        const filtro = filtroEl ? filtroEl.value : 'todos';
        const orden = ordenEl ? ordenEl.value : 'stock_asc';
        let arr = ps.slice();
        if (filtro === 'critico') arr = arr.filter(p => (p.stock || 0) === 0);
        else if (filtro === 'bajo') arr = arr.filter(p => { const s = p.stock || 0, m = p.stockMinimo || 10; return s > 0 && s < m; });
        else if (filtro === 'ok') arr = arr.filter(p => (p.stock || 0) >= (p.stockMinimo || 10));
        if (this._busqTerm) { const t = this._busqTerm; arr = arr.filter(p => p.nombre.toLowerCase().includes(t) || (p.codigo || '').toLowerCase().includes(t) || (p.categoria || '').toLowerCase().includes(t)); }
        if (orden === 'stock_asc') arr.sort((a, b) => (a.stock || 0) - (b.stock || 0));
        else if (orden === 'stock_desc') arr.sort((a, b) => (b.stock || 0) - (a.stock || 0));
        else if (orden === 'nombre') arr.sort((a, b) => a.nombre.localeCompare(b.nombre));
        else if (orden === 'valor') arr.sort((a, b) => ((b.stock || 0) * (b.costoPromedio || b.precio || 0)) - ((a.stock || 0) * (a.costoPromedio || a.precio || 0)));
        return arr;
    },

    _renderCatBars(ps) {
        const el = document.getElementById('inv-cat-bars'); if (!el) return;
        const cats = {};
        ps.forEach(p => { const c = p.categoria || 'general'; if (!cats[c]) cats[c] = { total: 0, ok: 0, low: 0, crit: 0 }; cats[c].total++; const s = p.stock || 0, m = p.stockMinimo || 10; if (s === 0) cats[c].crit++; else if (s < m) cats[c].low++; else cats[c].ok++; });
        if (!Object.keys(cats).length) { el.innerHTML = '<div class="empty-state"><div class="empty-state-icon">📭</div>Sin productos</div>'; return; }
        const maxT = Math.max(...Object.values(cats).map(c => c.total), 1);
        el.innerHTML = Object.entries(cats).map(([name, c]) => {
            const pctOk = c.total ? Math.round(c.ok / c.total * 100) : 0;
            const pctLow = c.total ? Math.round(c.low / c.total * 100) : 0;
            const pctCrit = c.total ? Math.round(c.crit / c.total * 100) : 0;
            const emoji = this._catEmoji[name] || this._catEmoji.default;
            const barW = Math.max(8, Math.round(c.total / maxT * 100));
            return `<div style="margin-bottom:0.75rem">
                <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:0.25rem">
                    <span style="font-size:0.82rem;font-weight:600">${emoji} ${name}</span>
                    <span style="font-size:0.72rem;color:var(--text-muted)">${c.total} prod.</span>
                </div>
                <div style="height:10px;border-radius:6px;overflow:hidden;background:var(--border);width:${barW}%">
                    <div style="display:flex;height:100%">
                        <div style="width:${pctOk}%;background:#10b981" title="${c.ok} OK"></div>
                        <div style="width:${pctLow}%;background:#f59e0b" title="${c.low} bajo"></div>
                        <div style="width:${pctCrit}%;background:#ef4444" title="${c.crit} sin stock"></div>
                    </div>
                </div>
                <div style="font-size:0.67rem;color:var(--text-muted);margin-top:0.2rem">
                    <span style="color:#10b981">■ ${pctOk}% OK</span>&nbsp;
                    <span style="color:#f59e0b">■ ${pctLow}% bajo</span>&nbsp;
                    <span style="color:#ef4444">■ ${pctCrit}% sin stock</span>
                </div>
            </div>`;
        }).join('');
    },

    _renderValorList(ps) {
        const el = document.getElementById('inv-valor-list'); if (!el) return;
        if (!ps.length) { el.innerHTML = '<div class="empty-state"><div class="empty-state-icon">💰</div>Sin productos</div>'; return; }
        const totalVal = ps.reduce((s, p) => s + (p.stock || 0) * (p.costoPromedio || p.precio || 0), 0);
        const cats = {}; ps.forEach(p => { const c = p.categoria || 'general'; if (!cats[c]) cats[c] = 0; cats[c] += (p.stock || 0) * (p.costoPromedio || p.precio || 0); });
        const sorted = Object.entries(cats).sort((a, b) => b[1] - a[1]);
        const maxV = sorted[0] ? sorted[0][1] : 1;
        el.innerHTML = `<div style="margin-bottom:0.75rem;padding-bottom:0.75rem;border-bottom:1px solid var(--border)"><div style="font-size:0.72rem;color:var(--text-muted);text-transform:uppercase;letter-spacing:0.05em">Total inventario</div><div style="font-size:1.5rem;font-weight:800;background:var(--primary-gradient);-webkit-background-clip:text;-webkit-text-fill-color:transparent">${FMT.mr(totalVal, 'PYG')}</div></div>` + sorted.map(([name, val]) => {
            const pct = Math.max(4, Math.round(val / maxV * 100));
            const color = this._catColor[name] || this._catColor.default;
            const emoji = this._catEmoji[name] || this._catEmoji.default;
            return `<div style="display:flex;align-items:center;gap:0.75rem"><span style="width:80px;font-size:0.78rem;font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis" title="${name}">${emoji} ${name}</span><div style="flex:1;height:8px;border-radius:4px;background:var(--border);overflow:hidden"><div style="width:${pct}%;height:100%;background:${color};border-radius:4px;transition:width 0.6s ease"></div></div><span style="font-size:0.75rem;font-weight:700;min-width:80px;text-align:right">${FMT.mr(val, 'PYG')}</span></div>`;
        }).join('');
    },

    _renderCards(arr) {
        const el = document.getElementById('inv-vis-cards'); if (!el) return;
        if (!arr.length) { el.innerHTML = '<div style="grid-column:1/-1;text-align:center;padding:2rem;color:var(--text-muted)"><div style="font-size:2rem;margin-bottom:0.5rem">📭</div>Sin productos que mostrar</div>'; return; }
        el.innerHTML = arr.map(p => {
            const s = p.stock || 0, m = p.stockMinimo || 10;
            const crit = s === 0, low = !crit && s < m;
            const pct = m > 0 ? Math.min(100, Math.round(s / m * 100)) : 100;
            const clr = crit ? '#ef4444' : low ? '#f59e0b' : '#10b981';
            const bg = crit ? 'rgba(239,68,68,0.06)' : low ? 'rgba(245,158,11,0.06)' : 'rgba(16,185,129,0.04)';
            const border = crit ? 'rgba(239,68,68,0.25)' : low ? 'rgba(245,158,11,0.25)' : 'rgba(16,185,129,0.2)';
            const lbl = crit ? 'Sin stock' : low ? 'Stock bajo' : 'OK';
            const emoji = this._catEmoji[p.categoria || 'general'] || '📦';
            let venc = '';
            if (p.vencimiento) { const dias = Math.ceil((new Date(p.vencimiento) - new Date()) / 86400000); const vc = dias < 0 ? 'Vencido' : dias === 0 ? 'Hoy' : dias < (p.alertaDias || 30) ? `En ${dias}d` : ''; if (vc) venc = `<div style="font-size:0.65rem;color:${dias < 0 ? '#ef4444' : '#f59e0b'};margin-top:0.2rem">⏰ ${vc}</div>`; }
            return `<div style="background:${bg};border:1px solid ${border};border-radius:var(--radius);padding:1rem;transition:all var(--transition);cursor:default" onmouseover="this.style.transform='translateY(-2px)';this.style.boxShadow='var(--shadow)'" onmouseout="this.style.transform='';this.style.boxShadow=''">
                <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:0.5rem"><span style="font-size:1.4rem">${emoji}</span><span style="font-size:0.65rem;font-weight:800;padding:0.2rem 0.5rem;border-radius:20px;background:${clr}22;color:${clr}">${lbl}</span></div>
                <div style="font-size:0.85rem;font-weight:700;margin-bottom:0.2rem;overflow:hidden;text-overflow:ellipsis;white-space:nowrap" title="${p.nombre}">${p.nombre}</div>
                <div style="font-size:0.7rem;color:var(--text-muted);margin-bottom:0.6rem"><code>${p.codigo || '—'}</code></div>
                <div style="font-size:1.3rem;font-weight:800;color:${clr}">${s}</div>
                <div style="font-size:0.68rem;color:var(--text-muted);margin-bottom:0.5rem">stock / mín: ${m}</div>
                <div style="height:5px;border-radius:3px;background:var(--border);overflow:hidden"><div style="width:${pct}%;height:100%;background:${clr};border-radius:3px;transition:width 0.6s ease"></div></div>
                ${venc}
                <div style="margin-top:0.5rem;font-size:0.7rem;color:var(--text-muted)">Valor: <strong>${FMT.mr(s * (p.costoPromedio || p.precio || 0), 'PYG')}</strong></div>
            </div>`;
        }).join('');
    },

    _renderTabla(arr) {
        const tbody = document.getElementById('warehouse-tabla'); if (!tbody) return;
        const aisle = ['A', 'B', 'C', 'D', 'E', 'F'];
        if (!arr.length) { tbody.innerHTML = '<tr><td colspan="7" class="empty-state" style="text-align:center;padding:1.5rem;color:var(--text-muted)">📭 Sin productos que mostrar</td></tr>'; return; }
        tbody.innerHTML = arr.map((p, i) => {
            const s = p.stock || 0, m = p.stockMinimo || 10;
            const est = s === 0 ? 'danger' : s < m ? 'warning' : 'success';
            const lbl = s === 0 ? 'Sin stock' : s < m ? 'Bajo' : 'OK';
            let vb = '<span style="color:var(--text-muted);font-size:.75rem">—</span>';
            if (p.vencimiento) { const dias = Math.ceil((new Date(p.vencimiento) - new Date()) / 86400000); const cls = dias < 0 ? 'badge-expiry-expired' : dias < (p.alertaDias || 30) ? 'badge-expiry-warn' : 'badge-expiry-ok'; vb = `<span class="${cls}">${dias < 0 ? 'Vencido' : dias === 0 ? 'Hoy' : 'En ' + dias + 'd'}</span>`; }
            return `<tr><td><strong>${p.nombre}</strong><br><small style="color:var(--text-muted)"><code>${p.codigo}</code></small></td><td><span class="badge badge-info">${p.categoria || 'general'}</span></td><td style="font-weight:700;color:var(--${est})">${s}</td><td>${p.ubicacion ? p.ubicacion.split(',')[0] : aisle[i % 6]}</td><td>${p.ubicacion ? p.ubicacion.split(',')[1] || Math.floor(i / 6) + 1 : Math.floor(i / 6) + 1}</td><td>${vb}</td><td><span class="badge badge-${est}">${lbl}</span></td></tr>`;
        }).join('');
    },

    buscar(t) { this._busqTerm = (t || '').toLowerCase().trim(); this.render(); }
};

// Compat shim para referencias a Warehouse y Warehouse3D
const Warehouse = { render() { InvVis.render(); } };
const Warehouse3D = { buscar(t) { InvVis.buscar(t); } };
