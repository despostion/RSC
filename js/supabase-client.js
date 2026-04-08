class SupabaseService {
    constructor() {
        this.client = null;
        this.enabled = false;
        this.readyPromise = this.init();
    }

    async init() {
        if (!window.configLoader) {
            return;
        }

        await window.configLoader.load();
        const supabaseConfig = window.configLoader.config?.config?.supabase;
        const url = supabaseConfig?.url;
        const anonKey = supabaseConfig?.anonKey;

        if (!url || !anonKey) {
            console.warn('[Supabase] Missing url or anonKey in config.json. Using local fallback.');
            return;
        }

        if (!window.supabase || typeof window.supabase.createClient !== 'function') {
            console.error('[Supabase] SDK not loaded. Using local fallback.');
            return;
        }

        this.sessionId = this.getSessionId();
        this.client = window.supabase.createClient(url, anonKey, {
            auth: {
                persistSession: false,
                autoRefreshToken: false,
                detectSessionInUrl: false
            }
        });
        this.enabled = true;
        console.log('[Supabase] Connected');
    }

    getSessionId() {
        const key = 'rsc-visit-session-id';
        let id = sessionStorage.getItem(key);
        if (!id) {
            if (window.crypto && typeof window.crypto.randomUUID === 'function') {
                id = window.crypto.randomUUID();
            } else {
                id = `rsc-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
            }
            sessionStorage.setItem(key, id);
        }
        return id;
    }

    async getLikeCount(memberName) {
        if (!this.enabled) return null;

        const { data, error } = await this.client
            .from('profile_likes')
            .select('like_count')
            .eq('member_name', memberName)
            .maybeSingle();

        if (error) {
            console.error('[Supabase] Failed to read likes:', error.message);
            return null;
        }

        return data?.like_count ?? 0;
    }

    async incrementLike(memberName, delta, sessionId) {
        if (!this.enabled) return null;

        const sid = sessionId || this.sessionId || this.getSessionId();
        const { data, error } = await this.client.rpc('increment_profile_likes', {
            p_member_name: memberName,
            p_delta: delta,
            p_session_id: sid
        });

        if (error) {
            console.error('[Supabase] Failed to update likes:', error.message);
            return null;
        }

        if (typeof data === 'number') {
            return Math.max(0, data);
        }
        if (Array.isArray(data) && typeof data[0] === 'number') {
            return Math.max(0, data[0]);
        }
        return null;
    }

    async trackVisitForSession(sessionId) {
        if (!this.enabled) return null;

        const { data, error } = await this.client.rpc('increment_site_visits', {
            p_session_id: sessionId
        });

        if (error) {
            console.error('[Supabase] Failed to track visit:', error.message);
            return null;
        }

        if (typeof data === 'number') {
            return Math.max(0, data);
        }
        if (Array.isArray(data) && typeof data[0] === 'number') {
            return Math.max(0, data[0]);
        }
        return null;
    }

    async getVisitCount() {
        if (!this.enabled) return null;

        const { data, error } = await this.client
            .from('site_metrics')
            .select('metric_value')
            .eq('metric_name', 'site_visits')
            .maybeSingle();

        if (error) {
            console.error('[Supabase] Failed to read site visits:', error.message);
            return null;
        }

        return data?.metric_value ?? 0;
    }
}

window.supabaseService = new SupabaseService();