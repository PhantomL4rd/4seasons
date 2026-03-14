import type { PageLoad } from './$types';

export const load: PageLoad = ({ params }) => {
  return { data: params.data };
};
