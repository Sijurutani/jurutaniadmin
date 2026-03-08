/**
 * Context providers untuk MCP Server
 * Menyediakan dokumentasi dan pattern untuk project
 */

export function getProjectContext() {
  return `# Jurutani Admin Dashboard - Project Context

## Tech Stack
- **Nuxt 4** (v4.3.1) - Full-stack Vue framework
- **Nuxt UI 4** (v4.5.1) - Component library
- **Supabase** - Backend as a Service
- **Zod** (v4.3.6) - Schema validation
- **TypeScript** - Type safety
- **pnpm** - Package manager

## Project Structure
\`\`\`
app/
  ├── components/       # Reusable Vue components
  ├── composables/      # Vue composables
  ├── layouts/          # App layouts
  ├── pages/            # File-based routing
  ├── types/            # TypeScript definitions
  └── utils/            # Utility functions
server/
  └── api/              # Backend API routes
supabase/               # Database migrations
\`\`\`

## Key Conventions
1. Use TypeScript untuk semua file
2. Validation dengan Zod schema
3. Supabase untuk database dan auth
4. Nuxt UI components untuk UI
5. Composables untuk reusable logic
6. Auto-imports enabled (no need to import ref, computed, etc.)

## Environment Variables
- SUPABASE_URL
- SUPABASE_KEY
- SUPABASE_SERVICE_KEY
`
}

export function getNuxtUIComponents() {
  return `# Nuxt UI 4 Components Reference

## Form Components

### UForm
Form wrapper dengan integrasi Zod:
\`\`\`vue
<script setup lang="ts">
import { z } from 'zod'

const schema = z.object({
  email: z.string().email(),
  password: z.string().min(8)
})

const state = reactive({ email: '', password: '' })

async function onSubmit(data: any) {
  console.log(data)
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
\`\`\`

### UInput
\`\`\`vue
<UInput 
  v-model="value"
  placeholder="Enter text..."
  :disabled="false"
  :loading="false"
/>
\`\`\`

### UButton
\`\`\`vue
<UButton 
  color="primary"
  variant="solid"
  size="md"
  :loading="isLoading"
  @click="handleClick"
>
  Click Me
</UButton>
\`\`\`

Colors: primary, secondary, success, warning, error, info

### USelect
\`\`\`vue
<USelect 
  v-model="selected"
  :options="[
    { label: 'Option 1', value: '1' },
    { label: 'Option 2', value: '2' }
  ]"
/>
\`\`\`

## Layout Components

### UCard
\`\`\`vue
<UCard>
  <template #header>
    <h3>Card Title</h3>
  </template>
  
  <div>Card Content</div>
  
  <template #footer>
    <UButton>Action</UButton>
  </template>
</UCard>
\`\`\`

### UModal
\`\`\`vue
<script setup>
const isOpen = ref(false)
</script>

<template>
  <UButton @click="isOpen = true">Open Modal</UButton>
  
  <UModal v-model="isOpen">
    <UCard>
      <template #header>
        <h3>Modal Title</h3>
      </template>
      
      <div>Modal Content</div>
    </UCard>
  </UModal>
</template>
\`\`\`

### USlideover
\`\`\`vue
<USlideover v-model="isOpen" side="right">
  <div class="p-4">
    <h3>Slideover Content</h3>
  </div>
</USlideover>
\`\`\`

## Data Display

### UTable
\`\`\`vue
<script setup>
const columns = [
  { key: 'id', label: 'ID' },
  { key: 'name', label: 'Name' },
  { key: 'email', label: 'Email' },
  { key: 'actions', label: 'Actions' }
]

const rows = ref([])
</script>

<template>
  <UTable :columns="columns" :rows="rows">
    <template #actions-data="{ row }">
      <UButton size="xs" @click="edit(row)">Edit</UButton>
    </template>
  </UTable>
</template>
\`\`\`

### UBadge
\`\`\`vue
<UBadge color="success" variant="solid">Active</UBadge>
<UBadge color="error" variant="outline">Inactive</UBadge>
\`\`\`

### UPagination
\`\`\`vue
<UPagination 
  v-model="page"
  :total="100"
  :page-size="10"
/>
\`\`\`

## Feedback Components

### UAlert
\`\`\`vue
<UAlert 
  color="success"
  title="Success!"
  description="Operation completed successfully"
  :closable="true"
/>
\`\`\`

### Toast (using useToast)
\`\`\`vue
<script setup>
const toast = useToast()

function showToast() {
  toast.add({
    title: 'Success',
    description: 'Item saved!',
    color: 'success'
  })
}
</script>
\`\`\`

## Dropdown & Menu

### UDropdown
\`\`\`vue
<UDropdown :items="[
  [{ label: 'Edit', icon: 'i-lucide-edit' }],
  [{ label: 'Delete', icon: 'i-lucide-trash', color: 'error' }]
]">
  <UButton>Actions</UButton>
</UDropdown>
\`\`\`
`
}

