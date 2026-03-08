export const Enum = {
    SortOptions: [
        { value: 'created_at-desc', label: 'Newest First' },
        { value: 'created_at-asc', label: 'Oldest First' },
        { value: 'name-asc', label: 'A to Z' },
        { value: 'name-desc', label: 'Z to A' }
    ] satisfies { value: string, label: string }[],
    StatusNews: [
        { value: 'pending', label: 'Pending', color: 'neutral' },
        { value: 'approved', label: 'Approved', color: 'success' },
        { value: 'archived', label: 'Archived', color: 'warning' },
        { value: 'rejected', label: 'Rejected', color: 'error' },
        { value: 'deleted', label: 'Deleted', color: 'error' }
    ] satisfies { value: string, label: string, color: string }[],
    StatusProducts: [
        { value: 'pending', label: 'Pending', color: 'neutral' },
        { value: 'approved', label: 'Approved', color: 'success' },
        { value: 'archived', label: 'Archived', color: 'warning' },
        { value: 'rejected', label: 'Rejected', color: 'error' },
        { value: 'deleted', label: 'Deleted', color: 'error' }
    ] satisfies { value: string, label: string, color: string }[],
    StatusCourses: [
        { value: 'pending', label: 'Pending', color: 'neutral' },
        { value: 'approved', label: 'Approved', color: 'success' },
        { value: 'archived', label: 'Archived', color: 'warning' },
        { value: 'deleted', label: 'Deleted', color: 'error' }
    ] satisfies { value: string, label: string, color: string }[],
    StatusMeetings: [
        { value: 'pending', label: 'Pending', color: 'neutral' },
        { value: 'approved', label: 'Approved', color: 'success' },
        { value: 'archived', label: 'Archived', color: 'warning' },
        { value: 'deleted', label: 'Deleted', color: 'error' }
    ] satisfies { value: string, label: string, color: string }[],
    StatusVideos: [
        { value: 'pending', label: 'Pending', color: 'neutral' },
        { value: 'approved', label: 'Approved', color: 'success' },
        { value: 'archived', label: 'Archived', color: 'warning' },
        { value: 'deleted', label: 'Deleted', color: 'error' }
    ] satisfies { value: string, label: string, color: string }[],
    ProductTypes: [
        { value: 'holtikultura', label: 'Holtikultura', color: 'neutral', icon: 'i-lucide-leaf' },
        { value: 'peternakan', label: 'Farm', color: 'success', icon: 'i-lucide-tree-pine' },
        { value: 'pertanian', label: 'Agriculture', color: 'warning', icon: 'i-lucide-seedling' },
        { value: 'perikanan', label: 'Fisheries', color: 'error', icon: 'i-lucide-shrimp' }
    ] satisfies { value: string, label: string, color: string, icon: string, }[],
    StatusMarkets: [
        { value: 'pending', label: 'Pending', color: 'neutral' },
        { value: 'approved', label: 'Approved', color: 'success' },
        { value: 'archived', label: 'Archived', color: 'warning' },
        { value: 'rejected', label: 'Rejected', color: 'error' },
        { value: 'deleted', label: 'Deleted', color: 'error' }
    ] satisfies { value: string, label: string, color: string }[],
    UserRole: [
        { value: 'admin', label: 'Admin', color: 'info', icon: 'i-lucide-user-shield' },
        { value: 'pakar', label: 'Expert', color: 'success', icon: 'i-lucide-brain' },
        { value: 'penyuluh', label: 'Instructor', color: 'warning', icon: 'i-lucide-book-open' },
        { value: 'petani', label: 'Farmer', color: 'neutral', icon: 'i-lucide-user' }
    ] satisfies { value: string, label: string, color: string, icon: string, }[],
    
} as const

export type SortOption = typeof Enum.SortOptions[number]
export type StatusNews = typeof Enum.StatusNews[number]
export type StatusProducts = typeof Enum.StatusProducts[number]
export type StatusMarkets = typeof Enum.StatusMarkets[number]
export type StatusVideos = typeof Enum.StatusVideos[number]
export type StatusCourses = typeof Enum.StatusCourses[number]
export type StatusMeetings = typeof Enum.StatusMeetings[number]