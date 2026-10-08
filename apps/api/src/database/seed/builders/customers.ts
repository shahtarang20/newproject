import type { Types } from 'mongoose';
import type { ICustomerAddress } from '@/database/models/customer-address.model';
import type { ICustomer } from '@/database/models/customer.model';
import { CITIES_BY_STATE, CUSTOMER_NOTES, FIRST_NAMES, LANDMARKS, LAST_NAMES, OTHER_CITIES, STREETS, type CityDef } from '../data/customers';
import { DAY_MS, type Rng } from '../prng';
import type { ShopContext } from '../types';
import { newId } from '../util';

export interface DemoCustomer { userId: Types.ObjectId; name: string; email: string; phone: string }

export interface CustomerPlan {
  customers: ICustomer[];
  addresses: ICustomerAddress[];
  addressesOf: Map<string, ICustomerAddress[]>;
}

export function planCustomers(ctx: ShopContext, rng: Rng, now: Date, demo?: DemoCustomer): CustomerPlan {
  const { def, shopId } = ctx;
  const local = CITIES_BY_STATE[def.address.state] ?? OTHER_CITIES;
  const phones = new Set<string>(demo ? [demo.phone] : []);
  const names = new Set<string>();
  const customers: ICustomer[] = [];
  const addresses: ICustomerAddress[] = [];
  const addressesOf = new Map<string, ICustomerAddress[]>();

  for (let i = 0; i < def.customerCount; i++) {
    const isDemo = Boolean(demo) && i === 0;
    let name: string;
    do name = `${rng.pick(FIRST_NAMES)} ${rng.pick(LAST_NAMES)}`; while (names.has(name));
    names.add(name);
    let phone: string;
    do phone = `+9190${def.rngSeed % 10}${String(rng.int(0, 999_999)).padStart(6, '0')}`; while (phones.has(phone));
    phones.add(phone);
    if (isDemo && demo) { name = demo.name; phone = demo.phone; }

    const id = newId();
    const at = new Date(now.getTime() - rng.int(5, 75) * DAY_MS);
    const [first, last] = name.toLowerCase().split(' ');
    customers.push({
      _id: id, shopId, name, phone, email: isDemo && demo ? demo.email : rng.chance(0.65) ? `${first}.${last}${rng.int(1, 99)}@example.com` : undefined,
      userId: isDemo && demo ? demo.userId : null, tags: rng.chance(0.2) ? [rng.pick(['vip', 'festival-buyer', 'repeat'])] : [],
      notes: rng.chance(0.15) ? rng.pick(CUSTOMER_NOTES) : undefined, source: isDemo ? 'ACCOUNT' : 'MANUAL', isBlocked: false,
      stats: { ordersCount: 0, totalSpentMinor: 0, lastOrderAt: null }, createdAt: at, updatedAt: at,
    });

    const list: ICustomerAddress[] = [];
    const nAddr = rng.chance(0.3) ? 2 : 1;
    for (let a = 0; a < nAddr; a++) {
      const city: CityDef = rng.chance(0.85) ? rng.pick(local) : rng.pick(OTHER_CITIES);
      list.push({
        _id: newId(), shopId, customerId: id, label: a === 0 ? 'Home' : rng.pick(['Work', "Parents' home"]), isDefault: a === 0, name, phone,
        line1: `${rng.int(1, 240)}, ${rng.pick(STREETS)}`, line2: rng.chance(0.4) ? `Flat ${rng.int(101, 604)}` : undefined, landmark: rng.chance(0.5) ? rng.pick(LANDMARKS) : undefined,
        city: city.city, state: city.state, pincode: city.pincode, country: 'IN', createdAt: at, updatedAt: at,
      });
    }
    addresses.push(...list);
    addressesOf.set(String(id), list);
  }
  return { customers, addresses, addressesOf };
}
