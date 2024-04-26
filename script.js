// Define configurations and global variables
const width = 960, height = 600;
const colorScheme = d3.schemeReds[6];
const colorScale = d3.scaleQuantize().range(colorScheme);
const path = d3.geoPath();

// Append SVG to the map container
const svg = d3.select("#map").append("svg")
    .attr("width", width)
    .attr("height", height);

// Define the tooltip
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
]).then(function ([us, confirmed, deaths, population, vaccinations]) {
    // Process and combine data
    const confirmedByState = aggregateByState(confirmed, 'population');
    const deathsByState = aggregateByState(deaths, 'population');
    const vaccinationRates = createVaccinationDataMap(vaccinations);

    // Combine data into a single object
    const dataMap = {};
    us.objects.states.geometries.forEach(geo => {
        let state = geo.properties.name;
        dataMap[state] = {
            cases: confirmedByState[state] || 0,
            deaths: deathsByState[state] || 0,
            vaccinationRate: vaccinationRates[state] || 0
        };
    });

    // Draw initial map with default data type (cases)
    drawMap(us, dataMap, "cases");

    // Set up UI interaction
    document.getElementById('data-select').addEventListener('change', function() {
        drawMap(us, dataMap, this.value);
    });
});

// Aggregate data by state
function aggregateByState(data, fieldName) {
    let aggregation = {};
    data.forEach(d => {
        let state = d.State;
        if (state) {
            if (!aggregation[state]) {
                aggregation[state] = 0;
            }
            aggregation[state] += parseInt(d[fieldName], 10);
        }
    });
    return aggregation;
}

// Create vaccination data map
function createVaccinationDataMap(vaccinationData) {
    let map = {};
    vaccinationData.forEach(d => {
        map[d.Jurisdiction] = parseFloat(d['Percent of total pop with at least one dose']);
    });
    return map;
}

// Draw or update the map based on the dataset
function drawMap(us, dataMap, dataType) {
    // Define color domain based on the type of data
    let dataValues = Object.values(dataMap).map(d => d[dataType]);
    let maxDataValue = d3.max(dataValues);
    colorScale.domain([0, maxDataValue]);

    svg.selectAll("*").remove(); // Clear previous drawings

    const states = svg.append("g")
        .attr("class", "states")
        .selectAll("path")
        .data(topojson.feature(us, us.objects.states).features)
        .enter().append("path")
        .attr("fill", d => {
            let stateData = dataMap[d.properties.name];
            return stateData ? colorScale(stateData[dataType]) : "#ccc";
        })
        .attr("d", path)
        .on("mouseover", (event, d) => {
            tooltip.style("visibility", "visible")
                .html(() => {
                    let stateData = dataMap[d.properties.name];
                    let dataValue = stateData ? stateData[dataType] : "No data";
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
