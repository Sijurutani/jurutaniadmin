const BUCKET_NEWS = 'news-images'

/**
 * Upload a file to Supabase Storage (news-images bucket)
 * folder: 'images' (cover), 'gallery' (gallery/inline), 'attachments'
 * Returns the public URL of the uploaded file.
 */
export async function uploadNewsFile(
  folder: 'images' | 'gallery' | 'attachments',
  newsId: string,
  file: File
): Promise<string> {
  const supabase = useSupabaseClient()
  const ext = file.name.split('.').pop() ?? 'bin'
  const timestamp = Date.now()
  const random = Math.random().toString(36).substring(2, 11)
  const path = `${folder}/${newsId}/${timestamp}_${random}.${ext}`

  const { error } = await supabase.storage
    .from(BUCKET_NEWS)
    .upload(path, file, { upsert: true, contentType: file.type })

  if (error) throw new Error(error.message)

  const { data } = supabase.storage.from(BUCKET_NEWS).getPublicUrl(path)
  return data.publicUrl
}

/**
 * Get public URL from a stored path (handles both full URLs and relative paths)
 */
export function getNewsPublicUrl(path: string | null): string | null {
  if (!path) return null
  if (path.startsWith('http')) return path
  const supabase = useSupabaseClient()
  const { data } = supabase.storage.from(BUCKET_NEWS).getPublicUrl(path)
  return data.publicUrl
}

/**
 * Delete a file from Supabase Storage by its full public URL or storage path
 */
export async function deleteNewsFile(urlOrPath: string): Promise<void> {
  const supabase = useSupabaseClient()
  // Extract path from full URL if needed
  const storagePrefix = `/storage/v1/object/public/${BUCKET_NEWS}/`
  const path = urlOrPath.includes(storagePrefix)
    ? urlOrPath.split(storagePrefix)[1]!
    : urlOrPath
  await supabase.storage.from(BUCKET_NEWS).remove([path])
}

// ─────────────────────────────────────────────────────────────────────────────
// Markets Storage  (bucket: markets)
//   thumbnail  → [marketId]/filename
//   gallery    → [marketId]/gallery/filename
//   attachment → [marketId]/attachments/filename
// ─────────────────────────────────────────────────────────────────────────────

const BUCKET_MARKETS = 'markets'

export async function uploadMarketFile(
  folder: 'thumbnail' | 'gallery' | 'attachments',
  marketId: string,
  file: File
): Promise<string> {
  const supabase = useSupabaseClient()
  const ext = file.name.split('.').pop() ?? 'bin'
  const timestamp = Date.now()
  const random = Math.random().toString(36).substring(2, 11)
  const filename = `${timestamp}_${random}.${ext}`
  const path = folder === 'thumbnail'
    ? `${marketId}/${filename}`
    : `${marketId}/${folder}/${filename}`

  const { error } = await supabase.storage
    .from(BUCKET_MARKETS)
    .upload(path, file, { upsert: true, contentType: file.type })

  if (error) throw new Error(error.message)

  const { data } = supabase.storage.from(BUCKET_MARKETS).getPublicUrl(path)
  return data.publicUrl
}

export function getMarketPublicUrl(path: string | null): string | null {
  if (!path) return null
  if (path.startsWith('http')) return path
  const supabase = useSupabaseClient()
  const { data } = supabase.storage.from(BUCKET_MARKETS).getPublicUrl(path)
  return data.publicUrl
}

export async function deleteMarketFile(urlOrPath: string): Promise<void> {
  const supabase = useSupabaseClient()
  const storagePrefix = `/storage/v1/object/public/${BUCKET_MARKETS}/`
  const path = urlOrPath.includes(storagePrefix)
    ? urlOrPath.split(storagePrefix)[1]!
    : urlOrPath
  await supabase.storage.from(BUCKET_MARKETS).remove([path])
}

// ─────────────────────────────────────────────────────────────────────────────
// Courses Storage  (bucket: courses-images)
//   covers  → covers/[courseId]/filename
// ─────────────────────────────────────────────────────────────────────────────

const BUCKET_COURSES = 'courses-images'

export async function uploadCourseFile(
  folder: 'covers',
  courseId: string,
  file: File
): Promise<string> {
  const supabase = useSupabaseClient()
  const ext = file.name.split('.').pop() ?? 'bin'
  const timestamp = Date.now()
  const random = Math.random().toString(36).substring(2, 11)
  const path = `${folder}/${courseId}/${timestamp}_${random}.${ext}`

  const { error } = await supabase.storage
    .from(BUCKET_COURSES)
    .upload(path, file, { upsert: true, contentType: file.type })

  if (error) throw new Error(error.message)

  const { data } = supabase.storage.from(BUCKET_COURSES).getPublicUrl(path)
  return data.publicUrl
}

export function getCoursePublicUrl(path: string | null): string | null {
  if (!path) return null
  if (path.startsWith('http')) return path
  const supabase = useSupabaseClient()
  const { data } = supabase.storage.from(BUCKET_COURSES).getPublicUrl(path)
  return data.publicUrl
}

export async function deleteCourseFile(urlOrPath: string): Promise<void> {
  const supabase = useSupabaseClient()
  const storagePrefix = `/storage/v1/object/public/${BUCKET_COURSES}/`
  const path = urlOrPath.includes(storagePrefix)
    ? urlOrPath.split(storagePrefix)[1]!
    : urlOrPath
  await supabase.storage.from(BUCKET_COURSES).remove([path])
}

// ─────────────────────────────────────────────────────────────────────────────
// Food Prices Storage  (bucket: food-images)
//   image -> [foodId]/filename
// ─────────────────────────────────────────────────────────────────────────────

const BUCKET_FOOD_PRICES = 'food-images'

export async function uploadFoodPriceImage(foodId: string, file: File): Promise<string> {
  const supabase = useSupabaseClient()
  const ext = file.name.split('.').pop() ?? 'bin'
  const safeName = file.name
    .replace(/\.[^/.]+$/, '')
    .replace(/[^a-zA-Z0-9-_]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .toLowerCase() || 'image'
  const timestamp = Date.now()
  const path = `${foodId}/${safeName}-${timestamp}.${ext}`

  const { error } = await supabase.storage
    .from(BUCKET_FOOD_PRICES)
    .upload(path, file, { upsert: true, contentType: file.type })

  if (error) throw new Error(error.message)

  const { data } = supabase.storage.from(BUCKET_FOOD_PRICES).getPublicUrl(path)
  return data.publicUrl
}

export function getFoodPriceImagePublicUrl(path: string | null): string | null {
  if (!path) return null
  if (path.startsWith('http')) return path
  const supabase = useSupabaseClient()
  const { data } = supabase.storage.from(BUCKET_FOOD_PRICES).getPublicUrl(path)
  return data.publicUrl
}

export async function deleteFoodPriceImage(urlOrPath: string): Promise<void> {
  const supabase = useSupabaseClient()
  const storagePrefix = `/storage/v1/object/public/${BUCKET_FOOD_PRICES}/`
  const path = urlOrPath.includes(storagePrefix)
    ? urlOrPath.split(storagePrefix)[1]!
    : urlOrPath
  await supabase.storage.from(BUCKET_FOOD_PRICES).remove([path])
}
