/**
 * Placeholder implementations for tools not yet implemented
 */

import type { SessionState } from '../../session/types.js';

export async function addTask(
  _args: Record<string, unknown>,
  _state: SessionState
): Promise<never> {
  throw new Error(
    JSON.stringify({
      code: -32601,
      message: 'add_task tool not yet implemented',
      data: {
        reason: 'NOT_IMPLEMENTED',
        planned_parameters: ['document', 'title', 'criteria', 'links'],
        example: {
          document: '/specs/search-api.md',
          title: 'Implement caching layer',
          criteria: 'Redis-based, 100ms response time',
          links: ['/architecture/caching.md', '/specs/search-api.md#performance']
        }
      }
    })
  );
}

export async function completeTask(
  _args: Record<string, unknown>,
  _state: SessionState
): Promise<never> {
  throw new Error(
    JSON.stringify({
      code: -32601,
      message: 'complete_task tool not yet implemented',
      data: {
        reason: 'NOT_IMPLEMENTED',
        planned_parameters: ['task_id', 'note'],
        example: {
          task_id: 'search-api.md#tasks[3]',
          note: 'Implemented with Redis Cluster, achieving 87ms p99'
        }
      }
    })
  );
}

export async function reopenTask(
  _args: Record<string, unknown>,
  _state: SessionState
): Promise<never> {
  throw new Error(
    JSON.stringify({
      code: -32601,
      message: 'reopen_task tool not yet implemented',
      data: {
        reason: 'NOT_IMPLEMENTED',
        planned_parameters: ['task_id'],
        example: {
          task_id: 'api.md#tasks[0]'
        }
      }
    })
  );
}

export async function viewDocument(
  _args: Record<string, unknown>,
  _state: SessionState
): Promise<never> {
  throw new Error(
    JSON.stringify({
      code: -32601,
      message: 'view_document tool not yet implemented',
      data: {
        reason: 'NOT_IMPLEMENTED',
        planned_parameters: ['document'],
        example: {
          document: '/specs/search-api.md'
        }
      }
    })
  );
}

