// Initial configurations
const width = 960, height = 600;
const colorScheme = d3.schemeReds[6];
const colorScale = d3.scaleQuantize().range(colorScheme);
const path = d3.geoPath();

// Adjusted mapping of state codes to names
const stateCodeToName = {
    "AK": "Alaska", "AL": "Alabama", "AR": "Arkansas", "AZ": "Arizona",
    "CA": "California", "CO": "Colorado", "CT": "Connecticut", "DC": "District of Columbia",
    "DE": "Delaware", "FL": "Florida", "GA": "Georgia", "HI": "Hawaii",
    "IA": "Iowa", "ID": "Idaho", "IL": "Illinois", "IN": "Indiana",
    "KS": "Kansas", "KY": "Kentucky", "LA": "Louisiana", "MA": "Massachusetts",
    "MD": "Maryland", "ME": "Maine", "MI": "Michigan", "MN": "Minnesota",
    "MO": "Missouri", "MS": "Mississippi", "MT": "Montana", "NC": "North Carolina",
    "ND": "North Dakota", "NE": "Nebraska", "NH": "New Hampshire", "NJ": "New Jersey",
    "NM": "New Mexico", "NV": "Nevada", "NY": "New York", "OH": "Ohio",
    "OK": "Oklahoma", "OR": "Oregon", "PA": "Pennsylvania", "RI": "Rhode Island",
    "SC": "South Carolina", "SD": "South Dakota", "TN": "Tennessee", "TX": "Texas",
    "UT": "Utah", "VA": "Virginia", "VT": "Vermont", "WA": "Washington",
    "WI": "Wisconsin", "WV": "West Virginia", "WY": "Wyoming"
};

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
    const casesByStateMonthly = processData(confirmedData, 'cases', 'monthly');
    const deathsByStateMonthly = processData(deathsData, 'deaths', 'monthly');
    const casesByStateYearly = processData(confirmedData, 'cases', 'yearly');
    const deathsByStateYearly = processData(deathsData, 'deaths', 'yearly');
    const populationByState = processPopulation(populationData);
    const vaccinationByState = processVaccination(vaccinationData);

    const dataMap = {
        cases: { monthly: casesByStateMonthly, yearly: casesByStateYearly },
        deaths: { monthly: deathsByStateMonthly, yearly: deathsByStateYearly },
        population: populationByState,
        vaccination: vaccinationByState
    };

    drawMap(us, dataMap.cases.monthly, 'cases', 'monthly');

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
function processData(data, type, periodType) {
    const result = {};
    data.forEach(d => {
        const stateCode = d.State;
        const stateName = stateCodeToName[stateCode] || 'Unknown';
        if (!result[stateName]) {
            result[stateName] = { monthly: {}, yearly: {} };
        }
        Object.keys(d).filter(key => key.match(/\d{1,2}\/\d{1,2}\/\d{2}/)).forEach(dateString => {
            const [month, day, year] = dateString.split('/').map(Number);
            const fullYear = year < 50 ? 2000 + year : 1900 + year;
            const monthYearKey = `${month}-${fullYear}`;
            const yearKey = fullYear.toString();

            result[stateName][periodType][monthYearKey] = result[stateName][periodType][monthYearKey] || 0;
            result[stateName][periodType][yearKey] = result[stateName][periodType][yearKey] || 0;

            result[stateName][periodType][monthYearKey] += parseInt(d[dateString], 10) || 0;
            result[stateName][periodType][yearKey] += parseInt(d[dateString], 10) || 0;
        });
    });
    console.log('Processed data:', result);
    return result;
}

function processPopulation(data) {
    const populationByState = {};
    data.forEach(d => {
        const stateCode = d.State;
        const stateName = stateCodeToName[stateCode];
        populationByState[stateName] = parseInt(d.population, 10);
    });
    return populationByState;
}

function processVaccination(data) {
    const vaccinationByState = {};
    data.forEach(d => {
        const stateCode = d.State;
        const stateName = stateCodeToName[stateCode];
        vaccinationByState[stateName] = {
            atLeastOneDose: parseFloat(d['Percent of total pop with at least one dose']),
            completedPrimarySeries: parseFloat(d['Percent of total pop with a completed primary series'])
        };
    });
    return vaccinationByState;
}

function drawMap(us, dataMap, dataType, timePeriod) {
    // Check if the necessary data is available
    if (!dataMap || !dataMap[dataType] || !dataMap[dataType][timePeriod]) {
        console.error('Data map or type is undefined or does not contain the expected data:', dataMap, dataType, timePeriod);
        console.log("Checking dataMap access:", dataMap[dataType][timePeriod]);
        return; // Exit if data is not structured as expected
    }

    console.log("Data available for drawing:", dataMap[dataType][timePeriod]);

    // Other initializations and setting up scales
    const year = new Date().getFullYear();
    const month = new Date().getMonth() + 1;
    const currentMonth = `${month}-${year}`;

    let dataValues = Object.values(dataMap[dataType][timePeriod]).flatMap(stateData => Object.values(stateData));
    if (dataValues.length > 0) {
        colorScale.domain([0, d3.max(dataValues)]);
    } else {
        console.error('No data values available for color scaling.');
        return;
    }

    // Clear previous SVG elements
    svg.selectAll("*").remove();

    // Draw new map features
    svg.append("g")
        .attr("class", "states")
        .selectAll("path")
        .data(topojson.feature(us, us.objects.states).features)
        .enter().append("path")
        .attr("fill", d => {
            const stateId = d.id; // Ensure this ID matches keys in dataMap
            const stateName = stateCodeToName[stateId]; // Map ID to State Name if needed
            const value = dataMap[dataType][timePeriod][stateName]?.[currentMonth] || 0;
            return colorScale(value);
        })
        .attr("d", path)
        .on("mouseover", (event, d) => {
            const stateId = d.id;
            const stateName = stateCodeToName[stateId];
            const value = dataMap[dataType][timePeriod][stateName]?.[currentMonth] || "No data";
            tooltip.style("visibility", "visible")
                .html(`${stateName}: ${value}`)
                .style("left", `${event.pageX + 10}px`)
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
