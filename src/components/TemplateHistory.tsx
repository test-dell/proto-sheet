import { useState } from 'react';
import { Button } from './ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Input } from './ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Badge } from './ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/table';
import { ArrowLeft, Search, Download, Copy, Edit, Trash2 } from 'lucide-react';
import { DASheet, DAType } from '../types/da-types';
import { toast } from 'sonner';

interface TemplateHistoryProps {
  daSheets: DASheet[];
  onEditSheet: (sheet: DASheet) => void;
  onDuplicateSheet: (sheet: DASheet) => DASheet;
  onDeleteSheet: (sheetId: string) => void;
  onBack: () => void;
}

export function TemplateHistory({ 
  daSheets, 
  onEditSheet, 
  onDuplicateSheet, 
  onDeleteSheet,
  onBack 
}: TemplateHistoryProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<DAType | 'All'>('All');

  const filteredSheets = daSheets.filter(sheet => {
    const matchesSearch = sheet.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         sheet.createdBy.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesType = filterType === 'All' || sheet.type === filterType;
    
    return matchesSearch && matchesType;
  });

  const handleExportPDF = (sheet: DASheet) => {
    toast.success(`Exporting "${sheet.name}" as PDF...`);
    setTimeout(() => {
      toast.success('PDF downloaded successfully');
    }, 1000);
  };

  const handleDuplicate = (sheet: DASheet) => {
    const duplicated = onDuplicateSheet(sheet);
    toast.success(`Created duplicate: "${duplicated.name}"`);
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
      <header className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center gap-4">
            <Button variant="ghost" onClick={onBack}>
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Dashboard
            </Button>
            <div className="border-l pl-4">
              <h1 className="text-gray-900">DA Sheet History</h1>
              <p className="text-gray-600 text-sm">View and manage previous DA sheets</p>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Filters */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Search & Filter</CardTitle>
            <CardDescription>Find specific DA sheets quickly</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input
                  placeholder="Search by name or creator..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>

              <Select value={filterType} onValueChange={(value) => setFilterType(value as DAType | 'All')}>
                <SelectTrigger>
                  <SelectValue placeholder="Filter by template type..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="All">All Types</SelectItem>
                  <SelectItem value="License">License</SelectItem>
                  <SelectItem value="Custom Development">Custom Development</SelectItem>
                  <SelectItem value="SaaS">SaaS</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Results */}
        <Card>
          <CardHeader>
            <CardTitle>DA Sheets ({filteredSheets.length})</CardTitle>
            <CardDescription>
              {searchQuery || filterType !== 'All'
                ? `Showing ${filteredSheets.length} of ${daSheets.length} sheets`
                : 'All DA sheets'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {filteredSheets.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-gray-600">No DA sheets found matching your criteria</p>
              </div>
            ) : (
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>DA Sheet Name</TableHead>
                      <TableHead>Version</TableHead>
                      <TableHead>Created By</TableHead>
                      <TableHead>Created Date</TableHead>
                      <TableHead>Last Updated</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredSheets
                      .sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime())
                      .map((sheet) => (
                      <TableRow key={sheet.id}>
                        <TableCell>
                          <p className="text-gray-900">{sheet.name}</p>
                        </TableCell>
                        <TableCell>
                          <Badge variant="secondary">v{sheet.version}</Badge>
                        </TableCell>
                        <TableCell>{sheet.createdBy}</TableCell>
                        <TableCell>{sheet.createdAt.toLocaleDateString()}</TableCell>
                        <TableCell>{sheet.updatedAt.toLocaleDateString()}</TableCell>
                        <TableCell>
                          <div className="flex items-center justify-end gap-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => onEditSheet(sheet)}
                              className="hover:bg-indigo-50 hover:text-indigo-600"
                              title="Edit"
                            >
                              <Edit className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDuplicate(sheet)}
                              className="hover:bg-blue-50 hover:text-blue-600"
                              title="Duplicate"
                            >
                              <Copy className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleExportPDF(sheet)}
                              className="hover:bg-green-50 hover:text-green-600"
                              title="Export PDF"
                            >
                              <Download className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDelete(sheet)}
                              className="hover:bg-red-50 hover:text-red-600"
                              title="Delete"
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