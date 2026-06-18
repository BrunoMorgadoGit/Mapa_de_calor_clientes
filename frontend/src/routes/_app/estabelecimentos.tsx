import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/_app/estabelecimentos")({
  beforeLoad: () => {
    throw redirect({ to: "/leads-b2b" });
  },
});
