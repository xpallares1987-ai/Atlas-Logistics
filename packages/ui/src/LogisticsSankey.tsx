import React from 'react';
import { ResponsiveContainer, Sankey, Tooltip } from 'recharts';

const data = {
  nodes: [
    { name: 'Warehouse A' },
    { name: 'Warehouse B' },
    { name: 'Carrier X' },
    { name: 'Carrier Y' },
    { name: 'Client 1' },
    { name: 'Client 2' },
  ],
  links: [
    { source: 0, target: 2, value: 50 },
    { source: 1, target: 2, value: 30 },
    { source: 1, target: 3, value: 70 },
    { source: 2, target: 4, value: 40 },
    { source: 2, target: 5, value: 40 },
    { source: 3, target: 5, value: 70 },
  ],
};

export const LogisticsSankey: React.FC = () => {
  const [selectedNode, setSelectedNode] = React.useState<string | null>(null);

  const handleNodeClick = (node: any) => {
    console.log('Sankey Node clicked:', node.name);
    setSelectedNode(node.name === selectedNode ? null : node.name);
  };

  return (
    <div className="bg-white rounded-lg p-5 border border-slate-200 shadow-sm h-[400px]">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest">Logistics Throughput</h3>
        {selectedNode && (
          <span className="text-[10px] px-2 py-0.5 bg-indigo-100 text-indigo-700 font-bold rounded-full animate-pulse">
            FILTERING: {selectedNode}
          </span>
        )}
      </div>
      <ResponsiveContainer width="100%" height="100%">
        <Sankey
          data={data}
          nodeWidth={10}
          nodePadding={20}
          margin={{ top: 20, bottom: 20, left: 20, right: 20 }}
          link={{ 
            stroke: selectedNode ? '#cbd5e1' : '#818cf8', 
            strokeOpacity: 0.5 
          }}
          node={{ 
            fill: '#4f46e5',
            stroke: '#fff',
            strokeWidth: 2
          }}
          onClick={handleNodeClick}
        >
          <Tooltip />
        </Sankey>
      </ResponsiveContainer>
    </div>
  );
};
