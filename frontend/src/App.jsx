
import { useCallback, useState } from 'react';

import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
  addEdge,
} from '@xyflow/react';

import DecisionNode from './components/DecisionNode';
import '@xyflow/react/dist/style.css';

// Custom node types
const nodeTypes = {
  decision: DecisionNode,
};

// Initial nodes
const initialNodes = [
  {
    id: '1',
    type: 'decision',
    position: { x: 200, y: 50 },
    data: {
      prompt: 'Is this a support request?',
    },
  },
  {
    id: '2',
    type: 'decision',
    position: { x: 0, y: 350 },
    data: {
      prompt: 'Is the support request urgent?',
    },
  },
  {
    id: '3',
    type: 'decision',
    position: { x: 450, y: 350 },
    data: {
      prompt: 'Is this a sales inquiry?',
    },
  },
];

// Initial YES/NO connections
const initialEdges = [
  {
    id: 'e1-2',
    source: '1',
    sourceHandle: 'yes',
    target: '2',
    label: 'YES',
    type: 'smoothstep',
    style: {
      stroke: '#16a34a',
      strokeWidth: 3,
    },
    labelStyle: {
      fill: '#16a34a',
      fontWeight: 'bold',
    },
  },
  {
    id: 'e1-3',
    source: '1',
    sourceHandle: 'no',
    target: '3',
    label: 'NO',
    type: 'smoothstep',
    style: {
      stroke: '#dc2626',
      strokeWidth: 3,
    },
    labelStyle: {
      fill: '#dc2626',
      fontWeight: 'bold',
    },
  },
];

