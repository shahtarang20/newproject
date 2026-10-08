export const FIRST_NAMES = [
  'Aarav', 'Vivaan', 'Aditya', 'Arjun', 'Rohan', 'Kabir', 'Ishaan', 'Vihaan', 'Sahil', 'Nikhil',
  'Priya', 'Ananya', 'Diya', 'Kavya', 'Neha', 'Pooja', 'Riya', 'Sneha', 'Meera', 'Isha',
  'Anjali', 'Sunita', 'Kiran', 'Lakshmi', 'Divya', 'Shruti', 'Nandini', 'Radha', 'Pallavi', 'Tanvi',
];

export const LAST_NAMES = [
  'Sharma', 'Patel', 'Shah', 'Gupta', 'Mehta', 'Joshi', 'Desai', 'Verma', 'Iyer', 'Nair',
  'Reddy', 'Singh', 'Kapoor', 'Agarwal', 'Bhatt', 'Trivedi', 'Pandey', 'Mishra', 'Jain', 'Kulkarni',
];

export interface CityDef { city: string; state: string; pincode: string }

/** Customers mostly live in the shop's own state; a few elsewhere. */
export const CITIES_BY_STATE: Record<string, CityDef[]> = {
  Gujarat: [
    { city: 'Surat', state: 'Gujarat', pincode: '395007' }, { city: 'Surat', state: 'Gujarat', pincode: '395009' },
    { city: 'Ahmedabad', state: 'Gujarat', pincode: '380015' }, { city: 'Vadodara', state: 'Gujarat', pincode: '390007' },
    { city: 'Navsari', state: 'Gujarat', pincode: '396445' }, { city: 'Rajkot', state: 'Gujarat', pincode: '360001' },
  ],
  'Uttar Pradesh': [
    { city: 'Varanasi', state: 'Uttar Pradesh', pincode: '221005' }, { city: 'Lucknow', state: 'Uttar Pradesh', pincode: '226010' },
    { city: 'Prayagraj', state: 'Uttar Pradesh', pincode: '211001' }, { city: 'Kanpur', state: 'Uttar Pradesh', pincode: '208002' },
    { city: 'Gorakhpur', state: 'Uttar Pradesh', pincode: '273001' }, { city: 'Noida', state: 'Uttar Pradesh', pincode: '201301' },
  ],
  Maharashtra: [
    { city: 'Mumbai', state: 'Maharashtra', pincode: '400058' }, { city: 'Mumbai', state: 'Maharashtra', pincode: '400092' },
    { city: 'Pune', state: 'Maharashtra', pincode: '411045' }, { city: 'Thane', state: 'Maharashtra', pincode: '400601' },
    { city: 'Nashik', state: 'Maharashtra', pincode: '422005' }, { city: 'Navi Mumbai', state: 'Maharashtra', pincode: '400703' },
  ],
};

export const OTHER_CITIES: CityDef[] = [
  { city: 'Bengaluru', state: 'Karnataka', pincode: '560034' }, { city: 'Hyderabad', state: 'Telangana', pincode: '500081' },
  { city: 'Jaipur', state: 'Rajasthan', pincode: '302017' }, { city: 'Delhi', state: 'Delhi', pincode: '110017' },
  { city: 'Chennai', state: 'Tamil Nadu', pincode: '600040' },
];

export const STREETS = [
  'Shanti Nagar', 'Gandhi Road', 'Sector 12', 'MG Road', 'Lal Bagh Colony', 'Shiv Park', 'Laxmi Society', 'Nehru Marg',
  'Station Road', 'Krishna Kunj', 'Om Residency', 'Ganesh Apartments', 'Rose Villa', 'Patel Nagar', 'Sunrise Heights',
];

export const LANDMARKS = ['Near City Mall', 'Opp. Bus Stand', 'Behind Post Office', 'Next to Temple', 'Near Petrol Pump', 'Above Medical Store'];

export const CUSTOMER_NOTES = ['Prefers WhatsApp for updates', 'Regular festival buyer', 'Likes pastel colours', 'Usually buys in bulk for family', 'Asks for discounts, loyal customer'];

export const ENQUIRY_MESSAGES = [
  'Is this available in other colours? Please share photos.',
  'Do you have this in my size? I need it by next weekend.',
  'Can you give a discount if I buy two pieces?',
  'What is the fabric care for this? Can it be machine washed?',
  'Is cash on delivery available at my pincode?',
  'Please share a video of this product in daylight.',
  'Can the size be altered after purchase?',
  'Is this the same as the one shown in your Instagram post?',
  'Do you offer bulk pricing for a wedding group of 6?',
  'How long does delivery take to my city?',
  'Is a matching dupatta or blouse piece included?',
  'When will this be back in stock?',
];

export const ENQUIRY_REPLIES = [
  'Replied on WhatsApp with photos and price.',
  'Called the customer, confirmed availability and shared the payment link.',
  'Offered 5% off on two pieces; customer will confirm tomorrow.',
  'Shared care instructions and size chart.',
];

export const CANCEL_REASONS = ['Customer changed their mind', 'Ordered by mistake', 'Delivery address not serviceable', 'Found a lower price elsewhere', 'Duplicate order'];
export const REJECT_REASONS = ['Unable to verify order, customer unreachable', 'Item went out of stock before confirmation'];
