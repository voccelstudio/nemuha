// ════════════════════════════════════════
// ÑEMUHA — jsauth.js
// Autenticación con Supabase Auth
// ════════════════════════════════════════

const Auth = {
    _session: null,

    // ── Inicializar: verificar si hay sesión activa ──
    async init() {
        console.log('[Auth] Login removido — Acceso automático');
        
        // Simular sesión de administrador
        this._session = { 
            user: { email: 'admin@nemuha.pro', id: 'master-user' },
            isMaster: true 
        };
        
        this._mostrarApp();
    },



    // ── Logout ──
    async logout() {
        if (!confirm('¿Reiniciar aplicación? (No cerrará sesión)')) return;
        location.reload();
    },

    // ── Obtener usuario actual ──
    getUsuario() {
        if (!this._session) {
            this._session = { user: { email: 'admin@nemuha.pro', id: 'master-user' }, isMaster: true };
        }
        return this._session.user;
    },

    getEmail() {
        return this.getUsuario()?.email ?? 'admin@nemuha.pro';
    },

    // ── UI helpers ──
    _mostrarLogin() {
        console.warn('[Auth] _mostrarLogin llamado pero el login fue removido.');
        this._mostrarApp();
    },

    _mostrarApp() {
        const appEl = document.querySelector('.app');
        if (appEl) appEl.style.display = 'flex';

        const userInfoEl = document.getElementById('nav-user-email');
        if (userInfoEl) userInfoEl.textContent = this.getEmail();
    },

    _error(msg) {
        console.error('[Auth] Error:', msg);
        Toast.show(msg, 'error');
    },

    _traducirError(msg) {
        return msg;
    }
};
