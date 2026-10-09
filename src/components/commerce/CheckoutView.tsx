"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useId, useState, type ReactNode } from "react";
import {
  AlertTriangle,
  ArrowLeft,
  Building2,
  CreditCard,
  Hammer,
  Landmark,
  Loader2,
  Lock,
  PackageCheck,
  Truck,
} from "lucide-react";
import { toast } from "sonner";
import { CartLineImage } from "@/components/site/CartLineImage";
import { useCart, unitSymbol } from "@/lib/cart";
import { useCartSummary } from "@/lib/commerce/use-cart-summary";
import { naira, number } from "@/lib/format";
import { stateLabel } from "@/lib/nigeria";
import type { AuthUser, Order, PaymentMethodId } from "@/lib/api/types";
import { cn } from "@/lib/utils";

const field =
  "h-12 w-full rounded-md border border-input bg-background px-4 text-sm outline-none transition focus:border-foreground/40 focus-visible:ring-2 focus-visible:ring-gold/30 aria-[invalid=true]:border-destructive";

type Form = {
  full_name: string;
  email: string;
  phone: string;
  fulfilment: "delivery" | "pickup";
  address_line: string;
  city: string;
  state: string;
  requires_installation: boolean;
  preferred_installation_date: string;
  payment_method: PaymentMethodId | "";
  notes: string;
  consent_given: boolean;
};

const EMPTY: Form = {
  full_name: "",
  email: "",
  phone: "",
  fulfilment: "delivery",
  address_line: "",
  city: "",
  state: "Lagos",
  requires_installation: false,
  preferred_installation_date: "",
  payment_method: "",
  notes: "",
  consent_given: false,
};

type PlacedOrder = {
  data: Order;
  access_token: string;
  payment: { redirect_url: string | null; error: string | null };
};

const METHOD_ICON: Record<PaymentMethodId, typeof CreditCard> = {
  paystack: CreditCard,
  flutterwave: CreditCard,
  bank_transfer: Landmark,
};

/**
 * Checkout: contact, delivery or collection, installation and payment on one
 * page, priced live by the server as choices change. Placing the order hands
 * the shopper to the payment gateway, or to the order page with bank details.
 */
