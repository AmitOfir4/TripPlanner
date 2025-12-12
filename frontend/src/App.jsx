import { useState } from 'react'
import './App.css'

function App() {
  const [city, setCity] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [itinerary, setItinerary] = useState(null)
  const [kmlPath, setKmlPath] = useState(null)

  const handleSubmit = async (e) => {
    e.preventDefault()
    
    if (!city.trim()) 
    {
      setError('Please enter a city name')
      return
    }

    setLoading(true)
    setError(null)
    setItinerary(null)
    setKmlPath(null)

    try {
      const response = await fetch('http://localhost:8000/api/plan/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ city: city.trim() })
      })

      if (!response.ok)
      {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const data = await response.json()
      
      if (data.itinerary) 
      {
        setItinerary(data.itinerary)
        setKmlPath(data.kml_path)
      } 
      else if (data.error) 
      {
        setError(data.error)
      }
    } catch (err) 
    {
      setError(`Failed to plan trip: ${err.message}`)
    } finally 
    {
      setLoading(false)
    }
  }

  return (
    <div className="app-container">
      <header>
        <h1>🗺️ Trip Planner</h1>
        <p>Plan your perfect city itinerary with optimized routes</p>
      </header>

      <main>
        <form onSubmit={handleSubmit} className="trip-form">
          <div className="form-group">
            <label htmlFor="city-input">Enter a city name:</label>
            <input
              id="city-input"
              type="text"
              value={city}
              onChange={(e) => setCity(e.target.value)}
              placeholder="e.g., Paris, Tokyo, New York"
              disabled={loading}
            />
          </div>
          <button type="submit" disabled={loading}>
            {loading ? 'Planning your trip...' : 'Plan Trip'}
          </button>
        </form>

        {error && (
          <div className="error-message">
            <strong>Error:</strong> {error}
          </div>
        )}

        {itinerary && itinerary.length > 0 && (
          <div className="results">
            <h2>Your Optimized Itinerary for {city}</h2>
            <p className="itinerary-count">{itinerary.length} attractions planned</p>
            
            <ol className="itinerary-list">
              {itinerary.map((attraction, index) => (
                <li key={index} className="attraction-item">
                  <span className="attraction-number">{index + 1}</span>
                  <div className="attraction-details">
                    <h3>{attraction.name}</h3>
                    <p className="coordinates">
                      📍 {attraction.lat.toFixed(4)}, {attraction.lng.toFixed(4)}
                    </p>
                  </div>
                </li>
              ))}
            </ol>

            {kmlPath && (
              <div className="download-section">
                <a 
                  href={`http://localhost:8000${kmlPath}`}
                  download
                  className="download-button"
                >
                  📥 Download KML File
                </a>
                <p className="download-hint">
                  Open in Google Earth or Google Maps
                </p>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  )
}

export default App