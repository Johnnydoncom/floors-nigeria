import type { FieldSpec } from "@/components/admin/forms";
import type { Lookups, Option } from "./types";

/**
 * Form schemas for CRM and operations records, built from the lookups so
 * every select offers exactly what the API accepts. Shared by create and edit
 * dialogs so the two never drift apart.
 */

export function staffOptions(lookups: Lookups, roles?: string[]): Option[] {
  return lookups.staff
    .filter((member) => !roles || member.roles.some((role) => roles.includes(role)))
    .map((member) => ({
      value: String(member.id),
      label: member.job_title ? `${member.name} — ${member.job_title}` : member.name,
    }));
}

export function stateOptions(lookups: Lookups): Option[] {
  return lookups.states.map((state) => ({ value: state, label: state }));
}

const SALES_ROLES = ["super_admin", "sales_manager", "sales_agent"];
const FIELD_ROLES = ["super_admin", "operations_manager", "installer"];

export function customerFields(lookups: Lookups, { canAssign = true } = {}): FieldSpec[] {
  return [
    { name: "full_name", label: "Full name", type: "text", required: true, wide: true },
    { name: "email", label: "Email", type: "email" },
    { name: "phone", label: "Phone", type: "tel", placeholder: "+234…" },
    { name: "whatsapp", label: "WhatsApp", type: "tel" },
    {
      name: "customer_type",
      label: "Customer type",
      type: "select",
      options: lookups.enums.customer_type,
      required: true,
    },
    { name: "address_line", label: "Address", type: "text", wide: true },
    { name: "city", label: "City / area", type: "text" },
    { name: "state", label: "State", type: "select", options: stateOptions(lookups) },
    ...(canAssign
      ? [
          {
            name: "owner_id",
            label: "Account owner",
            type: "select",
            options: staffOptions(lookups, SALES_ROLES),
          } satisfies FieldSpec,
        ]
      : []),
    {
      name: "preferred_contact_channel",
      label: "Prefers",
      type: "select",
      options: lookups.enums.contact_channel,
    },
    { name: "marketing_opt_in", label: "Agreed to marketing", type: "switch" },
    { name: "notes", label: "Notes", type: "textarea", wide: true },
  ];
}

export function companyFields(lookups: Lookups): FieldSpec[] {
  return [
    { name: "name", label: "Company name", type: "text", required: true, wide: true },
    { name: "type", label: "Type", type: "text", placeholder: "Developer, hotel, contractor…" },
    { name: "email", label: "Email", type: "email" },
    { name: "phone", label: "Phone", type: "tel" },
    { name: "website", label: "Website", type: "url", placeholder: "https://" },
    { name: "address_line", label: "Address", type: "text", wide: true },
    { name: "city", label: "City / area", type: "text" },
    { name: "state", label: "State", type: "select", options: stateOptions(lookups) },
    { name: "notes", label: "Notes", type: "textarea", wide: true },
  ];
}

export function leadFields(
  lookups: Lookups,
  { creating = false, canAssign = true } = {},
): FieldSpec[] {
  return [
    { name: "name", label: "Name", type: "text", required: true, wide: true },
    { name: "phone", label: "Phone", type: "tel", placeholder: "+234…" },
    { name: "email", label: "Email", type: "email" },
    {
      name: "source",
      label: "Came from",
      type: "select",
      options: lookups.enums.lead_source,
      required: true,
    },
    ...(creating
      ? []
      : [
          {
            name: "status",
            label: "Status",
            type: "select",
            options: lookups.enums.lead_status,
            required: true,
          } satisfies FieldSpec,
        ]),
    {
      name: "project_type",
      label: "Project",
      type: "text",
      placeholder: "Duplex, office fit-out…",
    },
    { name: "budget_range", label: "Budget", type: "text", placeholder: "e.g. ₦1m–5m" },
    { name: "city", label: "City / area", type: "text" },
    { name: "state", label: "State", type: "select", options: stateOptions(lookups) },
    ...(canAssign
      ? [
          {
            name: "assigned_to",
            label: "Assigned to",
            type: "select",
            options: staffOptions(lookups, SALES_ROLES),
          } satisfies FieldSpec,
        ]
      : []),
    { name: "message", label: "What they asked for", type: "textarea", wide: true },
  ];
}

