"use client";

import Link from "next/link";
import { useState } from "react";
import {
  CalendarClock,
  CheckCircle2,
  Circle,
  Loader2,
  Mail,
  MessageCircle,
  Phone,
  StickyNote,
  Users,
  Zap,
} from "lucide-react";
import { adminRequest, useAdminMutation } from "@/lib/admin/client";
import { formatDateTime } from "@/lib/format";
import { cn } from "@/lib/utils";
import { inputClass } from "./forms";
import type { Activity, Option, Task } from "@/lib/admin/types";

const ICON: Record<string, typeof Phone> = {
  call: Phone,
  email: Mail,
  whatsapp: MessageCircle,
  meeting: Users,
  note: StickyNote,
  status_change: Zap,
  system: Zap,
};

const LOGGABLE = [
  { value: "note", label: "Note" },
  { value: "call", label: "Call" },
  { value: "whatsapp", label: "WhatsApp" },
  { value: "email", label: "Email" },
  { value: "meeting", label: "Meeting" },
];

/**
 * A record's timeline (calls, notes, status changes) with a box to log the
 * next conversation — the "calls/notes" of the customer record in §15.
 */
export function ActivityPanel({
  subjectType,
  subjectId,
  activities,
  canLog,
}: {
  subjectType: string;
  subjectId: number;
  activities: Activity[];
  canLog: boolean;
}) {
  const [type, setType] = useState("note");
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const { run, pending, errors } = useAdminMutation();

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    const result = await run(
      () =>
        adminRequest("POST", "activities", {
          subject_type: subjectType,
          subject_id: subjectId,
          type,
          title: title || LOGGABLE.find((option) => option.value === type)?.label,
          body: body || null,
        }),
      { success: "Logged." },
    );
    if (result) {
      setTitle("");
      setBody("");
    }
  }

  return (
    <div>
      {canLog && (
        <form onSubmit={submit} className="mb-5 space-y-2 rounded-md border border-border p-3">
          <div className="flex flex-wrap gap-1" role="radiogroup" aria-label="Kind of activity">
            {LOGGABLE.map((option) => {
              const Icon = ICON[option.value];
              return (
                <button
                  key={option.value}
                  type="button"
                  role="radio"
                  aria-checked={type === option.value}
                  onClick={() => setType(option.value)}
                  className={cn(
                    "inline-flex h-7 items-center gap-1.5 rounded-md px-2.5 text-xs",
                    type === option.value
                      ? "bg-charcoal-dark text-primary-foreground"
                      : "bg-muted text-muted-foreground hover:text-foreground",
                  )}
                >
                  <Icon className="h-3.5 w-3.5" aria-hidden /> {option.label}
                </button>
              );
            })}
          </div>
          <input
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            placeholder="Summary — e.g. Agreed survey for Tuesday"
            aria-label="Summary"
            aria-invalid={errors.title ? true : undefined}
            className={inputClass}
          />
          <textarea
            value={body}
            onChange={(event) => setBody(event.target.value)}
            placeholder="Details (optional)"
            aria-label="Details"
            rows={2}
            className={cn(inputClass, "h-auto py-2")}
          />
          <div className="flex justify-end">
            <button
              type="submit"
              disabled={pending}
              className="btn btn-primary h-9 rounded-md px-4 text-xs"
            >
              {pending && <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />} Log activity
            </button>
          </div>
        </form>
      )}

      {activities.length === 0 ? (
        <p className="text-sm text-muted-foreground">Nothing logged yet.</p>
      ) : (
        <ol className="relative space-y-4 border-l border-border pl-5">
          {activities.map((activity) => {
            const Icon = ICON[activity.type] ?? StickyNote;
            return (
              <li key={activity.id} className="relative">
                <span className="absolute -left-[29px] top-0.5 grid h-4 w-4 place-items-center rounded-full border border-border bg-background">
                  <Icon className="h-2.5 w-2.5 text-muted-foreground" aria-hidden />
                </span>
                <p className="text-sm leading-snug">{activity.title}</p>
                {activity.body && (
                  <p className="mt-1 whitespace-pre-line text-xs text-muted-foreground">
                    {activity.body}
                  </p>
                )}
                <p className="mt-1 text-[11px] text-muted-foreground">
                  {activity.type_label} · {activity.user?.name ?? "System"} ·{" "}
                  {formatDateTime(activity.occurred_at)}
                </p>
              </li>
            );
          })}
        </ol>
      )}
    </div>
  );
}

