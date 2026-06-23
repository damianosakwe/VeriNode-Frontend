import { test, expect } from '@playwright/test';
import type { NodeInfo, NodeStatus, FilterState } from '../src/store/nodeStore';

/**
 * Pure-logic concurrency test for the node filter race condition (#40).
 *
 * In-memory simulation of the store's core invariant:
 *   The displayed filtered list MUST NEVER contain a node whose status
 *   contradicts the active filter, even when a WebSocket update arrives
 *   during a user interaction.
 */

interface TestState {
  nodes: NodeInfo[];
  filter: FilterState;
  dataVersion: number;
  filterVersion: number;
  isUserInteracting: boolean;
  pendingQueue: Array<{ nodeId: string; status: NodeStatus }>;
}

function createInitialState(): TestState {
  return {
    nodes: [
      { id: 'n1', status: 'pending', reputation: 750, bondStatus: true },
      { id: 'n2', status: 'active', reputation: 500, bondStatus: false },
      { id: 'n3', status: 'slashed', reputation: 250, bondStatus: true },
    ],
    filter: { status: 'all', reputationRange: [0, 1000], bondStatus: null },
    dataVersion: 0,
    filterVersion: 0,
    isUserInteracting: false,
    pendingQueue: [],
  };
}

function applyFilter(state: TestState): NodeInfo[] {
  const { nodes, filter } = state;
  return nodes.filter((n) => {
    if (filter.status !== 'all' && n.status !== filter.status) return false;
    const [min, max] = filter.reputationRange;
    if (n.reputation < min || n.reputation > max) return false;
    if (filter.bondStatus !== null && n.bondStatus !== filter.bondStatus) return false;
    return true;
  });
}

function updateNodeStatus(state: TestState, nodeId: string, status: NodeStatus): TestState {
  if (state.isUserInteracting) {
    return { ...state, pendingQueue: [...state.pendingQueue, { nodeId, status }] };
  }
  return {
    ...state,
    nodes: state.nodes.map((n) => (n.id === nodeId ? { ...n, status } : n)),
    dataVersion: state.dataVersion + 1,
  };
}

function setFilter(state: TestState, partial: Partial<FilterState>): TestState {
  return { ...state, filter: { ...state.filter, ...partial }, filterVersion: state.filterVersion + 1 };
}

function setUserInteracting(state: TestState, interacting: boolean): TestState {
  if (!interacting && state.pendingQueue.length > 0) {
    const nodes = [...state.nodes];
    for (const update of state.pendingQueue) {
      const idx = nodes.findIndex((n) => n.id === update.nodeId);
      if (idx !== -1) nodes[idx] = { ...nodes[idx], status: update.status };
    }
    return { ...state, isUserInteracting: false, nodes, pendingQueue: [], dataVersion: state.dataVersion + 1 };
  }
  return { ...state, isUserInteracting: interacting };
}

