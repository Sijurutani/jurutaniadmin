const BUCKET_NEWS = 'news-images'
const BUCKET_MARKETS = 'markets'
const BUCKET_COURSES = 'courses-images'
const BUCKET_FOOD_PRICES = 'food-images'

// Validation Constants
const MAX_IMAGE_SIZE = 5 * 1024 * 1024 // 5MB
const MAX_ATTACHMENT_SIZE = 10 * 1024 * 1024 // 10MB
const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif']

/**
 * Validates whether the file is a supported image type and under the maximum size limit.
 */
export function validateImage(file: File, maxSize = MAX_IMAGE_SIZE): void {
  if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
    throw new Error('Format gambar tidak didukung. Gunakan JPG, PNG, atau WebP.')
  }
  if (file.size > maxSize) {
    const sizeInMB = (maxSize / (1024 * 1024)).toFixed(0)
    throw new Error(`Ukuran gambar terlalu besar. Maksimal ${sizeInMB}MB.`)
  }
}

/**
 * Validates whether the file is under the maximum attachment size limit.
 */
export function validateAttachment(file: File, maxSize = MAX_ATTACHMENT_SIZE): void {
  if (file.size > maxSize) {
    const sizeInMB = (maxSize / (1024 * 1024)).toFixed(0)
    throw new Error(`Ukuran lampiran terlalu besar. Maksimal ${sizeInMB}MB.`)
  }
}

/**
 * Compresses an image client-side using Canvas API.
 * Resizes the image if it exceeds the specified maximum width or height.
 * Converts output to WebP or JPEG.
 */
export async function compressImage(
  file: File,
  options?: {
    maxWidth?: number
    maxHeight?: number
    quality?: number
    outputType?: 'image/webp' | 'image/jpeg' | 'image/png'
  }
): Promise<File> {
  if (typeof window === 'undefined') return file

  const {
    maxWidth = 1920,
    maxHeight = 1080,
    quality = 0.85,
    outputType = 'image/webp'
  } = options ?? {}

  // Only compress images that can be drawn on canvas
  if (!file.type.startsWith('image/') || file.type === 'image/gif' || file.type === 'image/svg+xml') {
    return file
  }

  return new Promise((resolve) => {
    const reader = new FileReader()
    reader.onload = (e) => {
      const img = new Image()
      img.onload = () => {
        let width = img.width
        let height = img.height

        // Calculate aspect ratio scale
        if (width > maxWidth || height > maxHeight) {
          const ratio = Math.min(maxWidth / width, maxHeight / height)
          width = Math.round(width * ratio)
          height = Math.round(height * ratio)
        }

        const canvas = document.createElement('canvas')
        canvas.width = width
        canvas.height = height

        const ctx = canvas.getContext('2d')
        if (!ctx) {
          resolve(file)
          return
        }

        ctx.drawImage(img, 0, 0, width, height)

        canvas.toBlob(
          (blob) => {
            if (!blob) {
              resolve(file)
              return
            }
            const extension = outputType === 'image/webp' ? 'webp' : (outputType === 'image/png' ? 'png' : 'jpg')
            const originalNameWithoutExt = file.name.substring(0, file.name.lastIndexOf('.')) || file.name
            const newName = `${originalNameWithoutExt}.${extension}`
            resolve(new File([blob], newName, { type: outputType, lastModified: Date.now() }))
          },
          outputType,
          quality
        )
      }
      img.onerror = () => resolve(file)
      img.src = e.target?.result as string
    }
    reader.onerror = () => resolve(file)
    reader.readAsDataURL(file)
  })
}

/**
 * Transforms a Supabase Storage public URL or relative path into an optimized render URL.
 * Works on-the-fly using Supabase Image Transformation.
 */
export function getResizedUrl(
  urlOrPath: string | null | undefined,
  options: {
    width?: number
    height?: number
    quality?: number
    resize?: 'cover' | 'contain' | 'fill'
  } = {}
): string | null {
  if (!urlOrPath) return null

  let url = urlOrPath

  // Replace /object/public/ with /render/image/public/
  if (url.includes('/storage/v1/object/public/')) {
    url = url.replace('/storage/v1/object/public/', '/storage/v1/render/image/public/')
  } else {
    // If it is not a full URL containing the prefix, return as is.
    return url
  }

  const params = new URLSearchParams()
  if (options.width) params.set('width', String(options.width))
  if (options.height) params.set('height', String(options.height))
  params.set('quality', String(options.quality ?? 75))
  params.set('resize', options.resize ?? 'cover')

  return `${url}?${params.toString()}`
}

// ─────────────────────────────────────────────────────────────────────────────
// News Storage (bucket: news-images)
//   images      → cover
//   gallery     → gallery/inline
//   attachments → attachments
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Upload a file to Supabase Storage (news-images bucket)
 * Validates and compresses images prior to uploading.
 */
