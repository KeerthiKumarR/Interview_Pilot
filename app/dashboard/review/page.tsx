import { redirect } from "next/navigation";

/**
 * Module 2 Review Engine is now unified with Module 1 in the Profile & Review Hub.
 * Automatically forwards to the active Review & Benchmark tab.
 */
export default function ReviewPageRedirect() {
  redirect("/dashboard/profile-intake?tab=review");
}
