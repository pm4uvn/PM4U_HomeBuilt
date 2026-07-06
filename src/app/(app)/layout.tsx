import Sidebar from "@/components/Sidebar";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex">
      <Sidebar />
      <main className="flex-1 min-w-0 p-4 md:p-6 max-w-[1200px]">{children}</main>
    </div>
  );
}
