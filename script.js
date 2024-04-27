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

// Function to sum data by state across all date fields
function sumDataByState(data, dateColumns) {
  const summedData = {};
  data.forEach(row => {
    const state = row.State;
    if (state) { // Make sure there's a state name
      if (!summedData[state]) {
        summedData[state] = 0;
      }
      dateColumns.forEach(date => {
        summedData[state] += parseInt(row[date], 10) || 0;
      });
    }
  });
  return summedData;
}

// Function to get the columns for each date from the dataset
function getDateColumns(data) {
  const dateColumns = data.columns.filter(column => column.match(/\d{1,2}\/\d{1,2}\/\d{2,4}/));
  return dateColumns;
}

// Load geographic and data files
Promise.all([
    d3.json("https://d3js.org/us-10m.v1.json"),
    d3.csv("covid_confirmed_usafacts.csv"),
    d3.csv("covid_deaths_usafacts.csv"),
    d3.csv("covid_county_population_usafacts.csv"),
    d3.csv("covid19_vaccinations_in_the_united_states.csv")
]).then(function ([us, casesData, deathsData, populationData, vaccinationData]) {
    // Sum the case and death data for the latest date available
    const dateColumnsCases = getDateColumns(casesData);
    const dateColumnsDeaths = getDateColumns(deathsData);
    const cases = sumDataByState(casesData, dateColumnsCases);
    const deaths = sumDataByState(deathsData, dateColumnsDeaths);
    
    // Aggregate population and vaccination data by state
    const population = populationData.reduce((acc, cur) => {
        const state = cur.State;
        acc[state] = +cur.population;
        return acc;
    }, {});

    const vaccination = vaccinationData.reduce((acc, cur) => {
        const state = cur.Jurisdiction;
        acc[state] = +cur["Percent of total pop with at least one dose"];
        return acc;
    }, {});

    const dataMap = { cases, deaths, population, vaccination };

    // Draw initial map with default data type (cases)
    drawMap(us, dataMap, "cases");

    // Set up UI interaction for the dropdown
    document.getElementById('data-select').addEventListener('change', function() {
        drawMap(us, dataMap, this.value);
    });
});

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
            const stateName = d.properties.name;
            const dataValue = dataMap[dataType][stateName];
            return dataValue ? colorScale(dataValue) : "#ccc";
        })
        .attr("d", path)
        .on("mouseover", (event, d) => {
            const stateName = d.properties.name;
            const dataValue = dataMap[dataType][stateName];
            tooltip.style("visibility", "visible")
                .html(`${stateName}: ${dataValue ? dataValue : "No data"}`)
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
