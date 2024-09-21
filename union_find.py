import duckdb
import pandas as pd

# This algorith is called Breadth First Search
# in the paper https://arxiv.org/pdf/1802.09478.pdf


nodes = [
    {"id": "C"},
    {"id": "J"},
    {"id": "K"},
    {"id": "G"},
    {"id": "O"},
    {"id": "E"},
    {"id": "T"},
    {"id": "L"},
]
edges = [
    {"source": "C", "target": "J"},
    {"source": "J", "target": "G"},
    {"source": "K", "target": "G"},
    {"source": "G", "target": "O"},
    {"source": "G", "target": "E"},
    {"source": "E", "target": "T"},
    {"source": "T", "target": "L"},
]


# nodes should have the key "unique_id"
# edges should have the keys "unique_id_l" and "unique_id_r"
nodes = [{"unique_id": node["id"]} for node in nodes]
edges_without_self_loops = [
    {"unique_id_l": edge["source"], "unique_id_r": edge["target"]} for edge in edges
]
nodes = pd.DataFrame(nodes)
edges_without_self_loops = pd.DataFrame(edges_without_self_loops)


# Register the DataFrames with DuckDB
duckdb.register("nodes", nodes)
duckdb.register("edges_without_self_loops", edges_without_self_loops)


# Create the edges table, adding self-loops
sql = """
CREATE OR REPLACE TABLE edges AS
SELECT unique_id_l, unique_id_r
FROM edges_without_self_loops
WHERE unique_id_l <> unique_id_r

UNION

SELECT unique_id, unique_id AS unique_id_r
FROM nodes
"""
duckdb.execute(sql)


# Build the neighbours table
# Since the edges are undirected, we need to ensure both directions
create_neighbours_query = """
CREATE OR REPLACE TABLE neighbours AS
SELECT unique_id_l AS node_id, unique_id_r AS neighbour
FROM edges
UNION ALL
SELECT unique_id_r AS node_id, unique_id_l AS neighbour
FROM edges
"""
duckdb.execute(create_neighbours_query)

# Initialize the representatives: For each node, representative is the minimum neighbor
initial_representatives_query = """
CREATE OR REPLACE TABLE representatives AS
SELECT unique_id as node_id, unique_id AS representative
FROM nodes
"""
duckdb.execute(initial_representatives_query)
duckdb.sql("SELECT * FROM representatives").show()


iteration = 0
changes = 1  # To enter the loop

while changes > 0:
    iteration += 1
    print("-" * 10)
    print(f"Iteration {iteration}")
    # Update representatives by taking min of representatives of neighbors
    # Join neighbours with current representatives
    update_query = """
    CREATE OR REPLACE TABLE updated_representatives AS
    SELECT
        n.node_id,
        MIN(r2.representative) AS representative
    FROM neighbours AS n
    LEFT JOIN representatives AS r2
    ON n.neighbour = r2.node_id
    GROUP BY n.node_id
    """
    duckdb.execute(update_query)

    print("\nUpdated representatives:")
    print(duckdb.sql("SELECT * FROM updated_representatives"))

    # Compare the updated representatives with the current ones
    # To check for changes, we can count the number of nodes where the representative changed
    changes_query = """
    SELECT COUNT(*) AS changes
    FROM (
        SELECT
            r.node_id,
            r.representative AS old_representative,
            u.representative AS new_representative
        FROM representatives AS r
        JOIN updated_representatives AS u
        ON r.node_id = u.node_id
        WHERE r.representative <> u.representative
    ) AS diff
    """
    changes_result = duckdb.execute(changes_query).fetchone()
    changes = changes_result[0]
    print(
        f"Iteration {iteration}: Number of nodes with changed representative: {changes}"
    )

    # Replace the old representatives with the updated ones
    # Drop the old representatives table
    duckdb.execute("DROP TABLE representatives")
    # Rename updated_representatives to representatives
    duckdb.execute("ALTER TABLE updated_representatives RENAME TO representatives")

# Final clustering results
final_query = """
SELECT node_id AS unique_id, representative AS cluster_id
FROM representatives
ORDER BY cluster_id, unique_id
"""
our_clusters = duckdb.execute(final_query).fetchdf()
