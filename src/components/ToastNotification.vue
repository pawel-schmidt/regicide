<script setup lang="ts">
import { watch, ref } from 'vue'
import { useGameStore } from '../stores/gameStore'

const game = useGameStore()
const timerRef = ref<ReturnType<typeof setTimeout> | null>(null)

watch(
  () => game.toast.visible,
  (visible) => {
    if (visible) {
      // Clear any existing timer
      if (timerRef.value) clearTimeout(timerRef.value)
      // Auto-dismiss after 3 seconds
      timerRef.value = setTimeout(() => {
        game.hideToast()
        timerRef.value = null
      }, 3000)
    }
  }
)

function dismiss() {
  if (timerRef.value) {
    clearTimeout(timerRef.value)
    timerRef.value = null
  }
  game.hideToast()
}

function iconForType(type: string): string {
  switch (type) {
    case 'capture': return '⭐'
    case 'defeat': return '⚔️'
    default: return 'ℹ️'
  }
}

function bgForType(type: string): string {
  switch (type) {
    case 'capture': return 'bg-gold/20 border-gold/40'
    case 'defeat': return 'bg-suit-hearts/20 border-suit-hearts/40'
    default: return 'bg-accent/20 border-accent/40'
  }
}

function textForType(type: string): string {
  switch (type) {
    case 'capture': return 'text-gold'
    case 'defeat': return 'text-suit-hearts'
    default: return 'text-accent'
  }
}
</script>

<template>
  <Transition name="toast">
    <div
      v-if="game.toast.visible"
      class="fixed top-4 left-1/2 -translate-x-1/2 z-[60]"
    >
      <button
        @click="dismiss"
        :class="[
          'flex items-center gap-2 px-4 py-2.5 rounded-xl border',
          'shadow-lg backdrop-blur-sm cursor-pointer',
          'transition-all hover:scale-105 active:scale-95',
          bgForType(game.toast.type),
        ]"
      >
        <span class="text-lg">{{ iconForType(game.toast.type) }}</span>
        <span :class="['text-sm font-bold', textForType(game.toast.type)]">
          {{ game.toast.message }}
        </span>
      </button>
    </div>
  </Transition>
</template>

<style scoped>
.toast-enter-active {
  transition: all 0.35s cubic-bezier(0.34, 1.56, 0.64, 1);
}
.toast-leave-active {
  transition: all 0.25s ease-in;
}
.toast-enter-from {
  opacity: 0;
  transform: translate(-50%, -20px) scale(0.9);
}
.toast-leave-to {
  opacity: 0;
  transform: translate(-50%, -10px) scale(0.95);
}
</style>
