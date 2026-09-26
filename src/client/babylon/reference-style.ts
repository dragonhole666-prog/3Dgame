export const XIANXIA_REFERENCE_20260926 = {
  id: 'xianxia-reference-20260926',
  source: 'user-reference-1200x675',
  target: {
    medianSaturation: 0.4091,
    p90Saturation: 0.7341,
    medianValue: 0.4471,
    p90Value: 0.9020,
    lowSaturationShare: 0.1964,
    highSaturationShare: 0.3064,
    shadowShare: 0.0834,
    highlightShare: 0.1016,
  },
  palette: {
    lakeDeep: '#1F4457',
    inkShadow: '#221F1D',
    hazeBlue: '#4A6579',
    timberDark: '#5A3C32',
    mapleMid: '#945D52',
    skyLight: '#C7E0EA',
    mountainBlue: '#7091A6',
    warmHighlight: '#CB9C8E',
    mapleBright: '#D97A5E',
    maplePeach: '#E4A082',
    foliageShadow: '#6A332B',
    grassSage: '#718161',
    stoneWarm: '#A9A49A',
  },
} as const;

export type XianxiaReferenceProfile = typeof XIANXIA_REFERENCE_20260926;
