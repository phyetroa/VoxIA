import type { Metadata } from "next";
import "./globals.css";
import "./forms.css";
import "./interactions.css";
import "./social.css";
import "./identity.css";
import { ThemeProvider } from "./components/ThemeProvider";

export const metadata: Metadata = {
  title: "Voxia — Participação cidadã",
  description: "Uma plataforma independente para participação cidadã no Brasil."
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="pt-BR"><body><ThemeProvider>{children}</ThemeProvider></body></html>;
}
