/**
 * useWorkflows Hook
 * Manages workflow state and operations using DBAL
 */

import { useCallback, useState } from 'react';
import { useDBAL } from '@metabuilder/api-clients';
import { useUINotifications } from './ui/useUINotifications';

export interface Workflow {
  id: string;
  name: string;
  description?: string;
  version: string;
  category: string;
  status: 'draft' | 'published' | 'deprecated' | 'active' | 'paused';
  nodes: any[];
  connections: Record<string, any>;
  metadata?: {
    author?: string;
    tags?: string[];
    labels?: Record<string, string>;
  };
  executionConfig?: {
    timeout?: number;
    retryStrategy?: 'fail' | 'fallback' | 'skip' | 'retry';
    maxRetries?: number;
    parallelNodes?: boolean;
  };
  isPublished: boolean;
  isArchived: boolean;
  createdAt: number;
  updatedAt: number;
  publishedAt?: number;
  createdBy?: string;
  updatedBy?: string;
  tenantId: string;
}

export interface CreateWorkflowRequest {
  name: string;
  description?: string;
  version?: string;
  category?: string;
  status?: 'draft' | 'active';
  nodes?: any[];
  connections?: Record<string, any>;
  metadata?: Record<string, any>;
}

export interface UpdateWorkflowRequest {
  name?: string;
  description?: string;
  version?: string;
  category?: string;
  status?: string;
  nodes?: any[];
  connections?: Record<string, any>;
  metadata?: Record<string, any>;
  isPublished?: boolean;
}

export interface ListWorkflowsOptions {
  status?: string;
  category?: string;
  isPublished?: boolean;
  limit?: number;
  page?: number;
}

export function useWorkflows() {
  const dbal = useDBAL();
  const { success, error: showError } = useUINotifications();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const getTenantId = useCallback(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('tenantId') || 'default';
    }
    return 'default';
  }, []);

  const listWorkflows = useCallback(
    async (options: ListWorkflowsOptions = {}): Promise<Workflow[]> => {
      setIsLoading(true);
      setError(null);
      try {
        const params: Record<string, string> = {};
        if (options.status) params.status = options.status;
        if (options.category) params.category = options.category;
        if (options.isPublished !== undefined) params.isPublished = String(options.isPublished);
        if (options.limit) params.limit = String(options.limit);
        if (options.page) params.page = String(options.page);

        const response = await dbal.list<{ data: Workflow[]; total: number }>('Workflow', params);

        if (response && response.data) {
          return response.data;
        }
        return [];
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : 'Failed to load workflows';
        setError(errorMsg);
        console.error('Failed to load workflows:', err);
        return [];
      } finally {
        setIsLoading(false);
      }
    },
    [dbal]
  );

  const getWorkflow = useCallback(
    async (id: string): Promise<Workflow | null> => {
      setIsLoading(true);
      setError(null);
      try {
        const response = await dbal.get<Workflow>('Workflow', id);
        return response;
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : 'Failed to load workflow';
        setError(errorMsg);
        console.error('Failed to load workflow:', err);
        return null;
      } finally {
        setIsLoading(false);
      }
    },
    [dbal]
  );

  const createWorkflow = useCallback(
    async (data: CreateWorkflowRequest): Promise<Workflow | null> => {
      setIsLoading(true);
      setError(null);
      try {
        // Generate ID from name: lowercase, replace spaces with underscores, prefix with workflow_
        const generateId = (name: string): string => {
          const base = name.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '');
          return `workflow_${base}_${Date.now()}`;
        };

        const now = Date.now();
        const workflowData = {
          id: generateId(data.name),
          name: data.name,
          description: data.description || '',
          version: data.version || '1.0.0',
          category: data.category || 'custom',
          status: data.status || 'draft',
          nodes: data.nodes || [],
          connections: data.connections || {},
          metadata: data.metadata || {},
          isPublished: false,
          isArchived: false,
          createdAt: now,
          updatedAt: now,
          tenantId: getTenantId(),
        };

        const response = await dbal.create<Workflow>('Workflow', workflowData);
        if (response) {
          success(`Workflow "${data.name}" created successfully!`);
        }
        return response;
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : 'Failed to create workflow';
        setError(errorMsg);
        showError(errorMsg);
        console.error('Failed to create workflow:', err);
        return null;
      } finally {
        setIsLoading(false);
      }
    },
    [dbal, getTenantId, success, showError]
  );

  const updateWorkflow = useCallback(
    async (id: string, data: UpdateWorkflowRequest): Promise<Workflow | null> => {
      setIsLoading(true);
      setError(null);
      try {
        const response = await dbal.update<Workflow>('Workflow', id, data);
        if (response) {
          success('Workflow updated successfully!');
        }
        return response;
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : 'Failed to update workflow';
        setError(errorMsg);
        showError(errorMsg);
        console.error('Failed to update workflow:', err);
        return null;
      } finally {
        setIsLoading(false);
      }
    },
    [dbal, success, showError]
  );

  const deleteWorkflow = useCallback(
    async (id: string): Promise<boolean> => {
      setIsLoading(true);
      setError(null);
      try {
        await dbal.delete('Workflow', id);
        success('Workflow deleted successfully!');
        return true;
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : 'Failed to delete workflow';
        setError(errorMsg);
        showError(errorMsg);
        console.error('Failed to delete workflow:', err);
        return false;
      } finally {
        setIsLoading(false);
      }
    },
    [dbal, success, showError]
  );

  const executeWorkflow = useCallback(
    async (id: string): Promise<{ executionId: string; status: string } | null> => {
      setIsLoading(true);
      setError(null);
      try {
        // TODO: Once execution engine is implemented, make actual API call
        // For now, return a simulated execution result
        const executionId = `exec_${id}_${Date.now()}`;
        console.log('Simulated workflow execution:', { id, executionId });

        return {
          executionId,
          status: 'simulated',
        };
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : 'Failed to execute workflow';
        setError(errorMsg);
        console.error('Failed to execute workflow:', err);
        return null;
      } finally {
        setIsLoading(false);
      }
    },
    [dbal]
  );

  return {
    isLoading,
    error,
    listWorkflows,
    getWorkflow,
    createWorkflow,
    updateWorkflow,
    deleteWorkflow,
    executeWorkflow,
  };
}

export default useWorkflows;
