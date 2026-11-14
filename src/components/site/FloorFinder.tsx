"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState, type ComponentType, type Ref } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  ArrowLeft,
  ArrowRight,
  Bath,
  BedDouble,
  Briefcase,
  Building2,
  Car,
  Check,
  CookingPot,
  DoorOpen,
  Droplets,
  Dumbbell,
  Feather,
  Footprints,
  Loader2,
  MessageCircle,
  PawPrint,
  RotateCcw,
  Sofa,
  Sparkles,
  Store,
  Trees,
  User,
  Users,
  VolumeX,
  Wrench,
} from "lucide-react";
import { ProductCard } from "@/components/catalog/ProductCard";
import type { ProductCard as ProductCardData } from "@/lib/api/types";
import { openChat } from "@/lib/ai-support/events";
import { categoryHref } from "@/lib/floor-families";
import { cn } from "@/lib/utils";

type Icon = ComponentType<{ className?: string }>;
type Option = { value: string; label: string; hint?: string; icon?: Icon; swatch?: string };
type StepKey = "room" | "household" | "needs" | "look" | "budget";
type Step = {
  key: StepKey;
  title: string;
  subtitle: string;
  multiple?: boolean;
  options: Option[];
};

type Answers = {
  room: string;
  household: string;
  needs: string[];
  look: string;
  budget: string;
};

type Result = {
  product: ProductCardData;
  family: string;
  match: number;
  within_budget: boolean;
  reasons: string[];
  why: string | null;
};

type FinderResponse = {
  summary: string;
  results: Result[];
  families: { label: string; category: string }[];
};

const STEPS: Step[] = [
  {
    key: "room",
    title: "Where is the floor going?",
    subtitle: "Pick the main space.",
    options: [
      { value: "living", label: "Living room", icon: Sofa },
      { value: "bedroom", label: "Bedroom", icon: BedDouble },
      { value: "kitchen", label: "Kitchen", icon: CookingPot },
      { value: "bathroom", label: "Bathroom / wet area", icon: Bath },
      { value: "office", label: "Office", icon: Briefcase },
      { value: "commercial", label: "Shop, hotel, restaurant", icon: Store },
      { value: "play", label: "Gym or play area", icon: Dumbbell },
      { value: "outdoor", label: "Garden, terrace, pool", icon: Trees },
      { value: "garage", label: "Garage or workshop", icon: Car },
      { value: "entrance", label: "Entrance / doorway", icon: DoorOpen },
    ],
  },
  {
    key: "household",
    title: "Who uses it?",
    subtitle: "This tells us how tough it needs to be.",
    options: [
      { value: "adults", label: "Adults only", hint: "Light, careful use", icon: User },
      {
        value: "kids_pets",
        label: "Kids or pets",
        hint: "Spills, scratches, play",
        icon: PawPrint,
      },
      { value: "busy", label: "Busy household", hint: "Lots of coming and going", icon: Users },
      {
        value: "heavy",
        label: "Customers / staff",
        hint: "Heavy commercial traffic",
        icon: Building2,
      },
    ],
  },
  {
    key: "needs",
    title: "What matters most?",
    subtitle: "Choose any that apply, then continue.",
    multiple: true,
    options: [
      { value: "waterproof", label: "Waterproof", icon: Droplets },
      { value: "easy_clean", label: "Easy to clean", icon: Sparkles },
      { value: "soft", label: "Soft & warm underfoot", icon: Feather },
      { value: "quiet", label: "Quiet", icon: VolumeX },
      { value: "slip", label: "Slip-resistant", icon: Footprints },
      { value: "diy", label: "Quick to install", icon: Wrench },
    ],
  },
  {
    key: "look",
    title: "What look do you like?",
    subtitle: "Go with your first instinct.",
    options: [
      {
        value: "wood",
        label: "Wood",
        swatch:
          "repeating-linear-gradient(90deg,#8a5a34 0 18px,#a06c43 18px 34px,#7a4e2c 34px 50px)",
      },
      {
        value: "stone",
        label: "Stone, marble, concrete",
        swatch: "radial-gradient(circle at 30% 30%,#e7e5e4,#a8a29e 60%,#78716c)",
      },
      {
        value: "plain",
        label: "Plain or bold colour",
        swatch: "linear-gradient(135deg,#1f2937 50%,#b91c1c 50%)",
      },
      {
        value: "soft",
        label: "Soft carpet",
        swatch: "repeating-radial-gradient(circle,#9ca3af 0 2px,#6b7280 2px 4px)",
      },
      {
        value: "grass",
        label: "Natural grass",
        swatch: "repeating-linear-gradient(80deg,#3f7d2c 0 3px,#5aa13d 3px 6px)",
      },
      {
        value: "any",
        label: "No preference",
        swatch: "conic-gradient(#8a5a34,#a8a29e,#1f2937,#5aa13d,#8a5a34)",
      },
    ],
  },
  {
    key: "budget",
    title: "What's your budget?",
    subtitle: "Per square metre (or per piece for mats and tiles).",
    options: [
      { value: "low", label: "Under ₦10,000" },
      { value: "mid", label: "₦10,000 – ₦20,000" },
      { value: "high", label: "₦20,000 – ₦40,000" },
      { value: "any", label: "Show me the best", hint: "No fixed budget" },
    ],
  },
];

