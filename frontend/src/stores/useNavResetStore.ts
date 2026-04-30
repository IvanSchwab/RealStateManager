import { defineStore } from 'pinia'
import { reactive } from 'vue'

export const useNavResetStore = defineStore('navReset', () => {
  const signals = reactive<Record<string, number>>({})

  function trigger(path: string) {
    signals[path] = (signals[path] ?? 0) + 1
  }

  return { signals, trigger }
})
