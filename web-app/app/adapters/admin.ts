import {
    GET, PUT,
} from '../../../api/api';
import type {
    UserEntity,
    AccountEntity,
    CompanySettingsEntity,
    ActivityEntity,
    ActivityActorEntity,
} from '../../../api/types';
import {
    Activity,
    Account,
    User,
} from '../../../api/types';
export type { Account };
import {
    getUserMap,
    userName,
} from './shared';

const RECENT_ACTIVITY_COUNT = 3;

export async function getAccount(
): Promise<Account> {
    const [
        entity, settings,
        activities, userMap,
        activityActors,
    ] = await Promise.all([
        GET<AccountEntity>('account'),
        GET<CompanySettingsEntity>(
            'company-settings',
        ),
        GET<ActivityEntity[]>(
            'activities',
        ),
        getUserMap(),
        GET<ActivityActorEntity[]>(
            'activity-actors',
        ),
    ]);

    if (!entity.plan)
        throw new Error(
            'Account not configured',
        );

    const actorMap = new Map(
        activityActors.map(
            a => [
                a.activity_id,
                a.user_id,
            ],
        ),
    );

    const recent = activities
        .slice(0, RECENT_ACTIVITY_COUNT)
        .map(a => {
            const actor = userName(
                userMap,
                actorMap.get(a.id)!,
            );
            const activity =
                new Activity(a, actor);
            return {
                type: activity.typeValue(),
                description:
                    activity
                    .formattedDescription(),
                time: activity
                    .timestampValue(),
            };
        });

    return new Account(
        entity,
        settings.name,
        recent,
    );
}

export interface Profile {
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
    role: string;
    department: string;
    bio: string;
    strengths: string[];
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
): Promise<Profile> {
    const user =
        await GET<UserEntity>(
            'current-user',
        );
    const userObj = new User(user);
    return {
        firstName: user.first_name,
        lastName: user.last_name,
        email: user.email,
        phone: user.phone,
        role: user.role,
        department: user.department,
        bio: user.bio,
        strengths:
            userObj.parsedStrengths(),
    };
}

export async function getProfileEntity(
): Promise<UserEntity> {
    return GET<UserEntity>('current-user');
}

export async function putProfile(
    entity: Omit<UserEntity, 'id'>,
): Promise<void> {
    await PUT('users/current', entity);
}

export interface CompanySettings {
    name: string;
    domain: string;
}

export async function getCompanySettings(
): Promise<CompanySettings> {
    const row =
        await GET<CompanySettingsEntity>(
            'company-settings',
        );
    return {
        name: row.name,
        domain: row.domain,
    };
}

export async function putCompanySettings(
    entity: Omit<
        CompanySettingsEntity, 'id'
    >,
): Promise<void> {
    await PUT('company-settings', entity);
}

export { Activity } from '../../../api/types';

export async function getActivityFeed(
): Promise<Activity[]> {
    const [
        activities, userMap,
        activityActors,
    ] = await Promise.all([
        GET<ActivityEntity[]>(
            'activities',
        ),
        getUserMap(),
        GET<ActivityActorEntity[]>(
            'activity-actors',
        ),
    ]);
    const actorMap = new Map(
        activityActors.map(
            a => [
                a.activity_id,
                a.user_id,
            ],
        ),
    );
    return activities.map(a =>
        new Activity(
            a,
            userName(
                userMap,
                actorMap.get(a.id)!,
            ),
        ),
    );
}
