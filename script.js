// Constants
const SHEET_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vRv_tosp8If0B4UTn4jW9IPXrPF-ocF-9obdnn1D12_LDNvb23Dz56yZ9xZ43Wuj9azhc7SxcrLcOMX/pub?gid=0&single=true&output=csv';
const CHARLES_COLOR = '#FF7000';
const HUGH_COLOR = '#568203';

// Canal milestones with verified coordinates
const canalMilestones = [
    // Atlantic Entrance
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

// Initialize map
const map = L.map('map').setView([9.1174, -79.8248], 9);

// Add map layer
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '© OpenStreetMap contributors'
}).addTo(map);

// Draw base route
const routePoints = canalMilestones.map(m => m.point);
const baseRoute = L.polyline(routePoints, {
    color: 'gray',
    weight: 2,
    opacity: 0.5
}).addTo(map);

// Add milestone markers
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

// Create refresh button
const statsPanel = document.getElementById('statsPanel');
const refreshButton = document.createElement('button');
refreshButton.className = 'refresh-button';
refreshButton.textContent = 'Refresh Data';
refreshButton.onclick = updateMap;
statsPanel.appendChild(refreshButton);

// Update function
function updateMap() {
    refreshButton.disabled = true;
    refreshButton.textContent = 'Refreshing...';

    fetch(SHEET_URL)
        .then(response => response.text())
        .then(data => {
            const rows = data.split('\n').map(row => row.split(','));
            processSwimmerData(rows);
            refreshButton.disabled = false;
            refreshButton.textContent = 'Refresh Data';
        })
        .catch(error => {
            console.error('Error fetching data:', error);
            refreshButton.disabled = false;
            refreshButton.textContent = 'Refresh Data';
        });
}

// Process swimmer data
function processSwimmerData(rows) {
    // Skip header row
    const dataRows = rows.slice(1);
    
    // Get swimmer data
    const charlesData = dataRows.filter(row => row[1].trim().toLowerCase() === 'charles');
    const hughData = dataRows.filter(row => row[1].trim().toLowerCase() === 'hugh');
    
    // Calculate progress
    const charlesMiles = calculateTotalMiles(charlesData);
    const hughMiles = calculateTotalMiles(hughData);
    
    // Update display
    updateSwimmerProgress('Charles', charlesMiles, CHARLES_COLOR);
    updateSwimmerProgress('Hugh', hughMiles, HUGH_COLOR);
    updateStats(charlesMiles, hughMiles);
}

// Calculate total miles
function calculateTotalMiles(swimmerData) {
    return swimmerData.reduce((total, row) => total + parseFloat(row[3] || 0), 0);
}

// Update swimmer progress on map
function updateSwimmerProgress(name, miles, color) {
    const progress = miles / 50;
    const position = calculatePosition(progress);
    
    // Draw progress line
    const progressRoute = canalMilestones
        .filter(m => m.mile <= miles)
        .map(m => m.point);
    
    if (position) progressRoute.push(position);
    
    L.polyline(progressRoute, {
        color: color,
        weight: 4,
        opacity: 0.8
    }).addTo(map);

    // Add current position marker
    if (position) {
        L.marker(position, {
            icon: L.divIcon({
                className: 'swimmer-marker',
                html: `<div style="color:${color};font-size:24px;">●</div>`
            })
        })
        .bindPopup(`${name}: ${miles.toFixed(2)} miles`)
        .addTo(map);
    }
}

// Calculate position along route
function calculatePosition(progress) {
    if (progress >= 1) return canalMilestones[canalMilestones.length - 1].point;
    if (progress <= 0) return canalMilestones[0].point;
    
    const targetMile = progress * 50;
    
    for (let i = 0; i < canalMilestones.length - 1; i++) {
        const currentMilestone = canalMilestones[i];
        const nextMilestone = canalMilestones[i + 1];
        
        if (targetMile >= currentMilestone.mile && targetMile <= nextMilestone.mile) {
            const segmentProgress = (targetMile - currentMilestone.mile) / 
                (nextMilestone.mile - currentMilestone.mile);
            
            return [
                currentMilestone.point[0] + (nextMilestone.point[0] - currentMilestone.point[0]) * segmentProgress,
                currentMilestone.point[1] + (nextMilestone.point[1] - currentMilestone.point[1]) * segmentProgress
            ];
        }
    }
    return null;
}

// Update stats display
function updateStats(charlesMiles, hughMiles) {
    statsPanel.innerHTML = `
        <h2>Panama Canal Swim Challenge</h2>
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
