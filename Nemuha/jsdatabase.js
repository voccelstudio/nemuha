// ════════════════════════════════════════
// ÑEMUHA — jsdatabase.js
// IndexedDB + localStorage + Supabase sync
// ════════════════════════════════════════

const SUPA_URL = 'https://tbtnggplcygzmwrstirj.supabase.co';
const SUPA_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRidG5nZ3BsY3lnem13cnN0aXJqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQyNTg2MzEsImV4cCI6MjA4OTgzNDYzMX0.STadIs9jHkYAMhaoG7BnBEVEDUfjhA4QYgLgibr3rzg';
let _supaClient = null;

function getSupa() {
    if (!_supaClient && window.supabase) {
        _supaClient = window.supabase.createClient(SUPA_URL, SUPA_KEY);
    }
    return _supaClient;
}

// ── IndexedDB ──
const IDB = {
    _db: null,
    DB_NAME: 'erp_pro',
    DB_VER: 1,
    STORE: 'kv',

    async open() {
        if (this._db) return this._db;
        return new Promise((res, rej) => {
            const req = indexedDB.open(this.DB_NAME, this.DB_VER);
            req.onupgradeneeded = e => {
                const db = e.target.result;
                if (!db.objectStoreNames.contains(this.STORE)) {
                    db.createObjectStore(this.STORE, { keyPath: 'k' });
                }
            };
            req.onsuccess = e => { this._db = e.target.result; res(this._db); };
            req.onerror = e => { console.warn('IDB open error:', e); rej(e); };
        });
    },

    async get(key) {
        try {
            const db = await this.open();
            return new Promise((res) => {
                const tx = db.transaction(this.STORE, 'readonly');
                const req = tx.objectStore(this.STORE).get(key);
                req.onsuccess = () => res(req.result ? req.result.v : null);
                req.onerror = () => res(null);
            });
        } catch (e) { return null; }
    },

    async set(key, val) {
        try {
            const db = await this.open();
            return new Promise((res) => {
                const tx = db.transaction(this.STORE, 'readwrite');
                tx.objectStore(this.STORE).put({ k: key, v: val, ts: Date.now() });
                tx.oncomplete = () => res(true);
                tx.onerror = () => res(false);
            });
        } catch (e) { return false; }
    },

    async del(key) {
        try {
            const db = await this.open();
            return new Promise((res) => {
                const tx = db.transaction(this.STORE, 'readwrite');
                tx.objectStore(this.STORE).delete(key);
                tx.oncomplete = () => res(true);
                tx.onerror = () => res(false);
            });
        } catch (e) { return false; }
    }
};

