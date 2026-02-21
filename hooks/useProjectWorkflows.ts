/**
 * useProjectWorkflows Hook
 * Manages workflows within a project using the C++ DBAL REST API.
 */

import { useCallback, useEffect, useState } from 'react';
import { useDBALEntity } from './src/useDBALEntity';

export interface ProjectWorkflow {
  id: string;
  name: string;
  description?: string;
  nodeCount: number;
  status: 'draft' | 'published' | 'deprecated' | 'active' | 'paused';
  lastModified: number;
  category?: string;
  version?: string;
  isPublished?: boolean;
  createdAt?: number;
  updatedAt?: number;
}

interface UseProjectWorkflowsOptions {
  projectId: string;
  autoLoad?: boolean;
  /** Tenant ID (defaults to localStorage value or 'default') */
  tenant?: string;
  /** Package ID (defaults to 'core') */
  packageId?: string;
}

/**
 * Hook for managing workflows within a project via the DBAL REST API
 */
export function useProjectWorkflows(options: UseProjectWorkflowsOptions) {
  const { projectId, autoLoad = true } = options;
  const [workflows, setWorkflows] = useState<ProjectWorkflow[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const tenant =
    options.tenant ??
    (typeof window !== 'undefined' ? localStorage.getItem('tenantId') ?? 'default' : 'default');
  const packageId = options.packageId ?? 'core';

  const entity = useDBALEntity<Record<string, unknown>>('workflow', { tenant, packageId });

  /**
   * Fetch workflows for the current project from DBAL REST API
   */
  const loadWorkflows = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const result = await entity.list({
        filter: {
          isArchived: false,
        },
        sort: {
          updatedAt: 'desc',
        },
      });

      // Transform DBAL records to ProjectWorkflow format
      const transformed: ProjectWorkflow[] = result.data.map((workflow: Record<string, unknown>) => ({
        id: workflow.id as string,
        name: workflow.name as string,
        description: workflow.description as string | undefined,
        nodeCount: Array.isArray(workflow.nodes) ? workflow.nodes.length : 0,
        status: workflow.status as ProjectWorkflow['status'],
        lastModified: workflow.updatedAt
          ? new Date(workflow.updatedAt as string).getTime()
          : Date.now(),
        category: workflow.category as string | undefined,
        version: workflow.version as string | undefined,
        isPublished: workflow.isPublished as boolean | undefined,
        createdAt: workflow.createdAt
          ? new Date(workflow.createdAt as string).getTime()
          : undefined,
        updatedAt: workflow.updatedAt
          ? new Date(workflow.updatedAt as string).getTime()
          : undefined,
      }));

      setWorkflows(transformed);
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to load workflows';
      setError(errorMsg);
      console.error('Failed to load project workflows:', err);
    } finally {
      setIsLoading(false);
    }
  }, [projectId, entity]);

  /**
   * Create a new workflow via DBAL REST API
   */
  const createWorkflow = useCallback(
    async (data: {
      name: string;
      description?: string;
      category?: string;
    }): Promise<ProjectWorkflow | null> => {
      setIsLoading(true);
      setError(null);

      try {
        const workflow = await entity.create({
          name: data.name,
          description: data.description || '',
          version: '1.0.0',
          category: data.category || 'custom',
          status: 'draft',
          nodes: [
            {
              id: 'start',
              name: 'Start',
              type: 'frame.begin',
              typeVersion: 1,
              position: [0, 0],
              parameters: {},
            },
          ],
          connections: {},
          metadata: {},
          executionConfig: {},
          isPublished: false,
          isArchived: false,
        });

        // Transform to ProjectWorkflow format
        const transformed: ProjectWorkflow = {
          id: (workflow as Record<string, unknown>).id as string,
          name: (workflow as Record<string, unknown>).name as string,
          description: (workflow as Record<string, unknown>).description as string | undefined,
          nodeCount: 1,
          status: (workflow as Record<string, unknown>).status as ProjectWorkflow['status'],
          lastModified: Date.now(),
          category: (workflow as Record<string, unknown>).category as string | undefined,
          version: (workflow as Record<string, unknown>).version as string | undefined,
          isPublished: false,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        };

        // Update local state
        setWorkflows((prev) => [transformed, ...prev]);

        return transformed;
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : 'Failed to create workflow';
        setError(errorMsg);
        console.error('Failed to create workflow:', err);
        return null;
      } finally {
        setIsLoading(false);
      }
    },
    [projectId, entity]
  );

  /**
   * Delete a workflow via DBAL REST API (soft delete)
   */
  const deleteWorkflow = useCallback(
    async (workflowId: string) => {
      setIsLoading(true);
      setError(null);

      try {
        // Soft delete by setting isArchived
        await entity.update(workflowId, {
          isArchived: true,
        });

        // Update local state
        setWorkflows((prev) => prev.filter((w) => w.id !== workflowId));
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : 'Failed to delete workflow';
        setError(errorMsg);
        console.error('Failed to delete workflow:', err);
        throw err;
      } finally {
        setIsLoading(false);
      }
    },
    [projectId, entity]
  );

  // Auto-load workflows on mount if enabled
  useEffect(() => {
    if (autoLoad && projectId) {
      loadWorkflows();
    }
  }, [autoLoad, projectId, loadWorkflows]);

  return {
    workflows,
    isLoading,
    error,
    loadWorkflows,
    createWorkflow,
    deleteWorkflow,
  };
}

export default useProjectWorkflows;
