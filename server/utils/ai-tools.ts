import { serverSupabaseServiceRole } from '#supabase/server'
import { serverSupabaseUser } from '#supabase/server'
import type { H3Event } from 'h3'

export const CHAT_TOOLS = [
  {
    type: 'function',
    function: {
      name: 'get_users_count',
      description: 'Dapatkan total pengguna terdaftar (users), termasuk statistik jumlah dari masing-masing role (petani, expert, instuktur, dll).',
      parameters: { type: 'object', properties: {} }
    }
  },
  {
    type: 'function',
    function: {
      name: 'get_experts',
      description: 'Dapatkan daftar pakar (experts) yang ada di platform.',
      parameters: { type: 'object', properties: {} }
    }
  },
  {
    type: 'function',
    function: {
      name: 'get_instructors',
      description: 'Dapatkan daftar instruktur (instructors) yang ada di platform.',
      parameters: { type: 'object', properties: {} }
    }
  },
  {
    type: 'function',
    function: {
      name: 'get_food_prices',
      description: 'Dapatkan 10 data komoditas pangan beserta harganya.',
      parameters: { type: 'object', properties: {} }
    }
  },
  {
    type: 'function',
    function: {
      name: 'get_daily_summary',
      description: 'Dapatkan ringkasan aktivitas platform hari ini: pengguna baru, kursus baru, berita baru, dan produk pasar baru.',
      parameters: { type: 'object', properties: {} }
    }
  },
  {
    type: 'function',
    function: {
      name: 'get_pending_content',
      description: 'Dapatkan daftar konten yang belum dipublish / masih berstatus draft: kursus (learning_courses), berita (news_updated), dan produk pasar (product_markets).',
      parameters: { type: 'object', properties: {} }
    }
  },
  {
    type: 'function',
    function: {
      name: 'get_recent_users',
      description: 'Dapatkan 10 pengguna terbaru yang mendaftar ke platform Jurutani, termasuk nama, email, dan role.',
      parameters: { type: 'object', properties: {} }
    }
  },
  {
    type: 'function',
    function: {
      name: 'get_unpublished_courses',
      description: 'Dapatkan daftar kursus (learning_courses) yang belum disetujui — status masih pending.',
      parameters: { type: 'object', properties: {} }
    }
  },
  {
    type: 'function',
    function: {
      name: 'get_user',
      description: 'Cari data pengguna tertentu berdasarkan nama lengkap atau email. Gunakan ketika user bertanya tentang info spesifik seorang pengguna.',
      parameters: {
        type: 'object',
        properties: {
          query: {
            type: 'string',
            description: 'Nama lengkap atau email pengguna yang ingin dicari.'
          }
        },
        required: ['query']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'get_platform_overview',
      description: 'Dapatkan ringkasan keseluruhan platform: total kursus, berita, video, pertemuan, produk pasar, pakar, instruktur, dan pengguna aktif.',
      parameters: { type: 'object', properties: {} }
    }
  },
  {
    type: 'function',
    function: {
      name: 'get_course_stats',
      description: 'Dapatkan statistik kursus pembelajaran (learning_courses): total keseluruhan, breakdown per status (pending/approved/rejected/archived), dan breakdown per kategori.',
      parameters: { type: 'object', properties: {} }
    }
  },
  {
    type: 'function',
    function: {
      name: 'get_top_courses',
      description: 'Dapatkan kursus terpopuler atau paling banyak diselesaikan (berdasarkan jumlah completions), beserta judul, kategori, dan rata-rata rating.',
      parameters: { type: 'object', properties: {} }
    }
  },
  {
    type: 'function',
    function: {
      name: 'get_course_completions_stats',
      description: 'Dapatkan statistik penyelesaian kursus (course_completions): total sertifikat diterbitkan, top 5 kursus dengan penyelesaian terbanyak.',
      parameters: { type: 'object', properties: {} }
    }
  },
  {
    type: 'function',
    function: {
      name: 'search_learning_course',
      description: 'Cari kursus pembelajaran berdasarkan kata kunci judul. Kembalikan daftar kursus yang cocok beserta status dan kategorinya.',
      parameters: {
        type: 'object',
        properties: {
          query: {
            type: 'string',
            description: 'Kata kunci judul kursus yang ingin dicari.'
          }
        },
        required: ['query']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'get_meetings',
      description: 'Dapatkan daftar pertemuan/agenda (meetings) yang ada di platform, termasuk judul, organisasi, kategori, dan status.',
      parameters: { type: 'object', properties: {} }
    }
  },
  {
    type: 'function',
    function: {
      name: 'get_meeting_stats',
      description: 'Dapatkan statistik pertemuan: total pertemuan, breakdown per kategori, dan jumlah jadwal pertemuan (meeting_schedules).',
      parameters: { type: 'object', properties: {} }
    }
  },
  {
    type: 'function',
    function: {
      name: 'get_videos',
      description: 'Dapatkan daftar video YouTube yang ada di platform Jurutani, termasuk judul, kategori, dan link.',
      parameters: { type: 'object', properties: {} }
    }
  },
  {
    type: 'function',
    function: {
      name: 'get_food_by_category',
      description: 'Dapatkan daftar komoditas pangan beserta harga terbaru berdasarkan kategori tertentu (misalnya: sayuran, buah, daging, ikan, bumbu, dll).',
      parameters: {
        type: 'object',
        properties: {
          category: {
            type: 'string',
            description: 'Kategori pangan yang ingin dicari, misalnya: sayuran, buah, daging, ikan, bumbu.'
          }
        },
        required: ['category']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'search_food',
      description: 'Cari komoditas pangan berdasarkan nama. Gunakan ketika user bertanya harga atau info spesifik sebuah komoditas (misalnya: harga beras, harga cabai, dll).',
      parameters: {
        type: 'object',
        properties: {
          query: {
            type: 'string',
            description: 'Nama komoditas pangan yang ingin dicari.'
          }
        },
        required: ['query']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'get_market_products',
      description: 'Dapatkan daftar produk pasar (product_markets) yang telah dipublish, termasuk nama, kategori, harga, dan penjual.',
      parameters: { type: 'object', properties: {} }
    }
  },
  {
    type: 'function',
    function: {
      name: 'get_market_stats',
      description: 'Dapatkan statistik produk pasar (product_markets): total produk, breakdown per status, dan breakdown per kategori.',
      parameters: { type: 'object', properties: {} }
    }
  },
  {
    type: 'function',
    function: {
      name: 'get_recent_news',
      description: 'Dapatkan berita terbaru dari platform (news_updated), termasuk judul, kategori, dan status publikasi.',
      parameters: { type: 'object', properties: {} }
    }
  },
  {
    type: 'function',
    function: {
      name: 'get_news_stats',
      description: 'Dapatkan statistik berita (news_updated): total berita, breakdown per status (published/pending/draft), dan breakdown per kategori.',
      parameters: { type: 'object', properties: {} }
    }
  },
  {
    type: 'function',
    function: {
      name: 'manage_news',
      description: 'Kelola data berita (news_updated) untuk aksi create, update, delete (soft delete), dan reject.',
      parameters: {
        type: 'object',
        properties: {
          action: {
            type: 'string',
            description: 'Aksi yang dijalankan: create | update | delete | reject'
          },
          id: {
            type: 'string',
            description: 'ID berita. Wajib untuk action update, delete, dan reject.'
          },
          title: {
            type: 'string',
            description: 'Judul berita. Wajib untuk create, opsional untuk update.'
          },
          category: {
            type: 'string',
            description: 'Kategori berita. Wajib untuk create, opsional untuk update.'
          },
          sub_title: {
            type: 'string',
            description: 'Sub judul berita (opsional).'
          },
          link: {
            type: 'string',
            description: 'Tautan referensi berita (opsional).'
          },
          cover_image: {
            type: 'string',
            description: 'URL cover image berita (opsional).'
          },
          content: {
            type: 'object',
            description: 'Konten berita berbentuk JSON (opsional).'
          },
          status_news: {
            type: 'string',
            description: 'Status berita untuk create/update (misal: pending/published/rejected/draft).'
          },
          reason: {
            type: 'string',
            description: 'Alasan reject. Wajib untuk action reject.'
          }
        },
        required: ['action']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'manage_market',
      description: 'Kelola data produk pasar (product_markets) untuk aksi create, update, delete (soft delete), dan reject.',
      parameters: {
        type: 'object',
        properties: {
          action: {
            type: 'string',
            description: 'Aksi yang dijalankan: create | update | delete | reject'
          },
          id: {
            type: 'string',
            description: 'ID produk market. Wajib untuk action update, delete, dan reject.'
          },
          name: {
            type: 'string',
            description: 'Nama produk. Wajib untuk create, opsional untuk update.'
          },
          category: {
            type: 'string',
            description: 'Kategori produk. Wajib untuk create, opsional untuk update.'
          },
          seller: {
            type: 'string',
            description: 'Nama penjual. Wajib untuk create, opsional untuk update.'
          },
          price: {
            type: 'number',
            description: 'Harga produk (opsional).'
          },
          price_range: {
            type: 'string',
            description: 'Rentang harga (opsional).'
          },
          price_unit: {
            type: 'string',
            description: 'Satuan harga (opsional).'
          },
          contact_seller: {
            type: 'string',
            description: 'Kontak penjual (opsional).'
          },
          excerpt: {
            type: 'string',
            description: 'Ringkasan produk (opsional).'
          },
          thumbnail_url: {
            type: 'string',
            description: 'URL thumbnail produk (opsional).'
          },
          content: {
            type: 'object',
            description: 'Konten produk berbentuk JSON (opsional).'
          },
          attachments: {
            type: 'object',
            description: 'Lampiran produk dalam bentuk JSON (opsional).'
          },
          images: {
            type: 'object',
            description: 'Daftar gambar produk dalam bentuk JSON (opsional).'
          },
          links: {
            type: 'object',
            description: 'Daftar tautan produk dalam bentuk JSON (opsional).'
          },
          status: {
            type: 'string',
            description: 'Status produk untuk create/update (misal: pending/published/rejected/draft).'
          },
          reason: {
            type: 'string',
            description: 'Alasan reject. Wajib untuk action reject.'
          }
        },
        required: ['action']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'get_expert_by_category',
      description: 'Dapatkan daftar pakar berdasarkan kategori keahlian tertentu.',
      parameters: {
        type: 'object',
        properties: {
          category: {
            type: 'string',
            description: 'Kategori keahlian pakar yang ingin dicari.'
          }
        },
        required: ['category']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'get_instructor_by_province',
      description: 'Dapatkan daftar instruktur berdasarkan provinsi tertentu.',
      parameters: {
        type: 'object',
        properties: {
          province: {
            type: 'string',
            description: 'Nama provinsi untuk filter instruktur.'
          }
        },
        required: ['province']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'get_instructor_stats',
      description: 'Dapatkan statistik instruktur: total, dan distribusi per provinsi.',
      parameters: { type: 'object', properties: {} }
    }
  },
  {
    type: 'function',
    function: {
      name: 'get_user_growth',
      description: 'Dapatkan pertumbuhan pengguna baru dalam N hari terakhir (default 7 hari), ditampilkan per hari.',
      parameters: {
        type: 'object',
        properties: {
          days: {
            type: 'number',
            description: 'Jumlah hari ke belakang untuk dihitung. Default 7.'
          }
        }
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'get_visit_stats',
      description: 'Dapatkan statistik kunjungan (visit_stats) platform dalam beberapa hari terakhir.',
      parameters: { type: 'object', properties: {} }
    }
  },
  {
    type: 'function',
    function: {
      name: 'get_inbox_stats',
      description: 'Dapatkan statistik pesan/percakapan (inbox): total percakapan, total pesan, dan jumlah pesan yang belum dibaca.',
      parameters: { type: 'object', properties: {} }
    }
  },
  {
    type: 'function',
    function: {
      name: 'get_deleted_users',
      description: 'Dapatkan daftar pengguna yang sudah dihapus/dinonaktifkan dari platform.',
      parameters: { type: 'object', properties: {} }
    }
  }
]

// Minimal subset for providers that struggle with large tool payloads (Groq, OpenRouter).
// Only the 6 most-used tools to keep the request small and avoid malformed function calls.
const CORE_TOOL_NAMES = new Set([
  'get_users_count', 'get_platform_overview',
  'get_daily_summary', 'get_pending_content',
  'get_food_prices', 'get_experts',
  'manage_news', 'manage_market'
])
export const CORE_TOOLS = CHAT_TOOLS.filter(
  t => CORE_TOOL_NAMES.has((t as { type: string, function: { name: string } }).function.name)
)

function safeParseArgs(args: string): Record<string, unknown> {
  if (!args || !args.trim()) return {}
  try {
    return JSON.parse(args) as Record<string, unknown>
  } catch {
    return {}
  }
}

export async function executeChatTool(event: H3Event, name: string, _args: string): Promise<unknown> {
  const supabase = serverSupabaseServiceRole(event)
  const mutatingTools = new Set(['manage_news', 'manage_market'])

  if (mutatingTools.has(name)) {
    const currentUser = await serverSupabaseUser(event)
    if (!currentUser) return { error: 'Unauthorized. Login diperlukan untuk aksi ini.' }

    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('is_admin, role')
      .eq('id', currentUser.id)
      .maybeSingle()

    if (profileError) throw profileError

    const role = String(profile?.role || '').toLowerCase()
    const isAllowed = profile?.is_admin === true || role === 'admin' || role === 'superadmin' || role === 'editor'
    if (!isAllowed) {
      return { error: 'Aksi ini hanya diizinkan untuk admin/editor.' }
    }
  }

  switch (name) {
    case 'get_users_count': {
      const { data, error } = await supabase.from('profiles').select('role').is('deleted_at', null)
      if (error) throw error
      const stats = data.reduce((acc: Record<string, number>, curr: { role: string | null }) => {
        const role = curr.role || 'unknown'
        acc[role] = (acc[role] || 0) + 1
        return acc
      }, {})
      return { total_users: data.length, breakdown_by_role: stats }
    }

    case 'get_experts': {
      const { data, error } = await supabase.from('experts').select('*, profiles(full_name, email, role)').is('deleted_at', null).limit(10)
      if (error) throw error
      return data.map((e: Record<string, unknown>) => {
        const p = e.profiles as Record<string, string> | undefined
        return {
          name: p?.full_name,
          email: p?.email,
          category: e.category,
          note: e.note
        }
      })
    }

    case 'get_instructors': {
      const { data, error } = await supabase.from('instructors').select('*, profiles(full_name, email, role)').is('deleted_at', null).limit(10)
      if (error) throw error
      return data.map((i: Record<string, unknown>) => {
        const p = i.profiles as Record<string, string> | undefined
        return {
          name: p?.full_name,
          email: p?.email,
          provinces: i.provinces,
          district: i.district
        }
      })
    }

    case 'get_food_prices': {
      const { data, error } = await supabase.rpc('get_all_latest_prices')
      if (error) {
        // fallback to normal query if RPC fails
        const { data: fallback, error: err2 } = await supabase.from('foods').select('name, category, satuan')
        if (err2) throw err2
        return fallback.slice(0, 10)
      }
      return data.slice(0, 10)
    }

    case 'get_daily_summary': {
      const today = new Date().toISOString().split('T')[0]
      const [usersRes, coursesRes, newsRes, marketsRes] = await Promise.all([
        supabase.from('profiles').select('id', { count: 'exact', head: true }).gte('created_at', today).is('deleted_at', null),
        supabase.from('learning_courses').select('id', { count: 'exact', head: true }).gte('created_at', today).is('deleted_at', null),
        supabase.from('news_updated').select('id', { count: 'exact', head: true }).gte('created_at', today).is('deleted_at', null),
        supabase.from('product_markets').select('id', { count: 'exact', head: true }).gte('created_at', today).is('deleted_at', null)
      ])
      return {
        date: today,
        new_users: usersRes.count ?? 0,
        new_courses: coursesRes.count ?? 0,
        new_news: newsRes.count ?? 0,
        new_markets: marketsRes.count ?? 0
      }
    }

    case 'get_pending_content': {
      const [coursesRes, newsRes, marketsRes] = await Promise.all([
        supabase.from('learning_courses').select('id, title, status, created_at').eq('status', 'pending').is('deleted_at', null).is('archived_at', null).limit(10),
        supabase.from('news_updated').select('id, title, status_news, created_at').eq('status_news', 'pending').is('deleted_at', null).limit(10),
        supabase.from('product_markets').select('id, name, status, created_at').eq('status', 'pending').is('deleted_at', null).is('archived_at', null).limit(10)
      ])
      return {
        pending_courses: coursesRes.data ?? [],
        pending_news: newsRes.data ?? [],
        pending_markets: marketsRes.data ?? []
      }
    }

    case 'get_recent_users': {
      const { data, error } = await supabase
        .from('profiles')
        .select('full_name, email, role, created_at')
        .is('deleted_at', null)
        .order('created_at', { ascending: false })
        .limit(10)
      if (error) throw error
      return data
    }

    case 'get_unpublished_courses': {
      const { data, error } = await supabase
        .from('learning_courses')
        .select('id, title, status, created_at')
        .eq('status', 'pending')
        .is('deleted_at', null)
        .is('archived_at', null)
        .order('created_at', { ascending: false })
        .limit(20)
      if (error) throw error
      return data
    }

    case 'get_user': {
      const args = JSON.parse(_args || '{}') as { query?: string }
      const query = args.query?.trim() || ''
      if (!query) return { error: 'Parameter query diperlukan.' }
      const { data, error } = await supabase
        .from('profiles')
        .select('full_name, email, role, created_at, deleted_at')
        .or(`full_name.ilike.%${query}%,email.ilike.%${query}%`)
        .is('deleted_at', null)
        .limit(5)
      if (error) throw error
      return data
    }

    case 'get_platform_overview': {
      const [
        usersRes, expertsRes, instructorsRes,
        coursesRes, lessonsRes, meetingsRes,
        videosRes, productsRes, newsRes
      ] = await Promise.all([
        supabase.from('profiles').select('id', { count: 'exact', head: true }).is('deleted_at', null),
        supabase.from('experts').select('id', { count: 'exact', head: true }).is('deleted_at', null),
        supabase.from('instructors').select('id', { count: 'exact', head: true }).is('deleted_at', null),
        supabase.from('learning_courses').select('id', { count: 'exact', head: true }).is('deleted_at', null).is('archived_at', null),
        supabase.from('course_lessons').select('id', { count: 'exact', head: true }).is('deleted_at', null),
        (supabase as never as { from: (table: string) => any }).from('meetings').select('id', { count: 'exact', head: true }).is('deleted_at', null).is('archived_at', null),
        supabase.from('videos').select('id', { count: 'exact', head: true }).is('deleted_at', null),
        supabase.from('product_markets').select('id', { count: 'exact', head: true }).is('deleted_at', null).is('archived_at', null),
        supabase.from('news_updated').select('id', { count: 'exact', head: true }).is('deleted_at', null)
      ])
      return {
        total_users: usersRes.count ?? 0,
        total_experts: expertsRes.count ?? 0,
        total_instructors: instructorsRes.count ?? 0,
        total_learning_courses: coursesRes.count ?? 0,
        total_course_lessons: lessonsRes.count ?? 0,
        total_meetings: meetingsRes.count ?? 0,
        total_videos: videosRes.count ?? 0,
        total_market_products: productsRes.count ?? 0,
        total_news: newsRes.count ?? 0
      }
    }

    case 'get_course_stats': {
      const { data, error } = await supabase
        .from('learning_courses')
        .select('status, category')
        .is('deleted_at', null)
        .is('archived_at', null)
      if (error) throw error
      const byStatus = data.reduce((acc: Record<string, number>, row) => {
        acc[row.status] = (acc[row.status] || 0) + 1
        return acc
      }, {})
      const byCategory = data.reduce((acc: Record<string, number>, row) => {
        const cat = row.category || 'uncategorized'
        acc[cat] = (acc[cat] || 0) + 1
        return acc
      }, {})
      return { total: data.length, by_status: byStatus, by_category: byCategory }
    }

    case 'get_top_courses': {
      const { data: completions, error: cErr } = await supabase
        .from('course_completions')
        .select('course_id')
        .is('invalidated_at', null)
      if (cErr) throw cErr
      const countMap: Record<string, number> = {}
      for (const c of completions) {
        countMap[c.course_id] = (countMap[c.course_id] || 0) + 1
      }
      const topIds = Object.entries(countMap)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10)
        .map(([id]) => id)
      if (topIds.length === 0) return []
      const { data: courses, error: courseErr } = await supabase
        .from('learning_courses')
        .select('id, title, category, status')
        .in('id', topIds)
        .is('deleted_at', null)
      if (courseErr) throw courseErr
      const { data: ratings, error: rErr } = await supabase
        .from('course_ratings')
        .select('course_id, rating')
        .in('course_id', topIds)
      if (rErr) throw rErr
      const avgRating: Record<string, number> = {}
      const ratingCount: Record<string, number> = {}
      for (const r of ratings) {
        avgRating[r.course_id] = (avgRating[r.course_id] || 0) + r.rating
        ratingCount[r.course_id] = (ratingCount[r.course_id] || 0) + 1
      }
      return courses.map((c) => ({
        id: c.id,
        title: c.title,
        category: c.category,
        status: c.status,
        completions: countMap[c.id] || 0,
        avg_rating: ratingCount[c.id] ? +((avgRating[c.id] ?? 0) / ratingCount[c.id]!).toFixed(2) : null
      })).sort((a, b) => b.completions - a.completions)
    }

    case 'get_course_completions_stats': {
      const [totalRes, byCoursesRes] = await Promise.all([
        supabase.from('course_completions').select('course_id', { count: 'exact', head: true }).is('invalidated_at', null),
        supabase.from('course_completions').select('course_id').is('invalidated_at', null)
      ])
      if (byCoursesRes.error) throw byCoursesRes.error
      const countMap: Record<string, number> = {}
      for (const c of byCoursesRes.data) {
        countMap[c.course_id] = (countMap[c.course_id] || 0) + 1
      }
      const topIds = Object.entries(countMap)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([id]) => id)
      let topCourses: unknown[] = []
      if (topIds.length > 0) {
        const { data: courses } = await supabase
          .from('learning_courses')
          .select('id, title, category')
          .in('id', topIds)
        topCourses = (courses ?? []).map((c) => ({ ...c, completions: countMap[c.id] }))
          .sort((a: Record<string, unknown>, b: Record<string, unknown>) => (b.completions as number) - (a.completions as number))
      }
      return {
        total_certificates_issued: totalRes.count ?? 0,
        top_5_courses: topCourses
      }
    }

    case 'search_learning_course': {
      const args = JSON.parse(_args || '{}') as { query?: string }
      const query = args.query?.trim() || ''
      if (!query) return { error: 'Parameter query diperlukan.' }
      const { data, error } = await supabase
        .from('learning_courses')
        .select('id, title, status, category, published_at, created_at')
        .ilike('title', `%${query}%`)
        .is('deleted_at', null)
        .is('archived_at', null)
        .order('created_at', { ascending: false })
        .limit(10)
      if (error) throw error
      return data
    }

    case 'get_meetings': {
      const { data, error } = await (supabase as never as { from: (table: string) => any })
        .from('meetings')
        .select('id, title, organization, category, created_at')
        .is('deleted_at', null)
        .is('archived_at', null)
        .order('created_at', { ascending: false })
        .limit(15)
      if (error) throw error
      return data
    }

    case 'get_meeting_stats': {
      const [meetingsRes, schedulesRes] = await Promise.all([
        (supabase as never as { from: (table: string) => any }).from('meetings').select('category').is('deleted_at', null).is('archived_at', null),
        supabase.from('meeting_schedules').select('id', { count: 'exact', head: true }).is('deleted_at', null).is('archived_at', null)
      ])
      if (meetingsRes.error) throw meetingsRes.error
      const byCategory = (meetingsRes.data as Array<{ category: string | null }> ?? []).reduce((acc: Record<string, number>, row) => {
        const category = row.category || 'uncategorized'
        acc[category] = (acc[category] || 0) + 1
        return acc
      }, {})
      return {
        total_meetings: (meetingsRes.data ?? []).length,
        by_category: byCategory,
        total_meeting_schedules: schedulesRes.count ?? 0
      }
    }

    case 'get_videos': {
      const { data, error } = await supabase
        .from('videos')
        .select('id, title, category, link_yt, created_at')
        .is('deleted_at', null)
        .order('created_at', { ascending: false })
        .limit(15)
      if (error) throw error
      return data
    }

    case 'get_food_by_category': {
      const args = JSON.parse(_args || '{}') as { category?: string }
      const category = args.category?.trim() || ''
      if (!category) return { error: 'Parameter category diperlukan.' }
      const { data, error } = await supabase.rpc('get_latest_prices_by_category', { p_category: category })
      if (error) {
        const { data: fallback, error: err2 } = await supabase
          .from('foods')
          .select('name, category, satuan')
          .ilike('category', `%${category}%`)
          .is('deleted_at', null)
          .limit(15)
        if (err2) throw err2
        return fallback
      }
      return data
    }

    case 'search_food': {
      const args = JSON.parse(_args || '{}') as { query?: string }
      const query = args.query?.trim() || ''
      if (!query) return { error: 'Parameter query diperlukan.' }
      const { data, error } = await supabase.rpc('search_foods', { p_search_term: query, p_limit: 5 })
      if (error) {
        const { data: fallback, error: err2 } = await supabase
          .from('foods')
          .select('name, category, satuan, description')
          .ilike('name', `%${query}%`)
          .is('deleted_at', null)
          .limit(5)
        if (err2) throw err2
        return fallback
      }
      return data
    }

    case 'get_market_products': {
      const { data, error } = await supabase
        .from('product_markets')
        .select('id, name, category, price, price_range, price_unit, seller, status, published_at')
        .eq('status', 'published')
        .is('deleted_at', null)
        .is('archived_at', null)
        .order('published_at', { ascending: false })
        .limit(15)
      if (error) throw error
      return data
    }

    case 'get_market_stats': {
      const { data, error } = await supabase
        .from('product_markets')
        .select('status, category')
        .is('deleted_at', null)
        .is('archived_at', null)
      if (error) throw error
      const byStatus = data.reduce((acc: Record<string, number>, row) => {
        acc[row.status] = (acc[row.status] || 0) + 1
        return acc
      }, {})
      const byCategory = data.reduce((acc: Record<string, number>, row) => {
        acc[row.category] = (acc[row.category] || 0) + 1
        return acc
      }, {})
      return { total: data.length, by_status: byStatus, by_category: byCategory }
    }

    case 'get_recent_news': {
      const { data, error } = await supabase
        .from('news_updated')
        .select('id, title, category, status_news, published_at, created_at')
        .is('deleted_at', null)
        .order('created_at', { ascending: false })
        .limit(15)
      if (error) throw error
      return data
    }

    case 'get_news_stats': {
      const { data, error } = await supabase
        .from('news_updated')
        .select('status_news, category')
        .is('deleted_at', null)
      if (error) throw error
      const byStatus = data.reduce((acc: Record<string, number>, row) => {
        acc[row.status_news] = (acc[row.status_news] || 0) + 1
        return acc
      }, {})
      const byCategory = data.reduce((acc: Record<string, number>, row) => {
        acc[row.category] = (acc[row.category] || 0) + 1
        return acc
      }, {})
      return { total: data.length, by_status: byStatus, by_category: byCategory }
    }

    case 'manage_news': {
      const args = safeParseArgs(_args) as {
        action?: string
        id?: string
        title?: string
        category?: string
        sub_title?: string
        link?: string
        cover_image?: string
        content?: Record<string, unknown>
        status_news?: string
        reason?: string
      }
      const action = String(args.action || '').toLowerCase().trim()

      if (!['create', 'update', 'delete', 'reject'].includes(action)) {
        return { error: 'Action manage_news tidak valid. Gunakan: create, update, delete, reject.' }
      }

      if (action === 'create') {
        const title = args.title?.trim()
        const category = args.category?.trim()
        if (!title || !category) {
          return { error: 'Untuk create news, parameter title dan category wajib diisi.' }
        }

        const payload: Record<string, unknown> = {
          title,
          category,
          status_news: args.status_news?.trim() || 'pending',
          content: args.content ?? {}
        }

        if (args.sub_title !== undefined) payload.sub_title = args.sub_title
        if (args.link !== undefined) payload.link = args.link
        if (args.cover_image !== undefined) payload.cover_image = args.cover_image
        if (payload.status_news === 'published') payload.published_at = new Date().toISOString()

        const { data, error } = await supabase
          .from('news_updated')
          .insert(payload as never)
          .select('id, title, category, status_news, created_at')
          .single()
        if (error) throw error
        return { success: true, action, item: data }
      }

      const id = args.id?.trim()
      if (!id) return { error: 'Parameter id wajib diisi untuk update, delete, atau reject news.' }

      if (action === 'update') {
        const payload: Record<string, unknown> = { updated_at: new Date().toISOString() }
        if (args.title !== undefined) payload.title = args.title
        if (args.category !== undefined) payload.category = args.category
        if (args.sub_title !== undefined) payload.sub_title = args.sub_title
        if (args.link !== undefined) payload.link = args.link
        if (args.cover_image !== undefined) payload.cover_image = args.cover_image
        if (args.content !== undefined) payload.content = args.content
        if (args.status_news !== undefined) {
          payload.status_news = args.status_news
          payload.published_at = args.status_news === 'published' ? new Date().toISOString() : null
        }

        if (Object.keys(payload).length === 1) {
          return { error: 'Tidak ada field yang diubah untuk update news.' }
        }

        const { data, error } = await supabase
          .from('news_updated')
          .update(payload as never)
          .eq('id', id)
          .is('deleted_at', null)
          .select('id, title, category, status_news, updated_at')
          .single()
        if (error) throw error
        return { success: true, action, item: data }
      }

      if (action === 'delete') {
        const now = new Date().toISOString()
        const { data, error } = await supabase
          .from('news_updated')
          .update({ deleted_at: now, updated_at: now })
          .eq('id', id)
          .is('deleted_at', null)
          .select('id, title, status_news, deleted_at')
          .single()
        if (error) throw error
        return { success: true, action, item: data }
      }

      const reason = args.reason?.trim()
      if (!reason) return { error: 'Alasan reject wajib diisi pada action reject news.' }

      const now = new Date().toISOString()
      const { data, error } = await supabase
        .from('news_updated')
        .update({
          status_news: 'rejected',
          published_at: null,
          updated_at: now
        })
        .eq('id', id)
        .is('deleted_at', null)
        .select('id, title, category, status_news, updated_at')
        .single()
      if (error) throw error
      return { success: true, action, reason, item: data }
    }

    case 'manage_market': {
      const args = safeParseArgs(_args) as {
        action?: string
        id?: string
        name?: string
        category?: string
        seller?: string
        price?: number
        price_range?: string
        price_unit?: string
        contact_seller?: string
        excerpt?: string
        thumbnail_url?: string
        content?: Record<string, unknown>
        attachments?: Record<string, unknown>
        images?: Record<string, unknown>
        links?: Record<string, unknown>
        status?: string
        reason?: string
      }
      const action = String(args.action || '').toLowerCase().trim()

      if (!['create', 'update', 'delete', 'reject'].includes(action)) {
        return { error: 'Action manage_market tidak valid. Gunakan: create, update, delete, reject.' }
      }

      if (action === 'create') {
        const nameValue = args.name?.trim()
        const category = args.category?.trim()
        const seller = args.seller?.trim()
        if (!nameValue || !category || !seller) {
          return { error: 'Untuk create market, parameter name, category, dan seller wajib diisi.' }
        }

        const payload: Record<string, unknown> = {
          name: nameValue,
          category,
          seller,
          status: args.status?.trim() || 'pending',
          content: args.content ?? {},
          attachments: args.attachments ?? [],
          images: args.images ?? [],
          links: args.links ?? []
        }

        if (args.price !== undefined) payload.price = args.price
        if (args.price_range !== undefined) payload.price_range = args.price_range
        if (args.price_unit !== undefined) payload.price_unit = args.price_unit
        if (args.contact_seller !== undefined) payload.contact_seller = args.contact_seller
        if (args.excerpt !== undefined) payload.excerpt = args.excerpt
        if (args.thumbnail_url !== undefined) payload.thumbnail_url = args.thumbnail_url
        if (payload.status === 'published') payload.published_at = new Date().toISOString()

        const { data, error } = await supabase
          .from('product_markets')
          .insert(payload as never)
          .select('id, name, category, seller, status, created_at')
          .single()
        if (error) throw error
        return { success: true, action, item: data }
      }

      const id = args.id?.trim()
      if (!id) return { error: 'Parameter id wajib diisi untuk update, delete, atau reject market.' }

      if (action === 'update') {
        const payload: Record<string, unknown> = { updated_at: new Date().toISOString() }
        if (args.name !== undefined) payload.name = args.name
        if (args.category !== undefined) payload.category = args.category
        if (args.seller !== undefined) payload.seller = args.seller
        if (args.price !== undefined) payload.price = args.price
        if (args.price_range !== undefined) payload.price_range = args.price_range
        if (args.price_unit !== undefined) payload.price_unit = args.price_unit
        if (args.contact_seller !== undefined) payload.contact_seller = args.contact_seller
        if (args.excerpt !== undefined) payload.excerpt = args.excerpt
        if (args.thumbnail_url !== undefined) payload.thumbnail_url = args.thumbnail_url
        if (args.content !== undefined) payload.content = args.content
        if (args.attachments !== undefined) payload.attachments = args.attachments
        if (args.images !== undefined) payload.images = args.images
        if (args.links !== undefined) payload.links = args.links
        if (args.status !== undefined) {
          payload.status = args.status
          payload.published_at = args.status === 'published' ? new Date().toISOString() : null
        }

        if (Object.keys(payload).length === 1) {
          return { error: 'Tidak ada field yang diubah untuk update market.' }
        }

        const { data, error } = await supabase
          .from('product_markets')
          .update(payload as never)
          .eq('id', id)
          .is('deleted_at', null)
          .select('id, name, category, seller, status, updated_at')
          .single()
        if (error) throw error
        return { success: true, action, item: data }
      }

      if (action === 'delete') {
        const now = new Date().toISOString()
        const { data, error } = await supabase
          .from('product_markets')
          .update({ deleted_at: now, updated_at: now })
          .eq('id', id)
          .is('deleted_at', null)
          .select('id, name, status, deleted_at')
          .single()
        if (error) throw error
        return { success: true, action, item: data }
      }

      const reason = args.reason?.trim()
      if (!reason) return { error: 'Alasan reject wajib diisi pada action reject market.' }

      const now = new Date().toISOString()
      const { data, error } = await supabase
        .from('product_markets')
        .update({ status: 'rejected', published_at: null, updated_at: now })
        .eq('id', id)
        .is('deleted_at', null)
        .select('id, name, category, seller, status, updated_at')
        .single()
      if (error) throw error
      return { success: true, action, reason, item: data }
    }

    case 'get_expert_by_category': {
      const args = JSON.parse(_args || '{}') as { category?: string }
      const category = args.category?.trim() || ''
      if (!category) return { error: 'Parameter category diperlukan.' }
      const { data, error } = await supabase
        .from('experts')
        .select('*, profiles(full_name, email)')
        .ilike('category', `%${category}%`)
        .is('deleted_at', null)
      if (error) throw error
      return (data ?? []).map((e: Record<string, unknown>) => {
        const p = e.profiles as Record<string, string> | undefined
        return { name: p?.full_name, email: p?.email, category: e.category, note: e.note }
      })
    }

    case 'get_instructor_by_province': {
      const args = JSON.parse(_args || '{}') as { province?: string }
      const province = args.province?.trim() || ''
      if (!province) return { error: 'Parameter province diperlukan.' }
      const { data, error } = await supabase
        .from('instructors')
        .select('*, profiles(full_name, email)')
        .ilike('provinces', `%${province}%`)
        .is('deleted_at', null)
      if (error) throw error
      return data.map((i: Record<string, unknown>) => {
        const p = i.profiles as Record<string, string> | undefined
        return { name: p?.full_name, email: p?.email, provinces: i.provinces, district: i.district, note: i.note }
      })
    }

    case 'get_instructor_stats': {
      const { data, error } = await supabase
        .from('instructors')
        .select('provinces')
        .is('deleted_at', null)
      if (error) throw error
      const byProvince = data.reduce((acc: Record<string, number>, row) => {
        const prov = row.provinces || 'unknown'
        acc[prov] = (acc[prov] || 0) + 1
        return acc
      }, {})
      return { total: data.length, by_province: byProvince }
    }

    case 'get_user_growth': {
      const args = JSON.parse(_args || '{}') as { days?: number }
      const days = Math.min(Math.max(args.days ?? 7, 1), 90)
      const since = new Date()
      since.setDate(since.getDate() - days)
      const sinceStr = since.toISOString().split('T')[0]
      const { data, error } = await supabase
        .from('profiles')
        .select('created_at')
        .is('deleted_at', null)
        .gte('created_at', sinceStr)
        .order('created_at', { ascending: true })
      if (error) throw error
      const daily: Record<string, number> = {}
      for (const row of data) {
        const day = row.created_at.split('T')[0] ?? row.created_at
        daily[day] = (daily[day] ?? 0) + 1
      }
      return {
        period_days: days,
        total_new_users: data.length,
        daily_breakdown: Object.entries(daily).map(([date, count]) => ({ date, count }))
      }
    }

    case 'get_visit_stats': {
      const { data, error } = await supabase
        .from('visit_stats')
        .select('date, count')
        .order('date', { ascending: false })
        .limit(14)
      if (error) throw error
      const total = data.reduce((sum, row) => sum + row.count, 0)
      return { last_14_days: data.reverse(), total_visits_period: total }
    }

    case 'get_inbox_stats': {
      const [convRes, msgRes, unreadRes] = await Promise.all([
        supabase.from('conversations').select('id', { count: 'exact', head: true }),
        supabase.from('messages').select('id', { count: 'exact', head: true }),
        supabase.from('messages').select('id', { count: 'exact', head: true }).eq('is_read', false)
      ])
      return {
        total_conversations: convRes.count ?? 0,
        total_messages: msgRes.count ?? 0,
        unread_messages: unreadRes.count ?? 0
      }
    }

    case 'get_deleted_users': {
      const { data, error } = await supabase
        .from('profiles')
        .select('full_name, email, role, deleted_at')
        .not('deleted_at', 'is', null)
        .order('deleted_at', { ascending: false })
        .limit(15)
      if (error) throw error
      return { total: data.length, users: data }
    }

    default:
      return { error: 'Unknown tool' }
  }
}
