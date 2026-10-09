"use client";

import Image from "next/image";
import { useRef, useState } from "react";
import { Camera, CheckCircle2, Circle, Loader2, Plus, Trash2 } from "lucide-react";
import { adminRequest, useAdminMutation } from "@/lib/admin/client";
import { number } from "@/lib/format";
import { cn } from "@/lib/utils";
import { inputClass } from "./forms";
import type { ChecklistItem, MediaItem, Measurement } from "@/lib/admin/types";

/**
 * Room-by-room measurements on a site survey. Give length and width (metres
 * or feet) and the area is worked out; or type an area for odd shapes.
 */
export function MeasurementsEditor({
  surveyId,
  measurements,
  editable,
}: {
  surveyId: number;
  measurements: Measurement[];
  editable: boolean;
}) {
  const [room, setRoom] = useState({
    room_name: "",
    unit: "m",
    length: "",
    width: "",
    area_sqm: "",
    deduction_sqm: "",
  });
  const { run, pending, errors } = useAdminMutation();
  const total = measurements.reduce((sum, measurement) => sum + measurement.net_area_sqm, 0);

  async function add(event: React.FormEvent) {
    event.preventDefault();
    const result = await run(
      () =>
        adminRequest("POST", `surveys/${surveyId}/measurements`, {
          room_name: room.room_name,
          unit: room.unit,
          length: room.length ? Number(room.length) : null,
          width: room.width ? Number(room.width) : null,
          area_sqm: room.area_sqm ? Number(room.area_sqm) : null,
          deduction_sqm: room.deduction_sqm ? Number(room.deduction_sqm) : null,
        }),
      { success: "Room added." },
    );
    if (result)
      setRoom({
        room_name: "",
        unit: room.unit,
        length: "",
        width: "",
        area_sqm: "",
        deduction_sqm: "",
      });
  }

  return (
    <div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[560px] text-sm">
          <thead>
            <tr className="border-b border-border text-left text-xs text-muted-foreground">
              <th scope="col" className="py-2 pr-3 font-medium">
                Room
              </th>
              <th scope="col" className="py-2 pr-3 font-medium">
                Size
              </th>
              <th scope="col" className="py-2 pr-3 text-right font-medium">
                Area
              </th>
              <th scope="col" className="py-2 pr-3 text-right font-medium">
                Less
              </th>
              <th scope="col" className="py-2 text-right font-medium">
                Net m²
              </th>
              {editable && <th scope="col" className="w-10" />}
            </tr>
          </thead>
          <tbody>
            {measurements.map((measurement) => (
              <MeasurementRow
                key={measurement.id}
                surveyId={surveyId}
                measurement={measurement}
                editable={editable}
              />
            ))}
            {measurements.length === 0 && (
              <tr>
                <td colSpan={6} className="py-4 text-sm text-muted-foreground">
                  No rooms measured yet.
                </td>
              </tr>
            )}
          </tbody>
          <tfoot>
            <tr className="font-semibold">
              <td colSpan={4} className="py-2 text-right">
                Total to cover
              </td>
              <td className="py-2 text-right tabular-nums">{number(total)} m²</td>
              {editable && <td />}
            </tr>
          </tfoot>
        </table>
      </div>

      {editable && (
        <form
          onSubmit={add}
          className="mt-4 grid gap-2 rounded-md border border-border p-3 sm:grid-cols-[minmax(0,2fr)_5rem_repeat(4,minmax(0,1fr))_auto]"
        >
          <input
            value={room.room_name}
            onChange={(event) => setRoom({ ...room, room_name: event.target.value })}
            placeholder="Room, e.g. Master bedroom"
            aria-label="Room"
            aria-invalid={errors.room_name ? true : undefined}
            className={inputClass}
          />
          <select
            value={room.unit}
            onChange={(event) => setRoom({ ...room, unit: event.target.value })}
            aria-label="Unit"
            className={inputClass}
          >
            <option value="m">m</option>
            <option value="ft">ft</option>
          </select>
          <input
            inputMode="decimal"
            value={room.length}
            onChange={(event) => setRoom({ ...room, length: event.target.value })}
            placeholder="Length"
            aria-label="Length"
            className={inputClass}
          />
          <input
            inputMode="decimal"
            value={room.width}
            onChange={(event) => setRoom({ ...room, width: event.target.value })}
            placeholder="Width"
            aria-label="Width"
            className={inputClass}
          />
          <input
            inputMode="decimal"
            value={room.area_sqm}
            onChange={(event) => setRoom({ ...room, area_sqm: event.target.value })}
            placeholder="or area m²"
            aria-label="Area in square metres"
            aria-invalid={errors.area_sqm ? true : undefined}
            className={inputClass}
          />
          <input
            inputMode="decimal"
            value={room.deduction_sqm}
            onChange={(event) => setRoom({ ...room, deduction_sqm: event.target.value })}
            placeholder="Less m²"
            aria-label="Deduction in square metres"
            className={inputClass}
          />
          <button
            type="submit"
            disabled={pending || !room.room_name.trim()}
            className="btn btn-primary h-10 rounded-md px-3 text-xs"
          >
            {pending ? (
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
            ) : (
              <Plus className="h-4 w-4" aria-hidden />
            )}{" "}
            Add
          </button>
          {(errors.area_sqm || errors.room_name) && (
            <p className="text-xs text-destructive sm:col-span-7">
              {errors.area_sqm?.[0] ?? errors.room_name?.[0]}
            </p>
          )}
        </form>
      )}
    </div>
  );
}

