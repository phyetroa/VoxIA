import AppShell from "../components/AppShell";
import SavedProposals from "../components/SavedProposals";

export default function SavedPage() {
  return <AppShell showRightPanel={false}><SavedProposals /></AppShell>;
}
