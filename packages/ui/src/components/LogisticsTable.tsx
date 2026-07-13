import React from "react";
import { BoardingItem, ReceptionItem, StockItem } from "@atlas/shared";

export type TableRowProps =
  | { type: "Boarding"; item: BoardingItem; statusColor?: string }
  | { type: "Receptions"; item: ReceptionItem; statusColor?: string }
  | { type: "Stock"; item: StockItem; statusColor?: string };

export const LogisticsRowContent: React.FC<TableRowProps> = (props) => {
  const originClass = props.item.Origin === "ES" ? "es" : "fr";

  return (
    <>
      <td
        style={{
          borderLeft: props.statusColor
            ? `4px solid ${props.statusColor}`
            : "none",
        }}
      >
        <span className={`origin-badge ${originClass}`}>
          {props.item.Origin}
        </span>
      </td>
      {props.type === "Boarding" && (
        <>
          <td className="bold">{props.item.CustomerOrder}</td>
          <td>{props.item.Warehouse}</td>
          <td>{props.item.POL}</td>
          <td>{props.item.FinalDestination}</td>
          <td>{props.item.BoardingDate}</td>
          <td>{props.item.DeliveryDate}</td>
          <td>{props.item.ForecastArrivalDate}</td>
          <td>{props.item.ReelsCount}</td>
          <td>{props.item.Weight}</td>
          <td>{props.item.ExtAddrNumber}</td>
        </>
      )}
      {props.type === "Receptions" && (
        <>
          <td>{props.item.Warehouse}</td>
          <td>{props.item.Status}</td>
          <td className="bold">{props.item.LoadCode}</td>
          <td>{props.item.PlateNumber}</td>
          <td>{props.item.ForecastArrivalDate}</td>
          <td>{props.item.CustomerOrder}</td>
          <td>{props.item.ProductDescription}</td>
          <td>{props.item.Grammage}</td>
          <td>{props.item.Weight}</td>
        </>
      )}
      {props.type === "Stock" && (
        <>
          <td>{props.item.WarehouseID}</td>
          <td>{props.item.CustomerCode}</td>
          <td>{props.item.ProductCode}</td>
          <td className="bold">{props.item.ID}</td>
          <td className="text-muted">{props.item.ProductDescription}</td>
          <td>{props.item.BasisWeight}</td>
          <td>{props.item.Diameter}</td>
          <td>{props.item.RollWidth}</td>
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

export const LogisticsHeader: React.FC<{
  type: "Boarding" | "Receptions" | "Stock";
}> = ({ type }) => {
  return (
    <thead>
      {type === "Boarding" && (
        <tr>
          <th style={{ width: "80px" }}>Origen</th>
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
      )}
      {type === "Receptions" && (
        <tr>
          <th style={{ width: "80px" }}>Origen</th>
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
      )}
      {type === "Stock" && (
        <tr>
          <th style={{ width: "80px" }}>Origen</th>
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
      )}
    </thead>
  );
};
