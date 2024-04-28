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
    // Initialize data maps for monthly and yearly cases/deaths
    const casesByStateMonthly = processData(confirmedData, 'cases', 'monthly');
    const deathsByStateMonthly = processData(deathsData, 'deaths', 'monthly');
    const casesByStateYearly = processData(confirmedData, 'cases', 'yearly');
    const deathsByStateYearly = processData(deathsData, 'deaths', 'yearly');
    const populationByState = processPopulation(populationData);
    const vaccinationByState = processVaccination(vaccinationData);

    // Combine data into a single object
    const dataMap = {
        cases: { monthly: casesByStateMonthly, yearly: casesByStateYearly },
        deaths: { monthly: deathsByStateMonthly, yearly: deathsByStateYearly },
        population: populationByState,
        vaccination: vaccinationByState
    };

    // Initialize the map with the default view (monthly cases)
    drawMap(us, dataMap.cases.monthly, 'cases', 'monthly');

    // Event listeners for radio buttons
    document.querySelectorAll('input[name="data-type"]').forEach(radio => {
        radio.addEventListener('change', function() {
            const timePeriod = document.querySelector('input[name="time-period"]:checked').value;
            drawMap(us, dataMap[this.value][timePeriod], this.value, timePeriod);
        });
    });

    document.querySelectorAll('input[name="time-period"]').forEach(radio => {
        radio.addEventListener('change', function() {
            const dataType = document.querySelector('input[name="data-type"]:checked').value;
            drawMap(us, dataMap[dataType][this.value], dataType, this.value);
        });
    });
});

// Process total cases and deaths by state and time period
function processData(data, type) {
    const result = {};
    data.forEach(d => {
        const state = d.State;
        if (!result[state]) {
            result[state] = { monthly: {}, yearly: {} };
        }
        Object.keys(d).forEach(dateString => {
            if (dateString.match(/\d{1,2}\/\d{1,2}\/\d{2}/)) {
                const [month, day, year] = dateString.split('/').map(Number);
                const fullYear = year < 50 ? 2000 + year : 1900 + year; // Adjust based on century
                const monthYearKey = `${month}-${fullYear}`;
                const yearKey = fullYear.toString();

                // Ensure the sub-objects exist
                result[state].monthly[monthYearKey] = result[state].monthly[monthYearKey] || 0;
                result[state].yearly[yearKey] = result[state].yearly[yearKey] || 0;

                // Sum up the data
                result[state].monthly[monthYearKey] += parseInt(d[dateString], 10) || 0;
                result[state].yearly[yearKey] += parseInt(d[dateString], 10) || 0;
            }
        });
    });
    return result;
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

function drawMap(us, dataMap, dataType, timePeriod) {
    const year = new Date().getFullYear();
    const month = new Date().getMonth() + 1;
    const currentYear = year.toString();
    const currentMonth = `${month}-${year}`;

    const dataValues = Object.values(dataMap[dataType]).flatMap(stateData => {
        const value = stateData ? (timePeriod === 'monthly' ? (stateData.monthly[currentMonth] || 0) : (stateData.yearly[currentYear] || 0)) : 0;
        return value;
    });

    colorScale.domain([0, d3.max(dataValues)]);
    svg.selectAll("*").remove(); // Clear previous drawings

    svg.append("g")
        .attr("class", "states")
        .selectAll("path")
        .data(topojson.feature(us, us.objects.states).features)
        .enter().append("path")
        .attr("fill", d => {
            // Correctly accessing state data and handling undefined cases
            const stateData = dataMap[dataType][d.properties.name];
            const value = stateData ? (timePeriod === 'monthly' ? (stateData.monthly[currentMonth] || 0) : (stateData.yearly[currentYear] || 0)) : 0;
            return colorScale(value);
        })
        .attr("d", path)
        .on("mouseover", (event, d) => {
            // Handle tooltip information safely
            const stateData = dataMap[dataType][d.properties.name];
            const value = stateData ? (timePeriod === 'monthly' ? (stateData.monthly[currentMonth] || "No data") : (stateData.yearly[currentYear] || "No data")) : "No data";
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

