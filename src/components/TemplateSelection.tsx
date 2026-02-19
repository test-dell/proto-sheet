import { useState } from 'react';
import { Button } from './ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Input } from './ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Label } from './ui/label';
import { Badge } from './ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/table';
import { AlertDialog, AlertDialogAction, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from './ui/alert-dialog';
import { ArrowLeft, ArrowRight, CheckCircle, Plus, Trash2 } from 'lucide-react';
import { Template, JudgmentParameter, CategoryData } from '../types/da-types';
import { toast } from 'sonner@2.0.3';
import { UserHeader } from './UserHeader';

interface User {
  empCode: string;
  role: 'admin' | 'user';
  email: string;
}

interface TemplateSelectionProps {
  user: User;
  onLogout: () => void;
  templates: Template[];
  onSelectTemplate: (template: Template, sheetName: string) => void;
  onBack: () => void;
}

export function TemplateSelection({ user, onLogout, templates, onSelectTemplate, onBack }: TemplateSelectionProps) {
  const [sheetName, setSheetName] = useState<string>('');
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>('');
  const [editedTemplate, setEditedTemplate] = useState<Template | null>(null);
  const [showWeightageAlert, setShowWeightageAlert] = useState(false);
  const [weightageAlertMessage, setWeightageAlertMessage] = useState('');

  const handleTemplateSelect = (templateId: string) => {
    setSelectedTemplateId(templateId);
    const template = templates.find(t => t.id === templateId);
    if (template) {
      // Create a deep copy for editing
      setEditedTemplate(JSON.parse(JSON.stringify(template)));
    }
  };

  const handleNext = () => {
    if (!sheetName.trim()) {
      toast.error('Please enter a DA Sheet name');
      return;
    }
    
    const totalWeightage = getTotalWeightage();
    
    // Check for weightage issues
    if (totalWeightage < 100) {
      setWeightageAlertMessage(`Total weightage is ${totalWeightage}%. It must be exactly 100% to proceed with vendor evaluation. Please adjust the judgement parameters.`);
      setShowWeightageAlert(true);
      return;
    }
    
    if (totalWeightage > 100) {
      setWeightageAlertMessage(`Total weightage is ${totalWeightage}%. It must be exactly 100% to proceed with vendor evaluation. Please reduce the judgement parameters.`);
      setShowWeightageAlert(true);
      return;
    }
    
    if (editedTemplate) {
      onSelectTemplate(editedTemplate, sheetName);
    }
  };

  // Calculate category weightage
  const getCategoryWeightage = (categoryId: string): number => {
    if (!editedTemplate) return 0;
    const category = editedTemplate.categories.find(c => c.id === categoryId);
    if (!category) return 0;
    return category.parameters.reduce((sum, param) => sum + param.weightage, 0);
  };

  // Calculate total weightage
  const getTotalWeightage = (): number => {
    if (!editedTemplate) return 0;
    return editedTemplate.categories.reduce((sum, cat) => sum + getCategoryWeightage(cat.id), 0);
  };

  const handleUpdateParameter = (categoryId: string, paramId: string, updates: Partial<JudgmentParameter>) => {
    if (!editedTemplate) return;

    setEditedTemplate({
      ...editedTemplate,
      categories: editedTemplate.categories.map(cat =>
        cat.id === categoryId
          ? {
              ...cat,
              parameters: cat.parameters.map(param =>
                param.id === paramId ? { ...param, ...updates } : param
              )
            }
          : cat
      )
    });
  };

  const handleAddParameter = (categoryId: string) => {
    if (!editedTemplate) return;

    const newParam: JudgmentParameter = {
      id: `param-${Date.now()}`,
      name: 'New Judgement Parameter',
      weightage: 5,
      comment: ''
    };

    setEditedTemplate({
      ...editedTemplate,
      categories: editedTemplate.categories.map(cat =>
        cat.id === categoryId
          ? { ...cat, parameters: [...cat.parameters, newParam] }
          : cat
      )
    });

    toast.success('Judgement parameter added');
  };

  const handleDeleteParameter = (categoryId: string, paramId: string) => {
    if (!editedTemplate) return;

    const category = editedTemplate.categories.find(c => c.id === categoryId);
    if (category && category.parameters.length <= 1) {
      toast.error('Cannot delete the last judgement parameter in a category');
      return;
    }

    if (window.confirm('Are you sure you want to delete this judgement parameter?')) {
      setEditedTemplate({
        ...editedTemplate,
        categories: editedTemplate.categories.map(cat =>
          cat.id === categoryId
            ? { ...cat, parameters: cat.parameters.filter(p => p.id !== paramId) }
            : cat
        )
      });

      toast.success('Judgement parameter deleted');
    }
  };

  const handleAddCategory = () => {
    if (!editedTemplate) return;

    const newCategory: CategoryData = {
      id: `category-${Date.now()}`,
      name: 'New Category',
      parameters: [
        {
          id: `param-${Date.now()}`,
          name: 'Judgement Parameter 1',
          weightage: 5,
          comment: ''
        }
      ]
    };

    setEditedTemplate({
      ...editedTemplate,
      categories: [...editedTemplate.categories, newCategory]
    });

    toast.success('Category added');
  };

  const handleDeleteCategory = (categoryId: string) => {
    if (!editedTemplate) return;

    if (editedTemplate.categories.length <= 1) {
      toast.error('Cannot delete the last category');
      return;
    }

    if (window.confirm('Are you sure you want to delete this category and all its judgement parameters?')) {
      setEditedTemplate({
        ...editedTemplate,
        categories: editedTemplate.categories.filter(c => c.id !== categoryId)
      });

      toast.success('Category deleted');
    }
  };

  const handleUpdateCategoryName = (categoryId: string, newName: string) => {
    if (!editedTemplate) return;

    setEditedTemplate({
      ...editedTemplate,
      categories: editedTemplate.categories.map(cat =>
        cat.id === categoryId ? { ...cat, name: newName } : cat
      )
    });
  };

  return (
    <div>
      {/* Header */}
      <header className="bg-gradient-to-r from-indigo-600 to-purple-600 border-b shadow-lg">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button variant="ghost" onClick={onBack} className="text-white hover:bg-white/10">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Dashboard
              </Button>
              <div className="border-l border-white/20 pl-4">
                <h1 className="text-white text-2xl font-bold">DA Editor</h1>
                <p className="text-indigo-100 text-sm">Choose a template to begin</p>
              </div>
            </div>
            <UserHeader user={user} onLogout={onLogout} />
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="space-y-6">
          {/* Step 1: Enter DA Sheet Name */}
          <Card>
            <CardHeader>
              <CardTitle>Step 1: Enter DA Sheet Name</CardTitle>
              <CardDescription>
                Provide a name for your decision analysis sheet
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <Label htmlFor="sheet-name">DA Sheet Name *</Label>
                <Input
                  id="sheet-name"
                  value={sheetName}
                  onChange={(e) => setSheetName(e.target.value)}
                  placeholder="e.g., Q1 2024 Vendor Evaluation"
                  className="max-w-xl"
                />
              </div>
            </CardContent>
          </Card>

          {/* Step 2: Template Selection */}
          <Card>
            <CardHeader>
              <CardTitle>Step 2: Select DA Template</CardTitle>
              <CardDescription>
                Choose a template for your decision analysis
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {templates.filter(t => t.isDeployed).map((template) => (
                  <Card
                    key={template.id}
                    className={`cursor-pointer transition-all ${
                      selectedTemplateId === template.id
                        ? 'border-indigo-600 bg-indigo-50'
                        : 'hover:border-gray-400'
                    }`}
                    onClick={() => handleTemplateSelect(template.id)}
                  >
                    <CardContent className="pt-6">
                      <div className="flex items-start justify-between mb-2">
                        <h3 className="text-gray-900">{template.name}</h3>
                        {selectedTemplateId === template.id && (
                          <CheckCircle className="w-5 h-5 text-indigo-600" />
                        )}
                      </div>
                      <p className="text-sm text-gray-600">{template.description}</p>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Template Preview & Customization */}
          {editedTemplate && (
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Step 3: Customize Template</CardTitle>
                    <CardDescription>
                      Add/remove categories and judgement parameters before creating your DA sheet
                    </CardDescription>
                  </div>
                  <div className="flex gap-2">
                    <Button onClick={handleAddCategory} variant="outline" size="sm">
                      <Plus className="w-4 h-4 mr-2" />
                      Add Category
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Weightage Summary */}
                <div className="flex flex-wrap items-center gap-3 bg-gray-50 p-3 rounded-lg">
                  {editedTemplate.categories.map(category => {
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

                {/* Categories & Parameters */}
                <div className="space-y-6">
                  {editedTemplate.categories.map((category) => (
                    <Card key={category.id} className="border-2">
                      <CardHeader>
                        <div className="flex items-center gap-3">
                          <Input
                            value={category.name}
                            onChange={(e) => handleUpdateCategoryName(category.id, e.target.value)}
                            className="max-w-xs"
                            placeholder="Category name"
                          />
                          <Badge variant="secondary">Total: {getCategoryWeightage(category.id)}%</Badge>
                          <div className="ml-auto flex gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleAddParameter(category.id)}
                            >
                              <Plus className="w-4 h-4 mr-2" />
                              Add Judgement Parameter
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDeleteCategory(category.id)}
                              className="text-red-600"
                            >
                              <Trash2 className="w-4 h-4 mr-2" />
                              Delete Category
                            </Button>
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead className="w-[70%]">Judgement Parameter Name</TableHead>
                              <TableHead className="w-[20%]">Weightage</TableHead>
                              <TableHead className="w-[10%]">Actions</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {category.parameters.map(param => (
                              <TableRow key={param.id}>
                                <TableCell>
                                  <Input
                                    value={param.name}
                                    onChange={(e) => handleUpdateParameter(category.id, param.id, { name: e.target.value })}
                                    placeholder="Judgement parameter name"
                                  />
                                </TableCell>
                                <TableCell>
                                  <Select
                                    value={param.weightage.toString()}
                                    onValueChange={(value) => handleUpdateParameter(category.id, param.id, { weightage: Number(value) as 5 | 10 | 15 | 20 | 25 | 30 })}
                                  >
                                    <SelectTrigger className="w-20">
                                      <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="5">5%</SelectItem>
                                      <SelectItem value="10">10%</SelectItem>
                                      <SelectItem value="15">15%</SelectItem>
                                      <SelectItem value="20">20%</SelectItem>
                                      <SelectItem value="25">25%</SelectItem>
                                      <SelectItem value="30">30%</SelectItem>
                                    </SelectContent>
                                  </Select>
                                </TableCell>
                                <TableCell>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => handleDeleteParameter(category.id, param.id)}
                                    className="text-red-600"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </Button>
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </CardContent>
                    </Card>
                  ))}
                </div>

                {/* Action Buttons */}
                <div className="flex justify-end gap-3 pt-4">
                  <Button variant="outline" onClick={onBack}>
                    Cancel
                  </Button>
                  <Button 
                    onClick={handleNext}
                    className="bg-indigo-600 hover:bg-indigo-700"
                    disabled={getTotalWeightage() !== 100}
                  >
                    Evaluate Vendors
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {!editedTemplate && (
            <Card>
              <CardContent className="py-8">
                <p className="text-center text-gray-600">
                  Select a template above to customize it
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      </main>

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