"use client";

import { useActionState, useMemo, useState, useTransition } from "react";
import { toast } from "sonner";
import { fieldError, useResultToast } from "@/components/forms/use-result";
import { Button } from "@/components/ui/button";
import { Field, Input, Select } from "@/components/ui/field";
import { Dialog } from "@/components/ui/overlay";
import { Callout } from "@/components/ui/states";
import { parseDecimalInput } from "@/domain/money";
import { CATEGORIES, CATEGORY_LABEL, costPer, FREQUENCIES, FREQUENCY_LABEL, type Category, type Frequency } from "@/domain/spending";
import { formatMoney } from "@/lib/format";
import { deleteCostAction, saveCostAction } from "./actions";

export type CostDraft = { id: string; name: string; amount: string; frequency: Frequency; category: Category; nextDate: string | null };

/** Adding or changing a cost: a name, how much, how often and a category, plus an optional next payment date. */
export function CostSheet({ currency, cost, trigger }: { currency: string; cost?: CostDraft; trigger: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const [state, action, pending] = useActionState(saveCostAction, null);
  const [amount, setAmount] = useState(cost ? String(Number(cost.amount)) : "");
  const [frequency, setFrequency] = useState<Frequency>(cost?.frequency ?? "monthly");
  const [deleting, startDelete] = useTransition();
  useResultToast(state, { onSuccess: () => setOpen(false) });
  const e = (k: string) => fieldError(state, k);

  // A yearly or weekly amount, shown as what it comes to each month.
  const monthly = useMemo(() => {
    const parsed = parseDecimalInput(amount);
    return parsed && frequency !== "monthly" ? costPer(parsed, frequency, "month") : null;
  }, [amount, frequency]);

  return (
    <Dialog open={open} onOpenChange={setOpen} title={cost ? `Change ${cost.name}` : "Add a cost"} trigger={trigger}>
      <form action={action} className="space-y-4">
        {cost ? <input type="hidden" name="id" value={cost.id} /> : null}
        <Field label="What is it?" error={e("name")}>
          {(p) => <Input {...p} name="name" required maxLength={60} defaultValue={cost?.name} placeholder="Rent, groceries, car insurance…" className="h-11" />}
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label={`Amount (${currency})`} error={e("amount")}>
            {(p) => (
              <Input
                {...p}
                name="amount"
                inputMode="decimal"
                required
                value={amount}
                onChange={(ev) => setAmount(ev.target.value)}
                placeholder="0.00"
                className="h-11"
              />
            )}
          </Field>
          <Field label="How often" error={e("frequency")}>
            {(p) => (
              <Select {...p} name="frequency" value={frequency} onChange={(ev) => setFrequency(ev.target.value as Frequency)} className="h-11">
                {FREQUENCIES.map((f) => (
                  <option key={f} value={f}>
                    {FREQUENCY_LABEL[f]}
                  </option>
                ))}
              </Select>
            )}
          </Field>
        </div>
        {monthly ? <p className="-mt-1 text-[0.8125rem] text-fg-subtle">That&apos;s {formatMoney(monthly.toFixed(2), currency)} a month.</p> : null}
        <div className="grid grid-cols-2 gap-3">
          <Field label="Category" error={e("category")}>
            {(p) => (
              <Select {...p} name="category" defaultValue={cost?.category ?? ""} required className="h-11">
                <option value="" disabled>
                  Choose…
                </option>
                {CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {CATEGORY_LABEL[c]}
                  </option>
                ))}
              </Select>
            )}
          </Field>
          <Field label="Next payment" optional error={e("nextDate")}>
            {(p) => <Input {...p} type="date" name="nextDate" defaultValue={cost?.nextDate ?? ""} className="h-11" />}
          </Field>
        </div>
        {state && !state.ok && !state.fieldErrors ? <Callout tone="negative">{state.error}</Callout> : null}
        <Button type="submit" size="lg" loading={pending} className="w-full">
          {cost ? "Save" : "Add cost"}
        </Button>
        {cost ? (
          <Button
            type="button"
            variant="ghost"
            loading={deleting}
            className="w-full text-negative"
            onClick={() =>
              startDelete(async () => {
                const r = await deleteCostAction(cost.id);
                if (r.ok) {
                  toast.success("Removed.");
                  setOpen(false);
                } else toast.error(r.error);
              })
            }
          >
            Remove this cost
          </Button>
        ) : null}
      </form>
    </Dialog>
  );
}
