// Initial configurations
const width = 960, height = 600;
const colorScheme = d3.schemeReds[6]; // Adjust the range if needed for better color gradation
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
    d3.csv("covid_county_population_usafacts.csv"),
    d3.csv("covid19_vaccinations_in_the_united_states.csv")
]).then(function (files) {
    const us = files[0];
    const cases = aggregateByState(files[1]);
    const deaths = aggregateByState(files[2]);
    const population = aggregatePopulation(files[3]);
    const vaccination = aggregateVaccination(files[4]);

    // Combine data into a single object
    const dataMap = {};
    us.objects.states.geometries.forEach(geo => {
        const state = geo.properties.name;
        dataMap[state] = {
            cases: cases[state] || 0,
            deaths: deaths[state] || 0,
            population: population[state] || 0,
            vaccination: vaccination[state] || 0
        };
    });

    // Draw initial map with default data type (cases)
    drawMap(us, dataMap, "cases");

    // Set up UI interaction
    document.getElementById('data-select').addEventListener('change', function() {
        drawMap(us, dataMap, this.value);
    });
});

function aggregateByState(data) {
    const aggregation = {};
    data.forEach(row => {
        const state = row.State;
        // Assume the last column is the most recent total
        const value = parseInt(row[Object.keys(row).pop()], 10) || 0;
        aggregation[state] = (aggregation[state] || 0) + value;
    });
    return aggregation;
}

function aggregatePopulation(data) {
    const aggregation = {};
    data.forEach(row => {
        const state = row.State;
        aggregation[state] = parseInt(row.population, 10) || 0;
    });
    return aggregation;
}

function aggregateVaccination(data) {
    const aggregation = {};
    data.forEach(row => {
        const state = row['Jurisdiction']; // or the field that matches state names
        const value = parseFloat(row['Percent of total pop with at least one dose']) || 0;
        aggregation[state] = value; // Assuming this is already a percentage
    });
    return aggregation;
}

function drawMap(us, dataMap, dataType) {
    const dataValues = Object.values(dataMap).map(d => d[dataType]);
    colorScale.domain([0, d3.max(dataValues)]); // Assume dataType is either cases, deaths, or vaccination rate

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
            const stateData = dataMap[d.properties.name];
            const dataValue = stateData ? stateData[dataType] : "No data";
            tooltip.style("visibility", "visible")
                .html(`<strong>${d.properties.name}</strong><br>${dataType}: ${dataValue}`)
                .style("left", `${event.pageX + 10}px`)
                .style("top", `${event.pageY - 28}px`);
        })
        .on("mousemove", (event) => {
            tooltip.style("left", `${event.pageX + 10}px`)
                .style("top", `${event.pageY - 28}px`);
        })
        .on("mouseout", () => {
            tooltip.style("visibility", "hidden");
        });

    // Draw state borders
    svg.append("path")
        .attr("class", "state-borders")
        .attr("d", path(topojson.mesh(us, us.objects.states, (a, b) => a !== b)));
}
