import { defineStore } from 'pinia'
import { ref } from 'vue'

export interface OwnersFilters {
    search: string
    hasProperties: boolean | 'all'
}

export const useOwnersFilterStore = defineStore('ownersFilter', () => {
    // Filter state
    const search = ref('')
    const hasProperties = ref<boolean | 'all'>('all')

    // Pagination state
    const currentPage = ref(1)
    const pageSize = 15
    const totalCount = ref(0)

    function getFilters(): OwnersFilters {
        return {
            search: search.value,
            hasProperties: hasProperties.value,
        }
    }

    function resetFilters() {
        search.value = ''
        hasProperties.value = 'all'
        currentPage.value = 1
        totalCount.value = 0
    }

    function setTotalCount(count: number) {
        totalCount.value = count
    }

    function setPage(page: number) {
        currentPage.value = page
    }

    function resetPage() {
        currentPage.value = 1
    }

    return {
        // Filter state
        search,
        hasProperties,
        // Pagination state
        currentPage,
        pageSize,
        totalCount,
        // Actions
        getFilters,
        resetFilters,
        setTotalCount,
        setPage,
        resetPage,
    }
})