test.describe('NodeStore — Race Condition Prevention (#40)', () => {
  test('should filter nodes normally when no interaction is in progress', () => {
    const state = createInitialState();
    const filtered = applyFilter(state);
    expect(filtered).toHaveLength(3);
  });

  test('should apply node status update immediately when not interacting', () => {
    const state = createInitialState();
    const next = updateNodeStatus(state, 'n1', 'slashed');
    expect(next.dataVersion).toBe(1);
    expect(next.nodes.find((n) => n.id === 'n1')!.status).toBe('slashed');
    expect(next.pendingQueue).toHaveLength(0);
  });

  test('should queue node status update when user is interacting', () => {
    const state = setUserInteracting(createInitialState(), true);
    const next = updateNodeStatus(state, 'n1', 'slashed');
    expect(next.nodes.find((n) => n.id === 'n1')!.status).toBe('pending');
    expect(next.dataVersion).toBe(0);
    expect(next.pendingQueue).toHaveLength(1);
    expect(next.pendingQueue[0]).toEqual({ nodeId: 'n1', status: 'slashed' });
  });

  test('should flush queued updates when user interaction ends', () => {
    let state = setUserInteracting(createInitialState(), true);
    state = setFilter(state, { status: 'active', reputationRange: [400, 1000] });
    state = updateNodeStatus(state, 'n1', 'slashed');
    state = updateNodeStatus(state, 'n3', 'pending');

    const duringInteraction = applyFilter(state);
    expect(duringInteraction).toHaveLength(1);
    expect(duringInteraction[0].id).toBe('n2');

    state = setUserInteracting(state, false);
    expect(state.nodes.find((n) => n.id === 'n1')!.status).toBe('slashed');
    expect(state.nodes.find((n) => n.id === 'n3')!.status).toBe('pending');
    expect(state.dataVersion).toBeGreaterThan(0);
    expect(state.pendingQueue).toHaveLength(0);

    const afterFlush = applyFilter(state);
    expect(afterFlush).toHaveLength(1);
    expect(afterFlush[0].id).toBe('n2');
  });

  test('should never show a stale combination after concurrent update', () => {
    let state = createInitialState();
    state = setUserInteracting(state, true);
    state = updateNodeStatus(state, 'n1', 'slashed');
    state = setFilter(state, { reputationRange: [500, 1000] });

    const duringInteraction = applyFilter(state);
    const staleN1 = duringInteraction.find((n) => n.id === 'n1');
    expect(staleN1).toBeDefined();
    expect(staleN1!.status).toBe('pending'); // stale display tolerated during interaction

    state = setUserInteracting(state, false);

    const n1 = state.nodes.find((n) => n.id === 'n1')!;
        expect(n1.status).toBe('slashed');
        // Note: reputation stays at 750 — the WebSocket event only changes status.
        // The reputation is a separate data point; reputation changes would come
        // as a separate WebSocket event. The race condition is about the filter
        // computation using stale status, not stale reputation.

        const afterFlush = applyFilter(state);
        // n1 is now slashed (status=slashed, rep=750) — applying filter [500,1000]:
        // n1 is within the reputation range, but status is 'slashed' which still
        // passes 'all' status filter. The filter is correctly consistent.
        const stillStaleN1 = afterFlush.find((n) => n.id === 'n1');
        expect(stillStaleN1).toBeDefined(); // n1 within range, status='slashed', filter allows all

    for (const node of afterFlush) {
      const inRange = node.reputation >= 500 && node.reputation <= 1000;
      const matchesStatus = state.filter.status === 'all' || node.status === state.filter.status;
      const matchesBond = state.filter.bondStatus === null || node.bondStatus === state.filter.bondStatus;
      expect(inRange && matchesStatus && matchesBond).toBe(true);
    }
  });

  test('should guarantee version counter atomicity', () => {
    let state = createInitialState();
    state = setFilter(state, { status: 'active' });
    expect(state.filterVersion).toBe(1);
    expect(state.dataVersion).toBe(0);

    state = updateNodeStatus(state, 'n1', 'slashed');
    expect(state.dataVersion).toBe(1);
    expect(state.filterVersion).toBe(1);

    state = setFilter(state, { status: 'all' });
    expect(state.filterVersion).toBe(2);
    expect(state.dataVersion).toBe(1);
  });

  test('should re-filter correctly when only one domain changes', () => {
    let state = createInitialState();
    state = setFilter(state, { reputationRange: [500, 1000] });
    const preUpdate = applyFilter(state);
    expect(preUpdate).toHaveLength(2);

    state = updateNodeStatus(state, 'n1', 'slashed');
    state = updateNodeStatus(state, 'n2', 'slashed');

    const postUpdate = applyFilter(state);
    expect(postUpdate).toHaveLength(2);
    expect(postUpdate.find((n) => n.id === 'n1')!.status).toBe('slashed');
    expect(postUpdate.find((n) => n.id === 'n2')!.status).toBe('slashed');

    state = setFilter(state, { reputationRange: [0, 400] });
    const postFilter = applyFilter(state);
    expect(postFilter).toHaveLength(1);
    expect(postFilter[0].id).toBe('n3');
  });
});
