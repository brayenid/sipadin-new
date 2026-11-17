import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { getAgendaList, getNationalHolidays } from "@/app/actions/agenda";
import AgendaCalendarView from "@/components/dashboard/agenda/AgendaCalendarView";

export const metadata = {
  title: "Agenda Tim | SIPADIN",
  description: "Kalender, jadwal agenda kegiatan, dan perjalanan dinas tim kerja",
};

export default async function AgendaPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const currentYear = new Date().getFullYear();
  const [agendas, holidayRes] = await Promise.all([
    getAgendaList(),
    getNationalHolidays(currentYear),
  ]);

  return (
    <AgendaCalendarView
      initialAgendas={agendas}
      initialHolidays={holidayRes.holidays}
      initialHolidaySource={holidayRes.source}
      initialYear={currentYear}
    />
  );
}
