export const getFamilyName = (familyId) => {
  const familyNames = {
    'AC': 'Access Control',
    'AT': 'Awareness and Training',
    'AU': 'Audit and Accountability',
    'CA': 'Assessment & Authorization',
    'CM': 'Configuration Management',
    'CP': 'Contingency Planning',
    'IA': 'Identification & Authentication',
    'IR': 'Incident Response',
    'MA': 'Maintenance',
    'MP': 'Media Protection',
    'PE': 'Physical & Environmental',
    'PL': 'Planning',
    'PS': 'Personnel Security',
    'RA': 'Risk Assessment',
    'SA': 'System & Services Acquisition',
    'SC': 'System & Communications',
    'SI': 'System & Information Integrity'
  };
  return familyNames[familyId] || familyId;
};

export const getFamilyColors = (family) => {
  const colors = {
    AC: { primary: 'hsl(262 83% 58%)', light: 'hsl(262 100% 95%)', dark: 'hsl(262 83% 38%)' },
    AU: { primary: 'hsl(142 71% 45%)', light: 'hsl(142 76% 95%)', dark: 'hsl(142 71% 35%)' },
    AT: { primary: 'hsl(25 95% 53%)', light: 'hsl(25 100% 95%)', dark: 'hsl(25 95% 43%)' },
    CM: { primary: 'hsl(291 64% 42%)', light: 'hsl(291 100% 95%)', dark: 'hsl(291 64% 32%)' },
    CP: { primary: 'hsl(0 72% 51%)', light: 'hsl(0 100% 95%)', dark: 'hsl(0 72% 41%)' },
    IA: { primary: 'hsl(217 91% 60%)', light: 'hsl(217 100% 95%)', dark: 'hsl(217 91% 50%)' },
    IR: { primary: 'hsl(351 95% 71%)', light: 'hsl(351 100% 95%)', dark: 'hsl(351 95% 61%)' },
    MA: { primary: 'hsl(239 84% 67%)', light: 'hsl(239 100% 95%)', dark: 'hsl(239 84% 57%)' },
    MP: { primary: 'hsl(43 96% 56%)', light: 'hsl(43 100% 95%)', dark: 'hsl(43 96% 46%)' },
    PE: { primary: 'hsl(160 84% 39%)', light: 'hsl(160 100% 95%)', dark: 'hsl(160 84% 29%)' },
    PL: { primary: 'hsl(258 90% 66%)', light: 'hsl(258 100% 95%)', dark: 'hsl(258 90% 56%)' },
    PS: { primary: 'hsl(45 93% 47%)', light: 'hsl(45 100% 95%)', dark: 'hsl(45 93% 37%)' },
    RA: { primary: 'hsl(258 100% 50%)', light: 'hsl(258 100% 95%)', dark: 'hsl(258 100% 40%)' },
    SA: { primary: 'hsl(221 83% 53%)', light: 'hsl(221 100% 95%)', dark: 'hsl(221 83% 43%)' },
    SC: { primary: 'hsl(172 66% 50%)', light: 'hsl(172 100% 95%)', dark: 'hsl(172 66% 40%)' },
    SI: { primary: 'hsl(336 84% 57%)', light: 'hsl(336 100% 95%)', dark: 'hsl(336 84% 47%)' },
    CA: { primary: 'hsl(329 86% 70%)', light: 'hsl(329 100% 95%)', dark: 'hsl(329 86% 60%)' },
    default: { primary: 'hsl(215 16% 47%)', light: 'hsl(215 20% 95%)', dark: 'hsl(215 16% 37%)' }
  };
  return colors[family] || colors.default;
};
