<script lang="ts">
	import { onMount } from 'svelte';
	import {
		MISSIONS,
		aheadOfMain,
		commitById,
		createSimulation,
		addBranchCommit,
		clearStart,
		deleteBranch,
		mergePullRequest,
		newBranch,
		newIssue,
		openPullRequest,
		promote,
		revertLastMerge,
		selectStart,
		type Branch,
		type Commit,
		type SimulationState
	} from '$lib/gitRoutekaart';

	let state: SimulationState = createSimulation();
	let theme: 'light' | 'dark' = 'light';
	let activeBranch: Branch;
	let missionCount: number;
	let testIsAhead: boolean;
	let liveHead: Commit | undefined;
	let testHead: Commit | undefined;
	let mainHead: Commit | undefined;
	let branches: Branch[];
	let canRevertState = false;

	$: activeBranch = state.branches[state.active];
	$: missionCount = state.missions.filter(Boolean).length;
	$: testIsAhead = state.env.test !== state.env.live;
	$: liveHead = commitById(state, state.env.liveCommit);
	$: testHead = commitById(state, state.env.testCommit);
	$: mainHead = commitById(state, state.branches.main.head);
	$: branches = Object.values(state.branches).filter((branch): branch is Branch => !branch.deleted);
	$: canRevertState = mainHead?.kind === 'merge' || mainHead?.kind === 'squash';

	const MAP_SPACING = 92;
	const MAP_X0 = 72;
	const MAP_Y0 = 70;
	const MAP_LANE_HEIGHT = 70;

	onMount(() => {
		const stored = localStorage.getItem('git-routekaart-theme');
		const preferred = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
		theme = stored === 'dark' || stored === 'light' ? stored : preferred;
		applyTheme();
	});

	function applyTheme() {
		document.documentElement.dataset.theme = theme;
	}

	function toggleTheme() {
		theme = theme === 'light' ? 'dark' : 'light';
		localStorage.setItem('git-routekaart-theme', theme);
		applyTheme();
	}

	function resetSimulation() {
		state = createSimulation();
	}

	function mutate(action: () => void) {
		action();
		state = { ...state };
	}

	function mapLaneCount() {
		return Math.max(2, ...Object.values(state.branches).map((branch) => branch.lane + 1));
	}

	function mapWidth() {
		return MAP_X0 + Math.max(state.commits.length, 4) * MAP_SPACING + 100;
	}

	function mapHeight() {
		return MAP_Y0 + mapLaneCount() * MAP_LANE_HEIGHT;
	}

	function laneY(lane: number) {
		return MAP_Y0 + lane * MAP_LANE_HEIGHT;
	}

	function commitX(commit: Commit) {
		return MAP_X0 + commit.x * MAP_SPACING;
	}

	function commitBranch(commit: Commit): Branch {
		return state.branches[commit.branch] ?? state.branches.main;
	}

	function commitY(commit: Commit) {
		return laneY(commitBranch(commit).lane);
	}

	function commitPath(parent: Commit, child: Commit) {
		const startX = commitX(parent);
		const startY = commitY(parent);
		const endX = commitX(child);
		const endY = commitY(child);
		if (startY === endY) return `M ${startX} ${startY} H ${endX}`;
		const mid = startX + Math.min(48, (endX - startX) / 2);
		return `M ${startX} ${startY} C ${mid} ${startY}, ${mid} ${endY}, ${Math.min(startX + 82, endX)} ${endY} H ${endX}`;
	}

	function startLabel() {
		if (!state.selectedStart) return 'main (huidige kop)';
		const commit = commitById(state, state.selectedStart);
		return commit ? `commit ${commit.id.slice(0, 5)} op ${commit.branch}` : 'onbekend';
	}

	function branchHasOpenPr(branchName: string) {
		return state.prs.some((pr) => pr.branch === branchName && pr.state === 'open');
	}

	function isNextMission(index: number) {
		return !state.missions[index] && state.missions.findIndex((done) => !done) === index;
	}
</script>

