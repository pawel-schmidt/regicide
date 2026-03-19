<script setup lang="ts">
import type { Card, Suit } from '../types'
import { SUIT_SYMBOLS } from '../types'

const props = defineProps<{
  card: Card
  selected?: boolean
  disabled?: boolean
  small?: boolean
}>()

const emit = defineEmits<{
  click: []
}>()

function suitColor(suit: Suit): string {
  switch (suit) {
    case 'hearts': return 'text-suit-hearts'
    case 'diamonds': return 'text-suit-diamonds'
    case 'clubs': return 'text-suit-clubs'
    case 'spades': return 'text-suit-spades'
  }
}

function suitBg(suit: Suit): string {
  switch (suit) {
    case 'hearts': return 'bg-suit-hearts/5'
    case 'diamonds': return 'bg-suit-diamonds/5'
    case 'clubs': return 'bg-suit-clubs/5'
    case 'spades': return 'bg-suit-spades/5'
  }
}

function selectedBorder(suit: Suit): string {
  switch (suit) {
    case 'hearts': return 'border-suit-hearts shadow-[0_0_10px_rgba(239,68,68,0.3)]'
    case 'diamonds': return 'border-suit-diamonds shadow-[0_0_10px_rgba(245,158,11,0.3)]'
    case 'clubs': return 'border-suit-clubs shadow-[0_0_10px_rgba(34,197,94,0.3)]'
    case 'spades': return 'border-suit-spades shadow-[0_0_10px_rgba(59,130,246,0.3)]'
  }
}

function isCaptured(card: Card): boolean {
  return card.captured === true
}
</script>

<template>
  <button
    @click="emit('click')"
    :disabled="disabled"
    :class="[
      'relative flex flex-col items-center justify-between rounded-lg border-2',
      'transition-all duration-150 select-none',
      suitBg(card.suit),
      small ? 'w-11 h-16 p-0.5 text-xs' : 'w-14 h-20 p-1 text-sm sm:w-16 sm:h-23 sm:p-1.5',
      selected
        ? `${selectedBorder(card.suit)} -translate-y-3 scale-105`
        : 'border-border/60 hover:border-text-muted/60',
      disabled
        ? 'opacity-40 cursor-not-allowed'
        : 'cursor-pointer hover:-translate-y-1 active:scale-95',
      isCaptured(card) ? 'ring-1 ring-gold/30' : '',
    ]"
  >
    <!-- Top rank + suit -->
    <div :class="['font-bold leading-none', suitColor(card.suit)]">
      <div :class="small ? 'text-[10px]' : 'text-sm sm:text-base'">{{ card.rank }}</div>
    </div>

    <!-- Center suit -->
    <div :class="[suitColor(card.suit), small ? 'text-base' : 'text-xl sm:text-2xl']">
      {{ SUIT_SYMBOLS[card.suit] }}
    </div>

    <!-- Bottom (inverted) -->
    <div :class="['font-bold leading-none rotate-180', suitColor(card.suit)]">
      <div :class="small ? 'text-[10px]' : 'text-sm sm:text-base'">{{ card.rank }}</div>
    </div>

    <!-- Captured badge -->
    <div
      v-if="isCaptured(card) && !small"
      class="absolute -top-1.5 -right-1.5 text-[10px] bg-gold text-bg-primary
             rounded-full w-4 h-4 flex items-center justify-center font-bold"
    >
      ★
    </div>
  </button>
</template>
