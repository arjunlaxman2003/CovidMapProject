// Dimensions and SVG setup
const width = 960, height = 600;
const svg = d3.select("#map").append("svg")
    .attr("width", width)
    .attr("height", height);
const tooltip = d3.select("body").append("div")
    .attr("class", "tooltip")
    .style("opacity", 0);

let projection = d3.geoAlbersUsa().scale(1300).translate([width / 2, height / 2]);
let path = d3.geoPath().projection(projection);

// State codes to names mapping
const stateCodeToName = {
    "AK": "Alaska", "AL": "Alabama", "AR": "Arkansas", "AZ": "Arizona",
    "CA": "California", "CO": "Colorado", "CT": "Connecticut", "DC": "District of Columbia",
    "DE": "Delaware", "FL": "Florida", "GA": "Georgia", "HI": "Hawaii",
    "IA": "Iowa", "ID": "Idaho", "IL": "Illinois", "IN": "Indiana",
    "KS": "Kansas", "KY": "Kentucky", "LA": "Louisiana", "MA": "Massachusetts",
    "MD": "Maryland", "ME": "Maine", "MI": "Michigan", "MN": "Minnesota",
    "MO": "Missouri", "MS": "Mississippi", "MT": "Montana", "NC": "North Carolina",
    "ND": "North Dakota", "NE": "Nebraska", "NH": "New Hampshire", "NJ": "New Jersey",
    "NM": "New Mexico", "NV": "Nevada", "NY": "New York", "OH": "Ohio",
    "OK": "Oklahoma", "OR": "Oregon", "PA": "Pennsylvania", "RI": "Rhode Island",
    "SC": "South Carolina", "SD": "South Dakota", "TN": "Tennessee", "TX": "Texas",
    "UT": "Utah", "VA": "Virginia", "VT": "Vermont", "WA": "Washington",
    "WI": "Wisconsin", "WV": "West Virginia", "WY": "Wyoming"
};

// Load data and map simultaneously
Promise.all([
    d3.csv("Data.csv"),
    d3.json("https://d3js.org/us-10m.v1.json")
]).then(([data, us]) => {
    // Mapping of data to state names using state codes
    const dataMap = new Map(data.map(d => [stateCodeToName[d.State], d]));

    const states = topojson.feature(us, us.objects.states).features;

    // Draw each state and add interactive features
    const statesPaths = svg.selectAll(".state")
        .data(states)
        .enter().append("path")
        .attr("class", "state")
        .attr("d", path)
        .attr("fill", d => colorScaleCases(dataMap.get(stateCodeToName[d.id])?.Cases || 0))
        .on("mouseover", (event, d) => {
            const stateData = dataMap.get(stateCodeToName[d.id]);
            tooltip.style("opacity", 1)
                .html(`State: ${stateCodeToName[d.id]}
