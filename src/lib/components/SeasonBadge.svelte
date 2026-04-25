<script lang="ts">
import { Badge } from '$lib/components/ui/badge';
import { t } from '$lib/translations';
import type { Season } from '$lib/types';

interface Props {
  season: Season;
}

let { season }: Props = $props();

const emojiMap: Record<Season, string> = {
  spring: '🌸',
  summer: '🌊',
  autumn: '🍂',
  winter: '❄️',
};
</script>

<Badge variant={season} class="gap-3 px-8 py-4 text-xl font-bold shadow-md">
  <span class="text-2xl">{emojiMap[season]}</span>
  <span>{$t(`common.season.${season}`)}</span>
</Badge>
