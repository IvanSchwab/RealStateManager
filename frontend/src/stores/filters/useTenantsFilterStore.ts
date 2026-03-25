import { defineStore } from 'pinia'
import { ref } from 'vue'
import type { TenantStatus } from '@/types'

export interface TenantsFilters {
    search: string
    status: TenantStatus | 'all'
    hasEmployer: boolean | 'all'
}

export const useTenantsFilterStore = defineStore('tenantsFilter', () => {
    // Filter state
    const search = ref('')
    const status = ref<TenantStatus | 'all'>('all')
    const hasEmployer = ref<boolean | 'all'>('all')

    // Pagination state
    const currentPage = ref(1)
    const pageSize = 15
    const totalCount = ref(0)

    function getFilters(): TenantsFilters {
        return {
            search: search.value,
            status: status.value,
            hasEmployer: hasEmployer.value,
        }
    }

    function resetFilters() {
        search.value = ''
        status.value = 'all'
        hasEmployer.value = 'all'
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
        status,
        hasEmployer,
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
