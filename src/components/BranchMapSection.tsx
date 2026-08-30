import { MAP_EMBED_URL } from "@/lib/constants";

export function BranchMapSection() {
  return (
    <div aria-label="Branch locations map" className="mt-12 w-full leading-none">
      <iframe
        title="The Laundry branch locations map"
        src={MAP_EMBED_URL}
        className="block h-[min(50vh,480px)] w-full border-0"
        loading="lazy"
        referrerPolicy="no-referrer-when-downgrade"
        allowFullScreen
      />
    </div>
  );
}
