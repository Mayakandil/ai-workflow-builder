
import { Handle, Position } from '@xyflow/react';

function DecisionNode({ data, selected }) {
  return (
    <div
      style={{
        width: 260,
        padding: 20,
        backgroundColor: 'white',
        border: selected
          ? '3px solid #2563eb'
          : '2px solid #94a3b8',
        borderRadius: 14,
        boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
        color: '#111827',
        textAlign: 'center',
      }}
    >
      {/* Input handle */}
      <Handle
        type="target"
        position={Position.Top}
        style={{
          background: '#64748b',
          width: 12,
          height: 12,
        }}
      />

      <div
        style={{
          fontSize: 12,
          color: '#2563eb',
          fontWeight: 'bold',
          marginBottom: 10,
        }}
      >
        AI DECISION
      </div>

      <div
        style={{
          fontSize: 14,
          fontWeight: 600,
          minHeight: 40,
          overflowWrap: 'anywhere',
        }}
      >
        {data.prompt || 'Click to edit AI prompt'}
      </div>

      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          marginTop: 20,
          fontWeight: 'bold',
          fontSize: 13,
        }}
      >
        <span style={{ color: '#16a34a' }}>
          YES
        </span>

        <span style={{ color: '#dc2626' }}>
          NO
        </span>
      </div>

      {/* YES output */}
      <Handle
        type="source"
        position={Position.Bottom}
        id="yes"
        style={{
          left: '25%',
          background: '#16a34a',
          width: 14,
          height: 14,
        }}
      />

      {/* NO output */}
      <Handle
        type="source"
        position={Position.Bottom}
        id="no"
        style={{
          left: '75%',
          background: '#dc2626',
          width: 14,
          height: 14,
        }}
      />
    </div>
  );
}

export default DecisionNode;
