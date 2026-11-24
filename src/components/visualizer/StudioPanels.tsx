"use client";

import Image from "next/image";
import Link from "next/link";
import { Camera, Check, Moon, Pipette, Sun, SunDim, Sunrise, Upload, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { library, useLibrary } from "@/lib/visualizer/library";
import { PAINT_GROUPS, paintName } from "@/lib/visualizer/paints";
import type { Finish, LightMood, Placement } from "@/lib/visualizer/types";
import { cn } from "@/lib/utils";
import { Chip, Slider } from "./AdjustPanel";

export type StudioRoom = {
  src: string;
  label: string;
  thumb?: string;
  /** Whether the room can be painted, and has a rug that can be taken away. */
  hasWalls?: boolean;
  hasRug?: boolean;
};

function Heading({ children }: { children: React.ReactNode }) {
  return (
    <h3 className="font-display text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
      {children}
    </h3>
  );
}

/**
 * Rooms: your own photo first — it is the reason the tool exists — then ours,
 * then designs saved earlier.
 */
export function RoomsPanel({
  rooms,
  current,
  onUpload,
  onCamera,
  onRoom,
  rug,
}: {
  rooms: StudioRoom[];
  current: string;
  onUpload: () => void;
  onCamera: () => void;
  onRoom: (room: StudioRoom) => void;
  /** Present when the current room has a rug: whether it is shown, and the switch. */
  rug?: { shown: boolean; onChange: (shown: boolean) => void } | null;
}) {
  const { designs } = useLibrary();

  return (
    <div className="space-y-6">
      <section className="rounded-xl border border-dashed border-gold/50 bg-gold/5 p-4">
        <p className="font-display text-base font-semibold">See it in your own room</p>
        <p className="mt-1 text-xs text-muted-foreground">
          Upload a photo and we find the floor for you. It stays on this device unless you save it.
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          <Button className="h-10 flex-1" onClick={onUpload}>
            <Upload aria-hidden />
            Upload photo
          </Button>
          {/* Only offered where there is a camera to open. */}
          <Button
            variant="outline"
            className="hidden h-10 flex-1 [@media(pointer:coarse)]:inline-flex"
            onClick={onCamera}
          >
            <Camera aria-hidden />
            Take photo
          </Button>
        </div>
        <p className="mt-2 text-[11px] text-muted-foreground">
          Tip: stand in a corner, hold the phone level at chest height and get plenty of floor in
          shot.
        </p>
      </section>

      <section>
        <Heading>Our rooms</Heading>
        <div className="mt-2 grid grid-cols-2 gap-2">
          {rooms.map((room) => {
            const active = current === room.src;
            return (
              <button
                key={room.src}
                type="button"
                onClick={() => onRoom(room)}
                aria-pressed={active}
                className={cn(
                  "group relative aspect-[3/2] overflow-hidden rounded-lg bg-muted text-left transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold",
                  active
                    ? "ring-2 ring-gold ring-offset-2 ring-offset-background"
                    : "hover:shadow-luxe",
                )}
              >
                <Image
                  src={room.thumb ?? room.src}
                  alt=""
                  fill
                  sizes="160px"
                  className="object-cover transition duration-300 group-hover:scale-[1.03]"
                />
                <span className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/75 to-transparent px-2 pb-1.5 pt-5 text-[11px] font-semibold text-white">
                  {room.label}
                </span>
                {active && (
                  <span className="absolute right-1.5 top-1.5 grid h-5 w-5 place-items-center rounded-full bg-gold text-charcoal-dark">
                    <Check className="h-3 w-3" aria-hidden />
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </section>

      {rug && (
        <section className="flex items-center justify-between gap-3 rounded-lg border border-border p-3">
          <div>
            <p className="text-sm font-semibold">Rug</p>
            <p className="text-[11px] text-muted-foreground">
              Take it away to see the whole floor.
            </p>
          </div>
          <div role="radiogroup" aria-label="Rug" className="flex gap-1">
            <Chip active={rug.shown} onClick={() => rug.onChange(true)}>
              Show
            </Chip>
            <Chip active={!rug.shown} onClick={() => rug.onChange(false)}>
              Hide
            </Chip>
          </div>
        </section>
      )}

      {designs.length > 0 && (
        <section>
          <Heading>Your saved designs</Heading>
          <ul className="mt-2 space-y-2">
            {designs.slice(0, 6).map((design) => (
              <li key={design.token} className="flex items-center gap-3">
                <Link
                  href={`/visualizer?design=${design.token}`}
                  scroll={false}
                  className="flex min-w-0 flex-1 items-center gap-3 rounded-md p-1 transition hover:bg-surface"
                >
                  <span
                    className="h-12 w-16 shrink-0 rounded bg-muted bg-cover bg-center"
                    style={
                      design.imageUrl ? { backgroundImage: `url(${design.imageUrl})` } : undefined
                    }
                  />
                  <span className="min-w-0">
                    <span className="block truncate text-sm">
                      {design.productName ?? "Room design"}
                    </span>
                    <span className="block text-[11px] text-muted-foreground">
                      {new Date(design.savedAt).toLocaleDateString()}
                    </span>
                  </span>
                </Link>
                <button
                  type="button"
                  onClick={() => library.forgetDesign(design.token)}
                  aria-label="Remove from this list"
                  className="grid h-8 w-8 place-items-center rounded-full text-muted-foreground hover:bg-surface hover:text-foreground"
                >
                  <X className="h-3.5 w-3.5" aria-hidden />
                </button>
              </li>
            ))}
          </ul>
          <p className="mt-2 text-[11px] text-muted-foreground">
            Kept in this browser.{" "}
            <Link href="/account/saved" className="underline underline-offset-2">
              Sign in
            </Link>{" "}
            to keep designs with your account.
          </p>
        </section>
      )}
    </div>
  );
}

/** Wall paint, for rooms whose walls were prepared for it. */
export function PaintPanel({
  available,
  color,
  onChange,
  onShowRooms,
}: {
  available: boolean;
  color: string | null;
  onChange: (color: string | null) => void;
  onShowRooms: () => void;
}) {
  if (!available) {
    return (
      <div className="rounded-lg border border-border bg-surface p-4 text-sm">
        <p className="font-semibold">Paint works in our rooms</p>
        <p className="mt-1 text-muted-foreground">
          Their walls are prepared for it. Pick one of our rooms to try a wall colour with your
          floor.
        </p>
        <Button variant="outline" className="mt-3 h-9" onClick={onShowRooms}>
          Choose a room
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm">
          <span className="text-muted-foreground">Walls · </span>
          <span className="font-semibold">{color ? paintName(color) : "As photographed"}</span>
        </p>
        {color && (
          <button
            type="button"
            onClick={() => onChange(null)}
            className="text-xs text-muted-foreground underline underline-offset-2 hover:text-foreground"
          >
            Reset walls
          </button>
        )}
      </div>

      {PAINT_GROUPS.map((group) => (
        <section key={group.name}>
          <Heading>{group.name}</Heading>
          <div role="radiogroup" aria-label={group.name} className="mt-2 grid grid-cols-6 gap-2">
            {group.paints.map((paint) => {
              const active = color === paint.color;
              return (
                <button
                  key={paint.color}
                  type="button"
                  role="radio"
                  aria-checked={active}
                  aria-label={paint.name}
                  title={paint.name}
                  onClick={() => onChange(paint.color)}
                  className={cn(
                    "relative aspect-square rounded-md border border-black/10 shadow-sm transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold focus-visible:ring-offset-2",
                    active ? "ring-2 ring-charcoal ring-offset-2" : "hover:scale-105",
                  )}
                  style={{ backgroundColor: paint.color }}
                >
                  {active && (
                    <Check
                      className="absolute inset-0 m-auto h-4 w-4 text-white mix-blend-difference"
                      aria-hidden
                    />
                  )}
                </button>
              );
            })}
          </div>
        </section>
      ))}

      <label className="flex items-center gap-3 rounded-lg border border-border p-3 text-sm">
        <Pipette className="h-4 w-4 text-muted-foreground" aria-hidden />
        <span className="flex-1">Your own colour</span>
        <input
          type="color"
          value={color ?? "#e7dccb"}
          onChange={(event) => onChange(event.target.value)}
          className="h-8 w-12 cursor-pointer rounded border border-border bg-transparent"
          aria-label="Pick a wall colour"
        />
      </label>
    </div>
  );
}

const MOODS: { value: LightMood; label: string; hint: string; icon: React.ReactNode }[] = [
  {
    value: "daylight",
    label: "Daylight",
    hint: "As photographed",
    icon: <Sun className="h-4 w-4" />,
  },
  {
    value: "warm",
    label: "Warm white",
    hint: "Bulbs at 2700K",
    icon: <SunDim className="h-4 w-4" />,
  },
  {
    value: "cool",
    label: "Cool white",
    hint: "Offices, kitchens",
    icon: <Sunrise className="h-4 w-4" />,
  },
  {
    value: "evening",
    label: "Evening",
    hint: "Low, golden light",
    icon: <Moon className="h-4 w-4" />,
  },
];

const FINISHES: { value: Finish; label: string }[] = [
  { value: "matte", label: "Matt" },
  { value: "satin", label: "Satin" },
  { value: "gloss", label: "Gloss" },
];

/** How the room is lit, and how the floor takes the light. */
export function LightPanel({
  mood,
  onMood,
  placement,
  onPlacement,
}: {
  mood: LightMood;
  onMood: (mood: LightMood) => void;
  placement: Placement;
  onPlacement: (placement: Placement) => void;
}) {
  return (
    <div className="space-y-6">
      <section>
        <Heading>Room light</Heading>
        <div role="radiogroup" aria-label="Room light" className="mt-2 grid grid-cols-2 gap-2">
          {MOODS.map((option) => (
            <button
              key={option.value}
              type="button"
              role="radio"
              aria-checked={mood === option.value}
              onClick={() => onMood(option.value)}
              className={cn(
                "flex items-start gap-2 rounded-lg border p-3 text-left transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold",
                mood === option.value
                  ? "border-charcoal bg-charcoal text-primary-foreground"
                  : "border-border hover:border-foreground/40",
              )}
            >
              <span aria-hidden className="mt-0.5">
                {option.icon}
              </span>
              <span>
                <span className="block text-sm font-semibold">{option.label}</span>
                <span
                  className={cn(
                    "block text-[11px]",
                    mood === option.value ? "text-primary-foreground/70" : "text-muted-foreground",
                  )}
                >
                  {option.hint}
                </span>
              </span>
            </button>
          ))}
        </div>
      </section>

      <section className="space-y-4">
        <Heading>On the floor</Heading>
        <div role="radiogroup" aria-label="Finish" className="flex gap-1.5">
          {FINISHES.map((finish) => (
            <Chip
              key={finish.value}
              active={placement.finish === finish.value}
              onClick={() => onPlacement({ ...placement, finish: finish.value })}
            >
              {finish.label}
            </Chip>
          ))}
        </div>
        <Slider
          id="light-strength"
          label="Shadows and reflections"
          hint={`${Math.round(placement.lighting * 100)}%`}
          min={0}
          max={100}
          step={5}
          value={Math.round(placement.lighting * 100)}
          onChange={(value) => onPlacement({ ...placement, lighting: value / 100 })}
        />
        <Slider
          id="light-brightness"
          label="Floor brightness"
          hint={`${Math.round(placement.brightness * 100)}%`}
          min={60}
          max={140}
          step={5}
          value={Math.round(placement.brightness * 100)}
          onChange={(value) => onPlacement({ ...placement, brightness: value / 100 })}
        />
      </section>
    </div>
  );
}
