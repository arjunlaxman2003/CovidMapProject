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

// Load data and US map simultaneously
Promise.all([
    d3.csv("Data.csv"),
    d3.json("https://d3js.org/us-10m.v1.json")
]).then(([data, us]) => {
    // Create a map from the data with state codes as keys
    const dataMap = new Map(data.map(d => [stateCodeToName[d.State], d]));

    const states = topojson.feature(us, us.objects.states).features;

    // Bind states data to paths
    const statesPaths = svg.selectAll(".state")
        .data(states)
        .enter().append("path")
        .attr("class", "state")
        .attr("d", path)
        .on("mouseover", (event, d) => {
            const stateName = stateCodeToName[d.id];
            const stateData = dataMap.get(stateName);
            tooltip.style("opacity", 1)
                .html(`State: ${stateName}<br>Cases: ${stateData?.Cases}<br>Deaths: ${stateData?.Deaths}<br>Vaccination: ${stateData?.Doses}`)
                .style("left", `${event.pageX + 5}px`)
                .style("top", `${event.pageY - 28}px`);
        })
        .on("mouseout", () => tooltip.style("opacity", 0));

    // Initial color setting
    updateColors("cases");

    // Handle changes in dropdown
    d3.select("#dataSelect").on("change", function() {
        updateColors(this.value);
    });

    function updateColors(view) {
        statesPaths.attr("fill", d => {
            const stateName = stateCodeToName[d.id];
            const data = dataMap.get(stateName);
            if (!data) return "#ccc"; // Fallback color if no data is found
            switch (view) {
                case "cases":
                    return colorScaleCases(data.Cases);
                case "deaths":
                    return colorScaleDeaths(data.Deaths);
                case "vaccinations":
                    return colorScaleVaccinations(data.Doses);
            }
        });
    }
});

function colorScaleCases(value) {
    return d3.scaleSequential(d3.interpolateReds)(Math.min(value / 100000, 1));
}

function colorScaleDeaths(value) {
    return d3.scaleSequential(d3.interpolateBlues)(Math.min(value / 1000, 1));
}

function colorScaleVaccinations(value) {
    return d3.scaleSequential(d3.interpolateGreens)(Math.min(value / 1000000, 1));
}
