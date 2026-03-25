import { defineStore } from 'pinia'
import { ref } from 'vue'
import type { PaymentStatus } from '@/types'

export interface PaymentsFilters {
    search: string
    status: PaymentStatus | 'all'
    month: number
    year: number
}

export const usePaymentsFilterStore = defineStore('paymentsFilter', () => {
    // Filter state - default to current month/year
    const search = ref('')
    const status = ref<PaymentStatus | 'all'>('all')
    const month = ref(new Date().getMonth() + 1)
    const year = ref(new Date().getFullYear())

    // Pagination state
    const currentPage = ref(1)
    const pageSize = 15
    const totalCount = ref(0)

    function getFilters(): PaymentsFilters {
        return {
            search: search.value,
            status: status.value,
            month: month.value,
            year: year.value,
        }
    }

    function resetFilters() {
        search.value = ''
        status.value = 'all'
        // Keep month/year at current values when clearing filters
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
        month,
        year,
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
