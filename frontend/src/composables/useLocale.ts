import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import i18n from '@/i18n'

export type Locale = 'es' | 'en'

export function useLocale() {
  const { t } = useI18n()

  function setLocale(newLocale: Locale) {
    i18n.global.locale.value = newLocale
    localStorage.setItem('locale', newLocale)
    document.documentElement.setAttribute('lang', newLocale)
  }

  function initLocale(orgDefault: Locale = 'es') {
    const saved = localStorage.getItem('locale') as Locale | null
    setLocale(saved ?? orgDefault)
  }

  const currentLocale = computed(() => i18n.global.locale.value as Locale)
  const isSpanish = computed(() => i18n.global.locale.value === 'es')
  const isEnglish = computed(() => i18n.global.locale.value === 'en')

  return {
    currentLocale,
    isSpanish,
    isEnglish,
    setLocale,
    initLocale,
    t
  }
}
