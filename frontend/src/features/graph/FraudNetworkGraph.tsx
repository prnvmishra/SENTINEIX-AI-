import { useMemo } from "react";
import ReactFlow, { Background, BackgroundVariant, Controls } from "reactflow";
import type { Edge, Node, NodeTypes } from "reactflow";
import "reactflow/dist/style.css";
import type { GraphUpdate } from "@shared/types";
import { EntityNode } from "@/features/graph/EntityNode";
import type { EntityNodeData } from "@/features/graph/EntityNode";

const nodeTypes: NodeTypes = { entityNode: EntityNode };

function toFlowNodes(graph: GraphUpdate): Node<EntityNodeData>[] {
  return graph.nodes.map((node) => ({
    id: node.id,
    type: "entityNode",
    position: { x: node.x, y: node.y },
    data: { type: node.type, label: node.label, detail: node.detail, riskScore: node.riskScore },
  }));
}

function toFlowEdges(graph: GraphUpdate): Edge[] {
  return graph.edges.map((edge) => ({
    id: edge.id,
    source: edge.source,
    target: edge.target,
    label: edge.label,
    animated: true,
    style: { stroke: "#38bdf8", strokeWidth: Math.min(3, edge.weight + 1) },
    labelStyle: { fill: "#94a3b8", fontSize: 10 },
    labelBgStyle: { fill: "#0f172a" },
  }));
}

export function FraudNetworkGraph({ graph }: { graph: GraphUpdate }) {
  const nodes = useMemo(() => toFlowNodes(graph), [graph]);
  const edges = useMemo(() => toFlowEdges(graph), [graph]);

  return (
    <div className="h-full min-h-[220px] w-full bg-[#070b14]">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        fitView
        fitViewOptions={{ padding: 0.35 }}
        proOptions={{ hideAttribution: true }}
        nodesDraggable={false}
        nodesConnectable={false}
        elementsSelectable={false}
        zoomOnScroll={false}
        minZoom={0.35}
        maxZoom={1.8}
        className="h-full w-full"
      >
        <Background variant={BackgroundVariant.Dots} gap={18} size={1.5} color="#64748b" />
        <Controls
          showInteractive={false}
          className="[&_button]:border-border-strong [&_button]:bg-surface [&_button]:fill-text-secondary"
        />
      </ReactFlow>
    </div>
  );
}