export function getSupabasePatterns() {
  return `# Supabase Integration Patterns

## Setup Composable

\`\`\`typescript
// app/composables/useSupabase.ts
import { createClient } from '@supabase/supabase-js'
import type { Database } from '~/types/database.types'

export const useSupabase = () => {
  const config = useRuntimeConfig()
  
  const supabase = createClient<Database>(
    config.public.supabaseUrl,
    config.public.supabaseKey
  )
  
  return supabase
}
\`\`\`

## Database Operations

### Select with Filters
\`\`\`typescript
const supabase = useSupabaseClient()

const { data, error } = await supabase
  .from('customers')
  .select('*')
  .eq('status', 'active')
  .order('created_at', { ascending: false })
  .limit(10)

if (error) throw error
\`\`\`

### Select with Relations
\`\`\`typescript
const { data, error } = await supabase
  .from('orders')
  .select(\`
    *,
    customer:customers(name, email),
    items:order_items(*, product:products(*))
  \`)
  .eq('id', orderId)
  .single()

if (error) throw error
\`\`\`

### Insert
\`\`\`typescript
const { data, error } = await supabase
  .from('customers')
  .insert({
    name: 'John Doe',
    email: 'john@example.com',
    phone: '0123456789'
  })
  .select()
  .single()

if (error) throw error
\`\`\`

### Update
\`\`\`typescript
const { data, error } = await supabase
  .from('customers')
  .update({ name: 'Jane Doe' })
  .eq('id', customerId)
  .select()
  .single()

if (error) throw error
\`\`\`

### Delete
\`\`\`typescript
const { error } = await supabase
  .from('customers')
  .delete()
  .eq('id', customerId)

if (error) throw error
\`\`\`

## Authentication

### Sign Up
\`\`\`typescript
const { data, error } = await supabase.auth.signUp({
  email: 'user@example.com',
  password: 'secure_password',
  options: {
    data: {
      full_name: 'John Doe'
    }
  }
})

if (error) throw error
\`\`\`

### Sign In
\`\`\`typescript
const { data, error } = await supabase.auth.signInWithPassword({
  email: 'user@example.com',
  password: 'secure_password'
})

if (error) throw error
\`\`\`

### Sign Out
\`\`\`typescript
const { error } = await supabase.auth.signOut()
if (error) throw error
\`\`\`

### Get Current User
\`\`\`typescript
const { data: { user }, error } = await supabase.auth.getUser()
if (error) throw error
\`\`\`

### Auth State Change
\`\`\`typescript
supabase.auth.onAuthStateChange((event, session) => {
  if (event === 'SIGNED_IN') {
    console.log('User signed in:', session.user)
  } else if (event === 'SIGNED_OUT') {
    console.log('User signed out')
  }
})
\`\`\`

## Real-time Subscriptions

\`\`\`typescript
const channel = supabase
  .channel('customers-changes')
  .on(
    'postgres_changes',
    {
      event: '*',
      schema: 'public',
      table: 'customers'
    },
    (payload) => {
      console.log('Change received:', payload)
    }
  )
  .subscribe()

// Cleanup
onUnmounted(() => {
  channel.unsubscribe()
})
\`\`\`

## Storage

### Upload File
\`\`\`typescript
const file = event.target.files[0]

const { data, error } = await supabase.storage
  .from('avatars')
  .upload(\`public/\${user.id}/avatar.png\`, file, {
    cacheControl: '3600',
    upsert: true
  })

if (error) throw error
\`\`\`

### Get Public URL
\`\`\`typescript
const { data } = supabase.storage
  .from('avatars')
  .getPublicUrl('public/avatar.png')

const publicUrl = data.publicUrl
\`\`\`

### Delete File
\`\`\`typescript
const { error } = await supabase.storage
  .from('avatars')
  .remove(['public/avatar.png'])

if (error) throw error
\`\`\`

## Error Handling

\`\`\`typescript
try {
  const { data, error } = await supabase
    .from('customers')
    .select('*')
  
  if (error) {
    throw error
  }
  
  return { success: true, data }
} catch (err) {
  console.error('Supabase error:', err)
  
  return {
    success: false,
    error: err.message || 'Database operation failed'
  }
}
\`\`\`

## TypeScript Types

\`\`\`typescript
import type { Database } from '~/types/database.types'

type Customer = Database['public']['Tables']['customers']['Row']
type CustomerInsert = Database['public']['Tables']['customers']['Insert']
type CustomerUpdate = Database['public']['Tables']['customers']['Update']

// Usage
const customer: Customer = {
  id: '123',
  name: 'John Doe',
  email: 'john@example.com',
  created_at: new Date().toISOString()
}
\`\`\`
`
}

