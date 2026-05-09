<script setup lang="ts">
const props = defineProps<{
  isOpen: boolean
  isEditing?: boolean
  initialData?: {
    bundle_sku: string
    bundle_name: string
    notes: string | null
    components: { component_sku: string; quantity: number }[]
  }
}>()

const emit = defineEmits<{
  close: []
  saved: [data: any]
  deleted: [sku: string]
}>()

const { t } = useI18n()

const formData = ref<any>({
  bundle_sku: '',
  bundle_name: '',
  notes: null,
  components: [],
})

const newComponentSku = ref('')
const newComponentQty = ref(1)

const loading = ref(false)
const error = ref<string | null>(null)
const deleting = ref(false)

watch(
  () => [props.isOpen, props.initialData],
  () => {
    if (props.isOpen) {
      if (props.initialData) {
        formData.value = JSON.parse(JSON.stringify(props.initialData))
      } else {
        formData.value = {
          bundle_sku: '',
          bundle_name: '',
          notes: null,
          components: [],
        }
      }
      newComponentSku.value = ''
      newComponentQty.value = 1
      error.value = null
    }
  },
  { deep: true }
)

function addComponent() {
  if (!newComponentSku.value.trim()) {
    error.value = t('forms.bundle.errComponentSkuRequired')
    return
  }

  const sku = newComponentSku.value.trim().toUpperCase()
  if (formData.value.components.some((c: any) => c.component_sku === sku)) {
    error.value = t('forms.bundle.errAlreadyAdded', { sku })
    return
  }

  formData.value.components.push({
    component_sku: sku,
    quantity: newComponentQty.value || 1,
  })
  newComponentSku.value = ''
  newComponentQty.value = 1
  error.value = null
}

function removeComponent(idx: number) {
  formData.value.components.splice(idx, 1)
}

async function submit() {
  error.value = null
  if (!formData.value.bundle_sku || !formData.value.bundle_name) {
    error.value = t('forms.bundle.errSkuAndNameRequired')
    return
  }

  if (formData.value.components.length === 0) {
    error.value = t('forms.bundle.errAtLeastOneComponent')
    return
  }

  loading.value = true
  try {
    const data = props.isEditing
      ? await $fetch(`/api/reference/bundles/${props.initialData?.bundle_sku}`, {
          method: 'PATCH',
          body: formData.value,
        })
      : await $fetch('/api/reference/bundles', {
          method: 'POST',
          body: formData.value,
        })

    emit('saved', data)
    emit('close')
  } catch (e: any) {
    error.value = e?.statusMessage || e?.message || t('errors.saveFailed')
  } finally {
    loading.value = false
  }
}

async function remove() {
  if (!window.confirm(t('bundles.deleteConfirm', { name: formData.value.bundle_name, sku: formData.value.bundle_sku }))) return

  deleting.value = true
  try {
    await $fetch(`/api/reference/bundles/${formData.value.bundle_sku}`, {
      method: 'DELETE',
    })
    emit('deleted', formData.value.bundle_sku)
    emit('close')
  } catch (e: any) {
    error.value = e?.statusMessage || e?.message || t('errors.deleteFailed')
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
              <h2 class="display text-lg">{{ isEditing ? $t('forms.bundle.editTitle') : $t('forms.bundle.newTitle') }}</h2>
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
                <label class="block text-xs uppercase tracking-wider text-cream-500 font-medium mb-1.5">{{ $t('forms.bundle.bundleSku') }}</label>
                <input
                  v-model="formData.bundle_sku"
                  type="text"
                  class="w-full px-3 py-2 bg-cream-50 border border-cream-200 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-clay-500 focus:border-clay-500"
                  :disabled="isEditing || loading"
                  uppercase
                />
              </div>

              <div>
                <label class="block text-xs uppercase tracking-wider text-cream-500 font-medium mb-1.5">{{ $t('forms.bundle.bundleName') }}</label>
                <input
                  v-model="formData.bundle_name"
                  type="text"
                  class="w-full px-3 py-2 bg-cream-50 border border-cream-200 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-clay-500 focus:border-clay-500"
                  :disabled="loading"
                />
              </div>

              <div>
                <label class="block text-xs uppercase tracking-wider text-cream-500 font-medium mb-1.5">{{ $t('forms.bundle.notes') }}</label>
                <textarea
                  v-model="formData.notes"
                  class="w-full px-3 py-2 bg-cream-50 border border-cream-200 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-clay-500 focus:border-clay-500 resize-none"
                  rows="2"
                  :disabled="loading"
                />
              </div>

              <div class="space-y-2 pt-2">
                <label class="block text-xs uppercase tracking-wider text-cream-500 font-medium">{{ $t('forms.bundle.components') }}</label>
                <div class="space-y-2 max-h-32 overflow-y-auto">
                  <div
                    v-for="(comp, idx) in formData.components"
                    :key="idx"
                    class="flex items-center gap-2 bg-cream-50 p-2 rounded"
                  >
                    <span class="text-xs font-mono text-cream-700 flex-1">{{ comp.component_sku }}</span>
                    <span class="text-xs text-cream-500">×{{ comp.quantity }}</span>
                    <button
                      type="button"
                      class="p-1 hover:bg-cream-200 rounded text-cream-500 hover:text-cream-700"
                      :disabled="loading"
                      @click="removeComponent(idx)"
                    >
                      <Icon name="lucide:x" class="size-3" />
                    </button>
                  </div>
                </div>

                <div class="flex gap-2 pt-2">
                  <input
                    v-model="newComponentSku"
                    type="text"
                    :placeholder="$t('forms.bundle.componentSkuPlaceholder')"
                    class="flex-1 px-2 py-1.5 bg-cream-50 border border-cream-200 rounded text-xs focus:outline-none focus:ring-1 focus:ring-clay-500"
                    :disabled="loading"
                    uppercase
                    @keyup.enter="addComponent"
                  />
                  <input
                    v-model.number="newComponentQty"
                    type="number"
                    :placeholder="$t('forms.bundle.qty')"
                    min="1"
                    class="w-12 px-2 py-1.5 bg-cream-50 border border-cream-200 rounded text-xs focus:outline-none focus:ring-1 focus:ring-clay-500"
                    :disabled="loading"
                  />
                  <button
                    type="button"
                    class="px-2 py-1.5 text-xs bg-clay-100 hover:bg-clay-200 text-clay-700 rounded font-medium"
                    :disabled="loading"
                    @click="addComponent"
                  >
                    {{ $t('forms.bundle.addBtn') }}
                  </button>
                </div>
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
                  {{ deleting ? $t('common.deleting') : $t('common.delete') }}
                </button>
                <div class="flex-1" />
                <button
                  type="button"
                  class="px-3 py-2 text-sm border border-cream-200 text-cream-700 hover:bg-cream-100 rounded-md font-medium transition"
                  :disabled="loading"
                  @click="emit('close')"
                >
                  {{ $t('common.cancel') }}
                </button>
                <button
                  type="submit"
                  class="px-3 py-2 text-sm bg-clay-500 hover:bg-clay-600 disabled:bg-clay-300 text-white rounded-md font-medium transition"
                  :disabled="loading"
                >
                  {{ loading ? $t('common.saving') : $t('common.save') }}
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
