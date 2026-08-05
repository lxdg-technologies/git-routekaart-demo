export type CommitKind = 'normal' | 'merge' | 'squash' | 'revert';

export type Commit = {
	id: string;
	branch: string;
	msg: string;
	parents: string[];
	kind: CommitKind;
	x: number;
	squashed?: boolean;
};

export type Branch = {
	name: string;
	lane: number;
	color: string;
	head: string;
	merged: boolean;
	deleted?: boolean;
	issue?: number;
};

export type Issue = {
	num: number;
	title: string;
	slug: string;
	branch: string | null;
	closed: boolean;
};

export type PullRequest = {
	num: number;
	branch: string;
	state: 'open' | 'merged';
	issue?: number;
};

export type LogEntry = {
	id: number;
	title: string;
	why: string;
};

export type SimulationState = {
	commits: Commit[];
	branches: Record<string, Branch>;
	issues: Issue[];
	prs: PullRequest[];
	logs: LogEntry[];
	active: string;
	seq: number;
	issueNo: number;
	prNo: number;
	logNo: number;
	laneFree: number[];
	missions: boolean[];
	hasMergeCommit: boolean;
	hasSquashCommit: boolean;
	relNum: number;
	env: {
		test: string;
		live: string;
		testCommit: string;
		liveCommit: string;
	};
	selectedStart: string | null;
};

export const LANE_COLORS = ['#dc7b1d', '#7a3fa0', '#078779', '#c43b3b'];

export const ISSUE_POOL: Array<[string, string]> = [
	['Versienummer in dashboard klopt niet', 'fix/versienummer'],
	['Gripper sluit te traag bij appel-pick', 'fix/gripper-snelheid'],
	['Camera-status ontbreekt op statuspagina', 'feat/camera-status'],
	['Kalibratieknop geeft geen feedback', 'feat/kalibratie-feedback'],
	['Log-bestanden groeien onbeperkt', 'fix/log-rotatie']
];

const COMMIT_MESSAGES = [
	'eerste opzet',
	'fix review-opmerking',
	'test toegevoegd',
	'typo',
	'wip',
	'randgeval afgevangen'
];

export const MISSIONS = [
	'Maak een issue aan',
	'Maak een branch voor het issue',
	'Zet minstens 2 commits op de branch',
	'Open een pull request',
	'Merge de PR met een merge commit',
	'Herhaal missie 1–4 en kies nu squash & merge — vergelijk de kaart',
	'Ruim een gemergde branch op',
	'Merge een PR en zie: de nieuwe versie komt alléén op test',
	'Promoveer de geteste versie naar live',
	'Draai een merge terug met een revert — ook dát is gewoon een nieuwe versie',
	'Klik een oudere commit op main aan en maak daar een branch vanaf — een “tijdreis”',
	'Klik een commit op een niet-gemergde branch aan en maak daar een branch vanaf — een “branch-van-branch”'
];

function log(state: SimulationState, title: string, why: string) {
	state.logs.unshift({ id: ++state.logNo, title, why });
}

function tick(state: SimulationState, mission: number) {
	state.missions[mission] = true;
}

export function commitById(state: SimulationState, id: string | null | undefined) {
	return state.commits.find((commit) => commit.id === id);
}

export function ancestry(state: SimulationState, headId: string | null | undefined) {
	const seen = new Set<string>();
	const stack = headId ? [headId] : [];

	while (stack.length) {
		const id = stack.pop();
		if (!id || seen.has(id)) continue;
		seen.add(id);
		const commit = commitById(state, id);
		if (commit) stack.push(...commit.parents);
	}

	return seen;
}

export function aheadOfMain(state: SimulationState, branchName: string) {
	const branch = state.branches[branchName];
	if (!branch) return [];
	const mainHistory = ancestry(state, state.branches.main.head);
	return [...ancestry(state, branch.head)]
		.filter((id) => !mainHistory.has(id))
		.map((id) => commitById(state, id))
		.filter((commit): commit is Commit => Boolean(commit));
}

function addCommit(
	state: SimulationState,
	branchName: string,
	msg: string,
	parents: string[],
	kind: CommitKind = 'normal'
) {
	const commit: Commit = {
		id: `c${String(state.seq + 1).padStart(3, '0')}`,
		branch: branchName,
		msg,
		parents,
		kind,
		x: state.seq
	};
	state.seq += 1;
	state.commits.push(commit);
	state.branches[branchName].head = commit.id;
	return commit;
}

