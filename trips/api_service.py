import requests
import os
from dotenv import load_dotenv

# Load the environment variables from the .env file
load_dotenv()

# Base URL for the Google Places API (Text Search is suitable for finding attractions)
GOOGLE_PLACES_BASE_URL = "https://maps.googleapis.com/maps/api/place/textsearch/json"
GOOGLE_API_KEY = os.getenv("GOOGLE_API_KEY")

def fetch_attractions(city_name):
    """
    Fetches popular tourist attractions for a given city from Google Places API.
    Returns a list of dictionaries with name, lat, and lng.
    """
    if not GOOGLE_API_KEY:
        print("Error: GOOGLE_API_KEY not found in environment.")
        return []

    # Query for the attractions
    query = f"popular tourist attractions in {city_name}"
    
    params = {
        'query': query,
        'key': GOOGLE_API_KEY
    }
    
    try:
        response = requests.get(GOOGLE_PLACES_BASE_URL, params=params)
        response.raise_for_status() # Raise exception for HTTP errors (4xx or 5xx)
        data = response.json()
        
        attractions_list = []
        
        # Parse the JSON results
        for result in data.get('results', []):
            name = result.get('name')
            # Extract latitude and longitude
            location = result['geometry']['location']
            lat = location['lat']
            lng = location['lng']
            
            attractions_list.append({
                'name': name,
                'lat': lat,
                'lng': lng
            })
            
        # Limit the list to 10 attractions for reasonable planning time
        return attractions_list[:10]
        
    except requests.exceptions.RequestException as e:
        print(f"API Request Error: {e}")
        return []
    except Exception as e:
        print(f"An unexpected error occurred: {e}")
        return []