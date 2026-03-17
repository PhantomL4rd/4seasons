<script lang="ts">
import { t } from '$lib/translations';
import type { Season } from '$lib/types';

interface Props {
  season: Season;
}

let { season }: Props = $props();

const seasonConfig: Record<Season, { gradient: string; emoji: string; textColor: string }> = {
  spring: { gradient: 'from-pink-300 to-yellow-200', emoji: '🌸', textColor: 'text-pink-900' },
  summer: { gradient: 'from-sky-300 to-blue-200', emoji: '🌊', textColor: 'text-sky-900' },
  autumn: { gradient: 'from-amber-400 to-orange-300', emoji: '🍂', textColor: 'text-amber-950' },
  winter: { gradient: 'from-blue-800 to-slate-600', emoji: '❄️', textColor: 'text-white' },
};

let config = $derived(seasonConfig[season]);
</script>

<div class="inline-flex items-center gap-3 rounded-full bg-gradient-to-r px-8 py-4 text-xl font-bold shadow-md {config.gradient} {config.textColor}">
  <span class="text-2xl">{config.emoji}</span>
  <span>{$t(`common.season.${season}`)}</span>
</div>
