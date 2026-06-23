import { Sidebar } from "@/components/sidebar";
import { Topbar } from "@/components/topbar";
import { AiChatWidget } from "@/components/ai-chat-widget";

export default function AppLayout({ 
  children,
  modal 
}: { 
  children: React.ReactNode;
  modal: React.ReactNode;
}) {
  return (
    <div className="flex flex-col md:grid md:grid-cols-[240px_1fr] min-h-screen">
      <div className="hidden md:block">
        <Sidebar />
      </div>
      <main className="flex flex-col min-w-0 flex-1 overflow-x-hidden">
        <Topbar />
        {children}
        {modal}
      </main>
      <AiChatWidget />
    </div>
  );
}
