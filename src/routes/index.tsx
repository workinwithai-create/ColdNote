import { createFileRoute } from "@tanstack/react-router";
import { ColdNoteApp } from "@/components/cold-note-app";

export const Route = createFileRoute("/")({ component: Home });

function Home() {
  return <ColdNoteApp />;
}
