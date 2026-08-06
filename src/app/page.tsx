import { redirect } from "next/navigation";

export default function Home() {
  // TODO(Phase 1): redirect based on authenticated user's role instead of
  // always sending to /login.
  redirect("/login");
}
