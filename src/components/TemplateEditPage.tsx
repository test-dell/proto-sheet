import { useState } from 'react';
import { Button } from './ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Textarea } from './ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { AlertDialog, AlertDialogAction, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from './ui/alert-dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/table';
import { Badge } from './ui/badge';
import { ArrowLeft, Plus, Trash2, Save, Rocket } from 'lucide-react';
import { Template, JudgmentParameter, CategoryData } from '../types/da-types';
import { toast } from 'sonner@2.0.3';

interface TemplateEditPageProps {
  template: Template;
  onSave: (template: Template) => void;
  onPublish: (template: Template) => void;
  onBack: () => void;
}

export function TemplateEditPage({ template: initialTemplate, onSave, onPublish, onBack }: TemplateEditPageProps) {
  const [editingTemplate, setEditingTemplate] = useState<Template>(initialTemplate);
  const [showWeightageAlert, setShowWeightageAlert] = useState(false);

  // Calculate category weightage
  const getCategoryWeightage = (categoryId: string): number => {
    const category = editingTemplate.categories.find(c => c.id === categoryId);
    if (!category) return 0;
    return category.parameters.reduce((sum, param) => sum + param.weightage, 0);
  };

  // Calculate total weightage
  const getTotalWeightage = (): number => {
    return editingTemplate.categories.reduce((sum, cat) => sum + getCategoryWeightage(cat.id), 0);
  };

  const handleUpdateTemplateInfo = (updates: Partial<Template>) => {
    setEditingTemplate({ ...editingTemplate, ...updates });
  };

  const handleUpdateParameter = (categoryId: string, paramId: string, updates: Partial<JudgmentParameter>) => {
    setEditingTemplate({
      ...editingTemplate,
      categories: editingTemplate.categories.map(cat =>
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

    // Check if total weightage exceeds 100%
    if (updates.weightage !== undefined) {
      setTimeout(() => {
        const newTotal = getTotalWeightage();
        if (newTotal > 100) {
          setShowWeightageAlert(true);
        }
      }, 0);
    }
  };

  const handleAddParameter = (categoryId: string) => {
    const newParam: JudgmentParameter = {
      id: `param-${Date.now()}`,
      name: 'New Judgement Parameter',
      weightage: 5,
      comment: ''
    };

    setEditingTemplate({
      ...editingTemplate,
      categories: editingTemplate.categories.map(cat =>
        cat.id === categoryId
          ? { ...cat, parameters: [...cat.parameters, newParam] }
          : cat
      )
    });

    toast.success('Judgement parameter added');
  };

  const handleDeleteParameter = (categoryId: string, paramId: string) => {
    const category = editingTemplate.categories.find(c => c.id === categoryId);
    if (category && category.parameters.length <= 1) {
      toast.error('Cannot delete the last judgement parameter in a category');
      return;
    }

    if (window.confirm('Are you sure you want to delete this judgement parameter?')) {
      setEditingTemplate({
        ...editingTemplate,
        categories: editingTemplate.categories.map(cat =>
          cat.id === categoryId
            ? { ...cat, parameters: cat.parameters.filter(p => p.id !== paramId) }
            : cat
        )
      });

      toast.success('Judgement parameter deleted');
    }
  };

  const handleAddCategory = () => {
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

    setEditingTemplate({
      ...editingTemplate,
      categories: [...editingTemplate.categories, newCategory]
    });

    toast.success('Category added');
  };

  const handleDeleteCategory = (categoryId: string) => {
    if (editingTemplate.categories.length <= 1) {
      toast.error('Cannot delete the last category');
      return;
    }

    if (window.confirm('Are you sure you want to delete this category and all its judgement parameters?')) {
      setEditingTemplate({
        ...editingTemplate,
        categories: editingTemplate.categories.filter(c => c.id !== categoryId)
      });

      toast.success('Category deleted');
    }
  };

  const handleUpdateCategoryName = (categoryId: string, newName: string) => {
    setEditingTemplate({
      ...editingTemplate,
      categories: editingTemplate.categories.map(cat =>
        cat.id === categoryId ? { ...cat, name: newName } : cat
      )
    });
  };

  const handleSave = () => {
    onSave({ ...editingTemplate, updatedAt: new Date() });
    toast.success('Template saved successfully');
  };

  const handlePublish = () => {
    const totalWeightage = getTotalWeightage();
    if (totalWeightage !== 100) {
      toast.error(`Cannot publish: Total weightage must be exactly 100% (currently ${totalWeightage}%)`);
      return;
    }

    onPublish({ ...editingTemplate, isDeployed: true, updatedAt: new Date() });
    toast.success('Template published successfully! Users can now use this template.');
  };

  return (
    <div>
      {/* Header */}
      <header className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button variant="ghost" onClick={onBack}>
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Templates
              </Button>
              <div className="border-l pl-4">
                <h1 className="text-2xl text-gray-900 font-bold" style={{ fontFamily: 'system-ui, -apple-system, sans-serif' }}>
                  {editingTemplate.name}
                </h1>
                <p className="text-gray-600 text-sm">Template Editor</p>
              </div>
            </div>
            <div className="flex gap-2">
              <Button onClick={handleSave} variant="outline">
                <Save className="w-4 h-4 mr-2" />
                Save
              </Button>
              <Button 
                onClick={handlePublish} 
                className="bg-green-600 hover:bg-green-700"
                disabled={editingTemplate.isDeployed}
              >
                <Rocket className="w-4 h-4 mr-2" />
                {editingTemplate.isDeployed ? 'Published' : 'Publish Template'}
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        {/* Template Info */}
        <Card>
          <CardHeader>
            <CardTitle>Template Information</CardTitle>
            <CardDescription>Basic details about this template</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 gap-4">
              <div className="space-y-2">
                <Label>Template Name</Label>
                <Input
                  value={editingTemplate.name}
                  onChange={(e) => handleUpdateTemplateInfo({ name: e.target.value })}
                  placeholder="e.g., SaaS Evaluation Template"
                />
              </div>
              <div className="space-y-2">
                <Label>Description</Label>
                <Textarea
                  value={editingTemplate.description}
                  onChange={(e) => handleUpdateTemplateInfo({ description: e.target.value })}
                  placeholder="Describe this template..."
                  rows={2}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Weightage Summary */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Categories & Judgement Parameters</CardTitle>
              <Button onClick={handleAddCategory} variant="outline" size="sm">
                <Plus className="w-4 h-4 mr-2" />
                Add Category
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-wrap items-center gap-3 bg-gray-50 p-3 rounded-lg">
              {editingTemplate.categories.map(category => {
                const weightage = getCategoryWeightage(category.id);
                return (
                  <Badge key={category.id} variant="outline" className="text-sm">
                    {category.name} {weightage}%
                  </Badge>
                );
              })}
              <div className="ml-auto">
                <Badge variant={getTotalWeightage() !== 100 ? "destructive" : "default"}>
                  Total: {getTotalWeightage()}%
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Categories & Parameters */}
        <div className="space-y-6">
          {editingTemplate.categories.map((category) => (
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
      </main>

      {/* Weightage Alert */}
      <AlertDialog open={showWeightageAlert} onOpenChange={setShowWeightageAlert}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Warning: Weightage Issue</AlertDialogTitle>
            <AlertDialogDescription>
              The total weightage is {getTotalWeightage()}%. For publishing, it must be exactly 100%. Please adjust judgement parameters accordingly.
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