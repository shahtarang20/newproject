import { useFormContext, useWatch } from 'react-hook-form';
import type { ShopSettingsForm } from '../schemas';
import { SettingsSection, ToggleRow } from './SettingsSection';
import { SwitchField, TextField } from './fields';

export function PaymentsSection() {
  const { control } = useFormContext<ShopSettingsForm>();
  const online = useWatch({ control, name: 'paymentSettings.onlineEnabled' });
  return (
    <SettingsSection id="payments" title="Payments" description="Payment methods offered at checkout. At least one must stay on.">
      <div className="space-y-3">
        <ToggleRow title="Cash on delivery" description="Customer pays in cash when the order is delivered.">
          <SwitchField name="paymentSettings.codEnabled" label="Cash on delivery" />
        </ToggleRow>
        <ToggleRow
          title="Online payment"
          description="Cards, UPI and net banking via the platform payment provider. Turning this on only works when a payment provider is configured on the server; otherwise saving will return an error."
        >
          <SwitchField name="paymentSettings.onlineEnabled" label="Online payment" />
        </ToggleRow>
        <ToggleRow title="Pay at shop" description="Customer reserves online and pays when they pick up in store.">
          <SwitchField name="paymentSettings.payAtShopEnabled" label="Pay at shop" />
        </ToggleRow>
        <TextField name="paymentSettings.upiId" label="UPI ID (optional)" placeholder="yourshop@upi" hint={online ? 'Shown to customers as an alternative way to pay.' : 'Shown to customers on pay-at-shop / COD instructions.'} />
      </div>
    </SettingsSection>
  );
}

export function ShippingSection() {
  const { control } = useFormContext<ShopSettingsForm>();
  const delivery = useWatch({ control, name: 'shippingSettings.deliveryEnabled' });
  return (
    <SettingsSection id="shipping" title="Shipping" description="Delivery and pickup options. At least one must stay on.">
      <div className="space-y-3">
        <ToggleRow title="Home delivery" description="Deliver orders to the customer's address.">
          <SwitchField name="shippingSettings.deliveryEnabled" label="Home delivery" />
        </ToggleRow>
        <ToggleRow title="Store pickup" description="Let customers collect orders from your shop.">
          <SwitchField name="shippingSettings.pickupEnabled" label="Store pickup" />
        </ToggleRow>
        {delivery && (
          <div className="grid gap-4 sm:grid-cols-2">
            <TextField name="shippingSettings.flatRate" label="Flat delivery fee" inputMode="decimal" placeholder="0" hint="In your shop currency. 0 means free delivery." />
            <TextField name="shippingSettings.freeAbove" label="Free delivery above" inputMode="decimal" placeholder="e.g. 2000" hint="Leave empty to always charge the flat fee." />
          </div>
        )}
      </div>
    </SettingsSection>
  );
}
