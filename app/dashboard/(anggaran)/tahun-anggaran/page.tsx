import { getTahunAnggaranSummary } from "@/app/actions/anggaran";
import AnggaranList from "./AnggaranList";

import { auth } from "@/lib/auth";

export const metadata = {
  title: "Tahun Anggaran - SIPADIN",
};

export default async function TahunAnggaranPage(props: {
  searchParams: Promise<{ q?: string; page?: string }>;
}) {
  const session = await auth();
  const searchParams = await props.searchParams;
  const search = searchParams.q || "";
  const page = parseInt(searchParams.page || "1");
  
  const result = await getTahunAnggaranSummary(search, page, 12);

  return (
    <div className="p-4 sm:p-8">
      <AnggaranList 
        initialData={result.data} 
        totalData={result.totalData}
        totalPages={result.totalPages}
        currentPage={page}
        searchQuery={search}
        isSuperAdmin={session?.user?.role === "SUPER_ADMIN"}
      />
    </div>
  );
}