export function CheckoutView() {
  const router = useRouter();
  const cart = useCart();
  const [form, setForm] = useState<Form>(EMPTY);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [placing, setPlacing] = useState(false);
  const { summary, config, error, loading } = useCartSummary({
    fulfilment: form.fulfilment,
    state: form.fulfilment === "delivery" ? form.state : undefined,
    requiresInstallation: form.requires_installation,
  });

  // Prefill a signed-in customer's details; guests simply start blank.
  useEffect(() => {
    let cancelled = false;
    fetch("/api/auth/me", { headers: { Accept: "application/json" } })
      .then((response) => (response.ok ? response.json() : null))
      .then((payload: { user: AuthUser | null } | null) => {
        const user = payload?.user;
        if (cancelled || !user || user.is_staff) return;
        setForm((current) => ({
          ...current,
          full_name: current.full_name || user.customer_profile?.full_name || user.name,
          email: current.email || user.email,
          phone: current.phone || user.phone || user.customer_profile?.phone || "",
          city: current.city || user.customer_profile?.city || "",
          state: user.customer_profile?.state || current.state,
        }));
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, []);

  // Default to the first payment method once the server says which exist.
  const firstMethod = config?.payment_methods[0]?.id;
  useEffect(() => {
    if (!firstMethod) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- choose a default once methods are known
    setForm((current) =>
      current.payment_method &&
      config?.payment_methods.some((method) => method.id === current.payment_method)
        ? current
        : { ...current, payment_method: firstMethod },
    );
  }, [firstMethod, config]);

  const set = <K extends keyof Form>(key: K, value: Form[K]) => {
    setForm((current) => ({ ...current, [key]: value }));
    setErrors((current) => {
      if (!current[key]) return current;
      const next = { ...current };
      delete next[key];
      return next;
    });
  };

  const states = config?.delivery_states.length ? config.delivery_states : (config?.states ?? []);
  const installable =
    !config?.installation_states.length ||
    (form.fulfilment === "delivery" && config.installation_states.includes(form.state));
  const issues = summary?.issues ?? {};
  const canPlace =
    !placing &&
    !!summary?.is_purchasable &&
    !!config?.enabled &&
    form.payment_method !== "" &&
    cart.items.length > 0;

  async function placeOrder(event: React.FormEvent) {
    event.preventDefault();
    if (!canPlace) return;

    setPlacing(true);
    setErrors({});

    try {
      const response = await fetch("/api/checkout/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify({
          ...form,
          items: cart.items.map((item) => ({ variant_id: item.variantId, quantity: item.qty })),
          address_line: form.fulfilment === "delivery" ? form.address_line : null,
          city: form.fulfilment === "delivery" ? form.city : null,
          state: form.fulfilment === "delivery" ? form.state : null,
          preferred_installation_date:
            form.requires_installation && form.preferred_installation_date
              ? form.preferred_installation_date
              : null,
        }),
      });
      const payload = (await response.json().catch(() => ({}))) as Partial<PlacedOrder> & {
        message?: string;
        errors?: Record<string, string[]>;
      };

      if (!response.ok || !payload.data || !payload.access_token) {
        const fieldErrors = Object.fromEntries(
          Object.entries(payload.errors ?? {}).map(([key, messages]) => [key, messages[0]]),
        );
        setErrors(fieldErrors);
        toast.error(
          Object.values(fieldErrors)[0] ?? payload.message ?? "We could not place your order.",
        );
        setPlacing(false);
        return;
      }

      const { reference } = payload.data;
      const orderUrl = `/checkout/order/${reference}?token=${encodeURIComponent(payload.access_token)}`;

      rememberOrder(reference, payload.access_token);
      cart.clear();

      if (payload.payment?.redirect_url) {
        window.location.assign(payload.payment.redirect_url);
        return;
      }

      if (payload.payment?.error) toast.error(payload.payment.error);
      router.push(orderUrl);
    } catch {
      toast.error("We could not reach our store. Check your connection and try again.");
      setPlacing(false);
    }
  }

  if (!cart.ready) {
    return <div className="mt-10 h-96 animate-pulse rounded-xl bg-muted" aria-hidden />;
  }

  if (cart.items.length === 0) {
    return (
      <div className="mt-14 rounded-xl border border-border p-10 text-center">
        <p className="font-display text-xl">Your cart is empty.</p>
        <Link href="/products" className="btn btn-primary mt-6">
          Browse floors
        </Link>
      </div>
    );
  }

  return (
    <form
      onSubmit={placeOrder}
      noValidate
      className="mt-10 grid items-start gap-10 lg:grid-cols-12"
    >
      <div className="space-y-6 lg:col-span-7">
        {error && <Notice tone="danger">{error}</Notice>}
        {config && !config.enabled && (
          <Notice tone="warning">
            Online payment isn&apos;t available right now.{" "}
            <Link href="/contact?enquiry=quote" className="font-semibold underline">
              Request a quote
            </Link>{" "}
            and a consultant will take your order by phone.
          </Notice>
        )}

        <Section number={1} title="Your details">
          <div className="grid gap-4 sm:grid-cols-2">
            <Input
              label="Full name"
              autoComplete="name"
              value={form.full_name}
              onChange={(value) => set("full_name", value)}
              error={errors.full_name}
              className="sm:col-span-2"
            />
            <Input
              label="Email"
              type="email"
              autoComplete="email"
              value={form.email}
              onChange={(value) => set("email", value)}
              error={errors.email}
            />
            <Input
              label="Phone"
              type="tel"
              autoComplete="tel"
              placeholder="0803 000 0000"
              value={form.phone}
              onChange={(value) => set("phone", value)}
              error={errors.phone}
            />
          </div>
        </Section>

        <Section number={2} title="Delivery">
          <div className="grid gap-3 sm:grid-cols-2">
            <Choice
              selected={form.fulfilment === "delivery"}
              onSelect={() => set("fulfilment", "delivery")}
              icon={Truck}
              title="Deliver to my site"
              description={
                config && config.free_delivery_threshold > 0
                  ? `Free on materials over ${naira(config.free_delivery_threshold)}`
                  : "Delivery date agreed by phone"
              }
            />
            {config?.pickup_enabled && (
              <Choice
                selected={form.fulfilment === "pickup"}
                onSelect={() => {
                  set("fulfilment", "pickup");
                  set("requires_installation", false);
                }}
                icon={Building2}
                title="Collect from the showroom"
                description="We call you when it's ready"
              />
            )}
          </div>

          {form.fulfilment === "delivery" && (
            <div className="mt-5 grid gap-4 sm:grid-cols-2">
              <Input
                label="Delivery address"
                autoComplete="street-address"
                value={form.address_line}
                onChange={(value) => set("address_line", value)}
                error={errors.address_line}
                className="sm:col-span-2"
              />
              <Input
                label="City / town"
                autoComplete="address-level2"
                value={form.city}
                onChange={(value) => set("city", value)}
                error={errors.city}
              />
              <FieldWrap label="State" error={errors.state ?? issues.state}>
                {(id, describedBy) => (
                  <select
                    id={id}
                    aria-describedby={describedBy}
                    aria-invalid={Boolean(errors.state ?? issues.state) || undefined}
                    value={form.state}
                    onChange={(event) => set("state", event.target.value)}
                    className={field}
                  >
                    {!states.includes(form.state) && (
                      <option value={form.state}>{stateLabel(form.state)}</option>
                    )}
                    {states.map((state) => (
                      <option key={state} value={state}>
                        {stateLabel(state)}
                      </option>
                    ))}
                  </select>
                )}
              </FieldWrap>
            </div>
          )}
          {issues.fulfilment && (
            <p className="mt-3 text-sm text-destructive">{issues.fulfilment}</p>
          )}
        </Section>

        <Section number={3} title="Installation">
          <div className="grid gap-3 sm:grid-cols-2">
            <Choice
              selected={!form.requires_installation}
              onSelect={() => set("requires_installation", false)}
              icon={PackageCheck}
              title="Supply only"
              description="Your own fitter installs the floor"
            />
            <Choice
              selected={form.requires_installation}
              onSelect={() => set("requires_installation", true)}
              disabled={!installable}
              icon={Hammer}
              title="Supply & install"
              description={
                installable
                  ? `Our crew fits it${config ? ` — ${number(config.installation_rate)}% of materials` : ""}`
                  : form.fulfilment === "pickup"
                    ? "Choose delivery to book installation"
                    : `Not yet available in ${stateLabel(form.state)}`
              }
            />
          </div>
          {form.requires_installation && (
            <div className="mt-5 grid gap-4 sm:grid-cols-2">
              <Input
                label="Preferred installation date (optional)"
                type="date"
                value={form.preferred_installation_date}
                onChange={(value) => set("preferred_installation_date", value)}
                error={errors.preferred_installation_date}
              />
              <p className="self-end pb-1 text-xs text-muted-foreground">
                We confirm the date after a short site visit to check the subfloor.
              </p>
            </div>
          )}
          {issues.requires_installation && (
            <p className="mt-3 text-sm text-destructive">{issues.requires_installation}</p>
          )}
        </Section>

        <Section number={4} title="Payment">
          {config && config.payment_methods.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No payment method is available at the moment.{" "}
              <Link
                href="/contact?enquiry=quote"
                className="font-semibold text-foreground underline"
              >
                Request a quote instead
              </Link>
              .
            </p>
          ) : (
            <div className="grid gap-3" role="radiogroup" aria-label="Payment method">
              {(config?.payment_methods ?? []).map((method) => (
                <Choice
                  key={method.id}
                  role="radio"
                  selected={form.payment_method === method.id}
                  onSelect={() => set("payment_method", method.id)}
                  icon={METHOD_ICON[method.id] ?? CreditCard}
                  title={
                    method.id === "bank_transfer"
                      ? "Bank transfer"
                      : `Pay online with ${method.label}`
                  }
                  description={method.description}
                />
              ))}
            </div>
          )}
          {errors.payment_method && (
            <p className="mt-3 text-sm text-destructive">{errors.payment_method}</p>
          )}

          <FieldWrap label="Order notes (optional)" className="mt-5">
            {(id) => (
              <textarea
                id={id}
                rows={3}
                value={form.notes}
                onChange={(event) => set("notes", event.target.value)}
                placeholder="Gate access, floor level, best time to call…"
                className={cn(field, "h-auto py-3")}
              />
            )}
          </FieldWrap>

          <label className="mt-5 flex items-start gap-3 text-sm">
            <input
              type="checkbox"
              checked={form.consent_given}
              onChange={(event) => set("consent_given", event.target.checked)}
              className="mt-0.5 h-4 w-4 accent-[var(--charcoal)]"
              aria-invalid={Boolean(errors.consent_given) || undefined}
            />
            <span>
              I agree to the{" "}
              <Link href="/terms" target="_blank" className="font-medium underline">
                terms of sale
              </Link>{" "}
              and{" "}
              <Link href="/privacy-policy" target="_blank" className="font-medium underline">
                privacy policy
              </Link>
              .
              {errors.consent_given && (
                <span className="mt-1 block text-destructive">{errors.consent_given}</span>
              )}
            </span>
          </label>
        </Section>

        {errors.items && <Notice tone="danger">{errors.items}</Notice>}

        <Link
          href="/cart"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden /> Back to cart
        </Link>
      </div>

      <aside className="rounded-xl border border-border bg-surface p-6 lg:sticky lg:top-[calc(var(--header-height)+1.5rem)] lg:col-span-5">
        <h2 className="flex items-center justify-between font-display text-2xl">
          Your order
          {loading && (
            <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" aria-label="Updating" />
          )}
        </h2>

        <ul className="mt-5 space-y-4">
          {cart.items.map((item) => {
            const priced = summary?.lines.find((line) => line.variant_id === item.variantId);
            return (
              <li key={item.variantId} className="flex gap-3">
                <CartLineImage
                  src={priced?.image_url ?? item.img}
                  alt=""
                  sizes="56px"
                  className="h-14 w-14 shrink-0 rounded-md"
                />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{item.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {item.variant} · {number(item.qty)} {unitSymbol(item.unit)}
                  </p>
                  {priced?.issue && <p className="text-xs text-destructive">{priced.issue}</p>}
                </div>
                <span className="font-mono text-sm">
                  {naira(priced?.line_total ?? item.price * item.qty)}
                </span>
              </li>
            );
          })}
        </ul>

        <dl className="mt-6 space-y-3 border-t border-border pt-5 text-sm">
          <Row label="Materials" value={naira(summary?.subtotal ?? cart.subtotal)} />
          {form.requires_installation && (
            <Row label="Installation" value={summary ? naira(summary.installation_fee) : "—"} />
          )}
          <Row
            label={form.fulfilment === "pickup" ? "Collection" : "Delivery"}
            value={
              !summary ? "—" : summary.delivery_fee === 0 ? "Free" : naira(summary.delivery_fee)
            }
          />
          {summary && summary.vat_rate > 0 && (
            <Row label={`VAT (${number(summary.vat_rate)}%)`} value={naira(summary.vat_amount)} />
          )}
          <div className="flex items-baseline justify-between border-t border-border pt-3">
            <dt className="font-medium">Total</dt>
            <dd className="font-mono text-2xl">{summary ? naira(summary.total) : "—"}</dd>
          </div>
        </dl>

        <button
          type="submit"
          disabled={!canPlace}
          className="btn btn-primary mt-6 w-full disabled:opacity-50"
        >
          {placing ? (
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
          ) : (
            <Lock className="h-4 w-4" aria-hidden />
          )}
          {form.payment_method === "bank_transfer"
            ? "Place order"
            : summary
              ? `Pay ${naira(summary.total)}`
              : "Pay now"}
        </button>
        {summary && !summary.is_purchasable && (
          <p className="mt-2 flex items-start gap-1.5 text-xs text-destructive">
            <AlertTriangle className="mt-px h-3.5 w-3.5 shrink-0" aria-hidden />
            Some items or choices need attention before you can pay.
          </p>
        )}
        <p className="mt-3 text-center text-xs text-muted-foreground">
          {form.payment_method === "bank_transfer"
            ? "You'll get our bank details next. Your order is confirmed when the transfer arrives."
            : "You'll complete payment securely on the gateway's page and return here."}
        </p>
      </aside>
    </form>
  );
}

