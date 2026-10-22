import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Voxia — Participação cidadã",
  description: "Uma plataforma independente para participação cidadã no Brasil."
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="pt-BR"><body>{children}</body></html>;
}
