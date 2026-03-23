// ════════════════════════════════════════
// ÑEMUHA — jscore.js
// Constantes globales, utilidades, Toast, Charts, App
// ════════════════════════════════════════

// ── Monedas ──
const MONEDAS = { PYG: { s: '₲', d: 0 }, USD: { s: '$', d: 2 }, EUR: { s: '€', d: 2 } };

// ── Formato ──
const FMT = {
    money(n, mon) {
        const m = mon || DB.monedaActual;
        const v = DB.convertir(+n || 0, 'PYG', m);
        const c = MONEDAS[m] || MONEDAS.PYG;
        return c.s + ' ' + v.toLocaleString('es-PY', { minimumFractionDigits: c.d, maximumFractionDigits: c.d });
    },
    mr(n, m) {
        const c = MONEDAS[m] || MONEDAS.PYG;
        return c.s + ' ' + (+n || 0).toLocaleString('es-PY', { minimumFractionDigits: c.d, maximumFractionDigits: c.d });
    },
    date(d) { return d ? new Date(d).toLocaleDateString('es-PY', { day: '2-digit', month: 'short', year: 'numeric' }) : '-'; },
    short(d) { return d ? new Date(d).toLocaleDateString('es-PY', { day: '2-digit', month: '2-digit' }) : '-'; }
};

// ── Cálculos ──
const Calc = {
    cpp(p, n) {
        const s = p.stock || 0, ca = p.costoPromedio || p.costo || 0;
        return s === 0 ? n.costo : Math.round((s * ca + n.cantidad * n.costo) / (s + n.cantidad));
    },
    totales(items, iva = 10) {
        const sub = items.reduce((s, i) => s + (i.precio || 0) * i.cantidad * (1 - (i.desc || 0) / 100), 0);
        const imp = sub * iva / 100;
        return { subtotal: Math.round(sub), iva: Math.round(imp), total: Math.round(sub + imp) };
    }
};

// ── Toast ──
const Toast = {
    show(msg, t = 'success') {
        const bg = { success: 'linear-gradient(135deg,#10b981,#34d399)', error: 'linear-gradient(135deg,#ef4444,#f87171)', warning: 'linear-gradient(135deg,#f59e0b,#fbbf24)', info: 'linear-gradient(135deg,#6366f1,#818cf8)' }[t];
        const ic = { success: '✓', error: '✕', warning: '⚠', info: 'ℹ' }[t];
        const el = document.createElement('div');
        el.style.cssText = `position:fixed;bottom:20px;right:20px;z-index:10000;background:${bg};color:white;padding:13px 20px;border-radius:10px;font-weight:600;font-size:0.875rem;box-shadow:0 10px 20px rgba(0,0,0,0.2);transform:translateX(110%);transition:transform 0.3s cubic-bezier(.34,1.56,.64,1);display:flex;align-items:center;gap:8px;pointer-events:auto;`;
        el.innerHTML = `<span>${ic}</span><span>${msg}</span>`;
        document.body.appendChild(el);
        requestAnimationFrame(() => requestAnimationFrame(() => el.style.transform = 'translateX(0)'));
        setTimeout(() => { el.style.transform = 'translateX(110%)'; setTimeout(() => el.remove(), 300); }, 3000);
    }
};

