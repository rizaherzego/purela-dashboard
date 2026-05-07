<script setup lang="ts">
definePageMeta({ layout: 'login' })

const password = ref('')
const error = ref<string | null>(null)
const loading = ref(false)

async function submit() {
  if (loading.value) return
  loading.value = true
  error.value = null
  try {
    await $fetch('/api/auth/login', {
      method: 'POST',
      body: { password: password.value },
    })
    await navigateTo('/')
  }
  catch (e: any) {
    if (e?.statusCode === 429)      error.value = 'Too many failed attempts. Try again later.'
    else if (e?.statusCode === 401) error.value = 'Incorrect password.'
    else                            error.value = e?.statusMessage || 'Sign-in failed.'
  }
  finally {
    loading.value = false
  }
}
</script>

<template>
  <div class="min-h-screen flex items-center justify-center bg-cream-50 px-4">
    <div class="w-full max-w-sm">
      <div class="text-center mb-10">
        <h1 class="display text-3xl">Purela</h1>
        <p class="mt-2 text-sm text-cream-500">Internal dashboard</p>
      </div>

      <form
        class="bg-white border border-cream-200 rounded-lg p-7 space-y-5 shadow-card"
        @submit.prevent="submit"
      >
        <div>
          <label class="block text-xs uppercase tracking-wider text-cream-500 font-medium mb-2" for="pw">
            Shared password
          </label>
          <input
            id="pw"
            v-model="password"
            type="password"
            autocomplete="current-password"
            class="w-full px-3.5 py-2.5 bg-cream-50 border border-cream-200 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-clay-500 focus:border-clay-500 transition"
            :disabled="loading"
            autofocus
          >
        </div>

        <p v-if="error" class="text-sm text-clay-700">{{ error }}</p>

        <button
          type="submit"
          class="w-full px-4 py-2.5 bg-clay-500 hover:bg-clay-600 disabled:bg-clay-300 text-white rounded-md text-sm font-medium transition-colors"
          :disabled="loading || !password"
        >
          {{ loading ? 'Signing in…' : 'Sign in' }}
        </button>
      </form>

      <p class="mt-6 text-center text-xs text-cream-400">
        For Purela team members only.
      </p>
    </div>
  </div>
</template>
