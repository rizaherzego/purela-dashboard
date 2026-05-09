<script setup lang="ts">
definePageMeta({ titleKey: 'howItWorks.title' })
</script>

<template>
  <div class="space-y-10 max-w-4xl">
    <section class="bg-white border border-cream-200 rounded-lg p-7 shadow-card space-y-4">
      <h2 class="display text-xl">{{ $t('howItWorks.bigPictureTitle') }}</h2>
      <p class="text-sm text-cream-700 leading-relaxed">
        <i18n-t keypath="howItWorks.bigPicturePara1" tag="span">
          <template #bold>
            <strong>{{ $t('howItWorks.bigPictureBold') }}</strong>
          </template>
        </i18n-t>
      </p>
      <p class="text-sm text-cream-700 leading-relaxed">
        <i18n-t keypath="howItWorks.bigPicturePara2" tag="span">
          <template #bold>
            <strong>{{ $t('howItWorks.bigPictureSliceBold') }}</strong>
          </template>
        </i18n-t>
      </p>
    </section>

    <section class="space-y-5">
      <h2 class="display text-xl">{{ $t('howItWorks.stepsTitle') }}</h2>

      <div class="bg-white border border-cream-200 rounded-lg p-7 shadow-card">
        <div class="flex items-start gap-5">
          <div class="size-10 rounded-full bg-clay-100 text-clay-700 flex items-center justify-center display text-base shrink-0">
            1
          </div>
          <div class="flex-1 space-y-3">
            <h3 class="display text-base">{{ $t('howItWorks.step1Title') }} <span class="text-xs uppercase tracking-wider text-cream-500 ml-2">{{ $t('howItWorks.step1Tag') }}</span></h3>
            <p class="text-sm text-cream-700 leading-relaxed">
              {{ $t('howItWorks.step1Para1Pre') }}
              <span class="font-mono text-xs bg-cream-100 px-1.5 py-0.5 rounded">SKU Purela.xlsx</span>
              {{ $t('howItWorks.step1Para1Mid') }}
              <NuxtLink to="/admin/import-skus" class="text-clay-600 hover:text-clay-700 underline underline-offset-2">{{ $t('howItWorks.step1Para1Link') }}</NuxtLink>
              {{ $t('howItWorks.step1Para1Post') }}
            </p>
            <ul class="text-sm text-cream-700 list-disc list-inside space-y-1 ml-2">
              <li>
                <i18n-t keypath="howItWorks.step1L1" tag="span">
                  <template #code>
                    <span class="font-mono text-xs">PUR-SBC-70</span>
                  </template>
                </i18n-t>
              </li>
              <li>
                <i18n-t keypath="howItWorks.step1L2" tag="span">
                  <template #code>
                    <span class="font-mono text-xs">product_costs</span>
                  </template>
                </i18n-t>
              </li>
              <li>{{ $t('howItWorks.step1L3') }}</li>
              <li>{{ $t('howItWorks.step1L4') }}</li>
            </ul>
            <p class="text-sm text-cream-700 leading-relaxed">
              {{ $t('howItWorks.step1Para2') }}
            </p>
          </div>
        </div>
      </div>

      <div class="bg-white border border-cream-200 rounded-lg p-7 shadow-card">
        <div class="flex items-start gap-5">
          <div class="size-10 rounded-full bg-clay-100 text-clay-700 flex items-center justify-center display text-base shrink-0">
            2
          </div>
          <div class="flex-1 space-y-3">
            <h3 class="display text-base">{{ $t('howItWorks.step2Title') }} <span class="text-xs uppercase tracking-wider text-cream-500 ml-2">{{ $t('howItWorks.step2Tag') }}</span></h3>
            <p class="text-sm text-cream-700 leading-relaxed">
              {{ $t('howItWorks.step2Para1Pre') }} <NuxtLink to="/upload" class="text-clay-600 hover:text-clay-700 underline underline-offset-2">{{ $t('howItWorks.step2Para1Link') }}</NuxtLink>
              {{ $t('howItWorks.step2Para1Post') }}
            </p>
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-3">
              <div class="text-xs bg-cream-50 border border-cream-200 rounded p-2.5">
                <div class="font-medium text-cream-800">{{ $t('howItWorks.step2Files.incomeTitle') }}</div>
                <div class="text-cream-500 mt-0.5">{{ $t('howItWorks.step2Files.incomeDesc') }}</div>
              </div>
              <div class="text-xs bg-cream-50 border border-cream-200 rounded p-2.5">
                <div class="font-medium text-cream-800">{{ $t('howItWorks.step2Files.ordersTitle') }}</div>
                <div class="text-cream-500 mt-0.5">{{ $t('howItWorks.step2Files.ordersDesc') }}</div>
              </div>
              <div class="text-xs bg-cream-50 border border-cream-200 rounded p-2.5">
                <div class="font-medium text-cream-800">{{ $t('howItWorks.step2Files.returnsTitle') }}</div>
                <div class="text-cream-500 mt-0.5">{{ $t('howItWorks.step2Files.returnsDesc') }}</div>
              </div>
              <div class="text-xs bg-cream-50 border border-cream-200 rounded p-2.5">
                <div class="font-medium text-cream-800">{{ $t('howItWorks.step2Files.affiliateTitle') }}</div>
                <div class="text-cream-500 mt-0.5">{{ $t('howItWorks.step2Files.affiliateDesc') }}</div>
              </div>
              <div class="text-xs bg-cream-50 border border-cream-200 rounded p-2.5 sm:col-span-2">
                <div class="font-medium text-cream-800">{{ $t('howItWorks.step2Files.adsTitle') }}</div>
                <div class="text-cream-500 mt-0.5">{{ $t('howItWorks.step2Files.adsDesc') }}</div>
              </div>
            </div>
            <p class="text-sm text-cream-700 leading-relaxed">
              {{ $t('howItWorks.step2Para2') }}
            </p>
          </div>
        </div>
      </div>

      <div class="bg-white border border-cream-200 rounded-lg p-7 shadow-card">
        <div class="flex items-start gap-5">
          <div class="size-10 rounded-full bg-clay-100 text-clay-700 flex items-center justify-center display text-base shrink-0">
            3
          </div>
          <div class="flex-1 space-y-3">
            <h3 class="display text-base">{{ $t('howItWorks.step3Title') }} <span class="text-xs uppercase tracking-wider text-cream-500 ml-2">{{ $t('howItWorks.step3Tag') }}</span></h3>
            <p class="text-sm text-cream-700 leading-relaxed">
              <i18n-t keypath="howItWorks.step3Para1" tag="span">
                <template #code1><span class="font-mono text-xs">PURCG-100</span></template>
                <template #code2><span class="font-mono text-xs">PUR-CG-100</span></template>
                <template #code3><span class="font-mono text-xs">PUR-BL-185 PUR-SC-70</span></template>
              </i18n-t>
            </p>
            <p class="text-sm text-cream-700 leading-relaxed">
              {{ $t('howItWorks.step3Para2Pre') }} <NuxtLink to="/sku-mapping" class="text-clay-600 hover:text-clay-700 underline underline-offset-2">{{ $t('howItWorks.step3Para2Link') }}</NuxtLink>
              <i18n-t keypath="howItWorks.step3Para2Post" tag="span">
                <template #bold><strong>{{ $t('howItWorks.step3SuggestBold') }}</strong></template>
              </i18n-t>
            </p>
            <p class="text-sm text-cream-700 leading-relaxed">
              <i18n-t keypath="howItWorks.step3Para3" tag="span">
                <template #code><span class="font-mono text-xs">sku=NULL</span></template>
                <template #link>
                  <NuxtLink to="/data-quality" class="text-clay-600 hover:text-clay-700 underline underline-offset-2">{{ $t('nav.dataQuality') }}</NuxtLink>
                </template>
              </i18n-t>
            </p>
          </div>
        </div>
      </div>

      <div class="bg-white border border-cream-200 rounded-lg p-7 shadow-card">
        <div class="flex items-start gap-5">
          <div class="size-10 rounded-full bg-clay-100 text-clay-700 flex items-center justify-center display text-base shrink-0">
            4
          </div>
          <div class="flex-1 space-y-3">
            <h3 class="display text-base">{{ $t('howItWorks.step4Title') }} <span class="text-xs uppercase tracking-wider text-cream-500 ml-2">{{ $t('howItWorks.step4Tag') }}</span></h3>
            <p class="text-sm text-cream-700 leading-relaxed">
              <i18n-t keypath="howItWorks.step4Para1" tag="span">
                <template #bold1><strong>{{ $t('howItWorks.step4ReferenceBold') }}</strong></template>
                <template #bold2><strong>{{ $t('howItWorks.step4RerunBold') }}</strong></template>
                <template #code><span class="font-mono text-xs">fact_orders</span></template>
              </i18n-t>
            </p>
            <p class="text-sm text-cream-700 leading-relaxed">
              {{ $t('howItWorks.step4Para2') }}
            </p>
          </div>
        </div>
      </div>
    </section>

    <section class="bg-white border border-cream-200 rounded-lg p-7 shadow-card space-y-4">
      <h2 class="display text-xl">{{ $t('howItWorks.behindTitle') }}</h2>
      <p class="text-sm text-cream-700 leading-relaxed">
        {{ $t('howItWorks.behindIntro') }}
      </p>
      <ol class="text-sm text-cream-700 space-y-3 ml-2">
        <li>
          <span class="font-medium text-cream-900">{{ $t('howItWorks.behindStep1Bold') }}</span>
          {{ $t('howItWorks.behindStep1Body') }}
        </li>
        <li>
          <span class="font-medium text-cream-900">{{ $t('howItWorks.behindStep2Bold') }}</span>
          <i18n-t keypath="howItWorks.behindStep2Body" tag="span">
            <template #code1><span class="font-mono text-xs">raw_tiktok_orders</span></template>
            <template #code2><span class="font-mono text-xs">raw_tiktok_settlements</span></template>
            <template #code3><span class="font-mono text-xs">import_batches</span></template>
          </i18n-t>
        </li>
        <li>
          <span class="font-medium text-cream-900">{{ $t('howItWorks.behindStep3Bold') }}</span>
          <i18n-t keypath="howItWorks.behindStep3Body" tag="span">
            <template #code><span class="font-mono text-xs">fact_orders</span></template>
          </i18n-t>
        </li>
        <li>
          <span class="font-medium text-cream-900">{{ $t('howItWorks.behindStep4Bold') }}</span>
          <i18n-t keypath="howItWorks.behindStep4Body" tag="span">
            <template #code><span class="font-mono text-xs">fact_orders</span></template>
          </i18n-t>
        </li>
      </ol>
      <p class="text-sm text-cream-500 leading-relaxed pt-2 border-t border-cream-200">
        <i18n-t keypath="howItWorks.behindFootnote" tag="span">
          <template #path><span class="font-mono text-xs">imports/{batch_id}/</span></template>
        </i18n-t>
      </p>
    </section>

    <section class="space-y-4">
      <h2 class="display text-xl">{{ $t('howItWorks.whereTitle') }}</h2>
      <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <NuxtLink
          to="/"
          class="bg-white border border-cream-200 rounded-lg p-5 shadow-card hover:border-clay-300 hover:shadow-lg transition"
        >
          <div class="flex items-center gap-2 mb-2">
            <Icon name="lucide:layout-dashboard" class="size-4 text-clay-600" />
            <h3 class="display text-base">{{ $t('howItWorks.tiles.overviewTitle') }}</h3>
          </div>
          <p class="text-xs text-cream-600 leading-relaxed">
            {{ $t('howItWorks.tiles.overviewDesc') }}
          </p>
        </NuxtLink>
        <NuxtLink
          to="/channel/tiktok"
          class="bg-white border border-cream-200 rounded-lg p-5 shadow-card hover:border-clay-300 hover:shadow-lg transition"
        >
          <div class="flex items-center gap-2 mb-2">
            <Icon name="lucide:store" class="size-4 text-clay-600" />
            <h3 class="display text-base">{{ $t('howItWorks.tiles.channelsTitle') }}</h3>
          </div>
          <p class="text-xs text-cream-600 leading-relaxed">
            {{ $t('howItWorks.tiles.channelsDesc') }}
          </p>
        </NuxtLink>
        <NuxtLink
          to="/sku"
          class="bg-white border border-cream-200 rounded-lg p-5 shadow-card hover:border-clay-300 hover:shadow-lg transition"
        >
          <div class="flex items-center gap-2 mb-2">
            <Icon name="lucide:package" class="size-4 text-clay-600" />
            <h3 class="display text-base">{{ $t('howItWorks.tiles.skusTitle') }}</h3>
          </div>
          <p class="text-xs text-cream-600 leading-relaxed">
            {{ $t('howItWorks.tiles.skusDesc') }}
          </p>
        </NuxtLink>
        <NuxtLink
          to="/flow"
          class="bg-white border border-cream-200 rounded-lg p-5 shadow-card hover:border-clay-300 hover:shadow-lg transition"
        >
          <div class="flex items-center gap-2 mb-2">
            <Icon name="lucide:git-branch" class="size-4 text-clay-600" />
            <h3 class="display text-base">{{ $t('howItWorks.tiles.flowTitle') }}</h3>
          </div>
          <p class="text-xs text-cream-600 leading-relaxed">
            {{ $t('howItWorks.tiles.flowDesc') }}
          </p>
        </NuxtLink>
        <NuxtLink
          to="/data-quality"
          class="bg-white border border-cream-200 rounded-lg p-5 shadow-card hover:border-clay-300 hover:shadow-lg transition"
        >
          <div class="flex items-center gap-2 mb-2">
            <Icon name="lucide:shield-alert" class="size-4 text-clay-600" />
            <h3 class="display text-base">{{ $t('howItWorks.tiles.dqTitle') }}</h3>
          </div>
          <p class="text-xs text-cream-600 leading-relaxed">
            {{ $t('howItWorks.tiles.dqDesc') }}
          </p>
        </NuxtLink>
        <NuxtLink
          to="/imports"
          class="bg-white border border-cream-200 rounded-lg p-5 shadow-card hover:border-clay-300 hover:shadow-lg transition"
        >
          <div class="flex items-center gap-2 mb-2">
            <Icon name="lucide:history" class="size-4 text-clay-600" />
            <h3 class="display text-base">{{ $t('howItWorks.tiles.importsTitle') }}</h3>
          </div>
          <p class="text-xs text-cream-600 leading-relaxed">
            {{ $t('howItWorks.tiles.importsDesc') }}
          </p>
        </NuxtLink>
      </div>
    </section>

    <section class="bg-white border border-cream-200 rounded-lg p-7 shadow-card space-y-4">
      <h2 class="display text-xl">{{ $t('howItWorks.workflowsTitle') }}</h2>

      <div class="space-y-4 text-sm">
        <div class="border-l-2 border-clay-200 pl-4">
          <p class="font-medium text-cream-900 mb-1">{{ $t('howItWorks.wf1Q') }}</p>
          <p class="text-cream-600 leading-relaxed">
            <i18n-t keypath="howItWorks.wf1A" tag="span">
              <template #uploadLink>
                <NuxtLink to="/upload" class="text-clay-600 hover:text-clay-700 underline underline-offset-2">{{ $t('nav.upload') }}</NuxtLink>
              </template>
              <template #overviewLink>
                <NuxtLink to="/" class="text-clay-600 hover:text-clay-700 underline underline-offset-2">{{ $t('nav.overview') }}</NuxtLink>
              </template>
              <template #skusLink>
                <NuxtLink to="/sku" class="text-clay-600 hover:text-clay-700 underline underline-offset-2">{{ $t('nav.skus') }}</NuxtLink>
              </template>
              <template #dqLink>
                <NuxtLink to="/data-quality" class="text-clay-600 hover:text-clay-700 underline underline-offset-2">{{ $t('nav.dataQuality') }}</NuxtLink>
              </template>
            </i18n-t>
          </p>
        </div>

        <div class="border-l-2 border-clay-200 pl-4">
          <p class="font-medium text-cream-900 mb-1">{{ $t('howItWorks.wf2Q') }}</p>
          <p class="text-cream-600 leading-relaxed">
            <i18n-t keypath="howItWorks.wf2A" tag="span">
              <template #masterLink>
                <NuxtLink to="/admin/import-skus" class="text-clay-600 hover:text-clay-700 underline underline-offset-2">{{ $t('adminImportSkus.uploadHeader') }}</NuxtLink>
              </template>
              <template #bold><strong>{{ $t('howItWorks.step4RerunBold') }}</strong></template>
              <template #mapLink>
                <NuxtLink to="/sku-mapping" class="text-clay-600 hover:text-clay-700 underline underline-offset-2">{{ $t('nav.skuMapping') }}</NuxtLink>
              </template>
            </i18n-t>
          </p>
        </div>

        <div class="border-l-2 border-clay-200 pl-4">
          <p class="font-medium text-cream-900 mb-1">{{ $t('howItWorks.wf3Q') }}</p>
          <p class="text-cream-600 leading-relaxed">
            <i18n-t keypath="howItWorks.wf3A" tag="span">
              <template #mapLink>
                <NuxtLink to="/sku-mapping" class="text-clay-600 hover:text-clay-700 underline underline-offset-2">{{ $t('nav.skuMapping') }}</NuxtLink>
              </template>
              <template #suggestBold><strong>{{ $t('howItWorks.step3SuggestBold') }}</strong></template>
              <template #rerunBold><strong>{{ $t('howItWorks.step4RerunBold') }}</strong></template>
            </i18n-t>
          </p>
        </div>

        <div class="border-l-2 border-clay-200 pl-4">
          <p class="font-medium text-cream-900 mb-1">{{ $t('howItWorks.wf4Q') }}</p>
          <p class="text-cream-600 leading-relaxed">
            <i18n-t keypath="howItWorks.wf4A" tag="span">
              <template #importsLink>
                <NuxtLink to="/imports" class="text-clay-600 hover:text-clay-700 underline underline-offset-2">{{ $t('imports.title') }}</NuxtLink>
              </template>
            </i18n-t>
          </p>
        </div>
      </div>
    </section>

    <section class="bg-white border border-cream-200 rounded-lg p-7 shadow-card space-y-4">
      <h2 class="display text-xl">{{ $t('howItWorks.glossaryTitle') }}</h2>
      <dl class="grid grid-cols-1 md:grid-cols-[max-content_1fr] gap-x-6 gap-y-3 text-sm">
        <dt class="font-mono text-xs text-cream-700 self-center">GMV</dt>
        <dd class="text-cream-600 leading-relaxed">{{ $t('howItWorks.glossary.gmv') }}</dd>

        <dt class="font-mono text-xs text-cream-700 self-center">HPP / COGS</dt>
        <dd class="text-cream-600 leading-relaxed">{{ $t('howItWorks.glossary.hpp') }}</dd>

        <dt class="font-mono text-xs text-cream-700 self-center">Take rate</dt>
        <dd class="text-cream-600 leading-relaxed">{{ $t('howItWorks.glossary.takeRate') }}</dd>

        <dt class="font-mono text-xs text-cream-700 self-center">Net settlement</dt>
        <dd class="text-cream-600 leading-relaxed">{{ $t('howItWorks.glossary.netSettlement') }}</dd>

        <dt class="font-mono text-xs text-cream-700 self-center">Contribution margin</dt>
        <dd class="text-cream-600 leading-relaxed">{{ $t('howItWorks.glossary.cm') }}</dd>

        <dt class="font-mono text-xs text-cream-700 self-center">Bundle</dt>
        <dd class="text-cream-600 leading-relaxed">{{ $t('howItWorks.glossary.bundle') }}</dd>

        <dt class="font-mono text-xs text-cream-700 self-center">External / internal SKU</dt>
        <dd class="text-cream-600 leading-relaxed">{{ $t('howItWorks.glossary.extInt') }}</dd>

        <dt class="font-mono text-xs text-cream-700 self-center">Fact / raw layer</dt>
        <dd class="text-cream-600 leading-relaxed">{{ $t('howItWorks.glossary.factRaw') }}</dd>
      </dl>
    </section>
  </div>
</template>