export function opportunityFields(
  lookups: Lookups,
  { customerLabel }: { customerLabel?: string } = {},
): FieldSpec[] {
  return [
    {
      name: "title",
      label: "Deal",
      type: "text",
      required: true,
      wide: true,
      placeholder: "e.g. Lekki duplex — SPC throughout",
    },
    {
      name: "customer_profile_id",
      label: "Customer",
      type: "search",
      search: "customers",
      searchLabel: customerLabel,
      required: true,
      wide: true,
    },
    { name: "value", label: "Value (₦)", type: "number", min: 0, step: "any" },
    {
      name: "stage",
      label: "Stage",
      type: "select",
      options: lookups.enums.opportunity_stage,
      required: true,
    },
    { name: "source", label: "Source", type: "select", options: lookups.enums.lead_source },
    {
      name: "owner_id",
      label: "Owner",
      type: "select",
      options: staffOptions(lookups, SALES_ROLES),
    },
    { name: "expected_close_date", label: "Expected to close", type: "date" },
    { name: "next_activity_at", label: "Next step due", type: "datetime" },
    { name: "notes", label: "Notes", type: "textarea", wide: true },
  ];
}

export function quoteFields(
  lookups: Lookups,
  { creating = false }: { creating?: boolean } = {},
): FieldSpec[] {
  return [
    ...(creating
      ? [
          {
            name: "customer_profile_id",
            label: "Customer",
            type: "search",
            search: "customers",
            required: true,
            wide: true,
          } satisfies FieldSpec,
        ]
      : []),
    {
      name: "project_type",
      label: "Project",
      type: "text",
      placeholder: "Living room, office, hotel lobby…",
    },
    {
      name: "source",
      label: "Came from",
      type: "select",
      options: lookups.enums.lead_source,
      required: true,
    },
    {
      name: "owner_id",
      label: "Owner",
      type: "select",
      options: staffOptions(lookups, SALES_ROLES),
    },
    { name: "valid_until", label: "Valid until", type: "date" },
    { name: "address_line", label: "Site address", type: "text", wide: true },
    { name: "city", label: "City / area", type: "text" },
    { name: "state", label: "State", type: "select", options: stateOptions(lookups) },
    { name: "preferred_installation_date", label: "Preferred installation date", type: "date" },
    { name: "budget_range", label: "Budget", type: "text" },
    { name: "requires_site_survey", label: "Needs a site survey", type: "switch" },
    { name: "requires_delivery", label: "Needs delivery", type: "switch" },
    { name: "requires_installation", label: "Needs installation", type: "switch" },
    { name: "notes", label: "Notes", type: "textarea", wide: true },
  ];
}

export function appointmentFields(
  lookups: Lookups,
  { customerLabel, creating = false }: { customerLabel?: string; creating?: boolean } = {},
): FieldSpec[] {
  return [
    {
      name: "type",
      label: "Kind",
      type: "select",
      options: lookups.enums.appointment_type,
      required: true,
    },
    ...(creating
      ? []
      : [
          {
            name: "status",
            label: "Status",
            type: "select",
            options: lookups.enums.appointment_status,
            required: true,
          } satisfies FieldSpec,
        ]),
    {
      name: "customer_profile_id",
      label: "Customer",
      type: "search",
      search: "customers",
      searchLabel: customerLabel,
      required: true,
      wide: true,
    },
    { name: "scheduled_at", label: "Starts", type: "datetime", required: true },
    { name: "ends_at", label: "Ends", type: "datetime" },
    { name: "assigned_to", label: "With", type: "select", options: staffOptions(lookups) },
    { name: "quote_id", label: "Quote", type: "search", search: "quotes" },
    { name: "address_line", label: "Address", type: "text", wide: true },
    { name: "city", label: "City / area", type: "text" },
    { name: "state", label: "State", type: "select", options: stateOptions(lookups) },
    { name: "notes", label: "Notes", type: "textarea", wide: true },
  ];
}

