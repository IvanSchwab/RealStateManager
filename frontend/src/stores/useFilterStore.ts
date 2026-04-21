import { defineStore } from 'pinia'
import { ref } from 'vue'

export const useFilterStore = defineStore('globalFilter', () => {
  const search = ref('')

  function clearSearch() {
    search.value = ''
  }

  return {
    search,
    clearSearch,
  }
})
