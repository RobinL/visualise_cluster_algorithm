class ForceDirectedGraph {
    constructor(selector) {
        this.svg = d3.select(selector).append("svg")
            .attr("width", 800)
            .attr("height", 600);

        this.simulation = d3.forceSimulation()
            .force("link", d3.forceLink().id(d => d.id))
            .force("charge", d3.forceManyBody())
            .force("center", d3.forceCenter(400, 300));

        this.currentIteration = 0; // Initialize current iteration
    }

    // Set the links (edges) data
    setData(links) {
        this.linksData = links; // Store links separately
    }

    // Set the nodes at each iteration
    setIterations(nodes_at_iterations) {
        this.nodes_at_iterations = nodes_at_iterations;
    }

    render() {
        // Use the nodes from the current iteration
        this.nodes = this.nodes_at_iterations[this.currentIteration];

        // Create a map from node IDs to node objects
        const nodeById = new Map(this.nodes.map(d => [d.id, d]));

        // Replace source and target IDs with node objects
        this.links = this.linksData.map(l => ({
            source: nodeById.get(l.source),
            target: nodeById.get(l.target),
        }));

        // Create a color scale for clusters
        this.updateColorScale();

        // Draw and style the links (edges)
        this.link = this.svg.append("g")
            .selectAll("line")
            .data(this.links)
            .join("line")
            .attr("stroke", d => {
                return d.source.cluster === d.target.cluster ? this.color(d.source.cluster) : "#ccc";
            })
            .attr("stroke-opacity", 0.6)
            .attr("stroke-width", d => {
                return d.source.cluster === d.target.cluster ? 2 : 1;
            });

        // Draw and style the nodes
        this.node = this.svg.append("g")
            .selectAll("circle")
            .data(this.nodes)
            .join("circle")
            .attr("r", 5)
            .attr("fill", d => this.color(d.cluster));

        // Set up the simulation
        this.simulation
            .nodes(this.nodes)
            .on("tick", () => {
                this.link
                    .attr("x1", d => d.source.x)
                    .attr("y1", d => d.source.y)
                    .attr("x2", d => d.target.x)
                    .attr("y2", d => d.target.y);

                this.node
                    .attr("cx", d => d.x)
                    .attr("cy", d => d.y);
            });

        this.simulation.force("link")
            .links(this.links);

        // Run the simulation and fix node positions after it settles
        this.simulation.alpha(1).restart();

        this.simulation.on('end', () => {
            // Fix the positions to prevent re-layout
            this.nodes.forEach(d => {
                d.fx = d.x;
                d.fy = d.y;
            });
        });
    }

    // Update the color scale based on current clusters
    updateColorScale() {
        const clusters = [...new Set(this.nodes.map(d => d.cluster))];
        this.color = d3.scaleOrdinal(d3.schemeCategory10)
            .domain(clusters);
    }

    // Update clusters and recolor nodes and edges
    updateClusters() {
        // Update the nodes with the clusters from the current iteration
        const currentNodes = this.nodes_at_iterations[this.currentIteration];

        // Update cluster assignments in nodes
        this.nodes.forEach(node => {
            const currentNode = currentNodes.find(n => n.id === node.id);
            node.cluster = currentNode.cluster;
        });

        // Update the color scale
        this.updateColorScale();

        // Update node colors
        this.node
            .attr("fill", d => this.color(d.cluster));

        // Update link styles
        this.link
            .attr("stroke", d => {
                return d.source.cluster === d.target.cluster ? this.color(d.source.cluster) : "#ccc";
            })
            .attr("stroke-width", d => {
                return d.source.cluster === d.target.cluster ? 2 : 1;
            });
    }

    // Move to the next iteration
    nextStep() {
        if (this.currentIteration < this.nodes_at_iterations.length - 1) {
            this.currentIteration++;
            this.updateClusters();
        }
    }

    // Move to the previous iteration
    prevStep() {
        if (this.currentIteration > 0) {
            this.currentIteration--;
            this.updateClusters();
        }
    }
}

// Usage
const graph = new ForceDirectedGraph("#graph");

// Nodes at each iteration
const nodes_at_iterations = [
    [
        { id: "A", cluster: "A" },
        { id: "B", cluster: "B" },
        { id: "C", cluster: "C" },
        { id: "D", cluster: "D" },
        { id: "E", cluster: "E" },
        { id: "F", cluster: "F" },
        { id: "G", cluster: "G" },
    ],
    [
        { id: "A", cluster: "A" },
        { id: "B", cluster: "A" },
        { id: "C", cluster: "A" },
        { id: "D", cluster: "D" },
        { id: "E", cluster: "E" },
        { id: "F", cluster: "G" },
        { id: "G", cluster: "G" },
    ],
    [
        { id: "A", cluster: "A" },
        { id: "B", cluster: "A" },
        { id: "C", cluster: "A" },
        { id: "D", cluster: "A" },
        { id: "E", cluster: "A" },
        { id: "F", cluster: "A" },
        { id: "G", cluster: "A" },
    ]
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

graph.setData(links);
graph.setIterations(nodes_at_iterations);
graph.render();

// Event listeners for the buttons
document.getElementById("nextStep").addEventListener("click", () => {
    graph.nextStep();
    document.getElementById("currentStep").innerText = graph.currentIteration + 1;
});

document.getElementById("prevStep").addEventListener("click", () => {
    graph.prevStep();
    document.getElementById("currentStep").innerText = graph.currentIteration + 1;
});
