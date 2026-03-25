import { ref, watch, type Ref } from 'vue'

/**
 * A simple debounce composable that returns a debounced ref.
 * The debounced value will only update after the specified delay
 * has passed without any new changes to the source value.
 *
 * @param value - The source ref to debounce
 * @param delay - The debounce delay in milliseconds (default: 300ms)
 * @returns A ref containing the debounced value
 */
export function useDebounce<T>(value: Ref<T>, delay: number = 300): Ref<T> {
    const debouncedValue = ref(value.value) as Ref<T>
    let timeoutId: ReturnType<typeof setTimeout> | null = null

    watch(value, (newValue) => {
        if (timeoutId) {
            clearTimeout(timeoutId)
        }

        timeoutId = setTimeout(() => {
            debouncedValue.value = newValue
            timeoutId = null
        }, delay)
    })

    return debouncedValue
}
