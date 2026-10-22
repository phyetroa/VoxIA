import Link from "next/link";

export default function Brand() {
  return <Link className="brand" href="/" aria-label="Voxia, página inicial">
    <img className="brand-symbol" src="/VoxIA/voxia-mark.png" alt="" />
    <img className="brand-wordmark" src="/VoxIA/voxia-wordmark.png" alt="Voxia" />
  </Link>;
}
