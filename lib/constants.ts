//lib/constraints.ts
export const STARTER_SETS = [
  {
    id: 'base1',
    name: 'Base Set',
    assetKey: 'base-set',
    releaseDate: '1999-01-09',
  },
  {
    id: 'base3',
    name: 'Fossil',
    assetKey: 'fossil',
    releaseDate: '1999-10-10',
  },
  {
    id: 'base2',
    name: 'Jungle',
    assetKey: 'jungle',
    releaseDate: '1999-06-16',
  },
  {
    id: 'base4',
    name: 'Base Set 2',
    assetKey: 'base-set-2',
    releaseDate: '2000-02-24',
  },
  {
    id: 'base5',
    name: 'Team Rocket',
    assetKey: 'team-rocket',
    releaseDate: '2000-04-24',
  },
  {
    id: 'basep',
    name: 'Wizards Black Star Promos',
    assetKey: 'wizards-promos',
    releaseDate: '1999-07-01',
  },
  {
    id: 'gym1',
    name: 'Gym Heroes',
    assetKey: 'gym-heroes',
    releaseDate: '2000-08-14',
  },
  {
    id: 'gym2',
    name: 'Gym Challenge',
    assetKey: 'gym-challenge',
    releaseDate: '2000-10-16',
  },
];

export const SET_LOGO_ASSETS: Record<string, any> = {
  'base-set': require('@/assets/images/base-set-logo-january-8th-1999.png'),
  'jungle': require('@/assets/images/jungle-set-logo-june-15th-1999.png'),
  'fossil': require('@/assets/images/fossil-set-logo-october-9th-1999.png'),
  'team-rocket': require('@/assets/images/team-rocket-logo-april-23rd-2000.png'),
  'base-set-2': require('@/assets/images/base-set-2-logo-february-23rd-2000.png'),
  'gym-heroes': require('@/assets/images/gym-heroes-logo-august-13th-2000.png'),
  'gym-challenge': require('@/assets/images/gym-challenge-logo-october-15th-2000.png'),
  'wizards-promos': require('@/assets/images/wizards-black-star-promos-logo-june-30th-1999.png'),
};

export const GRADING_COMPANIES = [
  { value: 'PSA', label: 'PSA' },
  { value: 'CGC', label: 'CGC' },
  { value: 'BGS', label: 'Beckett (BGS)' },
  { value: 'SGC', label: 'SGC' },
  { value: 'RAW', label: 'Raw (Ungraded)' },
  { value: 'OTHER', label: 'Other' },
];

export const VARIANTS = [
  { value: '1st_edition', label: '1st Edition' },
  { value: 'shadowless', label: 'Shadowless' },
  { value: 'unlimited', label: 'Unlimited' },
  { value: 'reverse_holo', label: 'Reverse Holo' },
  { value: 'other', label: 'Other' },
];

export const PHASE2_ENABLED =
  process.env.EXPO_PUBLIC_PHASE2_MARKETPLACE_ENABLED === 'true';