function MeasurementRow({
  surveyId,
  measurement,
  editable,
}: {
  surveyId: number;
  measurement: Measurement;
  editable: boolean;
}) {
  const { run, pending } = useAdminMutation();

  return (
    <tr className="border-b border-border">
      <td className="py-2 pr-3">
        {measurement.room_name}
        {measurement.notes && <p className="text-xs text-muted-foreground">{measurement.notes}</p>}
      </td>
      <td className="py-2 pr-3 text-muted-foreground">
        {measurement.length && measurement.width
          ? `${number(measurement.length)} × ${number(measurement.width)} ${measurement.unit}`
          : "—"}
      </td>
      <td className="py-2 pr-3 text-right tabular-nums">{number(measurement.area_sqm)}</td>
      <td className="py-2 pr-3 text-right tabular-nums">
        {measurement.deduction_sqm ? number(measurement.deduction_sqm) : "—"}
      </td>
      <td className="py-2 text-right tabular-nums">{number(measurement.net_area_sqm)}</td>
      {editable && (
        <td className="py-2 pl-2">
          <button
            type="button"
            disabled={pending}
            aria-label={`Remove ${measurement.room_name}`}
            onClick={() =>
              run(() =>
                adminRequest("DELETE", `surveys/${surveyId}/measurements/${measurement.id}`),
              )
            }
            className="inline-flex h-8 w-8 items-center justify-center text-muted-foreground hover:text-destructive"
          >
            {pending ? (
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
            ) : (
              <Trash2 className="h-4 w-4" aria-hidden />
            )}
          </button>
        </td>
      )}
    </tr>
  );
}

/**
 * Site photos — before, after and progress — from a phone on site.
 */
