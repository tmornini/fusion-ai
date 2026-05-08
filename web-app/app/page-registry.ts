import type { IconFn } from './icons.ts';
import {
    iconHome,
    iconMail,
    iconLightbulb,
    iconFolderKanban,
    iconGitBranch,
    iconPeople,
    iconSettings,
    iconPerson,
    iconCreditCard,
    iconDatabase,
    iconPalette,
    iconShield,
    iconBriefcase,
} from './icons.ts';

export interface PageEntry {
    title: string;
    layout: 'sidebar' | 'standalone';
    sourceDir: string;
    sourceFile: string;
    icon?: IconFn;
    keywords?: string;
    searchable?: boolean;
    loader: () => Promise<{
        init: (
            params?: Record<string, string>,
        ) => void | Promise<void>;
    }>;
}

export const PAGE_REGISTRY: Record<
    string,
    PageEntry
> = {
    dashboard: {
        title: 'Dashboard',
        layout: 'sidebar',
        sourceDir: 'dashboard',
        sourceFile: 'index',
        icon: iconHome,
        keywords: 'home overview',
        loader: () => import('../dashboard/index'),
    },
    workbox: {
        title: 'Workbox',
        layout: 'sidebar',
        sourceDir: 'workbox',
        sourceFile: 'index',
        icon: iconMail,
        keywords:
            'workbox inbox work order',
        loader: () => import('../workbox/index'),
    },
    'workbox-detail': {
        title: 'Work Order',
        layout: 'sidebar',
        sourceDir: 'workbox',
        sourceFile: 'detail',
        icon: iconMail,
        searchable: false,
        loader: () => import('../workbox/detail'),
    },
    ideas: {
        title: 'Ideas',
        layout: 'sidebar',
        sourceDir: 'ideas',
        sourceFile: 'index',
        icon: iconLightbulb,
        keywords: 'ideas list innovation',
        loader: () => import('../ideas/index'),
    },
    'idea-detail': {
        title: 'Idea Detail',
        layout: 'sidebar',
        sourceDir: 'ideas',
        sourceFile: 'detail',
        icon: iconLightbulb,
        searchable: false,
        loader: () => import('../ideas/detail'),
    },
    projects: {
        title: 'Projects',
        layout: 'sidebar',
        sourceDir: 'projects',
        sourceFile: 'index',
        icon: iconFolderKanban,
        keywords:
            'projects list kanban',
        loader: () => import('../projects/index'),
    },
    'project-detail': {
        title: 'Project Detail',
        layout: 'sidebar',
        sourceDir: 'projects',
        sourceFile: 'detail',
        icon: iconFolderKanban,
        searchable: false,
        loader: () => import('../projects/detail'),
    },
    flows: {
        title: 'Flows',
        layout: 'sidebar',
        sourceDir: 'flows',
        sourceFile: 'index',
        icon: iconGitBranch,
        keywords:
            'flow, process,'
            + ' state machine',
        loader: () => import('../flows/index'),
    },
    'flow-detail': {
        title: 'Flow Designer',
        layout: 'sidebar',
        sourceDir: 'flows',
        sourceFile: 'detail',
        icon: iconGitBranch,
        searchable: false,
        loader: () => import('../flows/detail'),
    },
    organization: {
        title: 'Organization',
        layout: 'sidebar',
        sourceDir: 'organization',
        sourceFile: 'index',
        icon: iconSettings,
        keywords:
            'organization billing plan',
        loader: () => import('../organization/index'),
    },
    'people-detail': {
        title: 'Person',
        layout: 'sidebar',
        sourceDir: 'people',
        sourceFile: 'detail',
        icon: iconPerson,
        searchable: false,
        loader: () => import('../people/detail'),
    },
    billing: {
        title: 'Billing',
        layout: 'sidebar',
        sourceDir: 'billing',
        sourceFile: 'index',
        icon: iconCreditCard,
        keywords:
            'billing plan invoices'
            + ' payment',
        loader: () => import('../billing/index'),
    },
    people: {
        title: 'People',
        layout: 'sidebar',
        sourceDir: 'people',
        sourceFile: 'index',
        icon: iconPeople,
        keywords: 'people invite manage admin',
        loader: () => import('../people/index'),
    },
    roles: {
        title: 'Roles',
        layout: 'sidebar',
        sourceDir: 'roles',
        sourceFile: 'index',
        icon: iconShield,
        keywords: 'roles teams membership',
        loader: () => import('../roles/index'),
    },
    crews: {
        title: 'Crews',
        layout: 'sidebar',
        sourceDir: 'crews',
        sourceFile: 'index',
        icon: iconBriefcase,
        keywords: 'crews collaborate team',
        loader: () => import('../crews/index'),
    },
    snapshots: {
        title: 'Snapshots',
        layout: 'sidebar',
        sourceDir: 'snapshots',
        sourceFile: 'index',
        icon: iconDatabase,
        keywords:
            'data export import wipe',
        loader: () => import('../snapshots/index'),
    },
    'design-system': {
        title: 'Design System',
        layout: 'sidebar',
        sourceDir: 'design-system',
        sourceFile: 'index',
        icon: iconPalette,
        keywords:
            'components ui reference',
        loader: () => import('../design-system/index'),
    },
    'idea-create': {
        title: 'Create Idea',
        layout: 'sidebar',
        sourceDir: 'ideas',
        sourceFile: 'create',
        icon: iconLightbulb,
        keywords: 'new idea submit',
        loader: () => import('../ideas/create'),
    },
    'idea-convert': {
        title: 'Convert Idea',
        layout: 'sidebar',
        sourceDir: 'ideas',
        sourceFile: 'convert',
        icon: iconLightbulb,
        searchable: false,
        loader: () => import('../ideas/convert'),
    },
    auth: {
        title: 'Authentication',
        layout: 'standalone',
        sourceDir: 'auth',
        sourceFile: 'index',
        searchable: false,
        loader: () => import('../auth/index'),
    },
    landing: {
        title: 'Landing',
        layout: 'standalone',
        sourceDir: 'landing',
        sourceFile: 'index',
        searchable: false,
        loader: () => import('../landing/index'),
    },
    'not-found': {
        title: '404 Not Found',
        layout: 'standalone',
        sourceDir: 'not-found',
        sourceFile: 'index',
        searchable: false,
        loader: () => import('../not-found/index'),
    },
};
