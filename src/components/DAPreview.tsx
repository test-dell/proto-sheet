import { useState } from 'react';
import { Button } from './ui/button';
import { Card, CardContent } from './ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/table';
import { X, Download, ZoomIn, ZoomOut } from 'lucide-react';
import { DASheet, Template } from '../types/da-types';

interface DAPreviewProps {
  sheet: DASheet;
  template: Template;
  onClose: () => void;
  onExport: () => void;
}

export function DAPreview({ sheet, template, onClose, onExport }: DAPreviewProps) {
  const [zoom, setZoom] = useState(100);

  const getCategoryWeightage = (categoryId: string): number => {
    const category = template.categories.find(c => c.id === categoryId);
    if (!category) return 0;
    return category.parameters.reduce((sum, param) => sum + param.weightage, 0);
  };

  const handleZoomIn = () => {
    setZoom(prev => Math.min(prev + 10, 150));
  };

  const handleZoomOut = () => {
    setZoom(prev => Math.max(prev - 10, 50));
  };

  // Find highest scoring vendor
  const topVendor = sheet.vendors.length > 0
    ? sheet.vendors.reduce((top, vendor) => vendor.overallScore > top.overallScore ? vendor : top)
    : null;

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-[95vw] h-[90vh] flex flex-col">
        {/* Header */}
        <div className="border-b px-6 py-4 flex items-center justify-between flex-shrink-0">
          <div>
            <h2 className="text-lg text-gray-900">DA Sheet Preview</h2>
            <p className="text-xs text-gray-600">Review before exporting</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={handleZoomOut}>
              <ZoomOut className="w-4 h-4" />
            </Button>
            <span className="text-sm px-3 py-2 text-gray-600">{zoom}%</span>
            <Button variant="outline" size="sm" onClick={handleZoomIn}>
              <ZoomIn className="w-4 h-4" />
            </Button>
            <Button onClick={onExport} className="bg-indigo-600 hover:bg-indigo-700">
              <Download className="w-4 h-4 mr-2" />
              Export PDF
            </Button>
            <Button variant="ghost" onClick={onClose}>
              <X className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Content - Scrollable with zoom */}
        <div className="flex-1 overflow-auto bg-gray-100 p-6">
          <div 
            className="bg-white mx-auto shadow-lg"
            style={{ 
              transform: `scale(${zoom / 100})`,
              transformOrigin: 'top center',
              width: '100%',
              maxWidth: '297mm',
              minHeight: '210mm',
              padding: '15mm'
            }}
          >
            {/* Header */}
            <div className="flex items-start justify-between pb-3 border-b mb-4">
              <div>
                <h1 className="text-lg font-bold text-gray-900">{sheet.name}</h1>
                <p className="text-xs text-gray-600">Template: {template.name}</p>
              </div>
              <div className="text-right text-xs text-gray-600">
                <p>Created By: {sheet.createdBy}</p>
                <p>Created: {sheet.createdAt.toLocaleDateString()}</p>
              </div>
            </div>

            {/* Evaluation Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-[8px] border-collapse">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-1 px-1 border-r">Model Item</th>
                    <th className="text-left py-1 px-1 border-r">Judgement Parameters</th>
                    <th className="text-center py-1 px-1 border-r">Weight</th>
                    {sheet.vendors.map(vendor => (
                      <th 
                        key={vendor.id} 
                        colSpan={3} 
                        className={`text-center py-1 px-1 border-r ${
                          topVendor?.id === vendor.id ? 'bg-amber-100' : ''
                        }`}
                      >
                        {vendor.name}
                        {topVendor?.id === vendor.id && (
                          <span className="ml-1 text-amber-600">★</span>
                        )}
                      </th>
                    ))}
                  </tr>
                  <tr className="border-b bg-gray-50">
                    <th className="py-1 px-1 border-r"></th>
                    <th className="py-1 px-1 border-r"></th>
                    <th className="py-1 px-1 border-r"></th>
                    {sheet.vendors.map(vendor => (
                      <>
                        <th key={`${vendor.id}-comment`} className={`text-center py-1 px-1 border-r text-[7px] ${
                          topVendor?.id === vendor.id ? 'bg-amber-50' : ''
                        }`}>Comment</th>
                        <th key={`${vendor.id}-eval`} className={`text-center py-1 px-1 border-r text-[7px] ${
                          topVendor?.id === vendor.id ? 'bg-amber-50' : ''
                        }`}>Eval</th>
                        <th key={`${vendor.id}-result`} className={`text-center py-1 px-1 border-r text-[7px] ${
                          topVendor?.id === vendor.id ? 'bg-amber-50' : ''
                        }`}>Result</th>
                      </>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {template.categories.map((category, catIndex) => (
                    <>
                      {category.parameters.map((param, paramIndex) => (
                        <tr key={param.id} className="border-b">
                          {paramIndex === 0 && (
                            <td 
                              rowSpan={category.parameters.length + 1}
                              className="py-1 px-1 border-r align-top font-semibold"
                            >
                              {category.name}
                            </td>
                          )}
                          <td className="py-1 px-1 border-r">{param.name}</td>
                          <td className="text-center py-1 px-1 border-r">{param.weightage}</td>
                          {sheet.vendors.map(vendor => {
                            const evaluation = vendor.scores[category.id]?.evaluations.find(
                              ev => ev.parameterId === param.id
                            );
                            return (
                              <>
                                <td key={`${vendor.id}-${param.id}-comment`} className={`py-1 px-1 border-r text-[7px] ${
                                  topVendor?.id === vendor.id ? 'bg-amber-50' : ''
                                }`}>
                                  {evaluation?.vendorComment || '-'}
                                </td>
                                <td key={`${vendor.id}-${param.id}-eval`} className={`text-center py-1 px-1 border-r ${
                                  topVendor?.id === vendor.id ? 'bg-amber-50' : ''
                                }`}>
                                  {evaluation?.evalScore || 0}
                                </td>
                                <td key={`${vendor.id}-${param.id}-result`} className={`text-center py-1 px-1 border-r ${
                                  topVendor?.id === vendor.id ? 'bg-amber-50' : ''
                                }`}>
                                  {evaluation?.result || 0}
                                </td>
                              </>
                            );
                          })}
                        </tr>
                      ))}
                      {/* Subtotal */}
                      <tr className="bg-gray-100 border-b">
                        <td className="py-1 px-1 border-r font-semibold">Sub-total</td>
                        <td className="py-1 px-1 border-r"></td>
                        {sheet.vendors.map(vendor => (
                          <>
                            <td key={`${vendor.id}-subtotal-empty1`} className={`border-r ${
                              topVendor?.id === vendor.id ? 'bg-amber-100' : ''
                            }`}></td>
                            <td key={`${vendor.id}-subtotal-empty2`} className={`border-r ${
                              topVendor?.id === vendor.id ? 'bg-amber-100' : ''
                            }`}></td>
                            <td key={`${vendor.id}-subtotal`} className={`text-center py-1 px-1 border-r font-semibold ${
                              topVendor?.id === vendor.id ? 'bg-amber-100' : ''
                            }`}>
                              {vendor.scores[category.id]?.subTotal || 0}
                            </td>
                          </>
                        ))}
                      </tr>
                    </>
                  ))}
                  {/* Grand Total */}
                  <tr className="bg-gray-200 font-semibold">
                    <td colSpan={3} className="py-1 px-1 border-r">Grand Total</td>
                    {sheet.vendors.map(vendor => (
                      <>
                        <td key={`${vendor.id}-total-empty1`} className={`border-r ${
                          topVendor?.id === vendor.id ? 'bg-amber-200' : ''
                        }`}></td>
                        <td key={`${vendor.id}-total-empty2`} className={`border-r ${
                          topVendor?.id === vendor.id ? 'bg-amber-200' : ''
                        }`}></td>
                        <td key={`${vendor.id}-total`} className={`text-center py-1 px-1 border-r ${
                          topVendor?.id === vendor.id ? 'bg-amber-200 text-amber-900' : ''
                        }`}>
                          {vendor.overallScore}
                        </td>
                      </>
                    ))}
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}