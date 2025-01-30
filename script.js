// Configuration Constants
const SHEET_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vRv_tosp8If0B4UTn4jW9IPXrPF-ocF-9obdnn1D12_LDNvb23Dz56yZ9xZ43Wuj9azhc7SxcrLcOMX/pub?gid=0&single=true&output=csv';
const CHARLES_COLOR = '#FF7000';
const HUGH_COLOR = '#568203';
const ROUTE_OFFSET = 0.002; // Offset distance for parallel lines

// Canal route waypoints with verified coordinates and mile markers
const canalMilestones = [
    { point: [9.359167, -79.915833], mile: 0, name: "Atlantic Start", description: "Cristobal entrance" },
    { point: [9.314444, -79.916389], mile: 4, name: "Gatun Approach", description: "Channel to locks" },
    { point: [9.273926, -79.922788], mile: 8, name: "Gatun Locks", description: "Triple flight of locks" },
    { point: [9.203805, -79.921681], mile: 12, name: "Lake Entry", description: "Gatun Lake" },
    { point: [9.182832, -79.844458], mile: 18, name: "Main Channel", description: "East of Barro Colorado" },
    { point: [9.156970, -79.809162], mile: 23, name: "Mid-Lake", description: "Main shipping lane" },
    { point: [9.118224, -79.797418], mile: 27, name: "Lake South", description: "Entering Narrows" },
    { point: [9.121803, -79.741088], mile: 31, name: "Lake Channel", description: "Approaching Gamboa" },
    { point: [9.111621, -79.698380], mile: 34, name: "Gamboa", description: "Chagres intersection" },
    { point: [9.074685, -79.674204], mile: 37, name: "Culebra Cut", description: "Continental Divide" },
    { point: [9.039555, -79.644715], mile: 40, name: "Gold Hill", description: "Narrowest section" },
    { point: [9.017321, -79.613085], mile: 43, name: "Pedro Miguel", description: "Single lock" },
    { point: [8.996450, -79.591237], mile: 45, name: "Miraflores", description: "Double locks" },
    { point: [8.980392, -79.580227], mile: 47, name: "Pacific Approach", description: "Balboa reach" },
    { point: [8.980392, -79.580227], mile: 48, name: "Bridge of the Americas", description: "Bridge of the Americas" },
    { point: [8.934247, -79.558209], mile: 50, name: "Pacific Entrance", description: "Pacific Entrance" }
];

// Initialize map centered on the canal
const map = L.map('map').setView([9.1174, -79.8248], 9);

// Add OpenStreetMap base layer
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '© OpenStreetMap contributors'
}).addTo(map);

// Draw the base canal route
const routePoints = canalMilestones.map(m => m.point);
const baseRoute = L.polyline(routePoints, {
    color: 'gray',
    weight: 3,
    opacity: 0.5
}).addTo(map);

// Add milestone markers along the route
canalMilestones.forEach(milestone => {
    L.marker(milestone.point, {
        icon: L.divIcon({
            className: 'milestone-marker',
            html: `<div class="milestone-point"></div>`
        })
    })
    .bindPopup(`
        <strong>${milestone.name}</strong><br>
        Mile: ${milestone.mile}<br>
        ${milestone.description}
    `)
    .addTo(map);
});

// Helper function to parse dates in dd/mm/yyyy format
function parseDate(dateStr) {
    // First, handle "Jan 29" format
    if (dateStr.includes(' ')) {
        const [month, day] = dateStr.split(' ');
        const monthNum = new Date(Date.parse(month + " 1, 2000")).getMonth() + 1;
        return new Date(2025, monthNum - 1, parseInt(day));
    }
    // Handle dd/mm/yyyy format
    const [day, month, year] = dateStr.split('/').map(num => parseInt(num, 10));
    return new Date(year, month - 1, day);
}

// Function to update map data from Google Sheet
function updateMap() {
    const refreshButton = document.querySelector('.refresh-button');
    if (refreshButton) {
        refreshButton.disabled = true;
        refreshButton.textContent = 'Refreshing...';
    }

    fetch(SHEET_URL)
        .then(response => response.text())
        .then(data => {
            const rows = data.split('\n').map(row => row.split(','));
            processSwimmerData(rows);
            if (refreshButton) {
                refreshButton.disabled = false;
                refreshButton.textContent = 'Refresh Data';
            }
        });
}

