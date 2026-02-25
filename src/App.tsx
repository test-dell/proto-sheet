import { useState } from 'react';
import { Auth } from './components/Auth';
import { Dashboard } from './components/Dashboard';
import { TemplateSelection } from './components/TemplateSelection';
import { TemplateEditor } from './components/TemplateEditor';
import { TemplateEditPage } from './components/TemplateEditPage';
import { DAEditor } from './components/DAEditor';
import { TemplateHistory } from './components/TemplateHistory';
import { Toaster } from './components/ui/sonner';
import { User, DASheet, Template } from './types/da-types';
import { defaultTemplates, mockDASheets } from './data/mock-data';

export type Screen = 'dashboard' | 'da-editor-screen' | 'template-editor' | 'template-edit-page' | 'vendor-evaluation' | 'history';

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [currentScreen, setCurrentScreen] = useState<Screen>('dashboard');
  const [templates, setTemplates] = useState<Template[]>(defaultTemplates);
  const [daSheets, setDASheets] = useState<DASheet[]>(mockDASheets);
  const [selectedSheet, setSelectedSheet] = useState<DASheet | null>(null);
  const [selectedTemplate, setSelectedTemplate] = useState<Template | null>(null);
  const [editingTemplate, setEditingTemplate] = useState<Template | null>(null);

  const handleLogin = (userData: User) => {
    setUser(userData);
  };

  const handleLogout = () => {
    setUser(null);
    setCurrentScreen('dashboard');
  };

  // Show Auth screen if not logged in
  if (!user) {
    return <Auth onLogin={handleLogin} />;
  }

  const navigateTo = (screen: Screen) => {
    setCurrentScreen(screen);
  };

  const handleCreateNewSheet = () => {
    setSelectedSheet(null);
    setSelectedTemplate(null);
    navigateTo('da-editor-screen');
  };

  const handleTemplateSelected = (template: Template, sheetName: string) => {
    setSelectedTemplate(template);
    
    // Create a new DA sheet
    const newSheet: DASheet = {
      id: `da-${Date.now()}`,
      name: sheetName,
      type: template.type,
      status: 'Draft',
      templateId: template.id,
      vendors: [],
      notes: '',
      version: 1,
      createdAt: new Date(),
      updatedAt: new Date(),
      createdBy: 'Current User'
    };
    
    setSelectedSheet(newSheet);
    navigateTo('vendor-evaluation');
  };

  const handleEditSheet = (sheet: DASheet) => {
    const template = templates.find(t => t.id === sheet.templateId);
    setSelectedSheet(sheet);
    setSelectedTemplate(template || null);
    navigateTo('vendor-evaluation');
  };

  const handleSaveSheet = (sheet: DASheet) => {
    const existingIndex = daSheets.findIndex(s => s.id === sheet.id);
    
    if (existingIndex >= 0) {
      const updatedSheets = [...daSheets];
      updatedSheets[existingIndex] = {
        ...sheet,
        updatedAt: new Date()
      };
      setDASheets(updatedSheets);
    } else {
      setDASheets([...daSheets, sheet]);
    }
    
    setSelectedSheet(sheet);
  };

  const handleDuplicateSheet = (sheet: DASheet) => {
    const duplicatedSheet: DASheet = {
      ...sheet,
      id: `da-${Date.now()}`,
      name: `${sheet.name} (Copy)`,
      status: 'Draft',
      version: 1,
      createdAt: new Date(),
      updatedAt: new Date(),
      approvedBy: undefined,
      approvedAt: undefined
    };
    
    setDASheets([...daSheets, duplicatedSheet]);
    return duplicatedSheet;
  };

  const handleDeleteSheet = (sheetId: string) => {
    setDASheets(daSheets.filter(s => s.id !== sheetId));
  };

  const handleSaveTemplate = (template: Template) => {
    const existingIndex = templates.findIndex(t => t.id === template.id);
    
    if (existingIndex >= 0) {
      const updatedTemplates = [...templates];
      updatedTemplates[existingIndex] = template;
      setTemplates(updatedTemplates);
    } else {
      setTemplates([...templates, template]);
    }
  };

  const handleDeleteTemplate = (templateId: string) => {
    setTemplates(templates.filter(t => t.id !== templateId));
  };

  const handleEditTemplate = (template: Template) => {
    setEditingTemplate(template);
    navigateTo('template-edit-page');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      <Toaster />
      
      {currentScreen === 'dashboard' && (
        <Dashboard
          user={user}
          onLogout={handleLogout}
          daSheets={daSheets}
          onCreateNew={handleCreateNewSheet}
          onViewHistory={() => navigateTo('history')}
          onManageTemplates={() => navigateTo('template-editor')}
          onEditSheet={handleEditSheet}
          onDeleteSheet={handleDeleteSheet}
        />
      )}

      {currentScreen === 'da-editor-screen' && (
        <TemplateSelection
          user={user}
          onLogout={handleLogout}
          templates={templates}
          onSelectTemplate={handleTemplateSelected}
          onBack={() => navigateTo('dashboard')}
        />
      )}

      {currentScreen === 'template-editor' && (
        <TemplateEditor
          user={user}
          onLogout={handleLogout}
          templates={templates}
          onSaveTemplate={handleSaveTemplate}
          onDeleteTemplate={handleDeleteTemplate}
          onEditTemplate={handleEditTemplate}
          onBack={() => navigateTo('dashboard')}
        />
      )}

      {currentScreen === 'template-edit-page' && editingTemplate && (
        <TemplateEditPage
          template={editingTemplate}
          onSave={handleSaveTemplate}
          onPublish={handleSaveTemplate}
          onBack={() => navigateTo('template-editor')}
        />
      )}

      {currentScreen === 'vendor-evaluation' && selectedSheet && selectedTemplate && (
        <DAEditor
          sheet={selectedSheet}
          template={selectedTemplate}
          onSave={handleSaveSheet}
          onBack={() => navigateTo('dashboard')}
        />
      )}

      {currentScreen === 'history' && (
        <TemplateHistory
          daSheets={daSheets}
          onEditSheet={handleEditSheet}
          onDuplicateSheet={handleDuplicateSheet}
          onDeleteSheet={handleDeleteSheet}
          onBack={() => navigateTo('dashboard')}
        />
      )}
    </div>
  );
}