const EMPTY: Answers = { room: "", household: "", needs: [], look: "", budget: "" };

function answersFromParams(params: URLSearchParams): Answers | null {
  const answers: Answers = {
    room: params.get("room") ?? "",
    household: params.get("household") ?? "",
    needs: (params.get("needs") ?? "").split(",").filter(Boolean),
    look: params.get("look") ?? "",
    budget: params.get("budget") ?? "",
  };
  const valid = STEPS.every((step) =>
    step.multiple
      ? answers.needs.every((need) => step.options.some((o) => o.value === need))
      : step.options.some((o) => o.value === answers[step.key]),
  );
  return valid ? answers : null;
}

/**
 * "Find my floor": five taps, three recommendations with reasons.
 *
 * Answers end up in the URL, so a result page can be shared or bookmarked
 * and reopens straight onto the recommendations.
 */
export function FloorFinder() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [stepIndex, setStepIndex] = useState(0);
  const [answers, setAnswers] = useState<Answers>(EMPTY);
  const [result, setResult] = useState<FinderResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const topRef = useRef<HTMLDivElement>(null);

  const step = STEPS[stepIndex];

  const submit = useCallback(
    async (final: Answers) => {
      setLoading(true);
      setError(null);
      try {
        const response = await fetch("/api/ai-support/floor-finder", {
          method: "POST",
          headers: { "Content-Type": "application/json", Accept: "application/json" },
          body: JSON.stringify(final),
        });
        if (!response.ok) throw new Error();
        const { data } = (await response.json()) as { data: FinderResponse };
        setResult(data);
        const params = new URLSearchParams({
          room: final.room,
          household: final.household,
          needs: final.needs.join(","),
          look: final.look,
          budget: final.budget,
        });
        router.replace(`${pathname}?${params.toString()}`, { scroll: false });
      } catch {
        setError("We couldn't load recommendations just now. Please try again.");
      } finally {
        setLoading(false);
        topRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
      }
    },
    [pathname, router],
  );

  // A shared link opens straight onto its results.
  const restoredRef = useRef(false);
  useEffect(() => {
    if (restoredRef.current) return;
    restoredRef.current = true;
    const restored = answersFromParams(new URLSearchParams(searchParams.toString()));
    if (restored) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- restores a shared result from the URL once, after mount
      setAnswers(restored);
      setStepIndex(STEPS.length - 1);
      void submit(restored);
    }
  }, [searchParams, submit]);

  const choose = (value: string) => {
    if (step.multiple) {
      setAnswers((prev) => ({
        ...prev,
        needs: prev.needs.includes(value)
          ? prev.needs.filter((n) => n !== value)
          : [...prev.needs, value],
      }));
      return;
    }
    const next = { ...answers, [step.key]: value } as Answers;
    setAnswers(next);
    advance(next);
  };

  const advance = (next: Answers) => {
    if (stepIndex === STEPS.length - 1) {
      void submit(next);
    } else {
      setStepIndex((index) => index + 1);
    }
  };

  const restart = () => {
    setResult(null);
    setAnswers(EMPTY);
    setStepIndex(0);
    router.replace(pathname, { scroll: false });
  };

  if (loading) {
    return (
      <div
        ref={topRef}
        className="flex min-h-[420px] flex-col items-center justify-center gap-4 text-center"
      >
        <Loader2 className="h-8 w-8 animate-spin text-gold" />
        <p className="font-display text-xl">Matching floors to your answers…</p>
        <p className="text-sm text-muted-foreground">
          Checking every floor we stock for your room.
        </p>
      </div>
    );
  }

  if (result) {
    return <Results ref={topRef} data={result} onRestart={restart} />;
  }

  return (
    <div ref={topRef} className="mx-auto max-w-4xl">
      <div className="mb-8 flex items-center gap-4">
        <button
          type="button"
          onClick={() => setStepIndex((index) => Math.max(0, index - 1))}
          disabled={stepIndex === 0}
          className="inline-flex items-center gap-1 text-sm text-muted-foreground transition hover:text-foreground disabled:invisible"
        >
          <ArrowLeft className="h-4 w-4" /> Back
        </button>
        <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted" aria-hidden>
          <div
            className="h-full rounded-full bg-gold transition-all duration-500"
            style={{ width: `${((stepIndex + 1) / STEPS.length) * 100}%` }}
          />
        </div>
        <span className="text-xs font-semibold text-muted-foreground">
          {stepIndex + 1} / {STEPS.length}
        </span>
      </div>

      <h2 className="font-display text-3xl tracking-tight md:text-4xl">{step.title}</h2>
      <p className="mt-2 text-muted-foreground">{step.subtitle}</p>

      <div
        role={step.multiple ? "group" : "radiogroup"}
        aria-label={step.title}
        className={cn(
          "mt-8 grid gap-3",
          step.options.length > 6 ? "grid-cols-2 md:grid-cols-5" : "grid-cols-2 md:grid-cols-3",
          step.key === "budget" && "md:grid-cols-4",
        )}
      >
        {step.options.map((option) => {
          const selected = step.multiple
            ? answers.needs.includes(option.value)
            : answers[step.key] === option.value;
          const Icon = option.icon;
          return (
            <button
              key={option.value}
              type="button"
              role={step.multiple ? "checkbox" : "radio"}
              aria-checked={selected}
              onClick={() => choose(option.value)}
              className={cn(
                "group relative flex min-h-28 flex-col items-start justify-between gap-3 rounded-xl border p-4 text-left transition",
                "hover:-translate-y-0.5 hover:border-foreground/40 hover:shadow-sm",
                selected && "border-gold bg-gold/5 ring-2 ring-gold/30",
              )}
            >
              {option.swatch ? (
                <span
                  className="h-10 w-full rounded-md border"
                  style={{ background: option.swatch }}
                  aria-hidden
                />
              ) : Icon ? (
                <Icon
                  className={cn(
                    "h-6 w-6 text-muted-foreground transition group-hover:text-foreground",
                    selected && "text-gold",
                  )}
                />
              ) : null}
              <span>
                <span className="block text-sm font-semibold leading-snug">{option.label}</span>
                {option.hint && (
                  <span className="mt-0.5 block text-xs text-muted-foreground">{option.hint}</span>
                )}
              </span>
              {selected && (
                <span className="absolute right-3 top-3 flex h-5 w-5 items-center justify-center rounded-full bg-gold text-white">
                  <Check className="h-3 w-3" />
                </span>
              )}
            </button>
          );
        })}
      </div>

      {step.multiple && (
        <div className="mt-8 flex items-center justify-between gap-4">
          <p className="text-sm text-muted-foreground">
            {answers.needs.length === 0
              ? "Nothing special? That's fine too."
              : `${answers.needs.length} selected`}
          </p>
          <button
            type="button"
            onClick={() => advance(answers)}
            className="btn btn-primary inline-flex h-11 items-center gap-2 rounded-md px-6 text-sm"
          >
            Continue <ArrowRight className="h-4 w-4" />
          </button>
        </div>
      )}

      {error && (
        <p role="alert" className="mt-6 text-sm text-destructive">
          {error}
        </p>
      )}
    </div>
  );
}

