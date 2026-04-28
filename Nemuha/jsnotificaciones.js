// ════════════════════════════════════════
// ÑEMUHA — jsnotificaciones.js
// Sistema de notificaciones in-app
// ════════════════════════════════════════

const Notificaciones = {
    _KEY: 'nemuha_notifs_v1',
    _data: [], // { id, tipo, titulo, mensaje, fecha, leida, data }

    _TIPOS: {
        stock:    { icon: '📦', color: '#ef4444', label: 'Stock Crítico' },
        pagos:    { icon: '💳', color: '#f59e0b', label: 'Pago Vencido' },
        salarios: { icon: '👷', color: '#f59e0b', label: 'Salario Pendiente' },
        pedidos:  { icon: '📅', color: '#0ea5e9', label: 'Pedido por Vencer' },
        ventas:   { icon: '💰', color: '#10b981', label: 'Resumen de Ventas' },
        sistema:  { icon: '⚙️', color: '#8b5cf6', label: 'Sistema' },
    },

    // ── Init ──
    init() {
        this._cargar();
        this._generarAlertas();
        this._renderBadge();
        this._inyectarUI();
    },

    // ── Persistencia ──
    _cargar() {
        try {
            const raw = localStorage.getItem(this._KEY);
            this._data = raw ? JSON.parse(raw) : [];
        } catch (e) { this._data = []; }
    },

    _guardar() {
        localStorage.setItem(this._KEY, JSON.stringify(this._data));
    },

    // ── Generar alertas automáticas ──
    _generarAlertas() {
        const ahora = new Date();
        const hoy = ahora.toISOString().split('T')[0];

        // Limpiar notificaciones automáticas viejas (> 7 días) y regenerar
        this._data = this._data.filter(n => {
            if (n._auto) {
                const dias = (ahora - new Date(n.fecha)) / 86400000;
                return dias < 7 && n.leida; // solo conservar leídas recientes
            }
            return true; // conservar manuales siempre
        });

        // IDs ya existentes para no duplicar
        const existentes = new Set(this._data.map(n => n._autoId).filter(Boolean));

        const nuevas = [];

        // ── 📦 Stock crítico ──
        (DB.data.productos || []).forEach(p => {
            const id = `stock_${p.id}`;
            if (existentes.has(id)) return;
            const stock = p.stock || 0;
            const min = p.stockMinimo || 10;
            if (stock <= 0) {
                nuevas.push(this._nueva('stock', `Sin stock: ${p.nombre}`,
                    `El producto <strong>${p.nombre}</strong> (${p.codigo}) está completamente agotado.`,
                    id));
            } else if (stock < min) {
                nuevas.push(this._nueva('stock', `Stock bajo: ${p.nombre}`,
                    `<strong>${p.nombre}</strong> tiene solo ${stock} unidades (mínimo: ${min}).`,
                    id));
            }
        });

        // ── 💳 Pagos a proveedores vencidos ──
        (DB.data.compras || []).forEach(c => {
            if (c.condicion !== 'credito') return;
            const id = `pago_${c.id}`;
            if (existentes.has(id)) return;
            const pagado = (DB.data.pagosProveedores || [])
                .filter(p => p.compraId === c.id)
                .reduce((s, p) => s + (p.moneda === 'PYG' ? p.monto : DB.convertir(p.monto, p.moneda, 'PYG')), 0);
            if (pagado < (c.total || 0)) {
                const saldo = (c.total || 0) - pagado;
                const diasAntiguo = Math.floor((ahora - new Date(c.fecha)) / 86400000);
                if (diasAntiguo > 30) {
                    nuevas.push(this._nueva('pagos',
                        `Pago vencido: ${c.proveedor?.nombre || 'Proveedor'}`,
                        `La compra <strong>${c.id}</strong> tiene un saldo pendiente de <strong>${FMT.mr(saldo, 'PYG')}</strong> hace ${diasAntiguo} días.`,
                        id));
                }
            }
        });

        // ── 👷 Salarios pendientes ──
        const mesActual = ahora.toISOString().slice(0, 7);
        (DB.data.empleados || []).filter(e => e.activo !== false).forEach(e => {
            const id = `salario_${e.id}_${mesActual}`;
            if (existentes.has(id)) return;
            const pagado = (DB.data.pagosEmpleados || [])
                .filter(p => p.empleadoId === e.id && p.periodo === mesActual)
                .reduce((s, p) => s + p.monto, 0);
            if (pagado < (e.salario || 0)) {
                const pendiente = (e.salario || 0) - pagado;
                nuevas.push(this._nueva('salarios',
                    `Salario pendiente: ${e.nombre}`,
                    `<strong>${e.nombre}</strong> tiene ${FMT.mr(pendiente, 'PYG')} pendiente de pago este mes (${mesActual}).`,
                    id));
            }
        });

        // ── 📅 Pedidos próximos a vencer (en las próximas 24h) ──
        (DB.data.ventas || []).filter(v => v.programada && ['pendiente_entrega', 'confirmado', 'en_camino'].includes(v.estadoEntrega)).forEach(v => {
            const id = `pedido_${v.id}`;
            if (existentes.has(id)) return;
            if (!v.fechaEntrega) return;
            const diff = (new Date(v.fechaEntrega) - ahora) / 3600000; // horas
            if (diff < 0) {
                nuevas.push(this._nueva('pedidos',
                    `Pedido vencido: ${v.id}`,
                    `El pedido <strong>${v.id}</strong> de ${v.cliente?.nombre || 'Cliente ocasional'} debía entregarse el ${FMT.date(v.fechaEntrega)} y sigue pendiente.`,
                    id));
            } else if (diff <= 24) {
                nuevas.push(this._nueva('pedidos',
                    `Entrega próxima: ${v.id}`,
                    `El pedido <strong>${v.id}</strong> de ${v.cliente?.nombre || 'Cliente ocasional'} vence en ${Math.round(diff)}h (${FMT.date(v.fechaEntrega)}).`,
                    id));
            }
        });

        // ── 💰 Resumen de ventas (1 por día, a partir de las 8am) ──
        const idResumen = `resumen_${hoy}`;
        if (!existentes.has(idResumen) && ahora.getHours() >= 8) {
            const ventasHoy = (DB.data.ventas || []).filter(v => v.fecha?.startsWith(hoy));
            const totalHoy = ventasHoy.reduce((s, v) => s + (v.total || 0), 0);
            if (ventasHoy.length > 0) {
                nuevas.push(this._nueva('ventas',
                    `Resumen del día — ${FMT.date(hoy)}`,
                    `Hoy realizaste <strong>${ventasHoy.length} venta${ventasHoy.length > 1 ? 's' : ''}</strong> por un total de <strong>${FMT.mr(totalHoy, 'PYG')}</strong>.`,
                    idResumen));
            }
        }

        if (nuevas.length) {
            this._data = [...nuevas, ...this._data];
            this._guardar();
        }
    },

    _nueva(tipo, titulo, mensaje, autoId = null) {
        return {
            id: 'N-' + Date.now() + '-' + Math.random().toString(36).slice(2, 6),
            tipo,
            titulo,
            mensaje,
            fecha: new Date().toISOString(),
            leida: false,
            _auto: !!autoId,
            _autoId: autoId || null,
        };
    },

    // ── Badge ──
    _renderBadge() {
        const badge = document.getElementById('notif-badge');
        const noLeidas = this._data.filter(n => !n.leida).length;
        if (!badge) return;
        badge.textContent = noLeidas > 99 ? '99+' : noLeidas;
        badge.style.display = noLeidas > 0 ? 'flex' : 'none';
    },

    // ── Panel ──
    toggle() {
        const panel = document.getElementById('notif-panel');
        if (!panel) return;
        const abierto = panel.classList.contains('open');
        abierto ? this.cerrar() : this.abrir();
    },

    abrir() {
        const panel = document.getElementById('notif-panel');
        if (panel) { panel.classList.add('open'); this._renderPanel(); }
        // Cerrar al clickear fuera
        setTimeout(() => document.addEventListener('click', this._clickFuera.bind(this), { once: true }), 50);
    },

    cerrar() {
        const panel = document.getElementById('notif-panel');
        if (panel) panel.classList.remove('open');
    },

    _clickFuera(e) {
        const panel = document.getElementById('notif-panel');
        const btn = document.getElementById('notif-btn');
        if (panel && !panel.contains(e.target) && btn && !btn.contains(e.target)) {
            this.cerrar();
        }
    },

    _renderPanel() {
        const lista = document.getElementById('notif-lista');
        if (!lista) return;

        if (!this._data.length) {
            lista.innerHTML = `<div style="text-align:center;padding:2rem;color:var(--text-muted)">
                <div style="font-size:2.5rem;margin-bottom:0.5rem">🎉</div>
                <div style="font-weight:600">Todo en orden</div>
                <div style="font-size:0.8rem;margin-top:0.25rem">No hay notificaciones pendientes</div>
            </div>`;
            return;
        }

        lista.innerHTML = this._data.slice(0, 50).map(n => {
            const t = this._TIPOS[n.tipo] || this._TIPOS.sistema;
            const hace = this._tiempoRelativo(n.fecha);
            return `<div class="notif-item ${n.leida ? 'leida' : ''}" onclick="Notificaciones.marcarLeida('${n.id}')">
                <div class="notif-icono" style="background:${t.color}22;color:${t.color}">${t.icon}</div>
                <div class="notif-contenido">
                    <div class="notif-titulo">${n.titulo}</div>
                    <div class="notif-msg">${n.mensaje}</div>
                    <div class="notif-meta">
                        <span style="background:${t.color}22;color:${t.color};padding:0.15rem 0.5rem;border-radius:20px;font-size:0.68rem;font-weight:700">${t.label}</span>
                        <span>${hace}</span>
                    </div>
                </div>
                ${!n.leida ? '<div class="notif-dot"></div>' : ''}
            </div>`;
        }).join('');
    },

    marcarLeida(id) {
        const n = this._data.find(x => x.id === id);
        if (n) { n.leida = true; this._guardar(); this._renderBadge(); this._renderPanel(); }
    },

    marcarTodasLeidas() {
        this._data.forEach(n => n.leida = true);
        this._guardar();
        this._renderBadge();
        this._renderPanel();
    },

    limpiarLeidas() {
        this._data = this._data.filter(n => !n.leida);
        this._guardar();
        this._renderBadge();
        this._renderPanel();
    },

    // ── Tiempo relativo ──
    _tiempoRelativo(fecha) {
        const diff = (new Date() - new Date(fecha)) / 1000;
        if (diff < 60)     return 'Ahora mismo';
        if (diff < 3600)   return `Hace ${Math.floor(diff / 60)} min`;
        if (diff < 86400)  return `Hace ${Math.floor(diff / 3600)}h`;
        if (diff < 604800) return `Hace ${Math.floor(diff / 86400)} días`;
        return FMT.date(fecha);
    },

    // ── Inyectar HTML en el DOM ──
    _inyectarUI() {
        // Estilos
        const style = document.createElement('style');
        style.textContent = `
            .notif-wrapper{position:relative;}
            #notif-btn{position:relative;display:inline-flex;align-items:center;justify-content:center;width:40px;height:40px;border-radius:var(--radius-sm);border:1px solid var(--border);background:var(--bg-body);cursor:pointer;font-size:1.2rem;transition:all 150ms;color:var(--text-primary);}
            #notif-btn:hover{background:var(--bg-hover);border-color:var(--primary);}
            #notif-badge{position:absolute;top:-5px;right:-5px;background:var(--danger);color:white;border-radius:20px;min-width:18px;height:18px;font-size:0.65rem;font-weight:800;display:flex;align-items:center;justify-content:center;padding:0 4px;border:2px solid var(--bg-body);animation:pulse 2.5s infinite;}
            #notif-panel{position:absolute;top:calc(100% + 10px);right:0;width:380px;max-height:520px;background:var(--bg-card);border:1px solid var(--border);border-radius:var(--radius-lg);box-shadow:0 20px 40px rgba(0,0,0,0.2);display:none;flex-direction:column;z-index:500;overflow:hidden;animation:modalIn 0.15s ease;}
            #notif-panel.open{display:flex;}
            .notif-header{padding:1rem 1.25rem;border-bottom:1px solid var(--border);display:flex;justify-content:space-between;align-items:center;flex-shrink:0;}
            .notif-header h4{font-size:0.95rem;font-weight:700;margin:0;}
            .notif-actions{display:flex;gap:0.4rem;}
            .notif-actions button{background:none;border:none;cursor:pointer;font-size:0.75rem;color:var(--text-muted);padding:0.3rem 0.5rem;border-radius:5px;font-family:inherit;transition:all 150ms;}
            .notif-actions button:hover{background:var(--bg-hover);color:var(--primary);}
            #notif-lista{overflow-y:auto;flex:1;}
            .notif-item{display:flex;gap:0.75rem;padding:0.875rem 1.25rem;cursor:pointer;transition:background 150ms;border-bottom:1px solid var(--border);align-items:flex-start;}
            .notif-item:hover{background:var(--bg-hover);}
            .notif-item.leida{opacity:0.55;}
            .notif-icono{width:36px;height:36px;border-radius:10px;display:flex;align-items:center;justify-content:center;font-size:1.1rem;flex-shrink:0;}
            .notif-contenido{flex:1;min-width:0;}
            .notif-titulo{font-size:0.85rem;font-weight:700;margin-bottom:0.2rem;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}
            .notif-msg{font-size:0.78rem;color:var(--text-secondary);line-height:1.45;margin-bottom:0.4rem;}
            .notif-meta{display:flex;gap:0.5rem;align-items:center;font-size:0.7rem;color:var(--text-muted);}
            .notif-dot{width:8px;height:8px;border-radius:50%;background:var(--primary);flex-shrink:0;margin-top:4px;}
        `;
        document.head.appendChild(style);

        // Botón campana — insertar en el header-actions del dashboard
        // Se agrega al header cuando esté disponible
        this._insertarBotón();
    },

    _insertarBotón() {
        const intv = setInterval(() => {
            const headerActions = document.querySelector('.header-actions');
            if (!headerActions) return;
            clearInterval(intv);

            const wrapper = document.createElement('div');
            wrapper.className = 'notif-wrapper';
            wrapper.innerHTML = `
                <button id="notif-btn" onclick="Notificaciones.toggle()" title="Notificaciones">
                    🔔
                    <span id="notif-badge" style="display:none">0</span>
                </button>
                <div id="notif-panel">
                    <div class="notif-header">
                        <h4>🔔 Notificaciones</h4>
                        <div class="notif-actions">
                            <button onclick="Notificaciones.marcarTodasLeidas();event.stopPropagation()">✓ Marcar todas</button>
                            <button onclick="Notificaciones.limpiarLeidas();event.stopPropagation()">🗑️ Limpiar leídas</button>
                        </div>
                    </div>
                    <div id="notif-lista"></div>
                </div>
            `;

            // Insertar antes del botón de temas
            const temaBtn = headerActions.querySelector('.theme-toggle');
            if (temaBtn) {
                headerActions.insertBefore(wrapper, temaBtn);
            } else {
                headerActions.prepend(wrapper);
            }

            this._renderBadge();
        }, 100);
    },
};
