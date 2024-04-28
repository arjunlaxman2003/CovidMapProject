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
                colorScale.interpolator(d3.interpolateBlues);
            } else if (view === "deaths") {
                colorScale.interpolator(d3.interpolateReds);
            } else {
                colorScale.interpolator(d3.interpolateGreens);
            }

            svg.selectAll(".state")
                .data(states)
                .join("path")
                .attr("class", "state")
                .attr("d", path)
                .attr("fill", function(d) {
                    const data = caseDeathData[d.properties.name] || vaccinationData[d.properties.name];
                    return colorScale(data[view]);
                })
                .on("mouseover", function(event, d) {
                    // Tooltip logic here
                    console.log(`${d.properties.name}: ${caseDeathData[d.properties.name][view]}`);
                });
        }
    });
});
