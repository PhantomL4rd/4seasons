<script lang="ts">
import { Button } from '$lib/components/ui/button';
import { t } from '$lib/translations';
import { validateFile } from '$lib/utils/image';

interface Props {
  onFileSelect: (file: File) => void;
  onError: (errorKey: string) => void;
}

let { onFileSelect, onError }: Props = $props();

let isDragOver = $state(false);
let fileInput: HTMLInputElement | undefined = $state();

function handleFile(file: File) {
  const error = validateFile(file);
  if (error) {
    onError(error);
    return;
  }
  onFileSelect(file);
}

function handleDrop(e: DragEvent) {
  e.preventDefault();
  isDragOver = false;
  const file = e.dataTransfer?.files[0];
  if (file) handleFile(file);
}

function handleDragOver(e: DragEvent) {
  e.preventDefault();
  isDragOver = true;
}

function handleDragLeave() {
  isDragOver = false;
}

function handleInputChange(e: Event) {
  const target = e.target as HTMLInputElement;
  const file = target.files?.[0];
  if (file) handleFile(file);
}

function openFileDialog() {
  fileInput?.click();
}
</script>

<div
  class="flex flex-col items-center justify-center rounded-xl border-2 border-dashed p-12 transition-colors
    {isDragOver ? 'border-primary bg-primary/5' : 'border-muted-foreground/25 hover:border-primary/50'}"
  role="button"
  tabindex="0"
  ondrop={handleDrop}
  ondragover={handleDragOver}
  ondragleave={handleDragLeave}
  onclick={openFileDialog}
  onkeydown={(e) => { if (e.key === 'Enter' || e.key === ' ') openFileDialog(); }}
>
  <div class="mb-4 text-5xl">
    <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" class="text-muted-foreground">
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <polyline points="17 8 12 3 7 8" />
      <line x1="12" y1="3" x2="12" y2="15" />
    </svg>
  </div>
  <h2 class="mb-2 text-lg font-semibold">{$t('common.upload.title')}</h2>
  <p class="mb-4 text-center text-sm text-muted-foreground">
    {$t('common.upload.description')}
  </p>
  <Button variant="outline" onclick={(e: MouseEvent) => { e.stopPropagation(); openFileDialog(); }}>
    {$t('common.upload.button')}
  </Button>
  <p class="mt-3 text-xs text-muted-foreground">{$t('common.upload.sizeLimit')}</p>

  <input
    bind:this={fileInput}
    type="file"
    accept="image/jpeg,image/png"
    class="hidden"
    onchange={handleInputChange}
  />
</div>
