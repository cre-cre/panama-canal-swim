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
        return new Date(2
