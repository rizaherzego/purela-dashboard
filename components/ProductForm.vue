<script setup lang="ts">
const props = defineProps<{
  isOpen: boolean
  isEditing?: boolean
  initialData?: Partial<{
    sku: string
    product_name: string
    category: string | null
    unit_size: string | null
    weight_grams: number | null
    is_bundle: boolean
    is_active: boolean
    current_cogs: number | null
    current_packaging: number | null
  }>
}>()

const emit = defineEmits<{
  close: []
  saved: [data: any]
  deleted: [sku: string]
}>()

const { t } = useI18n()

const formData = ref<any>({
  sku: '',
  product_name: '',
  category: null,
  unit_size: null,
  weight_grams: null,
  is_bundle: false,
  is_active: true,
  current_cogs: null,
  current_packaging: null,
})

const loading = ref(false)
const error = ref<string | null>(null)
const deleting = ref(false)

watch(
  () => [props.isOpen, props.initialData],
  () => {
    if (props.isOpen) {
      if (props.initialData) {
        formData.value = { ...formData.value, ...props.initialData }
      } else {
        formData.value = {
          sku: '',
          product_name: '',
          category: null,
          unit_size: null,
          weight_grams: null,
          is_bundle: false,
          is_active: true,
          current_cogs: null,
          current_packaging: null,
        }
      }
      error.value = null
    }
  },
  { deep: true }
)

async function submit() {
  error.value = null
  if (!formData.value.sku || !formData.value.product_name) {
    error.value = t('forms.product.errSkuAndNameRequired')
    return
  }

  loading.value = true
  try {
    const data = props.isEditing
      ? await $fetch(`/api/reference/products/${props.initialData?.sku}`, {
          method: 'PATCH',
          body: formData.value,
        })
      : await $fetch('/api/reference/products', {
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
  if (!window.confirm(t('products.deleteConfirm', { name: formData.value.product_name, sku: formData.value.sku }))) return

  deleting.value = true
  try {
    await $fetch(`/api/reference/products/${formData.value.sku}`, {
      method: 'DELETE',
    })
    emit('deleted', formData.value.sku)
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
              <h2 class="display text-lg">{{ isEditing ? $t('forms.product.editTitle') : $t('forms.product.newTitle') }}</h2>
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
                <label class="block text-xs uppercase tracking-wider text-cream-500 font-medium mb-1.5">{{ $t('forms.product.sku') }}</label>
                <input
                  v-model="formData.sku"
                  type="text"
                  class="w-full px-3 py-2 bg-cream-50 border border-cream-200 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-clay-500 focus:border-clay-500"
                  :disabled="isEditing || loading"
                  uppercase
                />
              </div>

              <div>
                <label class="block text-xs uppercase tracking-wider text-cream-500 font-medium mb-1.5">{{ $t('forms.product.productName') }}</label>
                <input
                  v-model="formData.product_name"
                  type="text"
                  class="w-full px-3 py-2 bg-cream-50 border border-cream-200 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-clay-500 focus:border-clay-500"
                  :disabled="loading"
                />
              </div>

              <div>
                <label class="block text-xs uppercase tracking-wider text-cream-500 font-medium mb-1.5">{{ $t('forms.product.category') }}</label>
                <input
                  v-model="formData.category"
                  type="text"
                  class="w-full px-3 py-2 bg-cream-50 border border-cream-200 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-clay-500 focus:border-clay-500"
                  :placeholder="$t('forms.product.categoryPlaceholder')"
                  :disabled="loading"
                />
              </div>

              <div class="grid grid-cols-2 gap-3">
                <div>
                  <label class="block text-xs uppercase tracking-wider text-cream-500 font-medium mb-1.5">{{ $t('forms.product.unitSize') }}</label>
                  <input
                    v-model="formData.unit_size"
                    type="text"
                    class="w-full px-3 py-2 bg-cream-50 border border-cream-200 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-clay-500 focus:border-clay-500"
                    :placeholder="$t('forms.product.unitSizePlaceholder')"
                    :disabled="loading"
                  />
                </div>
                <div>
                  <label class="block text-xs uppercase tracking-wider text-cream-500 font-medium mb-1.5">{{ $t('forms.product.weight') }}</label>
                  <input
                    v-model.number="formData.weight_grams"
                    type="number"
                    class="w-full px-3 py-2 bg-cream-50 border border-cream-200 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-clay-500 focus:border-clay-500"
                    :disabled="loading"
                  />
                </div>
              </div>

              <div class="grid grid-cols-2 gap-3">
                <div>
                  <label class="block text-xs uppercase tracking-wider text-cream-500 font-medium mb-1.5">{{ $t('forms.product.cogs') }}</label>
                  <input
                    v-model.number="formData.current_cogs"
                    type="number"
                    class="w-full px-3 py-2 bg-cream-50 border border-cream-200 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-clay-500 focus:border-clay-500"
                    :disabled="loading"
                  />
                </div>
                <div>
                  <label class="block text-xs uppercase tracking-wider text-cream-500 font-medium mb-1.5">{{ $t('forms.product.packaging') }}</label>
                  <input
                    v-model.number="formData.current_packaging"
                    type="number"
                    class="w-full px-3 py-2 bg-cream-50 border border-cream-200 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-clay-500 focus:border-clay-500"
                    :disabled="loading"
                  />
                </div>
              </div>

              <div class="space-y-2 pt-2">
                <label class="flex items-center gap-2">
                  <input
                    v-model="formData.is_bundle"
                    type="checkbox"
                    class="w-4 h-4 rounded border-cream-200 text-clay-600 focus:ring-clay-500"
                    :disabled="loading"
                  />
                  <span class="text-sm text-cream-700">{{ $t('forms.product.isBundle') }}</span>
                </label>
                <label class="flex items-center gap-2">
                  <input
                    v-model="formData.is_active"
                    type="checkbox"
                    class="w-4 h-4 rounded border-cream-200 text-clay-600 focus:ring-clay-500"
                    :disabled="loading"
                  />
                  <span class="text-sm text-cream-700">{{ $t('forms.product.isActive') }}</span>
                </label>
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
