import { defineStore } from 'pinia'
import { ref } from 'vue'

export type InvitationStatusFilter = 'all' | 'pending' | 'accepted' | 'expired' | 'cancelled'

export interface InvitationsFilters {
    search: string
    status: InvitationStatusFilter
}

export const useInvitationsFilterStore = defineStore('invitationsFilter', () => {
    // Filter state
    const search = ref('')
    const status = ref<InvitationStatusFilter>('pending')

    // Pagination state
    const currentPage = ref(1)
    const pageSize = 15
    const totalCount = ref(0)

    function getFilters(): InvitationsFilters {
        return {
            search: search.value,
            status: status.value,
        }
    }

    function resetFilters() {
        search.value = ''
        status.value = 'pending'
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
