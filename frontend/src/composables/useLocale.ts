import { computed } from 'vue'
import { useI18n } from 'vue-i18n'

export type Locale = 'es' | 'en'

export function useLocale() {
  const { locale, t } = useI18n()

  function setLocale(newLocale: Locale) {
    locale.value = newLocale
    localStorage.setItem('locale', newLocale)
    document.documentElement.setAttribute('lang', newLocale)
  }

  function initLocale(orgDefault: Locale = 'es') {
    const saved = localStorage.getItem('locale') as Locale | null
    setLocale(saved ?? orgDefault)
  }

  const currentLocale = computed(() => locale.value as Locale)
  const isSpanish = computed(() => locale.value === 'es')
  const isEnglish = computed(() => locale.value === 'en')

  return {
    currentLocale,
    isSpanish,
    isEnglish,
    setLocale,
    initLocale,
    t
  }
}