/** Keep the order's access token for this tab, so a refresh can find it. */
function rememberOrder(reference: string, token: string) {
  try {
    sessionStorage.setItem(`floorsng.order.${reference}`, token);
  } catch {
    /* ignore */
  }
}

function Section({
  number,
  title,
  children,
}: {
  number: number;
  title: string;
  children: ReactNode;
}) {
  return (
    <section
      className="rounded-xl border border-border p-5 md:p-6"
      aria-labelledby={`step-${number}`}
    >
      <h2 id={`step-${number}`} className="flex items-center gap-3 font-display text-lg">
        <span className="grid h-7 w-7 place-items-center rounded-full bg-charcoal-dark font-mono text-xs text-primary-foreground">
          {number}
        </span>
        {title}
      </h2>
      <div className="mt-5">{children}</div>
    </section>
  );
}

function Choice({
  selected,
  onSelect,
  icon: Icon,
  title,
  description,
  disabled,
  role,
}: {
  selected: boolean;
  onSelect: () => void;
  icon: typeof CreditCard;
  title: string;
  description: string;
  disabled?: boolean;
  role?: "radio";
}) {
  return (
    <button
      type="button"
      role={role}
      aria-checked={role ? selected : undefined}
      aria-pressed={role ? undefined : selected}
      disabled={disabled}
      onClick={onSelect}
      className={cn(
        "flex w-full items-start gap-3 rounded-lg border p-4 text-left transition disabled:cursor-not-allowed disabled:opacity-50",
        selected
          ? "border-charcoal-dark bg-background ring-1 ring-charcoal-dark"
          : "border-border hover:border-foreground/30",
      )}
    >
      <Icon
        className={cn("mt-0.5 h-5 w-5 shrink-0", selected ? "text-gold" : "text-muted-foreground")}
        aria-hidden
      />
      <span>
        <span className="block font-display text-sm font-semibold">{title}</span>
        <span className="mt-0.5 block text-xs text-muted-foreground">{description}</span>
      </span>
    </button>
  );
}

