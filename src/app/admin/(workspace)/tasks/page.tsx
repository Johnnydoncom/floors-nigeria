import type { Metadata } from "next";
import { Plus } from "lucide-react";
import { adminGet, getLookups, requireSession } from "@/lib/api/admin";
import { can } from "@/lib/admin/permissions";
import { staffOptions, taskFields } from "@/lib/admin/fields";
import { TaskList } from "@/components/admin/activity";
import { FilterBar } from "@/components/admin/FilterBar";
import { FormDialog } from "@/components/admin/forms";
import { NoAccess, PageHeader, Pagination, Panel, StatusTabs } from "@/components/admin/ui";
import type { SearchParams } from "@/lib/account/form-state";
import type { AdminList, Task } from "@/lib/admin/types";

export const metadata: Metadata = { title: "Tasks" };

export default async function TasksPage({ searchParams }: { searchParams: SearchParams }) {
  const session = await requireSession();
  if (!can(session, "tasks.view")) return <NoAccess what="tasks" />;

  const query = await searchParams;
  const status = typeof query.status === "string" ? query.status : "open";
  const [list, lookups] = await Promise.all([
    adminGet<AdminList<Task>>("tasks", { ...query, status }),
    getLookups(),
  ]);
  const counts = list.counts ?? {};
  const scoped = session.scopes.own_records_only || session.scopes.assigned_jobs_only;

  return (
    <>
      <PageHeader
        title="Tasks"
        description={
          scoped
            ? "Follow-ups assigned to you or set by you."
            : "Every follow-up across the team, soonest first."
        }
        actions={
          can(session, "tasks.create") && (
            <FormDialog
              title="New task"
              trigger={
                <button type="button" className="btn btn-primary h-9 rounded-md px-4 text-xs">
                  <Plus className="h-4 w-4" aria-hidden /> New task
                </button>
              }
              fields={taskFields(lookups)}
              initial={{ priority: "normal", assigned_to: session.user.id }}
              endpoint="tasks"
              successMessage="Task added."
            />
          )
        }
      />
      <StatusTabs
        path="/admin/tasks"
        query={{ ...query, status }}
        tabs={[
          { value: "open", label: "Open", count: counts.open },
          { value: "today", label: "Due today", count: counts.today },
          { value: "overdue", label: "Overdue", count: counts.overdue },
          { value: "completed", label: "Done" },
          { value: "all", label: "Everything" },
        ]}
      />
      <FilterBar
        search={false}
        filters={[
          ...(scoped
            ? []
            : [
                {
                  type: "select" as const,
                  name: "assigned",
                  label: "Assignees",
                  options: [
                    { value: "me", label: "Mine" },
                    { value: "none", label: "Unassigned" },
                    ...staffOptions(lookups),
                  ],
                },
              ]),
          {
            type: "select",
            name: "priority",
            label: "Priorities",
            options: lookups.enums.task_priority,
          },
        ]}
      />
      <Panel>
        <TaskList
          tasks={list.data}
          staff={staffOptions(lookups)}
          canCreate={false}
          canUpdate={can(session, "tasks.update")}
          showSubject
        />
      </Panel>
      <Pagination meta={list.meta} path="/admin/tasks" query={query} />
    </>
  );
}