export function getZodSchemas() {
  return `# Zod Schema Validation Patterns

## Basic Schemas

### String Validation
\`\`\`typescript
import { z } from 'zod'

const emailSchema = z.string().email('Invalid email format')
const passwordSchema = z.string().min(8, 'Password must be at least 8 characters')
const phoneSchema = z.string().regex(/^\\d{10,}$/, 'Invalid phone number')
const urlSchema = z.string().url('Invalid URL')
\`\`\`

### Number Validation
\`\`\`typescript
const ageSchema = z.number().min(18, 'Must be 18 or older').max(120)
const priceSchema = z.number().positive('Price must be positive')
const quantitySchema = z.number().int('Must be a whole number').min(1)
\`\`\`

### Date Validation
\`\`\`typescript
const dateSchema = z.date()
const dateStringSchema = z.string().datetime()
const futureDateSchema = z.date().min(new Date(), 'Date must be in the future')
\`\`\`

## Object Schemas

### Simple Object
\`\`\`typescript
const userSchema = z.object({
  name: z.string().min(3).max(50),
  email: z.string().email(),
  age: z.number().min(18).optional(),
  role: z.enum(['admin', 'user', 'guest']).default('user')
})

type User = z.infer<typeof userSchema>
\`\`\`

### Nested Objects
\`\`\`typescript
const addressSchema = z.object({
  street: z.string(),
  city: z.string(),
  state: z.string(),
  zipCode: z.string()
})

const customerSchema = z.object({
  name: z.string(),
  email: z.string().email(),
  address: addressSchema,
  billingAddress: addressSchema.optional()
})
\`\`\`

### Arrays
\`\`\`typescript
const tagsSchema = z.array(z.string())
const numbersSchema = z.array(z.number()).min(1, 'At least one item required')

const orderItemsSchema = z.array(
  z.object({
    productId: z.string(),
    quantity: z.number().min(1),
    price: z.number().positive()
  })
)
\`\`\`

## Advanced Patterns

### Union Types
\`\`\`typescript
const paymentMethodSchema = z.union([
  z.object({
    type: z.literal('cash'),
    amount: z.number()
  }),
  z.object({
    type: z.literal('card'),
    cardNumber: z.string(),
    amount: z.number()
  }),
  z.object({
    type: z.literal('transfer'),
    accountNumber: z.string(),
    amount: z.number()
  })
])
\`\`\`

### Discriminated Unions
\`\`\`typescript
const eventSchema = z.discriminatedUnion('type', [
  z.object({
    type: z.literal('click'),
    x: z.number(),
    y: z.number()
  }),
  z.object({
    type: z.literal('keypress'),
    key: z.string()
  })
])
\`\`\`

### Refinements (Custom Validation)
\`\`\`typescript
const passwordConfirmSchema = z.object({
  password: z.string().min(8),
  confirmPassword: z.string()
}).refine((data) => data.password === data.confirmPassword, {
  message: 'Passwords do not match',
  path: ['confirmPassword']
})

const dateRangeSchema = z.object({
  startDate: z.date(),
  endDate: z.date()
}).refine((data) => data.endDate > data.startDate, {
  message: 'End date must be after start date',
  path: ['endDate']
})
\`\`\`

### Transformations
\`\`\`typescript
const stringToNumberSchema = z.string().transform((val) => parseInt(val, 10))

const trimmedStringSchema = z.string().transform((val) => val.trim())

const dateStringToDateSchema = z.string().transform((val) => new Date(val))
\`\`\`

## Integration with Nuxt UI Forms

### Basic Form
\`\`\`vue
<script setup lang="ts">
import { z } from 'zod'

const schema = z.object({
  name: z.string().min(3, 'Name must be at least 3 characters'),
  email: z.string().email('Invalid email'),
  phone: z.string().regex(/^\\d{10,}$/, 'Invalid phone number').optional()
})

type FormData = z.infer<typeof schema>

const state = reactive<FormData>({
  name: '',
  email: '',
  phone: ''
})

async function onSubmit(data: FormData) {
  console.log('Valid data:', data)
}
</script>

<template>
  <UForm :schema="schema" :state="state" @submit="onSubmit">
    <UFormGroup label="Name" name="name">
      <UInput v-model="state.name" />
    </UFormGroup>
    
    <UFormGroup label="Email" name="email">
      <UInput v-model="state.email" type="email" />
    </UFormGroup>
    
    <UFormGroup label="Phone" name="phone">
      <UInput v-model="state.phone" type="tel" />
    </UFormGroup>
    
    <UButton type="submit">Submit</UButton>
  </UForm>
</template>
\`\`\`

### Server-side Validation
\`\`\`typescript
// server/api/customers.post.ts
import { z } from 'zod'

const customerSchema = z.object({
  name: z.string().min(3).max(50),
  email: z.string().email(),
  phone: z.string().regex(/^\\d{10,}$/).optional()
})

export default defineEventHandler(async (event) => {
  const body = await readBody(event)
  
  const validation = customerSchema.safeParse(body)
  
  if (!validation.success) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Invalid request body',
      data: validation.error.errors
    })
  }
  
  const data = validation.data
  
  // Process valid data...
  
  return { success: true, data }
})
\`\`\`

## Validation Helpers

### Safe Parse
\`\`\`typescript
const result = schema.safeParse(data)

if (result.success) {
  console.log('Valid:', result.data)
} else {
  console.error('Errors:', result.error.errors)
}
\`\`\`

### Parse with Error Handling
\`\`\`typescript
try {
  const validData = schema.parse(data)
  console.log('Valid:', validData)
} catch (error) {
  if (error instanceof z.ZodError) {
    console.error('Validation errors:', error.errors)
  }
}
\`\`\`

### Partial Schema
\`\`\`typescript
const createSchema = z.object({
  name: z.string(),
  email: z.string().email(),
  password: z.string().min(8)
})

// For updates, make all fields optional
const updateSchema = createSchema.partial()

// Or pick specific fields
const updateNameSchema = createSchema.pick({ name: true })
\`\`\`
`
}
