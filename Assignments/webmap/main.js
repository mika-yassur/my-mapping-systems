var map = new maplibregl.Map({
    container: 'map', // container id
    style: "style.json", // style URL for basemap
    center: [-73.97144, 40.70491], // starting position [lng, lat]
    zoom: 6 // starting zoom
});

map.addControl(new maplibregl.NavigationControl());

// Fetch IP locations data from local GeoJSON file
fetch("ip_locations.geojson")
    .then((response) => {
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        return response.json();
    })
    .then((data) => {
        console.log('GeoJSON data loaded:', data);
        
        map.on('load', () => {
            map.addSource('ip-locations', {
                type: 'geojson',
                data: data
            });

            map.addLayer({
                'id': 'ip-locations-layer',
                'type': 'circle',
                'source': 'ip-locations',
                'paint': {
                    "circle-radius": 5,
                    "circle-stroke-width": 2,
                    "circle-color": "#007cbf",
                    "circle-stroke-color": "white",
                    "circle-opacity": 0.8
                }
            });

            // Optional: Fit map to show all points
            if (data.features && data.features.length > 0) {
                const bounds = new maplibregl.LngLatBounds();
                data.features.forEach(feature => {
                    if (feature.geometry && feature.geometry.coordinates) {
                        bounds.extend(feature.geometry.coordinates);
                    }
                });
                map.fitBounds(bounds, { padding: 50 });
            }
        });
    })
    .catch((error) => {
        console.error('Error loading GeoJSON file:', error);
        alert('Error loading IP locations data. Please check that ip_locations.geojson exists in your webmap folder.');
    });