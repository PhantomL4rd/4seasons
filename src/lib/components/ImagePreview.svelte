<script lang="ts">
import { Button } from '$lib/components/ui/button';
import { t } from '$lib/translations';

interface Props {
  previewUrl: string;
  onDiagnose: () => void;
  onReset: () => void;
  isLoading?: boolean;
}

let { previewUrl, onDiagnose, onReset, isLoading = false }: Props = $props();
</script>

<div class="flex flex-col items-center gap-6">
  <div class="overflow-hidden rounded-xl border shadow-sm">
    <img
      src={previewUrl}
      alt="Preview"
      class="max-h-[480px] max-w-full object-contain"
    />
  </div>

  <div class="flex gap-3">
    <Button variant="outline" onclick={onReset} disabled={isLoading}>
      {$t('common.preview.retry')}
    </Button>
    <Button onclick={onDiagnose} disabled={isLoading}>
      {#if isLoading}
        <span class="mr-2 inline-block h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent"></span>
      {/if}
      {$t('common.preview.diagnose')}
    </Button>
  </div>
</div>
