// Configuration Constants
const SHEET_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vRv_tosp8If0B4UTn4jW9IPXrPF-ocF-9obdnn1D12_LDNvb23Dz56yZ9xZ43Wuj9azhc7SxcrLcOMX/pub?gid=0&single=true&output=csv';
const CHARLES_COLOR = '#FF7000';
const HUGH_COLOR = '#568203';
const ROUTE_OFFSET = 0.0005; // Reduced offset to keep lines in water

// Canal route waypoints with verified coordinates and mile markers
const canalMilestones = [
    { point: [9.359167, -79.915833], mile: 0, name: "Atlantic Start", description: "Cristobal entrance" },
    { point: [9.332507, -79.920307], mile: 4, name: "Gatun Approach", description: "Channel to locks" },
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
// Helper function to parse dates
function parseDate(dateStr) {
    try {
        console.log('Parsing date:', dateStr);
        // First, handle "Jan 29" format
        if (dateStr.includes(' ')) {
            const [month, day] = dateStr.split(' ');
            const monthNum = new Date(Date.parse(month + " 1, 2000")).getMonth() + 1;
            const date = new Date(2025, monthNum - 1, parseInt(day, 10));
            console.log('Parsed date:', date);
            return date;
        }
        // Handle dd/mm/yyyy format
        const [day, month, year] = dateStr.split('/').map(num => parseInt(num, 10));
        return new Date(year, month - 1, day);
    } catch (error) {
        console.error('Error parsing date:', dateStr, error);
        return new Date(); // Return current date as fallback
    }
}

// Function to parse CSV data properly
function parseCSV(text) {
    const rows = [];
    let row = [];
    let field = '';
    let inQuotes = false;

    for (let i = 0; i < text.length; i++) {
        const char = text[i];
        const nextChar = text[i + 1];

        if (char === '"') {
            if (inQuotes && nextChar === '"') {
                // Handle doubled quotes
                field += '"';
                i++;
            } else {
                // Toggle quote mode
                inQuotes = !inQuotes;
            }
        } else if (char === ',' && !inQuotes) {
            // End of field
            row.push(field);
            field = '';
        } else if (char === '\n' && !inQuotes) {
            // End of row
            row.push(field);
            if (row.some(field => field.trim() !== '')) {
                rows.push(row);
            }
            row = [];
            field = '';
        } else if (char !== '\r') {
            field += char;
        }
    }

    // Handle the last field/row
    if (field || row.length > 0) {
        row.push(field);
        if (row.some(field => field.trim() !== '')) {
            rows.push(row);
        }
    }

    return rows;
}

// Function to update map data from Google Sheet
function updateMap() {
    console.log('Starting updateMap');
    const refreshButton = document.querySelector('.refresh-button');
    if (refreshButton) {
        refreshButton.disabled = true;
        refreshButton.textContent = 'Refreshing...';
    }

    fetch(SHEET_URL)
        .then(response => {
            console.log('Fetch response:', response);
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            return response.text();
        })
        .then(data => {
            console.log('Raw data received:', data.substring(0, 200) + '...');
            const rows = parseCSV(data);
            console.log('Parsed rows:', rows);
            processSwimmerData(rows);
            
            if (refreshButton) {
                refreshButton.disabled = false;
                refreshButton.textContent = 'Refresh Data';
            }
        })
        .catch(error => {
            console.error('Error fetching or processing data:', error);
            if (refreshButton) {
                refreshButton.disabled = false;
                refreshButton.textContent = 'Refresh Data (Error)';
            }
        });
}
// Process data for both swimmers
function processSwimmerData(rows) {
    console.log('Processing swimmer data - total rows:', rows.length);
    // Remove header row and empty rows
    const dataRows = rows.slice(1).filter(row => row.length > 1 && row[1]);
    console.log('Data rows after filtering:', dataRows);
    
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
    const charlesData = dataRows.filter(row => {
        const isCharles = row[1] && row[1].trim().toLowerCase() === 'charles';
        console.log('Row check for Charles:', row[1], isCharles, row);
        return isCharles;
    });
    const hughData = dataRows.filter(row => {
        const isHugh = row[1] && row[1].trim().toLowerCase() === 'hugh';
        console.log('Row check for Hugh:', row[1], isHugh, row);
        return isHugh;
    });

    console.log('Charles data:', charlesData);
    console.log('Hugh data:', hughData);
    
    // Calculate total miles for each swimmer
    const charlesMiles = calculateTotalMiles(charlesData);
    const hughMiles = calculateTotalMiles(hughData);
    
    console.log('Calculated miles:', { charles: charlesMiles, hugh: hughMiles });
    
    // Update progress lines and markers for each swimmer
    updateSwimmerProgress('Charles', charlesData, charlesMiles, CHARLES_COLOR, ROUTE_OFFSET);
    updateSwimmerProgress('Hugh', hughData, hughMiles, HUGH_COLOR, -ROUTE_OFFSET);
    
    // Update statistics panel
    updateStats(charlesMiles, hughMiles);
}

// Calculate total miles from swim data
function calculateTotalMiles(swimmerData) {
    const total = swimmerData.reduce((total, row) => {
        const miles = parseFloat(row[3] || 0);
        console.log('Adding miles:', miles);
        return total + miles;
    }, 0);
    console.log('Total miles calculated:', total);
    return total;
}

// Update individual swimmer's progress on map
function updateSwimmerProgress(name, swimData, totalMiles, color, offset) {
    console.log(`Updating progress for ${name}`, { swimData, totalMiles });
    
    // Sort swim data by date first
    swimData.sort((a, b) => {
        const dateA = parseDate(a[0]);
        const dateB = parseDate(b[0]);
        return dateA - dateB;
    });

    // Calculate cumulative distances and create progress points
    let cumulativeMiles = 0;
    const progressPoints = [];
    
    // Always start from the first milestone
    progressPoints.push([
        canalMilestones[0].point[0],
        canalMilestones[0].point[1] + offset
    ]);

    // Add points for each swim
    swimData.forEach(row => {
        const miles = parseFloat(row[3]);
        cumulativeMiles += miles;
        console.log(`Processing swim for ${name}:`, { miles, cumulativeMiles });

        // Find position along route for this cumulative distance
        for (let i = 0; i < canalMilestones.length - 1; i++) {
            const current = canalMilestones[i];
            const next = canalMilestones[i + 1];
            
            if (cumulativeMiles >= current.mile && cumulativeMiles <= next.mile) {
                const progress = (cumulativeMiles - current.mile) / (next.mile - current.mile);
                const position = [
                    current.point[0] + (next.point[0] - current.point[0]) * progress,
                    current.point[1] + (next.point[1] - current.point[1]) * progress + offset
                ];
                progressPoints.push(position);
                break;
            }
        }
    });
    // Draw the progress line
    console.log(`Drawing ${name}'s line with ${progressPoints.length} points:`, progressPoints);
    L.polyline(progressPoints, {
        color: color,
        weight: 5,
        opacity: 1.0
    }).addTo(map);

    // Reset cumulative miles for marker placement
    cumulativeMiles = 0;

    // Add individual swim points
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
        
        // Handle multiline comments - properly handle quotes and newlines
        let comment = '';
        if (row[5]) {
            comment = row[5]
                .replace(/^"/, '')     // Remove leading quote
                .replace(/"$/, '')     // Remove trailing quote
                .replace(/\\n/g, '<br>') // Replace \n with <br>
                .replace(/\n/g, '<br>'); // Replace actual newlines with <br>
        }
        
        // Handle Strava link - ensure we get the complete URL
        const stravaLink = row[6] ? row[6].trim().replace(/^"/, '').replace(/"$/, '') : '';

        console.log('Processing swim point:', {
            name,
            date: dateStr,
            parsedDate: date,
            comment,
            stravaLink,
            cumulativeMiles
        });

        // Find position along route for this swim
        for (let i = 0; i < canalMilestones.length - 1; i++) {
            const current = canalMilestones[i];
            const next = canalMilestones[i + 1];
            
            if (cumulativeMiles >= current.mile && cumulativeMiles <= next.mile) {
                const progress = (cumulativeMiles - current.mile) / (next.mile - current.mile);
                const position = [
                    current.point[0] + (next.point[0] - current.point[0]) * progress,
                    current.point[1] + (next.point[1] - current.point[1]) * progress + offset
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
                        ${comment ? `<p>${comment}</p>` : ''}
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
console.log('Starting initial load');
updateMap();

// Auto update every hour
setInterval(updateMap, 3600000);
