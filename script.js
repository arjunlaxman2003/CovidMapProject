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
    // Pre-process the data
    const casesByState = processData(confirmedData, 'cases');
    const deathsByState = processData(deathsData, 'deaths');
    const populationByState = processPopulation(populationData);
    const vaccinationByState = processVaccinationData(vaccinationData);

    // Combine data into a single object
    const dataMap = {
        cases: casesByState,
        deaths: deathsByState,
        population: populationByState,
        vaccination: vaccinationByState
    };

    drawMap(us, dataMap, "cases"); // Initial drawing of the map with cases data

    // Set up UI interaction
    document.getElementById('data-select').addEventListener('change', function() {
        drawMap(us, dataMap, this.value);
    });
});

// Process total cases and deaths by state
function processData(data, type) {
    const result = {};
    data.forEach(d => {
        const state = d.State;
        if (state) {
            if (!result[state]) {
                result[state] = 0;
            }
            for (const key in d) {
                if (key.includes('/') && d[key]) {
                    result[state] += parseInt(d[key], 10);
                }
            }
        }
    });
    return result;
}

// Process population data
function processPopulation(data) {
    const populationByState = {};
    data.forEach(d => {
        const state = d.State;
        if (state) {
            populationByState[state] = parseInt(d.population, 10);
        }
    });
    return populationByState;
}

// Process vaccination data
function processVaccinationData(data) {
    const vaccinationByState = {};
    data.forEach(d => {
        const state = d.Jurisdiction;
        if (state) {
            vaccinationByState[state] = parseFloat(d['Percent of total pop with at least one dose']);
        }
    });
    return vaccinationByState;
}

// Draw or update the map based on the dataset
function drawMap(us, dataMap, dataType) {
    const dataValues = Object.values(dataMap[dataType]);
    colorScale.domain([0, d3.max(dataValues)]);

    svg.selectAll("*").remove(); // Clear previous drawings

    svg.append("g")
        .attr("class", "states")
        .selectAll("path")
        .data(topojson.feature(us, us.objects.states).features)
        .enter().append("path")
        .attr("fill", d => {
            // The `name` property below should match the TopoJSON state property
            const stateData = dataMap[dataType][d.properties.name];
            return stateData ? colorScale(stateData) : "#ccc";
        })
        .attr("d", path)
        .on("mouseover", (event, d) => {
            const stateData = dataMap[dataType][d.properties.name];
            tooltip.style("visibility", "visible")
                .html(`${d.properties.name}: ${stateData ? stateData : "No data"}`)
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

    // Draw state borders
    svg.append("path")
        .attr("class", "state-borders")
        .attr("d", path(topojson.mesh(us, us.objects.states, (a, b) => a !== b)));
}
