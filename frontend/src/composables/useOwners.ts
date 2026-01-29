import { ref } from 'vue'
import { supabase } from '@/lib/supabase'
import type { Owner } from '@/types'

export function useOwners() {
    const owners = ref<Owner[]>([])
    const loading = ref(false)
    const error = ref<string | null>(null)

    async function fetchOwners() {
        loading.value = true
        error.value = null

        try {
            const { data, error: fetchError } = await supabase
                .from('owners')
                .select('*')
                .order('full_name', { ascending: true })

            if (fetchError) throw fetchError

            owners.value = data ?? []
            return data
        } catch (e) {
            error.value = e instanceof Error ? e.message : 'Failed to fetch owners'
            console.error('Error fetching owners:', e)
            return null
        } finally {
            loading.value = false
        }
    }

    return {
        owners,
        loading,
        error,
        fetchOwners,
    }
}
