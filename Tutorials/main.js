  var map = new maplibregl.Map({
        container: 'map', // container id
        style: "style.json", // style URL for basemap
        center: [-73.97144, 40.70491], // starting position [lng, lat]
        zoom: 6 // starting zoom
    });
map.addControl(new maplibregl.NavigationControl());

// Fetch pizza restaurant data from the NYC Open Data API
const jsonFeatures =  fetch(
  "https://data.cityofnewyork.us/resource/43nn-pn8j.geojson?cuisine_description=Pizza&$limit=10000"
)
  .then((response) => response.json())
  .then((data) => {
    data.features.forEach((feature) => {
  feature.geometry = {
    type: "Point",
    coordinates: [
      Number(feature.properties.longitude),
      Number(feature.properties.latitude),
    ],
  };
});
map.on('load', () => {        
      map.addSource('restaurants', {
          type: 'geojson',
          data: data
      });

      map.addLayer({
          'id': 'restaurants-layer',
          'type': 'circle',
          'source': 'restaurants',
            paint: {
          "circle-radius": 3,
          "circle-stroke-width": 2,
          "circle-color": "#ff7800",
          "circle-stroke-color": "white",
            },
      });
    })
  })
  
  .catch((error) => console.error("Error fetching data:", error));
    map.on("click", "restaurants-layer", (e) => {
      const coordinates = e.features[0].geometry.coordinates.slice();
      const description = e.features[0].properties.dba
      new maplibregl.Popup()
        .setLngLat(coordinates)
        .setHTML(description)
        .addTo(map);
    });

const { createClient } = window.supabase;
const supabaseUrl = 'https://vvvsxhicwblmmgkmpepn.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZ2dnN4aGljd2JsbW1na21wZXBuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTMzOTQxMjEsImV4cCI6MjA2ODk3MDEyMX0.NYpmihzyZT5QbmoW3_vD064uOV7BYZM-LMmLf7n0pBw';
const supabaseClient = createClient(supabaseUrl, supabaseKey);

async function querySupabase() {
    const { data, error } = await supabaseClient
        .from("open-restaurant-inspections")
        .select("*")
        .limit(100);

    if (error) {
        console.error("Error fetching data:", error);
    } else {
        console.log("Data fetched successfully:", data);
    }
}
document.addEventListener("DOMContentLoaded", () => {
    querySupabase();
});
async function queryWithinDistance(point, n = 1000) {
        const { data, error } = await supabaseClient.rpc(
          "find_nearest_n_restaurants",
          {
            lat: point[1],
            lon: point[0],
            n: n,
          }
        );

        if (error) {
          console.error("Error fetching nearest points:", error);
        } else {
          console.log("Nearest points fetched successfully:", data);
          // do other stuff here later...
        }
      }

      // Convert the data to GeoJSON format
  const geojsonData = {
    type: 'FeatureCollection',
    features: data.map(restaurant => ({
      type: 'Feature',
      geometry: {
        type: 'Point',
        coordinates: [restaurant.long, restaurant.lat]
      },
      properties: {
        RestaurantInspectionID: restaurant.restaurantinspectionid,
        name: restaurant.name,
        seating_choice: restaurant.seating_choice,
        inspection_date: restaurant.inspection_date,
        compliance: restaurant.compliance,
        dist_meters: restaurant.dist_meters
      }
    }))
  };

  // Remove existing inspection layer if it exists
  if (map.getLayer('inspection-layer')) {
    map.removeLayer('inspection-layer');
  }
  if (map.getSource('inspections')) {
    map.removeSource('inspections');
  }

  // Add the inspection data as a new source
  map.addSource('inspections', {
    type: 'geojson',
    data: geojsonData
  });

  // Add a layer for inspection points with styling based on compliance
  map.addLayer({
    id: 'inspection-layer',
    type: 'circle',
    source: 'inspections',
    paint: {
      'circle-radius': [
        'interpolate',
        ['linear'],
        ['get', 'dist_meters'],
        0, 8,     // Closest restaurants get larger circles
        500, 6,   // Medium distance
        1000, 4   // Furthest restaurants get smaller circles
      ],
      'circle-color': [
        'case',
        ['==', ['get', 'is_roadway_compliant'], 'Compliant'], '#00aa00',  // Green for compliant
        ['==', ['get', 'is_roadway_compliant'], 'Non-Compliant'], '#ff4444',  // Red for non-compliant
        ['==', ['get', 'is_roadway_compliant'], 'For HIQA Review'], '#ffaa00',  // Orange for under review
        ['==', ['get', 'is_roadway_compliant'], 'Under Review'], '#ffaa00',  // Orange for under review
        ['==', ['get', 'is_roadway_compliant'], 'Cease and Desist'], '#aa0000',  // Dark red for cease and desist
        ['==', ['get', 'is_roadway_compliant'], 'Suspended and Deactivated'], '#800080',  // Purple for suspended
        ['==', ['get', 'is_roadway_compliant'], 'Removed and Deactivated'], '#400040',  // Dark purple for removed
        '#4247dfff'  // Gray for other/unknown status
      ],
      'circle-stroke-width': [
        'case',
        ['in', ['get', 'is_roadway_compliant'], ['literal', ['Cease and Desist', 'Suspended and Deactivated', 'Removed and Deactivated']]], 3,  // Thicker border for serious violations
        2
      ],
      'circle-stroke-color': 'white',
      'circle-opacity': 0.8
    },
  });

  // Add click handler for inspection points
  map.on("click", "inspection-layer", (e) => {
    const coordinates = e.features[0].geometry.coordinates.slice();
    const properties = e.features[0].properties;
    
    // Format the inspection date
    const inspectionDate = properties.inspection_date ? 
      new Date(properties.inspection_date).toLocaleDateString() : 'N/A';
    
    const popupContent = `
      <div style="font-family: Arial, sans-serif; max-width: 280px;">
        <h3 style="margin: 0 0 15px 0; color: #333;">${properties.name}</h3>
        <p style="margin: 8px 0; font-size: 14px;"><strong>Inspected On:</strong> ${inspectionDate}</p>
        <p style="margin: 8px 0; font-size: 14px;"><strong>Roadway Compliance:</strong> ${properties.compliance || 'N/A'}</p>
      </div>
    `;
    
    new maplibregl.Popup()
      .setLngLat(coordinates)
      .setHTML(popupContent)
      .addTo(map);
  });

  // Change cursor on hover
  map.on('mouseenter', 'inspection-layer', () => {
    map.getCanvas().style.cursor = 'pointer';
  });

  map.on('mouseleave', 'inspection-layer', () => {
    map.getCanvas().style.cursor = '';
  });




    