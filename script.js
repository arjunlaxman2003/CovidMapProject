const width = 960, height = 600;
const svg = d3.select("#map").append("svg")
    .attr("width", width)
    .attr("height", height);
const tooltip = d3.select("body").append("div").attr("class", "tooltip");

let projection = d3.geoAlbersUsa().scale(1300).translate([width / 2, height / 2]);
let path = d3.geoPath().projection(projection);

// Define dataMap globally
let dataMap = new Map();

// Load data and US map
Promise.all([
    d3.csv("Data.csv"),
    d3.json("https://d3js.org/us-10m.v1.json")
]).then(([data, us]) => {
    // Initialize dataMap with data
    data.forEach(d => dataMap.set(d.State, d));

    const states = topojson.feature(us, us.objects.states).features;

    svg.selectAll(".state")
        .data(states)
        .enter().append("path")
        .attr("class", "state")
        .attr("d", path)
        .attr("fill", d => colorScaleCases(dataMap.get(d.properties.name)?.Cases || 0))  // Default fill on initial load
        .on("mouseover", (event, d) => {
            const stateData = dataMap.get(d.properties.name);
            tooltip.style("opacity", 1)
                .html(`State: ${d.properties.name}<br>Cases: ${stateData?.Cases}<br>Deaths: ${stateData?.Deaths}<br>Vaccination: ${stateData?.Doses}`)
                .style("left", (event.pageX + 5) + "px")
                .style("top", (event.pageY - 28) + "px");
        })
        .on("mouseout", () => tooltip.style("opacity", 0));

    // Update colors based on selection
    d3.select("#dataSelect").on("change", function() {
        updateView(this.value);
    });
});

function updateView(view) {
    svg.selectAll(".state")
        .transition()
        .duration(250)
        .attr("fill", d => {
            const data = dataMap.get(d.properties.name);
            if (!data) return "#ccc";  // Fallback color for missing data
            switch (view) {
                case "cases":
                    return colorScaleCases(data.Cases);
                case "deaths":
                    return colorScaleDeaths(data.Deaths);
                case "vaccinations":
                    return colorScaleVaccinations(data.Doses);
            }
        });
}

// Color scale functions
function colorScaleCases(value) {
    return d3.scaleSequential(d3.interpolateReds)(Math.min(value / 100000, 1));
}

function colorScaleDeaths(value) {
    return d3.scaleSequential(d3.interpolateBlues)(Math.min(value / 1000, 1));
}

function colorScaleVaccinations(value) {
    return d3.scaleSequential(d3.interpolateGreens)(Math.min(value / 1000000, 1));
}