function FieldWrap({
  label,
  error,
  className,
  children,
}: {
  label: string;
  error?: string;
  className?: string;
  children: (id: string, describedBy: string | undefined) => ReactNode;
}) {
  const id = useId();
  const errorId = `${id}-error`;
  return (
    <div className={className}>
      <label htmlFor={id} className="mb-1.5 block text-xs font-semibold">
        {label}
      </label>
      {children(id, error ? errorId : undefined)}
      {error && (
        <p id={errorId} className="mt-1 text-xs text-destructive">
          {error}
        </p>
      )}
    </div>
  );
}

function Input({
  label,
  value,
  onChange,
  error,
  className,
  type = "text",
  autoComplete,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  error?: string;
  className?: string;
  type?: string;
  autoComplete?: string;
  placeholder?: string;
}) {
  return (
    <FieldWrap label={label} error={error} className={className}>
      {(id, describedBy) => (
        <input
          id={id}
          type={type}
          value={value}
          autoComplete={autoComplete}
          placeholder={placeholder}
          aria-invalid={Boolean(error) || undefined}
          aria-describedby={describedBy}
          onChange={(event) => onChange(event.target.value)}
          className={field}
        />
      )}
    </FieldWrap>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-4">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="text-right font-mono">{value}</dd>
    </div>
  );
}

function Notice({ tone, children }: { tone: "danger" | "warning"; children: ReactNode }) {
  return (
    <p
      role="alert"
      className={cn(
        "rounded-lg border p-4 text-sm",
        tone === "danger"
          ? "border-destructive/30 bg-destructive/5 text-destructive"
          : "border-orange-500/30 bg-orange-500/10 text-orange-900 dark:text-orange-200",
      )}
    >
      {children}
    </p>
  );
}
