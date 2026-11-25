const form = document.querySelector("#search-form");
const cityInput = document.querySelector("#city");
const statusEl = document.querySelector("#status");
const currentEl = document.querySelector("#current");
const forecastEl = document.querySelector("#forecast");
const unitBtn = document.querySelector("#unit-btn");
const favoritesEl = document.querySelector("#favorites");
const filterEl = document.querySelector("#filter");
const sortEl = document.querySelector("#sort");

let unit = "C"; //  "C"  or "F"
let lastData = null;
const EMOJI = {
  sun: "☀️",
  partly: "⛅",
  cloud: "☁️",
  fog: "🌫️",
  rain: "🌧️",
  snow: "❄️",
  storm: "⛈️",
};
function loadFavorites() {
  try {
    return JSON.parse(localStorage.getItem("favorites")) || [];
  } catch {
    return [];
  }
}

let favorites = loadFavorites();

function renderFavorites() {
  if (!favorites.length) {
    favoritesEl.innerHTML = "<p>No favorites yet.</p>";
    return;
  }
  favoritesEl.innerHTML = favorites
    .map(
      (f, i) =>
        `<span class="fav">
            <button class="fav-open" data-i="${i}" type="button">${f.name}, ${f.country}</button>
            <button class="fav-remove" data-i="${i}" type="button">✕</button>
        </span>`,
    )
    .join("");
}

function saveFavorite() {
  const { place } = lastData;
  if (favorites.some((f) => f.id === place.id)) {
    return showStatus(`${place.name} is already in your favorites.`);
  }
  favorites.push({
    id: place.id,
    name: place.name,
    country: place.country,
    latitude: place.latitude,
    longitude: place.longitude,
  });
  localStorage.setItem("favorites", JSON.stringify(favorites));
  renderFavorites();
  showStatus(`${place.name} saved.`);
}
renderFavorites();

function showStatus(message, isError = false) {
  statusEl.textContent = message;
  statusEl.classList.toggle("error", isError);
}

async function getJSON(url) {
  let res;
  try {
    res = await fetch(url);
  } catch {
    throw new Error("Network error. Check your internet and try again.");
  }
  if (!res.ok)
    throw new Error(`The weather service said ${res.status}. Try again.`);
  return res.json();
}
async function getcoords(city) {
  const params = new URLSearchParams({ name: city, count: 1 });
  const data = await getJSON(
    `https://geocoding-api.open-meteo.com/v1/search?${params}`,
  );
  if (!data.results)
    throw new Error(`sorry, no city called "${city}" was found.`);
  return data.results[0];
}
async function getWeather(lat, lon) {
  const params = new URLSearchParams({
    latitude: lat,
    longitude: lon,
    current: "temperature_2m,weather_code,wind_speed_10m",
    daily: "weather_code,temperature_2m_max,temperature_2m_min",
    timezone: "auto",
    forecast_days: 7,
  });
  return getJSON(`https://api.open-meteo.com/v1/forecast?${params}`);
}

function describe(code) {
  if (code === 0) return { icon: "sun", text: "Clear sky" };
  if (code <= 2) return { icon: "partly", text: "Partly cloudy" };
  if (code === 3) return { icon: "cloud", text: "Cloudy" };
  if (code <= 48) return { icon: "fog", text: "Fog" };
  if (code <= 57) return { icon: "rain", text: "Drizzle" };
  if (code <= 67) return { icon: "rain", text: "Rain" };
  if (code <= 77) return { icon: "snow", text: "Snow" };
  if (code <= 82) return { icon: "rain", text: "Rain" };
  if (code <= 86) return { icon: "snow", text: "Snow showers" };
  return { icon: "storm", text: "Thunderstorm" };
}
function render() {
  const { place, weather } = lastData;
  const now = describe(weather.current.weather_code);
  currentEl.innerHTML = `
    <h2>${place.name}, ${place.country}</h2>
    <p class="icon big">${EMOJI[now.icon]}</p>
    <p class="temp">${formatTemp(weather.current.temperature_2m)}</p>
    <p>${now.text}, wind ${Math.round(weather.current.wind_speed_10m)} km/h</p>
    <button id="fav-btn" type="button">⭐ Save to Favorites</button>
    `;
  document.querySelector("#fav-btn").addEventListener("click", saveFavorite);

  let days = weather.daily.time.map((date, i) => ({
    date,
    code: weather.daily.weather_code[i],
    max: weather.daily.temperature_2m_max[i],
    min: weather.daily.temperature_2m_min[i],
  }));

  if (filterEl.value === "rain") {
    days = days.filter((d) =>
      ["rain", "storm"].includes(describe(d.code).icon),
    );
  }
  if (filterEl.value === "warm") {
    days = days.filter((d) => d.max >= 30);
  }
  if (sortEl.value === "hot") days.sort((a, b) => b.max - a.max);
  if (sortEl.value === "cold") days.sort((a, b) => a.min - b.min);

  forecastEl.innerHTML = days.length
    ? days
        .map((d) => {
          const day = describe(d.code);
          const name = new Date(`${d.date}T12:00`).toLocaleDateString("en-US", {
            weekday: "short",
          });
          return `
                 <div class="day">
                 <p><b>${name}</b></p>
                 <p class="icon">${EMOJI[day.icon]}</p>
                 <p>${formatTemp(d.max)}</p>
                 <p>${formatTemp(d.min)}</p>
                 </div>`;
        })
        .join("")
    : "<p>No days match this filter.</p>";
}
form.addEventListener("submit", async (e) => {
  e.preventDefault();
  const city = cityInput.value.trim();
  if (!city) return showStatus("Please type a city name.", true);

  const button = form.querySelector("button");
  button.disabled = true;
  showStatus("Loading...");
  try {
    const place = await getcoords(city);
    const weather = await getWeather(place.latitude, place.longitude);
    lastData = { place, weather };
    render();
    showStatus("");
  } catch (err) {
    lastData = null;
    currentEl.innerHTML = "";
    forecastEl.innerHTML = "";
    showStatus(err.message, true);
  } finally {
    button.disabled = false;
  }
});
function formatTemp(celsius) {
  const value = unit === "C" ? celsius : (celsius * 9) / 5 + 32;
  return `${Math.round(value)}°${unit}`;
}
unitBtn.addEventListener("click", () => {
  unit = unit === "C" ? "F" : "C";
  unitBtn.textContent = unit === "C" ? "Show °F" : "Show °C";
  if (lastData) render();
});

filterEl.addEventListener("change", () => {
  if (lastData) render();
});
sortEl.addEventListener("change", () => {
  if (lastData) render();
});

async function showPlace(place) {
  showStatus("Loading...");
  try {
    const weather = await getWeather(place.latitude, place.longitude);
    lastData = { place, weather };
    render();
    showStatus("");
  } catch (err) {
    showStatus(err.message, true);
  }
}
favoritesEl.addEventListener("click", (e) => {
  const btn = e.target.closest("button");
  if (!btn) return;
  const i = Number(btn.dataset.i);
  if (btn.classList.contains("fav-open")) showPlace(favorites[i]);
  if (btn.classList.contains("fav-remove")) {
    favorites.splice(i, 1);
    localStorage.setItem("favorites", JSON.stringify(favorites));
    renderFavorites();
  }
});
