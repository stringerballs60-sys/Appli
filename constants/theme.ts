import { APP_COLORS } from './colors';

export const SHADOWS = {
  xs: {
    shadowColor: APP_COLORS.primaryDark,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 1,
  },
  sm: {
    shadowColor: APP_COLORS.primaryDark,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.07,
    shadowRadius: 8,
    elevation: 2,
  },
  md: {
    shadowColor: APP_COLORS.primaryDark,
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.10,
    shadowRadius: 14,
    elevation: 4,
  },
  lg: {
    shadowColor: APP_COLORS.primaryDark,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.13,
    shadowRadius: 22,
    elevation: 8,
  },
  gold: {
    shadowColor: APP_COLORS.accent,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.22,
    shadowRadius: 10,
    elevation: 5,
  },
  navy: {
    shadowColor: APP_COLORS.primary,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.28,
    shadowRadius: 14,
    elevation: 6,
  },
};

export const GRADIENTS = {
  navyDeep:    ['#050E1A', '#1B2B4B'] as string[],
  navyHeader:  ['#0A1628', '#1B2B4B', '#1F3258'] as string[],
  navyCard:    ['#1B2B4B', '#243756'] as string[],
  goldShimmer: ['#A87820', '#C9A84C', '#E2C87A'] as string[],
  goldSubtle:  ['#C9A84C', '#D4B86A'] as string[],
  warmBg:      ['#F4F1EB', '#EDE8DF'] as string[],
  surface:     ['#FFFFFF', '#FDFAF5'] as string[],
};

export const RADII = {
  xs:   6,
  sm:   10,
  md:   14,
  lg:   18,
  xl:   24,
  full: 999,
};

export const SPACING = {
  xs:  4,
  sm:  8,
  md:  12,
  lg:  16,
  xl:  20,
  xxl: 24,
};
