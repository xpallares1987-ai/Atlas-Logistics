import React from 'react';
import { BoardingItem, ReceptionItem, StockItem } from '@torre/shared';

export type TableRowProps =
  | { type: 'Boarding'; item: BoardingItem; statusColor?: string; }
  | { type: 'Receptions'; item: ReceptionItem; statusColor?: string; }
  | { type: 'Stock'; item: StockItem; statusColor?: string; };

export const LogisticsRowContent: React.FC<TableRowProps> = (props) => {
  const originClass = props.item.Origin === 'ES' ? 'es' : 'fr';

  return (
    <>
      <td style={{ borderLeft: props.statusColor ? `4px solid ${props.statusColor}` : 'none' }}>
        <span className={`origin-badge ${originClass}`}>{props.item.Origin}</span>
      </td>
      {props.type === 'Boarding' && (
        <>
          <td className="bold">{props.item['Customer Order']}</td>
          <td>{props.item.Warehouse}</td>
          <td>{props.item.POL}</td>
          <td>{props.item['Final Destination']}</td>
          <td>{props.item['Fecha Lim. Carga']}</td>
          <td>{props.item['Delivery Date']}</td>
          <td>{props.item['Forecast Arrival']}</td>
          <td>{props.item.Bultos}</td>
          <td>{props.item['Weight (Tons)']}</td>
          <td>{props.item['Ext. Addr. Number']}</td>
        </>
      )}
      {props.type === 'Receptions' && (
        <>
          <td>{props.item.Warehouse}</td>
          <td>{props.item.Status}</td>
          <td className="bold">{props.item['Load Code']}</td>
          <td>{props.item['Plate Number']}</td>
          <td>{props.item['Estimated Arrival at WH']}</td>
          <td>{props.item['Customer Order']}</td>
          <td>{props.item['Product Description']}</td>
          <td>{props.item['Grammage (GM)']}</td>
          <td>{props.item['Weight (Kgs)']}</td>
        </>
      )}
      {props.type === 'Stock' && (
        <>
          <td>{props.item.Warehouse}</td>
          <td>{props.item['Ext. Addr. Number']}</td>
          <td>{props.item['Product Code']}</td>
          <td className="bold">{props.item['Item Number']}</td>
          <td className="text-muted">{props.item.Description}</td>
          <td>{props.item.Grammage}</td>
          <td>{props.item.Diameter}</td>
          <td>{props.item['Roll Width']}</td>
          <td>{props.item.Weight}</td>
        </>
      )}
    </>
  );
};

export const LogisticsRow: React.FC<TableRowProps> = (props) => {
  return (
    <tr>
      <LogisticsRowContent {...props} />
    </tr>
  );
};

export const LogisticsHeader: React.FC<{ type: 'Boarding' | 'Receptions' | 'Stock'; }> = ( { type } ) =>
{
  return (
    <thead>
      { type === 'Boarding' && (
        <tr>
          <th style={ { width: '80px' } }>Origen</th>
          <th>Customer Order</th>
          <th>Warehouse</th>
          <th>POL</th>
          <th>Destination</th>
          <th>Carga</th>
          <th>Delivery</th>
          <th>Arrival</th>
          <th>Bultos</th>
          <th>Weight</th>
          <th>Ext. Addr.</th>
        </tr>
      ) }
      { type === 'Receptions' && (
        <tr>
          <th style={ { width: '80px' } }>Origen</th>
          <th>Warehouse</th>
          <th>Status</th>
          <th>Load Code</th>
          <th>Plate</th>
          <th>Arrival WH</th>
          <th>Order</th>
          <th>Description</th>
          <th>Grammage</th>
          <th>Weight</th>
        </tr>
      ) }
      { type === 'Stock' && (
        <tr>
          <th style={ { width: '80px' } }>Origen</th>
          <th>Warehouse</th>
          <th>Ext. Addr.</th>
          <th>Product</th>
          <th>Item Number</th>
          <th>Description</th>
          <th>Grammage</th>
          <th>Diameter</th>
          <th>Width</th>
          <th>Weight</th>
        </tr>
      ) }
    </thead>
  );
};
