import { useState } from 'react';
import { Button } from './ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Textarea } from './ui/textarea';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from './ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/table';
import { Badge } from './ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from './ui/tooltip';
import { ArrowLeft, Plus, Edit2, Trash2, Eye, EyeOff } from 'lucide-react';
import { Template } from '../types/da-types';
import { toast } from 'sonner@2.0.3';
import { UserHeader } from './UserHeader';

interface User {
  empCode: string;
  role: 'admin' | 'user';
  email: string;
}

interface TemplateEditorProps {
  user: User;
  onLogout: () => void;
  templates: Template[];
  onSaveTemplate: (template: Template) => void;
  onDeleteTemplate: (templateId: string) => void;
  onEditTemplate: (template: Template) => void;
  onBack: () => void;
}

export function TemplateEditor({ user, onLogout, templates, onSaveTemplate, onDeleteTemplate, onEditTemplate, onBack }: TemplateEditorProps) {
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    description: ''
  });

  const handleCreateNew = () => {
    setFormData({
      name: '',
      description: ''
    });
    setIsCreateDialogOpen(true);
  };

  const handleCreateTemplate = () => {
    if (!formData.name) {
      toast.error('Please enter template name');
      return;
    }

    const newTemplate: Template = {
      id: `template-${Date.now()}`,
      name: formData.name,
      type: 'License',
      description: formData.description,
      categories: [
        {
          id: `category-${Date.now()}`,
          name: 'Quality',
          parameters: [
            {
              id: `param-${Date.now()}-1`,
              name: 'Judgement Parameter 1',
              weightage: 10,
              comment: ''
            }
          ]
        }
      ],
      customFields: [],
      isDeployed: false,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    onSaveTemplate(newTemplate);
    setIsCreateDialogOpen(false);
    toast.success('Template created successfully');
    
    // Open the edit page for the new template
    onEditTemplate(newTemplate);
  };

  const handleDeleteTemplate = (templateId: string) => {
    if (window.confirm('Are you sure you want to delete this template?')) {
      onDeleteTemplate(templateId);
      toast.success('Template deleted successfully');
    }
  };

  const handleTogglePublish = (template: Template) => {
    const updatedTemplate = {
      ...template,
      isDeployed: !template.isDeployed,
      updatedAt: new Date()
    };
    
    onSaveTemplate(updatedTemplate);
    
    if (updatedTemplate.isDeployed) {
      toast.success(`Template "${template.name}" published successfully`);
    } else {
      toast.success(`Template "${template.name}" unpublished successfully`);
    }
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
                <h1 className="text-white text-2xl font-bold">Template Manager</h1>
                <p className="text-indigo-100 text-sm">Create and manage DA templates</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Button onClick={handleCreateNew} className="bg-white text-indigo-600 hover:bg-indigo-50">
                <Plus className="w-4 h-4 mr-2" />
                Create New Template
              </Button>
              <UserHeader user={user} onLogout={onLogout} />
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Card>
          <CardHeader>
            <CardTitle>DA Templates</CardTitle>
            <CardDescription>Manage your decision analysis templates</CardDescription>
          </CardHeader>
          <CardContent>
            {templates.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-gray-600 mb-4">No templates created yet</p>
                <Button onClick={handleCreateNew} className="bg-indigo-600 hover:bg-indigo-700">
                  <Plus className="w-4 h-4 mr-2" />
                  Create Your First Template
                </Button>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Template Name</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Last Updated</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {templates.map((template) => (
                    <TableRow key={template.id}>
                      <TableCell>
                        <p className="text-gray-900 font-medium">{template.name}</p>
                      </TableCell>
                      <TableCell className="text-sm text-gray-600">{template.description || '-'}</TableCell>
                      <TableCell>
                        {template.isDeployed ? (
                          <Badge className="bg-green-600">Published</Badge>
                        ) : (
                          <Badge variant="secondary">Draft</Badge>
                        )}
                      </TableCell>
                      <TableCell>{template.updatedAt.toLocaleDateString()}</TableCell>
                      <TableCell>
                        <TooltipProvider>
                          <div className="flex items-center justify-end gap-2">
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => onEditTemplate(template)}
                                  className="hover:bg-indigo-50 hover:text-indigo-600"
                                >
                                  <Edit2 className="w-4 h-4" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>Edit Template</TooltipContent>
                            </Tooltip>
                            
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleTogglePublish(template)}
                                  className="hover:bg-green-50 hover:text-green-600"
                                >
                                  {template.isDeployed ? (
                                    <EyeOff className="w-4 h-4" />
                                  ) : (
                                    <Eye className="w-4 h-4" />
                                  )}
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>
                                {template.isDeployed ? 'Unpublish Template' : 'Publish Template'}
                              </TooltipContent>
                            </Tooltip>

                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleDeleteTemplate(template.id)}
                                  className="hover:bg-red-50 hover:text-red-600"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>Delete Template</TooltipContent>
                            </Tooltip>
                          </div>
                        </TooltipProvider>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </main>

      {/* Create Template Dialog */}
      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create New Template</DialogTitle>
            <DialogDescription>
              Enter template details to get started
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="template-name">Template Name *</Label>
              <Input
                id="template-name"
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                placeholder="e.g., SaaS Vendor Evaluation"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="template-description">Description</Label>
              <Textarea
                id="template-description"
                value={formData.description}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Describe the purpose of this template..."
                rows={3}
              />
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreateTemplate} className="bg-indigo-600 hover:bg-indigo-700">
              Create & Edit
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}