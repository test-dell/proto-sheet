import { useState } from 'react';
import { Button } from './ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/table';
import { 
  FileText, 
  Plus, 
  History, 
  Download, 
  Edit,
  Trash2,
  Settings,
  LayoutDashboard
} from 'lucide-react';
import { User, DASheet } from '../types/da-types';
import { toast } from 'sonner';
import { UserHeader } from './UserHeader';

interface DashboardProps {
  user: User;
  onLogout: () => void;
  daSheets: DASheet[];
  onCreateNew: () => void;
  onEditSheet: (sheet: DASheet) => void;
  onDeleteSheet: (sheetId: string) => void;
  onViewHistory: () => void;
  onManageTemplates: () => void;
}

export function Dashboard({ 
  user,
  onLogout,
  daSheets, 
  onCreateNew, 
  onEditSheet,
  onDeleteSheet,
  onViewHistory,
  onManageTemplates
}: DashboardProps) {
  const totalSheets = daSheets.length;

  const handleExportPDF = (sheet: DASheet) => {
    toast.success(`Exporting "${sheet.name}" as PDF...`);
    // Mock PDF export
    setTimeout(() => {
      toast.success('PDF downloaded successfully');
    }, 1000);
  };

  const handleDelete = (sheet: DASheet) => {
    if (window.confirm(`Are you sure you want to delete "${sheet.name}"?`)) {
      onDeleteSheet(sheet.id);
      toast.success('DA Sheet deleted successfully');
    }
  };

  return (
    <div>
      {/* Header */}
      <header className="bg-gradient-to-r from-indigo-600 to-purple-600 border-b shadow-lg">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="bg-white/20 backdrop-blur-sm p-3 rounded-xl">
                <LayoutDashboard className="w-8 h-8 text-white" />
              </div>
              <div>
                <h1 className="text-4xl text-white" style={{ fontFamily: 'system-ui, -apple-system, sans-serif', fontWeight: '700' }}>
                  DA Sheet Manager
                </h1>
                <p className="text-indigo-100 mt-1">Decision Analysis & Vendor Evaluation</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <UserHeader user={user} onLogout={onLogout} />
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm text-gray-600 mb-1">Total DA Sheets</p>
                  <p className="text-gray-900">{totalSheets}</p>
                </div>
                <div className="bg-indigo-100 p-2 rounded-lg">
                  <FileText className="w-5 h-5 text-indigo-600" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-3 mb-6">
          <Button 
            onClick={onCreateNew}
            className="bg-indigo-600 hover:bg-indigo-700"
          >
            <Plus className="w-4 h-4 mr-2" />
            Create New DA Sheet
          </Button>
          <Button 
            variant="outline"
            onClick={onManageTemplates}
          >
            <Settings className="w-4 h-4 mr-2" />
            Manage Templates
          </Button>
          <Button 
            variant="outline"
            onClick={onViewHistory}
          >
            <History className="w-4 h-4 mr-2" />
            View History
          </Button>
        </div>

        {/* DA Sheets List */}
        <Card>
          <CardHeader>
            <CardTitle>DA Sheets</CardTitle>
            <CardDescription>
              Manage and track all decision analysis sheets
            </CardDescription>
          </CardHeader>
          <CardContent>
            {daSheets.length === 0 ? (
              <div className="text-center py-12">
                <FileText className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <h3 className="text-gray-900 mb-2">No DA Sheets yet</h3>
                <p className="text-gray-600 mb-4">Create your first DA sheet to get started</p>
                <Button onClick={onCreateNew} className="bg-indigo-600 hover:bg-indigo-700">
                  <Plus className="w-4 h-4 mr-2" />
                  Create New DA Sheet
                </Button>
              </div>
            ) : (
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>DA Sheet Name</TableHead>
                      <TableHead>Version</TableHead>
                      <TableHead>Created By</TableHead>
                      <TableHead>Last Updated</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {daSheets.map((sheet) => (
                      <TableRow key={sheet.id}>
                        <TableCell>
                          <p className="text-gray-900">{sheet.name}</p>
                        </TableCell>
                        <TableCell>v{sheet.version}</TableCell>
                        <TableCell>{sheet.createdBy}</TableCell>
                        <TableCell>
                          {sheet.updatedAt.toLocaleDateString()}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center justify-end gap-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => onEditSheet(sheet)}
                              className="hover:bg-indigo-50 hover:text-indigo-600"
                            >
                              <Edit className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleExportPDF(sheet)}
                              className="hover:bg-green-50 hover:text-green-600"
                            >
                              <Download className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDelete(sheet)}
                              className="hover:bg-red-50 hover:text-red-600"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
}