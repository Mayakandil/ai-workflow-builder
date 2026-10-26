
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
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
  // React Flow state
  const [nodes, setNodes, onNodesChange] =
    useNodesState(initialNodes);

  const [edges, setEdges, onEdgesChange] =
    useEdgesState(initialEdges);
  
  const fileInputRef = useRef(null);

  // Selected node
  const [selectedNodeId, setSelectedNodeId] =
    useState(null);

  // Workflow input
  const [workflowInput, setWorkflowInput] =
    useState('');

  // Execution state
  const [executionStatus, setExecutionStatus] =
    useState('');

  const [isRunning, setIsRunning] =
    useState(false);

  const [runId, setRunId] =
    useState(null);

  const [executionLogs, setExecutionLogs] =
    useState([]);

  // Visual execution results are derived from the backend history.
  // We do not modify the editable workflow graph.
  const displayedNodes = useMemo(() => {
    const answers = new Map(
      executionLogs.map((log) => [String(log.nodeId), String(log.answer).toUpperCase()])
    );

    return nodes.map((node) => {
      const answer = answers.get(node.id);
      if (!answer) return node;

      const color = answer === 'YES' ? '#16a34a' : '#dc2626';
      return {
        ...node,
        data: { ...node.data, executionAnswer: answer },
        style: {
          ...node.style,
          border: `3px solid ${color}`,
          borderRadius: 12,
          boxShadow: `0 0 0 5px ${answer === 'YES' ? '#dcfce7' : '#fee2e2'}`,
        },
      };
    });
  }, [nodes, executionLogs]);

  const displayedEdges = useMemo(() => {
    if (executionLogs.length === 0) return edges;

    const followed = new Set();
    for (let i = 0; i < executionLogs.length - 1; i++) {
      const current = executionLogs[i];
      const next = executionLogs[i + 1];
      followed.add(
        `${current.nodeId}:${String(current.answer).toLowerCase()}:${next.nodeId}`
      );
    }

    return edges.map((edge) => {
      const key = `${edge.source}:${edge.sourceHandle}:${edge.target}`;
      const wasFollowed = followed.has(key);
      const color = edge.sourceHandle === 'yes' ? '#16a34a' : '#dc2626';
      return {
        ...edge,
        animated: wasFollowed,
        style: {
          ...edge.style,
          stroke: wasFollowed ? color : '#cbd5e1',
          strokeWidth: wasFollowed ? 5 : 2,
          opacity: wasFollowed ? 1 : 0.5,
        },
        labelStyle: {
          ...edge.labelStyle,
          fill: wasFollowed ? color : '#94a3b8',
        },
      };
    });
  }, [edges, executionLogs]);

  const selectedNode = nodes.find(
    (node) => node.id === selectedNodeId
  );

  // Select node
  const onNodeClick = (event, node) => {
    setSelectedNodeId(node.id);
  };

  // Connect YES/NO handles
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

  // Add a new AI node
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

  // Update prompt
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

  // Delete selected node
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

  // Find the starting node
  const getStartNode = () => {
    const incoming = new Set(
      edges.map((edge) => edge.target)
    );

    return nodes.find(
      (node) => !incoming.has(node.id)
    );
  };

  // Validate workflow
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
        return 'Every connection must use YES or NO.';
      }

      if (edge.source === edge.target) {
        return 'A node cannot connect to itself.';
      }

      const branch =
        `${edge.source}:${edge.sourceHandle}`;

      if (branches.has(branch)) {
        return 'Duplicate YES/NO branch detected.';
      }

      branches.add(branch);
    }

    const incoming = new Set(
      edges.map((edge) => edge.target)
    );

    const roots = nodes.filter(
      (node) => !incoming.has(node.id)
    );

    if (roots.length !== 1) {
      return 'The workflow must have exactly one starting node.';
    }

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
      return 'Some nodes are unreachable.';
    }

    return null;
  };

  // Build JSON for backend
  const buildWorkflow = () => {
    const startNode = getStartNode();

    return {
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
  };

  // Export workflow JSON
  const exportWorkflow = () => {
    const error = validateWorkflow();

    if (error) {
      alert(error);
      return;
    }

    const workflow = buildWorkflow();

    const json = JSON.stringify(workflow, null, 2);

    const blob = new Blob([json], {
      type: 'application/json',
    });

    const url = URL.createObjectURL(blob);

    const link = document.createElement('a');

    link.href = url;
    link.download = 'workflow.json';

    document.body.appendChild(link);
    link.click();
    link.remove();

    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  // Run workflow through FastAPI + Inngest
  const runWorkflow = async () => {
    const error = validateWorkflow();

    if (error) {
      alert(error);
      return;
    }

    if (!workflowInput.trim()) {
      alert('Please enter workflow input.');
      return;
    }

    const workflow = buildWorkflow();

    try {
      setIsRunning(true);
      setExecutionStatus('Submitting workflow...');
      setExecutionLogs([]);
      setRunId(null);

      const response = await fetch(
        'http://localhost:8000/workflow/execute',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            workflow,
            input: workflowInput,
          }),
        }
      );

      if (!response.ok) {
        throw new Error(await response.text());
      }

      const result = await response.json();

      if (!result.run_id) {
        throw new Error(
          'Backend did not return a run_id.'
        );
      }

      setRunId(result.run_id);
      setExecutionStatus('Workflow queued...');
    } catch (error) {
      setExecutionStatus(
        `Error: ${error.message}`
      );
    } finally {
      setIsRunning(false);
    }
  };

  // Poll backend for workflow execution status
  useEffect(() => {
    if (!runId) return;

    let cancelled = false;
    let timeoutId;

    const checkStatus = async () => {
      try {
        const response = await fetch(
          `http://localhost:8000/workflow/status/${runId}`
        );

        if (!response.ok) {
          throw new Error(
            'Failed to fetch workflow status.'
          );
        }

        const result = await response.json();

        if (cancelled) return;

        setExecutionStatus(result.status);
        setExecutionLogs(result.history || []);

        if (
          result.status === 'completed' ||
          result.status === 'failed'
        ) {
          setRunId(null);
          return;
        }

        timeoutId = setTimeout(checkStatus, 1500);
      } catch (error) {
        if (!cancelled) {
          setExecutionStatus(
            `Error: ${error.message}`
          );
          setRunId(null);
        }
      }
    };

    checkStatus();






    return () => {
      cancelled = true;
      clearTimeout(timeoutId);
    };
  }, [runId]);

    const importWorkflow = async (event) => {
      const file = event.target.files?.[0];

      if (!file) return;

      try {
        const text = await file.text();
        const workflow = JSON.parse(text);

        if (
          !Array.isArray(workflow.nodes) ||
          !Array.isArray(workflow.edges) ||
          typeof workflow.startNodeId !== 'string'
        ) {
          throw new Error('Invalid workflow JSON.');
        }

        const importedNodes = workflow.nodes.map((node, index) => {
          if (
            typeof node.id !== 'string' ||
            typeof node.prompt !== 'string'
          ) {
            throw new Error('Invalid node data.');
          }

          return {
            id: node.id,
            type: 'decision',
            position: {
              x: 150 + (index % 3) * 300,
              y: 100 + Math.floor(index / 3) * 250,
            },
            data: {
              prompt: node.prompt,
            },
          };
        });

        const nodeIds = new Set(importedNodes.map((node) => node.id));

        if (
          nodeIds.size !== importedNodes.length ||
          !nodeIds.has(workflow.startNodeId)
        ) {
          throw new Error('Invalid node IDs or starting node.');
        }

        const importedEdges = workflow.edges.map((edge, index) => {
          if (
            !nodeIds.has(edge.source) ||
            !nodeIds.has(edge.target) ||
            !['yes', 'no'].includes(edge.sourceHandle)
          ) {
            throw new Error('Invalid workflow connection.');
          }

          const isYes = edge.sourceHandle === 'yes';

          return {
            id: `imported-edge-${index}`,
            source: edge.source,
            target: edge.target,
            sourceHandle: edge.sourceHandle,
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
        });

        setNodes(importedNodes);
        setEdges(importedEdges);
        setSelectedNodeId(null);
        setExecutionLogs([]);
        setExecutionStatus('');

        alert('Workflow imported successfully!');
      } catch (error) {
        alert(`Import failed: ${error.message}`);
      } finally {
        event.target.value = '';
      }
    };

const saveWorkflow = () => {
  const workflowData = {
    nodes,
    edges,
  };

  localStorage.setItem(
    'ai-workflow',
    JSON.stringify(workflowData)
  );

  alert('Workflow saved successfully!');
   };


const loadWorkflow = () => {
  const saved = localStorage.getItem('ai-workflow');

  if (!saved) {
    alert('No saved workflow found.');
    return;
  }

  try {
    const workflowData = JSON.parse(saved);

    if (
      !Array.isArray(workflowData.nodes) ||
      !Array.isArray(workflowData.edges)
    ) {
      throw new Error('Invalid workflow data');
    }

    setNodes(workflowData.nodes);
    setEdges(workflowData.edges);
    setSelectedNodeId(null);

    // Clear results from the previous workflow
    setExecutionLogs([]);
    setExecutionStatus('');

     alert('Workflow loaded successfully!');
   } catch (error) {
     alert(`Could not load workflow: ${error.message}`);
   }
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
          borderRadius: 8,
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
          borderRadius: 8,
          cursor: 'pointer',
          fontWeight: 'bold',
        }}
      >
        Export JSON
      </button>


