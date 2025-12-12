import os
from django.shortcuts import render
from rest_framework.decorators import api_view
from rest_framework.response import Response
from dotenv import load_dotenv
from django.http import JsonResponse, HttpResponse, FileResponse

from .api_service import fetch_attractions           # <-- Now exists
from .kml_service import generate_trip_kml          # <-- Must exist
from .planner_service import plan_itinerary_nearest_neighbor # <-- Must exist

# Load the environment variables from the .env file
load_dotenv()

# We will put the API key into a variable here
GOOGLE_API_KEY = os.getenv("GOOGLE_API_KEY")

@api_view(['POST'])
def plan_trip(request):
    """
    Receives the city name, triggers the planning, and returns the KML file.
    """
    city = request.data.get('city')
    
    if not city:
        return Response({"error": "City parameter is required."}, status=400)

    # Step 1: Fetch attractions from Google Places API
    attractions = fetch_attractions(city)
    
    if not attractions:
        return Response({
            "error": f"Could not find attractions for {city}. Please try another city."
        }, status=404)
    
    # Step 2: Plan the itinerary using Nearest Neighbor algorithm
    itinerary = plan_itinerary_nearest_neighbor(attractions)
    
    # Step 3: Generate KML file
    kml_path = generate_trip_kml(city, itinerary)
    
    # Return the itinerary and path to KML file
    return Response({
        "status": "success",
        "city": city,
        "itinerary": itinerary,
        "kml_path": f"/media/{os.path.basename(kml_path)}"
    })

def root_view(request):
    # A simple response for the root URL
    return HttpResponse("<h1>Welcome to the Trip Planner Backend API!</h1><p>The main interface runs on the React frontend (usually port 5173).</p><p>API path: /api/plan/</p>")