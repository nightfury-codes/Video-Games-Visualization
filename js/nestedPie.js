const majorPlaforms = ['PS2', 'X360', 'PS3', 'Wii', 'DS', 'PS', 'GBA', 'PSP', 'PS4', 'PC'];
const minorGenres = ['Puzzle', 'Strategy', 'Adventure']

export default function barChart() {
    d3.csv("data/Video-Game-Sales-Updated-Data.csv", d => {
        return {
            rank: +d.Rank,
            gameName: d.Name,
            platform: majorPlaforms.includes(d.Platform) ? d.Platform : 'Others',
            year: +d.Year,
            genre: !minorGenres.includes(d.Genre) ? d.Genre : 'Others',
            publisher: d.Publisher,
            nasales: +d.NA_Sales,
            eusales: +d.EU_Sales,
            jpsales: +d.JP_Sales,
            othersales: +d.Other_Sales,
            totalsales: +d.Global_Sales
        }
    }).then(data => {
        createNode(data);
    })
}

const createNode = (data) => {
    const root = partition(data);
    root.each(d => d.current = d);

    const svg = d3.select('#pie').append("svg")
        .attr("viewBox", [0, 0, width, width])
        .style("font", "10px sans-serif");

    const g = svg.append("g")
        .attr("transform", `translate(${width / 2},${width / 2})`);

    const path = g.append("g")
        .selectAll("path")
        .data(root.descendants().slice(1))
        .join("path")
        .attr("fill", d => {
            while (d.depth > 1) {
                d = d.parent;
                return color(d.data[0]);
            }
        })
        .attr("fill-opacity", d => arcVisible(d.current) ? (d.children ? 0.6 : 0.4) : 0)
        .attr("pointer-events", d => arcVisible(d.current) ? "auto" : "none")

        .attr("d", d => arc(d.current));

    path.filter(d => d.children)
        .style("cursor", "pointer")
        .on("click", clicked);

    path.append("title")
        .text(d => `${d.ancestors().map(d => d.data[0]).reverse().join("/")}\n${format(d.value)}`);

    const label = g.append("g")
        .attr("pointer-events", "none")
        .attr("text-anchor", "middle")
        .style("user-select", "none")
        .selectAll("text")
        .data(root.descendants().slice(1))
        .join("text")
        .attr("dy", "0.35em")
        .attr("fill-opacity", d => +labelVisible(d.current))
        .attr("transform", d => labelTransform(d.current))
        .text(d => d.data[0]);

    const parent = g.append("circle")
        .datum(root)
        .attr("r", radius)
        .attr("fill", "none")
        .attr("pointer-events", "all")
        .on("click", clicked);

    function clicked(event, p) {
        parent.datum(p.parent || root);

        root.each(d => d.target = {
            x0: Math.max(0, Math.min(1, (d.x0 - p.x0) / (p.x1 - p.x0))) * 2 * Math.PI,
            x1: Math.max(0, Math.min(1, (d.x1 - p.x0) / (p.x1 - p.x0))) * 2 * Math.PI,
            y0: Math.max(0, d.y0 - p.depth),
            y1: Math.max(0, d.y1 - p.depth)
        });

        const t = g.transition().duration(750);

        // Transition the data on all arcs, even the ones that aren’t visible,
        // so that if this transition is interrupted, entering arcs will start
        // the next transition from the desired position.
        path.transition(t)
            .tween("data", d => {
                const i = d3.interpolate(d.current, d.target);
                return t => d.current = i(t);
            })
            .filter(function (d) {
                return +this.getAttribute("fill-opacity") || arcVisible(d.target);
            })
            .attr("fill-opacity", d => arcVisible(d.target) ? (d.children ? 0.6 : 0.4) : 0)
            .attr("pointer-events", d => arcVisible(d.target) ? "auto" : "none")

            .attrTween("d", d => () => arc(d.current));

        label.filter(function (d) {
            return +this.getAttribute("fill-opacity") || labelVisible(d.target);
        }).transition(t)
            .attr("fill-opacity", d => +labelVisible(d.target))
            .attrTween("transform", d => () => labelTransform(d.current));
    }

    function arcVisible(d) {
        return d.y1 <= 3 && d.y0 >= 1 && d.x1 > d.x0;
    }

    function labelVisible(d) {
        return d.y1 <= 3 && d.y0 >= 1 && (d.y1 - d.y0) * (d.x1 - d.x0) > 0.03;
    }

    function labelTransform(d) {
        const x = (d.x0 + d.x1) / 2 * 180 / Math.PI;
        const y = (d.y0 + d.y1) / 2 * radius;
        return `rotate(${x - 90}) translate(${y},0) rotate(${x < 180 ? 0 : 180})`;
    }

    return svg.node();
};

const margin = { top: 20, right: 20, bottom: 70, left: 40 };
const width = 800 - margin.left - margin.right;
const radius = width / 6;

const arc = d3.arc()
    .startAngle(d => d.x0)
    .endAngle(d => d.x1)
    .padAngle(d => Math.min((d.x1 - d.x0) / 2, 0.005))
    .padRadius(radius * 1.5)
    .innerRadius(d => d.y0 * radius)
    .outerRadius(d => Math.max(d.y0 * radius, d.y1 * radius - 1));

const makeHierarchy = (config) => {
    const defaultConfig = {
        childrenAccessorFn: ([key, value]) => value.size && Array.from(value),
        sumFn: ([key, value]) => value,
        sortFn: (a, b) => b.value - a.value,
    };
    const { data, reduceFn, groupByFns, childrenAccessorFn, sumFn, sortFn } = { ...defaultConfig, ...config };
    const rollupData = d3.rollup(data, reduceFn, ...groupByFns);
    const hierarchyData = d3.hierarchy([null, rollupData], childrenAccessorFn)
        .sum(sumFn)
        .sort(sortFn);
    return hierarchyData;
}

const partition = data => {
    const root = makeHierarchy({
        data,
        groupByFns: [d => d.genre, d => d.platform, d => d.publisher],
        reduceFn: v => d3.fsum(v, d => d.totalsales)
    });
    return d3.partition()
        .size([2 * Math.PI, root.height + 1])
        (root);
}

const format = (value) => d3.format(".2f")(value);
// const color = (name) => d3.scaleOrdinal(d3.quantize(d3.interpolateRainbow, name));
const color = d3.scaleOrdinal(d3.schemeSet3);
