<script setup lang="ts">
import { computed, h, ref, toRef, useTemplateRef, resolveComponent } from 'vue'
import { useWeekRangeData } from '@/composables/useWeekRangeData'
import type { WeekIdentifier, WeeklyData } from '@/models/WeeklyData'
import type { TableColumn } from '@nuxt/ui'
import { getWeekStatusByIcon } from '@/constants/WeekStatus.utils'
import { useClipboard, useLocalStorage } from '@vueuse/core'
import type { Row } from '@tanstack/vue-table'
import { getWeekDateRange } from '@/models/WeekKey.utils'
import { upperFirst } from 'scule'
import { useWeekNavigation } from '@/composables/useWeekNavigation'
import { useMediaQuery } from '@vueuse/core'

const UTooltip = resolveComponent('UTooltip')
const UDropdownMenu = resolveComponent('UDropdownMenu')
const UButton = resolveComponent('UButton')
const UCard = resolveComponent('UCard')

const { navigateToWeek } = useWeekNavigation()

// Detect if screen is large enough for table layout
const isLargeScreen = useMediaQuery('(min-width: 768px)')

interface Props {
  startWeek: WeekIdentifier
  endWeek: WeekIdentifier
}

const props = defineProps<Props>()

// Convert props to refs for the composable
const startWeekRef = toRef(props, 'startWeek')
const endWeekRef = toRef(props, 'endWeek')

// Fetch data for the week range
const { weeks } = useWeekRangeData(startWeekRef, endWeekRef)

// Sort weeks with most recent at the top
const sortedWeeks = computed(() => {
  return [...weeks.value].sort((a, b) => {
    if (a.weekId.year !== b.weekId.year) {
      return b.weekId.year - a.weekId.year
    }
    return b.weekId.week - a.weekId.week
  })
})

// Global filter state
const globalFilter = ref('')
const table = useTemplateRef<{ tableApi?: unknown }>('table')

// Filtered weeks for mobile view
const filteredWeeks = computed(() => {
  if (!globalFilter.value) return sortedWeeks.value

  const searchTerm = globalFilter.value.toLowerCase()
  return sortedWeeks.value.filter((week) => {
    const weekStr = `${week.weekId.week} ${week.weekId.year}`.toLowerCase()
    const achievements = (week.achievements || '').toLowerCase()
    const challenges = (week.challenges || '').toLowerCase()
    const statusText = getWeekStatusByIcon(week.statusIcon)?.title?.toLowerCase() || ''

    return (
      weekStr.includes(searchTerm) ||
      achievements.includes(searchTerm) ||
      challenges.includes(searchTerm) ||
      statusText.includes(searchTerm)
    )
  })
})

// Persisted column visibility state
const columnVisibility = useLocalStorage<Record<string, boolean>>(
  'weekRangeData-columnVisibility',
  {},
)

// Clipboard functionality
const { copy } = useClipboard()
const justCopied = ref(false)

// Get filtered or all weeks for export
const weeksToExport = computed<WeeklyData[]>(() => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const tableApi = table.value?.tableApi as any
  const filteredRows: Row<WeeklyData>[] = tableApi?.getFilteredRowModel?.()?.rows || []
  return filteredRows.length > 0 ? filteredRows.map((row) => row.original) : sortedWeeks.value
})

// Format notes for LLM-friendly output
const formatNotesForLLM = () => {
  const formattedNotes = weeksToExport.value
    .map((week) => {
      const weekStatus = getWeekStatusByIcon(week.statusIcon)
      const statusText = weekStatus ? `${weekStatus.title} (${weekStatus.description})` : 'Unknown'

      return `# Week ${week.weekId.week}, ${week.weekId.year}

**Status:** ${statusText}

## Achievements
${week.achievements && week.achievements.trim() ? week.achievements : 'None'}

## Challenges
${week.challenges && week.challenges.trim() ? week.challenges : 'None'}
`
    })
    .join('\n---\n\n')

  return `# Weekly Notes Summary
Week ${props.startWeek.week} - ${props.endWeek.week}, ${props.startWeek.year}

${formattedNotes}`
}

const copyNotes = async () => {
  const formattedText = formatNotesForLLM()
  await copy(formattedText)

  justCopied.value = true
  setTimeout(() => {
    justCopied.value = false
  }, 2000)
}

// Format week identifier for display
const formatWeek = (weekId: WeekIdentifier) => {
  return `${weekId.week}`
}

// Format date range for display
const formatDateRange = (weekId: WeekIdentifier) => {
  const { start, end } = getWeekDateRange(weekId)
  const startStr = start.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
  const endStr = end.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
  return `${startStr} - ${endStr}`
}

