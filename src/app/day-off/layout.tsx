import { Header } from "@/components/Header";

export default function DayOffLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <Header />
      {children}
    </>
  );
}
