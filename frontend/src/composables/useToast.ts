import { ref, readonly } from 'vue'

export type ToastType = 'success' | 'error' | 'warning' | 'info'

export interface Toast {
  id: string
  type: ToastType
  message: string
  duration: number
}

// Module-level singleton state (shared across all component instances)
const toasts = ref<Toast[]>([])
let toastId = 0

const DEFAULT_DURATION = 4000

export function useToast() {
  function show(message: string, type: ToastType = 'info', duration: number = DEFAULT_DURATION) {
    const id = `toast-${++toastId}`
    const toast: Toast = {
      id,
      type,
      message,
      duration,
    }

    toasts.value.push(toast)

    // Auto-dismiss after duration
    if (duration > 0) {
      setTimeout(() => {
        dismiss(id)
      }, duration)
    }

    return id
  }

  function success(message: string, duration?: number) {
    return show(message, 'success', duration)
  }

  function error(message: string, duration?: number) {
    return show(message, 'error', duration ?? 6000) // Errors stay longer
  }

  function warning(message: string, duration?: number) {
    return show(message, 'warning', duration ?? 5000)
  }

  function info(message: string, duration?: number) {
    return show(message, 'info', duration)
  }

  function dismiss(id: string) {
    const index = toasts.value.findIndex((t) => t.id === id)
    if (index !== -1) {
      toasts.value.splice(index, 1)
    }
  }

  function dismissAll() {
    toasts.value = []
  }

  return {
    toasts: readonly(toasts),
    show,
    success,
    error,
    warning,
    info,
    dismiss,
    dismissAll,
  }
}
