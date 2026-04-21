import { ref, computed } from 'vue'

export type Theme = 'light' | 'dark' | 'system'

const theme = ref<Theme>('system')
const isDarkMode = ref(false)

function applyTheme(value: Theme) {
  const root = document.documentElement
  if (value === 'dark') {
    root.classList.add('dark')
    root.setAttribute('data-theme', 'dark')
    isDarkMode.value = true
  } else if (value === 'light') {
    root.classList.remove('dark')
    root.setAttribute('data-theme', 'light')
    isDarkMode.value = false
  } else {
    // system
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
    prefersDark ? root.classList.add('dark') : root.classList.remove('dark')
    root.setAttribute('data-theme', prefersDark ? 'dark' : 'light')
    isDarkMode.value = prefersDark
  }
}

function setTheme(value: Theme) {
  theme.value = value
  localStorage.setItem('theme', value)
  applyTheme(value)
}

function initTheme() {
  const saved = localStorage.getItem('theme') as Theme | null
  const initial = saved ?? 'system'
  theme.value = initial
  applyTheme(initial)

  // Listen for system preference changes
  window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
    if (theme.value === 'system') {
      applyTheme('system')
    }
  })
}

function toggleTheme() {
  // Toggle between light and dark (skipping system)
  const isDark = document.documentElement.classList.contains('dark')
  setTheme(isDark ? 'light' : 'dark')
}

export function useTheme() {
  const isDark = computed(() => isDarkMode.value)
  return { theme, isDark, setTheme, initTheme, toggleTheme }
}
