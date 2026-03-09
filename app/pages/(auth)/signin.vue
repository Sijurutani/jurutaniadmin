<script setup lang="ts">
import { z } from 'zod'
import type { AuthFormField, ButtonProps, FormSubmitEvent } from '@nuxt/ui'

definePageMeta({
  layout: 'auth'
})

const toast = useToast()
const authStore = useAuthStore()

const { loading } = storeToRefs(authStore)

const fields: AuthFormField[] = [{
  name: 'email',
  type: 'email',
  label: 'Email',
  placeholder: 'Enter your email',
  required: true
}, {
  name: 'password',
  label: 'Password',
  type: 'password',
  placeholder: 'Enter your password',
  required: true
}]

const providers: ButtonProps[] = [{
  label: 'Continue with Google',
  icon: 'i-logos-google-icon',
  color: 'neutral' as const,
  variant: 'outline' as const,
  onClick: handleGoogleSignIn
}]

const schema = z.object({
  email: z.email('Invalid email'),
  password: z.string().min(8, 'Must be at least 8 characters')
})

type Schema = z.output<typeof schema>

useHead({
  title: 'Sign In – Jurutani Admin'
})

async function onSubmit(event: FormSubmitEvent<Schema>) {
  const { error } = await authStore.signInWithEmail(event.data.email, event.data.password)
  if (error) {
    toast.add({
      title: 'Sign In Failed',
      description: error,
      color: 'error'
    })
  }
}

async function handleGoogleSignIn() {
  const { error } = await authStore.signInWithGoogle()
  if (error) {
    toast.add({
      title: 'Google Sign In Failed',
      description: error,
      color: 'error'
    })
  }
}
</script>

<template>
  <UAuthForm
    :schema="schema"
    :fields="fields"
    :providers="providers"
    :loading="loading"
    title="Welcome Back!"
    description="Sign in to access the Jurutani Admin Dashboard."
    icon="i-lucide-tractor"
    align="top"
    separator="or"
    @submit="onSubmit"
  >
    <template #password-hint>
      <UButton
        variant="link"
        color="neutral"
        label="Forgot password?"
        class="p-0"
        disabled
      />
    </template>
  </UAuthForm>
</template>
