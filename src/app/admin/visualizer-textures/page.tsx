import { Suspense } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Loader2 } from "lucide-react";
import { getCurrentUser } from "@/lib/api/auth";
import { SIGN_IN_PATH } from "@/lib/api/account";
import { TextureStudio } from "@/components/admin/TextureStudio";

export const metadata: Metadata = {
  title: "Visualizer textures",
  robots: { index: false, follow: false },
};

const PATH = "/admin/visualizer-textures";

/** Roles that may change catalogue media (`media.update` in the API's matrix). */
const ALLOWED_ROLES = ["super_admin", "catalog_manager"];

/**
 * Visualizer textures (§10, §24): the square, straightened image of each floor
 * that the room visualizer lays — separate from the product photography, and
 * never shown on the product page.
 */
export default function VisualizerTexturesPage() {
  return (
    <div className="min-h-screen bg-surface pt-header">
      <div className="container-fluid py-8 lg:py-10">
        <p className="eyebrow">Catalogue tools</p>
        <h1 className="mt-2 font-display text-3xl tracking-tight">Visualizer textures</h1>
        <p className="mt-2 max-w-3xl text-sm text-muted-foreground">
          The image the room visualizer lays on a customer&apos;s floor. Mark a square patch of the
          material in any product photo — it is straightened, evened out and made to repeat without
          a seam. Customers never see this image on the product page.
        </p>

        <Suspense
          fallback={
            <p className="mt-10 flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
              Checking your access…
            </p>
          }
        >
          <Gate />
        </Suspense>
      </div>
    </div>
  );
}

async function Gate() {
  const user = await getCurrentUser();

  if (!user) redirect(`${SIGN_IN_PATH}?next=${encodeURIComponent(PATH)}`);

  if (!user.roles.some((role) => ALLOWED_ROLES.includes(role))) {
    return (
      <div className="mt-10 max-w-lg rounded-lg border border-border bg-background p-6">
        <p className="font-display font-semibold">This tool is for the catalogue team.</p>
        <p className="mt-2 text-sm text-muted-foreground">
          You are signed in as {user.email}, which cannot change product media. Ask a super admin to
          give your account the catalogue manager role.
        </p>
        <Link href="/" className="btn btn-outline mt-5">
          Back to the site
        </Link>
      </div>
    );
  }

  return <TextureStudio />;
}
