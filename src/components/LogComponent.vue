<script setup lang="ts">
import { useGameStore } from '../stores/gameStore'
import type { LogEntry } from '../types'

const game = useGameStore()

function logTypeColor(type: LogEntry['type']): string {
  switch (type) {
    case 'damage': return 'text-suit-hearts'
    case 'heal': return 'text-success'
    case 'draw': return 'text-suit-diamonds'
    case 'shield': return 'text-shield'
    case 'enemy': return 'text-gold'
    case 'system': return 'text-accent'
    case 'action': return 'text-text-secondary'
    default: return 'text-text-muted'
  }
}

function logTypeIcon(type: LogEntry['type']): string {
  switch (type) {
    case 'damage': return '⚔️'
    case 'heal': return '💚'
    case 'draw': return '🃏'
    case 'shield': return '🛡️'
    case 'enemy': return '👑'
    case 'system': return '⚙️'
    case 'action': return '▶️'
    default: return '•'
  }
}
</script>

<template>
  <div class="bg-bg-card rounded-xl border border-border overflow-hidden">
    <div class="px-3 py-1.5 border-b border-border bg-bg-secondary flex items-center justify-between">
      <h3 class="text-[10px] font-semibold text-text-muted uppercase tracking-wider">Game Log</h3>
      <span class="text-[10px] text-text-muted">{{ game.log.length }} entries</span>
    </div>
    <div class="max-h-32 overflow-y-auto p-2 space-y-0.5 log-scroll">
      <div
        v-for="entry in game.log"
        :key="entry.id"
        :class="['text-[11px] flex items-start gap-1.5 py-0.5 animate-slide-in', logTypeColor(entry.type)]"
      >
        <span class="flex-shrink-0 text-[10px]">{{ logTypeIcon(entry.type) }}</span>
        <span class="leading-tight">{{ entry.message }}</span>
      </div>
      <div v-if="game.log.length === 0" class="text-xs text-text-muted text-center py-2">
        No actions yet
      </div>
    </div>
  </div>
</template>
