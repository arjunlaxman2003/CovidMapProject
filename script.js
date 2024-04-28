const width = 960, height = 600;
const svg = d3.select("#map").append("svg")
    .attr("width", width)
    .attr("height", height);
const tooltip = d3.select("body").append("div").attr("class", "tooltip");

let projection = d3.geoAlbersUsa().scale(1300).translate([width / 2, height / 2]);
let path = d3.geoPath().projection(projection);

// Load data and US map
d3.csv("Data.csv").then(data => {
    const dataMap = new Map(data.map(d => [d.State, d]));

    d3.json("https://d3js.org/us-10m.v1.json").then(us => {
        const states = topojson.feature(us, us.objects.states).features;

        svg.selectAll(".state")
            .data(states)
            .enter().append("path")
            .attr("class", "state")
            .attr("d", path)
            .on("mouseover", (event, d) => {
                const stateData = dataMap.get(d.properties.name);
                tooltip.style("opacity", 1)
                    .html(`State: ${d.properties.name}<br>Cases: ${stateData.Cases}<br>Deaths: ${stateData.Deaths}<br>Vaccination: ${stateData.Doses}`)
                    .style("left", (event.pageX + 5) + "px")
                    .style("top", (event.pageY - 28) + "px");
            })
            .on("mouseout", () => tooltip.style("opacity", 0));

        updateView("cases");
    });
});

// Update map colors based on selected view
function updateView(view) {
    svg.selectAll(".state")
        .attr("fill", d => {
            const data = dataMap.get(d.properties.name);
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

d3.select("#dataSelect").on("change", function() {
    updateView(this.value);
});

// Color scales
function colorScaleCases(value) {
    return d3.scaleSequential(d3.interpolateReds)(value / 100000);
}

function colorScaleDeaths(value) {
    return d3.scaleSequential(d3.interpolateBlues)(value / 1000);
}

function colorScaleVaccinations(value) {
    return d3.scaleSequential(d3.interpolateGreens)(value / 1000000);
}
