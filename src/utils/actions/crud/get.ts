import { Day, Place, PlaceNoSchedule, Travel } from "@/types";
import { Database } from "@/types/supabase";
import { convertKmToMi, convertSecToMi } from "@/utils";
import { SupabaseClient } from "@supabase/supabase-js";
import { addMinutes, parse, parseISO } from "date-fns";
import { formatInTimeZone } from "date-fns-tz";

export async function getDay(
  supabase: SupabaseClient<Database>,
  tripId: string,
  currentDate?: string,
): Promise<Day> {
  let date = currentDate;

  if (!date) {
    const { data: dateData, error: dateError } = await supabase
      .from("trips")
      .select("current_date")
      .eq("id", tripId)
      .limit(1)
      .single();
    if (dateError) throw new Error(`Supbase error: ${dateError.message}`);
    date = dateData.current_date || undefined;
  }

  const { data: dayData, error: dayError } = await supabase
    .from("days")
    .select(
      "id, date, startTime:start_time, timezone, orderPlaces:order_places",
    )
    .match({ trip_id: tripId, date })
    .limit(1)
    .single();
  if (dayError) throw new Error(`Supbase error: ${dayError.message}`);

  const { data: placesData, error } = await supabase
    .from("places")
    .select(
      "id, name, lat, lng, placeDuration:place_duration, tripDuration:trip_duration, placeId:place_id, address",
    )
    .eq("day_id", dayData.id);
  if (error) throw new Error(`Supabase error: ${error.message}`);

  // TODO: Replace this with rpc
  const sortedPlaces = dayData.orderPlaces.map((id) => {
    const place = placesData.find((place) => place.id === id);
    if (!place) throw new Error("Couldn't find place.");
    const { lat, lng, ...placeProps } = place;
    return { ...placeProps, position: { lat, lng } };
  });

  const travelInfo = await getTravelInfo(sortedPlaces);
  const travelPlaces = await mapTravelInfo(sortedPlaces, travelInfo?.trips);

  const startTime = parseISO(dayData.date + "T" + dayData.startTime);
  const scheduledPlaces = mapSchedule(travelPlaces, startTime);

  const day = {
    ...dayData,
    date: parse(dayData.date, "yyyy-MM-dd", new Date()),
    travel: travelInfo?.travel,
  };

  return {
    ...day,
    places: scheduledPlaces,
  };
}

function mapSchedule(places: PlaceNoSchedule[], startTime: Date): Place[] {
  let arrival = startTime;
  let departure;

  const calculatedPlaces = places.map((place) => {
    const { placeDuration } = place;
    departure = addMinutes(arrival, placeDuration);
    const schedule = { arrival, departure };
    const updatedPlace = { ...place, schedule };
    arrival = addMinutes(departure, place.travel?.duration || 0);
    return updatedPlace;
  });

  return calculatedPlaces;
}

async function mapTravelInfo(
  places: PlaceNoSchedule[],
  trips: Travel[] | undefined,
): Promise<PlaceNoSchedule[]> {
  if (!trips) return places;
  else
    return places.map((place, i) => {
      const travel = trips[i];
      return { ...place, travel };
    });
}

async function getTravelInfo(
  places: PlaceNoSchedule[],
): Promise<{ trips: Travel[]; travel: Travel } | undefined> {
  if (places.length < 2) return;
  const coordinates = places
    .map((place) => `${place.position.lng},${place.position.lat}`)
    .join(";");

  const profile = "mapbox/driving";
  const res = await fetch(
    `https://api.mapbox.com/directions/v5/${profile}/${coordinates}?&access_token=${process.env.NEXT_PUBLIC_MAPBOX_API_KEY}`,
  );
  const tripInformation = await res.json();
  const travel = {
    distance: convertKmToMi(tripInformation.routes[0].distance),
    duration: convertSecToMi(tripInformation.routes[0].duration),
  };

  const trips = tripInformation.routes[0].legs.map(
    (leg: { distance: number; duration: number }) => {
      const distance = convertKmToMi(leg.distance);
      const duration = convertSecToMi(leg.duration);
      return { distance, duration };
    },
  );

  return {
    trips,
    travel,
  };
}
