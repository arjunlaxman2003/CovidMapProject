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
    d3.json("https://d3js.org/us-10m.v1.json"),
    d3.csv("covid_confirmed_usafacts.csv"),
    d3.csv("covid_deaths_usafacts.csv"),
    d3.csv("covid_county_population_usafacts.csv"),
    d3.csv("covid19_vaccinations_in_the_united_states.csv")
]).then(function ([us, confirmedData, deathsData, populationData, vaccinationData]) {
    // Process and combine data
    const casesByState = processData(confirmedData, 'State', 'cases');
    const deathsByState = processData(deathsData, 'State', 'deaths');
    const populationByState = processPopulation(populationData);
    const vaccinationByState = processVaccination(vaccinationData);

    // Combine data into a single object for easy access
    const dataMap = { casesByState, deathsByState, populationByState, vaccinationByState };

    // Initialize the map with the default view (cases)
    drawMap(us, dataMap.casesByState, 'cases');

    // Setup event listeners for UI controls (if any)
});

// Data processing functions
function processData(data, stateField, dataType) {
    const result = {};
    data.forEach(d => {
        const state = d[stateField];
        if (!result[state]) {
            result[state] = {};
        }
        Object.keys(d).forEach(date => {
            if (date.match(/\d{1,2}\/\d{1,2}\/\d{2}/)) {  // Only process date fields
                result[state][date] = parseInt(d[date], 10) || 0;
            }
        });
    });
    return result;
}

function processPopulation(data) {
    const result = {};
    data.forEach(d => {
        result[d.State] = parseInt(d.population, 10);
    });
    return result;
}

function processVaccination(data) {
    const result = {};
    data.forEach(d => {
        result[d.State] = {
            percentVaccinated: parseFloat(d['Percent of total pop with at least one dose'])
        };
    });
    return result;
}

// Map drawing function
function drawMap(us, dataMap, dataType) {
    // Set domain for color scale based on data type
    const values = Object.values(dataMap).flatMap(stateData => Object.values(stateData));
    colorScale.domain([0, d3.max(values)]);

    // Clear previous SVG elements
    svg.selectAll("*").remove();

    // Draw states with color based on data
    svg.append("g")
        .attr("class", "states")
        .selectAll("path")
        .data(topojson.feature(us, us.objects.states).features)
        .enter().append("path")
        .attr("fill", d => {
            const stateData = dataMap[d.properties.name];
            const value = stateData ? stateData[Object.keys(stateData).pop()] : 0;  // Get the most recent value
            return colorScale(value);
        })
        .attr("d", path)
        .on("mouseover", (event, d) => {
            tooltip.style("visibility", "visible")
                   .html(`${d.properties.name}: ${dataMap[d.properties.name][Object.keys(dataMap[d.properties.name]).pop()]}`)
                   .style("left", `${event.pageX + 10}px`)
                   .style("top", `${event.pageY - 28}px`);
        })
        .on("mouseout", () => tooltip.style("visibility", "hidden"));

    // Draw state borders
    svg.append("path")
        .datum(topojson.mesh(us, us.objects.states, (a, b) => a !== b))
        .attr("class", "state-borders")
        .attr("d", path);
}
