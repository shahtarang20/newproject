import { useMutation } from '@tanstack/react-query';
import { Download } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { PageHeader } from '@/components/common/PageHeader';
import { bulkApi } from '@/api/endpoints/bulk';
import { getErrorMessage } from '@/utils/errors';
import { LimitReachedAlert } from '@/features/products/components/LimitReached';
import { ImportTab } from '../components/ImportTab';
import { BulkEditTab } from '../components/BulkEditTab';

function ExportTab() {
  const exp = useMutation({ mutationFn: bulkApi.downloadExport, onSuccess: () => toast.success('Export downloaded'), onError: (e) => toast.error(getErrorMessage(e)) });
  return (
    <div className="space-y-4">
      <LimitReachedAlert error={exp.error} />
      <Card className="space-y-3 p-5">
        <h3 className="font-semibold">Export all products</h3>
        <p className="text-sm text-muted-foreground">Downloads a CSV with one row per variant. The file can be edited and re-imported (use "Update existing variant" for duplicate SKUs).</p>
        <Button loading={exp.isPending} onClick={() => exp.mutate()}><Download className="h-4 w-4" /> Download CSV</Button>
      </Card>
    </div>
  );
}

export default function BulkPage() {
  return (
    <>
      <PageHeader title="Bulk tools" description="Import, export and update many products at once." />
      <Tabs defaultValue="import">
        <TabsList><TabsTrigger value="import">Import</TabsTrigger><TabsTrigger value="export">Export</TabsTrigger><TabsTrigger value="edit">Bulk edit</TabsTrigger></TabsList>
        <TabsContent value="import"><ImportTab /></TabsContent>
        <TabsContent value="export"><ExportTab /></TabsContent>
        <TabsContent value="edit"><BulkEditTab /></TabsContent>
      </Tabs>
    </>
  );
}
