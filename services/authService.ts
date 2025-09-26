
import { useAppStore } from '../stores/useAppStore';

export const authService = {
    async login(email: string, password: string) {
        // Disconnected from backend
        console.warn("Auth service is disconnected. Login does nothing.");
        return Promise.resolve({ user: null });
    },

    async register(registerData: { email: string; password: string; companyName: string; fullName: string; currency: string; }) {
        // Disconnected from backend
        console.warn("Auth service is disconnected. Registration does nothing.");
        return Promise.resolve({ user: null });
    },

    async sendPasswordResetEmail(email: string): Promise<void> {
        // Disconnected from backend
        console.warn("Auth service is disconnected. Password reset does nothing.");
        return Promise.resolve();
    },

    async logout(): Promise<void> {
        // Disconnected from backend. Clear local state directly.
        useAppStore.getState().clearSessionData();
    }
};
