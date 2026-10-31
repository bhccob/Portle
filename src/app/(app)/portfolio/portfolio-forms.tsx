"use client";

import { useActionState, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Archive, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { InstrumentPicker } from "@/components/forms/instrument-picker";
import { fieldError, useResultToast } from "@/components/forms/use-result";
import { Button } from "@/components/ui/button";
import { Field, Input, Select, Textarea } from "@/components/ui/field";
import { Dialog } from "@/components/ui/overlay";
import { SUPPORTED_CURRENCIES } from "@/domain/money";
import { today } from "@/lib/format";
import { addTransactionAction, archiveAccountAction, createAccountAction, deleteTransactionAction, loadSampleAction } from "./actions";

type Account = { id: string; name: string; currency: string };

const TYPES = [
  ["buy", "Buy"],
  ["sell", "Sell"],
  ["transfer_in", "Opening position / transfer in"],
  ["transfer_out", "Transfer out"],
  ["dividend", "Dividend"],
  ["split", "Stock split"],
  ["deposit", "Cash deposit"],
  ["withdrawal", "Cash withdrawal"],
  ["interest", "Interest"],
  ["fee", "Fee"],
] as const;

export function CreateAccountForm({ onDone, compact }: { onDone?: () => void; compact?: boolean }) {
  const [state, action, pending] = useActionState(createAccountAction, null);
  useResultToast(state, { onSuccess: () => onDone?.() });
  return (
    <form action={action} className={compact ? "grid gap-3 sm:grid-cols-[1fr_1fr_120px_auto] sm:items-end" : "space-y-4"}>
      <Field label="Account name" error={fieldError(state, "name")}>
        {(p) => <Input {...p} name="name" placeholder="e.g. DEGIRO, IBKR main" required maxLength={60} />}
      </Field>
      <Field label="Institution" optional>
        {(p) => <Input {...p} name="institution" placeholder="Broker or bank" maxLength={60} />}
      </Field>
      <Field label="Currency" error={fieldError(state, "currency")}>
        {(p) => (
          <Select {...p} name="currency" defaultValue="EUR">
            {SUPPORTED_CURRENCIES.map((c) => (
              <option key={c}>{c}</option>
            ))}
          </Select>
        )}
      </Field>
      {!compact ? (
        <Field label="Type">
          {(p) => (
            <Select {...p} name="kind" defaultValue="brokerage">
              <option value="brokerage">Brokerage</option>
              <option value="retirement">Retirement / pension</option>
              <option value="crypto">Crypto</option>
              <option value="savings">Savings</option>
              <option value="other">Other</option>
            </Select>
          )}
        </Field>
      ) : null}
      <Button type="submit" loading={pending}>
        <Plus className="size-4" aria-hidden /> Add account
      </Button>
    </form>
  );
}

export function AddTransactionDialog({ accounts, defaultType = "buy", trigger }: { accounts: Account[]; defaultType?: string; trigger?: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const [type, setType] = useState<string>(defaultType);
  const [state, action, pending] = useActionState(addTransactionAction, null);
  const router = useRouter();
  useResultToast(state, {
    onSuccess: () => {
      setOpen(false);
      router.refresh();
    },
  });
  const security = ["buy", "sell", "transfer_in", "transfer_out", "split", "dividend"].includes(type);
  const trade = type === "buy" || type === "sell";
  const cash = ["dividend", "interest", "fee", "deposit", "withdrawal"].includes(type);
  const e = (k: string) => fieldError(state, k);

  return (
    <Dialog
      open={open}
      onOpenChange={setOpen}
      title="Record a transaction"
      description="Manual entries are labelled as such everywhere they appear."
      trigger={
        trigger ?? (
          <Button>
            <Plus className="size-4" aria-hidden /> Add transaction
          </Button>
        )
      }
    >
      <form action={action} className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Account" error={e("accountId")}>
            {(p) => (
              <Select {...p} name="accountId" required defaultValue={accounts[0]?.id}>
                {accounts.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.name} ({a.currency})
                  </option>
                ))}
              </Select>
            )}
          </Field>
          <Field label="Type">
            {(p) => (
              <Select {...p} name="type" value={type} onChange={(ev) => setType(ev.target.value)}>
                {TYPES.map(([v, l]) => (
                  <option key={v} value={v}>
                    {l}
                  </option>
                ))}
              </Select>
            )}
          </Field>
        </div>
        {security ? (
          <Field label="Security" error={e("instrumentId")} optional={type === "dividend"}>
            {(p) => <InstrumentPicker name="instrumentId" id={p.id} invalid={!!p["aria-invalid"]} describedBy={p["aria-describedby"]} />}
          </Field>
        ) : null}
        <div className="grid gap-4 sm:grid-cols-3">
          <Field label="Date" error={e("tradeDate")}>
            {(p) => <Input {...p} type="date" name="tradeDate" defaultValue={today()} max={today()} required />}
          </Field>
          {trade || type === "transfer_in" || type === "transfer_out" ? (
            <Field label="Quantity" error={e("quantity")}>
              {(p) => <Input {...p} name="quantity" inputMode="decimal" placeholder="0" required />}
            </Field>
          ) : null}
          {type === "split" ? (
            <Field label="Ratio" hint="New shares per old share (4 for 4-for-1)" error={e("quantity")}>
              {(p) => <Input {...p} name="quantity" inputMode="decimal" placeholder="4" required />}
            </Field>
          ) : null}
          {trade || type === "transfer_in" ? (
            <Field label={type === "transfer_in" ? "Cost per unit" : "Price per unit"} optional={type === "transfer_in"} hint={type === "transfer_in" ? "Leave empty if unknown; we'll mark cost basis as missing." : undefined} error={e("price")}>
              {(p) => <Input {...p} name="price" inputMode="decimal" placeholder="0.00" required={trade} />}
            </Field>
          ) : null}
          {cash ? (
            <Field label="Amount" error={e("amount")}>
              {(p) => <Input {...p} name="amount" inputMode="decimal" placeholder="0.00" required />}
            </Field>
          ) : null}
          {type !== "split" ? (
            <Field label="Fees" optional error={e("fee")}>
              {(p) => <Input {...p} name="fee" inputMode="decimal" placeholder="0.00" />}
            </Field>
          ) : null}
        </div>
        <Field label="Note" optional>
          {(p) => <Textarea {...p} name="note" maxLength={500} className="min-h-16" placeholder="Why, or anything you'll want to remember" />}
        </Field>
        {state && !state.ok && state.fieldErrors?.form ? <p className="text-sm text-negative">{state.fieldErrors.form}</p> : null}
        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button type="submit" loading={pending}>
            Save transaction
          </Button>
        </div>
      </form>
    </Dialog>
  );
}

