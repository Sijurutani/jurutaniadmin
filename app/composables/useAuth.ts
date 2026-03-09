/**
 * Thin composable wrapper around the Pinia auth store.
 * Use this in components/pages/middleware to keep access consistent.
 */
export const useAuth = () => useAuthStore()
