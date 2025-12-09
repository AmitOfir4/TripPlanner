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

    # --- Step 1: Data Fetching and Planning Logic will go here ---
    # We will call the Google Places API here using the GOOGLE_API_KEY

    # --- Temporary Success Response (Remove later) ---
    return Response({
        "status": "success", 
        "message": f"Successfully received city: {city}. API key loaded: {bool(GOOGLE_API_KEY)}"
    })

def root_view(request):
    # A simple response for the root URL
    return HttpResponse("<h1>Welcome to the Trip Planner Backend API!</h1><p>The main interface runs on the React frontend (usually port 5173).</p><p>API path: /api/plan/</p>")