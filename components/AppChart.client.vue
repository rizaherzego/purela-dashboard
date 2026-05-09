<script setup lang="ts">
import { use } from 'echarts/core'
import { CanvasRenderer } from 'echarts/renderers'
import { LineChart, BarChart, SankeyChart } from 'echarts/charts'
import {
  GridComponent,
  TooltipComponent,
  LegendComponent,
  MarkLineComponent,
} from 'echarts/components'
import VChart from 'vue-echarts'

use([CanvasRenderer, LineChart, BarChart, SankeyChart, GridComponent, TooltipComponent, LegendComponent, MarkLineComponent])

const props = defineProps<{
  option: Record<string, any>
  height?: string
}>()
</script>

<template>
  <v-chart
    :option="props.option"
    :style="{ height: props.height ?? '240px', width: '100%' }"
    autoresize
  />
</template>
