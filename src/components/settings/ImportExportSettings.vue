<script setup lang="ts">
import { ref } from 'vue'
import { RepositoryFactory } from '@/repositories/RepositoryFactory'
import type { WeeklyData } from '@/models/WeeklyData'
import type { SaveWeeklyDataInput } from '@/repositories/RepositoryTypes'

type ImportMode = 'merge' | 'replace'

const isExporting = ref(false)
const isImporting = ref(false)
const exportError = ref<string | null>(null)
const importError = ref<string | null>(null)
const importSuccess = ref<string | null>(null)
const showImportPopover = ref(false)
const selectedMode = ref<ImportMode | null>(null)

/**
 * Export all data to a JSON file
 */
const handleExport = async () => {
  try {
    isExporting.value = true
    exportError.value = null

    const repository = RepositoryFactory.getInstance()
    const allData: WeeklyData[] = []

    // Get current year and a reasonable range (e.g., 5 years back and 2 forward)
    const currentYear = new Date().getFullYear()
    const startYear = currentYear - 5
    const endYear = currentYear + 2

    // Collect all data from multiple years
    for (let year = startYear; year <= endYear; year++) {
      const yearData = await repository.getByYear(year)
      allData.push(...yearData)
    }

    if (allData.length === 0) {
      exportError.value = 'No data found to export'
      return
    }

    // Create export object with metadata
    const exportData = {
      version: '1.0',
      exportDate: new Date().toISOString(),
      totalWeeks: allData.length,
      data: allData,
    }

    // Convert to JSON
    const jsonString = JSON.stringify(exportData, null, 2)
    const blob = new Blob([jsonString], { type: 'application/json' })

    // Create download link
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `work-notes-export-${new Date().toISOString().split('T')[0]}.json`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  } catch (err) {
    console.error('Export failed:', err)
    exportError.value = err instanceof Error ? err.message : 'Export failed'
  } finally {
    isExporting.value = false
  }
}

/**
 * Show the import mode selection popover
 */
const handleImportClick = () => {
  importError.value = null
  importSuccess.value = null
  showImportPopover.value = true
}

/**
 * User selected an import mode - trigger file selection
 */
const selectImportMode = (mode: ImportMode) => {
  selectedMode.value = mode
  showImportPopover.value = false
  // Trigger file input after a brief delay to ensure popover closes smoothly
  setTimeout(() => {
    fileInputRef.value?.click()
  }, 100)
}

/**
 * File was selected - execute import with previously selected mode
 */
const handleFileSelected = async (event: Event) => {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]

  if (!file || !selectedMode.value) {
    // Reset file input
    input.value = ''
    return
  }

  await executeImport(file, selectedMode.value)

  // Reset file input and mode
  input.value = ''
  selectedMode.value = null
}

/**
 * Execute the import with the selected mode
 */
const executeImport = async (file: File, mode: ImportMode) => {
  try {
    isImporting.value = true
    importError.value = null
    importSuccess.value = null

    // Read file contents
    const text = await file.text()
    const importData = JSON.parse(text)

    // Validate import data structure
    if (!importData.data || !Array.isArray(importData.data)) {
      throw new Error('Invalid import file format')
    }

    const repository = RepositoryFactory.getInstance()

    // If replace mode, we need to clear existing data first
    if (mode === 'replace') {
      // Get all years that might have data
      const currentYear = new Date().getFullYear()
      const startYear = currentYear - 10
      const endYear = currentYear + 5

      for (let year = startYear; year <= endYear; year++) {
        const yearData = await repository.getByYear(year)
        for (const weekData of yearData) {
          await repository.delete(weekData.weekId)
        }
      }
    }

    let successCount = 0
    let errorCount = 0

    // Import each week's data
    for (const weekData of importData.data) {
      try {
        // Validate required fields
        if (
          !weekData.weekId ||
          typeof weekData.weekId.year !== 'number' ||
          typeof weekData.weekId.week !== 'number'
        ) {
          console.warn('Skipping invalid week data:', weekData)
          errorCount++
          continue
        }

        // Prepare data for save
        const dataToSave: SaveWeeklyDataInput = {
          weekId: {
            year: weekData.weekId.year,
            week: weekData.weekId.week,
          },
          statusIcon: weekData.statusIcon,
          achievements: weekData.achievements,
          challenges: weekData.challenges,
        }

        await repository.save(dataToSave)
        successCount++
      } catch (err) {
        console.error('Failed to import week:', weekData.weekId, err)
        errorCount++
      }
    }

    const modeText = mode === 'replace' ? 'replaced' : 'merged'
    importSuccess.value = `Successfully ${modeText} ${successCount} week(s)${errorCount > 0 ? ` (${errorCount} failed)` : ''}`
  } catch (err) {
    console.error('Import failed:', err)
    importError.value = err instanceof Error ? err.message : 'Import failed'
  } finally {
    isImporting.value = false
  }
}

