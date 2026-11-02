import { defineEnvVars } from '@sveltejs/kit/env';

export const variables = defineEnvVars({ GEMINI_API_KEY: { schema: (input) => input ?? '' } });
