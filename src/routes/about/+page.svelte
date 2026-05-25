<script lang="ts">
import { t } from '$lib/translations';
</script>

<svelte:head>
  <title>{$t('common.nav.about')} - {$t('common.title')}</title>
  <meta name="description" content={$t('common.about.p1')} />
  <link rel="canonical" href="https://4seasons.pl4rd.com/about" />
  {@html `<script type="application/ld+json">${JSON.stringify({
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: [1, 2, 3, 4, 5].map((i) => ({
      '@type': 'Question',
      name: $t(`common.faq.q${i}`),
      acceptedAnswer: { '@type': 'Answer', text: $t(`common.faq.a${i}`) },
    })),
  })}</script>`}
</svelte:head>

<article class="mx-auto max-w-3xl space-y-12 text-sm leading-relaxed text-foreground">
  <header>
    <h1 class="text-2xl font-bold">{$t('common.nav.about')}</h1>
  </header>

  <section>
    <h2 class="mb-3 text-xl font-bold">{$t('common.about.title')}</h2>
    <p class="mb-3 text-muted-foreground">{$t('common.about.p1')}</p>
    <p class="text-muted-foreground">{$t('common.about.p2')}</p>
  </section>

  <section>
    <h2 class="mb-3 text-xl font-bold">{$t('common.usage.title')}</h2>
    <ol class="list-inside list-decimal space-y-2 text-muted-foreground">
      <li>{$t('common.usage.step1')}</li>
      <li>{$t('common.usage.step2')}</li>
      <li>{$t('common.usage.step3')}</li>
      <li>{$t('common.usage.step4')}</li>
      <li>{$t('common.usage.step5')}</li>
    </ol>
  </section>

  <section>
    <h2 class="mb-3 text-xl font-bold">{$t('common.faq.title')}</h2>
    <div class="space-y-2">
      {#each [1, 2, 3, 4, 5] as i (i)}
        <details class="rounded-lg border border-border bg-card p-4">
          <summary class="cursor-pointer font-semibold">{$t(`common.faq.q${i}`)}</summary>
          <p class="mt-2 text-muted-foreground">{$t(`common.faq.a${i}`)}</p>
        </details>
      {/each}
    </div>
  </section>
</article>
