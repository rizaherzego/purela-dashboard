<script setup lang="ts">
defineProps<{
  isOpen: boolean
  isEditing?: boolean
  initialData?: {
    id?: number
    channel_id: string
    external_sku: string
    external_product_id?: string | null
    internal_sku: string | null
    override_cogs?: number | null
  }
}>()

const emit = defineEmits<{
  close: []
  saved: [data: any]
  deleted: [id: number]
}>()

const { data: channels } = await useFetch<{ channels: any[] }>('/api/channels')

const formData = ref<any>({
  channel_id: '',
  external_sku: '',
  internal_sku: null,
  override_cogs: null,
})

const loading = ref(false)
const error = ref<string | null>(null)
const deleting = ref(false)

watch(
  () => [props.isOpen, props.initialData],
  () => {
    if (props.isOpen) {
      if (props.initialData) {
        formData.value = {
          channel_id: props.initialData.channel_id,
          external_sku: props.initialData.external_sku,
          internal_sku: props.initialData.internal_sku,
          override_cogs: props.initialData.override_cogs ?? null,
        }
      } else {
        formData.value = {
          channel_id: '',
          external_sku: '',
          internal_sku: null,
          override_cogs: null,
        }
      }
      error.value = null
    }
  },
  { deep: true }
)

async function submit() {
  error.value = null
  if (!formData.value.channel_id || !formData.value.external_sku || !formData.value.internal_sku) {
    error.value = 'Channel, external SKU, and internal SKU are required.'
    return
  }

  loading.value = true
  try {
    const data = props.isEditing
      ? await $fetch(`/api/reference/sku-mappings/${props.initialData?.id}`, {
          method: 'PATCH',
          body: {
            internal_sku: formData.value.internal_sku,
            override_cogs: formData.value.override_cogs,
          },
        })
      : await $fetch('/api/reference/sku-mappings', {
          method: 'POST',
          body: formData.value,
        })

    emit('saved', data)
    emit('close')
  } catch (e: any) {
    error.value = e?.statusMessage || e?.message || 'Save failed.'
  } finally {
    loading.value = false
  }
}

async function remove() {
  if (!window.confirm(`Delete mapping for ${formData.value.external_sku}?`)) return

  deleting.value = true
  try {
    await $fetch(`/api/reference/sku-mappings/${props.initialData?.id}`, {
      method: 'DELETE',
    })
    emit('deleted', props.initialData?.id)
    emit('close')
  } catch (e: any) {
    error.value = e?.statusMessage || e?.message || 'Delete failed.'
  } finally {
    deleting.value = false
  }
}
</script>

<template>
  <Teleport to="body">
    <Transition name="modal-overlay">
      <div v-if="isOpen" class="fixed inset-0 z-50 flex items-center justify-center bg-black/20">
        <Transition name="modal-content">
          <div class="bg-white rounded-lg shadow-lg max-w-md w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div class="sticky top-0 bg-white border-b border-cream-200 px-6 py-4 flex items-center justify-between">
              <h2 class="display text-lg">{{ isEditing ? 'Edit mapping' : 'New mapping' }}</h2>
              <button
                type="button"
                class="text-cream-400 hover:text-cream-600"
                @click="emit('close')"
              >
                <Icon name="lucide:x" class="size-5" />
              </button>
            </div>

            <form class="p-6 space-y-4" @submit.prevent="submit">
              <div>
                <label class="block text-xs uppercase tracking-wider text-cream-500 font-medium mb-1.5">Channel</label>
                <select
                  v-model="formData.channel_id"
                  class="w-full px-3 py-2 bg-cream-50 border border-cream-200 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-clay-500 focus:border-clay-500"
                  :disabled="isEditing || loading"
                >
                  <option value="">— Select channel —</option>
                  <option v-for="ch in channels?.channels" :key="ch.channel_id" :value="ch.channel_id">
                    {{ ch.channel_name }}
                  </option>
                </select>
              </div>

              <div>
                <label class="block text-xs uppercase tracking-wider text-cream-500 font-medium mb-1.5">External SKU</label>
                <input
                  v-model="formData.external_sku"
                  type="text"
                  class="w-full px-3 py-2 bg-cream-50 border border-cream-200 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-clay-500 focus:border-clay-500"
                  :disabled="isEditing || loading"
                  uppercase
                />
              </div>

              <div>
                <label class="block text-xs uppercase tracking-wider text-cream-500 font-medium mb-1.5">Internal SKU</label>
                <input
                  v-model="formData.internal_sku"
                  type="text"
                  class="w-full px-3 py-2 bg-cream-50 border border-cream-200 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-clay-500 focus:border-clay-500"
                  placeholder="e.g. SKU-001"
                  :disabled="loading"
                  uppercase
                />
              </div>

              <div>
                <label class="block text-xs uppercase tracking-wider text-cream-500 font-medium mb-1.5">Override COGS (optional)</label>
                <input
                  v-model.number="formData.override_cogs"
                  type="number"
                  class="w-full px-3 py-2 bg-cream-50 border border-cream-200 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-clay-500 focus:border-clay-500"
                  placeholder="Leave blank to use product COGS"
                  :disabled="loading"
                />
              </div>

              <p v-if="error" class="text-sm text-clay-700">{{ error }}</p>

              <div class="flex gap-3 pt-4">
                <button
                  v-if="isEditing"
                  type="button"
                  class="px-3 py-2 text-sm border border-clay-200 text-clay-700 hover:bg-clay-50 rounded-md font-medium transition"
                  :disabled="loading || deleting"
                  @click="remove"
                >
                  {{ deleting ? 'Deleting…' : 'Delete' }}
                </button>
                <div class="flex-1" />
                <button
                  type="button"
                  class="px-3 py-2 text-sm border border-cream-200 text-cream-700 hover:bg-cream-100 rounded-md font-medium transition"
                  :disabled="loading"
                  @click="emit('close')"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  class="px-3 py-2 text-sm bg-clay-500 hover:bg-clay-600 disabled:bg-clay-300 text-white rounded-md font-medium transition"
                  :disabled="loading"
                >
                  {{ loading ? 'Saving…' : 'Save' }}
                </button>
              </div>
            </form>
          </div>
        </Transition>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.modal-overlay-enter-active,
.modal-overlay-leave-active {
  transition: opacity 0.2s ease;
}
.modal-overlay-enter-from,
.modal-overlay-leave-to {
  opacity: 0;
}

.modal-content-enter-active,
.modal-content-leave-active {
  transition: transform 0.2s ease, opacity 0.2s ease;
}
.modal-content-enter-from,
.modal-content-leave-to {
  transform: scale(0.95);
  opacity: 0;
}
</style>