{/* Save Workflow Button */}
<button
  onClick={saveWorkflow}
  disabled={isRunning || Boolean(runId)}
  style={{
    position: 'absolute',
    top: 20,
    left: 330,
    zIndex: 10,
    padding: '12px 20px',
    backgroundColor: '#0f766e',
    color: 'white',
    border: 'none',
    borderRadius: 8,
    cursor: 'pointer',
    fontWeight: 'bold',
  }}
>
  Save Workflow
</button>

    {/* Load Workflow Button */}
    <button
      onClick={loadWorkflow}
      disabled={isRunning || Boolean(runId)}
      style={{
        position: 'absolute',
        top: 20,
        left: 490,
        zIndex: 10,
        padding: '12px 20px',
        backgroundColor: '#ea580c',
        color: 'white',
        border: 'none',
        borderRadius: 8,
        cursor: 'pointer',
        fontWeight: 'bold',
      }}
    >
      Load Workflow
    </button>

    

{/* Hidden JSON File Input */}
<input
  type="file"
  accept=".json,application/json"
  ref={fileInputRef}
  onChange={importWorkflow}
  style={{ display: 'none' }}
/>

{/* Import Workflow Button */}
<button
  onClick={() => fileInputRef.current?.click()}
  disabled={isRunning || Boolean(runId)}
  style={{
    position: 'absolute',
    top: 20,
    left: 650,
    zIndex: 10,
    padding: '12px 20px',
    backgroundColor: '#9333ea',
    color: 'white',
    border: 'none',
    borderRadius: 8,
    cursor: 'pointer',
    fontWeight: 'bold',
  }}
