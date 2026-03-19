import { GET, PUT } from '../../../api/api';
import type {
    IdeaEntity,
    IdeaScoreEntity,
    ConfidenceLevel,
} from '../../../api/types';
import {
    Idea,
    computePriority,
} from '../../../api/types';
import {
    buildUserMap,
    userName,
    parseJson,
    getEdgeDataWithConfidence,
    type Metric,
} from './helpers';

export { Idea } from '../../../api/types';

export async function getIdeas(
): Promise<Idea[]> {
    const [ideas, userMap] = await Promise.all([
        GET<IdeaEntity[]>('ideas'),
        buildUserMap(),
    ]);
    return ideas
        .filter(
            idea => idea.status !== 'deleted',
        )
        .map(idea => new Idea(
            idea,
            userName(
                userMap,
                idea.submitted_by_id,
            ),
        ));
}

// ── Idea Detail ──────────────────

export async function getIdeaDetail(
    ideaId: string,
): Promise<Idea> {
    const [idea, userMap] = await Promise.all([
        GET<IdeaEntity>(`ideas/${ideaId}`),
        buildUserMap(),
    ]);
    return new Idea(
        idea,
        userName(
            userMap,
            idea.submitted_by_id,
        ),
    );
}

// ── Idea Review Queue ────────────────

export async function getReviewQueue(
): Promise<Idea[]> {
    const [ideas, userMap] = await Promise.all([
        GET<IdeaEntity[]>('ideas'),
        buildUserMap(),
    ]);

    return ideas
        .filter(
            idea => idea.status === 'in-review',
        )
        .map(idea => new Idea(
            idea,
            userName(
                userMap,
                idea.submitted_by_id,
            ),
        ));
}

// ── Idea Convert ──────────────────

export interface ConversionIdea {
    id: string;
    title: string;
    problemStatement: string;
    proposedSolution: string;
    expectedOutcome: string;
    score: number;
    estimatedDuration: string;
    estimatedCost: string;
}

export async function getIdeaForConversion(
    ideaId: string,
): Promise<ConversionIdea> {
    const [idea, scoreRow] = await Promise.all([
        GET<IdeaEntity>(`ideas/${ideaId}`),
        GET<IdeaScoreEntity | null>(
            `ideas/${ideaId}/score`,
        ),
    ]);
    return {
        id: idea.id,
        title: idea.title,
        problemStatement:
            idea.problem_statement || '',
        proposedSolution:
            idea.proposed_solution || '',
        expectedOutcome:
            idea.expected_outcome || '',
        score: scoreRow?.overall || idea.score,
        estimatedDuration:
            scoreRow?.estimated_duration || '',
        estimatedCost:
            scoreRow?.estimated_cost || '',
    };
}

// ── Approval Detail ─────────────────

export interface ApprovalIdea {
    id: string;
    title: string;
    description: string;
    submittedBy: string;
    submittedAt: string;
    priority: string;
    score: number;
    category: string;
    impact: {
        level: string;
        description: string;
    };
    effort: {
        level: string;
        durationEstimate: string;
        teamSize: string;
    };
    cost: {
        estimate: string;
        breakdown: string;
    };
    risks: {
        title: string;
        severity: 'high' | 'medium' | 'low';
        mitigation: string;
    }[];
    assumptions: string[];
    alignments: string[];
}

export interface ApprovalEdge {
    outcomes: {
        id: string;
        description: string;
        metrics: Omit<Metric, 'current'>[];
    }[];
    impact: {
        shortTerm: string;
        midTerm: string;
        longTerm: string;
    };
    confidence: ConfidenceLevel;
    owner: string;
}

export async function getIdeaForApproval(
    ideaId: string,
): Promise<ApprovalIdea> {
    const [idea, userMap] = await Promise.all([
        GET<IdeaEntity>(`ideas/${ideaId}`),
        buildUserMap(),
    ]);

    return {
        id: idea.id,
        title: idea.title,
        description: idea.description || '',
        submittedBy: userName(
            userMap,
            idea.submitted_by_id,
        ),
        submittedAt: idea.submitted_at || '',
        priority: computePriority(idea.score),
        score: idea.score,
        category: idea.category || '',
        impact: {
            level: idea.impact_label || '',
            description:
                idea.description || '',
        },
        effort: {
            level: idea.effort_label || '',
            durationEstimate:
                idea.effort_duration_estimate
                    || '',
            teamSize:
                idea.effort_team_size || '',
        },
        cost: {
            estimate:
                idea.cost_estimate || '',
            breakdown:
                idea.cost_breakdown || '',
        },
        risks: parseJson<
            ApprovalIdea['risks']
        >(idea.risks, []),
        assumptions: parseJson<string[]>(
            idea.assumptions,
            [],
        ),
        alignments: parseJson<string[]>(
            idea.alignments,
            [],
        ),
    };
}

export async function getEdgeForApproval(
    ideaId: string,
): Promise<ApprovalEdge> {
    return getEdgeDataWithConfidence(ideaId);
}

// ── Write Operations ─────────────────

export async function getIdea(
    id: string,
): Promise<IdeaEntity> {
    return GET<IdeaEntity>(`ideas/${id}`);
}

export async function putIdea(
    id: string,
    entity: Partial<IdeaEntity>,
): Promise<void> {
    await PUT(
        `ideas/${id}`,
        entity as Record<string, unknown>,
    );
}
