import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';

export default function PublicTracking() {
  const { referenceNumber } = useParams();
  const navigate = useNavigate();
  const [searchRef, setSearchRef] = useState(referenceNumber || '');
  const [trackingData, setTrackingData] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const fetchTracking = async (ref: string) => {
    if (!ref) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:3001'}/api/tracking/${ref}`);
      if (!res.ok) {
        if (res.status === 404) throw new Error('Shipment not found. Please check your reference number.');
        throw new Error('Error fetching tracking data.');
      }
      const data = await res.json();
      setTrackingData(data);
      if (ref !== referenceNumber) {
        navigate(`/track/${ref}`);
      }
    } catch (err: any) {
      setError(err.message);
      setTrackingData(null);
    } finally {
      setLoading(false);
    }
  };

  React.useEffect(() => {
    if (referenceNumber) {
      fetchTracking(referenceNumber);
    }
  }, [referenceNumber]);

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl w-full space-y-8">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            Atlas Track & Trace
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            Public Tracking Portal for Atlas Logistics
          </p>
        </div>
        
        <form className="mt-8 space-y-6" onSubmit={(e) => { e.preventDefault(); fetchTracking(searchRef); }}>
          <div className="rounded-md shadow-sm flex">
            <input
              type="text"
              required
              className="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-l-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm"
              placeholder="Enter Reference Number (e.g. BKG-123456)"
              value={searchRef}
              onChange={(e) => setSearchRef(e.target.value)}
            />
            <button
              type="submit"
              className="group relative w-32 flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-r-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              {loading ? 'Searching...' : 'Track'}
            </button>
          </div>
        </form>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded relative" role="alert">
            <span className="block sm:inline">{error}</span>
          </div>
        )}

        {trackingData && (
          <div className="bg-white shadow overflow-hidden sm:rounded-lg">
            <div className="px-4 py-5 sm:px-6 flex justify-between items-center">
              <div>
                <h3 className="text-lg leading-6 font-medium text-gray-900">
                  Tracking Details
                </h3>
                <p className="mt-1 max-w-2xl text-sm text-gray-500">
                  Reference: <span className="font-semibold text-gray-800">{trackingData.referenceNumber}</span>
                </p>
              </div>
              <div>
                <span className={`px-3 py-1 inline-flex text-sm leading-5 font-semibold rounded-full ${
                  trackingData.status === 'DELIVERED' ? 'bg-green-100 text-green-800' : 
                  trackingData.status === 'DRAFT' ? 'bg-gray-100 text-gray-800' :
                  'bg-blue-100 text-blue-800'
                }`}>
                  {trackingData.status}
                </span>
              </div>
            </div>
            
            <div className="border-t border-gray-200 px-4 py-5 sm:p-0">
              <dl className="sm:divide-y sm:divide-gray-200">
                <div className="py-4 sm:py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                  <dt className="text-sm font-medium text-gray-500">Timeline</dt>
                  <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">
                    <ul className="space-y-4">
                      {trackingData.events.map((event: any, idx: number) => (
                        <li key={event.id} className="relative">
                          {idx !== trackingData.events.length - 1 && (
                            <span className="absolute top-4 left-4 -ml-px h-full w-0.5 bg-gray-200" aria-hidden="true"></span>
                          )}
                          <div className="relative flex items-start space-x-3">
                            <div className="relative">
                              <span className="h-8 w-8 rounded-full bg-blue-500 flex items-center justify-center ring-8 ring-white">
                                <svg className="h-5 w-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                              </span>
                            </div>
                            <div className="min-w-0 flex-1 pt-1.5 flex justify-between space-x-4">
                              <div>
                                <p className="text-sm text-gray-500">{event.description}</p>
                              </div>
                              <div className="text-right text-sm whitespace-nowrap text-gray-500">
                                <time dateTime={event.milestoneDate}>{new Date(event.milestoneDate).toLocaleString()}</time>
                              </div>
                            </div>
                          </div>
                        </li>
                      ))}
                    </ul>
                  </dd>
                </div>
              </dl>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
