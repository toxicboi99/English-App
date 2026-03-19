import Image from "next/image";

import { getInitials } from "@/lib/utils";

export function Avatar({
  name,
  image,
  size = 44,
}: {
  name: string;
  image?: string | null;
  size?: number;
}) {
  if (image) {
    return (
      <Image
        alt={name}
        className="rounded-full object-cover ring-2 ring-white/70"
        height={size}
        src={image}
        width={size}
      />
    );
  }

  return (
    <div
      className="flex items-center justify-center rounded-full bg-slate-950 font-semibold text-amber-100 ring-2 ring-white/70"
      style={{ width: size, height: size }}
    >
      {getInitials(name)}
    </div>
  );
}
