# Supabase Setup Guide

Panduan lengkap untuk mengintegrasikan Supabase dengan dashboard Jurutani.

## 📦 Dependencies

Dependencies berikut sudah terinstall:

- `@supabase/supabase-js` - Supabase client library untuk runtime
- `supabase` - Supabase CLI untuk type generation dan migrations
- `zod` - Schema validation (sudah ada sebelumnya)

## 🔧 Setup Environment Variables

1. Copy file `.env.example` ke `.env`:
   ```bash
   cp .env.example .env
   ```

2. Isi environment variables dengan credentials dari Supabase Dashboard:

   ```env
   SUPABASE_URL=https://your-project-ref.supabase.co
   SUPABASE_KEY=your-anon-public-key
   SUPABASE_SERVICE_KEY=your-service-role-key
   ```

   **Cara mendapatkan credentials:**
   - Buka [Supabase Dashboard](https://supabase.com/dashboard)
   - Pilih project Anda
   - Pergi ke **Settings** → **API**
   - Copy `Project URL` untuk `SUPABASE_URL`
   - Copy `anon public` key untuk `SUPABASE_KEY`
   - Copy `service_role` key untuk `SUPABASE_SERVICE_KEY` (optional, untuk admin operations)

## 🔐 Authentication CLI

Sebelum generate types, Anda perlu login ke Supabase CLI:

```bash
pnpm supabase login
```

Ini akan membuka browser untuk authentication. Setelah login, token akan disimpan dan Anda tidak perlu login lagi.

## 🔗 Link Project

Link project lokal Anda dengan project Supabase:

```bash
pnpm supabase link --project-ref YOUR_PROJECT_REF
```

**Cara mendapatkan PROJECT_REF:**
- Buka project di Supabase Dashboard
- PROJECT_REF adalah bagian dari URL: `https://supabase.com/dashboard/project/YOUR_PROJECT_REF`
- Atau pergi ke **Settings** → **General** → **Reference ID**

## 🎯 Generate Database Types

Setelah link project, generate types dari database schema:

```bash
pnpm types:generate
```

Script ini akan:
1. Connect ke Supabase project yang sudah di-link
2. Fetch database schema (tables, views, functions, enums)
3. Generate TypeScript types ke `app/types/database.types.ts`

**Kapan perlu regenerate types:**
- Setelah membuat atau mengubah table di Supabase
- Setelah menambah atau mengubah column
- Setelah membuat enum baru
- Setelah membuat database function atau view baru

## 📝 Usage Examples

### 1. Basic Query di Component

```vue
<script setup lang="ts">
const supabase = useSupabaseClient()

// Fetch data dengan auto-complete untuk table dan column names
const { data: users, error } = await supabase
  .from('users')  // Auto-complete untuk table names
  .select('*')
  .eq('status', 'active')

// Type-safe: users akan memiliki type yang benar otomatis
console.log(users) // Type: Tables<'users'>[] | null
</script>
```

### 2. Insert Data

```vue
<script setup lang="ts">
const supabase = useSupabaseClient()

// Insert dengan type checking
const { data, error } = await supabase
  .from('users')
  .insert({
    name: 'John Doe',
    email: 'john@example.com',
    status: 'active'  // Auto-complete dan type checking untuk allowed values
  })
  .select()
  .single()
</script>
```

### 3. Update Data

```vue
<script setup lang="ts">
const supabase = useSupabaseClient()

const { data, error } = await supabase
  .from('users')
  .update({ status: 'inactive' })
  .eq('id', userId)
</script>
```

### 4. Authentication

```vue
<script setup lang="ts">
const { user, signIn, signOut } = useSupabaseAuth()

// Sign in
const handleSignIn = async () => {
  const { data, error } = await signIn(email, password)
  if (error) {
    console.error('Sign in error:', error)
  }
}

// Current user (reactive)
watchEffect(() => {
  if (user.value) {
    console.log('Logged in as:', user.value.email)
  }
})
</script>
```

### 5. Server API Route dengan Service Key

```typescript
// server/api/admin/users.ts
export default defineEventHandler(async (event) => {
  const supabase = getSupabaseServiceClient()
  
  // Menggunakan service key untuk bypass Row Level Security
  const { data: users, error } = await supabase
    .from('users')
    .select('*')
  
  if (error) {
    throw createError({
      statusCode: 500,
      message: error.message
    })
  }
  
  return users
})
```

## 🎨 Type Utilities

Generated types menyediakan helper untuk akses yang lebih mudah:

```typescript
import type { Tables, Enums, Functions } from '~/types/database.types'

// Extract table row type
type User = Tables<'users'>
type Product = Tables<'products'>

// Extract enum type
type UserStatus = Enums<'user_status'>

// Use in function parameters
function processUser(user: Tables<'users'>) {
  console.log(user.name) // Type-safe access
}
```

## 📁 File Structure

```
app/
├── types/
│   ├── database.types.ts    # Auto-generated Supabase types
│   └── index.d.ts           # Manual types (existing)
├── utils/
│   └── supabase.ts          # Supabase client utilities
└── composables/
    └── useSupabase.ts       # Vue composables untuk Supabase
```

## 🔄 Workflow

1. **Development**: Gunakan `useSupabaseClient()` di components untuk queries
2. **Schema Changes**: Update tables di Supabase Dashboard
3. **Regenerate Types**: Run `pnpm types:generate`
4. **Type Checking**: Run `pnpm typecheck` untuk verify no errors
5. **Commit**: Commit `database.types.ts` ke repository agar team dapat akses types yang sama

## ⚠️ Important Notes

- **Service Key**: Jangan expose `SUPABASE_SERVICE_KEY` ke client-side code. Hanya gunakan di server API routes.
- **Row Level Security**: Client menggunakan anon key, jadi pastikan RLS policies sudah dikonfigurasi dengan benar di Supabase.
- **Type Safety**: Jika ada TypeScript error setelah schema changes, regenerate types dengan `pnpm types:generate`.
- **Git**: Pertimbangkan untuk add `.env` ke `.gitignore` (biasanya sudah ada) untuk avoid commit credentials.

## 🐛 Troubleshooting

### "Supabase URL and Key must be provided"
- Pastikan `.env` file ada dan berisi `SUPABASE_URL` dan `SUPABASE_KEY`
- Restart dev server setelah menambah environment variables

### "Error linking project"
- Pastikan sudah login: `pnpm supabase login`
- Pastikan PROJECT_REF benar
- Check internet connection

### "Permission denied" saat generate types
- Pastikan sudah link project: `pnpm supabase link`
- Pastikan access token masih valid (re-login jika expired)

### Types tidak update setelah schema changes
- Re-run `pnpm types:generate`
- Restart TypeScript server di VS Code: `Cmd/Ctrl + Shift + P` → "TypeScript: Restart TS Server"

## 📚 Resources

- [Supabase Documentation](https://supabase.com/docs)
- [Supabase JavaScript Client](https://supabase.com/docs/reference/javascript/introduction)
- [Supabase CLI Reference](https://supabase.com/docs/reference/cli/introduction)
- [TypeScript Support](https://supabase.com/docs/guides/api/generating-types)