export function createSimulation(): SimulationState {
	const state: SimulationState = {
		commits: [],
		branches: {},
		issues: [],
		prs: [],
		logs: [],
		active: 'main',
		seq: 0,
		issueNo: 16,
		prNo: 0,
		logNo: 0,
		laneFree: [1, 2, 3, 4],
		missions: Array.from({ length: MISSIONS.length }, () => false),
		hasMergeCommit: false,
		hasSquashCommit: false,
		relNum: 0,
		env: { test: 'v0.1.0', live: 'v0.1.0', testCommit: '', liveCommit: '' },
		selectedStart: null
	};

	state.branches.main = {
		name: 'main',
		lane: 0,
		color: '#1756a4',
		head: '',
		merged: false
	};
	const initial = addCommit(state, 'main', 'initiële versie', []);
	const release = addCommit(state, 'main', 'release v0.1.0', [initial.id]);
	state.env.testCommit = release.id;
	state.env.liveCommit = release.id;
	return state;
}

export function newIssue(state: SimulationState) {
	const [title, slug] = ISSUE_POOL[state.issues.length % ISSUE_POOL.length];
	const issue = { num: ++state.issueNo, title, slug, branch: null, closed: false };
	state.issues.push(issue);
	log(state, `Issue #${issue.num} aangemaakt`, 'Een issue beschrijft wat er moet gebeuren en waarom — nog geen code. Maak er nu een branch bij.');
	tick(state, 0);
}

export function newBranch(state: SimulationState, issueNum: number) {
	const issue = state.issues.find((item) => item.num === issueNum);
	if (!issue || issue.branch) return;

	const name = `${issue.slug}-${issue.num}`;
	const lane = state.laneFree.length ? state.laneFree.shift()! : 1;
	const startId = state.selectedStart || state.branches.main.head;
	const startCommit = commitById(state, startId);
	const fromBranch = startCommit?.branch || 'main';
	const isMainHead = startId === state.branches.main.head;

	state.branches[name] = {
		name,
		lane,
		color: LANE_COLORS[(lane - 1) % LANE_COLORS.length],
		head: startId,
		merged: false,
		issue: issue.num
	};
	issue.branch = name;
	state.active = name;
	state.selectedStart = null;

	if (isMainHead) {
		log(state, `Branch ${name} gemaakt vanaf main`, 'Een branch is een eigen zijspoor: je vertrekt vanaf het laatste station van main en kunt vrij experimenteren zonder dat main of live er iets van merkt. Dit is je ontwikkelomgeving.');
	} else if (fromBranch === 'main') {
		tick(state, 10);
		log(state, `Branch ${name} gemaakt vanaf commit ${startId.slice(0, 5)}`, 'Je vertrekt vanaf een ouder punt in de geschiedenis in plaats van vanaf de huidige kop van main. Dat is een kleine tijdreis: latere commits op main horen niet bij deze branch.');
	} else {
		tick(state, 11);
		log(state, `Branch ${name} gemaakt vanaf ${fromBranch}`, 'Je vertrekt vanaf een commit op een branch die nog niet gemergd is. Dat heet een branch-van-branch: handig als jouw werk afhankelijk is van werk dat nog in review staat.');
	}
	tick(state, 1);
}

export function addBranchCommit(state: SimulationState) {
	const branch = state.branches[state.active];
	if (!branch || branch.name === 'main' || branch.merged) return;
	const msg = COMMIT_MESSAGES[state.commits.length % COMMIT_MESSAGES.length];
	const commit = addCommit(state, branch.name, msg, [branch.head]);
	log(state, `Commit ${commit.id} op ${branch.name}`, 'Een commit is een station: een vastgelegd tussenpunt waar je altijd naar terug kunt.');
	if (aheadOfMain(state, branch.name).length >= 2) tick(state, 2);
}

export function openPullRequest(state: SimulationState, branchName: string) {
	const branch = state.branches[branchName];
	if (!branch || branch.name === 'main' || branch.merged) return;
	if (state.prs.some((pr) => pr.branch === branchName && pr.state === 'open')) return;
	const pr = { num: ++state.prNo, branch: branchName, state: 'open' as const, issue: branch.issue };
	state.prs.push(pr);
	log(state, `PR #${pr.num} geopend: ${branchName} → main`, 'Een pull request is het voorstel om jouw zijspoor aan te laten sluiten op main — het moment voor review en CI-checks voordat er iets samengevoegd wordt.');
	tick(state, 3);
}

