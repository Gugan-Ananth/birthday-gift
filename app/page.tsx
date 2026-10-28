import { Seal } from "@/components/experience/Seal";
import { gift } from "@/content/gift";
import { formatDate } from "@/lib/format";
import { stillWaiting } from "@/lib/schedule";

export default function Page() {
  if (gift.openOn && stillWaiting(gift.openOn)) {
    return <Seal waiting={formatDate(gift.openOn)} />;
  }

  return <Seal waiting={null} />;
}
