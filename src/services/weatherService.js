/** Free weather via Open-Meteo (no API key). */
export async function getWeatherSummary(lat, lon) {
  const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,relative_humidity_2m,weather_code,wind_speed_10m&timezone=auto`
  const res = await fetch(url)
  if (!res.ok) throw new Error('Weather fetch failed')
  const data = await res.json()
  const c = data.current
  const temp = Math.round(c.temperature_2m)
  const unit = data.current_units?.temperature_2m === '°F' ? 'F' : 'C'
  const desc = weatherCodeToText(c.weather_code)
  return `It's ${temp} degrees ${unit === 'C' ? 'Celsius' : 'Fahrenheit'}, ${desc}. Humidity ${c.relative_humidity_2m} percent.`
}

function weatherCodeToText(code) {
  const map = {
    0: 'clear skies', 1: 'mainly clear', 2: 'partly cloudy', 3: 'overcast',
    45: 'foggy', 48: 'foggy', 51: 'light drizzle', 61: 'rain', 63: 'rain',
    65: 'heavy rain', 71: 'snow', 80: 'rain showers', 95: 'thunderstorms',
  }
  return map[code] || 'variable conditions'
}

export async function getWeatherSnapshot(lat, lon) {
  let latitude = lat
  let longitude = lon

  if (latitude == null || longitude == null) {
    const coords = await new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        reject(new Error('Location not available'))
        return
      }
      navigator.geolocation.getCurrentPosition(
        (pos) => resolve({ lat: pos.coords.latitude, lon: pos.coords.longitude }),
        () => reject(new Error('Location denied')),
        { timeout: 10000, maximumAge: 600000 }
      )
    })
    latitude = coords.lat
    longitude = coords.lon
  }

  const url = `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current=temperature_2m,relative_humidity_2m,weather_code&timezone=auto`
  const res = await fetch(url)
  if (!res.ok) throw new Error('Weather fetch failed')
  const data = await res.json()
  const c = data.current
  const unit = data.current_units?.temperature_2m === '°F' ? 'F' : 'C'
  return {
    temp: Math.round(c.temperature_2m),
    unit,
    desc: weatherCodeToText(c.weather_code),
    humidity: c.relative_humidity_2m,
  }
}

export function getWeatherByCoords() {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error('Location not available'))
      return
    }
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        try {
          const summary = await getWeatherSummary(pos.coords.latitude, pos.coords.longitude)
          resolve(summary)
        } catch (e) {
          reject(e)
        }
      },
      () => reject(new Error('Please allow location for weather')),
      { timeout: 10000 }
    )
  })
}
