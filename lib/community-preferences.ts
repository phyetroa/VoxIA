const SAVED_KEY = "voxia:saved-proposals";
const TOPICS_KEY = "voxia:followed-topics";

function readList(key: string) {
  if (typeof window === "undefined") return [];
  try {
    const value = JSON.parse(window.localStorage.getItem(key) ?? "[]");
    return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];
  } catch {
    return [];
  }
}

export function getSavedProposalIds() {
  return readList(SAVED_KEY);
}

export function setProposalSaved(id: string, saved: boolean) {
  const ids = getSavedProposalIds().filter((item) => item !== id);
  if (saved) ids.unshift(id);
  window.localStorage.setItem(SAVED_KEY, JSON.stringify(ids));
  window.dispatchEvent(new Event("voxia:saved-changed"));
}

export function getFollowedTopics() {
  return readList(TOPICS_KEY);
}

export function setFollowedTopics(topics: string[]) {
  window.localStorage.setItem(TOPICS_KEY, JSON.stringify([...new Set(topics)]));
  window.dispatchEvent(new Event("voxia:topics-changed"));
}