export function PhotoUploader({
  type,
  id,
  photos,
  collections,
  editable,
}: {
  type: "project" | "installation" | "site_survey";
  id: number;
  photos: MediaItem[];
  collections: { value: string; label: string }[];
  editable: boolean;
}) {
  const input = useRef<HTMLInputElement>(null);
  const [collection, setCollection] = useState(collections[0]?.value ?? "gallery");
  const { run, pending } = useAdminMutation();

  async function upload(files: FileList | null) {
    if (!files?.length) return;
    for (const file of Array.from(files)) {
      const form = new FormData();
      form.append("file", file);
      form.append("collection", collection);
      await run(() => adminRequest("POST", `media/${type}/${id}`, form), {
        success: `${file.name} uploaded.`,
      });
    }
    if (input.current) input.current.value = "";
  }

  return (
    <div>
      {photos.length === 0 ? (
        <p className="text-sm text-muted-foreground">No photos yet.</p>
      ) : (
        <ul className="grid grid-cols-3 gap-2 sm:grid-cols-4">
          {photos.map((photo) => (
            <li key={photo.id} className="group relative">
              <a
                href={photo.url}
                target="_blank"
                rel="noopener"
                className="block overflow-hidden rounded-md border border-border"
              >
                <Image
                  src={photo.thumb_url}
                  alt={photo.alt ?? photo.name}
                  width={200}
                  height={200}
                  className="aspect-square w-full object-cover"
                />
              </a>
              <span className="absolute left-1 top-1 rounded bg-background/90 px-1 text-[10px] capitalize">
                {photo.collection}
              </span>
              {editable && (
                <button
                  type="button"
                  aria-label="Remove photo"
                  onClick={() =>
                    run(() => adminRequest("DELETE", `media/${type}/${id}/${photo.id}`), {
                      success: "Photo removed.",
                    })
                  }
                  className="absolute right-1 top-1 hidden rounded bg-background/90 p-1 text-destructive group-hover:block group-focus-within:block"
                >
                  <Trash2 className="h-3.5 w-3.5" aria-hidden />
                </button>
              )}
            </li>
          ))}
        </ul>
      )}
      {editable && (
        <div className="mt-3 flex flex-wrap items-center gap-2">
          {collections.length > 1 && (
            <select
              value={collection}
              onChange={(event) => setCollection(event.target.value)}
              aria-label="Photo type"
              className={cn(inputClass, "w-auto")}
            >
              {collections.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          )}
          <input
            ref={input}
            type="file"
            accept="image/jpeg,image/png,image/webp,image/avif"
            capture="environment"
            multiple
            className="sr-only"
            id={`upload-${type}-${id}`}
            onChange={(event) => upload(event.target.files)}
          />
          <label
            htmlFor={`upload-${type}-${id}`}
            className="btn btn-outline h-10 cursor-pointer rounded-md bg-background px-3 text-xs"
          >
            {pending ? (
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
            ) : (
              <Camera className="h-4 w-4" aria-hidden />
            )}{" "}
            Add photos
          </label>
        </div>
      )}
    </div>
  );
}

/**
 * The installer's job sheet: progress, the checklist, notes and the
 * customer's sign-off — what field staff may change from site (§31).
 */
export function InstallationJobSheet({
  installationId,
  status,
  checklist: initial,
  notes: initialNotes,
  signOffName,
  signedOffAt,
  editable,
}: {
  installationId: number;
  status: string;
  checklist: ChecklistItem[];
  notes: string | null;
  signOffName: string | null;
  signedOffAt: string | null;
  editable: boolean;
}) {
  const [checklist, setChecklist] = useState(initial);
  const [notes, setNotes] = useState(initialNotes ?? "");
  const [signOff, setSignOff] = useState(signOffName ?? "");
  const [newItem, setNewItem] = useState("");
  const { run, pending } = useAdminMutation();
  const done = checklist.filter((item) => item.done).length;

  function save(changes: Record<string, unknown>, success = "Saved.") {
    return run(() => adminRequest("PATCH", `installations/${installationId}/field`, changes), {
      success,
    });
  }

  async function toggle(index: number) {
    const next = checklist.map((item, position) =>
      position === index ? { ...item, done: !item.done } : item,
    );
    setChecklist(next);
    const result = await save(
      { checklist: next },
      next[index].done ? `“${next[index].label}” done.` : "Unticked.",
    );
    if (!result) setChecklist(checklist);
  }

  return (
    <div className="space-y-5">
      {editable && status !== "completed" && (
        <div className="flex flex-wrap gap-2">
          {status !== "in_progress" && (
            <button
              type="button"
              disabled={pending}
              onClick={() => save({ status: "in_progress" }, "Job started.")}
              className="btn btn-primary h-10 rounded-md px-4 text-xs"
            >
              Start job
            </button>
          )}
          <button
            type="button"
            disabled={pending || !signOff.trim()}
            onClick={() =>
              save(
                {
                  status: "completed",
                  sign_off_name: signOff.trim(),
                  checklist,
                  notes: notes || null,
                },
                "Job completed and signed off.",
              )
            }
            className="btn btn-gold h-10 rounded-md px-4 text-xs"
            title={signOff.trim() ? undefined : "Enter the customer's name for sign-off first"}
          >
            Complete & sign off
          </button>
          <button
            type="button"
            disabled={pending}
            onClick={() =>
              save({ status: "issue", notes: notes || null }, "Flagged for operations.")
            }
            className="btn h-10 rounded-md border border-destructive/40 px-4 text-xs text-destructive hover:bg-destructive/10"
          >
            Flag an issue
          </button>
        </div>
      )}

      <div>
        <p className="mb-2 text-xs font-semibold">
          Checklist · {done} of {checklist.length}
        </p>
        <ul className="space-y-1">
          {checklist.map((item, index) => (
            <li key={`${item.label}-${index}`}>
              <button
                type="button"
                disabled={!editable || pending}
                onClick={() => toggle(index)}
                className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm hover:bg-muted disabled:hover:bg-transparent"
                aria-pressed={item.done}
              >
                {item.done ? (
                  <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" aria-hidden />
                ) : (
                  <Circle className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
                )}
                <span className={cn(item.done && "text-muted-foreground line-through")}>
                  {item.label}
                </span>
              </button>
            </li>
          ))}
        </ul>
        {editable && (
          <form
            onSubmit={async (event) => {
              event.preventDefault();
              if (!newItem.trim()) return;
              const next = [...checklist, { label: newItem.trim(), done: false }];
              setChecklist(next);
              setNewItem("");
              await save({ checklist: next }, "Added to the checklist.");
            }}
            className="mt-2 flex gap-2"
          >
            <input
              value={newItem}
              onChange={(event) => setNewItem(event.target.value)}
              placeholder="Add a checklist item"
              aria-label="New checklist item"
              className={inputClass}
            />
            <button
              type="submit"
              disabled={!newItem.trim()}
              className="btn btn-outline h-10 rounded-md bg-background px-3 text-xs"
            >
              Add
            </button>
          </form>
        )}
      </div>

      <div>
        <label htmlFor={`notes-${installationId}`} className="mb-1.5 block text-xs font-semibold">
          Site notes
        </label>
        <textarea
          id={`notes-${installationId}`}
          value={notes}
          disabled={!editable}
          onChange={(event) => setNotes(event.target.value)}
          rows={3}
          className={cn(inputClass, "h-auto py-2")}
        />
        {editable && (
          <button
            type="button"
            disabled={pending}
            onClick={() => save({ notes: notes || null }, "Notes saved.")}
            className="btn btn-outline mt-2 h-9 rounded-md bg-background px-3 text-xs"
          >
            Save notes
          </button>
        )}
      </div>

      <div>
        <label htmlFor={`signoff-${installationId}`} className="mb-1.5 block text-xs font-semibold">
          Customer sign-off
        </label>
        {signedOffAt ? (
          <p className="text-sm">
            Signed off by <span className="font-semibold">{signOffName}</span>
          </p>
        ) : (
          <input
            id={`signoff-${installationId}`}
            value={signOff}
            disabled={!editable}
            onChange={(event) => setSignOff(event.target.value)}
            placeholder="Customer's full name"
            className={inputClass}
          />
        )}
      </div>
    </div>
  );
}
