from geopy.distance import geodesic
from typing import List, Dict

def plan_itinerary_nearest_neighbor(attractions: List[Dict]) -> List[Dict]:
    """
    Sorts a list of attractions using the Nearest Neighbor algorithm.
    Always moves from the current point to the closest unvisited point.
    """
    if not attractions:
        return []

    # 1. Initialize
    planned_route = []
    unvisited = attractions.copy()
    
    # Start with the first attraction in the list
    current_attraction = unvisited.pop(0) 
    planned_route.append(current_attraction)

    # 2. Iterate until all points are visited
    while unvisited:
        min_distance = float('inf')
        nearest_neighbor = None
        nearest_neighbor_index = -1
        
        current_coords = (current_attraction['lat'], current_attraction['lng'])

        # Find the closest unvisited attraction
        for i, neighbor in enumerate(unvisited):
            neighbor_coords = (neighbor['lat'], neighbor['lng'])
            
            # Calculate distance between the current point and the neighbor
            distance = geodesic(current_coords, neighbor_coords).kilometers
            
            if distance < min_distance:
                min_distance = distance
                nearest_neighbor = neighbor
                nearest_neighbor_index = i

        # 3. Move to the nearest neighbor and remove it from unvisited list
        if nearest_neighbor:
            current_attraction = nearest_neighbor
            planned_route.append(current_attraction)
            unvisited.pop(nearest_neighbor_index)
        else:
            break 
            
    return planned_route