// ── Base de Datos principal ──
const DB = {
    data: {
        clientes: [], proveedores: [],
        vendedores: [{ id: 'VEND-20250308-0001', nombre: 'Administrador', ci: '', telefono: '', email: '', comision: 0, activo: true, creado: new Date().toISOString() }],
        productos: [], ventas: [], compras: [], caja: [], pagosProveedores: [], empleados: [], pagosEmpleados: [],
        config: { moneda: { principal: 'PYG', cambioUSD: 7500, cambioEUR: 8200 }, iva: 10, empresa: { nombre: '', ruc: '', direccion: '', telefono: '' }, tema: 'light' }
    },
    monedaActual: 'PYG',
    cajaHoy: null,
    _saveTimer: null,
    _syncTimer: null,

    init() {
        // Carga sync: localStorage inmediato (rápido), luego migra a IDB
        try {
            const raw = localStorage.getItem('erp_data');
            if (raw) {
                const p = JSON.parse(raw);
                this.data = { ...this.data, ...p };
                this.data.config = { ...this.data.config, ...(p.config || {}) };
                this.data.config.moneda = { ...this.data.config.moneda, ...(p.config?.moneda || {}) };
                this.data.config.empresa = { ...this.data.config.empresa, ...(p.config?.empresa || {}) };
                if (!this.data.vendedores || !this.data.vendedores.length)
                    this.data.vendedores = [{ id: 'VEND-20250308-0001', nombre: 'Administrador', ci: '', telefono: '', email: '', comision: 0, activo: true, creado: new Date().toISOString() }];
            }
        } catch (e) { console.warn('DB load localStorage:', e); }
        this._loadFromIDB();
        this._caja();
    },

    async _loadFromIDB() {
        try {
            const idbData = await IDB.get('erp_data');
            if (idbData) {
                const idbTs = idbData._ts || 0;
                const lsTs = parseInt(localStorage.getItem('erp_data_ts') || '0');
                if (idbTs >= lsTs) {
                    const p = idbData;
                    this.data = { ...this.data, ...p };
                    this.data.config = { ...this.data.config, ...(p.config || {}) };
                    this.data.config.moneda = { ...this.data.config.moneda, ...(p.config?.moneda || {}) };
                    this.data.config.empresa = { ...this.data.config.empresa, ...(p.config?.empresa || {}) };
                    if (!this.data.vendedores?.length)
                        this.data.vendedores = [{ id: 'VEND-20250308-0001', nombre: 'Administrador', ci: '', telefono: '', email: '', comision: 0, activo: true, creado: new Date().toISOString() }];
                    this._caja();
                }
            }
            // Migrar localStorage → IDB si aún no existe en IDB
            if (localStorage.getItem('erp_data') && !idbData) {
                await IDB.set('erp_data', { ...this.data, _ts: Date.now() });
                console.log('[DB] Migrado localStorage → IndexedDB ✓');
            }
        } catch (e) { console.warn('IDB load:', e); }
    },

    guardar() {
        const ts = Date.now();
        const payload = { ...this.data, _ts: ts };
        // 1. localStorage inmediato (sync, fallback rápido)
        try {
            localStorage.setItem('erp_data', JSON.stringify(this.data));
            localStorage.setItem('erp_data_ts', ts.toString());
        } catch (e) { console.warn('localStorage full, usando solo IDB'); }
        // 2. IDB (debounced, async)
        if (this._saveTimer) clearTimeout(this._saveTimer);
        this._saveTimer = setTimeout(async () => {
            await IDB.set('erp_data', payload);
            console.log('[DB] Guardado local (IDB) ✓');
        }, 500); // 500ms debounce
        // 3. Supabase (debounced, background)
        if (this._syncTimer) clearTimeout(this._syncTimer);
        this._syncTimer = setTimeout(() => { SupaSync.push(); }, 5000); // 5s debounce para ahorrar tráfico
    },

    id(tipo) {
        const fecha = new Date().toISOString().slice(0, 10).replace(/-/g, '');
        const pfx = { ventas: 'FAC', compras: 'COM', productos: 'PROD', clientes: 'CLI', proveedores: 'PROV', vendedores: 'VEND', caja: 'CJA', empleados: 'EMP' }[tipo] || tipo.slice(0, 3).toUpperCase();
        const arr = this.data[tipo] || [];
        const seq = String(arr.length + 1).padStart(4, '0');
        const rand = Math.random().toString(36).substring(2, 5).toUpperCase();
        return `${pfx}-${fecha}-${seq}-${rand}`;
    },

    _caja() {
        const hoy = new Date().toISOString().split('T')[0];
        let c = this.data.caja.find(x => x.fecha === hoy && !x.cierre);
        if (!c) {
            c = { id: this.id('caja'), fecha: hoy, apertura: { hora: new Date().toTimeString().slice(0, 5), PYG: 500000, USD: 0, EUR: 0 }, movimientos: [], cierre: null };
            this.data.caja.push(c);
            this.guardar();
        }
        this.cajaHoy = c;
    },

    saldoCaja() {
        const s = { PYG: +(this.cajaHoy.apertura.PYG || 0), USD: +(this.cajaHoy.apertura.USD || 0), EUR: +(this.cajaHoy.apertura.EUR || 0) };
        this.cajaHoy.movimientos.forEach(m => { const k = m.moneda || 'PYG'; s[k] = (s[k] || 0) + (m.tipo === 'entrada' ? m.monto : -m.monto); });
        return s;
    },

    movCaja(tipo, concepto, monto, moneda = 'PYG') {
        this.cajaHoy.movimientos.push({ tipo, concepto, monto: +monto, moneda, hora: new Date().toTimeString().slice(0, 5), ts: Date.now() });
        this.guardar();
    },

    convertir(n, de, a) {
        if (de === a) return n;
        const r = { PYG: 1, USD: this.data.config.moneda.cambioUSD || 7500, EUR: this.data.config.moneda.cambioEUR || 8200 };
        return Math.round(n * r[de] / r[a]);
    },

    // Exportar JSON de respaldo
    exportarJSON() {
        const payload = {
            version: '1.0',
            exportado: new Date().toISOString(),
            empresa: this.data.config.empresa.nombre || 'Ñemuha',
            data: this.data
        };
        const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
        const a = Object.assign(document.createElement('a'), { href: URL.createObjectURL(blob), download: `nemuha_backup_${new Date().toISOString().slice(0, 10)}.json` });
        a.click(); URL.revokeObjectURL(a.href);
    }
};

// ── Supabase Sync ──
const SupaSync = {
    _pushing: false,

    async push() {
        const supa = getSupa();
        if (!supa || this._pushing) return;
        this._pushing = true;
        try {
            const tenant = DB.data.config.empresa.ruc || 'local';
            await supa.from('erp_data').upsert({ tenant, data: DB.data, updated_at: new Date().toISOString() }, { onConflict: 'tenant' });
        } catch (e) {
            console.warn('[SupaSync] Push falló:', e.message);
        } finally {
            this._pushing = false;
        }
    },

    async pull() {
        const supa = getSupa();
        if (!supa) return;
        try {
            const tenant = DB.data.config.empresa.ruc || 'local';
            const { data, error } = await supa.from('erp_data').select('data').eq('tenant', tenant).single();
            if (!error && data?.data) {
                DB.data = data.data;
                DB.guardar();
                location.reload();
            }
        } catch (e) {
            console.warn('[SupaSync] Pull falló:', e.message);
        }
    }
};
