import { defineStore } from 'pinia'
import { ref } from 'vue'
import type { ContractType, ContractDisplayStatus } from '@/types'

export interface ContractsFilters {
    search: string
    status: ContractDisplayStatus | 'all'
    contractType: ContractType | 'all'
}

export const useContractsFilterStore = defineStore('contractsFilter', () => {
    // Filter state
    const search = ref('')
    const status = ref<ContractDisplayStatus | 'all'>('all')
    const contractType = ref<ContractType | 'all'>('all')

    // Pagination state
    const currentPage = ref(1)
    const pageSize = 15
    const totalCount = ref(0)

    function getFilters(): ContractsFilters {
        return {
            search: search.value,
            status: status.value,
            contractType: contractType.value,
        }
    }

    function resetFilters() {
        search.value = ''
        status.value = 'all'
        contractType.value = 'all'
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
        contractType,
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
