import React, { useRef } from 'react';
import { TripPlan } from '../types';
import { MapPin, Calendar, DollarSign, Cloud, Plane, Home, Coffee, CheckSquare, Shield, Info, PieChart as PieChartIcon, Download, Loader2 } from 'lucide-react';
import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from 'recharts';

interface TripDashboardProps {
  trip: TripPlan | null;
}

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8'];

export default function TripDashboard({ trip }: TripDashboardProps) {
  const handleExportPDF = () => {
    window.print();
  };

  if (!trip) {
    return (
      <div className="h-full flex flex-col items-center justify-center text-gray-400 p-8 text-center bg-gray-950">
        <MapPin className="w-16 h-16 text-gray-700 mb-4" />
        <h3 className="text-xl font-medium text-gray-200 mb-2">No Itinerary Yet</h3>
        <p className="max-w-md">
          Chat with TravelGPT to plan your trip. Once you're ready, click "Generate Itinerary" to see your complete plan here.
        </p>
      </div>
    );
  }

  const budgetData = trip.budgetBreakdown ? [
    { name: 'Flights', value: trip.budgetBreakdown.flights },
    { name: 'Accommodation', value: trip.budgetBreakdown.accommodation },
    { name: 'Food', value: trip.budgetBreakdown.food },
    { name: 'Activities', value: trip.budgetBreakdown.activities },
  ].filter(item => item.value > 0) : [];

  return (
    <div className="h-full overflow-y-auto bg-gray-950 p-6 text-gray-200 relative print:bg-white print:text-black">
      <div className="absolute top-6 right-6 z-10 print:hidden">
        <button
          onClick={handleExportPDF}
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-xl text-sm font-medium transition-colors shadow-sm"
        >
          <Download className="w-4 h-4" />
          Export PDF
        </button>
      </div>

      <div className="space-y-8 bg-gray-950 print:bg-white p-2">
        {/* Summary Section */}
        <section className="bg-gray-900 rounded-2xl p-6 shadow-sm border border-gray-800">
          <div className="pr-32">
            <h1 className="text-3xl font-bold text-gray-100 mb-2">{trip.summary.title}</h1>
            <p className="text-gray-400 mb-6">{trip.summary.description}</p>
          </div>
        
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-900/30 text-blue-400 rounded-lg"><MapPin className="w-5 h-5" /></div>
            <div>
              <p className="text-xs text-gray-500 uppercase font-semibold tracking-wider">Destination</p>
              <p className="font-medium text-gray-200">{trip.summary.destination}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-900/30 text-green-400 rounded-lg"><Calendar className="w-5 h-5" /></div>
            <div>
              <p className="text-xs text-gray-500 uppercase font-semibold tracking-wider">Dates</p>
              <p className="font-medium text-gray-200">{trip.summary.startDate} - {trip.summary.endDate}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="p-2 bg-purple-900/30 text-purple-400 rounded-lg"><DollarSign className="w-5 h-5" /></div>
            <div>
              <p className="text-xs text-gray-500 uppercase font-semibold tracking-wider">Budget</p>
              <p className="font-medium text-gray-200">{trip.summary.budget}</p>
            </div>
          </div>
          {trip.weather && (
            <div className="flex items-center gap-3">
              <div className="p-2 bg-amber-900/30 text-amber-400 rounded-lg"><Cloud className="w-5 h-5" /></div>
              <div>
                <p className="text-xs text-gray-500 uppercase font-semibold tracking-wider">Weather</p>
                <p className="font-medium text-gray-200">{trip.weather.temperature}</p>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* Budget Breakdown */}
      {trip.budgetBreakdown && budgetData.length > 0 && (
        <section className="bg-gray-900 rounded-2xl p-6 shadow-sm border border-gray-800">
          <h2 className="text-2xl font-bold text-gray-100 mb-4 flex items-center gap-2">
            <PieChartIcon className="w-6 h-6 text-emerald-500" />
            Budget Distribution
          </h2>
          <div className="flex flex-col md:flex-row items-center gap-8">
            <div className="w-full md:w-1/2 h-64">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={budgetData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {budgetData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value) => `${trip.budgetBreakdown?.currency || '$'}${value}`} contentStyle={{ backgroundColor: '#1f2937', borderColor: '#374151', color: '#f3f4f6' }} />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="w-full md:w-1/2 space-y-4">
              <div className="flex justify-between items-center pb-2 border-b border-gray-800">
                <span className="text-gray-400">Total Budget</span>
                <div className="text-right">
                  <span className="font-bold text-lg text-gray-100">{trip.budgetBreakdown.currency || '$'}{trip.budgetBreakdown.total}</span>
                  {trip.budgetBreakdown.homeCurrency && trip.budgetBreakdown.totalInHomeCurrency && (
                    <div className="text-sm text-emerald-400 font-medium">
                      Est. {trip.budgetBreakdown.homeCurrency}{trip.budgetBreakdown.totalInHomeCurrency}
                    </div>
                  )}
                </div>
              </div>
              {budgetData.map((item, idx) => (
                <div key={idx} className="flex justify-between items-center">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS[idx % COLORS.length] }}></div>
                    <span className="text-gray-400">{item.name}</span>
                  </div>
                  <span className="font-medium text-gray-200">{trip.budgetBreakdown?.currency || '$'}{item.value}</span>
                </div>
              ))}
            </div>
          </div>
          {trip.moneyExchangePlan && (
            <div className="mt-8 pt-6 border-t border-gray-800">
              <h3 className="text-lg font-semibold text-gray-200 mb-3 flex items-center gap-2">
                <DollarSign className="w-5 h-5 text-emerald-500" />
                Money Exchange Guide
              </h3>
              <p className="text-sm text-gray-400 mb-4">{trip.moneyExchangePlan.recommendation}</p>
              {trip.moneyExchangePlan.nearbyExchanges && trip.moneyExchangePlan.nearbyExchanges.length > 0 && (
                <div className="grid md:grid-cols-2 gap-4">
                  {trip.moneyExchangePlan.nearbyExchanges.map((exchange, idx) => (
                    <div key={idx} className="bg-gray-800/50 p-4 rounded-xl border border-gray-700">
                      <h4 className="font-medium text-gray-200">{exchange.name}</h4>
                      <p className="text-xs text-gray-400 mt-1 flex items-center gap-1"><MapPin className="w-3 h-3" /> {exchange.address}</p>
                      <p className="text-sm text-gray-500 mt-2">{exchange.description}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </section>
      )}

      {/* Itinerary */}
      {trip.itinerary && trip.itinerary.length > 0 && (
        <section>
          <h2 className="text-2xl font-bold text-gray-100 mb-4 flex items-center gap-2">
            <Calendar className="w-6 h-6 text-blue-500" />
            Day-by-Day Itinerary
          </h2>
          <div className="space-y-6">
            {trip.itinerary.map((day, idx) => (
              <div key={idx} className="bg-gray-900 rounded-2xl p-6 shadow-sm border border-gray-800">
                <div className="flex justify-between items-center mb-4 pb-4 border-b border-gray-800">
                  <h3 className="text-lg font-bold text-gray-100">Day {day.day} {day.date && <span className="text-gray-500 text-sm font-normal ml-2">{day.date}</span>}</h3>
                  {day.dailyCost && <span className="bg-green-900/30 text-green-400 px-3 py-1 rounded-full text-sm font-medium">{day.dailyCost}</span>}
                </div>
                <div className="space-y-4">
                  {day.activities.map((act, aIdx) => (
                    <div key={aIdx} className="flex gap-4">
                      <div className="w-24 shrink-0 text-sm font-medium text-gray-500 pt-1">{act.time}</div>
                      <div>
                        <h4 className="font-semibold text-gray-200">{act.title}</h4>
                        <p className="text-sm text-gray-400 mt-1">{act.description}</p>
                        <div className="flex items-center gap-4 mt-2">
                          <span className="text-xs text-gray-500 flex items-center gap-1"><MapPin className="w-3 h-3" /> {act.locationName}</span>
                          {act.cost && <span className="text-xs text-gray-500 flex items-center gap-1"><DollarSign className="w-3 h-3" /> {act.cost}</span>}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Accommodations */}
      {trip.accommodations && trip.accommodations.length > 0 && (
        <section>
          <h2 className="text-2xl font-bold text-gray-100 mb-4 flex items-center gap-2">
            <Home className="w-6 h-6 text-indigo-500" />
            Accommodations
          </h2>
          <div className="grid md:grid-cols-2 gap-4">
            {trip.accommodations.map((acc, idx) => (
              <div key={idx} className="bg-gray-900 rounded-2xl p-5 shadow-sm border border-gray-800">
                <div className="flex justify-between items-start mb-2">
                  <h3 className="font-bold text-gray-200">{acc.name}</h3>
                  <span className="bg-indigo-900/30 text-indigo-400 px-2 py-1 rounded text-xs font-semibold">{acc.type}</span>
                </div>
                <p className="text-sm text-gray-400 mb-3">{acc.description}</p>
                <div className="flex items-center gap-4 text-sm text-gray-500">
                  <span>{acc.price}</span>
                  {acc.rating && <span>⭐ {acc.rating}</span>}
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      <div className="grid md:grid-cols-2 gap-8">
        {/* Checklists */}
        {trip.checklists && (
          <section className="bg-gray-900 rounded-2xl p-6 shadow-sm border border-gray-800">
            <h2 className="text-xl font-bold text-gray-100 mb-4 flex items-center gap-2">
              <CheckSquare className="w-5 h-5 text-emerald-500" />
              Packing & Documents
            </h2>
            <div className="space-y-4">
              <div>
                <h3 className="font-semibold text-gray-300 mb-2">Documents</h3>
                <ul className="list-disc pl-5 text-sm text-gray-400 space-y-1">
                  {trip.checklists.documents.map((doc, i) => <li key={i}>{doc}</li>)}
                </ul>
              </div>
              <div>
                <h3 className="font-semibold text-gray-300 mb-2">Packing</h3>
                <ul className="list-disc pl-5 text-sm text-gray-400 space-y-1">
                  {trip.checklists.packing.map((item, i) => <li key={i}>{item}</li>)}
                </ul>
              </div>
            </div>
          </section>
        )}

        {/* Safety & Emergency */}
        <section className="bg-gray-900 rounded-2xl p-6 shadow-sm border border-gray-800">
          <h2 className="text-xl font-bold text-gray-100 mb-4 flex items-center gap-2">
            <Shield className="w-5 h-5 text-red-500" />
            Safety & Emergency
          </h2>
          <div className="space-y-4">
            {trip.emergency && (
              <div className="bg-red-900/20 p-4 rounded-xl text-sm border border-red-900/50">
                <p><strong className="text-red-400">Police:</strong> <span className="text-gray-300">{trip.emergency.police}</span></p>
                <p><strong className="text-red-400">Hospital:</strong> <span className="text-gray-300">{trip.emergency.hospital}</span></p>
                <p><strong className="text-red-400">Embassy:</strong> <span className="text-gray-300">{trip.emergency.embassy}</span></p>
              </div>
            )}
            {trip.safety && (
              <ul className="list-disc pl-5 text-sm text-gray-400 space-y-1">
                {trip.safety.map((tip, i) => <li key={i}>{tip}</li>)}
              </ul>
            )}
          </div>
        </section>
      </div>
      </div>
    </div>
  );
}