function App() {
  // Store nodes and edges
  const [nodes, setNodes, onNodesChange] =
    useNodesState(initialNodes);

  const [edges, setEdges, onEdgesChange] =
    useEdgesState(initialEdges);

  // Store selected node
  const [selectedNodeId, setSelectedNodeId] =
    useState(null);

  const selectedNode = nodes.find(
    (node) => node.id === selectedNodeId
  );

  // Select a node
  const onNodeClick = (event, node) => {
    setSelectedNodeId(node.id);
  };

  // Connect nodes using YES/NO handles
  const onConnect = useCallback(
    (connection) => {
      if (
        connection.source === connection.target ||
        !['yes', 'no'].includes(connection.sourceHandle)
      ) {
        return;
      }

      const isYes = connection.sourceHandle === 'yes';

      const newEdge = {
        ...connection,
        id: crypto.randomUUID(),
        label: isYes ? 'YES' : 'NO',
        type: 'smoothstep',
        style: {
          stroke: isYes ? '#16a34a' : '#dc2626',
          strokeWidth: 3,
        },
        labelStyle: {
          fill: isYes ? '#16a34a' : '#dc2626',
          fontWeight: 'bold',
        },
      };

      setEdges((currentEdges) => {
        // One connection per YES/NO handle
        const filteredEdges = currentEdges.filter(
          (edge) =>
            !(
              edge.source === connection.source &&
              edge.sourceHandle === connection.sourceHandle
            )
        );

        return addEdge(newEdge, filteredEdges);
      });
    },
    [setEdges]
  );

  // Add a new AI decision node
  const addNode = () => {
    const newNode = {
      id: crypto.randomUUID(),
      type: 'decision',
      position: {
        x: Math.random() * 400 + 100,
        y: Math.random() * 300 + 150,
      },
      data: {
        prompt: '',
      },
    };

    setNodes((currentNodes) => [
      ...currentNodes,
      newNode,
    ]);

    setSelectedNodeId(newNode.id);
  };

  // Edit the selected node's prompt
  const updatePrompt = (newPrompt) => {
    setNodes((currentNodes) =>
      currentNodes.map((node) =>
        node.id === selectedNodeId
          ? {
              ...node,
              data: {
                ...node.data,
                prompt: newPrompt,
              },
            }
          : node
      )
    );
  };

  // Delete the selected node
  const deleteSelectedNode = () => {
    if (!selectedNodeId) return;

    setNodes((currentNodes) =>
      currentNodes.filter(
        (node) => node.id !== selectedNodeId
      )
    );

    setEdges((currentEdges) =>
      currentEdges.filter(
        (edge) =>
          edge.source !== selectedNodeId &&
          edge.target !== selectedNodeId
      )
    );

    setSelectedNodeId(null);
  };

  // Validate the workflow before exporting
  const validateWorkflow = () => {
    if (nodes.length === 0) {
      return 'Add at least one node.';
    }

    for (const node of nodes) {
      if (!node.data.prompt?.trim()) {
        return `Node ${node.id} has an empty prompt.`;
      }
    }

    const nodeIds = new Set(
      nodes.map((node) => node.id)
    );

    const branches = new Set();

    for (const edge of edges) {
      if (
        !nodeIds.has(edge.source) ||
        !nodeIds.has(edge.target)
      ) {
        return 'A connection references a missing node.';
      }

      if (!['yes', 'no'].includes(edge.sourceHandle)) {
        return 'Every connection must use a YES or NO handle.';
      }

      if (edge.source === edge.target) {
        return 'A node cannot connect to itself.';
      }

      const branch =
        `${edge.source}:${edge.sourceHandle}`;

      if (branches.has(branch)) {
        return 'A node has multiple connections for the same answer.';
      }

      branches.add(branch);
    }

    // Find the starting node
    const incoming = new Set(
      edges.map((edge) => edge.target)
    );

    const roots = nodes.filter(
      (node) => !incoming.has(node.id)
    );

    if (roots.length !== 1) {
      return 'The workflow must have exactly one starting node.';
    }

    // Detect cycles and unreachable nodes
    const visited = new Set();
    const visiting = new Set();

    const visit = (nodeId) => {
      if (visiting.has(nodeId)) {
        throw new Error('The workflow contains a cycle.');
      }

      if (visited.has(nodeId)) return;

      visiting.add(nodeId);

      for (const edge of edges.filter(
        (edge) => edge.source === nodeId
      )) {
        visit(edge.target);
      }

      visiting.delete(nodeId);
      visited.add(nodeId);
    };

    try {
      visit(roots[0].id);
    } catch (error) {
      return error.message;
    }

    if (visited.size !== nodes.length) {
      return 'Some nodes are not reachable from the starting node.';
    }

    return null;
  };

  // Export the workflow as JSON
  const exportWorkflow = () => {
    const error = validateWorkflow();

    if (error) {
      alert(error);
      return;
    }

    const incoming = new Set(
      edges.map((edge) => edge.target)
    );

    const startNode = nodes.find(
      (node) => !incoming.has(node.id)
    );

    const workflow = {
      startNodeId: startNode.id,

      nodes: nodes.map((node) => ({
        id: node.id,
        prompt: node.data.prompt,
      })),

      edges: edges.map((edge) => ({
        source: edge.source,
        target: edge.target,
        sourceHandle: edge.sourceHandle,
      })),
    };

    const json = JSON.stringify(workflow, null, 2);

    const blob = new Blob([json], {
      type: 'application/json',
    });

    const url = URL.createObjectURL(blob);

    const link = document.createElement('a');
    link.href = url;
    link.download = 'workflow.json';
    link.click();

    URL.revokeObjectURL(url);
  };

  return (
    <div
      style={{
        width: '100vw',
        height: '100vh',
        position: 'relative',
        background: '#f8fafc',
      }}
    >
      {/* Add Node Button */}
      <button
        onClick={addNode}
        style={{
          position: 'absolute',
          top: 20,
          left: 20,
          zIndex: 10,
          padding: '12px 20px',
          backgroundColor: '#2563eb',
          color: 'white',
          border: 'none',
          borderRadius: '8px',
          cursor: 'pointer',
          fontWeight: 'bold',
        }}
      >
        + Add AI Node
      </button>

      {/* Export JSON Button */}
      <button
        onClick={exportWorkflow}
        style={{
          position: 'absolute',
          top: 20,
          left: 180,
          zIndex: 10,
          padding: '12px 20px',
          backgroundColor: '#16a34a',
          color: 'white',
          border: 'none',
          borderRadius: '8px',
          cursor: 'pointer',
          fontWeight: 'bold',
        }}
      >
        Export JSON
      </button>

      {/* React Flow Canvas */}
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onNodeClick={onNodeClick}
        onConnect={onConnect}
        onPaneClick={() => setSelectedNodeId(null)}
        fitView
        fitViewOptions={{ padding: 0.3 }}
        defaultEdgeOptions={{
          type: 'smoothstep',
        }}
      >
        <Background
          color="#cbd5e1"
          gap={20}
          size={1}
        />
        <Controls />
        <MiniMap />
      </ReactFlow>

      {/* Prompt Editor */}
      {selectedNode && (
        <div
          style={{
            position: 'absolute',
            top: 80,
            right: 20,
            width: 300,
            padding: 20,
            backgroundColor: 'white',
            color: '#111827',
            border: '1px solid #e5e7eb',
            borderRadius: 12,
            zIndex: 10,
            boxShadow:
              '0 4px 15px rgba(0,0,0,0.12)',
          }}
        >
          <h3 style={{ marginTop: 0 }}>
            Edit AI Prompt
          </h3>

          <textarea
            value={selectedNode.data.prompt || ''}
            onChange={(event) =>
              updatePrompt(event.target.value)
            }
            placeholder="Enter your AI decision prompt..."
            style={{
              width: '100%',
              height: 120,
              padding: 10,
              border: '1px solid #cbd5e1',
              borderRadius: 8,
              resize: 'vertical',
              fontFamily: 'inherit',
              boxSizing: 'border-box',
            }}
          />

          <p
            style={{
              fontSize: 12,
              color: '#64748b',
            }}
          >
            The AI will answer YES or NO.
          </p>

          <button
            onClick={deleteSelectedNode}
            style={{
              width: '100%',
              padding: 10,
              backgroundColor: '#dc2626',
              color: 'white',
              border: 'none',
              borderRadius: 8,
              cursor: 'pointer',
            }}
          >
            Delete Node
          </button>
        </div>
      )}
    </div>
  );
}

export default App;
