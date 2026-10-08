import { useState } from 'react';
import { PageHeader } from '@/components/common/PageHeader';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import type { InventoryItem } from '@/types/commerce';
import { HistoryTab, type VariantFilter } from '../components/HistoryTab';
import { StockTab } from '../components/StockTab';
import { variantText } from '../utils';

export default function InventoryPage() {
  const [tab, setTab] = useState('stock');
  const [variant, setVariant] = useState<VariantFilter | null>(null);

  const viewHistory = (it: InventoryItem) => {
    setVariant({ variantId: it.variantId, label: `${it.productName} - ${variantText(it.colour, it.size)}` });
    setTab('history');
  };

  return (
    <>
      <PageHeader title="Inventory" description="Track stock per variant. Every change is recorded as a transaction." />
      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="stock">Stock</TabsTrigger>
          <TabsTrigger value="history">History</TabsTrigger>
        </TabsList>
        <TabsContent value="stock"><StockTab onViewHistory={viewHistory} /></TabsContent>
        <TabsContent value="history"><HistoryTab variant={variant} onClearVariant={() => setVariant(null)} /></TabsContent>
      </Tabs>
    </>
  );
}
