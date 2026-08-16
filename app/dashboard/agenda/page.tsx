import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { getAgendaList } from "@/app/actions/agenda";
import AgendaCalendarView from "@/components/dashboard/agenda/AgendaCalendarView";

export const metadata = {
  title: "Agenda Tim | SIPADIN",
  description: "Kalender dan jadwal agenda kegiatan tim kerja",
};

export default async function AgendaPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const agendas = await getAgendaList();

  return <AgendaCalendarView initialAgendas={agendas as any} />;
}
