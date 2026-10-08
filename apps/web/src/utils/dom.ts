/**
 * `fetchpriority` hint for <img>. React 18 warns on the camelCase `fetchPriority` prop (supported from React 19),
 * so emit the lowercase attribute via spread: `<img {...fetchPriority('high')} />`.
 */
export const fetchPriority = (value: 'high' | 'low' | 'auto'): Record<string, string> => ({ fetchpriority: value });
