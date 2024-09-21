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
    let clusters = {};
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

        this.currentIteration = 0;
        this.showClusterLabels = false; // Initialize cluster labels as hidden
    }

    // Set the links (edges) data
    setData(links) {
        this.linksData = links;
    }

    // Set the nodes at each iteration
    setIterations(nodes_at_iterations) {
        this.nodes_at_iterations = nodes_at_iterations;
    }

    render() {
        const nodeById = new Map();
        this.nodes = this.nodes_at_iterations[0].map(d => {
            const node = { id: d.id, cluster: d.cluster };
            nodeById.set(d.id, node);
            return node;
        });

        this.links = this.linksData.map(l => ({
            source: nodeById.get(l.source),
            target: nodeById.get(l.target),
        }));

        this.updateColorScale();

        // Draw links
        this.link = this.svg.append("g")
            .selectAll("line")
            .data(this.links)
            .join("line")
            .attr("stroke", d => d.source.cluster === d.target.cluster ? this.color(d.source.cluster) : "#ccc")
            .attr("stroke-opacity", 0.6)
            .attr("stroke-width", d => d.source.cluster === d.target.cluster ? 2 : 1);

        // Draw nodes
        this.node = this.svg.append("g")
            .selectAll("circle")
            .data(this.nodes)
            .join("circle")
            .attr("r", 7)
            .attr("fill", d => this.color(d.cluster))
            .call(
                d3.drag()
                    .on("start", this.dragstarted.bind(this))
                    .on("drag", this.dragged.bind(this))
                    .on("end", this.dragended.bind(this))
            );

        // Draw labels
        this.labels = this.svg.append("g")
            .selectAll("text")
            .data(this.nodes)
            .join("text")
            .text(d => this.showClusterLabels ? `${d.id} (${d.cluster})` : d.id)
            .attr("text-anchor", "middle")
            .attr("dy", ".35em")
            .attr("font-size", "10px")
            .attr("pointer-events", "none")
            .attr("fill", "#000");

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

                this.labels
                    .attr("x", d => d.x)
                    .attr("y", d => d.y);
            });

        this.simulation.force("link")
            .links(this.links);

        this.simulation.alpha(1).restart();

        this.simulation.on('end', () => {
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

        this.nodes.forEach(node => {
            const currentNode = currentNodes.find(n => n.id === node.id);
            node.cluster = currentNode.cluster;
        });

        this.updateColorScale();

        this.node
            .attr("fill", d => this.color(d.cluster));

        this.link
            .attr("stroke", d => d.source.cluster === d.target.cluster ? this.color(d.source.cluster) : "#ccc")
            .attr("stroke-width", d => d.source.cluster === d.target.cluster ? 2 : 1);

        this.labels
            .text(d => this.showClusterLabels ? `${d.id} (${d.cluster})` : d.id)
            .attr("fill", "#000");
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

    dragstarted(event, d) {
        if (!event.active) this.simulation.alphaTarget(0.3).restart();
        d.fx = d.x;
        d.fy = d.y;
    }

    dragged(event, d) {
        d.fx = event.x;
        d.fy = event.y;
    }

    dragended(event, d) {
        if (!event.active) this.simulation.alphaTarget(0);
        // Uncomment the lines below if you want nodes to be draggable without staying fixed
        // d.fx = null;
        // d.fy = null;
    }

    // Toggle cluster label visibility
    toggleClusterLabels() {
        this.showClusterLabels = !this.showClusterLabels;
        this.labels
            .text(d => this.showClusterLabels ? `${d.id} (${d.cluster})` : d.id);
    }
}

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
    { source: "F", target: "G" },
];

// Solve connected components
const nodesAtIterations = solveConnectedComponents(nodes, links);

// Set data and iterations to graph
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

// Toggle cluster labels
document.getElementById("toggleCluster").addEventListener("click", () => {
    graph.toggleClusterLabels();
    const toggleButton = document.getElementById("toggleCluster");
    toggleButton.innerText = graph.showClusterLabels ? "Hide Clusters" : "Show Clusters";
});