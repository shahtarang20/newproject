import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { keepPreviousData, useMutation, useQuery } from '@tanstack/react-query';
import { Download, Plus, Users } from 'lucide-react';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DataTable, type DataTableColumn } from '@/components/common/DataTable';
import { MoneyText } from '@/components/common/MoneyText';
import { PageHeader } from '@/components/common/PageHeader';
import { SearchInput } from '@/components/common/SearchInput';
import { customersApi } from '@/api/endpoints/customers';
import { queryKeys } from '@/api/queryKeys';
import { usePermission } from '@/hooks';
import { formatDate, formatNumber } from '@/utils/format';
import { getErrorMessage } from '@/utils/errors';
import type { Customer, CustomerSort } from '@/types/insights';
import { CustomerFormDialog } from '../components/CustomerFormDialog';

const SORTS: { value: string; label: string; sort: CustomerSort; dir: 'asc' | 'desc' }[] = [
  { value: 'spent', label: 'Total spent', sort: 'totalSpent', dir: 'desc' },
  { value: 'last', label: 'Last order', sort: 'lastOrderAt', dir: 'desc' },
  { value: 'newest', label: 'Newest', sort: 'newest', dir: 'desc' },
  { value: 'name', label: 'Name (A–Z)', sort: 'name', dir: 'asc' },
];

export default function CustomersPage() {
  const navigate = useNavigate();
  const { can } = usePermission();
  const [q, setQ] = useState('');
  const [sortKey, setSortKey] = useState('newest');
  const [page, setPage] = useState(1);
  const [addOpen, setAddOpen] = useState(false);
  const s = SORTS.find((x) => x.value === sortKey) ?? SORTS[2]!;
  const params = { q: q || undefined, sort: s.sort, dir: s.dir };

  const list = useQuery({
    queryKey: queryKeys.customers.list({ ...params, page }),
    queryFn: () => customersApi.list({ ...params, page, limit: 20 }),
    placeholderData: keepPreviousData,
  });

  const exportCsv = useMutation({
    mutationFn: () => customersApi.exportCsv(params),
    onSuccess: (blob) => {
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `customers-${new Date().toISOString().slice(0, 10)}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    },
    onError: (e) => toast.error(getErrorMessage(e, 'Could not export customers.')),
  });

  const columns: DataTableColumn<Customer>[] = [
    {
      key: 'name', header: 'Customer', mobileTitle: true,
      cell: (c) => (
        <div className="min-w-0">
          <p className="truncate font-medium">{c.name} {c.isBlocked && <Badge variant="destructive" className="ml-1">Blocked</Badge>}</p>
          {c.tags.length > 0 && <p className="truncate text-xs text-muted-foreground">{c.tags.join(' · ')}</p>}
        </div>
      ),
    },
    { key: 'phone', header: 'Phone', cell: (c) => <span className="tabular-nums">{c.phone}</span> },
    { key: 'email', header: 'Email', hideOnMobile: true, cell: (c) => c.email ?? <span className="text-muted-foreground">—</span> },
    { key: 'orders', header: 'Orders', headerClassName: 'text-right', className: 'text-right tabular-nums', cell: (c) => formatNumber(c.stats.ordersCount) },
    { key: 'spent', header: 'Total spent', headerClassName: 'text-right', className: 'text-right', cell: (c) => <MoneyText minor={c.stats.totalSpentMinor} /> },
    { key: 'last', header: 'Last order', cell: (c) => (c.stats.lastOrderAt ? formatDate(c.stats.lastOrderAt) : <span className="text-muted-foreground">—</span>) },
  ];

  return (
    <>
      <PageHeader
        title="Customers"
        description="People who ordered from or enquired at your shop."
        actions={
          <>
            <Button variant="outline" size="sm" onClick={() => exportCsv.mutate()} loading={exportCsv.isPending}>
              <Download className="h-4 w-4" /> Export CSV
            </Button>
            {can('customers:write') && (
              <Button size="sm" onClick={() => setAddOpen(true)}>
                <Plus className="h-4 w-4" /> Add customer
              </Button>
            )}
          </>
        }
      />
      <div className="mb-4 flex flex-col gap-2 sm:flex-row">
        <SearchInput className="sm:max-w-sm sm:flex-1" value={q} onChange={(v) => { setQ(v); setPage(1); }} placeholder="Search name, phone or email" />
        <Select value={sortKey} onValueChange={(v) => { setSortKey(v); setPage(1); }}>
          <SelectTrigger className="sm:w-48" aria-label="Sort customers"><SelectValue /></SelectTrigger>
          <SelectContent>
            {SORTS.map((o) => <SelectItem key={o.value} value={o.value}>Sort: {o.label}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>
      <DataTable
        columns={columns}
        data={list.data?.items}
        rowKey={(c) => c.id}
        loading={list.isLoading}
        error={list.error}
        onRetry={() => list.refetch()}
        meta={list.data?.meta}
        onPageChange={setPage}
        onRowClick={(c) => navigate(`/dashboard/customers/${c.id}`)}
        emptyIcon={Users}
        emptyTitle={q ? 'No customers match your search' : 'No customers yet'}
        emptyDescription={q ? 'Try a different name, phone number or email.' : 'Customers appear automatically when they order or enquire.'}
        emptyAction={!q && can('customers:write') ? <Button onClick={() => setAddOpen(true)}><Plus className="h-4 w-4" /> Add customer</Button> : undefined}
      />
      <CustomerFormDialog open={addOpen} onOpenChange={setAddOpen} />
    </>
  );
}
