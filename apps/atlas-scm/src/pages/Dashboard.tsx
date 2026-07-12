import React from "react";

export default function Dashboard() {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-[#16161A] border border-gray-800 rounded-xl p-6">
          <h3 className="text-sm font-semibold text-gray-300 mb-2">
            Active Shipments
          </h3>
          <div>
            <div className="text-3xl font-bold">24</div>
            <p className="text-sm text-gray-500">+2 since yesterday</p>
          </div>
        </div>

        <div className="bg-[#16161A] border border-gray-800 rounded-xl p-6">
          <h3 className="text-sm font-semibold text-gray-300 mb-2">
            Pending Quotes
          </h3>
          <div>
            <div className="text-3xl font-bold">8</div>
            <p className="text-sm text-gray-500">Requires attention</p>
          </div>
        </div>

        <div className="bg-[#16161A] border border-gray-800 rounded-xl p-6">
          <h3 className="text-sm font-semibold text-gray-300 mb-2">
            Exceptions
          </h3>
          <div>
            <div className="text-3xl font-bold text-red-600">1</div>
            <p className="text-sm text-gray-500">Customs hold on HBL-1029</p>
          </div>
        </div>
      </div>
    </div>
  );
}
