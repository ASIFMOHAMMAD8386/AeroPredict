export const airports = {
  HYD: { name: "Hyderabad", state: "Telangana", lat: 17.2403, lon: 78.4294 },
  BLR: { name: "Bengaluru", state: "Karnataka", lat: 13.1986, lon: 77.7066 },
  MAA: { name: "Chennai", state: "Tamil Nadu", lat: 12.9941, lon: 80.1709 },
  VGA: {
    name: "Vijayawada",
    state: "Andhra Pradesh",
    lat: 16.5304,
    lon: 80.7968,
  },
  VTZ: {
    name: "Visakhapatnam",
    state: "Andhra Pradesh",
    lat: 17.7212,
    lon: 83.2245,
  },
  TIR: {
    name: "Tirupati",
    state: "Andhra Pradesh",
    lat: 13.6325,
    lon: 79.5433,
  },
  TRV: {
    name: "Thiruvananthapuram",
    state: "Kerala",
    lat: 8.4821,
    lon: 76.9201,
  },
};
export const weatherWeights = {
  Clear: 0,
  Rain: 1.1,
  Thunderstorm: 2.2,
  Fog: 1.7,
};
export const todayIST = () =>
  new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
export function simulate(input) {
  const weather = input.weather ?? "Clear",
    congestion = Number(input.congestion ?? 25),
    inbound = Number(input.inbound ?? 0);
  const date = new Date(input.scheduled_departure);
  if (
    !Number.isFinite(+date) ||
    !airports[input.origin] ||
    !airports[input.destination] ||
    input.origin === input.destination
  )
    throw Error("Choose a valid date and different network airports.");
  if (
    !(weather in weatherWeights) ||
    !Number.isFinite(congestion) ||
    congestion < 0 ||
    congestion > 100 ||
    !Number.isFinite(inbound) ||
    inbound < 0 ||
    inbound > 180
  )
    throw Error("Scenario values are outside supported ranges.");
  const hour = Number(
    new Intl.DateTimeFormat("en-GB", {
      timeZone: "Asia/Kolkata",
      hour: "2-digit",
      hourCycle: "h23",
    }).format(date),
  );
  const peak = hour >= 16 && hour <= 22 ? 1 : 0,
    w = weatherWeights[weather],
    c = congestion / 100;
  const z = -2.4 + w + 1.2 * c + 0.018 * inbound + 0.45 * peak;
  const probability = 1 / (1 + Math.exp(-z));
  const minutes = Math.round(4 + 8 * w + 12 * c + 0.6 * inbound + 7 * peak);
  return {
    probability,
    minutes,
    low: Math.max(0, minutes - 7),
    high: minutes + 11,
    weather,
    congestion,
    inbound,
    peak,
    z,
    label:
      probability < 0.35
        ? "Low risk"
        : probability < 0.65
          ? "Moderate risk"
          : "High risk",
    factors: [
      ["Weather scenario", weather],
      ["Airport congestion", `${congestion}%`],
      ["Incoming aircraft", inbound ? `${inbound} min late` : "On time"],
      ["Departure window", peak ? "Evening peak" : "Outside evening peak"],
    ],
  };
}
export function demoFlights(date = todayIST()) {
  const config = [
    ["BLR", "08:30", 75, "Clear", 25, 0],
    ["MAA", "10:15", 80, "Rain", 45, 15],
    ["VGA", "12:05", 60, "Clear", 30, 10],
    ["VTZ", "15:40", 70, "Rain", 60, 35],
    ["TIR", "18:20", 65, "Thunderstorm", 75, 45],
    ["TRV", "20:10", 110, "Clear", 50, 20],
  ];
  return config.map(
    ([destination, time, duration, weather, congestion, inbound], i) => {
      const scheduled_departure = `${date}T${time}:00+05:30`;
      return {
        id: `demo-${i}`,
        flight_number: `AP ${101 + i * 12}`,
        airline: "AeroPredict Virtual",
        origin: "HYD",
        destination,
        scheduled_departure,
        scheduled_arrival: new Date(
          +new Date(scheduled_departure) + duration * 60000,
        ).toISOString(),
        duration,
        weather,
        congestion,
        inbound,
        source: "simulation",
      };
    },
  );
}
export function timeIST(iso) {
  return iso && Number.isFinite(+new Date(iso))
    ? new Intl.DateTimeFormat("en-IN", {
        timeZone: "Asia/Kolkata",
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
      }).format(new Date(iso))
    : "—";
}
export function dateIST(iso) {
  return iso && Number.isFinite(+new Date(iso))
    ? new Intl.DateTimeFormat("en-IN", {
        timeZone: "Asia/Kolkata",
        day: "2-digit",
        month: "short",
      }).format(new Date(iso))
    : "—";
}
