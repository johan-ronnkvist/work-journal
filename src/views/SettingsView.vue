<script setup lang="ts">
import FiscalYearSettings from '@/components/settings/FiscalYearSettings.vue'
import LocalStorageSettings from '@/components/settings/LocalStorageSettings.vue'
import ImportExportSettings from '@/components/settings/ImportExportSettings.vue'
</script>

<template>
  <UPage>
    <UPageBody>
      <div class="space-y-6">
        <FiscalYearSettings />
        <LocalStorageSettings />
        <ImportExportSettings />
      </div>
    </UPageBody>
  </UPage>
</template>
