function solveConnectedComponents(nodes, edges) {
    const renamedNodes = nodes.map(node => ({ id: node.id }));
    const renamedEdges = edges.map(edge => ({
        source: edge.source,
        target: edge.target
    }));

    const neighbours = {};
    renamedNodes.forEach(node => {
        neighbours[node.id] = new Set();
    });

    renamedEdges.forEach(edge => {
        if (edge.source !== edge.target) {
            neighbours[edge.source].add(edge.target);
            neighbours[edge.target].add(edge.source);
        }
    });

    renamedNodes.forEach(node => {
        neighbours[node.id].add(node.id);
    });

    let representatives = {};
    renamedNodes.forEach(node => {
        representatives[node.id] = node.id;
    });

    console.table(Object.entries(representatives).map(([id, rep]) => ({ node_id: id, representative: rep })));
    console.log("----------");

    const nodesAtIterations = [renamedNodes.map(node => ({ id: node.id, cluster: representatives[node.id] }))];
    let changes = 1;
    let iteration = 0;

    while (changes > 0) {
        iteration += 1;
        console.log(`Iteration ${iteration}`);

        let newRepresentatives = { ...representatives };
        changes = 0;

        renamedNodes.forEach(node => {
            const nodeId = node.id;
            const neighborIds = Array.from(neighbours[nodeId]);
            const minRepresentative = neighborIds.reduce((minRep, neighborId) => {
                const neighborRep = representatives[neighborId];
                return neighborRep < minRep ? neighborRep : minRep;
            }, representatives[nodeId]);

            if (minRepresentative !== representatives[nodeId]) {
                newRepresentatives[nodeId] = minRepresentative;
                changes += 1;
            }
        });

        console.log("Updated representatives:");
        console.table(Object.entries(newRepresentatives).map(([id, rep]) => ({ node_id: id, representative: rep })));

        representatives = newRepresentatives;

        console.log(`Iteration ${iteration}: Number of nodes with changed representative: ${changes}`);
        console.log("----------");

        nodesAtIterations.push(renamedNodes.map(node => ({
            id: node.id,
            cluster: representatives[node.id]
        })));
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

        // Remove existing elements
        this.svg.selectAll("*").remove();

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

    // Generate a random graph based on the number of nodes and edge probability
    generateRandomGraph(numNodes, edgeProbability) {
        // Create nodes
        const nodes = [];
        for (let i = 1; i <= numNodes; i++) {
            nodes.push({ id: i, cluster: i });
        }

        // Create edges
        const links = [];
        for (let i = 0; i < numNodes; i++) {
            for (let j = i + 1; j < numNodes; j++) {
                if (Math.random() < edgeProbability) {
                    links.push({ source: nodes[i].id, target: nodes[j].id });
                }
            }
        }

        // Reset current iteration
        this.currentIteration = 0;

        // Solve connected components
        const nodesAtIterations = solveConnectedComponents(nodes, links);

        // Set data and iterations to graph
        this.setData(links);
        this.setIterations(nodesAtIterations);
        this.render();

        // Update the current step display
        document.getElementById("currentStep").innerText = this.currentIteration + 1;
    }
}

// Usage
const graph = new ForceDirectedGraph("#graph");

// Initial Hardcoded data
const initialNodes = [
    { id: 1, cluster: 1 },
    { id: 2, cluster: 2 },
    { id: 3, cluster: 3 },
    { id: 4, cluster: 4 },
    { id: 5, cluster: 5 },
    { id: 6, cluster: 6 },
    { id: 7, cluster: 7 },
    { id: 8, cluster: 8 },
    { id: 9, cluster: 9 },
    { id: 10, cluster: 10 },
    { id: 11, cluster: 11 },
    { id: 12, cluster: 12 },
    { id: 13, cluster: 13 },
    { id: 14, cluster: 14 },
    { id: 15, cluster: 15 },
    { id: 16, cluster: 16 },
    { id: 17, cluster: 17 },
    { id: 18, cluster: 18 },
    { id: 19, cluster: 19 },
    { id: 20, cluster: 20 },
    { id: 21, cluster: 21 },
    { id: 22, cluster: 22 },
    { id: 23, cluster: 23 },
    { id: 24, cluster: 24 },
    { id: 25, cluster: 25 },
    { id: 26, cluster: 26 },
    { id: 27, cluster: 27 },
    { id: 28, cluster: 28 },
    { id: 29, cluster: 29 },
    { id: 30, cluster: 30 },
];

const initialLinks = [
    { source: 1, target: 17 },
    { source: 1, target: 26 },
    { source: 3, target: 7 },
    { source: 4, target: 16 },
    { source: 5, target: 6 },
    { source: 6, target: 20 },
    { source: 6, target: 27 },
    { source: 7, target: 8 },
    { source: 7, target: 13 },
    { source: 7, target: 23 },
    { source: 8, target: 18 },
    { source: 9, target: 17 },
    { source: 9, target: 22 },
    { source: 11, target: 27 },
    { source: 13, target: 19 },
    { source: 13, target: 28 },
    { source: 15, target: 25 },
    { source: 16, target: 23 },
    { source: 16, target: 24 },
    { source: 18, target: 25 },
    { source: 19, target: 23 },
    { source: 20, target: 28 },
    { source: 22, target: 28 },

    { source: 13, target: 12 },
    { source: 12, target: 13 },
    { source: 13, target: 14 },

    { source: 12, target: 30 },
    { source: 30, target: 2 },
    { source: 2, target: 10 },
    { source: 10, target: 29 },
    { source: 10, target: 21 },
];



// Solve connected components
const initialNodesAtIterations = solveConnectedComponents(initialNodes, initialLinks);

// Set data and iterations to graph
graph.setData(initialLinks);
graph.setIterations(initialNodesAtIterations);
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
    toggleButton.innerText = graph.showClusterLabels ? "Hide representatives" : "Show representatives";
});

// Generate Random Graph
document.getElementById("generateGraphButton").addEventListener("click", () => {
    const numNodes = parseInt(document.getElementById("numNodes").value);
    const edgeProbability = parseFloat(document.getElementById("edgeProbability").value);
    if (isNaN(numNodes) || numNodes < 1) {
        alert("Please enter a valid number of nodes (minimum 1).");
        return;
    }
    if (isNaN(edgeProbability) || edgeProbability < 0 || edgeProbability > 1) {
        alert("Please enter a valid edge probability between 0 and 1.");
        return;
    }
    graph.generateRandomGraph(numNodes, edgeProbability);
});