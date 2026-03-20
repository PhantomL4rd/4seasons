import { error } from '@sveltejs/kit';
import type { Season } from '$lib/types';
import type { PageLoad } from './$types';

const VALID_SEASONS: Season[] = ['spring', 'summer', 'autumn', 'winter'];

export const load: PageLoad = ({ params }) => {
  const season = params.season as Season;

  if (!VALID_SEASONS.includes(season)) {
    error(404, 'Not found');
  }

  return { season };
};
