"use client";

import { Button } from "@/components/ui/button";
import { currentPlaceAtom } from "@/lib/atom";
import { Day, Place } from "@/types";
import { mapId } from "@/utils";
import { createPlace } from "@/utils/actions/crud/create";
import { deletePlace } from "@/utils/actions/crud/delete";
import { updatePlaceOrder } from "@/utils/actions/crud/update";
import {
  APIProvider,
  AdvancedMarker,
  AdvancedMarkerRef,
  Map as GoogleMap,
  MapMouseEvent,
  Pin,
  useMap,
} from "@vis.gl/react-google-maps";
import { useAtom, useSetAtom } from "jotai";
import { ChevronsUpDown, Star, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import useSWR, { Fetcher } from "swr";

/* -------------------------------------------------------------------------- */
/*                                     Map                                    */
/* -------------------------------------------------------------------------- */

type MapProps = {
  day: Day;
  children: React.ReactNode;
};

export default function Map({ day, children }: MapProps) {
  const { places } = day;
  const [currentPlace, setCurrentPlace] = useAtom(currentPlaceAtom);
  const [defaultCenter, setDefaultCenter] = useState<google.maps.LatLngLiteral>(
    { lat: -34, lng: 118 },
  );

  useEffect(() => {
    if (places.length) {
      const { position } = places[0];
      setDefaultCenter(position);
    } else
      navigator.geolocation.getCurrentPosition((position) => {
        const { latitude: lat, longitude: lng } = position.coords;
        setDefaultCenter({ lat, lng });
      });
  }, [day.id]);

  function handleMapClick(e: MapMouseEvent) {
    const { placeId, latLng: position } = e.detail;
    if (!position || !placeId) setCurrentPlace(null);
    else setCurrentPlace({ placeId, position });
    e.stop();
  }

  return (
    <APIProvider apiKey={process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY as string}>
      <GoogleMap
        defaultZoom={13}
        defaultCenter={defaultCenter}
        mapId={"2b28f32837556830"}
        onClick={handleMapClick}
        disableDefaultUI
      >
        {children}
        <Markers places={places} />
        {currentPlace && (
          <InfoWindow date={day.date} dayId={day.id} places={places} />
        )}
      </GoogleMap>
    </APIProvider>
  );
}

/* -------------------------------------------------------------------------- */
/*                                 Info Window                                */
/* -------------------------------------------------------------------------- */

type PlaceDetails = {
  id: string;
  displayName: { languageCode: string; text: string };
  primaryTypeDisplayName?: { languageCode: string; text: string };
  shortFormattedAddress: string;
  regularOpeningHours?: {
    openNow: boolean;
    weekdayDescriptions: string[];
  };
  rating?: number;
  userRatingCount?: number;
  websiteUri?: string;
  googleMapsUri: string;
};

const placeDetailsFetcher: Fetcher<PlaceDetails, string> = (id) =>
  fetch(
    `https://places.googleapis.com/v1/places/${id}?fields=id,displayName,primaryTypeDisplayName,shortFormattedAddress,regularOpeningHours,rating,userRatingCount,websiteUri,googleMapsUri&key=${process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY}`,
  ).then((res) => res.json());

type InfoWindowProps = {
  date: Day["date"];
  dayId: Day["id"];
  places: Day["places"];
};

function InfoWindow({ date, dayId: day_id, places }: InfoWindowProps) {
  const [currentPlace, setCurrentPlace] = useAtom(currentPlaceAtom);
  const advancedMarkerRef = useRef<AdvancedMarkerRef>(null);
  const map = useMap();

  useEffect(() => {
    advancedMarkerRef?.current?.addEventListener("click", (e) => {
      console.log(e);
    });
    if (!map || !currentPlace?.position) return;
    map.panTo(currentPlace.position);
  }, []);

  const {
    data: placeDetails,
    error,
    isLoading,
  } = useSWR(currentPlace?.placeId, placeDetailsFetcher);
  if (error || !placeDetails) return <div>failed to load</div>;
  if (isLoading) return <div>loading...</div>;

  async function handleCreatePlace() {
    const name = placeDetails?.displayName.text;
    if (!currentPlace || !name) return;
    const {
      placeId: place_id,
      position: { lng, lat },
    } = currentPlace;
    if (!place_id) return;

    const newPlace = { name, day_id, lng, lat, place_id };
    await createPlace(newPlace, places);
    setCurrentPlace(null);
  }

  async function handleDeletePlace() {
    if (!currentPlace?.id) return;
    await deletePlace(currentPlace.id);
    const newOrder = mapId(
      places.filter((place) => place.id !== currentPlace.id),
    );
    await updatePlaceOrder(newOrder, day_id);
    setCurrentPlace(null);
  }

  return (
    <AdvancedMarker
      className="font-['Nunito Sans'] mb-8 flex flex-col gap-2 rounded-lg bg-slate-50 p-4 shadow-lg"
      position={currentPlace?.position}
      onClick={(e) => e.stop()}
      ref={advancedMarkerRef}
    >
      <div>
        <div className="flex items-center justify-between gap-4">
          <h2 className="text-xl font-bold text-slate-900">
            {placeDetails.displayName.text}
          </h2>
          <button
            onClick={() => setCurrentPlace(null)}
            aria-label="Close info window"
          >
            <X />
          </button>
        </div>
        <h3 className=" text-sm text-slate-600">
          {placeDetails.shortFormattedAddress}
        </h3>
      </div>
      <div className="flex flex-col gap-2 text-sm">
        <div className="flex flex-col">
          <span>{placeDetails?.primaryTypeDisplayName?.text || "place"}</span>
          {placeDetails.rating && (
            <span className="flex items-center gap-2 text-sm">
              <span className="flex items-center gap-1">
                {placeDetails.rating}
                <Star size={14} />
              </span>
              ({placeDetails.userRatingCount})
            </span>
          )}
          <OpeningHours
            regularOpeningHours={placeDetails.regularOpeningHours}
            date={date}
          />
        </div>
        <div className="mb-2 flex gap-1 text-slate-500">
          {placeDetails.websiteUri && (
            <>
              <a href={placeDetails.websiteUri} className="underline">
                Website
              </a>
              •
            </>
          )}
          <a href={placeDetails.googleMapsUri} className="underline">
            Google Maps
          </a>
        </div>
      </div>
      {currentPlace?.id ? (
        <Button onClick={handleDeletePlace}>Delete place</Button>
      ) : (
        <Button onClick={handleCreatePlace}>Add place</Button>
      )}
    </AdvancedMarker>
  );
}

/* -------------------------------------------------------------------------- */
/*                                Opening Hours                               */
/* -------------------------------------------------------------------------- */

type OpeningHoursProps = {
  regularOpeningHours: PlaceDetails["regularOpeningHours"] | undefined;
  date: Day["date"];
};

function OpeningHours({ regularOpeningHours, date }: OpeningHoursProps) {
  // TODO: Return nothing if opening hours not there
  const [isOpen, setIsOpen] = useState(false);
  if (!regularOpeningHours) return null;

  const todayIndex = date.getDay() - 1;
  const days = regularOpeningHours.weekdayDescriptions.map((desc) => {
    const [day, time] = desc.split(" ");
    const truncatedDay = day.slice(0, 3) + ":";
    return [truncatedDay, time];
  });
  const today = regularOpeningHours.weekdayDescriptions.at(todayIndex);

  function toggleIsOpen() {
    setIsOpen(!isOpen);
  }

  return (
    <div>
      {isOpen ? (
        <table className="table-auto" onClick={toggleIsOpen}>
          <tbody>
            {days.map((desc, i) => {
              return (
                <tr
                  key={i}
                  className={`${
                    i === todayIndex ? "text-slate-900" : "text-slate-500"
                  }`}
                >
                  <td className="pr-1">{desc[0]}</td>
                  <td>{desc[1]}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      ) : (
        <button onClick={toggleIsOpen}>
          <span className="flex items-center gap-1">
            {today} <ChevronsUpDown size={16} />
          </span>
        </button>
      )}
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*                                   Markers                                  */
/* -------------------------------------------------------------------------- */

type MarkersProps = {
  places: Place[];
};

function Markers({ places }: MarkersProps) {
  const setCurrentPlace = useSetAtom(currentPlaceAtom);
  const handleClick = (place: Place) => {
    const { id, position } = place;
    const placeId = place.placeId;
    const currentPlace = { id, placeId, position };
    setCurrentPlace(currentPlace);
  };

  return (
    <>
      {places.map((place, i) => (
        <AdvancedMarker
          key={place.id}
          position={place.position}
          clickable={true}
          onClick={() => handleClick(place)}
        >
          <Pin>{i + 1}</Pin>
        </AdvancedMarker>
      ))}
    </>
  );
}
