import requests
import os
from dotenv import load_dotenv

# Load the environment variables from the .env file
load_dotenv()

# Base URL for the Google Places API (New)
GOOGLE_PLACES_BASE_URL = "https://places.googleapis.com/v1/places:searchText"
GOOGLE_API_KEY = os.getenv("GOOGLE_API_KEY")

def fetch_attractions(city_name):
    """
    Fetches popular tourist attractions for a given city from Google Places API (New).
    Returns a list of dictionaries with name, lat, and lng.
    """
    if not GOOGLE_API_KEY:
        print("Error: GOOGLE_API_KEY not found in environment.")
        return []

    # Query for the attractions
    query = f"popular tourist attractions in {city_name}"
    
    headers = {
        'Content-Type': 'application/json',
        'X-Goog-Api-Key': GOOGLE_API_KEY,
        'X-Goog-FieldMask': 'places.displayName,places.location'
    }
    
    payload = {
        'textQuery': query,
        'languageCode': 'en'
    }
    
    try:
        response = requests.post(GOOGLE_PLACES_BASE_URL, json=payload, headers=headers)
        response.raise_for_status() # Raise exception for HTTP errors (4xx or 5xx)
        data = response.json()
        
        attractions_list = []
        
        # Parse the JSON results from new API format
        for place in data.get('places', []):
            name = place.get('displayName', {}).get('text', 'Unknown')
            # Extract latitude and longitude
            location = place.get('location', {})
            lat = location.get('latitude')
            lng = location.get('longitude')
            
            if lat is not None and lng is not None:
                attractions_list.append({
                    'name': name,
                    'lat': lat,
                    'lng': lng
                })
            
        # Limit the list to 10 attractions for reasonable planning time
        return attractions_list[:10]
        
    except requests.exceptions.RequestException as e:
        print(f"API Request Error: {e}")
        if hasattr(e.response, 'text'):
            print(f"Response: {e.response.text}")
        return []
    except Exception as e:
        print(f"An unexpected error occurred: {e}")
        return []