// Define table columns
const columns: TableColumn<WeeklyData>[] = [
  {
    accessorKey: 'weekId',
    header: 'Week',
    cell: ({ row }) => {
      const weekId = row.getValue('weekId') as WeekIdentifier
      return h(UButton, {
        variant: 'link',
        color: 'primary',
        label: formatWeek(weekId),
        onClick: () => navigateToWeek(weekId),
      })
    },
  },
  {
    id: 'dateRange',
    header: 'Dates',
    cell: ({ row }) => formatDateRange(row.original.weekId),
  },
  {
    accessorKey: 'statusIcon',
    header: 'Status',
    cell: ({ row }) => {
      const statusIcon = row.getValue('statusIcon') as string
      const weekStatus = getWeekStatusByIcon(statusIcon)

      if (!statusIcon || !weekStatus) {
        return h('span', { class: 'text-2xl' }, '—')
      }

      const tooltipText = `${weekStatus.description}`

      return h(
        UTooltip,
        { text: tooltipText },
        {
          default: () => h('span', { class: 'text-2xl cursor-help' }, statusIcon),
        },
      )
    },
  },
  {
    accessorKey: 'achievements',
    header: 'Achievements',
    cell: ({ row }) => {
      const achievements = row.getValue('achievements') as string
      if (!achievements || achievements.trim().length === 0) {
        return h('span', { class: 'text-muted italic' }, 'None')
      }
      return h('div', { class: 'whitespace-pre-wrap' }, achievements)
    },
    meta: {
      class: {
        td: 'w-1/2',
        th: 'w-1/2',
      },
    },
  },
  {
    accessorKey: 'challenges',
    header: 'Challenges',
    cell: ({ row }) => {
      const challenges = row.getValue('challenges') as string
      if (!challenges || challenges.trim().length === 0) {
        return h('span', { class: 'text-muted italic' }, 'None')
      }
      return h('div', { class: 'whitespace-pre-wrap' }, challenges)
    },
    meta: {
      class: {
        td: 'w-1/2',
        th: 'w-1/2',
      },
    },
  },
]
</script>

<template>
  <div class="flex flex-col gap-4 h-full">
    <div class="flex gap-2">
      <UInput
        v-model="globalFilter"
        placeholder="Search notes..."
        icon="i-lucide-search"
        class="flex-1"
        @update:model-value="(table?.tableApi as any)?.setGlobalFilter($event)"
      />

      <UTooltip
        :text="
          justCopied
            ? 'Copied!'
            : globalFilter
              ? `Copy ${weeksToExport.length} filtered note${weeksToExport.length === 1 ? '' : 's'}`
              : 'Copy all notes (LLM-friendly format)'
        "
      >
        <UButton
          :icon="justCopied ? 'i-lucide-check' : 'i-lucide-copy'"
          :color="justCopied ? 'success' : 'neutral'"
          variant="outline"
          @click="copyNotes"
        />
      </UTooltip>

      <!-- Slot for additional actions (e.g., delete button) -->
      <slot name="actions"></slot>

      <UDropdownMenu
        v-if="isLargeScreen"
        :items="
          (table?.tableApi as any)
            ?.getAllColumns()
            .filter((column: any) => column.getCanHide())
            .map((column: any) => ({
              label:
                typeof column.columnDef.header === 'string'
                  ? column.columnDef.header
                  : upperFirst(column.id),
              type: 'checkbox' as const,
              checked: column.getIsVisible(),
              onUpdateChecked(checked: boolean) {
                ;(table?.tableApi as any)?.getColumn(column.id)?.toggleVisibility(!!checked)
              },
              onSelect(e: Event) {
                e.preventDefault()
              },
            }))
        "
        :content="{ align: 'end' }"
        :ui="{ content: 'z-50' }"
      >
        <UButton
          label="Columns"
          color="neutral"
          variant="outline"
          trailing-icon="i-lucide-chevron-down"
          aria-label="Columns select dropdown"
        />
      </UDropdownMenu>
    </div>

    <!-- Desktop Table View -->
    <UTable
      v-if="isLargeScreen"
      ref="table"
      v-model:column-visibility="columnVisibility"
      :data="sortedWeeks"
      :columns="columns"
      class="w-full flex-1 overflow-auto"
    />

    <!-- Mobile Card View -->
    <div v-else class="flex flex-col gap-3 overflow-auto flex-1">
      <UCard
        v-for="week in filteredWeeks"
        variant="subtle"
        :key="`${week.weekId.year}-${week.weekId.week}`"
        class="cursor-pointer hover:bg-elevated/50 transition-colors"
        @click="navigateToWeek(week.weekId)"
      >
        <div class="flex flex-col gap-3">
          <!-- Header: Week Number, Date Range, Status -->
          <div class="flex items-center justify-between">
            <div class="flex flex-col gap-1">
              <div class="flex items-center gap-2">
                <UButton
                  variant="link"
                  color="primary"
                  :label="`Week ${formatWeek(week.weekId)}`"
                  class="font-semibold text-base p-0"
                  @click.stop="navigateToWeek(week.weekId)"
                />
              </div>
              <span class="text-sm text-muted">{{ formatDateRange(week.weekId) }}</span>
            </div>
            <UTooltip
              v-if="week.statusIcon"
              :text="getWeekStatusByIcon(week.statusIcon)?.description || ''"
            >
              <span class="text-3xl">{{ week.statusIcon }}</span>
            </UTooltip>
          </div>

          <!-- Achievements -->
          <div v-if="week.achievements && week.achievements.trim()" class="flex flex-col gap-1">
            <span class="text-sm font-medium text-default">Achievements</span>
            <p class="text-sm text-muted whitespace-pre-wrap">{{ week.achievements }}</p>
          </div>

          <!-- Challenges -->
          <div v-if="week.challenges && week.challenges.trim()" class="flex flex-col gap-1">
            <span class="text-sm font-medium text-default">Challenges</span>
            <p class="text-sm text-muted whitespace-pre-wrap">{{ week.challenges }}</p>
          </div>

          <!-- Empty state -->
          <div
            v-if="
              (!week.achievements || !week.achievements.trim()) &&
              (!week.challenges || !week.challenges.trim())
            "
            class="text-sm text-muted italic"
          >
            No notes for this week
          </div>
        </div>
      </UCard>

      <div v-if="filteredWeeks.length === 0" class="text-center text-muted py-8">
        {{ globalFilter ? 'No matching notes found' : 'No notes found' }}
      </div>
    </div>
  </div>
</template>
