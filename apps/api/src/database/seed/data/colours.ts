/** Colour name -> hex used for variants. */
export const COLOURS: Record<string, string> = {
  White: '#FFFFFF', Black: '#111111', Navy: '#1F2A56', 'Sky Blue': '#87CEEB', Beige: '#D8C3A5', Olive: '#6B6B2E',
  Maroon: '#800020', Red: '#C0392B', Charcoal: '#36454F', Grey: '#808080', Mustard: '#E1AD01', Pink: '#E75480',
  Peach: '#FFCBA4', Green: '#2E8B57', 'Bottle Green': '#0B5D3B', 'Royal Blue': '#2850A8', Teal: '#008080',
  Purple: '#6A3D9A', Wine: '#722F37', Gold: '#D4AF37', Cream: '#F5EBD3', Ivory: '#FFFFF0', Rust: '#B7410E',
  Turquoise: '#30D5C8', Magenta: '#CA1F7B', Orange: '#F28C28', Lavender: '#B497D6', Mint: '#98D8B8', Rani: '#D81B60',
  Indigo: '#3F51B5', 'Light Wash': '#9DB8D2', 'Dark Wash': '#2B3A55', 'Mid Wash': '#5B7DA6', Khaki: '#B5A642', Brown: '#6F4E37',
};

export const hexOf = (name: string): string => COLOURS[name] ?? '#999999';
