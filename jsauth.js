// ════════════════════════════════════════
// ÑEMUHA — jsauth.js
// Autenticación con Supabase Auth
// ════════════════════════════════════════

const Auth = {
    _session: { 
        user: { email: 'admin@nemuha.pro', id: 'master-user' },
        isMaster: true 
    },

    // ── Getters ──
    getUsuario() { return this._session.user; },
    getEmail() { return this._session.user.email; },

    // ── Dummy methods to avoid breakage ──
    async init() { console.log('[Auth] Autenticación deshabilitada'); },
    async logout() { location.reload(); }
};

