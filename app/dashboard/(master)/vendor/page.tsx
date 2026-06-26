import { getVendors } from "@/app/actions/vendor";
import VendorList from "./VendorList";

export const metadata = {
  title: "Master Vendor - SIPADIN",
};

export default async function VendorPage() {
  const data = await getVendors();

  return (
    <div className="p-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900">Master Vendor (Pihak Ketiga)</h1>
        <p className="text-sm text-slate-500 mt-1">
          Kelola data vendor, rumah makan, atau katering untuk SPJ Makan Minum.
        </p>
      </div>

      <VendorList initialData={data} />
    </div>
  );
}
