import { describe, expect, test } from 'bun:test';
import {
	addBranchCommit,
	createSimulation,
	mergePullRequest,
	newBranch,
	newIssue,
	openPullRequest,
	promote,
	revertLastMerge,
	selectStart
} from '../src/lib/gitRoutekaart';

describe('git routekaart simulation', () => {
	test('keeps test and live releases separate', () => {
		const state = createSimulation();

		newIssue(state);
		newBranch(state, state.issues[0].num);
		addBranchCommit(state);
		addBranchCommit(state);
		openPullRequest(state, state.active);
		mergePullRequest(state, 1, false);

		expect(state.env.test).toBe('v0.1.1');
		expect(state.env.live).toBe('v0.1.0');
		expect(state.missions[4]).toBe(true);

		promote(state);
		expect(state.env.live).toBe('v0.1.1');

		revertLastMerge(state);
		expect(state.env.test).toBe('v0.1.2');
		expect(state.env.live).toBe('v0.1.1');
	});

	test('can branch from an older main commit', () => {
		const state = createSimulation();
		const olderCommit = state.commits[0].id;

		selectStart(state, olderCommit);
		newIssue(state);
		newBranch(state, state.issues[0].num);

		expect(state.branches[state.active].head).toBe(olderCommit);
		expect(state.missions[10]).toBe(true);
	});
});
