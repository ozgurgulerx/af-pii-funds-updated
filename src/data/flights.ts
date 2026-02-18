import type { Flight } from "@/types";

export const flights: Flight[] = [
  {
    id: "xq801",
    flightNumber: "XQ 801",
    departure: {
      icao: "LTFM",
      iata: "IST",
      name: "Istanbul Airport",
    },
    arrival: {
      icao: "EGLL",
      iata: "LHR",
      name: "London Heathrow Airport",
    },
    std: "2026-02-18T06:30:00Z",
    etd: "2026-02-18T06:30:00Z",
    aircraftType: "B737-800",
    status: "scheduled",
  },
  {
    id: "xq237",
    flightNumber: "XQ 237",
    departure: {
      icao: "LTAI",
      iata: "AYT",
      name: "Antalya Airport",
    },
    arrival: {
      icao: "EDDM",
      iata: "MUC",
      name: "Munich Airport",
    },
    std: "2026-02-18T08:15:00Z",
    etd: "2026-02-18T08:15:00Z",
    aircraftType: "B737-800",
    status: "boarding",
  },
  {
    id: "xq515",
    flightNumber: "XQ 515",
    departure: {
      icao: "LTFJ",
      iata: "SAW",
      name: "Istanbul Sabiha Gokcen Airport",
    },
    arrival: {
      icao: "EHAM",
      iata: "AMS",
      name: "Amsterdam Schiphol Airport",
    },
    std: "2026-02-18T10:00:00Z",
    etd: "2026-02-18T10:00:00Z",
    aircraftType: "A320neo",
    status: "scheduled",
  },
  {
    id: "xq103",
    flightNumber: "XQ 103",
    departure: {
      icao: "LTFM",
      iata: "IST",
      name: "Istanbul Airport",
    },
    arrival: {
      icao: "LFPG",
      iata: "CDG",
      name: "Paris Charles de Gaulle Airport",
    },
    std: "2026-02-18T07:45:00Z",
    etd: "2026-02-18T09:20:00Z",
    aircraftType: "B737-MAX 8",
    status: "delayed",
  },
  {
    id: "xq422",
    flightNumber: "XQ 422",
    departure: {
      icao: "LTBJ",
      iata: "ADB",
      name: "Izmir Adnan Menderes Airport",
    },
    arrival: {
      icao: "EDDF",
      iata: "FRA",
      name: "Frankfurt Airport",
    },
    std: "2026-02-18T11:30:00Z",
    etd: "2026-02-18T11:30:00Z",
    aircraftType: "B737-800",
    status: "scheduled",
  },
  {
    id: "xq688",
    flightNumber: "XQ 688",
    departure: {
      icao: "LTBS",
      iata: "DLM",
      name: "Dalaman Airport",
    },
    arrival: {
      icao: "EGKK",
      iata: "LGK",
      name: "London Gatwick Airport",
    },
    std: "2026-02-18T13:00:00Z",
    etd: "2026-02-18T13:00:00Z",
    aircraftType: "A321neo",
    status: "scheduled",
  },
];

export function getFlightById(id: string): Flight | undefined {
  return flights.find((f) => f.id === id);
}
