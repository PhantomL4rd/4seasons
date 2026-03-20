<script lang="ts">
import { t } from '$lib/translations';
import type { Dye } from '$lib/types';
import { rgbToHex } from '$lib/utils/color';
import { getDyeName } from '$lib/utils/dye';

interface Props {
  dye: Dye;
}

let { dye }: Props = $props();
</script>

<a
  href="https://colorant-picker.pl4rd.com/?dye={dye.id}"
  target="_blank"
  rel="noopener noreferrer"
  class="group overflow-hidden rounded-lg border transition-colors hover:bg-accent"
>
  <div
    class="h-12 w-full"
    style="background-color: {rgbToHex(dye.rgb.r, dye.rgb.g, dye.rgb.b)}"
  ></div>
  <div class="flex items-center gap-2 px-3 py-2">
    <p class="min-w-0 flex-1 truncate text-sm font-medium">{getDyeName(dye, $t)}</p>
    <svg xmlns="http://www.w3.org/2000/svg" class="size-3.5 shrink-0 text-muted-foreground" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
      <polyline points="15 3 21 3 21 9" />
      <line x1="10" y1="14" x2="21" y2="3" />
    </svg>
  </div>
</a>
