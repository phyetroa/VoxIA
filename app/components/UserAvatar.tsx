"use client";

import { useState } from "react";
import type { User } from "@supabase/supabase-js";

export default function UserAvatar({ user, size = "normal" }: { user: User; size?: "normal" | "large" }) {
  const [imageFailed, setImageFailed] = useState(false);
  const googleIdentity = user.identities?.find((identity) => identity.provider === "google")?.identity_data;
  const photo = googleIdentity?.picture ?? googleIdentity?.avatar_url ?? user.user_metadata?.picture ?? user.user_metadata?.avatar_url;
  const initials = (user.user_metadata?.name ?? user.email ?? "V")
    .split(/[\s@._-]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part: string) => part[0].toUpperCase())
    .join("");

  return <span className={`user-avatar ${size}`} aria-label={user.email ? `Conta de ${user.email}` : "Sua conta"}>
    {photo && !imageFailed ? <img src={photo} alt="" referrerPolicy="no-referrer" onError={() => setImageFailed(true)} /> : initials}
  </span>;
}
