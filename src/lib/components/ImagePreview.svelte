<script lang="ts">
import { Button } from '$lib/components/ui/button';
import { t } from '$lib/translations';
import { type CropHandle, type CropRect, moveRect, resizeRect } from '$lib/utils/crop';

interface Props {
  previewUrl: string;
  onDiagnose: (crop?: CropRect) => void;
  onReset: () => void;
  isLoading?: boolean;
}

let { previewUrl, onDiagnose, onReset, isLoading = false }: Props = $props();

let crop: CropRect = $state({ x: 0, y: 0, width: 1, height: 1 });
let frameEl: HTMLDivElement | undefined = $state();

interface DragState {
  pointerId: number;
  mode: 'move' | CropHandle;
  lastX: number;
  lastY: number;
}
let drag: DragState | null = null;

function startDrag(event: PointerEvent, mode: 'move' | CropHandle) {
  (event.currentTarget as HTMLElement).setPointerCapture(event.pointerId);
  drag = { pointerId: event.pointerId, mode, lastX: event.clientX, lastY: event.clientY };
}

function handlePointerMove(event: PointerEvent) {
  if (!drag || event.pointerId !== drag.pointerId || !frameEl) return;
  const bounds = frameEl.getBoundingClientRect();
  const dx = (event.clientX - drag.lastX) / bounds.width;
  const dy = (event.clientY - drag.lastY) / bounds.height;
  drag.lastX = event.clientX;
  drag.lastY = event.clientY;
  crop = drag.mode === 'move' ? moveRect(crop, dx, dy) : resizeRect(crop, drag.mode, dx, dy);
}

function endDrag(event: PointerEvent) {
  if (drag?.pointerId === event.pointerId) drag = null;
}

// 枠がほぼ全体のままならクロップなしとして扱う（丸め誤差を許容）
const FULL_THRESHOLD = 0.999;

function handleDiagnose() {
  const isFull = crop.width >= FULL_THRESHOLD && crop.height >= FULL_THRESHOLD;
  onDiagnose(isFull ? undefined : crop);
}

const HANDLES: CropHandle[] = ['nw', 'ne', 'sw', 'se'];
// ハンドルは枠の内側に収まる位置に置く（コンテナの overflow-hidden でクリップされないように）
const handleClass: Record<CropHandle, string> = {
  nw: 'left-0 top-0 cursor-nwse-resize',
  ne: 'right-0 top-0 cursor-nesw-resize',
  sw: 'left-0 bottom-0 cursor-nesw-resize',
  se: 'right-0 bottom-0 cursor-nwse-resize',
};
// L字のコーナーマーカー（Instagram/iOS の写真編集でおなじみの見た目）
const cornerMarkClass: Record<CropHandle, string> = {
  nw: 'left-0 top-0 rounded-tl-[3px] border-t-[3px] border-l-[3px]',
  ne: 'right-0 top-0 rounded-tr-[3px] border-t-[3px] border-r-[3px]',
  sw: 'left-0 bottom-0 rounded-bl-[3px] border-b-[3px] border-l-[3px]',
  se: 'right-0 bottom-0 rounded-br-[3px] border-b-[3px] border-r-[3px]',
};
</script>

<svelte:window
  onpointermove={handlePointerMove}
  onpointerup={endDrag}
  onpointercancel={endDrag}
/>

<div class="flex flex-col items-center gap-6">
  <div class="flex flex-col items-center gap-2">
    <div
      bind:this={frameEl}
      class="relative touch-none overflow-hidden rounded-xl border shadow-sm"
    >
      <img
        src={previewUrl}
        alt="Preview"
        draggable="false"
        class="max-h-[480px] max-w-full select-none object-contain"
      />
      <div
        class="absolute border border-white/70 shadow-[0_0_0_9999px_rgba(0,0,0,0.55)]"
        style="left: {crop.x * 100}%; top: {crop.y * 100}%; width: {crop.width *
          100}%; height: {crop.height * 100}%;"
      >
        <button
          type="button"
          aria-label={$t('common.preview.cropMove')}
          class="absolute inset-0 h-full w-full cursor-move"
          onpointerdown={(e) => startDrag(e, 'move')}
        ></button>
        {#each HANDLES as handle (handle)}
          <button
            type="button"
            aria-label={$t('common.preview.cropResize')}
            class="absolute size-9 {handleClass[handle]}"
            onpointerdown={(e) => startDrag(e, handle)}
          >
            <span
              class="absolute size-5 border-white drop-shadow-sm {cornerMarkClass[handle]}"
            ></span>
          </button>
        {/each}
      </div>
    </div>
    <p class="text-center text-xs text-muted-foreground">{$t('common.preview.cropHint')}</p>
  </div>

  <div class="flex gap-3">
    <Button variant="outline" onclick={onReset} disabled={isLoading}>
      {$t('common.preview.retry')}
    </Button>
    <Button onclick={handleDiagnose} disabled={isLoading}>
      {#if isLoading}
        <span
          class="mr-2 inline-block h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent"
        ></span>
      {/if}
      {$t('common.preview.diagnose')}
    </Button>
  </div>
</div>
