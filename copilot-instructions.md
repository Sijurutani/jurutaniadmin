# Copilot Instructions untuk Project Jurutani Admin

## Project Context

Project ini adalah dashboard admin Jurutani yang dibangun dengan:
- **Nuxt 4** (v4.3.1) - Full-stack Vue framework
- **Nuxt UI 4** (v4.5.1) - Component library berbasis Tailwind CSS v4
- **Supabase** - Backend as a Service (Database, Auth, Storage)
- **Zod** (v4.3.6) - TypeScript-first schema validation
- **TypeScript** - Static type checking
- **pnpm** - Package manager

## Struktur Project

```
app/
  ├── components/       # Vue components
  ├── composables/      # Vue composables
  ├── layouts/          # Nuxt layouts
  ├── pages/            # File-based routing
  ├── types/            # TypeScript types
  └── utils/            # Utility functions
server/
  └── api/              # Server API routes
supabase/               # Supabase migrations & config
```

## Coding Standards

### 1. Component Development (Nuxt UI 4)

Gunakan komponen dari Nuxt UI 4:
```vue
<template>
  <UCard>
    <UButton color="primary" @click="handleClick">
      Click Me
    </UButton>
  </UCard>
</template>
```

**Komponen Utama Nuxt UI 4:**
- `UButton`, `UInput`, `UTextarea`, `USelect`
- `UCard`, `UModal`, `UDropdown`, `USlideover`
- `UTable`, `UPagination`, `UBadge`
- `UAlert`, `UNotification`, `UToast`
- `UForm`, `UFormGroup` dengan integrasi Zod

### 2. Validasi dengan Zod

Selalu gunakan Zod untuk validasi schema:
```typescript
import { z } from 'zod'

// Schema definition
export const userSchema = z.object({
  name: z.string().min(3).max(50),
  email: z.string().email(),
  age: z.number().min(18).optional()
})

// Type inference
export type User = z.infer<typeof userSchema>

// Validation
const result = userSchema.safeParse(data)
if (!result.success) {
  console.error(result.error)
}
```

**Integrasi Zod dengan UForm:**
```vue
<script setup lang="ts">
import { z } from 'zod'

const schema = z.object({
  email: z.string().email('Invalid email'),
  password: z.string().min(8, 'Must be at least 8 characters')
})

type Schema = z.output<typeof schema>

const state = reactive({
  email: '',
  password: ''
})

async function onSubmit(event: Schema) {
  // Handle form submission
}
</script>

<template>
  <UForm :schema="schema" :state="state" @submit="onSubmit">
    <UFormGroup label="Email" name="email">
      <UInput v-model="state.email" />
    </UFormGroup>
    <UFormGroup label="Password" name="password">
      <UInput v-model="state.password" type="password" />
    </UFormGroup>
    <UButton type="submit">Submit</UButton>
  </UForm>
</template>
```

### 3. Supabase Integration

Gunakan composable `useSupabaseClient()` untuk akses Supabase:

```typescript
// app/composables/useSupabase.ts
export const useSupabase = () => {
  const config = useRuntimeConfig()
  const supabase = createClient(
    config.public.supabaseUrl,
    config.public.supabaseKey
  )
  return supabase
}

// Usage dalam component
const supabase = useSupabaseClient()

// Query data
const { data, error } = await supabase
  .from('customers')
  .select('*')
  .order('created_at', { ascending: false })

// Insert data
const { data, error } = await supabase
  .from('customers')
  .insert({ name: 'John Doe', email: 'john@example.com' })

// Update data
const { data, error } = await supabase
  .from('customers')
  .update({ name: 'Jane Doe' })
  .eq('id', userId)

// Delete data
const { data, error } = await supabase
  .from('customers')
  .delete()
  .eq('id', userId)
```

**Authentication:**
```typescript
// Sign in
const { data, error } = await supabase.auth.signInWithPassword({
  email: 'user@example.com',
  password: 'password123'
})

// Sign out
await supabase.auth.signOut()

// Get current user
const { data: { user } } = await supabase.auth.getUser()
```

### 4. Server API Routes

Buat API routes di folder `server/api/`:
```typescript
// server/api/customers.ts
import { z } from 'zod'

const customerSchema = z.object({
  name: z.string(),
  email: z.string().email(),
  phone: z.string().optional()
})

export default defineEventHandler(async (event) => {
  // Get query params
  const query = getQuery(event)
  
  // For POST/PUT, validate body
  if (event.method === 'POST' || event.method === 'PUT') {
    const body = await readBody(event)
    const validation = customerSchema.safeParse(body)
    
    if (!validation.success) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Invalid request body',
        data: validation.error.errors
      })
    }
  }
  
  // Return response
  return {
    success: true,
    data: []
  }
})
```

### 5. TypeScript Types

Gunakan types yang di-generate dari Supabase:
```typescript
import type { Database } from '~/types/database.types'

// Table types
type Customer = Database['public']['Tables']['customers']['Row']
type CustomerInsert = Database['public']['Tables']['customers']['Insert']
type CustomerUpdate = Database['public']['Tables']['customers']['Update']
```

Generate types dengan command:
```bash
pnpm types:generate
```

### 6. Composables Pattern

Buat composables untuk reusable logic:
```typescript
// app/composables/useCustomers.ts
export const useCustomers = () => {
  const supabase = useSupabaseClient()
  const customers = ref([])
  const loading = ref(false)
  const error = ref(null)
  
  const fetchCustomers = async () => {
    loading.value = true
    const { data, error: err } = await supabase
      .from('customers')
      .select('*')
    
    if (err) {
      error.value = err
    } else {
      customers.value = data
    }
    loading.value = false
  }
  
  return {
    customers,
    loading,
    error,
    fetchCustomers
  }
}
```

### 7. Error Handling

Selalu handle errors dengan proper:
```typescript
try {
  const { data, error } = await supabase.from('table').select()
  
  if (error) {
    throw error
  }
  
  return { success: true, data }
} catch (err) {
  console.error('Error:', err)
  return { 
    success: false, 
    error: err.message 
  }
}
```

## Environment Variables

File `.env` harus berisi:
```env
SUPABASE_URL=your_supabase_url
SUPABASE_KEY=your_supabase_anon_key
SUPABASE_SERVICE_KEY=your_supabase_service_key
```

## Commands

- `pnpm dev` - Start development server
- `pnpm build` - Build for production
- `pnpm preview` - Preview production build
- `pnpm lint` - Run ESLint
- `pnpm typecheck` - Check TypeScript types
- `pnpm types:generate` - Generate Supabase types

## Best Practices

1. **Selalu gunakan TypeScript** untuk type safety
2. **Validasi semua input** dengan Zod schema
3. **Gunakan composables** untuk reusable logic
4. **Handle errors** di setiap async operation
5. **Gunakan Nuxt UI components** daripada HTML native
6. **Follow ESLint rules** yang sudah dikonfigurasi
7. **Generate Supabase types** setiap kali schema berubah
8. **Gunakan auto-imports** Nuxt (tidak perlu import Vue/Nuxt utilities)

## Code Style

- Use single quotes untuk strings
- No semicolons (configured in ESLint)
- 2 spaces indentation
- Comma dangle: never
- Brace style: 1tbs
