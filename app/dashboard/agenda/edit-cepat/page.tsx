import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { getAgendaList } from "@/app/actions/agenda";
import { AgendaBulkEditView } from "@/components/dashboard/agenda/AgendaBulkEditView";

export const metadata = {
  title: "Edit Cepat Agenda | SIPADIN",
  description: "Mode spreadsheet tabel Excel untuk mengelola dan mengedit agenda kegiatan secara massal",
};

export default async function AgendaBulkEditPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const agendas = await getAgendaList();

  return <AgendaBulkEditView initialAgendas={agendas} />;
}