>
  Import JSON
</button>





      {/* Workflow Execution Panel */}
      <div
        style={{
          position: 'absolute',
          top: 80,
          left: 20,
          zIndex: 10,
          background: 'white',
          padding: 15,
          borderRadius: 10,
          width: 280,
          boxShadow: '0 2px 10px #0002',
          color: '#111827',
        }}
      >
        <h3 style={{ marginTop: 0 }}>
          AI Workflow Execution
        </h3>

        <textarea
          placeholder="Enter workflow input..."
          value={workflowInput}
          onChange={(event) =>
            setWorkflowInput(event.target.value)
          }
          style={{
            width: '100%',
            height: 90,
            padding: 10,
            border: '1px solid #cbd5e1',
            borderRadius: 8,
            resize: 'vertical',
            boxSizing: 'border-box',
          }}
        />

        <button
          onClick={runWorkflow}
          disabled={isRunning || Boolean(runId)}
          style={{
            width: '100%',
            marginTop: 10,
            padding: 12,
            backgroundColor: '#7c3aed',
            color: 'white',
            border: 'none',
            borderRadius: 8,
            cursor: isRunning ? 'wait' : 'pointer',
            fontWeight: 'bold',
          }}
        >
          {isRunning
            ? 'Submitting...'
            : 'Run AI Workflow'}
        </button>

        <p
          style={{
            fontSize: 12,
            color: '#475569',
            overflowWrap: 'anywhere',
          }}
        >
          Status: {executionStatus || 'Not started'}
        </p>
      </div>

      {/* React Flow Canvas */}
      <ReactFlow
        nodes={displayedNodes}
        edges={displayedEdges}
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
            boxShadow: '0 4px 15px rgba(0,0,0,0.12)',
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

      {/* Execution Logs Panel */}
      <div
        style={{
          position: 'absolute',
          bottom: 20,
          right: 20,
          width: 320,
          maxHeight: 250,
          overflowY: 'auto',
          background: 'white',
          color: '#111827',
          padding: 15,
          borderRadius: 10,
          boxShadow: '0 4px 15px #0002',
          zIndex: 10,
        }}
      >
        <h3 style={{ marginTop: 0 }}>
          Execution Logs
        </h3>

        {executionLogs.length === 0 ? (
          <p style={{ color: '#64748b' }}>
            No execution results yet.
          </p>
        ) : (
          executionLogs.map((log, index) => (
            <div
              key={`${log.nodeId}-${index}`}
              style={{
                padding: 10,
                borderBottom: '1px solid #ddd',
              }}
            >
              <strong>Step {index + 1}</strong>

              <p>{log.prompt}</p>

              <strong
                style={{
                  color:
                    log.answer === 'YES'
                      ? '#16a34a'
                      : '#dc2626',
                }}
              >
                {log.answer}
              </strong>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

export default App;