export async function uploadNewsFile(
  folder: 'images' | 'gallery' | 'attachments',
  newsId: string,
  file: File
): Promise<string> {
  let fileToUpload = file

  if (folder === 'images' || folder === 'gallery') {
    validateImage(file)
    const options = folder === 'images'
      ? { maxWidth: 1920, maxHeight: 1080, quality: 0.85 }
      : { maxWidth: 1200, maxHeight: 900, quality: 0.80 }
    fileToUpload = await compressImage(file, options)
  } else {
    validateAttachment(file)
  }

  const supabase = useSupabaseClient()
  const ext = fileToUpload.name.split('.').pop() ?? 'bin'
  const timestamp = Date.now()
  const random = Math.random().toString(36).substring(2, 11)
  const path = `${folder}/${newsId}/${timestamp}_${random}.${ext}`

  const { error } = await supabase.storage
    .from(BUCKET_NEWS)
    .upload(path, fileToUpload, { upsert: true, contentType: fileToUpload.type })

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
  const storagePrefix = `/storage/v1/object/public/${BUCKET_NEWS}/`
  const path = urlOrPath.includes(storagePrefix)
    ? urlOrPath.split(storagePrefix)[1]!
    : urlOrPath
  await supabase.storage.from(BUCKET_NEWS).remove([path])
}

// ─────────────────────────────────────────────────────────────────────────────
// Markets Storage (bucket: markets)
//   thumbnail  → [marketId]/filename
//   gallery    → [marketId]/gallery/filename
//   attachment → [marketId]/attachments/filename
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Upload a file to Supabase Storage (markets bucket)
 * Validates and compresses images prior to uploading.
 */
export async function uploadMarketFile(
  folder: 'thumbnail' | 'gallery' | 'attachments',
  marketId: string,
  file: File
): Promise<string> {
  let fileToUpload = file

  if (folder === 'thumbnail' || folder === 'gallery') {
    validateImage(file)
    const options = folder === 'thumbnail'
      ? { maxWidth: 800, maxHeight: 800, quality: 0.85 }
      : { maxWidth: 1200, maxHeight: 900, quality: 0.80 }
    fileToUpload = await compressImage(file, options)
  } else {
    validateAttachment(file)
  }

  const supabase = useSupabaseClient()
  const ext = fileToUpload.name.split('.').pop() ?? 'bin'
  const timestamp = Date.now()
  const random = Math.random().toString(36).substring(2, 11)
  const filename = `${timestamp}_${random}.${ext}`
  const path = folder === 'thumbnail'
    ? `${marketId}/${filename}`
    : `${marketId}/${folder}/${filename}`

  const { error } = await supabase.storage
    .from(BUCKET_MARKETS)
    .upload(path, fileToUpload, { upsert: true, contentType: fileToUpload.type })

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
// Courses Storage (bucket: courses-images)
//   covers  → covers/[courseId]/filename
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Upload a course file to Supabase Storage
 * Validates and compresses images prior to uploading.
 */
export async function uploadCourseFile(
  folder: 'covers',
  courseId: string,
  file: File
): Promise<string> {
  validateImage(file)
  const fileToUpload = await compressImage(file, { maxWidth: 1920, maxHeight: 1080, quality: 0.85 })

  const supabase = useSupabaseClient()
  const ext = fileToUpload.name.split('.').pop() ?? 'bin'
  const timestamp = Date.now()
  const random = Math.random().toString(36).substring(2, 11)
  const path = `${folder}/${courseId}/${timestamp}_${random}.${ext}`

  const { error } = await supabase.storage
    .from(BUCKET_COURSES)
    .upload(path, fileToUpload, { upsert: true, contentType: fileToUpload.type })

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
// Food Prices Storage (bucket: food-images)
//   image -> [foodId]/filename
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Upload food price image to Supabase Storage.
 * Validates and compresses the image prior to uploading.
 */
export async function uploadFoodPriceImage(foodId: string, file: File): Promise<string> {
  validateImage(file)
  const fileToUpload = await compressImage(file, { maxWidth: 800, maxHeight: 800, quality: 0.85 })

  const supabase = useSupabaseClient()
  const ext = fileToUpload.name.split('.').pop() ?? 'bin'
  const safeName = fileToUpload.name
    .replace(/\.[^/.]+$/, '')
    .replace(/[^a-zA-Z0-9-_]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .toLowerCase() || 'image'
  const timestamp = Date.now()
  const path = `${foodId}/${safeName}-${timestamp}.${ext}`

  const { error } = await supabase.storage
    .from(BUCKET_FOOD_PRICES)
    .upload(path, fileToUpload, { upsert: true, contentType: fileToUpload.type })

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
