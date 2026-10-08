import { Check } from 'lucide-react';
import type { Permission, StaffRole } from '@vastra/shared';
import { PERMISSION_LABELS, STAFF_ROLE_LABELS } from '@/utils/labels';

const ROLE_BLURB: Record<StaffRole, string> = {
  OWNER: 'Full access to everything.',
  MANAGER: 'Runs the shop day to day; cannot manage staff or billing.',
  SALES: 'Handles orders, customers and enquiries.',
  INVENTORY: 'Manages products, categories and stock.',
  ORDER_MANAGER: 'Processes orders and replies to enquiries.',
};

export function RolePermissions({ role, permissions }: { role: StaffRole; permissions: Permission[] | undefined }) {
  return (
    <div className="rounded-xl border bg-muted/40 p-3">
      <p className="text-sm font-medium">{STAFF_ROLE_LABELS[role]}</p>
      <p className="text-xs text-muted-foreground">{ROLE_BLURB[role]}</p>
      {permissions && (
        <ul className="mt-2 flex flex-wrap gap-x-4 gap-y-1">
          {permissions.map((p) => (
            <li key={p} className="flex items-center gap-1 text-xs text-muted-foreground"><Check className="h-3 w-3 text-success" />{PERMISSION_LABELS[p]}</li>
          ))}
        </ul>
      )}
    </div>
  );
}