// Process data for both swimmers
function processSwimmerData(rows) {
    // Remove header row and empty rows
    const dataRows = rows.slice(1).filter(row => row.length > 1);
    
    // Clear existing progress lines and markers
    map.eachLayer((layer) => {
        if (layer instanceof L.Polyline && layer !== baseRoute) {
            map.removeLayer(layer);
        }
        if (layer instanceof L.CircleMarker) {
            map.removeLayer(layer);
        }
    });
    
    // Filter data for each swimmer
    const charlesData = dataRows.filter(row => row[1].trim().toLowerCase() === 'charles');
    const hughData = dataRows.filter(row => row[1].trim().toLowerCase() === 'hugh');
    
    // Calculate total miles for each swimmer
    const charlesMiles = calculateTotalMiles(charlesData);
    const hughMiles = calculateTotalMiles(hughData);
    
    // Update progress lines and markers for each swimmer
    updateSwimmerProgress('Charles', charlesData, charlesMiles, CHARLES_COLOR, ROUTE_OFFSET);
    updateSwimmerProgress('Hugh', hughData, hughMiles, HUGH_COLOR, -ROUTE_OFFSET);
    
    // Update statistics panel
    updateStats(charlesMiles, hughMiles);
}

// Calculate total miles from swim data
function calculateTotalMiles(swimmerData) {
    return swimmerData.reduce((total, row) => total + parseFloat(row[3] || 0), 0);
}

// Update individual swimmer's progress on map
function updateSwimmerProgress(name, swimData, totalMiles, color, offset) {
    // Draw the progress line
    const progressPoints = canalMilestones
        .filter(m => m.mile <= totalMiles)
        .map(m => ([
            m.point[0] + offset,
            m.point[1]
        ]));

    L.polyline(progressPoints, {
        color: color,
        weight: 5,
        opacity: 1.0
    }).addTo(map);

    // Sort swim data by date
    swimData.sort((a, b) => {
        const dateA = parseDate(a[0]);
        const dateB = parseDate(b[0]);
        return dateA - dateB;
    });

    // Calculate and plot cumulative progress points
    let cumulativeMiles = 0;
    
    swimData.forEach(row => {
        const miles = parseFloat(row[3]);
        cumulativeMiles += miles;
        
        const dateStr = row[0];
        const date = parseDate(dateStr);
        const formattedDate = date.toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        });
        
        // Handle multiline comments - remove quotes and replace \n with <br>
        const comment = row[5] ? row[5].replace(/"/g, '').replace(/\\n/g, '<br>') : '';
        
        // Handle Strava link - ensure we're getting the full URL
        const stravaLink = row[6] ? row[6].trim() : '';
        
        console.log(`Processing swim for ${name}:`, {
            date: dateStr,
            parsedDate: date,
            miles,
            cumulativeMiles,
            comment,
            stravaLink
        });

        // Find position along route for this swim
        for (let i = 0; i < canalMilestones.length - 1; i++) {
            const current = canalMilestones[i];
            const next = canalMilestones[i + 1];
            
            if (cumulativeMiles >= current.mile && cumulativeMiles <= next.mile) {
                const progress = (cumulativeMiles - current.mile) / (next.mile - current.mile);
                const position = [
                    current.point[0] + (next.point[0] - current.point[0]) * progress + offset,
                    current.point[1] + (next.point[1] - current.point[1]) * progress
                ];

                // Add marker with popup
                L.circleMarker(position, {
                    radius: 4,
                    color: color,
                    fillColor: color,
                    fillOpacity: 0.8
                })
                .bindPopup(`
                    <div class="swim-popup">
                        <strong>${name} - ${formattedDate}</strong>
                        <p>Distance: ${miles.toFixed(2)} miles</p>
                        ${comment ? `<p>Comment: ${comment}</p>` : ''}
                        ${stravaLink ? `<p><a href="${stravaLink}" target="_blank">View on Strava</a></p>` : ''}
                    </div>
                `)
                .addTo(map);
                break;
            }
        }
    });
}

// Update statistics panel
function updateStats(charlesMiles, hughMiles) {
    const statsPanel = document.getElementById('statsPanel');
    statsPanel.innerHTML = `
        <div class="swimmer-card">
            <h3 style="color:${CHARLES_COLOR}">Charles</h3>
            <div class="progress-bar">
                <div class="progress-fill" style="width:${(charlesMiles/50*100)}%;background:${CHARLES_COLOR}"></div>
            </div>
            <p>${charlesMiles.toFixed(2)} miles (${(charlesMiles/50*100).toFixed(1)}%)</p>
        </div>
        <div class="swimmer-card">
            <h3 style="color:${HUGH_COLOR}">Hugh</h3>
            <div class="progress-bar">
                <div class="progress-fill" style="width:${(hughMiles/50*100)}%;background:${HUGH_COLOR}"></div>
            </div>
            <p>${hughMiles.toFixed(2)} miles (${(hughMiles/50*100).toFixed(1)}%)</p>
        </div>
        <button class="refresh-button" onclick="updateMap()">Refresh Data</button>
        <div class="update-time">Last updated: ${new Date().toLocaleString()}</div>
    `;
}

// Initial load
updateMap();

// Auto update every hour
setInterval(updateMap, 3600000);
