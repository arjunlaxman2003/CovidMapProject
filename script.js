// Initial configurations
const width = 960, height = 600;
const colorScheme = d3.schemeReds[6];
const colorScale = d3.scaleQuantize().range(colorScheme);
const path = d3.geoPath();

// Append SVG to the map container
var svg = d3.select("svg")
    .attr("width", width)
    .attr("height", height);

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

    // Draw map with default data type (cases)
    drawMap(us, dataMap, "cases");
});

// Draw or update the map based on the dataset
function drawMap(us, dataMap, dataType) {
    const dataValues = Object.values(dataMap).map(d => d[dataType]);
    colorScale.domain([d3.min(dataValues), d3.max(dataValues)]);

    svg.selectAll(".state").remove(); // Clear previous state paths

    svg.selectAll(".state")
        .data(topojson.feature(us, us.objects.states).features)
        .enter().append("path")
        .attr("class", "state")
        .attr("fill", d => {
            const stateCode = d.properties.name;
            const stateData = dataMap[stateCode];
            return stateData ? colorScale(stateData[dataType]) : "#ccc";
        })
        .attr("d", path)
        .on("mouseover", (event, d) => {
            const stateCode = d.properties.name;
            const stateData = dataMap[stateCode];
            const stateName = stateData ? stateData.state : stateCode;
            const dataValue = stateData ? stateData[dataType] : "No data";
            showTooltip(event.pageX, event.pageY, stateName, stateCode, dataValue);
        })
        .on("mousemove", (event) => {
            moveTooltip(event.pageX, event.pageY);
        })
        .on("mouseout", () => {
            hideTooltip();
        });

    // Draw state borders
    svg.append("path")
        .attr("class", "state-borders")
        .datum(topojson.mesh(us, us.objects.states, (a, b) => a !== b))
        .attr("d", path);
}

function showTooltip(x, y, stateName, stateCode, dataValue) {
    d3.select("#tooltip")
        .style("visibility", "visible")
        .html(`<strong>${stateName}</strong> (${stateCode}): ${dataValue}`)
        .style("left", (x + 10) + "px")
        .style("top", (y - 28) + "px");
}

function moveTooltip(x, y) {
    d3.select("#tooltip")
        .style("left", (x + 10) + "px")
        .style("top", (y - 28) + "px");
}

function hideTooltip() {
    d3.select("#tooltip")
        .style("visibility", "hidden");
}
