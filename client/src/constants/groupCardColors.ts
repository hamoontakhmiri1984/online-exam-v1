export const GROUP_CARD_DEFAULT_COLOR = 'Default' as const;

export const GROUP_CARD_COLOR_OPTIONS = [
  { value: 'Stone', label: 'خاکستری سنگی', swatch: '#dfe3e7' },
  { value: 'BlueGray', label: 'آبی خاکستری', swatch: '#dce6ec' },
  { value: 'Sage', label: 'سبز مریم‌گلی', swatch: '#e1e9df' },
  { value: 'Sand', label: 'بژ گرم', swatch: '#eee6d8' },
  { value: 'Lavender', label: 'یاسی ملایم', swatch: '#e9e3ed' },
  { value: 'Teal', label: 'سبزآبی خنثی', swatch: '#dce8e5' },
] as const;

export type GroupCardColor =
  | typeof GROUP_CARD_DEFAULT_COLOR
  | (typeof GROUP_CARD_COLOR_OPTIONS)[number]['value'];

export type GroupCardTheme = {
  border: string;
  borderDark: string;
  face: string;
  faceDark: string;
  ink: string;
  inkDark: string;
  muted: string;
  mutedDark: string;
  accent: string;
  accentDark: string;
  accentSoft: string;
  iconBorder: string;
  iconBorderDark: string;
  iconBg: string;
  iconBgDark: string;
  footerBorder: string;
  footerBorderDark: string;
  footerBg: string;
  footerBgDark: string;
};

