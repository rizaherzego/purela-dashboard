<script setup lang="ts">
definePageMeta({ layout: 'login' })

const { t } = useI18n()
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
    if (e?.statusCode === 429)      error.value = t('auth.tooManyAttempts')
    else if (e?.statusCode === 401) error.value = t('auth.incorrectPassword')
    else                            error.value = e?.statusMessage || t('auth.signInFailed')
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
        <h1 class="display text-3xl">{{ $t('auth.title') }}</h1>
        <p class="mt-2 text-sm text-cream-500">{{ $t('auth.subtitle') }}</p>
      </div>

      <form
        class="bg-white border border-cream-200 rounded-lg p-7 space-y-5 shadow-card"
        @submit.prevent="submit"
      >
        <div>
          <label class="block text-xs uppercase tracking-wider text-cream-500 font-medium mb-2" for="pw">
            {{ $t('auth.sharedPassword') }}
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
          {{ loading ? $t('auth.signingIn') : $t('auth.signIn') }}
        </button>
      </form>

      <p class="mt-6 text-center text-xs text-cream-400">
        {{ $t('auth.teamOnly') }}
      </p>
    </div>
  </div>
</template>
