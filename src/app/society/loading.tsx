import { SocietyLayoutSkeleton } from "@/components/society"
import SocietyLoading from "./[code]/loading"

export default function SocietyRootLoading() {
  return (
    <SocietyLayoutSkeleton>
      <SocietyLoading />
    </SocietyLayoutSkeleton>
  )
}