function Results({
  data,
  onRestart,
  ref,
}: {
  data: FinderResponse;
  onRestart: () => void;
  ref: Ref<HTMLDivElement>;
}) {
  const best = data.results[0]?.match ?? 0;
  const weak = data.results.length === 0 || best < 60;
  const names = data.results.map((r) => r.product.name).join(", ");

  return (
    <div ref={ref}>
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="eyebrow">Your recommendations</p>
          <h2 className="mt-2 font-display text-3xl tracking-tight md:text-4xl">
            {weak ? "Closest matches we have online" : "Floors that fit your space"}
          </h2>
          <p className="mt-2 max-w-2xl text-sm text-muted-foreground">For a {data.summary}.</p>
        </div>
        <button
          type="button"
          onClick={onRestart}
          className="btn btn-outline inline-flex h-10 shrink-0 items-center gap-2 rounded-md px-4 text-sm"
        >
          <RotateCcw className="h-4 w-4" /> Start again
        </button>
      </div>

      {weak && (
        <div className="mt-6 rounded-lg border border-orange-300/60 bg-orange-50 px-4 py-3 text-sm text-orange-900 dark:bg-orange-950/30 dark:text-orange-200">
          We don&apos;t have a strong match for this online yet — our showrooms stock more.{" "}
          <button
            type="button"
            className="font-semibold underline"
            onClick={() =>
              openChat(`I'm looking for flooring for a ${data.summary}. What do you recommend?`)
            }
          >
            Ask our assistant
          </button>{" "}
          or{" "}
          <Link href="/contact?enquiry=quote" className="font-semibold underline">
            request a quote
          </Link>
          .
        </div>
      )}

      <div className="mt-8 grid gap-6 lg:grid-cols-3">
        {data.results.map((result, index) => (
          <article
            key={result.product.id}
            className="flex flex-col overflow-hidden rounded-xl border"
          >
            <div className="flex items-center justify-between gap-2 border-b bg-muted/40 px-4 py-2.5">
              <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                {index === 0 ? "Best match" : `Option ${index + 1}`} · {result.family}
              </span>
              <span
                className={cn(
                  "rounded-full px-2 py-0.5 text-xs font-bold",
                  result.match >= 75
                    ? "bg-emerald-600/15 text-emerald-800 dark:text-emerald-300"
                    : "bg-muted text-muted-foreground",
                )}
              >
                {result.match}% match
              </span>
            </div>
            <ProductCard product={result.product} priority={index === 0} className="border-0" />
            <div className="flex flex-1 flex-col gap-3 p-4 pt-0">
              {result.why && <p className="text-sm italic leading-relaxed">“{result.why}”</p>}
              <ul className="space-y-1.5">
                {result.reasons.map((reason) => (
                  <li key={reason} className="flex gap-2 text-sm text-muted-foreground">
                    <Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" /> {reason}
                  </li>
                ))}
                {!result.within_budget && (
                  <li className="text-xs text-orange-700 dark:text-orange-300">
                    A little above your budget.
                  </li>
                )}
              </ul>
              <div className="mt-auto grid grid-cols-2 gap-2 pt-2">
                <Link
                  href={`/visualizer?product=${result.product.slug}`}
                  className="btn btn-primary inline-flex h-10 items-center justify-center rounded-md px-3 text-xs"
                >
                  See it in my room
                </Link>
                <button
                  type="button"
                  onClick={() =>
                    openChat(
                      `How much ${result.product.name} do I need for my ${data.summary.split(" used by")[0]}, and what would it cost?`,
                    )
                  }
                  className="btn btn-outline inline-flex h-10 items-center justify-center rounded-md px-3 text-xs"
                >
                  How much do I need?
                </button>
              </div>
            </div>
          </article>
        ))}
      </div>

      <div className="mt-10 flex flex-col gap-4 rounded-xl border bg-surface p-6 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="font-display text-lg font-semibold">Questions about these?</p>
          <p className="text-sm text-muted-foreground">
            Our assistant can compare them, work out how much you need, or arrange a quote.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {names && (
            <button
              type="button"
              onClick={() =>
                openChat(
                  `I'm choosing between ${names} for a ${data.summary}. Which would you pick, and how much would I need?`,
                )
              }
              className="btn btn-primary inline-flex h-10 items-center gap-2 rounded-md px-4 text-sm"
            >
              <MessageCircle className="h-4 w-4" /> Ask the assistant
            </button>
          )}
          {data.families.slice(0, 2).map((family) => (
            <Link
              key={family.category}
              href={categoryHref(family.category)}
              className="btn btn-outline inline-flex h-10 items-center rounded-md px-4 text-sm"
            >
              Browse {family.label}
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
