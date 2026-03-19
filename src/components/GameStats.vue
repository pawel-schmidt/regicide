<script setup lang="ts">
import { useGameStore } from '../stores/gameStore'

const game = useGameStore()
</script>

<template>
  <div class="grid grid-cols-3 gap-1.5 text-xs">
    <div class="bg-bg-card rounded-lg p-1.5 text-center border border-border/50">
      <div class="text-[10px] text-text-muted uppercase tracking-wider">Castle</div>
      <div class="text-base font-bold text-accent leading-tight">{{ game.castleDeck.length }}</div>
    </div>
    <div class="bg-bg-card rounded-lg p-1.5 text-center border border-border/50">
      <div class="text-[10px] text-text-muted uppercase tracking-wider">Tavern</div>
      <div class="text-base font-bold text-text-primary leading-tight">{{ game.tavernDeck.length }}</div>
    </div>
    <div class="bg-bg-card rounded-lg p-1.5 text-center border border-border/50">
      <div class="text-[10px] text-text-muted uppercase tracking-wider">Discard</div>
      <div class="text-base font-bold text-text-secondary leading-tight">{{ game.discardPile.length }}</div>
    </div>
  </div>
</template>
