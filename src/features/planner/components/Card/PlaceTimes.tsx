import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PlaceT } from "@/types";
import { updateDuration } from "@/utils/actions/crud/update";
import { format } from "date-fns";

const timeFormat = "HH:mm a";

type Props = {
  arrival: Date;
  duration: number;
  placeId: string;
};

export default function PlaceTimes({ arrival, duration, placeId }: Props) {
  return (
    <div>
      <p>Arrival: {format(arrival, timeFormat)}</p>
      <form className="flex items-end gap-2" action={updateDuration}>
        <label className="flex items-center gap-2">
          Duration:
          <Input className="px-1" name="duration" defaultValue={duration} />
        </label>
        <input type="hidden" name="id" defaultValue={placeId} />
        <Button>Submit</Button>
      </form>
    </div>
  );
}
