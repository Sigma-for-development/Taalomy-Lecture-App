import { tokenStorage } from '../../utils/tokenStorage';

const CONTEXT_CACHE_KEY = 'ai_context_snapshot';

export interface AIContextSnapshot {
    profile?: any;
    stats?: any;
    wallet?: any;
    transactions?: any[];
    classes?: any[];
    groups?: any[];
    bookings?: any[];
    lastUpdated?: string;
}

export const aiContextCache = {
    async getContext(): Promise<AIContextSnapshot> {
        try {
            const data = await tokenStorage.getItem(CONTEXT_CACHE_KEY as any);
            return data ? JSON.parse(data) : {};
        } catch (error) {
            console.error('Error reading AI context cache:', error);
            return {};
        }
    },

    async updateContext(update: Partial<AIContextSnapshot>): Promise<void> {
        try {
            const current = await this.getContext();
            const updated = {
                ...current,
                ...update,
                lastUpdated: new Date().toISOString()
            };
            await tokenStorage.setItem(CONTEXT_CACHE_KEY as any, JSON.stringify(updated));
        } catch (error) {
            console.error('Error updating AI context cache:', error);
        }
    },

    async clear(): Promise<void> {
        await tokenStorage.removeItem(CONTEXT_CACHE_KEY as any);
    }
};