export const GROUP_CARD_THEMES: Record<GroupCardColor, GroupCardTheme> = {
  Default: {
    border: '#ddd6fe',
    borderDark: 'rgba(196,181,253,.3)',
    face: 'linear-gradient(to bottom left,#d8c6fa,#e4d7fb 52%,#f0e9ff)',
    faceDark: 'linear-gradient(to bottom left,#5d457e,#4a3766 52%,#352849)',
    ink: '#2e1065',
    inkDark: '#ffffff',
    muted: '#4c3d65',
    mutedDark: '#f0e9ff',
    accent: '#5b21b6',
    accentDark: '#f5eaff',
    accentSoft: 'rgba(139,92,246,.14)',
    iconBorder: 'rgba(196,181,253,.7)',
    iconBorderDark: 'rgba(255,255,255,.25)',
    iconBg: 'rgba(255,255,255,.55)',
    iconBgDark: 'rgba(255,255,255,.1)',
    footerBorder: '#c4b5fd',
    footerBorderDark: 'rgba(167,139,250,.4)',
    footerBg: '#fcfaff',
    footerBgDark: '#231e38',
  },
  Stone: {
    border: '#cbd1d7',
    borderDark: '#505b66',
    face: 'linear-gradient(to bottom left,#e1e5e8,#edf0f2 52%,#f7f8f9)',
    faceDark: 'linear-gradient(to bottom left,#46515c,#3b444e 52%,#303840)',
    ink: '#394550',
    inkDark: '#f4f6f8',
    muted: '#68747f',
    mutedDark: '#d3d9de',
    accent: '#687784',
    accentDark: '#dce2e7',
    accentSoft: 'rgba(100,116,139,.13)',
    iconBorder: '#c4cbd2',
    iconBorderDark: '#68737d',
    iconBg: 'rgba(255,255,255,.62)',
    iconBgDark: 'rgba(255,255,255,.1)',
    footerBorder: '#cbd1d7',
    footerBorderDark: '#505b66',
    footerBg: '#f7f8f9',
    footerBgDark: '#272e35',
  },
  BlueGray: {
    border: '#c5d2dc',
    borderDark: '#506575',
    face: 'linear-gradient(to bottom left,#dce6ec,#eaf0f4 52%,#f5f8fa)',
    faceDark: 'linear-gradient(to bottom left,#3b5364,#324858 52%,#293d4b)',
    ink: '#344d5e',
    inkDark: '#f1f6f9',
    muted: '#617888',
    mutedDark: '#d1dee6',
    accent: '#607d90',
    accentDark: '#d7e5ed',
    accentSoft: 'rgba(96,125,144,.13)',
    iconBorder: '#c5d2dc',
    iconBorderDark: '#607a8c',
    iconBg: 'rgba(255,255,255,.62)',
    iconBgDark: 'rgba(255,255,255,.1)',
    footerBorder: '#c5d2dc',
    footerBorderDark: '#506575',
    footerBg: '#f4f7f9',
    footerBgDark: '#243540',
  },
  Sage: {
    border: '#cbd7c8',
    borderDark: '#526750',
    face: 'linear-gradient(to bottom left,#e1e9df,#edf2eb 52%,#f7f9f6)',
    faceDark: 'linear-gradient(to bottom left,#465a48,#3a4d3d 52%,#2f4032)',
    ink: '#3f5541',
    inkDark: '#f2f6f0',
    muted: '#687e69',
    mutedDark: '#d4dfd1',
    accent: '#6e876e',
    accentDark: '#dce8d8',
    accentSoft: 'rgba(110,135,110,.13)',
    iconBorder: '#cbd7c8',
    iconBorderDark: '#637b62',
    iconBg: 'rgba(255,255,255,.62)',
    iconBgDark: 'rgba(255,255,255,.1)',
    footerBorder: '#cbd7c8',
    footerBorderDark: '#526750',
    footerBg: '#f5f8f3',
    footerBgDark: '#29372b',
  },
  Sand: {
    border: '#ded2bd',
    borderDark: '#76664f',
    face: 'linear-gradient(to bottom left,#eee6d8,#f4efe6 52%,#faf8f3)',
    faceDark: 'linear-gradient(to bottom left,#5a4d3b,#4c4133 52%,#3d352b)',
    ink: '#5c4e3d',
    inkDark: '#faf5eb',
    muted: '#85745d',
    mutedDark: '#e4d8c5',
    accent: '#947f61',
    accentDark: '#eadcc4',
    accentSoft: 'rgba(148,127,97,.14)',
    iconBorder: '#ded2bd',
    iconBorderDark: '#89775d',
    iconBg: 'rgba(255,255,255,.62)',
    iconBgDark: 'rgba(255,255,255,.1)',
    footerBorder: '#ded2bd',
    footerBorderDark: '#76664f',
    footerBg: '#faf8f3',
    footerBgDark: '#342d24',
  },
  Lavender: {
    border: '#d6cddd',
    borderDark: '#6c5d75',
    face: 'linear-gradient(to bottom left,#e9e3ed,#f0edf3 52%,#f9f7fa)',
    faceDark: 'linear-gradient(to bottom left,#51465a,#443a4c 52%,#382f3f)',
    ink: '#51465a',
    inkDark: '#f7f3f9',
    muted: '#786b80',
    mutedDark: '#ded5e4',
    accent: '#85748f',
    accentDark: '#e6ddeb',
    accentSoft: 'rgba(133,116,143,.14)',
    iconBorder: '#d6cddd',
    iconBorderDark: '#796a82',
    iconBg: 'rgba(255,255,255,.62)',
    iconBgDark: 'rgba(255,255,255,.1)',
    footerBorder: '#d6cddd',
    footerBorderDark: '#6c5d75',
    footerBg: '#f9f7fa',
    footerBgDark: '#302a36',
  },
  Teal: {
    border: '#c6d7d3',
    borderDark: '#506c67',
    face: 'linear-gradient(to bottom left,#dce8e5,#eaf1ef 52%,#f6f9f8)',
    faceDark: 'linear-gradient(to bottom left,#405a55,#354d49 52%,#2b403d)',
    ink: '#3d5651',
    inkDark: '#f1f7f5',
    muted: '#66817b',
    mutedDark: '#d0dfdb',
    accent: '#688780',
    accentDark: '#d9e8e4',
    accentSoft: 'rgba(104,135,128,.14)',
    iconBorder: '#c6d7d3',
    iconBorderDark: '#628079',
    iconBg: 'rgba(255,255,255,.62)',
    iconBgDark: 'rgba(255,255,255,.1)',
    footerBorder: '#c6d7d3',
    footerBorderDark: '#506c67',
    footerBg: '#f5f9f7',
    footerBgDark: '#273633',
  },
};
