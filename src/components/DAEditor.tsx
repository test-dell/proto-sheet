import { useState } from 'react';
import { Button } from './ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Textarea } from './ui/textarea';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/table';
import { Badge } from './ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from './ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from './ui/alert-dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { ScrollArea } from './ui/scroll-area';
import { ArrowLeft, Save, Share2, Plus, Trash2, Trophy, Eye } from 'lucide-react';
import { DASheet, Template, Vendor, JudgmentEvaluation, VendorScores, SharedAccess, AccessLevel } from '../types/da-types';
import { toast } from 'sonner@2.0.3';
import { DAPreview } from './DAPreview';

interface DAEditorProps {
  sheet: DASheet;
  template: Template;
  onSave: (sheet: DASheet) => void;
  onBack: () => void;
}

export function DAEditor({ sheet: initialSheet, template, onSave, onBack }: DAEditorProps) {
  const [sheet, setSheet] = useState<DASheet>(initialSheet);
  const [isVendorDialogOpen, setIsVendorDialogOpen] = useState(false);
  const [isShareDialogOpen, setIsShareDialogOpen] = useState(false);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [showWeightageAlert, setShowWeightageAlert] = useState(false);
  const [weightageAlertMessage, setWeightageAlertMessage] = useState('');
  const [editingVendor, setEditingVendor] = useState<Vendor | null>(null);
  const [vendorFormData, setVendorFormData] = useState({
    name: ''
  });
  const [shareFormData, setShareFormData] = useState({
    email: '',
    accessLevel: 'view' as 'view' | 'edit'
  });

  // Calculate category weightages from sum of parameters
  const getCategoryWeightage = (categoryId: string): number => {
    const category = template.categories.find(c => c.id === categoryId);
    if (!category) return 0;
    return category.parameters.reduce((sum, param) => sum + param.weightage, 0);
  };

  // Calculate total weightage
  const getTotalWeightage = (): number => {
    return template.categories.reduce((sum, cat) => sum + getCategoryWeightage(cat.id), 0);
  };

  const createEmptyVendorScores = (): VendorScores => {
    const scores: any = {};
    template.categories.forEach(category => {
      scores[category.id] = {
        evaluations: category.parameters.map(param => ({
          parameterId: param.id,
          evalScore: 0,
          result: 0,
          vendorComment: ''
        })),
        subTotal: 0
      };
    });
    return scores;
  };

  const calculateResult = (evalScore: number, weightage: number): number => {
    return evalScore * weightage;
  };

  const calculateSubTotal = (evaluations: JudgmentEvaluation[]): number => {
    return evaluations.reduce((sum, ev) => sum + ev.result, 0);
  };

  const calculateOverallScore = (scores: VendorScores): number => {
    let total = 0;
    template.categories.forEach(category => {
      total += scores[category.id]?.subTotal || 0;
    });
    return Math.round(total * 10) / 10;
  };

  const handleAddVendor = () => {
    setEditingVendor(null);
    setVendorFormData({ name: '' });
    setIsVendorDialogOpen(true);
  };

  const handleEditVendor = (vendor: Vendor) => {
    setEditingVendor(vendor);
    setVendorFormData({ name: vendor.name });
    setIsVendorDialogOpen(true);
  };

  const handleSaveVendor = () => {
    if (!vendorFormData.name) {
      toast.error('Please enter vendor name');
      return;
    }

    if (editingVendor) {
      // Update existing vendor
      setSheet(prev => ({
        ...prev,
        vendors: prev.vendors.map(v =>
          v.id === editingVendor.id
            ? { ...v, name: vendorFormData.name }
            : v
        )
      }));
      toast.success('Vendor updated');
    } else {
      // Add new vendor
      const newVendor: Vendor = {
        id: `vendor-${Date.now()}`,
        name: vendorFormData.name,
        scores: createEmptyVendorScores(),
        overallScore: 0,
        notes: ''
      };
      setSheet(prev => ({
        ...prev,
        vendors: [...prev.vendors, newVendor]
      }));
      toast.success('Vendor added');
    }

    setIsVendorDialogOpen(false);
  };

  const handleDeleteVendor = (vendorId: string) => {
    if (window.confirm('Are you sure you want to delete this vendor?')) {
      setSheet(prev => ({
        ...prev,
        vendors: prev.vendors.filter(v => v.id !== vendorId)
      }));
      toast.success('Vendor deleted');
    }
  };

  const handleEvalChange = (vendorId: string, categoryId: string, paramId: string, newEvalScore: number) => {
    // Ensure integer value between 0-10
    const clampedEval = Math.max(0, Math.min(10, Math.round(newEvalScore)));
    
    setSheet(prev => ({
      ...prev,
      vendors: prev.vendors.map(vendor => {
        if (vendor.id !== vendorId) return vendor;

        const category = template.categories.find(c => c.id === categoryId);
        if (!category) return vendor;
        
        const param = category.parameters.find(p => p.id === paramId);
        if (!param) return vendor;

        const result = calculateResult(clampedEval, param.weightage);
        
        const updatedEvaluations = vendor.scores[categoryId].evaluations.map(ev =>
          ev.parameterId === paramId
            ? { ...ev, evalScore: clampedEval, result }
            : ev
        );

        const subTotal = calculateSubTotal(updatedEvaluations);

        const updatedScores = {
          ...vendor.scores,
          [categoryId]: {
            evaluations: updatedEvaluations,
            subTotal
          }
        };

        const overallScore = calculateOverallScore(updatedScores);

        return {
          ...vendor,
          scores: updatedScores,
          overallScore
        };
      })
    }));
  };

  const handleVendorCommentChange = (vendorId: string, categoryId: string, paramId: string, comment: string) => {
    setSheet(prev => ({
      ...prev,
      vendors: prev.vendors.map(vendor => {
        if (vendor.id !== vendorId) return vendor;

        const updatedEvaluations = vendor.scores[categoryId].evaluations.map(ev =>
          ev.parameterId === paramId
            ? { ...ev, vendorComment: comment }
            : ev
        );

        return {
          ...vendor,
          scores: {
            ...vendor.scores,
            [categoryId]: {
              ...vendor.scores[categoryId],
              evaluations: updatedEvaluations
            }
          }
        };
      })
    }));
  };

  const handleSave = () => {
    onSave(sheet);
    toast.success('DA Sheet saved successfully');
  };

  const handlePreview = () => {
    setIsPreviewOpen(true);
  };

  const handleExportPDF = () => {
    setIsPreviewOpen(false);
    toast.success('Exporting DA Sheet as PDF...');
    setTimeout(() => {
      toast.success('PDF downloaded successfully');
    }, 1000);
  };

  const handleShare = () => {
    setIsShareDialogOpen(true);
  };

  const handleAddShare = () => {
    if (!shareFormData.email) {
      toast.error('Please enter an email address');
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(shareFormData.email)) {
      toast.error('Please enter a valid email address');
      return;
    }

    const alreadyShared = sheet.sharedWith?.some(access => access.email === shareFormData.email);
    if (alreadyShared) {
      toast.error('This email has already been granted access');
      return;
    }

    const newAccess: SharedAccess = {
      email: shareFormData.email,
      accessLevel: shareFormData.accessLevel,
      sharedAt: new Date()
    };

    setSheet(prev => ({
      ...prev,
      sharedWith: [...(prev.sharedWith || []), newAccess]
    }));

    setShareFormData({ email: '', accessLevel: 'view' });
    toast.success(`Access granted to ${newAccess.email}`);
  };

  const handleRemoveShare = (email: string) => {
    setSheet(prev => ({
      ...prev,
      sharedWith: prev.sharedWith?.filter(access => access.email !== email)
    }));
    toast.success('Access removed');
  };

  const handleUpdateAccessLevel = (email: string, newAccessLevel: AccessLevel) => {
    setSheet(prev => ({
      ...prev,
      sharedWith: prev.sharedWith?.map(access =>
        access.email === email ? { ...access, accessLevel: newAccessLevel } : access
      )
    }));
    toast.success('Access level updated');
  };

  const topVendor = sheet.vendors.length > 0
    ? sheet.vendors.reduce((top, vendor) => vendor.overallScore > top.overallScore ? vendor : top)
    : null;

  return (
    <div>
      {/* Header */}
      <header className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button variant="ghost" onClick={onBack}>
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back
              </Button>
              <div className="border-l pl-4">
                <h1 className="text-2xl text-gray-900 font-bold" style={{ fontFamily: 'system-ui, -apple-system, sans-serif' }}>
                  {sheet.name}
                </h1>
                <p className="text-gray-600 text-sm mt-1">Template: {template.name}</p>
              </div>
            </div>
            <div className="flex gap-2">
              <Button onClick={handleSave} className="bg-indigo-600 hover:bg-indigo-700">
                <Save className="w-4 h-4 mr-2" />
                Save
              </Button>
              <Button variant="outline" onClick={handleShare}>
                <Share2 className="w-4 h-4 mr-2" />
                Share
              </Button>
              <Button variant="outline" onClick={handlePreview}>
                <Eye className="w-4 h-4 mr-2" />
                Preview
              </Button>
            </div>
          </div>
          
          {/* Category Weightages Bar */}
          <div className="mt-4 flex flex-wrap items-center gap-3 bg-gray-50 p-3 rounded-lg">
            {template.categories.map(category => {
              const weightage = getCategoryWeightage(category.id);
              return (
                <Badge key={category.id} variant="outline" className="text-sm">
                  {category.name} {weightage}%
                </Badge>
              );
            })}
            <div className="ml-auto">
              <Badge variant={getTotalWeightage() > 100 ? "destructive" : "default"}>
                Total: {getTotalWeightage()}%
              </Badge>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Top Vendor Card */}
        {topVendor && (
          <Card className="mb-6 bg-gradient-to-r from-amber-50 to-orange-50 border-amber-200">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="bg-amber-100 p-3 rounded-full">
                    <Trophy className="w-6 h-6 text-amber-600" />
                  </div>
                  <div>
                    <p className="text-sm text-amber-800">Top Recommended Vendor</p>
                    <p className="text-xl text-gray-900">{topVendor.name}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm text-amber-800">Overall Score</p>
                  <p className="text-3xl text-amber-600">{topVendor.overallScore}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Vendors Section */}
        <Card className="mb-6">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Vendors</CardTitle>
                <CardDescription>Add and evaluate vendors</CardDescription>
              </div>
              <Button onClick={handleAddVendor} className="bg-indigo-600 hover:bg-indigo-700">
                <Plus className="w-4 h-4 mr-2" />
                Add Vendor
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {sheet.vendors.length === 0 ? (
              <div className="text-center py-12 text-gray-600">
                <p>No vendors added yet. Click "Add Vendor" to get started.</p>
              </div>
            ) : (
              <div className="flex gap-2 overflow-x-auto pb-2">
                {sheet.vendors.map(vendor => (
                  <Card key={vendor.id} className="flex-shrink-0 w-64">
                    <CardHeader>
                      <div className="flex items-start justify-between">
                        <CardTitle className="text-base">{vendor.name}</CardTitle>
                        <div className="flex gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleEditVendor(vendor)}
                          >
                            <Plus className="w-3 h-3" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDeleteVendor(vendor.id)}
                          >
                            <Trash2 className="w-3 h-3 text-red-600" />
                          </Button>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="text-center">
                        <p className="text-sm text-gray-600">Overall Score</p>
                        <p className="text-3xl text-indigo-600">{vendor.overallScore}</p>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Evaluation Matrix */}
        {sheet.vendors.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Vendor Evaluation Matrix</CardTitle>
              <CardDescription>Score vendors across all judgement parameters</CardDescription>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[600px] pr-4">
                <div className="space-y-8">
                  {/* Display all categories */}
                  {template.categories.map((category) => (
                    <div key={category.id} className="space-y-3">
                      {/* Category Header */}
                      <div className="flex items-center gap-3 bg-gray-100 p-3 rounded-lg sticky top-0 z-10">
                        <h3 className="text-base font-semibold text-gray-900">{category.name}</h3>
                        <Badge variant="secondary">
                          {getCategoryWeightage(category.id)}%
                        </Badge>
                      </div>

                      {/* Evaluation Table for Category */}
                      <div className="overflow-x-auto border rounded-lg">
                        <Table>
                          <TableHeader>
                            <TableRow className="bg-gray-50">
                              <TableHead className="w-[15%]">Judgement Parameter</TableHead>
                              <TableHead className="w-[6%]">W%</TableHead>
                              {sheet.vendors.map(vendor => (
                                <TableHead key={vendor.id} className="text-center border-l" colSpan={3}>
                                  {vendor.name}
                                </TableHead>
                              ))}
                            </TableRow>
                            <TableRow className="bg-gray-50">
                              <TableHead colSpan={2}></TableHead>
                              {sheet.vendors.map(vendor => (
                                <>
                                  <TableHead key={`${vendor.id}-comment`} className="text-center text-xs px-1 border-l">
                                    Comment
                                  </TableHead>
                                  <TableHead key={`${vendor.id}-eval`} className="text-center text-xs px-1">
                                    Eval
                                  </TableHead>
                                  <TableHead key={`${vendor.id}-result`} className="text-center text-xs px-1">
                                    Result
                                  </TableHead>
                                </>
                              ))}
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {category.parameters.map(param => (
                              <TableRow key={param.id}>
                                <TableCell className="align-top">
                                  <p className="text-sm text-gray-900">{param.name}</p>
                                </TableCell>
                                <TableCell className="align-top text-center">
                                  <p className="text-sm text-gray-900">{param.weightage}%</p>
                                </TableCell>
                                {sheet.vendors.map(vendor => {
                                  const evaluation = vendor.scores[category.id]?.evaluations.find(
                                    ev => ev.parameterId === param.id
                                  );
                                  return (
                                    <>
                                      <TableCell key={`${vendor.id}-${param.id}-comment`} className="align-top border-l px-1">
                                        <Textarea
                                          value={evaluation?.vendorComment || ''}
                                          onChange={(e) => handleVendorCommentChange(vendor.id, category.id, param.id, e.target.value)}
                                          className="text-xs min-h-[60px]"
                                          placeholder="Comment..."
                                        />
                                      </TableCell>
                                      <TableCell key={`${vendor.id}-${param.id}-eval`} className="align-top px-1">
                                        <Input
                                          type="number"
                                          min={0}
                                          max={10}
                                          step={1}
                                          value={evaluation?.evalScore || 0}
                                          onChange={(e) => handleEvalChange(
                                            vendor.id,
                                            category.id,
                                            param.id,
                                            Number(e.target.value)
                                          )}
                                          className="w-16 text-center"
                                        />
                                      </TableCell>
                                      <TableCell key={`${vendor.id}-${param.id}-result`} className="align-top text-center bg-gray-50 px-1">
                                        <p className="text-indigo-600">{evaluation?.result || 0}</p>
                                      </TableCell>
                                    </>
                                  );
                                })}
                              </TableRow>
                            ))}
                            {/* Subtotal Row */}
                            <TableRow className="bg-gray-100">
                              <TableCell colSpan={2}>
                                <p className="font-semibold">Sub-total</p>
                              </TableCell>
                              {sheet.vendors.map(vendor => (
                                <>
                                  <TableCell key={`${vendor.id}-subtotal-comment`} className="border-l"></TableCell>
                                  <TableCell key={`${vendor.id}-subtotal-eval`}></TableCell>
                                  <TableCell key={`${vendor.id}-subtotal`} className="text-center bg-gray-50">
                                    <p className="text-indigo-600 font-semibold">{vendor.scores[category.id]?.subTotal || 0}</p>
                                  </TableCell>
                                </>
                              ))}
                            </TableRow>
                          </TableBody>
                        </Table>
                      </div>
                    </div>
                  ))}

                  {/* Grand Total */}
                  <div className="mt-6 border-t pt-4">
                    <div className="flex justify-end gap-8">
                      {sheet.vendors.map(vendor => (
                        <div key={vendor.id} className="text-center">
                          <p className="text-sm text-gray-600">{vendor.name}</p>
                          <p className="text-2xl text-indigo-600">
                            {vendor.overallScore}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        )}
      </main>

      {/* Vendor Dialog */}
      <Dialog open={isVendorDialogOpen} onOpenChange={setIsVendorDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingVendor ? 'Edit Vendor' : 'Add New Vendor'}</DialogTitle>
            <DialogDescription>
              Enter vendor name
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="vendor-name">Vendor Name *</Label>
              <Input
                id="vendor-name"
                value={vendorFormData.name}
                onChange={(e) => setVendorFormData(prev => ({ ...prev, name: e.target.value }))}
                placeholder="e.g., ServiceNow"
              />
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setIsVendorDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSaveVendor} className="bg-indigo-600 hover:bg-indigo-700">
              {editingVendor ? 'Update' : 'Add'} Vendor
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Share Dialog */}
      <Dialog open={isShareDialogOpen} onOpenChange={setIsShareDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Share DA Sheet</DialogTitle>
            <DialogDescription>
              Grant others access to view or edit this DA sheet
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="flex gap-2">
              <div className="flex-1">
                <Input
                  placeholder="Enter email address"
                  value={shareFormData.email}
                  onChange={(e) => setShareFormData(prev => ({ ...prev, email: e.target.value }))}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      handleAddShare();
                    }
                  }}
                />
              </div>
              <Select
                value={shareFormData.accessLevel}
                onValueChange={(value: 'view' | 'edit') => 
                  setShareFormData(prev => ({ ...prev, accessLevel: value }))
                }
              >
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="view">View</SelectItem>
                  <SelectItem value="edit">Edit</SelectItem>
                </SelectContent>
              </Select>
              <Button onClick={handleAddShare} className="bg-indigo-600 hover:bg-indigo-700">
                Add
              </Button>
            </div>

            {sheet.sharedWith && sheet.sharedWith.length > 0 && (
              <div className="space-y-2">
                <Label>People with access</Label>
                <div className="border rounded-lg divide-y">
                  {sheet.sharedWith.map((access) => (
                    <div key={access.email} className="flex items-center justify-between p-3">
                      <div>
                        <p className="text-sm text-gray-900">{access.email}</p>
                        <p className="text-xs text-gray-600">
                          Shared on {access.sharedAt.toLocaleDateString()}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Select
                          value={access.accessLevel}
                          onValueChange={(value: AccessLevel) => 
                            handleUpdateAccessLevel(access.email, value)
                          }
                        >
                          <SelectTrigger className="w-24">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="view">View</SelectItem>
                            <SelectItem value="edit">Edit</SelectItem>
                          </SelectContent>
                        </Select>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleRemoveShare(access.email)}
                        >
                          <Trash2 className="w-4 h-4 text-red-600" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Preview Modal */}
      {isPreviewOpen && (
        <DAPreview
          sheet={sheet}
          template={template}
          onClose={() => setIsPreviewOpen(false)}
          onExport={handleExportPDF}
        />
      )}

      {/* Weightage Alert Dialog */}
      <AlertDialog open={showWeightageAlert} onOpenChange={setShowWeightageAlert}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Weightage Issue Detected</AlertDialogTitle>
            <AlertDialogDescription>
              {weightageAlertMessage}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogAction onClick={() => setShowWeightageAlert(false)}>
              OK
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}