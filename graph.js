function solveConnectedComponents(nodes, links) {
    // Build adjacency list
    const adjacency = {};
    nodes.forEach(node => {
        adjacency[node.id] = new Set();
    });
    links.forEach(link => {
        adjacency[link.source].add(link.target);
        adjacency[link.target].add(link.source);
    });

    // Initialize clusters
    let clusters = {}; // Changed from 'const' to 'let'
    nodes.forEach(node => {
        clusters[node.id] = node.id;
    });

    const nodesAtIterations = [nodes.map(node => ({ id: node.id, cluster: node.cluster }))];
    let changes = 1;

    while (changes > 0) {
        changes = 0;
        const newClusters = { ...clusters };

        nodes.forEach(node => {
            const neighborClusters = Array.from(adjacency[node.id]).map(neighbor => clusters[neighbor]);
            const minCluster = [clusters[node.id], ...neighborClusters].reduce((a, b) => (a < b ? a : b));
            if (minCluster !== clusters[node.id]) {
                newClusters[node.id] = minCluster;
                changes += 1;
            }
        });

        clusters = newClusters;

        nodesAtIterations.push(nodes.map(node => ({ id: node.id, cluster: clusters[node.id] })));
    }

    return nodesAtIterations;
}

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
        // Initialize nodes from the first iteration
        // Create a map from node IDs to node objects
        const nodeById = new Map();
        this.nodes = this.nodes_at_iterations[0].map(d => {
            const node = { id: d.id, cluster: d.cluster };
            nodeById.set(d.id, node);
            return node;
        });

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
            // Fix node positions to prevent re-layout
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
// Usage
const graph = new ForceDirectedGraph("#graph");

// Hardcoded data
const nodes = [
    { id: "A", cluster: "A" },
    { id: "B", cluster: "B" },
    { id: "C", cluster: "C" },
    { id: "D", cluster: "D" },
    { id: "E", cluster: "E" },
    { id: "F", cluster: "F" },
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

// Solve connected components
const nodesAtIterations = solveConnectedComponents(nodes, links);

// Set data and iterations to graph
debugger;
graph.setData(links);
graph.setIterations(nodesAtIterations);
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