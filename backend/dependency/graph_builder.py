import networkx as nx
from typing import List, Dict, Any

class DependencyGraph:
    def __init__(self):
        self.graph = nx.DiGraph()

    def build_from_npm(self, dependencies: List[Dict[str, Any]]):
        """
        Builds a NetworkX directed graph from a list of npm dependencies.
        """
        # In a real scenario, package-lock.json v3 has dependency edges explicitly in the 'dependencies' map
        # For this prototype, we'll build a simplified star graph centered on the root app
        # and attach transitive dependencies based on known edges if available.
        
        self.graph.add_node("ROOT", type="app")
        
        last_direct = "ROOT"
        for dep in dependencies:
            name = dep["name"]
            version = dep["version"]
            is_direct = dep.get("is_direct", False)
            
            node_id = f"{name}@{version}"
            self.graph.add_node(node_id, name=name, version=version, type="package", is_direct=is_direct)
            
            if is_direct:
                self.graph.add_edge("ROOT", node_id, relationship="depends_on")
                last_direct = node_id
            else:
                self.graph.add_edge(last_direct, node_id, relationship="depends_on")

    def get_node_depth(self, node_id: str) -> int:
        """
        Calculates the shortest path depth from the ROOT node.
        """
        try:
            return nx.shortest_path_length(self.graph, source="ROOT", target=node_id)
        except (nx.NetworkXNoPath, nx.NodeNotFound):
            return -1

    def get_node_metrics(self, node_id: str) -> Dict[str, Any]:
        """
        Computes various graph metrics for a given node to assess its risk blast radius.
        """
        metrics = {
            "depth": self.get_node_depth(node_id),
            "in_degree": 0,
            "out_degree": 0,
            "reachability": 0,
            "blast_radius_penalty": 0.0,
            "blast_affected": 0
        }
        
        if node_id not in self.graph:
            return metrics
            
        metrics["in_degree"] = self.graph.in_degree(node_id)
        metrics["out_degree"] = self.graph.out_degree(node_id)
        
        descendants = nx.descendants(self.graph, node_id)
        metrics["reachability"] = len(descendants)
        
        ancestors = nx.ancestors(self.graph, node_id)
        blast_affected = len(ancestors)
        
        if blast_affected > 10:
            metrics["blast_radius_penalty"] = 2.0
        elif blast_affected > 5:
            metrics["blast_radius_penalty"] = 1.0
        elif blast_affected > 0:
            metrics["blast_radius_penalty"] = 0.5
            
        metrics["blast_affected"] = blast_affected
        return metrics

    def to_cytoscape_format(self) -> Dict[str, Any]:
        """
        Exports the graph to a format Cytoscape.js can consume.
        """
        data = nx.cytoscape_data(self.graph)
        return data["elements"]