function release(state: SimulationState) {
	const version = `v0.1.${++state.relNum}`;
	state.env.test = version;
	state.env.testCommit = state.branches.main.head;
	tick(state, 7);
	log(state, `CI bouwt ${version} en zet hem op test`, `Elke wijziging op main triggert de CI: die bouwt automatisch een nieuwe versie en rolt hem uit naar test. Live blijft ${state.env.live} totdat jij bewust promoveert.`);
}

export function mergePullRequest(state: SimulationState, prNum: number, squash: boolean) {
	const pr = state.prs.find((item) => item.num === prNum);
	if (!pr || pr.state !== 'open') return;
	const branch = state.branches[pr.branch];
	const ahead = aheadOfMain(state, pr.branch);
	if (!branch || ahead.length === 0) return;

	if (squash) {
		const mainHead = state.branches.main.head;
		const squashedCommit = addCommit(state, 'main', `${pr.branch} (squash van ${ahead.length} commits, PR #${pr.num})`, [mainHead], 'squash');
		ahead.forEach((commit) => (commit.squashed = true));
		state.hasSquashCommit = true;
		log(state, `PR #${pr.num} — squash & merge`, `De ${ahead.length} commits van ${pr.branch} zijn samengeperst tot één nieuwe commit op main. De losse stations blijven op de kaart staan, maar vervagen omdat ze niet in de main-historie zitten.`);
		void squashedCommit;
	} else {
		const mainHead = state.branches.main.head;
		addCommit(state, 'main', `merge PR #${pr.num} (${pr.branch})`, [mainHead, branch.head], 'merge');
		state.hasMergeCommit = true;
		log(state, `PR #${pr.num} — merge commit`, `Main heeft nu een overstapstation met twee ouders: de oude main én de kop van ${pr.branch}. Alle ${ahead.length} commits van het zijspoor horen nu ook bij de historie van main.`);
	}

	pr.state = 'merged';
	branch.merged = true;
	const issue = state.issues.find((item) => item.num === pr.issue);
	if (issue) issue.closed = true;
	if (state.active === branch.name) state.active = 'main';
	if (state.hasMergeCommit) tick(state, 4);
	if (state.hasMergeCommit && state.hasSquashCommit) tick(state, 5);
	release(state);
}

export function deleteBranch(state: SimulationState, branchName: string) {
	const branch = state.branches[branchName];
	if (!branch || branch.name === 'main' || branch.deleted) return;
	state.laneFree = [...state.laneFree, branch.lane].sort((a, b) => a - b);
	branch.deleted = true;
	if (state.active === branchName) state.active = 'main';
	tick(state, 6);
	log(state, `Branch ${branchName} opgeruimd`, 'Na de merge heeft het zijspoor geen functie meer. De commits blijven bestaan via de merge of de PR; alleen het naambordje is weg.');
}

export function promote(state: SimulationState) {
	if (state.env.test === state.env.live) return;
	state.env.live = state.env.test;
	state.env.liveCommit = state.env.testCommit;
	tick(state, 8);
	log(state, `${state.env.live} gepromoveerd naar live`, 'Je zet exact dezelfde build door die op test al bewezen heeft te werken. Dit is altijd een bewuste, handmatige stap: de enige knop die het echte systeem raakt.');
}

export function revertLastMerge(state: SimulationState) {
	const head = commitById(state, state.branches.main.head);
	if (!head || (head.kind !== 'merge' && head.kind !== 'squash')) return;
	addCommit(state, 'main', `revert: ${head.msg}`, [head.id], 'revert');
	tick(state, 9);
	log(state, 'Revert-commit op main', 'Terugdraaien is in git vooruit werken: je gooit geen historie weg, maar zet er een nieuwe commit bovenop die de wijziging omkeert. De CI bouwt daarna eerst weer een versie voor test.');
	release(state);
}

export function selectStart(state: SimulationState, commitId: string) {
	const commit = commitById(state, commitId);
	if (!commit) return;
	state.selectedStart = commit.id;
	log(state, `Startpunt gekozen: commit ${commit.id.slice(0, 5)} op ${commit.branch}`, 'De volgende nieuwe branch vertrekt vanaf hier in plaats van vanaf de huidige kop van main. Maak nu een issue en klik Maak branch.');
}

export function clearStart(state: SimulationState) {
	state.selectedStart = null;
	log(state, 'Startpunt teruggezet naar main', 'De volgende nieuwe branch vertrekt weer vanaf de huidige kop van main.');
}
