'use client';

import React, { useRef } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import { LogisticsHeader, LogisticsRowContent } from './LogisticsTable';

interface VirtualLogisticsTableProps {
  data: any[];
  type: 'Boarding' | 'Receptions' | 'Stock';
}

export const VirtualLogisticsTable: React.FC<VirtualLogisticsTableProps> = ({ data, type }) => {
  const parentRef = useRef<HTMLDivElement>(null);

  const rowVirtualizer = useVirtualizer({
    count: data.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 52, // Estimated height of a table row
    overscan: 10,
  });

  return (
    <div
      ref={parentRef}
      className="virtual-table-container"
      style={{
        height: '600px',
        overflow: 'auto',
        borderRadius: '12px',
        border: '1px solid var(--border)',
        background: 'var(--card-bg)',
      }}
    >
      <table style={{ width: '100%', borderCollapse: 'collapse', tableLayout: 'fixed' }}>
        <LogisticsHeader type={type} />
        <tbody
          style={{
            height: `${rowVirtualizer.getTotalSize()}px`,
            position: 'relative',
            display: 'block',
          }}
        >
          {rowVirtualizer.getVirtualItems().map((virtualRow) => {
            const item = data[virtualRow.index];
            return (
              <tr
                key={virtualRow.key}
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  width: '100%',
                  height: `${virtualRow.size}px`,
                  transform: `translateY(${virtualRow.start}px)`,
                  display: 'flex',
                  alignItems: 'center',
                  borderBottom: '1px solid var(--border)',
                }}
              >
                <LogisticsRowContent 
                  type={type as any} 
                  item={item as any} 
                />
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
};
