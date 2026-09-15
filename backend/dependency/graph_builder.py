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
        
        for dep in dependencies:
            name = dep["name"]
            version = dep["version"]
            is_direct = dep.get("is_direct", False)
            
            node_id = f"{name}@{version}"
            self.graph.add_node(node_id, name=name, version=version, type="package", is_direct=is_direct)
            
            if is_direct:
                self.graph.add_edge("ROOT", node_id, relationship="depends_on")
            else:
                # Without full edge mapping, we just float transitives or attach to root 
                # (For a complete implementation, we'd parse the 'dependencies' field of each package node)
                pass

    def get_node_depth(self, node_id: str) -> int:
        """
        Calculates the shortest path depth from the ROOT node.
        """
        try:
            return nx.shortest_path_length(self.graph, source="ROOT", target=node_id)
        except (nx.NetworkXNoPath, nx.NodeNotFound):
            return -1

    def to_cytoscape_format(self) -> Dict[str, Any]:
        """
        Exports the graph to a format Cytoscape.js can consume.
        """
        data = nx.cytoscape_data(self.graph)
        return data["elements"]
