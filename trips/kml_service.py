import simplekml
import os

def generate_trip_kml(city_name, planned_itinerary):
    """
    Generates a KML file from the planned itinerary and saves it temporarily.
    
    Args:
        city_name (str): The name of the city.
        planned_itinerary (list): A list of dictionaries (attractions) that have 
                                  'name', 'lat', and 'lng' keys.
    Returns:
        str: The path to the generated KML file.
    """
    kml = simplekml.Kml()
    
    # Create a Folder for the entire trip
    trip_folder = kml.new_folder(name=f"Trip Plan for {city_name}")
    
    # Set a custom style for the placemarks (optional, but makes points look nice)
    style = simplekml.Style()
    style.iconstyle.icon.href = 'http://maps.google.com/mapfiles/kml/paddle/wht-stars.png'

    for index, attraction in enumerate(planned_itinerary):
        # Create a Placemark for each attraction
        placemark = trip_folder.new_point(
            name=f"{index + 1}. {attraction['name']}",
            # KML standard is (Longitude, Latitude)
            coords=[(attraction['lng'], attraction['lat'])] 
        )
        
        # Add rich description content
        placemark.description = f"<h3>Stop #{index + 1}: {attraction['name']}</h3>\n" \
                                f"<p>Coordinates: {attraction['lat']}, {attraction['lng']}</p>"
        
        placemark.style = style

    # Ensure the media folder exists to save the file
    media_dir = 'media'
    os.makedirs(media_dir, exist_ok=True)
    
    file_name = f"{city_name}_trip_plan.kml"
    kml_output_path = os.path.join(media_dir, file_name)
    
    kml.save(kml_output_path)
    
    return kml_output_path