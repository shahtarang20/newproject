import { useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { CheckCircle2, Download, FileSpreadsheet, X } from 'lucide-react';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Progress } from '@/components/ui/progress';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { bulkApi } from '@/api/endpoints/bulk';
import { queryKeys } from '@/api/queryKeys';
import type { BulkCsvOptions, BulkImportResult, BulkValidateResult, DuplicateSkuPolicy } from '@/types/catalog';
import { getErrorMessage } from '@/utils/errors';
import { formatMoney } from '@/utils/format';
import { cn } from '@/utils/cn';
import { LimitReachedAlert } from '@/features/products/components/LimitReached';
import { Link } from 'react-router-dom';

const POLICY_LABELS: Record<DuplicateSkuPolicy, string> = { error: 'Treat as an error', skip: 'Skip the row', update: 'Update existing variant' };

export function ImportTab() {
  const qc = useQueryClient();
  const [file, setFile] = useState<File | null>(null);
  const [opts, setOpts] = useState<BulkCsvOptions>({ createMissingCategories: true, duplicateSku: 'error' });
  const [abortOnErrors, setAbortOnErrors] = useState(false);
  const [errorsOnly, setErrorsOnly] = useState(false);
  const [validation, setValidation] = useState<BulkValidateResult | null>(null);
  const [result, setResult] = useState<BulkImportResult | null>(null);
  const [progress, setProgress] = useState(0);

  const reset = () => { setFile(null); setValidation(null); setResult(null); setProgress(0); };
  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    accept: { 'text/csv': ['.csv'], 'application/vnd.ms-excel': ['.csv'] },
    maxFiles: 1, maxSize: 5 * 1024 * 1024,
    onDrop: (accepted, rejected) => {
      if (rejected.length) return void toast.error(rejected[0]?.errors[0]?.message ?? 'Use a CSV file under 5 MB.');
      if (accepted[0]) { setFile(accepted[0]); setValidation(null); setResult(null); }
    },
  });

  const template = useMutation({ mutationFn: bulkApi.downloadTemplate, onError: (e) => toast.error(getErrorMessage(e)) });
  const validate = useMutation({
    mutationFn: () => bulkApi.validate(file!, opts),
    onSuccess: (r) => setValidation(r),
    onError: (e) => toast.error(getErrorMessage(e)),
  });
  const doImport = useMutation({
    mutationFn: () => { setProgress(0); return bulkApi.import(file!, { ...opts, abortOnErrors }, setProgress); },
    onSuccess: (r) => {
      setResult(r);
      toast.success('Import finished');
      void qc.invalidateQueries({ queryKey: queryKeys.products.all });
      void qc.invalidateQueries({ queryKey: queryKeys.categories.all });
      void qc.invalidateQueries({ queryKey: queryKeys.shop.usage() });
    },
    onError: (e) => toast.error(getErrorMessage(e)),
  });
  const gateError = [template.error, validate.error, doImport.error].find(Boolean);

  const rows = (validation?.rows ?? []).filter((r) => !errorsOnly || !r.valid);
  const shown = rows.slice(0, 300);
  const s = validation?.summary;

  if (result) {
    return (
      <Card className="space-y-4 p-5">
        <div className="flex items-center gap-2 text-success"><CheckCircle2 className="h-5 w-5" /><h3 className="font-semibold">Import complete</h3></div>
        <dl className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {[['Products created', result.created.products], ['Variants created', result.created.variants], ['Products updated', result.updated.products], ['Categories created', result.created.categories], ['Variants updated', result.updated.variants], ['Skipped', result.skipped], ['Errors', result.errors.length]].map(([l, v]) => (
            <div key={l as string} className="rounded-xl border p-3"><dt className="text-xs text-muted-foreground">{l}</dt><dd className="text-xl font-semibold tabular-nums">{v}</dd></div>
          ))}
        </dl>
        {result.errors.length > 0 && (
          <ul className="max-h-48 space-y-1 overflow-auto rounded-xl bg-destructive/5 p-3 text-sm">
            {result.errors.map((e) => <li key={e.row}><b>Row {e.row}:</b> {e.errors.join('; ')}</li>)}
          </ul>
        )}
        <div className="flex gap-2"><Button onClick={reset}>Import another file</Button><Button variant="outline" asChild><Link to="/dashboard/products">View products</Link></Button></div>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <LimitReachedAlert error={gateError} />
      <Card className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
        <div><p className="text-sm font-medium">1. Download the template</p><p className="text-xs text-muted-foreground">Rows with the same product_name become one product with several variants. Required: product_name, price.</p></div>
        <Button variant="outline" loading={template.isPending} onClick={() => template.mutate()}><Download className="h-4 w-4" /> CSV template</Button>
      </Card>

      <div>
        <p className="mb-2 text-sm font-medium">2. Upload your CSV</p>
        {file ? (
          <Card className="flex items-center gap-3 p-4">
            <FileSpreadsheet className="h-6 w-6 text-primary" />
            <div className="min-w-0 flex-1"><p className="truncate text-sm font-medium">{file.name}</p><p className="text-xs text-muted-foreground">{(file.size / 1024).toFixed(1)} KB</p></div>
            <Button variant="ghost" size="icon-sm" aria-label="Remove file" onClick={reset}><X className="h-4 w-4" /></Button>
          </Card>
        ) : (
          <div {...getRootProps()} className={cn('flex cursor-pointer flex-col items-center gap-2 rounded-2xl border-2 border-dashed px-4 py-10 text-center', isDragActive ? 'border-primary bg-accent' : 'hover:bg-secondary/50')}>
            <input {...getInputProps()} aria-label="Upload CSV" />
            <FileSpreadsheet className="h-8 w-8 text-muted-foreground" />
            <p className="text-sm font-medium">{isDragActive ? 'Drop the file' : 'Drag & drop a CSV, or click to browse'}</p>
            <p className="text-xs text-muted-foreground">Up to 5 MB · 5000 rows</p>
          </div>
        )}
      </div>

      <Card className="grid gap-4 p-4 sm:grid-cols-2">
        <label className="flex items-center gap-2 text-sm"><Checkbox checked={opts.createMissingCategories} onCheckedChange={(v) => setOpts((o) => ({ ...o, createMissingCategories: v === true }))} /> Create missing categories</label>
        <div className="flex items-center gap-2 text-sm">
          <span className="shrink-0">Duplicate SKU:</span>
          <Select value={opts.duplicateSku} onValueChange={(v) => setOpts((o) => ({ ...o, duplicateSku: v as DuplicateSkuPolicy }))}>
            <SelectTrigger aria-label="Duplicate SKU policy"><SelectValue /></SelectTrigger>
            <SelectContent>{(Object.keys(POLICY_LABELS) as DuplicateSkuPolicy[]).map((k) => <SelectItem key={k} value={k}>{POLICY_LABELS[k]}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <label className="flex items-center gap-2 text-sm sm:col-span-2"><Checkbox checked={abortOnErrors} onCheckedChange={(v) => setAbortOnErrors(v === true)} /> Cancel the whole import if any row has errors</label>
      </Card>

      <Button disabled={!file} loading={validate.isPending} onClick={() => validate.mutate()}>3. Validate file</Button>

      {validation && s && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {[['Total rows', validation.totalRows], ['Valid', validation.validRows], ['Invalid', validation.invalidRows], ['New products', s.productsToCreate]].map(([l, v]) => (
              <Card key={l as string} className="p-3"><p className="text-xs text-muted-foreground">{l}</p><p className="text-xl font-semibold tabular-nums">{v}</p></Card>
            ))}
          </div>
          <p className="text-sm text-muted-foreground">
            {s.variantsToCreate} variants to create · {s.variantsToUpdate} to update · {s.productsToUpdate} products updated · {s.rowsToSkip} skipped
            {s.categoriesToCreate.length > 0 && ` · new categories: ${s.categoriesToCreate.join(', ')}`}
          </p>
          {s.productLimit?.exceeds && (
            <div role="alert" className="rounded-xl border border-warning/30 bg-warning/5 p-3 text-sm">
              This import adds {s.productLimit.newProducts} products but your plan has room for {s.productLimit.headroom}. <Link to="/dashboard/subscription" className="font-medium underline">Upgrade your plan</Link>.
            </div>
          )}

          <label className="flex items-center gap-2 text-sm"><Checkbox checked={errorsOnly} onCheckedChange={(v) => setErrorsOnly(v === true)} /> Show errors only</label>
          {shown.length === 0 ? <p className="rounded-xl border border-dashed p-6 text-center text-sm text-muted-foreground">{errorsOnly ? 'No errors found.' : 'No rows.'}</p> : (
            <>
              <Card className="hidden overflow-hidden md:block">
                <div className="max-h-96 overflow-auto">
                  <Table>
                    <TableHeader className="sticky top-0"><TableRow><TableHead>Row</TableHead><TableHead>Product</TableHead><TableHead>SKU</TableHead><TableHead>Variant</TableHead><TableHead>Price</TableHead><TableHead>Action</TableHead><TableHead>Issues</TableHead></TableRow></TableHeader>
                    <TableBody>
                      {shown.map((r) => (
                        <TableRow key={r.row}>
                          <TableCell>{r.row}</TableCell>
                          <TableCell className="max-w-[200px] truncate">{r.data?.productName}</TableCell>
                          <TableCell>{r.data?.sku}</TableCell>
                          <TableCell>{[r.data?.colour, r.data?.size].filter(Boolean).join(' / ')}</TableCell>
                          <TableCell>{r.data?.priceMinor != null ? formatMoney(r.data.priceMinor) : ''}</TableCell>
                          <TableCell><Badge variant={r.valid ? 'success' : 'destructive'}>{r.action}</Badge></TableCell>
                          <TableCell className="text-xs">{[...r.errors, ...r.warnings].join('; ')}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </Card>
              <ul className="space-y-2 md:hidden">
                {shown.map((r) => (
                  <Card key={r.row} className="p-3 text-sm">
                    <div className="flex items-center justify-between"><span className="font-medium">Row {r.row} · {r.data?.productName}</span><Badge variant={r.valid ? 'success' : 'destructive'}>{r.action}</Badge></div>
                    {(r.errors.length > 0 || r.warnings.length > 0) && <p className="mt-1 text-xs text-muted-foreground">{[...r.errors, ...r.warnings].join('; ')}</p>}
                  </Card>
                ))}
              </ul>
              {rows.length > shown.length && <p className="text-xs text-muted-foreground">Showing first {shown.length} of {rows.length} rows.</p>}
            </>
          )}

          {doImport.isPending && <div className="space-y-1" role="status"><Progress value={progress} /><p className="text-xs text-muted-foreground">{progress < 100 ? `Uploading… ${progress}%` : 'Importing, please wait…'}</p></div>}
          <Button disabled={!s.canImport || doImport.isPending || (validation.validRows === 0)} loading={doImport.isPending} onClick={() => doImport.mutate()}>
            4. Import {validation.validRows} valid row{validation.validRows === 1 ? '' : 's'}
          </Button>
        </div>
      )}
    </div>
  );
}
