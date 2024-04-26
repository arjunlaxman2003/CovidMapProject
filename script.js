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
const tooltip = d3.select("body").append("div")
    .attr("id", "tooltip")
    .style("position", "absolute")
    .style("visibility", "hidden")
    .style("padding", "10px")
    .style("background", "white")
    .style("border", "1px solid #ccc")
    .style("border-radius", "5px")
    .style("pointer-events", "none");

// Load geographic and data files
Promise.all([
    d3.json("https://d3js.org/us-10m.v1.json"), // TopoJSON file for US states
    d3.csv("covid_confirmed_usafacts.csv"),
    d3.csv("covid_deaths_usafacts.csv"),
    d3.csv("covid_county_population_usafacts.csv")
]).then(function (files) {
    const us = files[0];
    const cases = aggregateByState(files[1], 'cases');
    const deaths = aggregateByState(files[2], 'deaths');
    const population = aggregateByState(files[3], 'population'); // Assuming population is used directly

    // Combine data into a single object
    const dataMap = {};
    Object.keys(cases).forEach(state => {
        dataMap[state] = {
            cases: cases[state],
            deaths: deaths[state],
            vaccination: population[state]  // Assuming population as a placeholder
        };
    });

    // Draw initial map with default data type (cases)
    drawMap(us, dataMap, "cases");

    // Set up UI interaction
    document.getElementById('data-select').addEventListener('change', function() {
        drawMap(us, dataMap, this.value);
    });
});

// Function to aggregate data by state
function aggregateByState(data, type) {
    return data.reduce((acc, cur) => {
        const state = cur.State;
        acc[state] = acc[state] || 0;
        acc[state] += parseInt(cur[type] || 0);
        return acc;
    }, {});
}

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
            const stateData = dataMap[d.properties.name];
            return stateData ? colorScale(stateData[dataType]) : "#ccc";
        })
        .attr("d", path)
        .on("mouseover", (event, d) => {
            tooltip.style("visibility", "visible")
                .html(() => {
                    const stateData = dataMap[d.properties.name];
                    const dataValue = stateData ? stateData[dataType] : "No data";
                    return `<strong>${d.properties.name}</strong>: ${dataValue}`;
                })
                .style("left", (event.pageX + 10) + "px")
                .style("top", (event.pageY - 28) + "px");
        })
        .on("mousemove", (event) => {
            tooltip.style("left", (event.pageX + 10) + "px")
                .style("top", (event.pageY - 28) + "px");
        })
        .on("mouseout", () => {
            tooltip.style("visibility", "hidden");
        });

    // Optional: Draw state borders
    svg.append("path")
        .attr("class", "state-borders")
        .attr("d", path(topojson.mesh(us, us.objects.states, (a, b) => a !== b)));
}