export function DeleteTransactionButton({ id, label }: { id: string; label: string }) {
  const [pending, start] = useTransition();
  const router = useRouter();
  return (
    <Button
      variant="ghost"
      size="icon"
      aria-label={`Delete ${label}`}
      loading={pending}
      onClick={() => {
        if (!confirm(`Delete ${label}? Positions will be recalculated without it.`)) return;
        start(async () => {
          const r = await deleteTransactionAction(id);
          if (r.ok) {
            toast.success(r.message);
            router.refresh();
          } else toast.error(r.error);
        });
      }}
    >
      {pending ? null : <Trash2 className="size-4" />}
    </Button>
  );
}

export function ArchiveAccountButton({ id, name }: { id: string; name: string }) {
  const [pending, start] = useTransition();
  const router = useRouter();
  return (
    <Button
      variant="ghost"
      size="sm"
      loading={pending}
      onClick={() => {
        if (!confirm(`Archive ${name}? It disappears from totals; its transactions are kept and exportable.`)) return;
        start(async () => {
          const r = await archiveAccountAction(id);
          if (r.ok) {
            toast.success(r.message);
            router.refresh();
          } else toast.error(r.error);
        });
      }}
    >
      <Archive className="size-4" aria-hidden /> Archive
    </Button>
  );
}

export function LoadSampleButton() {
  const [pending, start] = useTransition();
  const router = useRouter();
  return (
    <Button
      variant="ghost"
      loading={pending}
      onClick={() =>
        start(async () => {
          const r = await loadSampleAction();
          if (r.ok) {
            toast.success(r.message);
            router.refresh();
          } else toast.error(r.error);
        })
      }
    >
      Explore with sample data
    </Button>
  );
}
