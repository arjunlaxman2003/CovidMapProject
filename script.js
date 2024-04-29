// Initial configurations
const width = 960, height = 600;
const colorScheme = d3.schemeReds[6];
const colorScale = d3.scaleQuantize().range(colorScheme);
const path = d3.geoPath();

// Append SVG to the map container
const svg = d3.select("#map").append("svg")
    .attr("width", width)
    .attr("height", height);

// Define tooltip
const tooltip = d3.select("#map").append("div")
    .attr("id", "tooltip")
    .style("position", "absolute")
    .style("visibility", "hidden")
    .style("padding", "10px")
    .style("background", "white")
    .style("border", "1px solid #ccc")
    .style("border-radius", "5px")
    .style("pointer-events", "none")
    .style("z-index", "999"); 

// Draw or update the map based on the dataset
function drawMap(us, dataMap, dataType) {
    const dataValues = Object.values(dataMap).map(d => d[dataType]);
    colorScale.domain([d3.min(dataValues), d3.max(dataValues)]);

    svg.selectAll("*").remove(); // Clear previous drawings

    const states = svg.append("g")
        .attr("class", "states")
        .selectAll("path")
        .data(topojson.feature(us, us.objects.states).features)
        .enter().append("path")
        .attr("fill", d => {
            const stateCode = d.properties.name;
            const stateData = dataMap[stateCode];
            return stateData ? colorScale(stateData[dataType]) : "#ccc";
        })
        .attr("d", path)
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

    // Optional: Draw state borders
    svg.append("path")
        .attr("class", "state-borders")
        .attr("d", path(topojson.mesh(us, us.objects.states, (a, b) => a !== b)));
}

function showTooltip(x, y, stateName, stateCode, dataValue) {
    let tooltipHTML = `<strong>${stateName}</strong> (${stateCode}): ${dataValue}`;
    if (stateName && stateCode && dataValue) {
        tooltipHTML = `<strong>${stateName}</strong> (${stateCode}): ${dataValue}`;
    } else {
        tooltipHTML = "No data available";
    }
    tooltip.style("visibility", "visible")
        .html(tooltipHTML)
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

// Load geographic and data files
Promise.all([
    d3.json("https://d3js.org/us-10m.v1.json"), 
    d3.csv("Data.csv")
]).then(function (files) {
    const us = files[0];
    const data = files[1];

    // Aggregate data by state
    const dataMap = {};
    data.forEach(d => {
        dataMap[d.State_Code] = {
            state: d.State,
            cases: +d.Cases,
            deaths: +d.Deaths,
            vaccination: +d.Doses  
        };
    });

    //  initial map with default data  (cases)
    drawMap(us, dataMap, "cases");

    // UI interaction
    document.getElementById('data-select').addEventListener('change', function() {
        drawMap(us, dataMap, this.value);
    });
});