export function surveyFields(
  lookups: Lookups,
  { customerLabel, creating = false }: { customerLabel?: string; creating?: boolean } = {},
): FieldSpec[] {
  return [
    ...(creating
      ? [
          {
            name: "customer_profile_id",
            label: "Customer",
            type: "search",
            search: "customers",
            searchLabel: customerLabel,
            required: true,
            wide: true,
          } satisfies FieldSpec,
        ]
      : []),
    {
      name: "status",
      label: "Status",
      type: "select",
      options: lookups.enums.survey_status,
      required: true,
    },
    { name: "scheduled_at", label: "Scheduled for", type: "datetime" },
    {
      name: "surveyor_id",
      label: "Surveyor",
      type: "select",
      options: staffOptions(lookups, FIELD_ROLES),
    },
    ...(creating
      ? [{ name: "quote_id", label: "Quote", type: "search", search: "quotes" } satisfies FieldSpec]
      : []),
    {
      name: "subfloor_condition",
      label: "Subfloor",
      type: "text",
      placeholder: "Level screed, existing tiles…",
    },
    { name: "access_notes", label: "Access", type: "textarea", wide: true },
    { name: "preparation_notes", label: "Preparation needed", type: "textarea", wide: true },
    { name: "findings", label: "Findings", type: "textarea", wide: true },
  ];
}

export function projectFields(
  lookups: Lookups,
  { creating = false, customerLabel }: { creating?: boolean; customerLabel?: string } = {},
): FieldSpec[] {
  return [
    { name: "name", label: "Project name", type: "text", required: true, wide: true },
    ...(creating
      ? [
          {
            name: "customer_profile_id",
            label: "Customer",
            type: "search",
            search: "customers",
            searchLabel: customerLabel,
            required: true,
            wide: true,
          } satisfies FieldSpec,
        ]
      : []),
    {
      name: "status",
      label: "Status",
      type: "select",
      options: lookups.enums.project_status,
      required: true,
    },
    { name: "owner_id", label: "Owner", type: "select", options: staffOptions(lookups) },
    { name: "value", label: "Value (₦)", type: "number", min: 0, step: "any" },
    { name: "start_date", label: "Start", type: "date" },
    { name: "end_date", label: "Finish", type: "date" },
    { name: "address_line", label: "Site address", type: "text", wide: true },
    { name: "city", label: "City / area", type: "text" },
    { name: "state", label: "State", type: "select", options: stateOptions(lookups) },
    { name: "notes", label: "Notes", type: "textarea", wide: true },
  ];
}

export function installationFields(lookups: Lookups): FieldSpec[] {
  const installers = staffOptions(lookups, FIELD_ROLES);

  return [
    {
      name: "status",
      label: "Status",
      type: "select",
      options: lookups.enums.installation_status,
      required: true,
    },
    { name: "lead_installer_id", label: "Lead installer", type: "select", options: installers },
    { name: "scheduled_start", label: "Starts", type: "datetime" },
    { name: "scheduled_end", label: "Finishes", type: "datetime" },
    { name: "crew", label: "Crew", type: "checkboxes", options: installers, wide: true },
    { name: "notes", label: "Notes", type: "textarea", wide: true },
    { name: "warranty_notes", label: "Warranty notes", type: "textarea", wide: true },
  ];
}

export function taskFields(lookups: Lookups): FieldSpec[] {
  return [
    { name: "title", label: "Task", type: "text", required: true, wide: true },
    { name: "due_at", label: "Due", type: "datetime" },
    {
      name: "priority",
      label: "Priority",
      type: "select",
      options: lookups.enums.task_priority,
      required: true,
    },
    { name: "assigned_to", label: "Assigned to", type: "select", options: staffOptions(lookups) },
    { name: "description", label: "Details", type: "textarea", wide: true },
  ];
}
