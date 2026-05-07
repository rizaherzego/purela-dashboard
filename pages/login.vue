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
    if (e?.statusCode === 429) {
      error.value = 'Too many failed attempts. Try again later.'
    }
    else if (e?.statusCode === 401) {
      error.value = 'Incorrect password.'
    }
    else {
      error.value = e?.statusMessage || 'Sign-in failed.'
    }
  }
  finally {
    loading.value = false
  }
}
</script>

<template>
  <div class="min-h-screen flex items-center justify-center bg-gray-50 px-4">
    <div class="w-full max-w-sm">
      <div class="text-center mb-8">
        <h1 class="text-2xl font-bold text-gray-900">Purela</h1>
        <p class="mt-1 text-sm text-gray-500">Internal dashboard</p>
      </div>

      <form
        class="bg-white rounded-xl border border-gray-200 p-6 space-y-4 shadow-sm"
        @submit.prevent="submit"
      >
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1.5" for="pw">
            Shared password
          </label>
          <input
            id="pw"
            v-model="password"
            type="password"
            autocomplete="current-password"
            class="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
            :disabled="loading"
            autofocus
          >
        </div>

        <p v-if="error" class="text-sm text-red-600">{{ error }}</p>

        <button
          type="submit"
          class="w-full px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-300 text-white rounded-lg text-sm font-medium transition-colors"
          :disabled="loading || !password"
        >
          {{ loading ? 'Signing in…' : 'Sign in' }}
        </button>
      </form>

      <p class="mt-4 text-center text-xs text-gray-400">
        For Purela team members only.
      </p>
    </div>
  </div>
</template>
