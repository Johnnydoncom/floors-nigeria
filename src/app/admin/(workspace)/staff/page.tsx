import type { Metadata } from "next";
import { KeyRound, Pencil, UserPlus } from "lucide-react";
import { adminGet, getLookups, requireSession } from "@/lib/api/admin";
import { can } from "@/lib/admin/permissions";
import { formatDateTime } from "@/lib/format";
import { ActionButton, InlineSelect } from "@/components/admin/actions";
import { FilterBar } from "@/components/admin/FilterBar";
import { FormDialog } from "@/components/admin/forms";
import {
  DataTable,
  NoAccess,
  PageHeader,
  Pagination,
  Panel,
  StatusBadge,
  StatusTabs,
  first,
} from "@/components/admin/ui";
import type { SearchParams } from "@/lib/account/form-state";
import type { AdminList, RoleSummary, StaffMember } from "@/lib/admin/types";

export const metadata: Metadata = { title: "Staff & roles" };

/** Users and roles (§31): invite staff, change roles, deactivate accounts. */
export default async function StaffPage({ searchParams }: { searchParams: SearchParams }) {
  const session = await requireSession();
  if (!can(session, "users.view")) return <NoAccess what="staff management" />;

  const query = await searchParams;
  const type = first(query.type) ?? "staff";
  const [list, { data: roles }, lookups] = await Promise.all([
    adminGet<AdminList<StaffMember>>("users", { ...query, type }),
    adminGet<{ data: RoleSummary[] }>("roles"),
    getLookups(),
  ]);
  const canUpdate = can(session, "users.update");
  const roleOptions = lookups.enums.role;

  return (
    <>
      <PageHeader
        title="Staff & roles"
        description="Who can use the workspace and what each role may do. New staff get an email to choose their own password."
        actions={
          can(session, "users.create") && (
            <FormDialog
              title="Invite a member of staff"
              trigger={
                <button type="button" className="btn btn-primary h-9 rounded-md px-4 text-xs">
                  <UserPlus className="h-4 w-4" aria-hidden /> Invite staff
                </button>
              }
              fields={[
                { name: "name", label: "Full name", type: "text", required: true, wide: true },
                { name: "email", label: "Work email", type: "email", required: true },
                { name: "phone", label: "Phone", type: "tel" },
                {
                  name: "role",
                  label: "Role",
                  type: "select",
                  options: roleOptions,
                  required: true,
                },
                {
                  name: "job_title",
                  label: "Job title",
                  type: "text",
                  help: "Defaults to the role name.",
                },
              ]}
              initial={{ role: "sales_agent" }}
              endpoint="users"
              successMessage="Invitation sent."
            />
          )
        }
      />

      <StatusTabs
        path="/admin/staff"
        param="type"
        query={{ ...query, type }}
        tabs={[
          { value: "staff", label: "Staff" },
          { value: "customers", label: "Customer accounts" },
        ]}
      />
      <FilterBar
        placeholder="Name, email or phone"
        filters={[
          ...(type === "staff"
            ? [{ type: "select" as const, name: "role", label: "Roles", options: roleOptions }]
            : []),
          {
            type: "select",
            name: "active",
            label: "States",
            allLabel: "Active and inactive",
            options: [
              { value: "1", label: "Active" },
              { value: "0", label: "Deactivated" },
            ],
          },
        ]}
      />
      <DataTable
        caption="Users"
        rows={list.data}
        columns={[
          {
            key: "name",
            header: "Person",
            cell: (user) => (
              <div>
                <p className="font-medium">
                  {user.name}
                  {user.id === session.user.id && (
                    <span className="ml-2 text-xs font-normal text-muted-foreground">(you)</span>
                  )}
                </p>
                <p className="text-xs text-muted-foreground">
                  {user.email}
                  {user.job_title && ` · ${user.job_title}`}
                </p>
              </div>
            ),
          },
          {
            key: "role",
            header: "Role",
            cell: (user) =>
              canUpdate && user.id !== session.user.id && type === "staff" ? (
                <InlineSelect
                  endpoint={`users/${user.id}`}
                  field="roles"
                  label={`Role for ${user.name}`}
                  value={user.roles[0]?.name ?? null}
                  options={roleOptions}
                  asArray
                />
              ) : (
                user.roles.map((role) => role.label).join(", ") || "Customer"
              ),
          },
          {
            key: "login",
            header: "Last sign-in",
            className: "max-md:hidden whitespace-nowrap",
            cell: (user) => (user.last_login_at ? formatDateTime(user.last_login_at) : "Never"),
          },
          {
            key: "status",
            header: "Status",
            cell: (user) => (
              <StatusBadge
                value={user.is_active ? "active" : "cancelled"}
                label={user.is_active ? "Active" : "Deactivated"}
              />
            ),
          },
          {
            key: "actions",
            header: <span className="sr-only">Actions</span>,
            className: "text-right",
            cell: (user) =>
              canUpdate && (
                <div className="inline-flex flex-wrap justify-end gap-1">
                  <FormDialog
                    title={`Edit ${user.name}`}
                    trigger={
                      <button
                        type="button"
                        aria-label={`Edit ${user.name}`}
                        className="inline-flex h-8 w-8 items-center justify-center rounded-md hover:bg-muted"
                      >
                        <Pencil className="h-3.5 w-3.5" aria-hidden />
                      </button>
                    }
                    fields={[
                      {
                        name: "name",
                        label: "Full name",
                        type: "text",
                        required: true,
                        wide: true,
                      },
                      { name: "phone", label: "Phone", type: "tel" },
                      { name: "job_title", label: "Job title", type: "text" },
                    ]}
                    initial={user}
                    endpoint={`users/${user.id}`}
                    method="PATCH"
                  />
                  <ActionButton
                    endpoint={`users/${user.id}/password-reset`}
                    variant="ghost"
                    success={`Reset link sent to ${user.email}.`}
                  >
                    <KeyRound className="h-3.5 w-3.5" aria-hidden /> Reset link
                  </ActionButton>
                  {user.id !== session.user.id && (
                    <ActionButton
                      endpoint={`users/${user.id}`}
                      method="PATCH"
                      body={{ is_active: !user.is_active }}
                      variant="ghost"
                      success={
                        user.is_active ? "Deactivated and signed out everywhere." : "Reactivated."
                      }
                    >
                      {user.is_active ? "Deactivate" : "Reactivate"}
                    </ActionButton>
                  )}
                </div>
              ),
          },
        ]}
      />
      <Pagination meta={list.meta} path="/admin/staff" query={query} />

      {type === "staff" && (
        <Panel
          className="mt-8"
          title="What each role can do"
          description="The permissions matrix from the PRD (§31). Changing it is a code change, so it is reviewed."
        >
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {roles.map((role) => (
              <details key={role.name} className="rounded-md border border-border p-3">
                <summary className="flex cursor-pointer items-center justify-between gap-2 text-sm">
                  <span className="font-medium">{role.label}</span>
                  <span className="text-xs text-muted-foreground">
                    {role.users_count} {role.users_count === 1 ? "person" : "people"} ·{" "}
                    {role.permissions.length} permissions
                  </span>
                </summary>
                <ul className="mt-2 flex flex-wrap gap-1">
                  {role.permissions.map((permission) => (
                    <li
                      key={permission}
                      className="rounded bg-muted px-1.5 py-0.5 font-mono text-[10px]"
                    >
                      {permission}
                    </li>
                  ))}
                </ul>
              </details>
            ))}
          </div>
        </Panel>
      )}
    </>
  );
}
