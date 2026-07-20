<script lang="ts">
import { Home, Info, Menu, MessageCircle, VenetianMask, X } from '@lucide/svelte';
import { Button } from '$lib/components/ui/button';
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
<Button variant="ghost" size="icon" onclick={open} aria-label={$t('common.aria.openMenu')}>
	<Menu class="size-5" />
</Button>

<!-- Backdrop -->
{#if isOpen}
	<div
		class="fixed inset-0 z-50 bg-black/50"
		onclick={handleBackdropClick}
		onkeydown={(e) => e.key === 'Enter' && handleBackdropClick()}
		role="button"
		tabindex="-1"
		aria-label={$t('common.aria.closeMenu')}
	></div>
{/if}

<!-- Drawer -->
<div
	class="fixed top-0 right-0 z-50 h-full w-64 bg-card text-card-foreground shadow-xl transition-transform duration-300 ease-out {isOpen ? 'translate-x-0' : 'translate-x-full'}"
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
		<!-- このサイトについて -->
		<a
			href="/about"
			onclick={close}
			class="flex items-center gap-3 rounded-md px-3 py-3 text-sm hover:bg-accent transition-colors"
		>
			<Info class="size-5" />
			{$t('common.nav.about')}
		</a>

		<p class="px-3 py-2 text-xs text-muted-foreground">{$t('common.nav.links')}</p>

		<!-- ホーム -->
		<a
			href="https://pl4rd.com/"
			target="_blank"
			rel="noopener noreferrer"
			onclick={close}
			class="flex items-center gap-3 rounded-md px-3 py-3 text-sm hover:bg-accent transition-colors"
		>
			<Home class="size-5" />
			{$t('common.externalLinks.home')}
		</a>

		<!-- プライバシーポリシー -->
		<a
			href="https://pl4rd.com/privacy"
			target="_blank"
			rel="noopener noreferrer"
			onclick={close}
			class="flex items-center gap-3 rounded-md px-3 py-3 text-sm hover:bg-accent transition-colors"
		>
			<VenetianMask class="size-5" />
			{$t('common.externalLinks.privacy')}
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
