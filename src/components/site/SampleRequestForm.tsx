"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { Input } from "../ui/input";

/**
 * Sample request capture in the footer. It starts the request with an email
 * and hands over to the contact form, preset for samples, to say which floors
 * and where to send them.
 *
 * Isolated as a client island so the footer itself stays a Server Component
 * and ships no JavaScript on content pages (§19, §28).
 */
export function SampleRequestForm({ className }: { className?: string }) {
  const router = useRouter();
  const [email, setEmail] = useState("");

  return (
    <form
      className={cn("flex flex-col gap-3 sm:flex-row", className)}
      onSubmit={(event) => {
        event.preventDefault();
        router.push(`/contact?enquiry=samples&email=${encodeURIComponent(email.trim())}#enquiry`);
      }}
    >
      <label htmlFor="sample-email" className="sr-only">
        Work email address
      </label>
      <Input
        id="sample-email"
        type="email"
        required
        value={email}
        onChange={(event) => setEmail(event.target.value)}
        placeholder="Work email address"
        className="md:h-12 flex-1 rounded-md border border-white/15 bg-white/5 py-2 px-4 text-sm text-primary-foreground transition placeholder:text-primary-foreground/45 focus:border-gold focus:outline-none"
      />
      <button type="submit" className="btn btn-gold">
        Request samples <ArrowRight className="h-4 w-4" aria-hidden />
      </button>
    </form>
  );
}
