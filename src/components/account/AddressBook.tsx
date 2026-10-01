"use client";

import { useActionState, useState } from "react";
import { MapPin, Pencil, Plus, Star, Trash2 } from "lucide-react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  deleteAddressAction,
  makeDefaultAddressAction,
  saveAddressAction,
} from "@/app/account/actions";
import { fieldError, IDLE, type FormState } from "@/lib/account/form-state";
import { NIGERIAN_STATES, stateLabel } from "@/lib/nigeria";
import type { Address } from "@/lib/api/types";
import { ActionButton } from "./ActionButton";
import { ConfirmAction } from "./ConfirmAction";
import { FormAlert, SelectField, TextField } from "./fields";
import { SubmitButton } from "./SubmitButton";

const STATE_OPTIONS = NIGERIAN_STATES.map((state) => ({ value: state, label: stateLabel(state) }));
const MAX_ADDRESSES = 20;

/**
 * Homes, site offices and warehouses the customer delivers to (§14, §30).
 * One address is always the default while the book is not empty.
 */
export function AddressBook({ addresses }: { addresses: Address[] }) {
  // `null` = closed; `"new"` = adding; an Address = editing that one.
  const [editing, setEditing] = useState<Address | "new" | null>(null);

  return (
    <>
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2 className="font-display text-2xl tracking-tight">Addresses</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            The homes and sites we deliver to and install at. Keep a site contact on each so our
            crew can reach someone on the day.
          </p>
        </div>
        {addresses.length < MAX_ADDRESSES && (
          <button
            type="button"
            onClick={() => setEditing("new")}
            className="inline-flex h-11 items-center gap-2 bg-charcoal-dark px-5 text-xs font-semibold uppercase tracking-[0.08em] text-primary-foreground transition hover:bg-gold hover:text-charcoal-dark"
          >
            <Plus className="h-4 w-4" aria-hidden /> Add address
          </button>
        )}
      </div>

      {addresses.length === 0 ? (
        <div className="border border-dashed border-border px-6 py-12 text-center">
          <MapPin className="mx-auto h-6 w-6 text-gold" aria-hidden />
          <p className="mt-4 font-display text-lg">No saved addresses</p>
          <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
            Save your home or site addresses so delivery details are ready when you need them.
          </p>
        </div>
      ) : (
        <ul className="grid gap-5 sm:grid-cols-2">
          {addresses.map((address) => (
            <li key={address.id} className="flex flex-col border border-border p-6">
              <div className="flex items-center justify-between gap-3">
                <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-gold">
                  {address.label}
                </p>
                {address.is_default && (
                  <span className="bg-charcoal-dark px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-primary-foreground">
                    Default
                  </span>
                )}
              </div>
              <address className="mt-3 flex-1 text-sm not-italic text-muted-foreground">
                {address.recipient_name && (
                  <span className="block text-foreground">{address.recipient_name}</span>
                )}
                <span className="block">{address.address_line}</span>
                {address.landmark && <span className="block">{address.landmark}</span>}
                <span className="block">
                  {address.city}, {stateLabel(address.state)}
                </span>
                {address.phone && <span className="mt-1 block">{address.phone}</span>}
              </address>
              <div className="mt-5 flex flex-wrap gap-x-4 gap-y-2 text-xs">
                <button
                  type="button"
                  onClick={() => setEditing(address)}
                  className="inline-flex items-center gap-1.5 hover:text-gold"
                >
                  <Pencil className="h-3.5 w-3.5" aria-hidden /> Edit
                  <span className="sr-only"> {address.label}</span>
                </button>
                {!address.is_default && (
                  <ActionButton
                    action={makeDefaultAddressAction.bind(null, address.id)}
                    className="hover:text-gold"
                  >
                    <Star className="h-3.5 w-3.5" aria-hidden /> Make default
                    <span className="sr-only"> {address.label}</span>
                  </ActionButton>
                )}
                <ConfirmAction
                  trigger={
                    <button
                      type="button"
                      className="inline-flex items-center gap-1.5 text-muted-foreground hover:text-destructive"
                    >
                      <Trash2 className="h-3.5 w-3.5" aria-hidden /> Remove
                      <span className="sr-only"> {address.label}</span>
                    </button>
                  }
                  title={`Remove “${address.label}”?`}
                  description={
                    address.is_default && addresses.length > 1
                      ? "This is your default address. Another saved address will become the default."
                      : "This address will be removed from your account."
                  }
                  confirmLabel="Remove"
                  action={deleteAddressAction.bind(null, address.id)}
                />
              </div>
            </li>
          ))}
        </ul>
      )}

      <Dialog open={editing !== null} onOpenChange={(open) => !open && setEditing(null)}>
        <DialogContent className="max-h-[92vh] overflow-y-auto rounded-none sm:max-w-xl sm:rounded-none">
          <DialogHeader>
            <DialogTitle className="font-display text-2xl">
              {editing === "new" ? "Add an address" : "Edit address"}
            </DialogTitle>
            <DialogDescription>
              Nigerian addresses only, for delivery and installation.
            </DialogDescription>
          </DialogHeader>
          {editing !== null && (
            <AddressForm
              // A fresh form per address, so one edit never shows another's errors.
              key={editing === "new" ? "new" : editing.id}
              address={editing === "new" ? null : editing}
              isFirst={addresses.length === 0}
              onSaved={(message) => {
                setEditing(null);
                toast.success(message);
              }}
            />
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}

function AddressForm({
  address,
  isFirst,
  onSaved,
}: {
  address: Address | null;
  isFirst: boolean;
  onSaved: (message: string) => void;
}) {
  const [state, action] = useActionState(async (previous: FormState, formData: FormData) => {
    const result = await saveAddressAction(previous, formData);
    if (result.status === "success") onSaved(result.message ?? "Address saved.");
    return result;
  }, IDLE);

  const value = (field: keyof Address): string | undefined =>
    state.values?.[field] ?? (address ? ((address[field] as string | null) ?? "") : undefined);

  return (
    <form action={action} className="grid gap-4 sm:grid-cols-2">
      {address && <input type="hidden" name="id" value={address.id} />}
      <FormAlert state={state.status === "error" ? state : IDLE} className="sm:col-span-2" />
      <TextField
        name="label"
        label="Name this address"
        placeholder="Home, Site office…"
        required
        maxLength={60}
        defaultValue={value("label")}
        error={fieldError(state, "label")}
      />
      <TextField
        name="recipient_name"
        label="Contact on site"
        optional
        autoComplete="name"
        defaultValue={value("recipient_name")}
        error={fieldError(state, "recipient_name")}
      />
      <TextField
        name="address_line"
        label="Street address"
        autoComplete="street-address"
        required
        fieldClassName="sm:col-span-2"
        defaultValue={value("address_line")}
        error={fieldError(state, "address_line")}
      />
      <TextField
        name="landmark"
        label="Nearest landmark"
        optional
        placeholder="Opposite the filling station"
        fieldClassName="sm:col-span-2"
        defaultValue={value("landmark")}
        error={fieldError(state, "landmark")}
      />
      <TextField
        name="city"
        label="City / area"
        autoComplete="address-level2"
        required
        defaultValue={value("city")}
        error={fieldError(state, "city")}
      />
      <SelectField
        name="state"
        label="State"
        required
        options={STATE_OPTIONS}
        placeholder="Choose a state"
        defaultValue={value("state") ?? "Lagos"}
        error={fieldError(state, "state")}
      />
      <TextField
        name="phone"
        type="tel"
        label="Phone on site"
        optional
        autoComplete="tel"
        inputMode="tel"
        defaultValue={value("phone")}
        error={fieldError(state, "phone")}
      />
      {!address?.is_default && !isFirst && (
        <label className="flex items-center gap-3 self-end pb-3 text-sm">
          <input
            type="checkbox"
            name="is_default"
            defaultChecked={state.values?.is_default === "on"}
            className="h-4 w-4 accent-[var(--gold)]"
          />
          Make this my default address
        </label>
      )}
      <div className="sm:col-span-2">
        <SubmitButton className="w-full sm:w-auto">
          {address ? "Save changes" : "Add address"}
        </SubmitButton>
      </div>
    </form>
  );
}