/**
 * Follow-ups on a record (or the whole task list), with quick add and a
 * one-click complete.
 */
export function TaskList({
  tasks,
  subject,
  staff,
  canCreate,
  canUpdate,
  showSubject = false,
}: {
  tasks: Task[];
  subject?: { type: string; id: number };
  staff: Option[];
  canCreate: boolean;
  canUpdate: boolean;
  showSubject?: boolean;
}) {
  const [title, setTitle] = useState("");
  const [due, setDue] = useState("");
  const [assignee, setAssignee] = useState("");
  const { run, pending } = useAdminMutation();

  async function add(event: React.FormEvent) {
    event.preventDefault();
    if (!title.trim()) return;
    const result = await run(
      () =>
        adminRequest("POST", "tasks", {
          title,
          due_at: due ? new Date(due).toISOString() : null,
          assigned_to: assignee ? Number(assignee) : null,
          subject_type: subject?.type ?? null,
          subject_id: subject?.id ?? null,
        }),
      { success: "Task added." },
    );
    if (result) {
      setTitle("");
      setDue("");
    }
  }

  return (
    <div>
      {tasks.length === 0 && (
        <p className="mb-3 text-sm text-muted-foreground">No open follow-ups.</p>
      )}
      <ul className="divide-y divide-border">
        {tasks.map((task) => (
          <TaskRow key={task.id} task={task} canUpdate={canUpdate} showSubject={showSubject} />
        ))}
      </ul>
      {canCreate && (
        <form onSubmit={add} className="mt-3 grid grid-cols-2 gap-2">
          <input
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            placeholder="Add a follow-up…"
            aria-label="Task"
            className={cn(inputClass, "col-span-2")}
          />
          <input
            type="datetime-local"
            value={due}
            onChange={(event) => setDue(event.target.value)}
            aria-label="Due"
            className={cn(inputClass, "col-span-2 sm:col-span-1")}
          />
          <select
            value={assignee}
            onChange={(event) => setAssignee(event.target.value)}
            aria-label="Assign to"
            className={cn(inputClass, "col-span-2 sm:col-span-1")}
          >
            <option value="">Me</option>
            {staff.map((member) => (
              <option key={member.value} value={member.value}>
                {member.label}
              </option>
            ))}
          </select>
          <button
            type="submit"
            disabled={pending || !title.trim()}
            className="btn btn-primary col-span-2 h-10 rounded-md px-4 text-xs"
          >
            Add follow-up
          </button>
        </form>
      )}
    </div>
  );
}

export function TaskRow({
  task,
  canUpdate,
  showSubject,
}: {
  task: Task;
  canUpdate: boolean;
  showSubject?: boolean;
}) {
  const { run, pending } = useAdminMutation();
  const done = task.status === "completed";

  return (
    <li className="flex items-start gap-3 py-2.5">
      <button
        type="button"
        disabled={!canUpdate || pending || done}
        aria-label={done ? "Completed" : `Mark “${task.title}” done`}
        onClick={() =>
          run(() => adminRequest("POST", `tasks/${task.id}/complete`), { success: "Done." })
        }
        className="mt-0.5 text-muted-foreground hover:text-foreground disabled:cursor-default"
      >
        {pending ? (
          <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
        ) : done ? (
          <CheckCircle2 className="h-4 w-4 text-emerald-600" aria-hidden />
        ) : (
          <Circle className="h-4 w-4" aria-hidden />
        )}
      </button>
      <div className="min-w-0 flex-1">
        <p className={cn("text-sm", done && "text-muted-foreground line-through")}>{task.title}</p>
        <p className="mt-0.5 flex flex-wrap items-center gap-x-2 text-[11px] text-muted-foreground">
          {task.due_at && (
            <span
              className={cn(
                "inline-flex items-center gap-1",
                task.is_overdue && "font-semibold text-destructive",
              )}
            >
              <CalendarClock className="h-3 w-3" aria-hidden />{" "}
              {task.is_overdue ? "Overdue · " : ""}
              {formatDateTime(task.due_at)}
            </span>
          )}
          {task.assignee && <span>{task.assignee.name}</span>}
          {task.priority !== "normal" && <span className="capitalize">{task.priority_label}</span>}
          {showSubject && task.subject && (
            <Link href={task.subject.path} className="underline-offset-2 hover:underline">
              {task.subject.label}
            </Link>
          )}
        </p>
      </div>
    </li>
  );
}
