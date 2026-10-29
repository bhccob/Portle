"use client";

import Link from "next/link";
import { useMemo, useState, useTransition } from "react";
import { CheckCircle2, FileSpreadsheet, Upload } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Field, Select } from "@/components/ui/field";
import { Callout } from "@/components/ui/states";
import {
  DATE_FORMATS,
  detectDateFormat,
  IMPORT_FIELDS,
  MAX_IMPORT_BYTES,
  normalizeRows,
  parseCsv,
  suggestMapping,
  type ColumnMapping,
  type DateFormat,
  type ImportField,
} from "@/domain/csv-import";
import { importCsvAction, type ImportResult } from "../actions";

const FIELD_LABEL: Record<ImportField, string> = {
  date: "Date",
  type: "Type (buy/sell…)",
  symbol: "Symbol / ISIN / name",
  quantity: "Quantity",
  price: "Price per unit",
  amount: "Cash amount",
  fee: "Fees",
  currency: "Currency",
  externalId: "Broker transaction ID",
  note: "Note",
};
const REQUIRED: ImportField[] = ["date", "symbol", "quantity", "price"];

export function ImportWizard({ accounts }: { accounts: { id: string; name: string; currency: string }[] }) {
  const [accountId, setAccountId] = useState(accounts[0]?.id ?? "");
  const [file, setFile] = useState<{ name: string; text: string } | null>(null);
  const [mapping, setMapping] = useState<ColumnMapping>({});
  const [dateFormat, setDateFormat] = useState<DateFormat>("YYYY-MM-DD");
  const [result, setResult] = useState<ImportResult | null>(null);
  const [pending, start] = useTransition();
  const account = accounts.find((a) => a.id === accountId);

  const parsed = useMemo(() => (file ? parseCsv(file.text) : null), [file]);
  // Validation runs in the browser with the same code the server uses, so the preview is honest.
  const preview = useMemo(
    () => (parsed ? normalizeRows(parsed.rows, mapping, { dateFormat, defaultCurrency: account?.currency ?? "EUR" }) : null),
    [parsed, mapping, dateFormat, account],
  );

  async function onFile(f: File | undefined) {
    setResult(null);
    if (!f) return;
    if (f.size > MAX_IMPORT_BYTES) return toast.error("That file is larger than 2 MB. Export a shorter date range.");
    if (!/\.(csv|txt)$/i.test(f.name)) return toast.error("Choose a .csv file.");
    const text = await f.text();
    const p = parseCsv(text);
    if (!p.headers.length) return toast.error("We couldn't find a header row in that file.");
    setFile({ name: f.name, text });
    const m = suggestMapping(p.headers);
    setMapping(m);
    if (m.date) setDateFormat(detectDateFormat(p.rows.slice(0, 20).map((r) => r[m.date!] ?? "")));
  }

  function submit() {
    if (!file) return;
    start(async () => {
      const r = await importCsvAction({ accountId, filename: file.name, text: file.text, mapping, dateFormat });
      if (r.ok) {
        setResult(r.data);
        toast.success(`Imported ${r.data.imported} transaction${r.data.imported === 1 ? "" : "s"}.`);
      } else toast.error(r.error);
    });
  }

  if (result) {
    return (
      <div className="space-y-4">
        <div className="flex items-start gap-3">
          <CheckCircle2 className="mt-0.5 size-6 text-positive" aria-hidden />
          <div>
            <h2 className="text-lg font-semibold text-fg">Import finished</h2>
            <p className="text-sm text-fg-muted">
              {result.imported} imported · {result.duplicates} skipped as duplicates · {result.errors.length} rejected, out of {result.rowCount} rows.
            </p>
          </div>
        </div>
        {result.unresolved.length ? (
          <Callout tone="warning" title="Securities without a price source">
            {result.unresolved.join(", ")} didn&apos;t match a known listing. They&apos;re kept in your ledger but left out of totals until they can be priced.
          </Callout>
        ) : null}
        {result.errors.length ? <ErrorList errors={result.errors} /> : null}
        <div className="flex gap-2">
          <Link href="/portfolio" className="inline-flex h-10 items-center rounded-[var(--radius-md)] bg-primary px-4 text-sm font-medium text-primary-fg">
            View portfolio
          </Link>
          <Button variant="secondary" onClick={() => (setFile(null), setResult(null))}>
            Import another file
          </Button>
        </div>
      </div>
    );
  }

  const missing = REQUIRED.filter((f) => !mapping[f]);
  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Import into account">
          {(p) => (
            <Select {...p} value={accountId} onChange={(e) => setAccountId(e.target.value)}>
              {accounts.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name} ({a.currency})
                </option>
              ))}
            </Select>
          )}
        </Field>
        <div className="flex flex-col gap-1.5">
          <span className="text-[0.8125rem] font-medium text-fg-muted">CSV file</span>
          <label className="flex h-10 cursor-pointer items-center gap-2 rounded-[var(--radius-md)] border border-dashed border-line-strong bg-field px-3 text-sm text-fg-muted hover:bg-field-hover focus-within:outline-2 focus-within:outline-[var(--focus)]">
            {file ? <FileSpreadsheet className="size-4 text-accent" aria-hidden /> : <Upload className="size-4" aria-hidden />}
            <span className="truncate">{file ? file.name : "Choose a .csv export (max 2 MB)"}</span>
            <input type="file" accept=".csv,text/csv,.txt" className="sr-only" onChange={(e) => onFile(e.target.files?.[0])} />
          </label>
        </div>
      </div>

      {parsed ? (
        <>
          <section aria-labelledby="map-title" className="space-y-3">
            <h2 id="map-title" className="text-[0.9375rem] font-semibold text-fg">
              Match your columns
            </h2>
            <p className="text-sm text-fg-muted">We guessed from the header names. Without a type column, negative quantities are read as sells.</p>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {IMPORT_FIELDS.map((f) => (
                <Field key={f} label={FIELD_LABEL[f]} optional={!REQUIRED.includes(f)}>
                  {(p) => (
                    <Select {...p} value={mapping[f] ?? ""} onChange={(e) => setMapping({ ...mapping, [f]: e.target.value || undefined })}>
                      <option value="">Not in this file</option>
                      {parsed.headers.map((h) => (
                        <option key={h}>{h}</option>
                      ))}
                    </Select>
                  )}
                </Field>
              ))}
              <Field label="Date format">
                {(p) => (
                  <Select {...p} value={dateFormat} onChange={(e) => setDateFormat(e.target.value as DateFormat)}>
                    {DATE_FORMATS.map((d) => (
                      <option key={d}>{d}</option>
                    ))}
                  </Select>
                )}
              </Field>
            </div>
          </section>

          {preview ? (
            <section aria-labelledby="check-title" className="space-y-3">
              <h2 id="check-title" className="text-[0.9375rem] font-semibold text-fg">
                Check before importing
              </h2>
              <p className="text-sm text-fg-muted">
                <strong className="text-fg">{preview.valid.length}</strong> of {parsed.rows.length} rows are ready.{" "}
                {preview.errors.length ? <span className="text-warning">{preview.errors.length} will be rejected.</span> : null} Rows already in this account are skipped automatically.
              </p>
              {parsed.parseErrors.length ? <Callout tone="warning">{parsed.parseErrors.slice(0, 3).join(" ")}</Callout> : null}
              {preview.valid.length ? (
                <div className="relative overflow-x-auto rounded-[var(--radius-lg)] border border-line">
                  <table className="w-full min-w-[640px] text-[0.8125rem]">
                    <caption className="sr-only">First rows as they will be imported</caption>
                    <thead>
                      <tr className="border-b border-line text-left text-fg-subtle">
                        {["Row", "Date", "Type", "Symbol", "Qty", "Price", "Amount", "Fee", "Ccy"].map((h) => (
                          <th key={h} scope="col" className="px-3 py-2 font-medium">
                            {h}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="num">
                      {preview.valid.slice(0, 6).map((r) => (
                        <tr key={r.rowNumber} className="border-b border-line/60 last:border-0">
                          <td className="px-3 py-1.5 text-fg-subtle">{r.rowNumber}</td>
                          <td className="px-3 py-1.5">{r.tradeDate}</td>
                          <td className="px-3 py-1.5">{r.type}</td>
                          <td className="px-3 py-1.5 font-medium">{r.symbol ?? "—"}</td>
                          <td className="px-3 py-1.5">{r.quantity ?? r.splitRatio ?? "—"}</td>
                          <td className="px-3 py-1.5">{r.price ?? "—"}</td>
                          <td className="px-3 py-1.5">{r.amount ?? "—"}</td>
                          <td className="px-3 py-1.5">{r.fee}</td>
                          <td className="px-3 py-1.5">{r.currency}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : null}
              {preview.errors.length ? <ErrorList errors={preview.errors} /> : null}
            </section>
          ) : null}

          <div className="flex flex-wrap items-center gap-3">
            <Button size="lg" onClick={submit} loading={pending} disabled={!preview?.valid.length || missing.length > 0}>
              Import {preview?.valid.length ?? 0} rows
            </Button>
            {missing.length ? <p className="text-sm text-warning">Match these columns first: {missing.map((m) => FIELD_LABEL[m]).join(", ")}.</p> : null}
          </div>
        </>
      ) : null}
    </div>
  );
}

function ErrorList({ errors }: { errors: { row: number; message: string }[] }) {
  return (
    <details className="rounded-[var(--radius-lg)] border border-line bg-field px-4 py-3 text-sm">
      <summary className="cursor-pointer font-medium text-fg">
        {errors.length} row{errors.length === 1 ? "" : "s"} rejected
      </summary>
      <ul className="mt-2 max-h-52 space-y-1 overflow-y-auto text-fg-muted">
        {errors.slice(0, 100).map((e) => (
          <li key={`${e.row}-${e.message}`}>
            <span className="num text-fg-subtle">Row {e.row}:</span> {e.message}
          </li>
        ))}
      </ul>
    </details>
  );
}
