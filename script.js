// app.js
document.addEventListener('DOMContentLoaded', function() {
    const width = 960, height = 600;

    const svg = d3.select("#map").append("svg")
        .attr("width", width)
        .attr("height", height);

    // Define a projection
    const projection = d3.geoAlbersUsa()
        .translate([width / 2, height / 2])
        .scale(1000);

    const path = d3.geoPath()
        .projection(projection);

    // Load data and map
    const promises = [
        d3.json("path_to_us_states_topojson_file.json"),
        d3.csv("Cases_and_Deaths_by_state.csv"),
        d3.csv("vaccinations_by_State.csv")
    ];

    Promise.all(promises).then(function(data) {
        const [us, casesAndDeaths, vaccinations] = data;

        const states = topojson.feature(us, us.objects.states).features;

        // Map case and death data
        const caseDeathData = {};
        casesAndDeaths.forEach(d => {
            caseDeathData[d.State] = { cases: +d.Cases, deaths: +d.Deaths };
        });

        // Map vaccination data
        const vaccinationData = {};
        vaccinations.forEach(d => {
            vaccinationData[d.State] = +d["Total doses distributed"]; // Assuming a column for % fully vaccinated
        });

        // Initial view
        update("cases");

        d3.select("#dataSelect").on("change", function() {
            update(this.value);
        });

        function update(view) {
            const colorScale = d3.scaleSequential();
            if (view === "cases") {
                colorScale.interpolator(d3.interpolateBlues).domain([0, d3.max(Object.values(caseDeathData), d => d.cases)]);
            } else if (view === "deaths") {
                colorScale.interpolator(d3.interpolateReds).domain([0, d3.max(Object.values(caseDeathData), d => d.deaths)]);
            } else {
                colorScale.interpolator(d3.interpolateGreens).domain([0, d3.max(Object.values(vaccinationData))]);
            }

            svg.selectAll(".state")
                .data(states)
                .join("path")
                .attr("class", "state")
                .attr("d", path)
                .attr("fill", function(d) {
                    const data = view === "vaccination" ? vaccinationData[d.properties.name] : caseDeathData[d.properties.name];
                    return data ? colorScale(data[view]) : '#ccc';
                })
                .on("mouseover", function(event, d) {
                    const data = view === "vaccination" ? vaccinationData[d.properties.name] : caseDeathData[d.properties.name];
                    if (data) {
                        showTooltip(event, `${d.properties.name}: ${data[view]}`);
                    }
                })
                .on("mouseout", function() {
                    hideTooltip();
                });
        }

        const tooltip = d3.select("body").append("div")
            .attr("class", "tooltip")
            .style("position", "absolute")
            .style("background", "#fff")
            .style("border", "1px solid #ccc")
            .style("padding", "10px")
            .style("display", "none");

        function showTooltip(event, text) {
            tooltip
                .style("display", "inline-block")
                .style("left", (event.pageX + 10) + "px")
                .style("top", (event.pageY + 10) + "px")
                .html(text);
        }

        function hideTooltip() {
            tooltip.style("display", "none");
        }
    });
});
