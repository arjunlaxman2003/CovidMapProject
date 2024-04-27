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
    const casesByState = processData(confirmedData);
    const deathsByState = processData(deathsData);
    const populationByState = processPopulation(populationData);
    const vaccinationByState = processVaccination(vaccinationData);

    // Combine data into a single object
    const dataMap = {
        cases: casesByState,
        deaths: deathsByState,
        population: populationByState,
        vaccination: vaccinationByState
    };

    drawMap(us, dataMap, "cases"); // Initial drawing of the map with cases data

    // Set up UI interaction for data type
    document.querySelectorAll('input[name="data-type"]').forEach(radio => {
        radio.addEventListener('change', function() {
            drawMap(us, dataMap, this.value);
        });
    });

    // Set up UI interaction for time period
    document.querySelectorAll('input[name="time-period"]').forEach(radio => {
        radio.addEventListener('change', function() {
            drawMap(us, dataMap, document.querySelector('input[name="data-type"]:checked').value);
        });
    });
});

// Process total cases and deaths by state
function processData(data) {
    const totalByState = {};
    data.forEach(d => {
        const state = d.State;
        if (!totalByState[state]) {
            totalByState[state] = 0;
        }
        Object.keys(d).forEach(key => {
            if (key.match(/\d{1,2}\/\d{1,2}\/\d{2}/)) {
                totalByState[state] += parseInt(d[key], 10) || 0;
            }
        });
    });
    return totalByState;
}

// Process population data
function processPopulation(data) {
    const populationByState = {};
    data.forEach(d => {
        const state = d.State;
        populationByState[state] = parseInt(d.population, 10);
    });
    return populationByState;
}

// Process vaccination data
function processVaccination(data) {
    const vaccinationByState = {};
    data.forEach(d => {
        const state = d.Jurisdiction;
        vaccinationByState[state] = parseFloat(d['Percent of total pop with at least one dose']);
    });
    return vaccinationByState;
}

// Draw or update the map based on the dataset
function drawMap(us, dataMap, dataType) {
    // Determine time period selected by the user
    const timePeriod = document.querySelector('input[name="time-period"]:checked').value;
    const dataValues = Object.values(dataMap[dataType]);
    colorScale.domain([0, d3.max(dataValues)]);

    svg.selectAll("*").remove(); // Clear previous drawings

    svg.append("g")
        .attr("class", "states")
        .selectAll("path")
        .data(topojson.feature(us, us.objects.states).features)
        .enter().append("path")
        .attr("fill", d => {
            // Extract state data based on the selected time period
            const stateData = dataMap[dataType][d.properties.name];
            const value = stateData ? (timePeriod === 'monthly' ? stateData.monthly : stateData.yearly) : 0;
            return colorScale(value);
        })
        .attr("d", path)
        .on("mouseover", (event, d) => {
            // Display data in tooltip
            const stateData = dataMap[dataType][d.properties.name];
            const value = stateData ? (timePeriod === 'monthly' ? stateData.monthly : stateData.yearly) : "No data";
            tooltip.style("visibility", "visible")
                .html(`${d.properties.name}: ${value}`)
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