// ── Charts (canvas-based) ──
const Charts = {
    bar(containerId, data, opts = {}) {
        const el = document.getElementById(containerId); if (!el) return;
        if (!data.length) { el.innerHTML = '<div class="empty-state" style="width:100%"><div class="empty-state-icon">📊</div>Sin datos</div>'; return; }
        const max = Math.max(...data.map(d => d.val), 1);
        const colors = opts.colors || ['var(--primary)'];
        el.innerHTML = data.map((d, i) => {
            const h = Math.max((d.val / max) * (opts.height || 160), 4);
            const color = colors[i % colors.length];
            return `<div class="bar-wrap"><div class="bar-val">${d.label2 || ''}</div><div class="bar" style="height:${h}px;background:${color};min-height:4px" title="${d.lbl}: ${d.label2 || d.val}"></div><div class="bar-lbl">${d.lbl}</div></div>`;
        }).join('');
    },

    donut(canvasId, legendId, data) {
        const canvas = document.getElementById(canvasId); if (!canvas) return;
        const ctx = canvas.getContext('2d');
        const total = data.reduce((s, d) => s + d.val, 0) || 1;
        const cx = 90, cy = 90, r = 75, inner = 45;
        ctx.clearRect(0, 0, 180, 180);
        let start = -Math.PI / 2;
        const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
        data.forEach(d => {
            const angle = (d.val / total) * Math.PI * 2;
            ctx.beginPath(); ctx.moveTo(cx, cy); ctx.arc(cx, cy, r, start, start + angle); ctx.closePath();
            ctx.fillStyle = d.color; ctx.fill();
            ctx.beginPath(); ctx.arc(cx, cy, inner, 0, Math.PI * 2); ctx.fillStyle = isDark ? '#1e293b' : 'white'; ctx.fill();
            start += angle;
        });
        ctx.fillStyle = isDark ? '#f8fafc' : '#1e293b';
        ctx.font = 'bold 13px Plus Jakarta Sans,sans-serif';
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillText('Métodos', cx, cy - 8);
        ctx.font = '11px Plus Jakarta Sans,sans-serif';
        ctx.fillStyle = '#94a3b8';
        ctx.fillText('de pago', cx, cy + 8);
        const leg = document.getElementById(legendId); if (!leg) return;
        leg.innerHTML = data.map(d => `<div class="donut-item"><div class="donut-dot" style="background:${d.color}"></div><span>${d.lbl}: <strong>${FMT.money(d.val)}</strong> (${Math.round(d.val / total * 100)}%)</span></div>`).join('');
    }
};

