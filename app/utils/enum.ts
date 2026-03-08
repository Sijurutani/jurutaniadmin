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
        { value: 'rejected', label: 'Rejected', color: 'error' },
        { value: 'deleted', label: 'Deleted', color: 'error' }
    ] satisfies { value: string, label: string, color: string }[],
    // Alias untuk learning_courses & course_lessons (sama persis)
    StatusLearning: [
        { value: 'pending',  label: 'Pending',  color: 'neutral' },
        { value: 'approved', label: 'Approved', color: 'success' },
        { value: 'rejected', label: 'Rejected', color: 'error' },
        { value: 'archived', label: 'Archived', color: 'warning' },
        { value: 'deleted',  label: 'Deleted',  color: 'error' }
    ] satisfies { value: string, label: string, color: string }[],
    CourseCategories: [
        { value: 'pertanian_pangan', label: 'Pertanian Pangan', icon: 'i-lucide-wheat' },
        { value: 'perkebunan',       label: 'Perkebunan',       icon: 'i-lucide-tree-palm' },
        { value: 'peternakan',       label: 'Peternakan',       icon: 'i-lucide-tangent' },
        { value: 'perikanan',        label: 'Perikanan',        icon: 'i-lucide-fish' },
        { value: 'hortikultura',     label: 'Hortikultura',     icon: 'i-lucide-flower' },
        { value: 'kehutanan',        label: 'Kehutanan',        icon: 'i-lucide-trees' },
        { value: 'agroteknologi',    label: 'Agroteknologi',    icon: 'i-lucide-flask-conical' }
    ] satisfies { value: string, label: string, icon: string }[],
    // Platform embed khusus untuk course lessons (YouTube + Google Drive)
    LessonEmbedPlatforms: [
        { value: 'youtube',      label: 'YouTube',            icon: 'i-simple-icons-youtube',      color: 'error' },
        { value: 'gdrive_doc',   label: 'Google Docs',        icon: 'i-simple-icons-googledocs',   color: 'info' },
        { value: 'gdrive_sheet', label: 'Google Sheets',      icon: 'i-simple-icons-googlesheets', color: 'success' },
        { value: 'gdrive_slide', label: 'Google Slides',      icon: 'i-simple-icons-googleslides', color: 'warning' },
        { value: 'gdrive_video', label: 'Google Drive Video', icon: 'i-simple-icons-googledrive',  color: 'neutral' },
        { value: 'gdrive_pdf',   label: 'Google Drive PDF',   icon: 'i-simple-icons-googledrive',  color: 'error' }
    ] satisfies { value: string, label: string, icon: string, color: string }[],
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
        { value: 'admin', label: 'Admin', color: 'info', icon: 'i-lucide-shield-user' },
        { value: 'pakar', label: 'Expert', color: 'success', icon: 'i-lucide-brain' },
        { value: 'penyuluh', label: 'Instructor', color: 'warning', icon: 'i-lucide-book-open' },
        { value: 'petani', label: 'Farmer', color: 'neutral', icon: 'i-lucide-user' }
    ] satisfies { value: string, label: string, color: string, icon: string, }[],
    EmbedPlatforms: [
        { value: 'instagram_post', label: 'Instagram Post', icon: 'i-simple-icons-instagram', color: 'error' },
        { value: 'instagram_reel', label: 'Instagram Reel', icon: 'i-simple-icons-instagram', color: 'error' },
        { value: 'facebook_post', label: 'Facebook Post', icon: 'i-simple-icons-facebook', color: 'info' },
        { value: 'facebook_video', label: 'Facebook Video', icon: 'i-simple-icons-facebook', color: 'info' },
        { value: 'youtube', label: 'YouTube', icon: 'i-simple-icons-youtube', color: 'error' },
        { value: 'tiktok', label: 'TikTok', icon: 'i-simple-icons-tiktok', color: 'neutral' },
        { value: 'twitter', label: 'Twitter / X', icon: 'i-simple-icons-x', color: 'neutral' }
    ] satisfies { value: string, label: string, icon: string, color: string }[],
} as const

export type SortOption = typeof Enum.SortOptions[number]
export type StatusNews = typeof Enum.StatusNews[number]
export type StatusProducts = typeof Enum.StatusProducts[number]
export type StatusMarkets = typeof Enum.StatusMarkets[number]
export type StatusVideos = typeof Enum.StatusVideos[number]
export type StatusCourses = typeof Enum.StatusCourses[number]
export type StatusLearning = typeof Enum.StatusLearning[number]
export type CourseCategory = typeof Enum.CourseCategories[number]['value']
export type LessonEmbedPlatform = typeof Enum.LessonEmbedPlatforms[number]['value']
export type StatusMeetings = typeof Enum.StatusMeetings[number]
export type EmbedPlatform = typeof Enum.EmbedPlatforms[number]['value']