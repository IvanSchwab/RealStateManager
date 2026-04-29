import { ref, watch, type Ref } from 'vue'
import { supabase } from '@/lib/supabase'
import { useAuth } from './useAuth'
import { normalize } from '@/utils/normalize'

export type SearchEntityType = 'property' | 'owner' | 'tenant' | 'contract'

export interface SearchResult {
  id: string
  type: SearchEntityType
  primary: string
  secondary?: string
  route: { name: string; params: Record<string, string> }
}

export interface SearchGroup {
  type: SearchEntityType
  labelKey: string
  items: SearchResult[]
}

export function useGlobalSearch(query: Ref<string>) {
  const groups = ref<SearchGroup[]>([])
  const loading = ref(false)
  const { organizationId } = useAuth()

  async function runSearch(q: string) {
    const trimmed = q.trim()
    if (!trimmed || !organizationId.value) {
      groups.value = []
      loading.value = false
      return
    }

    loading.value = true
    const tokens = trimmed.split(/\s+/).filter(Boolean).map(t => normalize(t))
    const orgId = organizationId.value

    // Build property query — all tokens must match name or address
    let propQuery = supabase
      .from('properties')
      .select('id, name, address_street, address_number, address_city')
      .eq('organization_id', orgId)
      .is('deleted_at', null)
    for (const token of tokens) {
      const term = `%${token}%`
      propQuery = propQuery.or(`name.ilike.${term},address_street.ilike.${term},address_city.ilike.${term}`)
    }

    // No DB filter for owner/tenant name fields — Postgres ilike is accent-sensitive.
    // Fetch all records; client-side normalize() filter handles name matching below.
    const ownerQuery = supabase
      .from('owners')
      .select('id, full_name, email, phone')
      .eq('organization_id', orgId)
      .is('deleted_at', null)

    const tenantQuery = supabase
      .from('tenants')
      .select('id, first_name, last_name, email, phone')
      .eq('organization_id', orgId)
      .is('deleted_at', null)

    // Contracts: 2-step — first match properties, then find their contracts
    const contractSearch = async () => {
      let matchedPropsQuery = supabase
        .from('properties')
        .select('id')
        .eq('organization_id', orgId)
        .is('deleted_at', null)
      for (const token of tokens) {
        const term = `%${token}%`
        matchedPropsQuery = matchedPropsQuery.or(`name.ilike.${term},address_street.ilike.${term}`)
      }
      const { data: matchedProps } = await matchedPropsQuery.limit(10)

      if (!matchedProps?.length) return { data: [] }

      return supabase
        .from('contracts')
        .select('id, start_date, end_date, property:properties(name, address_street, address_number)')
        .eq('organization_id', orgId)
        .is('deleted_at', null)
        .in('property_id', matchedProps.map((p: { id: string }) => p.id))
        .limit(5)
    }

    const [propRes, ownerRes, tenantRes, contractRes] = await Promise.allSettled([
      propQuery.limit(5),
      ownerQuery,    // no limit — all fetched, client-side filter below narrows to 5
      tenantQuery,   // no limit — all fetched, client-side filter below narrows to 5
      contractSearch(),
    ])

    const newGroups: SearchGroup[] = []

    if (propRes.status === 'fulfilled' && propRes.value.data?.length) {
      newGroups.push({
        type: 'property',
        labelKey: 'nav.properties',
        items: (propRes.value.data as Array<{
          id: string
          name: string
          address_street: string
          address_number: string | null
          address_city: string
        }>).map(p => ({
          id: p.id,
          type: 'property' as const,
          primary: p.name,
          secondary: [p.address_street, p.address_number, p.address_city].filter(Boolean).join(', '),
          route: { name: 'property-detail', params: { id: p.id } },
        })),
      })
    }

    if (ownerRes.status === 'fulfilled' && ownerRes.value.data?.length) {
      const ownerData = (ownerRes.value.data as Array<{
        id: string
        full_name: string
        email: string | null
        phone: string | null
      }>).filter(o =>
        tokens.every(token =>
          normalize(o.full_name).includes(token) ||
          normalize(o.email ?? '').includes(token) ||
          normalize(o.phone ?? '').includes(token)
        )
      ).slice(0, 5)
      if (ownerData.length) {
        newGroups.push({
          type: 'owner',
          labelKey: 'nav.owners',
          items: ownerData.map(o => ({
            id: o.id,
            type: 'owner' as const,
            primary: o.full_name,
            secondary: o.email ?? o.phone ?? undefined,
            route: { name: 'owner-details', params: { id: o.id } },
          })),
        })
      }
    }

    if (tenantRes.status === 'fulfilled' && tenantRes.value.data?.length) {
      const tenantData = (tenantRes.value.data as Array<{
        id: string
        first_name: string
        last_name: string
        email: string | null
        phone: string | null
      }>).filter(t =>
        tokens.every(token =>
          normalize(t.first_name).includes(token) ||
          normalize(t.last_name).includes(token) ||
          normalize(t.email ?? '').includes(token) ||
          normalize(t.phone ?? '').includes(token)
        )
      ).slice(0, 5)
      if (tenantData.length) {
        newGroups.push({
          type: 'tenant',
          labelKey: 'nav.tenants',
          items: tenantData.map(t => ({
            id: t.id,
            type: 'tenant' as const,
            primary: `${t.first_name} ${t.last_name}`,
            secondary: t.email ?? t.phone ?? undefined,
            route: { name: 'tenant-details', params: { id: t.id } },
          })),
        })
      }
    }

    if (contractRes.status === 'fulfilled' && contractRes.value.data?.length) {
      newGroups.push({
        type: 'contract',
        labelKey: 'nav.contracts',
        items: (contractRes.value.data as Array<{
          id: string
          start_date: string
          end_date: string
          property: { name: string; address_street: string; address_number: string | null } | null
        }>).map(c => ({
          id: c.id,
          type: 'contract' as const,
          primary: c.property?.name ?? c.id,
          secondary: c.property
            ? [c.property.address_street, c.property.address_number].filter(Boolean).join(' ')
            : undefined,
          route: { name: 'contract-details', params: { id: c.id } },
        })),
      })
    }

    groups.value = newGroups
    loading.value = false
  }

  watch(query, runSearch)

  return { groups, loading }
}
