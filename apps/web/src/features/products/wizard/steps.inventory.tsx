import { Input } from '@/components/ui/input';
import { useWizard } from './context';
import { Field, StepCard } from './fields';
import { BulkFill, VariantRowsTable } from './VariantRowsTable';

export function InventoryStep() {
  const { form, canStock } = useWizard();
  const variants = form.watch('variants');
  const total = variants.reduce((s, r) => s + (Number(r.stock) || 0), 0);
  return (
    <div className="space-y-4">
      <StepCard title="Stock per variant" description={`Total in stock: ${total}`}>
        {!canStock && <p className="rounded-lg bg-warning/10 p-3 text-sm">Your role cannot change stock levels (needs inventory access). Existing values are shown read-only.</p>}
        {variants.length === 0 ? (
          <p className="text-sm text-muted-foreground">Add variants first to manage stock.</p>
        ) : (
          <>
            <div className="flex flex-wrap gap-3">
              <BulkFill field="stock" label="Set stock for all" placeholder="Qty" />
              <BulkFill field="lowStock" label="Set alert for all" placeholder="Threshold" />
            </div>
            <VariantRowsTable columns={['variant', 'stock', 'lowStock']} />
          </>
        )}
      </StepCard>
      <StepCard title="Low-stock alert" description="You are notified when stock falls to this level. Used for variants without their own threshold.">
        <Field label="Default threshold" path="lowStockThreshold" className="max-w-xs">
          <Input {...form.register('lowStockThreshold')} inputMode="numeric" placeholder="5" />
        </Field>
      </StepCard>
    </div>
  );
}
