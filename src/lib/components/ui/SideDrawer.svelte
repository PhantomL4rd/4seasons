<script lang="ts">
import { Menu, MessageCircle, SwatchBook, TrendingUp, X } from '@lucide/svelte';
import { t } from '$lib/translations';

let isOpen = $state(false);

function open() {
  isOpen = true;
}

function close() {
  isOpen = false;
}

function handleKeydown(event: KeyboardEvent) {
  if (event.key === 'Escape') {
    close();
  }
}

function handleBackdropClick() {
  close();
}
</script>

<svelte:window onkeydown={handleKeydown} />

<!-- Trigger Button -->
<button
	onclick={open}
	class="p-2 rounded-md hover:bg-primary-foreground/10 transition-colors"
	aria-label={$t('common.aria.openMenu')}
>
	<Menu class="size-6" />
</button>

<!-- Backdrop -->
{#if isOpen}
	<div
		class="fixed inset-0 z-50 bg-black/50 transition-opacity duration-300"
		class:opacity-100={isOpen}
		class:opacity-0={!isOpen}
		onclick={handleBackdropClick}
		onkeydown={(e) => e.key === 'Enter' && handleBackdropClick()}
		role="button"
		tabindex="-1"
		aria-label={$t('common.aria.closeMenu')}
	></div>
{/if}

<!-- Drawer -->
<div
	class="fixed top-0 right-0 z-50 h-full w-64 bg-card text-card-foreground shadow-xl transition-transform duration-300 ease-out"
	class:translate-x-0={isOpen}
	class:translate-x-full={!isOpen}
	role="dialog"
	aria-modal="true"
	aria-label={$t('common.aria.openMenu')}
>
	<!-- Header -->
	<div class="flex items-center justify-between p-4 border-b border-border">
		<span class="font-bold">{$t('common.nav.menu')}</span>
		<button
			onclick={close}
			class="p-2 rounded-md hover:bg-accent transition-colors"
			aria-label={$t('common.aria.closeMenu')}
		>
			<X class="size-5" />
		</button>
	</div>

	<!-- Menu Items -->
	<nav class="p-2">
		<p class="px-3 py-2 text-xs text-muted-foreground">{$t('common.nav.links')}</p>

		<!-- カララントピッカー -->
		<a
			href="https://colorant-picker.pl4rd.com/"
			target="_blank"
			rel="noopener noreferrer"
			onclick={close}
			class="flex items-center gap-3 rounded-md px-3 py-3 text-sm hover:bg-accent transition-colors"
		>
			<SwatchBook class="size-5" />
			{$t('common.externalLinks.colorantPicker')}
		</a>

		<!-- ミラプリインサイト -->
		<a
			href="https://mirapri-insight.pl4rd.com/"
			target="_blank"
			rel="noopener noreferrer"
			onclick={close}
			class="flex items-center gap-3 rounded-md px-3 py-3 text-sm hover:bg-accent transition-colors"
		>
			<TrendingUp class="size-5" />
			{$t('common.externalLinks.mirapriInsight')}
		</a>

		<!-- 要望・感想 -->
		<a
			href="https://jp.finalfantasyxiv.com/lodestone/character/27344914/blog/5666405/"
			target="_blank"
			rel="noopener noreferrer"
			onclick={close}
			class="flex items-center gap-3 rounded-md px-3 py-3 text-sm hover:bg-accent transition-colors"
		>
			<MessageCircle class="size-5" />
			{$t('common.externalLinks.feedback')}
		</a>
	</nav>
</div>

<style>
	.translate-x-full {
		transform: translateX(100%);
	}

	.translate-x-0 {
		transform: translateX(0);
	}
</style>
