// State variables
let selectedSortOrder = 'alphabet';
let selectedYear = 0;

export default function barChart() {
    const parseTime = d3.timeParse("%Y");


    // Load the dataset and formatting variables

    d3.csv("data/Video-Game-Sales-Updated-Data.csv", d => {
        return {
            rank: +d.Rank,
            gameName: d.Name,
            platform: d.Platform,
            year: +d.Year,
            genre: d.Genre,
            publisher: d.Publisher,
            nasales: +d.NA_Sales,
            eusales: +d.EU_Sales,
            jpsales: +d.JP_Sales,
            othersales: +d.Other_Sales,
            totalsales: +d.Global_Sales
        }
    }).then(data => {
        const svg = d3.select('#bar')
            .append('svg')
            .attr('width', width + margin.left + margin.right)
            .attr('height', height + margin.top + margin.bottom)
            .append('g')
            .attr('transform', `translate(${margin.left}, ${margin.top})`);

        const yearSliderElement = d3.select('#yearSlider');
        const sortFunctionElement = d3.select('#select-sort-function');
        const yearTextElement = d3.select('#yearText');
        setInputField(yearTextElement);

        createBarChart(data, svg);

        yearSliderElement.on('input', () => {
            selectedYear = yearSliderElement.property('value');
            setInputField(yearTextElement);
            updateChart(data, svg);
        });

        sortFunctionElement.on('input', () => {
            selectedSortOrder = sortFunctionElement.property('value');
            updateChart(data, svg);
        });
    })
}

const getScales = (data, svg) => {
    const xScale = d3.scaleBand()
        .domain(data[0].genreCounts.map(d => d.genre))
        .range([0, width])
        .padding(0.1);
    const yScale = d3.scaleLinear()
        .domain([0, d3.max(data, d => d3.max(d.genreCounts, g => g.count))])
        .range([height, 0]);

    const xAxis = d3.axisBottom(xScale);
    const yAxis = d3.axisLeft(yScale);

    const xLabel = g => g.append("text")
        .attr("x", width / 2)
        .attr("y", margin.bottom - 40)
        .attr("font-weight", "bold")
        .attr("fill", "currentColor")
        .attr("text-anchor", "end")
        .text("Genre →");
    const yLabel = g => g.append("text")
        .attr("x", -margin.left - 190)
        .attr("y", margin.bottom - 100)
        .attr("font-weight", "bold")
        .attr("fill", "currentColor")
        .attr("text-anchor", "start")
        .attr("transform", "rotate(-90)")
        .text("↑ No. of Games in a genre making it to high sales");

    svg.select('.x-axis').remove();
    svg.select('.y-axis').remove();
    
    // Add axes to SVG
    svg.append('g')
        .attr('class', 'x-axis')
        .attr('transform', `translate(0, ${height})`)
        .call(xAxis)
        .call(xLabel);

    svg.append('g')
        .attr('class', 'y-axis')
        .call(yAxis)
        .call(yLabel);
    return { xScale, yScale };
}

const formatData = (data) => {
    const filteredData = selectedYear !== 0 ? data.filter(d => d.year == selectedYear) : data;
    const groupData = d3.rollup(filteredData,
        genrecount => ({count: genrecount.length}),
        y => y.year,
        g => g.genre
    );

    // console.log(groupData);

    const dataArray = Array.from(groupData, ([year, genreData]) => {
        const genreCounts = Array.from(genreData, ([genre, { count }]) => ({ genre, count }));
        return { year, genreCounts };
    });

    dataArray[0].genreCounts = dataArray[0].genreCounts.sort((a, b) => {
        if (selectedSortOrder === 'alphabet') {
            return a.genre.localeCompare(b.genre);
        } else if (selectedSortOrder === 'countAsc') {
            return a.count - b.count;
        } else {
            return b.count - a.count;
        }
    });

    return dataArray;
}

const updateChart = (data, svg) => {
    const filteredData = formatData(data);
    const { xScale, yScale } = getScales(filteredData, svg);

    const bars = svg.selectAll('.genrebar').data(filteredData[0].genreCounts);
    bars.exit().remove();

    // Update bars
    bars.enter()
        .append('rect')
        .attr('class', 'genrebar')
        .attr('x', d => xScale(d.genre))
        .attr('y', yScale(0))
        .attr('width', xScale.bandwidth())
        .attr('height', 0)
        .attr('fill', '#00bfff')
        .attr('stroke', 'white')
        .attr('stroke-width', 2)
        .attr('stroke-opacity', 0.5)
        .style('filter', 'drop-shadow(0 0 5px #fff)')
        .merge(bars)
        .transition()
        .duration(500)
        .attr('x', d => xScale(d.genre))
        .attr('y', d => yScale(d.count))
        .attr('width', xScale.bandwidth())
        .attr('height', d => Math.max(0, height - yScale(d.count)))
        .attr('fill', '#00bfff')
        .attr('stroke', 'white')
        .attr('stroke-width', 2)
        .attr('stroke-opacity', 0.5)
        .style('filter', 'drop-shadow(0 0 5px #fff)')
        .attr('rx', 0)
        .attr('ry', 0)
        .attr('transform', 'none');

}

const createBarChart = (data, svg) => {
    const formattedData = formatData(data);
    const { xScale, yScale } = getScales(formattedData, svg);

    // Creating Bars
    const bars = svg.selectAll('rect')
        .data(formattedData[0].genreCounts)
        .enter()
        .append('rect')
        .attr('class', 'genrebar')
        .attr('x', d => xScale(d.genre))
        .attr('y', d => yScale(d.count))
        .attr('width', xScale.bandwidth())
        .attr('height', d => height - yScale(d.count))
        // .attr('height', d => height-yScale(Number(d[1])))
        .attr('fill', '#00bfff')
        .attr('stroke', 'white')
        .attr('stroke-width', 2)
        .attr('stroke-opacity', 0.5)
        .style('filter', 'drop-shadow(0 0 5px #fff)');
};

const setInputField = (element) => {
    element.attr("value", selectedYear === 0 ? '-' : selectedYear);
}

// Dimensions
const margin = { top: 20, right: 20, bottom: 70, left: 100 };
const width = 800 - margin.left - margin.right;
const height = 400 - margin.top - margin.bottom;