/**
 * Cancel the import operation
 */
const cancelImport = () => {
  showImportPopover.value = false
  selectedMode.value = null
}

/**
 * File input reference
 */
const fileInputRef = ref<HTMLInputElement | null>(null)
</script>

<template>
  <UCard variant="subtle">
    <template #header>
      <div class="flex items-center justify-between">
        <h3 class="text-lg font-semibold">Import / Export</h3>
      </div>
    </template>

    <div class="space-y-6">
      <!-- Export Section -->
      <div>
        <h4 class="font-medium mb-2">Export Data</h4>
        <p class="text-sm text-gray-600 dark:text-gray-400 mb-3">
          Download all your notes as a JSON file for backup or transfer.
        </p>
        <UButton
          icon="i-lucide-download"
          @click="handleExport"
          :loading="isExporting"
          :disabled="isExporting"
        >
          Export Data
        </UButton>

        <UAlert
          v-if="exportError"
          color="error"
          variant="soft"
          icon="i-lucide-alert-circle"
          :description="exportError"
          class="mt-3"
        />
      </div>

      <!-- Import Section -->
      <div>
        <h4 class="font-medium mb-2">Import Data</h4>
        <p class="text-sm text-gray-600 dark:text-gray-400 mb-3">
          Import work notes from a previously exported JSON file.
        </p>

        <input
          ref="fileInputRef"
          type="file"
          accept="application/json,.json"
          class="hidden"
          @change="handleFileSelected"
        />

        <UPopover v-model:open="showImportPopover">
          <UButton
            icon="i-lucide-upload"
            @click="handleImportClick"
            :loading="isImporting"
            :disabled="isImporting"
          >
            Import Data
          </UButton>

          <template #content>
            <div class="p-4 space-y-4 min-w-80">
              <div>
                <h4 class="font-semibold mb-2">Import Mode</h4>
              </div>

              <div class="space-y-2">
                <UButton
                  block
                  icon="i-lucide-merge"
                  color="primary"
                  @click="selectImportMode('merge')"
                  :disabled="isImporting"
                >
                  Merge with Existing Data
                </UButton>
                <p class="text-xs text-gray-600 dark:text-gray-400 ml-1 text-center">
                  Any imported notes will overwrite existing <br />
                  notes for the same weeks. Notes for other <br />
                  weeks will be preserved.
                </p>
              </div>

              <div class="space-y-2">
                <UButton
                  block
                  icon="i-lucide-replace"
                  color="error"
                  variant="soft"
                  @click="selectImportMode('replace')"
                  :disabled="isImporting"
                >
                  Replace All Data
                </UButton>
                <p class="text-xs text-gray-600 dark:text-gray-400 ml-1 text-center">
                  Delete all existing notes and import fresh data
                </p>
              </div>

              <UButton block variant="ghost" @click="cancelImport" :disabled="isImporting">
                Cancel
              </UButton>
            </div>
          </template>
        </UPopover>

        <UAlert
          v-if="importError"
          color="error"
          variant="soft"
          icon="i-lucide-alert-circle"
          :description="importError"
          class="mt-3"
        />

        <UAlert
          v-if="importSuccess"
          color="success"
          variant="soft"
          icon="i-lucide-check-circle"
          :description="importSuccess"
          class="mt-3"
        />
      </div>

      <!-- Info Alert -->
      <UAlert
        color="info"
        variant="soft"
        icon="i-lucide-info"
        description="Exported files contain all your notes in JSON format. When importing, you can choose to merge (update existing notes) or replace (delete all and import fresh)."
      />
    </div>
  </UCard>
</template>
