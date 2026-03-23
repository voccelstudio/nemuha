// ════════════════════════════════════════
// ÑEMUHA — jsauth.js
// Autenticación con Supabase Auth
// ════════════════════════════════════════

const Auth = {
    _session: null,

    // ── Inicializar: verificar si hay sesión activa ──
    async init() {
        const supa = getSupa();
        if (!supa) {
            console.warn('[Auth] Supabase no disponible — modo sin auth');
            this._mostrarApp();
            return;
        }

        // Verificar sesión existente
        const { data: { session } } = await supa.auth.getSession();
        if (session) {
            this._session = session;
            this._mostrarApp();
        } else {
            this._mostrarLogin();
        }

        // Escuchar cambios de sesión
        supa.auth.onAuthStateChange((event, session) => {
            this._session = session;
            if (event === 'SIGNED_IN') {
                this._mostrarApp();
            } else if (event === 'SIGNED_OUT') {
                this._mostrarLogin();
            }
        });
    },

    // ── Login ──
    async login() {
        const email    = document.getElementById('erpUser').value.trim();
        const password = document.getElementById('erpPass').value;
        const errEl    = document.getElementById('erpErr');
        const btnEl    = document.getElementById('erpLoginBtn');

        if (!email || !password) {
            this._error('Completá usuario y contraseña');
            return;
        }

        // Loading state
        btnEl.disabled    = true;
        btnEl.textContent = '⏳ Ingresando...';
        errEl.style.display = 'none';

        try {
            const supa = getSupa();
            const { data, error } = await supa.auth.signInWithPassword({ email, password });

            if (error) {
                this._error(this._traducirError(error.message));
                return;
            }

            this._session = data.session;
            this._mostrarApp();

        } catch (e) {
            this._error('Error de conexión. Verificá tu internet.');
        } finally {
            btnEl.disabled    = false;
            btnEl.textContent = '🔓 Ingresar';
        }
    },

    // ── Logout ──
    async logout() {
        if (!confirm('¿Cerrar sesión?')) return;
        const supa = getSupa();
        if (supa) await supa.auth.signOut();
        this._session = null;
        this._mostrarLogin();
    },

    // ── Obtener usuario actual ──
    getUsuario() {
        return this._session?.user ?? null;
    },

    getEmail() {
        return this._session?.user?.email ?? 'Sin sesión';
    },

    // ── UI helpers ──
    _mostrarLogin() {
        const loginEl = document.getElementById('erpLogin');
        const appEl   = document.querySelector('.app');
        if (loginEl) loginEl.style.display = 'flex';
        if (appEl)   appEl.style.display   = 'none';

        // Limpiar campos
        const userEl = document.getElementById('erpUser');
        const passEl = document.getElementById('erpPass');
        if (userEl) userEl.value = '';
        if (passEl) passEl.value = '';
        document.getElementById('erpErr').style.display = 'none';
    },

    _mostrarApp() {
        const loginEl = document.getElementById('erpLogin');
        const appEl   = document.querySelector('.app');
        if (loginEl) loginEl.style.display = 'none';
        if (appEl)   appEl.style.display   = 'flex';

        // Mostrar email del usuario en la UI si hay un elemento para eso
        const userInfoEl = document.getElementById('nav-user-email');
        if (userInfoEl) userInfoEl.textContent = this.getEmail();
    },

    _error(msg) {
        const errEl = document.getElementById('erpErr');
        errEl.textContent    = msg;
        errEl.style.display  = 'block';
    },

    _traducirError(msg) {
        if (msg.includes('Invalid login'))      return '❌ Email o contraseña incorrectos';
        if (msg.includes('Email not confirmed')) return '📧 Confirmá tu email antes de ingresar';
        if (msg.includes('Too many requests'))   return '⏳ Demasiados intentos. Esperá un momento.';
        if (msg.includes('Network'))             return '🌐 Sin conexión a internet';
        return '❌ Error al ingresar: ' + msg;
    }
};
