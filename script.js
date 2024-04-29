// State information from JSON
const stateInfo = {
    "AL": "Alabama",
    "AK": "Alaska",
    "AZ": "Arizona",
    "AR": "Arkansas",
    "CA": "California",
    "CO": "Colorado",
    "CT": "Connecticut",
    "DE": "Delaware",
    "DC": "District of Columbia",
    "FL": "Florida",
    "GA": "Georgia",
    "HI": "Hawaii",
    "ID": "Idaho",
    "IL": "Illinois",
    "IN": "Indiana",
    "IA": "Iowa",
    "KS": "Kansas",
    "KY": "Kentucky",
    "LA": "Louisiana",
    "ME": "Maine",
    "MD": "Maryland",
    "MA": "Massachusetts",
    "MI": "Michigan",
    "MN": "Minnesota",
    "MS": "Mississippi",
    "MO": "Missouri",
    "MT": "Montana",
    "NE": "Nebraska",
    "NV": "Nevada",
    "NH": "New Hampshire",
    "NJ": "New Jersey",
    "NM": "New Mexico",
    "NY": "New York",
    "NC": "North Carolina",
    "ND": "North Dakota",
    "OH": "Ohio",
    "OK": "Oklahoma",
    "OR": "Oregon",
    "PA": "Pennsylvania",
    "RI": "Rhode Island",
    "SC": "South Carolina",
    "SD": "South Dakota",
    "TN": "Tennessee",
    "TX": "Texas",
    "UT": "Utah",
    "VT": "Vermont",
    "VA": "Virginia",
    "WA": "Washington",
    "WV": "West Virginia",
    "WI": "Wisconsin",
    "WY": "Wyoming",
    "AS": "American Samoa",
    "GU": "Guam",
    "MP": "Northern Mariana Islands",
    "PR": "Puerto Rico",
    "UM": "U.S. Minor Outlying Islands",
    "VI": "U.S. Virgin Islands"
};


// Initial configurations
const width = 960, height = 600;
const colorScheme = d3.schemeReds[6];
const colorScale = d3.scaleQuantize().range(colorScheme);
const path = d3.geoPath();

// Append SVG to the map container
const svg = d3.select("svg")
    .attr("width", width)
    .attr("height", height);

// Define tooltip
const tooltip = d3.select("body").append("div")
    .attr("id", "tooltip")
    .style("position", "absolute")
    .style("visibility", "hidden")
    .style("padding", "10px")
    .style("background", "white")
    .style("border", "1px solid #ccc")
    .style("border-radius", "5px")
    .style("pointer-events", "none");

// Load geographic data
d3.json("https://d3js.org/us-10m.v1.json").then(function (us) {
    svg.append("g")
        .attr("class", "states")
        .selectAll("path")
        .data(topojson.feature(us, us.objects.states).features)
        .enter().append("path")
        .attr("d", path);

    svg.append("path")
        .attr("class", "state-borders")
        .attr("d", path(topojson.mesh(us, us.objects.states, (a, b) => a !== b)));
});

// Load and process data
d3.csv("Data.csv").then(function (data) {
    // Aggregate data by state
    const dataMap = {};
    data.forEach(d => {
        dataMap[d.State_Code] = {
            state: stateInfo[d.State_Code], // Use state name from stateInfo
            cases: +d.Cases,
            deaths: +d.Deaths,
            vaccination: +d.Doses  
        };
    });

    // Set up UI interaction
    document.getElementById('data-select').addEventListener('change', function() {
        drawMap(dataMap, this.value);
    });
});

// Draw or update the map based on the dataset
function drawMap(dataMap, dataType) {
    const dataValues = Object.values(dataMap).map(d => d[dataType]);
    colorScale.domain([d3.min(dataValues), d3.max(dataValues)]);

    d3.selectAll(".states path")
        .attr("fill", d => {
            const stateCode = d.properties.name;
            const stateData = dataMap[stateCode];
            return stateData ? colorScale(stateData[dataType]) : "#ccc";
        })
        .on("mouseover", (event, d) => {
            const stateCode = d.properties.name;
            const stateData = dataMap[stateCode];
            const dataValue = stateData ? stateData[dataType] : "No data";
            showTooltip(event.pageX, event.pageY, stateData.state || stateCode, stateCode, dataValue);
        })
        .on("mousemove", (event) => {
            moveTooltip(event.pageX, event.pageY);
        })
        .on("mouseout", () => {
            hideTooltip();
        });
}

function showTooltip(x, y, stateName, stateCode, dataValue) {
    tooltip.style("visibility", "visible")
        .html(`<strong>${stateName}</strong> (${stateCode}): ${dataValue}`)
        .style("left", (x + 10) + "px")
        .style("top", (y - 28) + "px");
}

function moveTooltip(x, y) {
    tooltip.style("left", (x + 10) + "px")
        .style("top", (y - 28) + "px");
}

function hideTooltip() {
    tooltip.style("visibility", "hidden");
}
