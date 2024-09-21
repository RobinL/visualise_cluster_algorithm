class ForceDirectedGraph {
    constructor(selector) {
        this.svg = d3.select(selector).append("svg")
            .attr("width", 800)
            .attr("height", 600);

        this.simulation = d3.forceSimulation()
            .force("link", d3.forceLink().id(d => d.id))
            .force("charge", d3.forceManyBody())
            .force("center", d3.forceCenter(400, 300));
    }

    setData(nodes, links) {
        this.nodes = nodes;

        //
        const nodeById = new Map(nodes.map(d => [d.id, d]));


        this.links = links.map(l => ({
            source: nodeById.get(l.source),
            target: nodeById.get(l.target),
        }));
    }

    render() {

        const clusters = [...new Set(this.nodes.map(d => d.cluster))];
        const color = d3.scaleOrdinal(d3.schemeCategory10)
            .domain(clusters);


        const link = this.svg.append("g")
            .selectAll("line")
            .data(this.links)
            .join("line")
            .attr("stroke", d => {

                return d.source.cluster === d.target.cluster ? color(d.source.cluster) : "#ccc";
            })
            .attr("stroke-opacity", 0.6)
            .attr("stroke-width", d => {

                return d.source.cluster === d.target.cluster ? 2 : 1;
            });


        const node = this.svg.append("g")
            .selectAll("circle")
            .data(this.nodes)
            .join("circle")
            .attr("r", 5)
            .attr("fill", d => color(d.cluster));


        this.simulation
            .nodes(this.nodes)
            .on("tick", () => {
                link
                    .attr("x1", d => d.source.x)
                    .attr("y1", d => d.source.y)
                    .attr("x2", d => d.target.x)
                    .attr("y2", d => d.target.y);

                node
                    .attr("cx", d => d.x)
                    .attr("cy", d => d.y);
            });

        this.simulation.force("link")
            .links(this.links);


        this.simulation.alpha(1).restart();
    }


}

// Usage
const graph = new ForceDirectedGraph("#graph");

const nodes = [
    { id: "A", cluster: "A" },
    { id: "B", cluster: "A" },
    { id: "C", cluster: "A" },
    { id: "D", cluster: "D" },
    { id: "E", cluster: "E" },
    { id: "F", cluster: "G" },
    { id: "G", cluster: "G" },
];

const links = [
    { source: "A", target: "B" },
    { source: "B", target: "C" },
    { source: "C", target: "A" },
    { source: "C", target: "D" },
    { source: "D", target: "E" },
    { source: "E", target: "F" },
    { source: "F", target: "G" },
];

graph.setData(nodes, links);
graph.render();