<svelte:head>
	<title>Git Routekaart — issues, branches & merges</title>
	<meta
		name="description"
		content="Een interactieve simulatie van issue naar branch, pull request, merge, test en live."
	/>
	<link rel="preconnect" href="https://fonts.googleapis.com" />
	<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin="anonymous" />
	<link
		href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&family=IBM+Plex+Mono:wght@400;500;600&display=swap"
		rel="stylesheet"
	/>
</svelte:head>

<div class="min-h-screen px-4 py-5 text-[var(--route-ink)] sm:px-6 lg:px-8">
	<header class="mx-auto mb-5 flex max-w-[1500px] flex-wrap items-start justify-between gap-4">
		<div>
			<div class="mb-1 flex flex-wrap items-center gap-3">
				<h1 class="text-2xl font-bold tracking-tight sm:text-[1.7rem]">
					<span class="mr-1 text-[var(--route-main)]">◉</span> Git Routekaart
				</h1>
				<span class="badge badge-outline border-[var(--route-line)] text-[var(--route-muted)]">SvelteKit prototype</span>
			</div>
			<p class="max-w-3xl text-sm leading-6 text-[var(--route-muted)]">
				Speel een moderne git-werkstroom na: issue → branch → PR → merge → test → live. Elke lijn is een branch, elk station een commit.
			</p>
		</div>
		<button class="btn btn-sm btn-ghost gap-2 text-[var(--route-muted)]" type="button" onclick={toggleTheme}>
			<span aria-hidden="true">{theme === 'light' ? '☾' : '☀'}</span>
			{theme === 'light' ? 'Donker thema' : 'Licht thema'}
		</button>
	</header>

	<main class="mx-auto grid max-w-[1500px] items-start gap-4 xl:grid-cols-[minmax(0,1fr)_18rem_18rem]">
		<section class="min-w-0 space-y-4">
			<div class="surface overflow-hidden rounded-2xl">
				<div class="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--route-line)] px-4 py-3 sm:px-5">
					<div>
						<p class="text-[0.68rem] font-bold uppercase tracking-[0.16em] text-[var(--route-muted)]">De commit-routemap</p>
						<p class="mt-1 text-sm text-[var(--route-muted)]">Klik een station om daar een nieuwe branch te laten vertrekken.</p>
					</div>
					<div class="flex items-center gap-2 text-xs text-[var(--route-muted)]">
						<span class="inline-block h-2.5 w-2.5 rounded-full bg-[var(--route-main)]"></span>
						<span class="mono">main</span>
						<span>is de bron van elke versie</span>
					</div>
				</div>
				<div class="map-scroll px-2 py-4 sm:px-4">
					<svg
						class="map-svg block"
						width={mapWidth()}
						height={mapHeight()}
						viewBox={`0 0 ${mapWidth()} ${mapHeight()}`}
						role="img"
						aria-label="Interactieve commit-grafiek"
					>
						{#each state.commits as commit (commit.id)}
							{#each commit.parents as parentId, parentIndex}
								{@const parent = commitById(state, parentId)}
								{#if parent}
									<path
										d={commitPath(parent, commit)}
										fill="none"
										stroke={parentIndex === 1 ? commitBranch(parent).color : commitBranch(commit).color}
										stroke-width="7"
										stroke-linecap="round"
										stroke-dasharray={commit.squashed || parent.squashed ? '4 7' : undefined}
										opacity={commit.squashed || parent.squashed ? 0.35 : 1}
									/>
								{/if}
							{/each}
						{/each}

						{#each state.commits as commit (commit.id)}
							{@const branch = commitBranch(commit)}
							<g
								class="station"
								class:opacity-40={commit.squashed}
								role="button"
								tabindex="0"
								aria-label={`Start nieuwe branch vanaf ${commit.id}`}
								onclick={() => mutate(() => selectStart(state, commit.id))}
								onkeydown={(event) => {
									if (event.key === 'Enter' || event.key === ' ') mutate(() => selectStart(state, commit.id));
								}}
							>
								<title>{commit.id} — {commit.msg}</title>
								{#if state.selectedStart === commit.id}
									<circle
										cx={commitX(commit)}
										cy={commitY(commit)}
										r="18"
										fill="none"
										stroke="var(--route-main)"
										stroke-width="2"
										stroke-dasharray="3 4"
									/>
								{/if}
								<circle
									cx={commitX(commit)}
									cy={commitY(commit)}
									r={commit.kind === 'merge' ? 13 : 9}
									fill="var(--route-surface)"
									stroke={branch.color}
									stroke-width="3"
								/>
								{#if commit.kind === 'merge'}
									<circle cx={commitX(commit)} cy={commitY(commit)} r="4" fill={branch.color} />
								{:else if commit.kind === 'squash'}
									<text x={commitX(commit)} y={commitY(commit) + 4} text-anchor="middle" font-size="10" font-weight="700" fill={branch.color}>S</text>
								{:else if commit.kind === 'revert'}
									<text x={commitX(commit)} y={commitY(commit) + 4} text-anchor="middle" font-size="10" font-weight="700" fill="var(--route-red)">R</text>
								{/if}
								<text x={commitX(commit)} y={commitY(commit) + 28} text-anchor="middle" font-size="10" fill="var(--route-muted)">{commit.id}</text>
							</g>
						{/each}

						{#each branches as branch (branch.name)}
							{@const branchHead = commitById(state, branch.head)}
							{#if branchHead}
								<text
									x={commitX(branchHead) + 17}
									y={commitY(branchHead) - 17}
									font-size="11"
									font-weight="700"
									fill={branch.color}
								>
									{branch.name}{branch.merged ? ' ✓' : ''}{state.active === branch.name ? ' ◀ HEAD' : ''}
								</text>
							{/if}
						{/each}

						{#if testHead && liveHead && testHead.id === liveHead.id}
							<text x={commitX(testHead)} y={laneY(0) - 27} text-anchor="middle" font-size="16">
								<title>test én live staan hier</title>🧪🚀
							</text>
						{:else}
							{#if testHead}
								<text x={commitX(testHead)} y={laneY(0) - 27} text-anchor="middle" font-size="16" aria-label="test-versie">🧪</text>
							{/if}
							{#if liveHead}
								<text x={commitX(liveHead)} y={laneY(0) - 27} text-anchor="middle" font-size="16" aria-label="live-versie">🚀</text>
							{/if}
						{/if}
					</svg>
				</div>
				<div class="flex flex-wrap gap-x-5 gap-y-2 border-t border-[var(--route-line)] px-4 py-3 text-xs text-[var(--route-muted)] sm:px-5">
					<span class="inline-flex items-center gap-2"><i class="h-1.5 w-5 rounded-full bg-[var(--route-main)]"></i> main</span>
					{#each branches.filter((branch) => branch.name !== 'main') as branch (branch.name)}
						<span class="inline-flex items-center gap-2"><i class="h-1.5 w-5 rounded-full" style={`background:${branch.color}`}></i> {branch.name}</span>
					{/each}
					<span>◎ merge</span><span>S squash</span><span>R revert</span><span>🧪 test</span><span>🚀 live</span>
				</div>
			</div>

			<div class="surface rounded-2xl p-4 sm:p-5">
				<div class="mb-4 flex items-center justify-between gap-3">
					<div>
						<p class="text-[0.68rem] font-bold uppercase tracking-[0.16em] text-[var(--route-muted)]">Waarom drie omgevingen?</p>
						<h2 class="mt-1 text-lg font-bold">Van veilig experiment naar echte gebruiker</h2>
					</div>
					<span class="badge badge-ghost text-[var(--route-muted)]">de kernregel</span>
				</div>
				<div class="grid gap-3 md:grid-cols-3">
					<div class="rounded-xl border-2 border-[var(--route-warn)]/60 p-4">
						<div class="mb-2 flex items-center gap-2"><span class="badge badge-warning badge-sm">1</span><h3 class="font-bold">Ontwikkel</h3></div>
						<p class="text-sm leading-6 text-[var(--route-muted)]">Jouw branch, jouw machine. Hier bouw je, breek je en probeer je — fouten kosten niemand anders iets.</p>
					</div>
					<div class="rounded-xl border-2 border-[var(--route-main)]/60 p-4">
						<div class="mb-2 flex items-center gap-2"><span class="badge badge-info badge-sm">2</span><h3 class="font-bold">Test</h3></div>
						<p class="text-sm leading-6 text-[var(--route-muted)]">Elke merge naar <code class="rounded bg-[var(--route-bg)] px-1.5 py-0.5">main</code> komt automatisch hier terecht. Fouten worden zichtbaar zonder gebruikerslast.</p>
					</div>
					<div class="rounded-xl border-2 border-[var(--route-good)]/60 p-4">
						<div class="mb-2 flex items-center gap-2"><span class="badge badge-success badge-sm">3</span><h3 class="font-bold">Live</h3></div>
						<p class="text-sm leading-6 text-[var(--route-muted)]">Alleen een versie die op test bewezen werkt, gaat via een bewuste promotie naar het echte systeem.</p>
					</div>
				</div>
				<p class="mt-4 rounded-xl bg-[var(--route-bg)] px-4 py-3 text-sm text-[var(--route-muted)]">De kernregel: <strong class="text-[var(--route-ink)]">een merge mag nooit rechtstreeks live gaan.</strong> Probeer het rechts: merge een PR en kijk welke omgeving verandert.</p>
			</div>

			<div class="surface rounded-2xl p-4 sm:p-5">
				<p class="mb-4 text-[0.68rem] font-bold uppercase tracking-[0.16em] text-[var(--route-muted)]">Spiekbrief — wat doet elke merge-knop?</p>
				<div class="grid gap-5 md:grid-cols-2">
					<div>
						<div class="mb-2 flex items-center gap-2"><span class="badge badge-primary badge-sm">◎</span><h3 class="font-bold">Merge commit</h3></div>
						<div class="relative mb-3 h-12">
							<div class="absolute left-3 right-3 top-7 h-1 rounded-full bg-[var(--route-main)]"></div>
							<div class="absolute left-[22%] top-2 h-1 w-[48%] rotate-[20deg] rounded-full bg-[var(--route-orange)]"></div>
							<div class="absolute left-[10%] top-[21px] h-3 w-3 rounded-full border-2 border-[var(--route-main)] bg-[var(--route-surface)]"></div>
							<div class="absolute left-[63%] top-1 h-3 w-3 rounded-full border-2 border-[var(--route-orange)] bg-[var(--route-surface)]"></div>
							<div class="absolute right-[10%] top-[18px] h-5 w-5 rounded-full border-[3px] border-[var(--route-main)] bg-[var(--route-surface)]"></div>
						</div>
						<p class="text-sm leading-6 text-[var(--route-muted)]">Alle branch-commits blijven zichtbaar, plus één overstapstation met twee ouders. Volledige historie, maar een drukkere kaart.</p>
					</div>
					<div>
						<div class="mb-2 flex items-center gap-2"><span class="badge badge-secondary badge-sm">S</span><h3 class="font-bold">Squash & merge</h3></div>
						<div class="relative mb-3 h-12">
							<div class="absolute left-3 right-3 top-7 h-1 rounded-full bg-[var(--route-main)]"></div>
							<div class="absolute left-[22%] top-2 h-1 w-[43%] rotate-[20deg] rounded-full bg-[var(--route-orange)] opacity-40 [background-image:repeating-linear-gradient(90deg,transparent_0,transparent_5px,var(--route-surface)_5px,var(--route-surface)_9px)]"></div>
							<div class="absolute left-[10%] top-[21px] h-3 w-3 rounded-full border-2 border-[var(--route-main)] bg-[var(--route-surface)]"></div>
							<div class="absolute left-[52%] top-1 h-3 w-3 rounded-full border-2 border-[var(--route-orange)] bg-[var(--route-surface)] opacity-50"></div>
							<div class="absolute right-[10%] top-[21px] h-3 w-3 rounded-full border-2 border-[var(--route-main)] bg-[var(--route-surface)]"></div>
						</div>
						<p class="text-sm leading-6 text-[var(--route-muted)]">De losse branch-commits worden samengeperst tot één nieuwe commit op main. Overzichtelijker, terwijl de PR de details bewaart.</p>
					</div>
				</div>
				<p class="mt-4 text-sm text-[var(--route-muted)]">Vuistregel: <strong class="text-[var(--route-ink)]">squash & merge</strong> voor veel kleine “wip”-commits; zo krijgt main één duidelijk station per PR.</p>
			</div>
		</section>

		<aside class="flex flex-col gap-4">
			<div class="surface rounded-2xl p-4">
				<div class="mb-3 flex items-center justify-between gap-2">
					<p class="text-[0.68rem] font-bold uppercase tracking-[0.16em] text-[var(--route-muted)]">Omgevingen</p>
					<span class:badge-warning={testIsAhead} class="badge badge-ghost badge-sm text-[var(--route-muted)]">{testIsAhead ? 'test loopt voor' : 'gelijk'}</span>
				</div>
				<div class="grid grid-cols-[1fr_auto_1fr_auto_1fr] items-stretch gap-1">
					<div class="rounded-lg border-2 border-[var(--route-warn)]/70 p-2 text-center">
						<div class="text-[0.62rem] font-bold uppercase tracking-wider text-[var(--route-muted)]">ontwikkel</div>
						<div class="mono mt-1 truncate text-xs font-semibold">{activeBranch?.name ?? '—'}</div>
						<div class="mt-1 text-[0.62rem] text-[var(--route-muted)]">jouw branch</div>
					</div>
					<div class="self-center text-[var(--route-muted)]">→</div>
					<div class="rounded-lg border-2 border-[var(--route-main)]/70 p-2 text-center">
						<div class="text-[0.62rem] font-bold uppercase tracking-wider text-[var(--route-muted)]">test</div>
						<div class="mono mt-1 truncate text-xs font-semibold">{state.env.test}</div>
						<div class="mt-1 text-[0.62rem] text-[var(--route-muted)]">elke merge</div>
					</div>
					<div class="self-center text-[var(--route-muted)]">→</div>
					<div class="rounded-lg border-2 border-[var(--route-good)]/70 p-2 text-center" class:bg-[var(--route-warn)]={testIsAhead}>
						<div class="text-[0.62rem] font-bold uppercase tracking-wider text-[var(--route-muted)]">live</div>
						<div class="mono mt-1 truncate text-xs font-semibold">{state.env.live}</div>
						<div class="mt-1 text-[0.62rem] text-[var(--route-muted)]">na akkoord</div>
					</div>
				</div>
				<button class="btn btn-sm btn-block mt-3 border-[var(--route-main)] bg-transparent text-[var(--route-ink)] hover:bg-[var(--route-main)]/10" type="button" disabled={!testIsAhead} onclick={() => mutate(() => promote(state))}>
					🚀 Promoveer test → live
				</button>
				<p class="mt-1 text-center text-[0.68rem] text-[var(--route-muted)]">zet de geteste versie op het echte systeem</p>
				<button class="btn btn-sm btn-block mt-3 border-[var(--route-red)]/50 bg-transparent text-[var(--route-ink)] hover:bg-[var(--route-red)]/10" type="button" disabled={!canRevertState} onclick={() => mutate(() => revertLastMerge(state))}>
					↩ Revert laatste merge op main
				</button>
				<p class="mt-1 text-center text-[0.68rem] text-[var(--route-muted)]">draait de wijziging terug met een nieuwe commit</p>
			</div>

			<div class="surface rounded-2xl p-4">
				<div class="mb-3 flex items-center justify-between">
					<p class="text-[0.68rem] font-bold uppercase tracking-[0.16em] text-[var(--route-muted)]">Missies</p>
					<span class="mono text-xs font-semibold text-[var(--route-muted)]">{missionCount}/{MISSIONS.length}</span>
				</div>
				<progress class="progress progress-success h-1.5 w-full" value={missionCount} max={MISSIONS.length}></progress>
				<ol class="mt-3 space-y-1.5">
					{#each MISSIONS as mission, index}
						<li class:next={isNextMission(index)} class="mission-item flex items-start gap-2 text-xs text-[var(--route-muted)]" class:text-[var(--route-ink)]={state.missions[index]}>
							<span class="mt-0.5 inline-flex h-4 w-4 shrink-0 items-center justify-center rounded border text-[0.62rem]" class:bg-[var(--route-good)]={state.missions[index]} class:border-[var(--route-good)]={state.missions[index]} class:text-white={state.missions[index]}>
								{state.missions[index] ? '✓' : index + 1}
							</span>
							<span class="mission-label leading-5">{mission}</span>
						</li>
					{/each}
				</ol>
				{#if missionCount === MISSIONS.length}
					<div class="alert alert-success mt-4 px-3 py-2 text-xs">🏆 Alle missies voltooid! Je kent nu de hele route.</div>
				{/if}
			</div>
		</aside>

		<aside class="flex flex-col gap-4">
			<div class="surface rounded-2xl p-4">
				<p class="mb-3 text-[0.68rem] font-bold uppercase tracking-[0.16em] text-[var(--route-muted)]">Acties</p>
				<div class="mb-3 rounded-lg border border-dashed border-[var(--route-line)] bg-[var(--route-bg)] px-3 py-2 text-xs text-[var(--route-muted)]">
					Startpunt nieuwe branch:
					<strong class="mono text-[var(--route-ink)]">{startLabel()}</strong>
					{#if state.selectedStart}
						<button class="ml-1 text-[var(--route-main)] underline" type="button" onclick={() => mutate(() => clearStart(state))}>✕ terug naar main</button>
					{:else}
						<span class="block pt-1 text-[0.68rem]">klik een commit op de kaart om een ander startpunt te kiezen</span>
					{/if}
				</div>

				<p class="mb-2 text-xs text-[var(--route-muted)]">Actieve branch (klik om te wisselen):</p>
				<div class="mb-3 flex flex-wrap gap-1.5">
					{#each branches as branch (branch.name)}
						<button
							class="badge badge-outline cursor-pointer gap-1 px-2 py-3 font-mono text-[0.68rem]"
							class:bg-[var(--route-bg)]={state.active === branch.name}
							class:font-bold={state.active === branch.name}
							style={`color:${branch.color};border-color:${branch.color}`}
							type="button"
							onclick={() => mutate(() => (state.active = branch.name))}
						>
							{branch.name}{branch.merged ? ' ✓' : ''}
						</button>
					{/each}
				</div>
				<button class="btn btn-primary btn-sm btn-block justify-start" type="button" onclick={() => mutate(() => newIssue(state))}>
					📋 Nieuw issue
				</button>
				<p class="mb-2 mt-1 text-[0.68rem] text-[var(--route-muted)]">Elk stukje werk begint met een issue</p>
				<button class="btn btn-outline btn-sm btn-block justify-start" type="button" disabled={state.active === 'main' || activeBranch?.merged} onclick={() => mutate(() => addBranchCommit(state))}>
					💾 Commit op actieve branch
				</button>
				<p class="mt-1 text-[0.68rem] text-[var(--route-muted)]">
					{state.active === 'main' ? 'Op main committen we nooit direct — maak eerst een branch' : `voegt een station toe aan ${state.active}`}
				</p>

				<div class="mt-4 space-y-2">
					{#each state.issues as issue (issue.num)}
						<div class="rounded-lg border border-l-4 border-[var(--route-line)] border-l-[var(--route-warn)] p-2.5" class:border-l-[var(--route-good)]={issue.closed} class:opacity-70={issue.closed}>
							<div class="flex items-start justify-between gap-2 text-xs">
								<span class="ticket-copy"><span class="mono mr-1 text-[var(--route-muted)]">#{issue.num}</span>{issue.title}</span>
								<span class="badge badge-xs shrink-0" class:badge-success={issue.closed} class:badge-warning={!issue.closed}>{issue.closed ? 'gesloten' : 'open'}</span>
							</div>
							{#if !issue.branch && !issue.closed}
								<button class="btn btn-ghost btn-xs mt-2 border border-[var(--route-line)]" type="button" onclick={() => mutate(() => newBranch(state, issue.num))}>🌿 Maak branch</button>
							{/if}
						</div>
					{/each}

					{#each state.prs as pr (pr.num)}
						{@const ahead = aheadOfMain(state, pr.branch).length}
						<div class="rounded-lg border border-l-4 border-[var(--route-line)] border-l-[var(--route-main)] p-2.5" class:border-l-[var(--route-good)]={pr.state === 'merged'} class:opacity-70={pr.state === 'merged'}>
							<div class="flex items-start justify-between gap-2 text-xs">
								<span class="ticket-copy"><span class="mono mr-1 text-[var(--route-muted)]">PR #{pr.num}</span><code>{pr.branch}</code> → <code>main</code></span>
								<span class="badge badge-xs shrink-0" class:badge-success={pr.state === 'merged'} class:badge-info={pr.state === 'open'}>{pr.state === 'merged' ? 'merged' : `${ahead} commit${ahead === 1 ? '' : 's'}`}</span>
							</div>
							{#if pr.state === 'open'}
								<div class="mt-2 flex flex-wrap gap-1.5">
									<button class="btn btn-outline btn-xs" type="button" disabled={ahead === 0} onclick={() => mutate(() => mergePullRequest(state, pr.num, false))}>Merge commit</button>
									<button class="btn btn-secondary btn-xs" type="button" disabled={ahead === 0} onclick={() => mutate(() => mergePullRequest(state, pr.num, true))}>Squash & merge</button>
								</div>
							{:else if !state.branches[pr.branch]?.deleted}
								<button class="btn btn-ghost btn-xs mt-2 border border-[var(--route-line)]" type="button" onclick={() => mutate(() => deleteBranch(state, pr.branch))}>🗑 Verwijder branch</button>
							{/if}
						</div>
					{/each}

					{#each branches as branch (branch.name)}
						{#if branch.name !== 'main' && !branch.merged && !branchHasOpenPr(branch.name) && aheadOfMain(state, branch.name).length > 0}
							<button class="btn btn-ghost btn-xs justify-start border border-[var(--route-line)]" type="button" onclick={() => mutate(() => openPullRequest(state, branch.name))}>⇪ Open PR voor {branch.name}</button>
						{/if}
					{/each}
				</div>
				<div class="mt-4 text-right"><button class="btn btn-link btn-xs px-0 text-[var(--route-muted)]" type="button" onclick={resetSimulation}>↺ opnieuw beginnen</button></div>
			</div>

			<div class="surface rounded-2xl p-4">
				<div class="mb-3 flex items-center justify-between gap-2">
					<p class="text-[0.68rem] font-bold uppercase tracking-[0.16em] text-[var(--route-muted)]">Logboek</p>
					<span class="text-xs text-[var(--route-muted)]">wat gebeurde er net?</span>
				</div>
				<div class="log-scroll text-xs leading-5">
					{#if state.logs.length === 0}
						<div class="log-entry"><strong>Welkom!</strong><span class="mt-1 block text-[var(--route-muted)]">De blauwe lijn is <code>main</code>: de enige branch waar versies uit gebouwd worden. Begin met missie 1.</span></div>
					{:else}
						{#each state.logs as entry (entry.id)}
							<div class="log-entry"><strong>{entry.title}</strong><span class="mt-1 block text-[var(--route-muted)]">{entry.why}</span></div>
						{/each}
					{/if}
				</div>
			</div>
		</aside>
	</main>

	<footer class="mx-auto mt-6 max-w-[1500px] text-center text-xs text-[var(--route-muted)]">
		Deze prototype-simulatie wijzigt niets op GitHub. Later kan een serveractie hier een GitHub Actions-workflow starten.
	</footer>
</div>
