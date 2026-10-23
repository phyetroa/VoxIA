"use client";

import AppShell from "../components/AppShell";
import { useVoxiaTheme, VoxiaTheme } from "../components/ThemeProvider";

const options: { id: VoxiaTheme; title: string; description: string }[] = [
  { id: "normal", title: "Normal", description: "Claro e familiar" },
  { id: "dark", title: "Escuro", description: "Conforto visual em ambientes com pouca luz" },
  { id: "classic", title: "Clássico", description: "Tons suaves de areia e marrom" }
];

export default function SettingsPage() {
  const { theme, setTheme } = useVoxiaTheme();
  return <AppShell showRightPanel={false}><section className="content-page">
    <p className="eyebrow">Preferências</p><h1 className="page-title">Configurações</h1><p className="page-intro">Personalize a aparência da Voxia. Sua escolha fica salva neste navegador.</p>
    <fieldset className="theme-options"><legend>Aparência</legend>{options.map((option) => <label key={option.id} className={theme === option.id ? "theme-option selected" : "theme-option"}>
      <input type="radio" name="theme" value={option.id} checked={theme === option.id} onChange={() => setTheme(option.id)} />
      <span className={`theme-swatch theme-${option.id}`} aria-hidden="true"><i /><i /><i /></span>
      <span><strong>{option.title}</strong><small>{option.description}</small></span>
    </label>)}</fieldset>
    <p className="notice">A seleção de tema é armazenada apenas neste dispositivo e não altera as informações da sua conta.</p>
  </section></AppShell>;
}
