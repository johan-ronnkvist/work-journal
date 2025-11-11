<script setup lang="ts">
import { useSettingsStore } from '@/stores/settings'
import { computed } from 'vue'
import { getFileSystemSupportInfo } from '@/utils/fileSystemSupport'
import { getCurrentWeekIdentifier } from '@/models/WeekKey.utils'

const settingsStore = useSettingsStore()

// Get current year for display
const currentYear = getCurrentWeekIdentifier().year

// File storage settings
const fileSystemSupport = getFileSystemSupportInfo()
const fileStorageEnabled = computed({
  get: () => settingsStore.fileStorageEnabled,
  set: async (value: boolean) => {
    if (value) {
      // When enabling, check if we already have a directory selected
      const hasExistingDirectory = await settingsStore.hasDirectory()

      if (!hasExistingDirectory) {
        // No directory selected yet - prompt for directory selection
        const handle = await settingsStore.selectDirectory()
        if (!handle) {
          // User cancelled - don't enable file storage
          return
        }
      }
    }
    await settingsStore.setFileStorageEnabled(value)
  },
})

// Get directory name for display
// Note: File System Access API only provides the directory name, not the full path
// for security reasons. We show what's available from the handle.
const directoryInfo = computed(() => {
  const handle = settingsStore.directoryHandle
  if (!handle) {
    return {
      name: 'No directory selected',
      hasDirectory: false,
    }
  }
  return {
    name: handle.name,
    hasDirectory: true,
  }
})

// Handle change directory
const handleChangeDirectory = async () => {
  await settingsStore.selectDirectory()
}

// Reset to default settings
const handleReset = () => {
  fileStorageEnabled.value = false
}
</script>

<template>
  <UCard variant="subtle">
    <template #header>
      <div class="flex items-center justify-between">
        <h3 class="text-lg font-semibold">Local Storage</h3>
        <UButton variant="ghost" size="sm" @click="handleReset" :disabled="!fileStorageEnabled">
          Reset to Default
        </UButton>
      </div>
    </template>

    <div class="space-y-4">
      <div class="flex items-start gap-4">
        <div class="flex-1">
          <div class="flex flex-row justify-between">
            <div class="flex items-center gap-2 mb-2">
              <UCheckbox
                id="enable-file-storage"
                v-model="fileStorageEnabled"
                :disabled="!fileSystemSupport.supported"
              />
              <label for="enable-file-storage" class="cursor-pointer">
                Enable local file storage
              </label>
            </div>
          </div>

          <p class="text-md text-gray-600 dark:text-gray-400 ml-6">
            Save your weekly notes to local files for backup and portability. Files are stored in a
            directory you choose as
            <code class="text-xs px-1 py-0.5 bg-gray-100 dark:bg-gray-800 rounded"
              >work-journal-YYYY.json</code
            >.
          </p>
        </div>
      </div>

      <!-- Browser Support Alert -->
      <UAlert
        v-if="!fileSystemSupport.supported"
        color="warning"
        variant="soft"
        icon="i-lucide-alert-circle"
        :title="fileSystemSupport.message"
        :description="fileSystemSupport.browserHint"
      />

      <!-- Success Alert when enabled -->
      <UAlert
        v-else-if="fileStorageEnabled"
        color="info"
        variant="soft"
        icon="i-lucide-info"
        title="File storage enabled"
      >
        <template #title> Notes are being saved to this file </template>

        <template #description>
          <div class="space-y-1">
            <code class="px-2 py-1 text-primary rounded text-xs dark:bg-stone-900 bg-stone-800">
              {{ directoryInfo.name }}/work-journal-{{ currentYear }}.json
            </code>
          </div>
        </template>
      </UAlert>
      <div class="flex justify-center mt-4">
        <UButton
          variant="ghost"
          icon="i-lucide-folder-open"
          size="sm"
          @click="handleChangeDirectory"
        >
          Change Directory
        </UButton>
      </div>
    </div>
  </UCard>
</template>
