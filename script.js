async function drawChart() {
  // Read data
  const dataset = await d3.json("./Data/my_weather_data.json");
  console.table(dataset[0]);

  // Create dimensions
  const width = 600;
  let dimensions = {
    width: width,
    height: width * 0.6,
    margin: {
      top: 30,
      right: 10,
      bottom: 50,
      left: 50,
    },
  };

  dimensions.boundedWidth =
    dimensions.width - dimensions.margin.left - dimensions.margin.right;
  dimensions.boundedHeight =
    dimensions.height - dimensions.margin.top - dimensions.margin.bottom;

  // Draw canvas and inner wrapper
  const wrapper = d3
    .select("#wrapper")
    .append("svg")
    .attr("width", dimensions.width)
    .attr("height", dimensions.height);

  const boundingBox = wrapper
    .append("g")
    .attr("id", "boundingBox")
    .style(
      "transform",
      `translate(${dimensions.margin.left}px, ${dimensions.margin.top}px)`
    );

  boundingBox.append("g").attr("class", "barsGroup");
  boundingBox.append("line").attr("class", "line");
  boundingBox.append("text").attr("class", "meanLineText");
  boundingBox
    .append("g")
    .attr("class", "x-axis")
    .style("transform", `translateY(${dimensions.boundedHeight}px)`)
    .append("text")
    .attr("class", "x-axis-label")
    .attr("x", dimensions.boundedWidth / 2)   // x-akselin otsikko valmiiksi paikalla
    .attr("y", dimensions.margin.bottom - 10); // 

  // Määritellään metrics ja metricIndex ennen drawHistogram-kutsua
  const metrics = [
    "humidity",
    "dewPoint",
    "temperatureHigh",
    "temperatureLow",
    "pressure",
    "windSpeed",
    "windGust",
    "cloudCover",
    "uvIndex",
  ];

  let metricIndex = 0;

  // SUBFUNCTION
  const drawHistogram = (metric) => {
    const metricAccessor = (d) => d[metric];
    const yAccessor = (d) => d.length;

    const xScale = d3
      .scaleLinear()
      .domain(d3.extent(dataset, metricAccessor))
      .range([0, dimensions.boundedWidth])
      .nice();

    const groupGenerator = d3
      .histogram()
      .domain(xScale.domain())
      .value(metricAccessor)
      .thresholds(11);

    const groups = groupGenerator(dataset);
    const yScale = d3
      .scaleLinear()
      .domain([0, d3.max(groups, yAccessor)])
      .range([dimensions.boundedHeight, 0])
      .nice();

    const barPadding = 4;

    let barGroups = boundingBox
      .select(".barsGroup")
      .selectAll(".barGroup")
      .data(groups);

    barGroups.exit().remove();

    const newBarGroups = barGroups
      .enter()
      .append("g")
      .attr("class", "barGroup");

    newBarGroups.append("rect");
    newBarGroups.append("text");

    barGroups = newBarGroups.merge(barGroups);

    const rects = barGroups
      .select("rect")
      .attr("x", (d) => xScale(d.x0) + barPadding / 2)
      .attr("y", (d) => yScale(yAccessor(d)))
      .attr("width", (d) =>
        d3.max([0, xScale(d.x1) - xScale(d.x0) - barPadding])
      )
      .attr("height", (d) => dimensions.boundedHeight - yScale(yAccessor(d)))
      .attr("fill", "lightblue");

    const barText = barGroups
      .select("text")
      .attr("x", (d) => xScale(d.x0) + (xScale(d.x1) - xScale(d.x0)) / 2)
      .attr("y", (d) => yScale(yAccessor(d)) - 5)
      .text(yAccessor)
      .attr("fill", "blue")
      .style("font-size", "12px")
      .style("font-family", "arial")
      .style("text-anchor", "middle");

    const mean = d3.mean(dataset, metricAccessor);

const line = boundingBox
  .select(".line")
  .attr("x1", xScale(mean) || 0) // oletussijanti ennen transitiota
  .attr("x2", xScale(mean) || 0) // oletussijanti ennen transitiota
  .transition() // Lisätty transitio 
  .duration(1000) // Kesto 1 sekunti
  .attr("x1", xScale(mean))
  .attr("x2", xScale(mean))
  .attr("y1", -10)
  .attr("y2", dimensions.boundedHeight)
  .attr("stroke", "black")
  .attr("stroke-width", 2)
  .style("stroke-dasharray", "2px 2px");

const meanLineText = boundingBox
  .select(".meanLineText")
  .attr("x", xScale(mean) || 0) // *** UUSI: Asetetaan oletussyvyydeksi -15, jotta teksti on viivan yläpuolella alusta alkaen ***
  .attr("y", -15)
  .transition() // *** UUSI: Kesto 1 sekunti ***
  .duration(1000) // *** UUSI: Asetetaan lopullinen sijainti transitiolla ***
  .attr("x", xScale(mean))
  .attr("y", -15)
  .text("mean " + mean.toFixed(2))
  .style("font-size", "12px")
  .style("font-family", "arial")
  .style("text-anchor", "middle");


    const xAxisGenerator = d3.axisBottom().scale(xScale);
    const xAxis = boundingBox.select(".x-axis").call(xAxisGenerator);
    const xAxisLabel = xAxis
      .select(".x-axis-label")
      .attr("x", dimensions.boundedWidth / 2)
      .attr("y", dimensions.margin.bottom - 10)
      .attr("fill", "black")
      .text(metric)
      .style("font-size", "14px")
      .style("text-transform", "capitalize");

    // INTERACTIONS — siirretty drawHistogram-funktion sisälle,
    // jotta xScale, yScale ja metric ovat käytettävissä
    const tooltip = d3.select("#tooltip");

    barGroups
      .select("rect")
      .on("mouseenter", onMouseEnter)
      .on("mouseleave", onMouseLeave);

    function onMouseEnter(event, d) {
      tooltip.style("opacity", 1);

      
      tooltip.select("#range")
        .text(`${formatter(d.x0)} - ${formatter(d.x1)}`);

      tooltip.select("#count")
        .text(yAccessor(d));

      const tooltipX =
        xScale(d.x0) + (xScale(d.x1) - xScale(d.x0)) / 2 +
        dimensions.margin.left;
      const tooltipY = yScale(yAccessor(d)) + dimensions.margin.top;

      
      tooltip.style(
        "transform",
        `translate(calc(-50% + ${tooltipX}px), ${tooltipY}px)`
      );
    }

    function onMouseLeave(evt, d) {
      tooltip.style("opacity", 0);
    }
  }; // drawHistogram sulkeutuu tässä

  const formatter = d3.format(".2f");

  // Button-logiikka siirretty drawHistogram-funktion ulkopuolelle
  // mutta drawChart-funktion sisälle
  const button = d3.select("#button");
  button.node().addEventListener("click", clickHandler, false);

  function clickHandler() {
    metricIndex++;
    if (metricIndex < metrics.length) {
      drawHistogram(metrics[metricIndex]);
    } else {
      metricIndex = 0;
      drawHistogram(metrics[metricIndex]);
    }
  }

  drawHistogram(metrics[metricIndex]);

} 

drawChart();