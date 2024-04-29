// Load geographic and data files
Promise.all([
    d3.json("https://d3js.org/us-10m.v1.json"), 
    d3.csv("Data.csv")
]).then(function (files) {
    const us = files[0];
    const data = files[1];

    // Aggregate data by state
    const dataMap = {};
    data.forEach(d => {
        dataMap[d.State_Code] = {
            state: d.State,
            cases: +d.Cases,
            deaths: +d.Deaths,
            vaccination: +d.Doses  
        };
    });

 
    const states = topojson.feature(us, us.objects.states).features;
    states.forEach(d => {
        const stateCode = d.properties.code; 
        console.log(`State Code from GeoJSON: ${stateCode}, State Data Available: ${!!dataMap[stateCode]}`);
    });

    drawMap(us, dataMap, "cases");

    // Set up UI interaction
    document.getElementById('data-select').addEventListener('change', function() {
        drawMap(us, dataMap, this.value);
    });
});

function drawMap(us, dataMap, dataType) {
    const dataValues = Object.values(dataMap).map(d => d[dataType]);
    colorScale.domain([d3.min(dataValues), d3.max(dataValues)]);

    svg.selectAll("*").remove(); // Clear previous drawings

    const states = topojson.feature(us, us.objects.states).features;
    svg.append("g")
        .attr("class", "states")
        .selectAll("path")
        .data(states)
        .enter().append("path")
        .attr("fill", d => {
            const stateCode = d.properties.code; 
            const stateData = dataMap[stateCode];
            return stateData ? colorScale(stateData[dataType]) : "#ccc";
        })
        .attr("d", path)
        .on("mouseover", (event, d) => {
            const stateCode = d.properties.code;
            const stateData = dataMap[stateCode] || { state: "No data", cases: "No data" };
            tooltip.style("visibility", "visible")
                .html(`<strong>${stateData.state}</strong> (${stateCode}): ${stateData[dataType]}`)
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
