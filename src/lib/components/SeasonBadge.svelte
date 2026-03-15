<script lang="ts">
import { t } from '$lib/translations';
import type { Season } from '$lib/types';

interface Props {
  season: Season;
}

let { season }: Props = $props();

const seasonConfig: Record<Season, { gradient: string; emoji: string }> = {
  spring: { gradient: 'from-pink-300 to-yellow-200', emoji: '🌸' },
  summer: { gradient: 'from-sky-300 to-blue-200', emoji: '🌊' },
  autumn: { gradient: 'from-amber-400 to-orange-300', emoji: '🍂' },
  winter: { gradient: 'from-blue-800 to-slate-600', emoji: '❄️' },
};

let config = $derived(seasonConfig[season]);
let isWinter = $derived(season === 'winter');
</script>

<div class="inline-flex items-center gap-3 rounded-full bg-gradient-to-r px-6 py-3 text-lg font-bold shadow-md {config.gradient} {isWinter ? 'text-white' : 'text-gray-800'}">
  <span class="text-2xl">{config.emoji}</span>
  <span>{$t(`common.season.${season}`)}</span>
</div>
