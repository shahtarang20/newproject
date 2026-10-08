import { SettingsSection } from './SettingsSection';
import { TextField } from './fields';

export function ContactSection() {
  return (
    <SettingsSection id="contact" title="Contact & address" description="Shown on your storefront and used for customer enquiries.">
      <div className="grid gap-4 sm:grid-cols-2">
        <TextField name="address.line1" label="Address line 1" className="sm:col-span-2" autoComplete="address-line1" />
        <TextField name="address.line2" label="Address line 2" className="sm:col-span-2" autoComplete="address-line2" />
        <TextField name="address.city" label="City" autoComplete="address-level2" />
        <TextField name="address.state" label="State" autoComplete="address-level1" />
        <TextField name="address.pincode" label="Pincode" inputMode="numeric" maxLength={12} autoComplete="postal-code" />
        <TextField name="address.country" label="Country code" maxLength={2} hint="2-letter code, e.g. IN" />
        <TextField name="contact.phone" label="Phone" type="tel" inputMode="tel" autoComplete="tel" />
        <TextField name="contact.whatsapp" label="WhatsApp number" type="tel" inputMode="tel" hint="With country code, e.g. 919876543210" />
        <TextField name="contact.email" label="Public email" type="email" inputMode="email" className="sm:col-span-2" />
        <TextField name="socials.instagram" label="Instagram" placeholder="https://instagram.com/yourshop" />
        <TextField name="socials.facebook" label="Facebook" placeholder="https://facebook.com/yourshop" />
      </div>
    </SettingsSection>
  );
}
