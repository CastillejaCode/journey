import TogglePlannerButton from "@/components/general/TogglePlannerButton";
import Map from "@/features/map/components/Map";
import MapControls from "@/features/map/components/MapControls";
import MapSearch from "@/features/map/components/MapSearch";
import Planner from "@/features/planner/components/Planner";
import { getDateRange, getDay, getTripName } from "@/utils/actions/crud/get";

type Props = {
  params: { tripId: string };
};

export default async function MapPage({ params }: Props) {
  const { tripId } = params;

  const day = await getDay(tripId);
  const dateRange = await getDateRange(tripId);
  const tripName = await getTripName(tripId);

  const totalDuration = day.places.reduce(
    (total, current) =>
      total + (current.travel?.duration || 0) + current.placeDuration,
    0,
  );

  return (
    <main className="relative h-40 flex-grow sm:flex">
      <Planner
        day={day}
        tripName={tripName}
        totalDuration={totalDuration}
        dateRange={dateRange}
      />
      <Map day={day}>
        <MapSearch />
        <MapControls tripId={tripId} day={day} dateRange={dateRange} />
      </Map>
      <TogglePlannerButton />
    </main>
  );
}
