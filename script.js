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

document.addEventListener('DOMContentLoaded', function () {
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
    }).catch(error => console.error("Error loading or processing data:", error));
});


// Draw or update the map based on the dataset and time period
function drawMap(us, dataMap, dataType, timePeriod) {
    console.log('Drawing map for:', dataType, timePeriod);
    // Determine the selected year and month
    const year = new Date().getFullYear();
    const month = new Date().getMonth() + 1;
    const currentYear = year.toString();
    const currentMonth = `${month}-${year}`;

    // Ensure dataMap is correctly populated
    if (!dataMap || !Object.keys(dataMap).length) {
        console.error('Data map is empty or undefined:', dataMap);
        return; // Exit if data is not available to prevent further errors
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
        const state = d.State;
        vaccinationByState[state] = parseFloat(d['Percent of total pop with at least one dose']);
    });
    return vaccinationByState;
}

 // Prepare the data values depending on the selected time period
    const dataValues = Object.values(dataMap).flatMap(stateData => {
        const dataForTimePeriod = timePeriod === 'monthly' ? stateData.monthly[currentMonth] : stateData.yearly[currentYear];
        return dataForTimePeriod || 0;
    });

    if (dataValues.length === 0) {
        console.error('No data values available for drawing the map:', dataValues);
        return;
    }

    colorScale.domain([0, d3.max(dataValues)]);
    svg.selectAll("*").remove(); // Clear previous drawings

    svg.append("g")
        .attr("class", "states")
        .selectAll("path")
        .data(topojson.feature(us, us.objects.states).features)
        .enter().append("path")
        .attr("fill", d => {
            const stateName = d.properties.name;
            const stateData = dataMap[stateName];
            if (!stateData) {
                console.warn('No data available for state:', stateName);
                return colorScale(0); // Default to no data color
            }
            const value = timePeriod === 'monthly' ? stateData.monthly[currentMonth] : stateData.yearly[currentYear];
            return colorScale(value || 0);
        })
        .attr("d", path)
        .on("mouseover", (event, d) => {
            const stateName = d.properties.name;
            const stateData = dataMap[stateName];
            const value = stateData ? (timePeriod === 'monthly' ? stateData.monthly[currentMonth] : stateData.yearly[currentYear]) : "No data";
            tooltip.style("visibility", "visible")
                .html(`${stateName}: ${value}`)
                .style("left", (event.pageX + 10) + "px")
                .style("top", (event.pageY - 28) + "px");
        })
        .on("mousemove", event => {
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

