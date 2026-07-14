import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Create Account",
  description: "Create your new Lumeo CRM workspace.",
};

export default function RegisterLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