// ── App ──
const App = {
    init() {
        DB.init();
        Themes.init();
        this.aplicarTema();
        this.renderNav();

        if (!DB.data.config.empresa.nombre || !DB.data.config.empresa.ruc) {
            alert('⚠️ Bienvenido a Ñemuha\n\nPor favor, configurá los datos de tu empresa antes de comenzar (Nombre, RUC, Dirección).');
            this.show('config');
        } else {
            this.show('dashboard');
        }

        this.renderConfigForm();
        const el = document.getElementById('fecha-actual');
        if (el) el.textContent = new Date().toLocaleDateString('es-PY', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

        // Recordatorio de backup cada 5 min si hay ventas
        setInterval(() => {
            if (DB.data.ventas.length > 0 && DB.data.ventas.length % 50 === 0) {
                Toast.show('💾 Recordá hacer backup periódico (Configuración → Exportar Excel/JSON)', 'warning');
            }
        }, 300000);

        // Registrar SW
        if ('serviceWorker' in navigator) {
            navigator.serviceWorker.register('sw.js');
        }
    },

    show(sec) {
        document.querySelectorAll('.section').forEach(s => { s.classList.add('hidden'); s.classList.remove('animate-in'); });
        const el = document.getElementById(sec); if (!el) return;
        el.classList.remove('hidden'); void el.offsetWidth; el.classList.add('animate-in');
        document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
        document.querySelector(`[data-sec="${sec}"]`)?.classList.add('active');
        this.closeSidebar();
        const map = {
            ventas: () => Ventas.render(),
            pedidos: () => Pedidos.render(),
            compras: () => Compras.render(),
            caja: () => Caja.render(),
            inventario: () => Inventario.render(),
            warehouse: () => { InvVis.render(); },
            clientes: () => Entidades.render('clientes'),
            proveedores: () => Entidades.render('proveedores'),
            vendedores: () => Vendedores.render(),
            pagos: () => PagosProveedores.render(),
            nomina: () => Nomina.render(),
            reportes: () => Reportes.render(),
            dashboard: () => { this.actualizarStats(); this.renderChart(); this.renderDashVentas(); }
        };
        map[sec]?.();
    },

    renderNav() {
        const badges = { ventas: 'ventas', compras: 'compras', productos: 'productos', clientes: 'clientes' };
        Object.entries(badges).forEach(([k, v]) => { const el = document.getElementById('badge-' + k); if (el) el.textContent = DB.data[v === 'productos' ? 'productos' : v]?.length || 0; });
        const bv = document.getElementById('badge-vendedores'); if (bv) bv.textContent = DB.data.vendedores.filter(v => v.activo).length;
        const bp = document.getElementById('badge-pagos');
        if (bp) { const pend = DB.data.compras.filter(c => PagosProveedores._estadoCompra(c) !== 'pagada').length; bp.textContent = pend; bp.style.display = pend > 0 ? '' : 'none'; }
        const bped = document.getElementById('badge-pedidos');
        if (bped) { const pend = (DB.data.ventas || []).filter(v => v.programada && ['pendiente_entrega', 'confirmado', 'en_camino'].includes(v.estadoEntrega)).length; bped.textContent = pend; bped.style.display = pend > 0 ? '' : 'none'; }
    },

    actualizarStats() {
        const hoy = new Date().toISOString().split('T')[0];
        const inicioMes = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
        const vh = DB.data.ventas.filter(v => v.fecha && v.fecha.startsWith(hoy));
        const vm = DB.data.ventas.filter(v => v.fecha && new Date(v.fecha) >= inicioMes);
        document.getElementById('stat-hoy').textContent = FMT.money(vh.reduce((s, v) => s + (v.total || 0), 0));
        document.getElementById('stat-mes').textContent = FMT.money(vm.reduce((s, v) => s + (v.total || 0), 0));
        document.getElementById('stat-productos').textContent = DB.data.productos.length;
        document.getElementById('stat-stock-bajo').textContent = DB.data.productos.filter(p => (p.stock || 0) < 10).length;
    },

    renderChart() {
        const ventas = DB.data.ventas.slice(-7);
        const c = document.getElementById('chart-ventas'); if (!c) return;
        if (!ventas.length) { c.innerHTML = '<div class="empty-state" style="width:100%"><div class="empty-state-icon">📊</div>Sin datos aún</div>'; return; }
        const gradients = ['var(--primary-gradient)', 'linear-gradient(135deg,#10b981,#34d399)', 'linear-gradient(135deg,#f59e0b,#fbbf24)', 'linear-gradient(135deg,#6366f1,#818cf8)'];
        Charts.bar('chart-ventas', ventas.map((v, i) => ({ lbl: FMT.short(v.fecha), val: v.total, label2: FMT.money(v.total) })), { height: 160, colors: gradients });
    },

    renderDashVentas() {
        const tbody = document.getElementById('dash-ventas'); if (!tbody) return;
        const rec = DB.data.ventas.slice(-5).reverse();
        if (!rec.length) { tbody.innerHTML = '<tr><td colspan="5" class="empty-state"><div class="empty-state-icon">📭</div>Sin ventas aún</td></tr>'; return; }
        tbody.innerHTML = rec.map(v => `<tr><td><code>${v.id}</code></td><td>${v.cliente?.nombre || '<span class="text-muted">Ocasional</span>'}</td><td>${v.vendedor?.nombre || '-'}</td><td><strong>${FMT.money(v.total)}</strong></td><td><span class="badge badge-${v.estado === 'pagada' ? 'success' : 'warning'}">${v.estado}</span></td></tr>`).join('');
    },

    setMoneda(mon) {
        DB.monedaActual = mon;
        document.querySelectorAll('.currency-option').forEach(b => b.classList.toggle('active', b.textContent.includes(MONEDAS[mon]?.s)));
        this.actualizarStats();
    },

    toggleTheme() {
        const cur = Themes._current || 'light';
        const next = cur === 'dark' ? 'light' : 'dark';
        Themes.applyTheme(next);
    },

    aplicarTema() {
        const t = DB.data.config?.tema || 'light';
        document.documentElement.setAttribute('data-theme', t);
    },

    openSidebar() { document.getElementById('sidebar').classList.add('open'); document.getElementById('overlay').classList.add('active'); },
    closeSidebar() { document.getElementById('sidebar').classList.remove('open'); document.getElementById('overlay').classList.remove('active'); },

    exportarDatos() { Backup.exportarJSON(); },

    importarDatos(input) {
        const f = input.files[0]; if (!f) return;
        const r = new FileReader();
        r.onload = e => { try { const d = JSON.parse(e.target.result); if (confirm('¿Importar este backup? Se reemplazarán todos los datos actuales.')) { DB.data = d; DB.guardar(); location.reload(); } } catch { Toast.show('Archivo inválido', 'error'); } };
        r.readAsText(f); input.value = '';
    },

    renderConfigForm() {
        const s = (id, v) => { const e = document.getElementById(id); if (e) e.value = v || ''; };
        const cfg = DB.data.config;
        s('cfg-nombre', cfg.empresa.nombre); s('cfg-ruc', cfg.empresa.ruc);
        s('cfg-direccion', cfg.empresa.direccion); s('cfg-telefono', cfg.empresa.telefono);
        s('cfg-cambio-usd', cfg.moneda.cambioUSD); s('cfg-cambio-eur', cfg.moneda.cambioEUR);
        s('cfg-moneda-principal', cfg.moneda.principal);
    }
};
