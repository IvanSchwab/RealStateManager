import { defineStore } from 'pinia'
import { ref } from 'vue'
import type { PropertyType, PropertyStatus, PropertyPurpose } from '@/types'

export interface PropertiesFilters {
    search: string
    type: PropertyType | 'all'
    status: PropertyStatus | 'all'
    purpose: PropertyPurpose | 'all'
}

export const usePropertiesFilterStore = defineStore('propertiesFilter', () => {
    // Filter state
    const search = ref('')
    const type = ref<PropertyType | 'all'>('all')
    const status = ref<PropertyStatus | 'all'>('all')
    const purpose = ref<PropertyPurpose | 'all'>('all')

    // Pagination state
    const currentPage = ref(1)
    const pageSize = 15
    const totalCount = ref(0)

    function getFilters(): PropertiesFilters {
        return {
            search: search.value,
            type: type.value,
            status: status.value,
            purpose: purpose.value,
        }
    }

    function resetFilters() {
        search.value = ''
        type.value = 'all'
        status.value = 'all'
        purpose.value = 'all'
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
        type,
        status,
        purpose,
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
