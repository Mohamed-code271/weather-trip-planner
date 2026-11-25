# Weather Trip Planner

A simple, fast weather app that lets you search any city, view a 7-day forecast, **filter** and **sort** the forecast days, and **save favorite cities** that are still there when you come back.

Built for the "Playing Around with APIs" assignment. It runs locally in a browser and is deployed on two web servers behind a load balancer.

## Links

- **Live site (through the load balancer):** http://www.abdikarim.tech  (or http://LB_IP)
- **Demo video (max 2 minutes):** PASTE_VIDEO_LINK_HERE
- **GitHub repository:** https://github.com/YOUR_USERNAME/weather-trip-planner

## Credentials and API keys

- **API keys needed: none.** Open-Meteo's free API works without a key, so no secrets exist in this repository.
- **Login needed: none.** The app has no accounts. Favorites are saved in your own browser (`localStorage`).

## Features

- **Search** any city in the world by name
- **Current weather**: temperature, conditions and wind speed
- **7-day forecast** with an emoji for each day's conditions
- **Filter** forecast days: all days, rainy days only, or hot days (30°C and above)
- **Sort** forecast days: by date, hottest first, or coolest first
- **°C / °F switch** with one click
- **Favorites**: save a city, click it later to reload its weather, remove it with ✕. Favorites survive a page refresh
- **Error handling**: clear messages for an empty search, a city that isn't found, a network problem, a bad response from the API, and a filter that matches no days

## APIs used

Weather data is provided by **[Open-Meteo](https://open-meteo.com/)**, an open-source weather API.

- Geocoding API (city name to coordinates): https://open-meteo.com/en/docs/geocoding-api
- Forecast API (weather data): https://open-meteo.com/en/docs

Thank you to the Open-Meteo team for offering a free, keyless API. Their data is licensed under CC BY 4.0, and the free API is for non-commercial use.

## Project structure

```
weather-trip-planner/
├── index.html    # page structure
├── style.css     # styling
├── script.js     # API calls, filtering, sorting, favorites
├── .gitignore
└── README.md
```

## Run it locally

You only need a web browser. There is nothing to install.

1. Clone the repository:
   ```bash
   git clone https://github.com/YOUR_USERNAME/weather-trip-planner.git
   cd weather-trip-planner
   ```
2. Open `index.html` in your browser (double-click it, or in VS Code use the Live Server extension).
3. Type a city such as `Nairobi` and press **Search**.

## Deployment

The app is static (HTML, CSS and JavaScript), so each web server only needs Nginx to serve the files. The browser calls the Open-Meteo API directly.

**Architecture**

```
          Browser
             |
         lb-01 (HAProxy, roundrobin)
         /                \
   web-01 (Nginx)      web-02 (Nginx)
```

### 1. Deploy to web-01 and web-02

Repeat these steps on **both** servers.

1. Connect to the server:
   ```bash
   ssh ubuntu@WEB_IP
   ```
2. Make sure Nginx is installed (it already is if you ran the earlier load balancer project scripts):
   ```bash
   sudo apt-get update -y
   sudo apt-get install -y nginx git
   ```
3. Download the code and copy it into Nginx's web folder:
   ```bash
   git clone https://github.com/mohamed-code271/weather-trip-planner.git
   sudo cp weather-trip-planner/index.html weather-trip-planner/style.css weather-trip-planner/script.js /var/www/html/
   ```
4. Restart Nginx and test the server on its own:
   ```bash
   sudo service nginx restart
   curl -sI localhost | grep -i x-served-by
   ```
   The `X-Served-By` header (set in the earlier load balancer project) shows which server answered, for example `7342-web-01`.

To update the app later, run `git pull` inside the cloned folder and copy the three files again.

### 2. Configure the load balancer (lb-01)

HAProxy sends each new request to the next server in turn (roundrobin).

1. Connect to lb-01 and install HAProxy:
   ```bash
   ssh ubuntu@LB_IP
   sudo apt-get update -y
   sudo apt-get install -y haproxy
   ```
2. Edit `/etc/haproxy/haproxy.cfg` so it contains:
   ```
   global
       daemon
       maxconn 256

   defaults
       mode http
       timeout connect 5000ms
       timeout client 50000ms
       timeout server 50000ms

   frontend http_front
       bind *:80
       default_backend http_back

   backend http_back
       balance roundrobin
       server 7342-web-01 35.178.171.253:80 check
       server 7342-web-02 3.10.171.138:80 check
   ```
3. Check the config, then restart:
   ```bash
   sudo haproxy -c -f /etc/haproxy/haproxy.cfg
   sudo service haproxy restart
   ```

### 3. Test the load balancer

Run this several times on lb-01 or on your laptop:

```bash
curl -sI http://18.175.145.68 | grep -i x-served-by
```

The answer should alternate between `7342-web-01` and `7342-web-02`. That proves traffic is shared between both servers. Then open the live site in a browser and check that search, filters, sorting and favorites work.

## Challenges and how I solved them

- **Typos that silently broke the app.** A misspelled `fetch`, a wrong API hostname and a missing `#` in a selector each stopped the app from working. The browser's Developer Tools **Console** tab showed the exact error and line, which made each one quick to fix.
- **Variables used before they were defined.** A `ReferenceError` appeared because a constant was declared lower in the file than the line that used it. I moved all element lookups to the top of `script.js`.
- **Mismatched function names.** A button called `saveFavorite` while the function was named `saveFavorites`. Matching the names fixed it.
- **Broken image icons.** The first version loaded `.svg` files that did not exist. I replaced them with emojis, so there are no extra files to deploy.
- **The 7-day layout.** A 5-column grid made 7 days wrap badly, so I switched to a responsive grid.
- **No API key to protect.** Choosing a keyless API (Open-Meteo) means nothing secret can end up in the public repository.

## Credits

- Weather and geocoding data: [Open-Meteo](https://open-meteo.com/) (CC BY 4.0)
- Weather icons: standard Unicode emojis
- Learning resources: https://youtu.be/tPBOTAvf3o8
- Load balancer and web server setup: from my earlier Nginx and HAProxy project

## Author

Abdikarim