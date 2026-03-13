<script lang="ts">
import { t } from '$lib/translations';
</script>

<div class="flex flex-col items-center justify-center gap-6 py-16">
  <div class="season-spinner">
    <div class="dot dot-spring"></div>
    <div class="dot dot-summer"></div>
    <div class="dot dot-autumn"></div>
    <div class="dot dot-winter"></div>
  </div>

  <div class="text-center">
    <p class="text-lg font-medium">{$t('common.loading.analyzing')}</p>
    <p class="mt-1 text-sm text-muted-foreground">{$t('common.loading.tip')}</p>
  </div>
</div>

<style>
  .season-spinner {
    position: relative;
    width: 64px;
    height: 64px;
    animation: spin 2s linear infinite;
  }

  .dot {
    position: absolute;
    width: 16px;
    height: 16px;
    border-radius: 50%;
  }

  .dot-spring {
    top: 0;
    left: 50%;
    transform: translateX(-50%);
    background-color: var(--color-spring);
  }

  .dot-summer {
    top: 50%;
    right: 0;
    transform: translateY(-50%);
    background-color: var(--color-summer);
  }

  .dot-autumn {
    bottom: 0;
    left: 50%;
    transform: translateX(-50%);
    background-color: var(--color-autumn);
  }

  .dot-winter {
    top: 50%;
    left: 0;
    transform: translateY(-50%);
    background-color: var(--color-winter);
  }

  @keyframes spin {
    to {
      transform: rotate(360deg);
    }
  }
</style>
