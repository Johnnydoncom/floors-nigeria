import type { Metadata } from "next";
import { CalendarClock, Truck } from "lucide-react";
import { getAppointments, getProjects } from "@/lib/api/account";
import {
  AppointmentItem,
  EmptyState,
  ProjectCard,
  SectionHeading,
} from "@/components/account/display";

export const metadata: Metadata = { title: "Orders & projects" };

/**
 * Floor Nigeria sells by quote, so an "order" is an accepted quote turned
 * into a project: survey, delivery and installation (§13, §14).
 */
export default async function ProjectsPage() {
  const [projects, appointments] = await Promise.all([getProjects(), getAppointments()]);

  return (
    <div className="space-y-12">
      <section>
        <SectionHeading
          title="Orders & projects"
          description="Each accepted quote becomes a project. Progress updates as our team completes your survey and installation."
        />
        {projects.length === 0 ? (
          <EmptyState
            icon={Truck}
            title="No projects yet"
            action={{ href: "/account/quotes", label: "View your quotes" }}
          >
            Once you accept a quote, the job appears here with its survey, delivery and installation
            dates.
          </EmptyState>
        ) : (
          <div className="space-y-5">
            {projects.map((project) => (
              <ProjectCard key={project.id} project={project} />
            ))}
          </div>
        )}
      </section>

      <section id="visits" className="scroll-mt-28">
        <SectionHeading
          title="Visits & appointments"
          description="Consultations, site surveys, deliveries and installation days. Times are Lagos time."
        />
        {appointments.upcoming.length === 0 && appointments.past.length === 0 ? (
          <EmptyState icon={CalendarClock} title="No visits booked">
            When your consultant books a site survey or installation, the date and time appear here.
          </EmptyState>
        ) : (
          <div className="space-y-8">
            {appointments.upcoming.length > 0 && (
              <div>
                <h3 className="mb-3 font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground">
                  Upcoming
                </h3>
                <ul className="divide-y divide-border border border-border">
                  {appointments.upcoming.map((appointment) => (
                    <AppointmentItem key={appointment.id} appointment={appointment} />
                  ))}
                </ul>
              </div>
            )}
            {appointments.past.length > 0 && (
              <div>
                <h3 className="mb-3 font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground">
                  Earlier
                </h3>
                <ul className="divide-y divide-border border border-border text-muted-foreground">
                  {appointments.past.map((appointment) => (
                    <AppointmentItem key={appointment.id} appointment={appointment} />
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
      </section>
    </div>
  );
}
