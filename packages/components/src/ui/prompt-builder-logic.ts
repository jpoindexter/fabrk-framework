import { useState, useCallback } from 'react';

export interface PromptTemplate {
  id: string;
  name: string;
  content: string;
  category?: string;
  variables?: PromptVariable[];
}

export interface PromptVariable {
  id: string;
  name: string;
  value: string;
  description?: string;
  type?: 'text' | 'select';
  options?: string[];
}

export interface PromptBuilderProps {
  templates?: PromptTemplate[];
  onBuild?: (prompt: string) => void;
  onSaveTemplate?: (template: PromptTemplate) => void;
  onCopyPrompt?: (prompt: string) => void;
  defaultTemplate?: PromptTemplate;
  showTemplates?: boolean;
  showVariables?: boolean;
  showPreview?: boolean;
  maxVariables?: number;
  placeholder?: string;
  className?: string;
}

interface UsePromptBuilderOptions {
  defaultTemplate?: PromptTemplate;
  maxVariables?: number;
  onBuild?: (prompt: string) => void;
  onSaveTemplate?: (template: PromptTemplate) => void;
  onCopyPrompt?: (prompt: string) => void;
}

export function usePromptBuilder({
  defaultTemplate,
  maxVariables = 10,
  onBuild,
  onSaveTemplate,
  onCopyPrompt,
}: UsePromptBuilderOptions) {
  const [promptContent, setPromptContent] = useState(defaultTemplate?.content || '');
  const [variables, setVariables] = useState<PromptVariable[]>(defaultTemplate?.variables || []);
  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(
    defaultTemplate?.id || null
  );
  const [templateName, setTemplateName] = useState('');
  const [activeTab, setActiveTab] = useState('editor');

  const addVariable = useCallback(() => {
    if (variables.length >= maxVariables) return;

    const newVariable: PromptVariable = {
      id: `var-${Date.now()}`,
      name: '',
      value: '',
      type: 'text',
    };

    setVariables([...variables, newVariable]);
  }, [variables, maxVariables]);

  const updateVariable = useCallback((id: string, updates: Partial<PromptVariable>) => {
    setVariables((prev) => prev.map((v) => (v.id === id ? { ...v, ...updates } : v)));
  }, []);

  const removeVariable = useCallback((id: string) => {
    setVariables((prev) => prev.filter((v) => v.id !== id));
  }, []);

  const processPrompt = useCallback(() => {
    let processed = promptContent;

    // Replace variables in the format {{variableName}}
    variables.forEach((variable) => {
      const pattern = new RegExp(`\\{\\{${variable.name}\\}\\}`, 'g');
      processed = processed.replace(pattern, variable.value || `{{${variable.name}}}`);
    });

    return processed;
  }, [promptContent, variables]);

  const extractVariables = useCallback(() => {
    // Extract variables from prompt content using regex
    const regex = /\{\{(\w+)\}\}/g;
    const matches = [...promptContent.matchAll(regex)];
    const uniqueNames = [...new Set(matches.map((m) => m[1]))];

    const newVariables: PromptVariable[] = uniqueNames.map((name) => {
      // Check if variable already exists
      const existing = variables.find((v) => v.name === name);
      if (existing) return existing;

      // Create new variable
      return {
        id: `var-${Date.now()}-${name}`,
        name,
        value: '',
        type: 'text',
      };
    });

    setVariables(newVariables);
  }, [promptContent, variables]);

  const handleLoadTemplate = useCallback((template: PromptTemplate) => {
    setPromptContent(template.content);
    setVariables(template.variables || []);
    setSelectedTemplate(template.id);
    setTemplateName(template.name);
  }, []);

  const handleBuild = useCallback(() => {
    const processed = processPrompt();
    onBuild?.(processed);
  }, [processPrompt, onBuild]);

  const handleSave = useCallback(() => {
    if (!templateName.trim()) return;

    const template: PromptTemplate = {
      id: `template-${Date.now()}`,
      name: templateName,
      content: promptContent,
      variables: variables,
    };

    onSaveTemplate?.(template);
    setTemplateName('');
  }, [templateName, promptContent, variables, onSaveTemplate]);

  const handleCopy = useCallback(() => {
    const processed = processPrompt();
    navigator.clipboard.writeText(processed);
    onCopyPrompt?.(processed);
  }, [processPrompt, onCopyPrompt]);

  return {
    promptContent,
    setPromptContent,
    variables,
    selectedTemplate,
    templateName,
    setTemplateName,
    activeTab,
    setActiveTab,
    addVariable,
    updateVariable,
    removeVariable,
    processPrompt,
    handleLoadTemplate,
    handleBuild,
    handleSave,
    handleCopy,
    extractVariables,
  };
}
