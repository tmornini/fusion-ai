import type {
    UserEntity,
    OrganizationEntity,
} from '../../../api/types.ts';
import { User } from '../../../api/types.ts';
import {
    initials,
    formatDate,
} from '../format.ts';
import { getCurrentUserRow } from './shared.ts';
import type { FetchContext } from './shared.ts';

export type {
    OrganizationEntity,
} from '../../../api/types.ts';

async function getOrganizationRow(
    ctx: FetchContext,
): Promise<OrganizationEntity> {
    return ctx.GET<OrganizationEntity>(
        'organization',
    );
}

export class Organization {
    readonly #entity: OrganizationEntity;

    constructor(entity: OrganizationEntity) {
        this.#entity = entity;
    }

    nameText(): string {
        return this.#entity.name;
    }

    domainText(): string {
        return this.#entity.domain;
    }

    toGeneralInfoDraft(): GeneralInfoDraft {
        return {
            name: this.#entity.name,
            domain: this.#entity.domain,
        };
    }

    planLabel(): string {
        return this.#entity.plan + ' Plan';
    }

    planStatusText(): string {
        return this.#entity.plan_status;
    }

    healthScorePercent(): number {
        return this.#entity.health_score;
    }

    healthStatusText(): string {
        return this.#entity.health_status;
    }

    seatsUsage(): {
        used: number;
        total: number;
        percent: number;
    } {
        const used = this.#entity.used_seats;
        const total = this.#entity.seats;
        const percent = total > 0
            ? Math.min(
                100,
                (used / total) * 100,
            )
            : 0;
        return { used, total, percent };
    }

    usedSeats(): number {
        return this.#entity.used_seats;
    }

    totalSeats(): number {
        return this.#entity.seats;
    }

    projectsCurrent(): number {
        return this.#entity.projects_current;
    }

    projectsLimit(): number {
        return this.#entity.projects_limit;
    }

    ideasCurrent(): number {
        return this.#entity.ideas_current;
    }

    ideasLimit(): number {
        return this.#entity.ideas_limit;
    }

    storageCurrent(): number {
        return this.#entity.storage_current;
    }

    storageLimit(): number {
        return this.#entity.storage_limit;
    }

    aiCreditsCurrent(): number {
        return (
            this.#entity.ai_credits_current
        );
    }

    aiCreditsLimit(): number {
        return this.#entity.ai_credits_limit;
    }

    nextBillingDate(): string {
        return formatDate(
            this.#entity.next_billing,
        );
    }

    lastActivityText(): string {
        return this.#entity.last_activity;
    }

    activeUsersCount(): number {
        return this.#entity.active_users;
    }
}

export async function getOrganization(
    ctx: FetchContext,
): Promise<Organization> {
    const entity =
        await getOrganizationRow(ctx);
    return new Organization(entity);
}

export interface GeneralInfoDraft {
    name: string;
    domain: string;
}

export async function
putOrganizationGeneralInfo(
    ctx: FetchContext,
    draft: GeneralInfoDraft,
): Promise<void> {
    const current = await getOrganizationRow(ctx);
    const { id: _id, ...rest } = current;
    await ctx.PUT('organization', {
        ...rest,
        name: draft.name,
        domain: draft.domain,
    });
}

export interface ProfileDraft {
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
    role: string;
    department: string;
    bio: string;
    strengths: string[];
    teamDimensions: Record<string, number>;
}

export class Profile {
    readonly #firstName: string;
    readonly #lastName: string;
    readonly #email: string;
    readonly #phone: string;
    readonly #role: string;
    readonly #department: string;
    readonly #bio: string;
    readonly #strengths: string[];
    readonly #teamDimensions:
        Record<string, number>;

    constructor(draft: ProfileDraft) {
        this.#firstName = draft.firstName;
        this.#lastName = draft.lastName;
        this.#email = draft.email;
        this.#phone = draft.phone;
        this.#role = draft.role;
        this.#department = draft.department;
        this.#bio = draft.bio;
        this.#strengths = draft.strengths;
        this.#teamDimensions =
            draft.teamDimensions;
    }

    fullName(): string {
        return (
            this.#firstName
            + ' '
            + this.#lastName
        ).trim();
    }

    initialsText(): string {
        return initials(this.fullName());
    }

    firstNameText(): string {
        return this.#firstName;
    }

    lastNameText(): string {
        return this.#lastName;
    }

    emailText(): string {
        return this.#email;
    }

    phoneText(): string {
        return this.#phone;
    }

    roleText(): string {
        return this.#role;
    }

    departmentText(): string {
        return this.#department;
    }

    bioText(): string {
        return this.#bio;
    }

    strengthsList(): string[] {
        return this.#strengths;
    }

    teamDimensionsMap(): Record<string, number> {
        return this.#teamDimensions;
    }

    toDraft(): ProfileDraft {
        return {
            firstName: this.#firstName,
            lastName: this.#lastName,
            email: this.#email,
            phone: this.#phone,
            role: this.#role,
            department: this.#department,
            bio: this.#bio,
            strengths: [...this.#strengths],
            teamDimensions: {
                ...this.#teamDimensions,
            },
        };
    }
}

export const allStrengths = [
    'Strategic Planning',
    'Data Analysis',
    'Stakeholder Management',
    'Agile Methods',
    'Team Leadership',
    'Risk Management',
    'Budget Planning',
    'Technical Writing',
    'User Research',
    'Prototyping',
];

export async function getProfile(
    ctx: FetchContext,
): Promise<{
    profile: Profile;
    entity: UserEntity;
}> {
    const user =
        await ctx.GET<UserEntity>(
            'current-user',
        );
    const userObj = new User(user);
    const profile = new Profile({
        firstName: user.first_name,
        lastName: user.last_name,
        email: user.email,
        phone: user.phone,
        role: user.role,
        department: user.department,
        bio: user.bio,
        strengths:
            userObj.parsedStrengths(),
        teamDimensions:
            userObj.parsedTeamDimensions(),
    });
    return { profile, entity: user };
}


export type {
    ActivityEntity,
    ActivityActorEntity,
} from '../../../api/types.ts';
