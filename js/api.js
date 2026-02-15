// Fusion AI — Fetch Interceptor & Mock Data Store
(function() {
  var App = window.FusionApp = window.FusionApp || {};

  // ==========================================
  // MOCK DATA STORE
  // ==========================================
  var store = {
    user: { email: 'demo@example.com', name: 'Demo User', role: 'Admin', avatar: null, phone: '+1 (555) 123-4567', location: 'San Francisco, CA', bio: 'Product innovation enthusiast. Building the future of enterprise AI.' },
    company: { name: 'Demo Company', industry: 'Technology', size: '50-200', plan: 'Pro' },

    ideas: [
      { id: '1', title: 'AI-Powered Customer Support Chatbot', description: 'Implement an AI chatbot that can handle tier-1 support tickets automatically, reducing response time and support costs.', status: 'approved', category: 'AI/ML', priority: 'high', author: 'Sarah Chen', createdAt: '2025-01-15', score: 87, tags: ['ai', 'support', 'automation'], problemStatement: 'Support team spends 20+ hours weekly on repetitive tier-1 tickets, leading to slow response times and high costs.', proposedSolution: 'Implement an AI chatbot using GPT-4 to handle tier-1 inquiries automatically, integrating with existing helpdesk.', expectedOutcome: 'Reduce support ticket volume by 40% and improve first-response time from 4 hours to under 1 minute.', estimatedTime: '3-4 months', estimatedCost: '$120,000 - $150,000' },
      { id: '2', title: 'Mobile App Redesign', description: 'Complete redesign of the mobile application with modern UI patterns and improved user experience.', status: 'in_review', category: 'Product', priority: 'high', author: 'Mike Johnson', createdAt: '2025-01-20', score: 72, tags: ['mobile', 'ux', 'design'] },
      { id: '3', title: 'Real-Time Analytics Dashboard', description: 'Build a real-time analytics dashboard for monitoring key business metrics and KPIs.', status: 'draft', category: 'Data', priority: 'medium', author: 'Emily Rodriguez', createdAt: '2025-02-01', score: null, tags: ['analytics', 'dashboard'] },
      { id: '4', title: 'API Gateway Migration', description: 'Migrate existing API infrastructure to a modern gateway with rate limiting, caching, and better observability.', status: 'approved', category: 'Infrastructure', priority: 'high', author: 'Alex Kim', createdAt: '2025-01-10', score: 91, tags: ['api', 'infrastructure'] },
      { id: '5', title: 'Customer Portal V2', description: 'Next generation customer self-service portal with SSO integration and custom branding.', status: 'rejected', category: 'Product', priority: 'medium', author: 'John Davis', createdAt: '2025-01-25', score: 45, tags: ['portal', 'customer'] },
      { id: '6', title: 'Automated Testing Pipeline', description: 'Set up comprehensive automated testing including unit, integration, and e2e tests in CI/CD pipeline.', status: 'draft', category: 'Engineering', priority: 'medium', author: 'Lisa Park', createdAt: '2025-02-05', score: null, tags: ['testing', 'ci-cd'] },
      { id: '7', title: 'Data Lake Architecture', description: 'Design and implement a scalable data lake for centralized data storage and processing.', status: 'in_review', category: 'Data', priority: 'low', author: 'Tom Wilson', createdAt: '2025-02-08', score: 68, tags: ['data', 'architecture'] },
      { id: '8', title: 'Employee Onboarding Automation', description: 'Automate the employee onboarding process with digital forms, task assignments, and progress tracking.', status: 'approved', category: 'HR Tech', priority: 'medium', author: 'Sarah Chen', createdAt: '2025-01-05', score: 82, tags: ['hr', 'automation'] },
    ],

    projects: [
      { id: '1', name: 'AI Customer Support', ideaId: '1', status: 'in_progress', progress: 72, owner: 'Sarah Chen', team: ['Sarah Chen', 'Alex Kim', 'Emily Rodriguez'], startDate: '2025-02-01', targetDate: '2025-04-30', budget: 50000, spent: 32500, description: 'Implement machine learning model to automatically segment customers based on behavior, purchase history, and engagement patterns.', priorityScore: 92, priority: 1,
        metrics: { time: { baseline: 120, current: 85, unit: 'hours' }, cost: { baseline: 45000, current: 38000, unit: '$' }, impact: { baseline: 85, current: 78, unit: 'pts' } },
        businessContext: { problem: 'Current manual segmentation takes 2 weeks and is often outdated by the time it\'s complete. Marketing campaigns suffer from poor targeting.', expectedOutcome: 'Real-time customer segments that update automatically, enabling personalized marketing with 40% better conversion rates.', successMetrics: ['Reduce segmentation time from 2 weeks to real-time', 'Improve campaign conversion rates by 40%', 'Increase customer lifetime value by 25%'], constraints: ['Must integrate with existing CRM (Salesforce)', 'GDPR compliance required for EU customers', 'Budget capped at $50,000 for Phase 1'] },
        edge: { outcomes: [{ id: '1', description: 'Reduce customer churn rate', metrics: [{ id: '1', name: 'Churn Rate Reduction', target: '15', unit: '%', current: '12' }, { id: '2', name: 'Customer Retention', target: '85', unit: '%', current: '82' }] }, { id: '2', description: 'Increase marketing ROI', metrics: [{ id: '3', name: 'Campaign Conversion', target: '25', unit: '%', current: '28' }, { id: '4', name: 'Cost per Acquisition', target: '45', unit: '$', current: '42' }] }], impact: { shortTerm: 'Automated segmentation reduces manual effort by 80%. Initial customer insights available within 2 weeks.', midTerm: 'Expected 15% reduction in churn through targeted campaigns. Marketing ROI improvement of 25%.', longTerm: 'Full personalization pipeline enabling real-time customer journey optimization across all channels.' }, confidence: 'high', owner: 'Sarah Chen' },
        teamMembers: [{ id: '1', name: 'Sarah Chen', role: 'Project Lead' }, { id: '2', name: 'Mike Johnson', role: 'ML Engineer' }, { id: '3', name: 'Emily Rodriguez', role: 'Data Scientist' }, { id: '4', name: 'Alex Kim', role: 'Product Manager' }],
        milestones: [{ id: '1', title: 'Data Pipeline Setup', status: 'completed', date: '2025-02-15' }, { id: '2', title: 'Model Training Complete', status: 'completed', date: '2025-03-01' }, { id: '3', title: 'Integration Testing', status: 'in_progress', date: '2025-03-15' }, { id: '4', title: 'User Acceptance Testing', status: 'pending', date: '2025-04-01' }, { id: '5', title: 'Production Deployment', status: 'pending', date: '2025-04-15' }],
        versions: [{ id: '1', version: 'v1.2', date: '2025-03-10', changes: 'Added real-time segmentation capability', author: 'Mike Johnson' }, { id: '2', version: 'v1.1', date: '2025-02-28', changes: 'Improved model accuracy by 12%', author: 'Emily Rodriguez' }, { id: '3', version: 'v1.0', date: '2025-02-15', changes: 'Initial model deployment', author: 'Sarah Chen' }],
        discussions: [{ id: '1', author: 'Sarah Chen', date: '2025-03-10', message: 'Great progress on the integration testing. We should be ready for UAT next week.' }, { id: '2', author: 'Mike Johnson', date: '2025-03-08', message: 'Segmentation accuracy is now at 94%. Exceeding our initial target of 90%.' }, { id: '3', author: 'Tom Wilson', date: '2025-03-05', message: 'API endpoints are ready for frontend integration.' }],
        clarifications: [{ id: '1', question: 'What data sources are currently available for customer behavior tracking?', askedBy: 'Mike Johnson', askedAt: '2025-02-20', status: 'answered', answer: 'We have event tracking via Segment, transaction data in Snowflake, and email engagement metrics from Mailchimp.', answeredBy: 'Sarah Chen', answeredAt: '2025-02-21' }, { id: '2', question: 'Are there existing segment definitions we should match?', askedBy: 'Emily Rodriguez', askedAt: '2025-02-22', status: 'answered', answer: 'Marketing has 5 legacy segments (High Value, Growth, At-Risk, New, Dormant). Preserve compatibility but welcome new segments.', answeredBy: 'Sarah Chen', answeredAt: '2025-02-22' }, { id: '3', question: 'What\'s the expected latency requirement for segment updates?', askedBy: 'Tom Wilson', askedAt: '2025-02-25', status: 'pending' }],
        linkedIdea: { id: '1', title: 'AI-Powered Customer Support Chatbot', score: 87 },
        timeline: '3-4 months', budgetLabel: '$45,000',
      },
      { id: '2', name: 'API Gateway v2', ideaId: '4', status: 'in_progress', progress: 40, owner: 'Alex Kim', team: ['Alex Kim', 'Tom Wilson'], startDate: '2025-02-15', targetDate: '2025-05-15', budget: 35000, spent: 14000, description: 'Migrating to modern API gateway infrastructure.', priorityScore: 88, priority: 2,
        metrics: { time: { baseline: 200, current: 180, unit: 'hours' }, cost: { baseline: 35000, current: 14000, unit: '$' }, impact: { baseline: 90, current: 85, unit: 'pts' } },
        teamMembers: [{ id: '4', name: 'Alex Kim', role: 'Tech Lead' }, { id: '5', name: 'Tom Wilson', role: 'Backend Developer' }],
        milestones: [{ id: '1', title: 'Architecture Design', status: 'completed', date: '2025-02-28' }, { id: '2', title: 'Core Implementation', status: 'in_progress', date: '2025-03-30' }, { id: '3', title: 'Migration', status: 'pending', date: '2025-04-30' }],
      },
      { id: '3', name: 'Onboarding Automation', ideaId: '8', status: 'completed', progress: 100, owner: 'Lisa Park', team: ['Lisa Park', 'John Davis'], startDate: '2025-01-10', targetDate: '2025-03-01', budget: 20000, spent: 18500, description: 'Digital employee onboarding system.', priorityScore: 82, priority: 3,
        metrics: { time: { baseline: 80, current: 75, unit: 'hours' }, cost: { baseline: 20000, current: 18500, unit: '$' }, impact: { baseline: 70, current: 75, unit: 'pts' } },
        teamMembers: [{ id: '6', name: 'Lisa Park', role: 'Lead' }, { id: '7', name: 'John Davis', role: 'QA Engineer' }],
        milestones: [{ id: '1', title: 'Requirements', status: 'completed', date: '2025-01-20' }, { id: '2', title: 'Development', status: 'completed', date: '2025-02-15' }, { id: '3', title: 'Launch', status: 'completed', date: '2025-03-01' }],
      },
      { id: '4', name: 'Mobile App v3', ideaId: '2', status: 'planning', progress: 10, owner: 'Mike Johnson', team: ['Mike Johnson', 'Sarah Chen'], startDate: '2025-03-01', targetDate: '2025-06-30', budget: 75000, spent: 7500, description: 'Complete mobile app redesign project.', priorityScore: 72, priority: 4,
        metrics: { time: { baseline: 300, current: 30, unit: 'hours' }, cost: { baseline: 75000, current: 7500, unit: '$' }, impact: { baseline: 80, current: 10, unit: 'pts' } },
        teamMembers: [{ id: '2', name: 'Mike Johnson', role: 'Product Manager' }, { id: '1', name: 'Sarah Chen', role: 'Lead' }],
        milestones: [{ id: '1', title: 'Design Phase', status: 'in_progress', date: '2025-03-30' }, { id: '2', title: 'Development', status: 'pending', date: '2025-05-30' }, { id: '3', title: 'Launch', status: 'pending', date: '2025-06-30' }],
      },
      { id: '5', name: 'Data Pipeline', ideaId: '7', status: 'on_hold', progress: 25, owner: 'Tom Wilson', team: ['Tom Wilson', 'Emily Rodriguez'], startDate: '2025-02-20', targetDate: '2025-07-01', budget: 45000, spent: 11250, description: 'Building centralized data processing pipeline.', priorityScore: 68, priority: 5,
        metrics: { time: { baseline: 250, current: 65, unit: 'hours' }, cost: { baseline: 45000, current: 11250, unit: '$' }, impact: { baseline: 75, current: 20, unit: 'pts' } },
        teamMembers: [{ id: '5', name: 'Tom Wilson', role: 'Tech Lead' }, { id: '3', name: 'Emily Rodriguez', role: 'Data Scientist' }],
        milestones: [{ id: '1', title: 'Architecture', status: 'completed', date: '2025-03-01' }, { id: '2', title: 'Implementation', status: 'pending', date: '2025-05-01' }],
      },
    ],

    reviews: [
      { id: '1', ideaId: '2', ideaTitle: 'Mobile App Redesign', submittedBy: 'Mike Johnson', submittedAt: '2025-01-20', status: 'pending', priority: 'high', category: 'Product', summary: 'Complete mobile app redesign with modern UI.', score: 87,
        impact: { level: 'High', description: 'Expected to reduce support ticket volume by 40% and improve first-response time.' },
        effort: { level: 'Medium', timeEstimate: '3-4 months', teamSize: '4-5 engineers' },
        cost: { estimate: '$120,000 - $150,000', breakdown: 'Development: $80K, API costs: $20K/year, Training: $10K' },
        risks: [{ title: 'AI response accuracy', severity: 'high', mitigation: 'Implement human escalation for low-confidence responses' }, { title: 'Integration complexity', severity: 'medium', mitigation: 'Phase rollout starting with FAQ-only queries' }, { title: 'Customer acceptance', severity: 'low', mitigation: 'Clear bot identification and easy handoff to human agents' }],
        assumptions: ['Current helpdesk API supports required integrations', 'Historical ticket data is clean and categorizable', 'Legal has approved AI usage for customer interactions'],
        alignments: ['Q1 OKR: Improve customer satisfaction by 15%', 'Digital transformation initiative', 'Cost optimization program'],
        edge: { outcomes: [{ id: 'ro1', description: 'Reduce support costs', metrics: [{ id: 'rm1', name: 'Cost Reduction', target: '40', unit: '%', current: '0' }] }, { id: 'ro2', description: 'Improve response time', metrics: [{ id: 'rm2', name: 'Avg Response', target: '1', unit: 'min', current: '240' }] }], impact: { shortTerm: 'FAQ automation reduces ticket volume by 25%.', midTerm: 'Full tier-1 automation with 40% cost reduction.', longTerm: 'Proactive AI-driven customer support.' }, confidence: 'high', owner: 'Mike Johnson' },
      },
      { id: '2', ideaId: '7', ideaTitle: 'Data Lake Architecture', submittedBy: 'Tom Wilson', submittedAt: '2025-02-08', status: 'pending', priority: 'low', category: 'Data', summary: 'Centralized data lake for analytics.', score: 68,
        impact: { level: 'Medium', description: 'Centralized data access for all teams.' },
        effort: { level: 'High', timeEstimate: '5-6 months', teamSize: '3-4 engineers' },
        cost: { estimate: '$80,000 - $100,000', breakdown: 'Infrastructure: $40K, Development: $50K, Maintenance: $10K/year' },
        risks: [{ title: 'Data migration complexity', severity: 'high', mitigation: 'Incremental migration with parallel running' }, { title: 'Performance at scale', severity: 'medium', mitigation: 'Load testing with production-like data volumes' }],
        assumptions: ['Current data sources can expose APIs', 'Team has Snowflake expertise'],
        alignments: ['Data-driven decision making initiative', 'Analytics platform consolidation'],
      },
      { id: '3', ideaId: '6', ideaTitle: 'Automated Testing Pipeline', submittedBy: 'Lisa Park', submittedAt: '2025-02-05', status: 'pending', priority: 'medium', category: 'Engineering', summary: 'Comprehensive automated testing in CI/CD.', score: 75,
        impact: { level: 'Medium', description: 'Reduce regression bugs and speed up release cycles.' },
        effort: { level: 'Medium', timeEstimate: '2-3 months', teamSize: '2-3 engineers' },
        cost: { estimate: '$40,000 - $55,000', breakdown: 'Development: $35K, CI/CD tools: $10K/year' },
        risks: [{ title: 'Test maintenance burden', severity: 'medium', mitigation: 'Use page object pattern and shared test utilities' }],
        assumptions: ['CI/CD platform supports parallel test execution', 'Test environment parity with production'],
        alignments: ['Engineering excellence initiative', 'Release velocity improvement'],
      },
    ],

    team: [
      { id: '1', name: 'Sarah Chen', email: 'sarah@example.com', role: 'Project Lead', department: 'Operations', status: 'active', avatar: null, joinedAt: '2024-06-15', availability: 85, performanceScore: 94, projectsCompleted: 12, currentProjects: 3, strengths: ['Strategic Planning', 'Team Leadership', 'Risk Management'], teamDimensions: { driver: 78, analytical: 85, expressive: 62, amiable: 70 }, recentAchievements: ['Led Q4 transformation initiative', 'Mentored 3 new team members'], memberType: 'business' },
      { id: '2', name: 'Mike Johnson', email: 'mike@example.com', role: 'ML Engineer', department: 'Engineering', status: 'active', avatar: null, joinedAt: '2024-07-01', availability: 60, performanceScore: 91, projectsCompleted: 8, currentProjects: 2, strengths: ['Machine Learning', 'Python', 'Data Architecture'], teamDimensions: { driver: 55, analytical: 95, expressive: 40, amiable: 58 }, recentAchievements: ['Improved model accuracy by 15%', 'Published internal ML guidelines'], memberType: 'engineering' },
      { id: '3', name: 'Emily Rodriguez', email: 'emily@example.com', role: 'Data Scientist', department: 'Analytics', status: 'active', avatar: null, joinedAt: '2024-08-10', availability: 70, performanceScore: 88, projectsCompleted: 6, currentProjects: 2, strengths: ['Statistical Analysis', 'Visualization', 'Predictive Modeling'], teamDimensions: { driver: 45, analytical: 92, expressive: 68, amiable: 75 }, recentAchievements: ['Created customer analytics dashboard', 'Reduced reporting time by 40%'], memberType: 'engineering' },
      { id: '4', name: 'Alex Kim', email: 'alex@example.com', role: 'Product Manager', department: 'Product', status: 'active', avatar: null, joinedAt: '2024-09-01', availability: 55, performanceScore: 89, projectsCompleted: 7, currentProjects: 3, strengths: ['Roadmap Planning', 'Stakeholder Management', 'Agile Methods'], teamDimensions: { driver: 85, analytical: 70, expressive: 78, amiable: 65 }, recentAchievements: ['Launched 2 major features', 'Improved sprint velocity by 20%'], memberType: 'business' },
      { id: '5', name: 'Tom Wilson', email: 'tom@example.com', role: 'Backend Developer', department: 'Engineering', status: 'active', avatar: null, joinedAt: '2024-10-15', availability: 40, performanceScore: 86, projectsCompleted: 10, currentProjects: 4, strengths: ['API Development', 'Database Design', 'System Integration'], teamDimensions: { driver: 70, analytical: 82, expressive: 35, amiable: 55 }, recentAchievements: ['Built real-time sync system', 'Zero downtime deployment streak'], memberType: 'engineering' },
      { id: '6', name: 'Lisa Park', email: 'lisa@example.com', role: 'UX Designer', department: 'Design', status: 'active', avatar: null, joinedAt: '2024-11-01', availability: 90, performanceScore: 92, projectsCompleted: 15, currentProjects: 1, strengths: ['User Research', 'Prototyping', 'Design Systems'], teamDimensions: { driver: 50, analytical: 72, expressive: 88, amiable: 85 }, recentAchievements: ['Redesigned onboarding flow', 'Increased user satisfaction by 25%'], memberType: 'engineering' },
      { id: '7', name: 'John Davis', email: 'john@example.com', role: 'QA Engineer', department: 'Engineering', status: 'inactive', avatar: null, joinedAt: '2024-05-20', availability: 0, performanceScore: 80, projectsCompleted: 5, currentProjects: 0, strengths: ['Test Automation', 'Performance Testing', 'CI/CD'], teamDimensions: { driver: 60, analytical: 78, expressive: 45, amiable: 70 }, recentAchievements: ['Set up e2e test suite'], memberType: 'engineering' },
    ],

    edges: [
      { id: '1', ideaId: '1', title: 'Customer Support Efficiency', confidence: 'high', owner: 'Sarah Chen',
        outcomes: [
          { id: 'o1', label: 'Reduce ticket response time', description: 'Reduce ticket response time', target: '< 2 minutes', current: '8 minutes', status: 'in_progress', metrics: [{ id: 'm1', name: 'Response Time', target: '2', unit: 'minutes', current: '8' }, { id: 'm2', name: 'First Contact Resolution', target: '80', unit: '%', current: '62' }] },
          { id: 'o2', label: 'Automate tier-1 tickets', description: 'Automate tier-1 tickets', target: '70%', current: '35%', status: 'in_progress', metrics: [{ id: 'm3', name: 'Automation Rate', target: '70', unit: '%', current: '35' }] },
          { id: 'o3', label: 'Improve CSAT score', description: 'Improve CSAT score', target: '4.5/5', current: '3.8/5', status: 'at_risk', metrics: [{ id: 'm4', name: 'CSAT Score', target: '4.5', unit: '/5', current: '3.8' }] },
        ],
        impact: { shortTerm: 'Automated FAQ responses reduce ticket volume by 25%. Support team can focus on complex issues.', midTerm: 'Full tier-1 automation achieved. Expected 40% reduction in support costs and 60% faster resolution.', longTerm: 'AI learns from all interactions to proactively prevent issues. Support becomes a competitive advantage.' },
      },
      { id: '2', ideaId: '4', title: 'API Performance', confidence: 'medium', owner: 'Alex Kim',
        outcomes: [
          { id: 'o4', label: 'API response time p99', description: 'API response time p99', target: '< 200ms', current: '450ms', status: 'in_progress', metrics: [{ id: 'm5', name: 'P99 Latency', target: '200', unit: 'ms', current: '450' }] },
          { id: 'o5', label: 'API uptime', description: 'API uptime', target: '99.99%', current: '99.95%', status: 'on_track', metrics: [{ id: 'm6', name: 'Uptime', target: '99.99', unit: '%', current: '99.95' }] },
          { id: 'o6', label: 'Rate limit compliance', description: 'Rate limit compliance', target: '100%', current: '92%', status: 'in_progress', metrics: [{ id: 'm7', name: 'Compliance Rate', target: '100', unit: '%', current: '92' }] },
        ],
        impact: { shortTerm: 'Immediate latency improvements for high-traffic endpoints.', midTerm: 'Full migration to new gateway with rate limiting and caching.', longTerm: 'Self-scaling API infrastructure supporting 10x current traffic.' },
      },
      { id: '3', ideaId: '8', title: 'Onboarding Metrics', confidence: 'high', owner: 'Lisa Park',
        outcomes: [
          { id: 'o7', label: 'Time to productive', description: 'Time to productive', target: '3 days', current: '3.2 days', status: 'on_track', metrics: [{ id: 'm8', name: 'Onboarding Duration', target: '3', unit: 'days', current: '3.2' }] },
          { id: 'o8', label: 'Onboarding completion rate', description: 'Onboarding completion rate', target: '95%', current: '97%', status: 'achieved', metrics: [{ id: 'm9', name: 'Completion Rate', target: '95', unit: '%', current: '97' }] },
          { id: 'o9', label: 'New hire satisfaction', description: 'New hire satisfaction', target: '4.0/5', current: '4.3/5', status: 'achieved', metrics: [{ id: 'm10', name: 'Satisfaction Score', target: '4.0', unit: '/5', current: '4.3' }] },
        ],
        impact: { shortTerm: 'Digital forms replace paper process. Day-one productivity improved.', midTerm: 'Fully automated onboarding with task tracking and progress visibility.', longTerm: 'Self-service onboarding portal with personalized learning paths.' },
      },
    ],

    flows: [
      { id: '1', name: 'Customer Onboarding', title: 'Customer Onboarding', description: 'End-to-end process for onboarding new enterprise customers', department: 'Customer Success', createdAt: '2025-02-15', lastUpdated: '2025-02-28', sharedWith: ['Engineering', 'Sales'], steps: [
        { id: 's1', title: 'Receive signed contract', description: 'Sales team sends signed contract to customer success inbox', owner: 'Sales Team', role: 'Account Executive', tools: ['Email', 'Document'], duration: 'Immediate', order: 1, type: 'start' },
        { id: 's2', title: 'Create customer record', description: 'Enter customer details in CRM and create project folder', owner: 'Customer Success', role: 'CS Manager', tools: ['Database', 'Files'], duration: '15 minutes', order: 2, type: 'action' },
        { id: 's3', title: 'Schedule kickoff call', description: 'Reach out to customer to schedule implementation kickoff', owner: 'Customer Success', role: 'Implementation Specialist', tools: ['Email', 'Phone'], duration: '1 day', order: 3, type: 'action' },
        { id: 's4', title: 'Conduct kickoff meeting', description: 'Review goals, timeline, and assign customer contacts', owner: 'Customer Success', role: 'Implementation Specialist', tools: ['Chat', 'Document'], duration: '1 hour', order: 4, type: 'action' },
        { id: 's5', title: 'Complete setup', description: 'Finalize account configuration and verify all integrations', owner: 'Engineering', role: 'Solutions Engineer', tools: ['Database', 'Website'], duration: '2-3 days', order: 5, type: 'end' },
      ]},
    ],

    crunchFiles: [
      { id: 'f1', name: 'Q4_Sales_Report.xlsx', type: 'spreadsheet', size: 2456000, uploadedAt: '2025-02-10', rows: 1247, columns: [
        { id: 'c1', name: 'CUST_ID', originalName: 'CUST_ID', friendlyName: '', dataType: 'text', description: '', sampleValues: ['C001', 'C002', 'C003'], isAcronym: true, acronymExpansion: '', type: 'string', nulls: 0, unique: 1200 },
        { id: 'c2', name: 'TXN_DT', originalName: 'TXN_DT', friendlyName: '', dataType: 'date', description: '', sampleValues: ['2024-01-15', '2024-01-16', '2024-01-17'], isAcronym: true, acronymExpansion: '', type: 'date', nulls: 0, unique: 365 },
        { id: 'c3', name: 'AMT', originalName: 'AMT', friendlyName: '', dataType: 'number', description: '', sampleValues: ['150.00', '299.99', '75.50'], isAcronym: true, acronymExpansion: '', type: 'number', nulls: 5, unique: 980, min: 10, max: 50000, mean: 2340 },
        { id: 'c4', name: 'PROD_CAT', originalName: 'PROD_CAT', friendlyName: '', dataType: 'text', description: '', sampleValues: ['Electronics', 'Apparel', 'Home'], isAcronym: true, acronymExpansion: '', type: 'string', nulls: 0, unique: 12 },
        { id: 'c5', name: 'REP_ID', originalName: 'REP_ID', friendlyName: '', dataType: 'text', description: '', sampleValues: ['R101', 'R102', 'R103'], isAcronym: true, acronymExpansion: '', type: 'string', nulls: 0, unique: 45 },
        { id: 'c6', name: 'STATUS', originalName: 'STATUS', friendlyName: '', dataType: 'text', description: '', sampleValues: ['COMP', 'PEND', 'CANC'], isAcronym: false, acronymExpansion: '', type: 'string', nulls: 0, unique: 3 },
      ]},
    ],

    activity: [
      { id: '1', type: 'idea_created', user: 'Sarah Chen', target: 'AI-Powered Customer Support Chatbot', timestamp: '2025-02-12T10:30:00Z' },
      { id: '2', type: 'idea_approved', user: 'Mike Johnson', target: 'API Gateway Migration', timestamp: '2025-02-11T15:45:00Z' },
      { id: '3', type: 'project_updated', user: 'Alex Kim', target: 'API Gateway v2', timestamp: '2025-02-11T09:20:00Z' },
      { id: '4', type: 'review_submitted', user: 'Tom Wilson', target: 'Data Lake Architecture', timestamp: '2025-02-10T14:10:00Z' },
      { id: '5', type: 'team_invited', user: 'Demo User', target: 'Lisa Park', timestamp: '2025-02-09T11:00:00Z' },
      { id: '6', type: 'idea_scored', user: 'System', target: 'Mobile App Redesign', timestamp: '2025-02-08T16:30:00Z' },
      { id: '7', type: 'project_completed', user: 'Lisa Park', target: 'Onboarding Automation', timestamp: '2025-02-07T17:00:00Z' },
      { id: '8', type: 'idea_rejected', user: 'Mike Johnson', target: 'Customer Portal V2', timestamp: '2025-02-06T13:15:00Z' },
    ],

    notifications: [
      { id: 'ideas', label: 'Ideas', icon: 'lightbulb', color: 'amber', preferences: [
        { id: 'idea_submitted', label: 'New idea submitted', description: 'When someone submits a new idea', email: true, push: true },
        { id: 'idea_scored', label: 'Idea scored', description: 'When an idea receives an AI score', email: true, push: false },
        { id: 'idea_converted', label: 'Idea converted to project', description: 'When an idea becomes a project', email: true, push: true },
        { id: 'idea_comment', label: 'Comment on your idea', description: 'When someone comments on your idea', email: true, push: true },
      ]},
      { id: 'projects', label: 'Projects', icon: 'folder', color: 'primary', preferences: [
        { id: 'project_created', label: 'New project created', description: 'When a new project is started', email: true, push: false },
        { id: 'task_assigned', label: 'Task assigned to you', description: 'When you are assigned a new task', email: true, push: true },
        { id: 'task_completed', label: 'Task completed', description: 'When a task in your project is completed', email: false, push: false },
        { id: 'project_status', label: 'Project status changed', description: 'When a project status is updated', email: true, push: false },
      ]},
      { id: 'teams', label: 'Teams', icon: 'users', color: 'indigo', preferences: [
        { id: 'team_invite', label: 'Team invitation', description: 'When you are invited to join a team', email: true, push: true },
        { id: 'member_joined', label: 'New team member', description: 'When someone joins your team', email: true, push: false },
        { id: 'member_left', label: 'Team member left', description: 'When someone leaves your team', email: true, push: false },
        { id: 'team_mention', label: 'Team mention', description: 'When your team is mentioned', email: false, push: true },
      ]},
      { id: 'account', label: 'Account', icon: 'user', color: 'purple', preferences: [
        { id: 'security_alert', label: 'Security alerts', description: 'Important security notifications', email: true, push: true },
        { id: 'billing_reminder', label: 'Billing reminders', description: 'Upcoming payment reminders', email: true, push: false },
        { id: 'usage_limit', label: 'Usage limit warnings', description: 'When approaching plan limits', email: true, push: true },
        { id: 'weekly_digest', label: 'Weekly activity digest', description: 'Summary of weekly activity', email: true, push: false },
      ]},
    ],
  };

  App.store = store;

  // ==========================================
  // FETCH INTERCEPTOR
  // ==========================================
  var originalFetch = window.fetch;
  var LATENCY = 150;

  function jsonResponse(body, status) {
    status = status || 200;
    return new Response(JSON.stringify(body), {
      status: status,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  function delay(ms) {
    return new Promise(function(resolve) { setTimeout(resolve, ms); });
  }

  // Segment-based path matching (shared with router in app.js)
  App.matchSegments = function(pattern, path) {
    var parts = pattern.split('/').filter(Boolean);
    var pathParts = path.split('/').filter(Boolean);
    if (parts.length !== pathParts.length) return null;
    var params = {};
    for (var i = 0; i < parts.length; i++) {
      if (parts[i].charAt(0) === ':') {
        params[parts[i].slice(1)] = pathParts[i];
      } else if (parts[i] !== pathParts[i]) {
        return null;
      }
    }
    return params;
  };

  function matchRoute(method, url, routeMethod, pattern) {
    if (method.toUpperCase() !== routeMethod.toUpperCase()) return null;
    return App.matchSegments(pattern, url);
  }

  function addTeamMember(body) {
    var member = {
      id: String(store.team.length + 1),
      name: body.name || 'New Member',
      email: body.email,
      role: body.role || 'Member',
      department: body.department || 'General',
      status: 'active',
      avatar: null,
      joinedAt: new Date().toISOString().split('T')[0],
    };
    store.team.push(member);
    return member;
  }

  var routes = [
    // Auth
    { method: 'GET', pattern: '/api/auth/user', handler: function() {
      return jsonResponse({ user: store.user });
    }},
    { method: 'POST', pattern: '/api/auth/login', handler: function() {
      return jsonResponse({ user: store.user, message: 'Login successful' });
    }},
    { method: 'POST', pattern: '/api/auth/signup', handler: function() {
      return jsonResponse({ user: store.user, message: 'Signup successful' });
    }},
    { method: 'POST', pattern: '/api/auth/logout', handler: function() {
      return jsonResponse({ message: 'Logged out' });
    }},

    // Ideas
    { method: 'GET', pattern: '/api/ideas', handler: function() {
      return jsonResponse({ ideas: store.ideas });
    }},
    { method: 'POST', pattern: '/api/ideas', handler: function(params, body) {
      var newIdea = {
        id: String(store.ideas.length + 1),
        title: body.title || 'Untitled Idea',
        description: body.description || '',
        status: 'draft',
        category: body.category || 'General',
        priority: body.priority || 'medium',
        author: store.user.name,
        createdAt: new Date().toISOString().split('T')[0],
        score: null,
        tags: body.tags || [],
      };
      store.ideas.push(newIdea);
      return jsonResponse({ idea: newIdea }, 201);
    }},
    { method: 'GET', pattern: '/api/ideas/:id', handler: function(params) {
      var idea = store.ideas.find(function(i) { return i.id === params.id; });
      if (!idea) return jsonResponse({ error: 'Not found' }, 404);
      return jsonResponse({ idea: idea });
    }},
    { method: 'GET', pattern: '/api/ideas/:id/score', handler: function(params) {
      var idea = store.ideas.find(function(i) { return i.id === params.id; });
      if (!idea) return jsonResponse({ error: 'Not found' }, 404);
      var score = idea.score || Math.floor(Math.random() * 40 + 60);
      return jsonResponse({
        ideaId: params.id,
        overall: score,
        feasibility: Math.floor(score * 0.9 + Math.random() * 10),
        impact: Math.floor(score * 1.1 - Math.random() * 10),
        marketFit: Math.floor(score * 0.95 + Math.random() * 5),
        innovation: Math.floor(score * 0.85 + Math.random() * 15),
        breakdown: [
          { label: 'Technical Feasibility', score: Math.floor(score * 0.9 + Math.random() * 10), weight: 0.3 },
          { label: 'Business Impact', score: Math.floor(score * 1.1 - Math.random() * 10), weight: 0.3 },
          { label: 'Market Fit', score: Math.floor(score * 0.95 + Math.random() * 5), weight: 0.2 },
          { label: 'Innovation Level', score: Math.floor(score * 0.85 + Math.random() * 15), weight: 0.2 },
        ],
        recommendations: [
          'Consider starting with a pilot program to validate key assumptions.',
          'Engage stakeholders early for broader buy-in.',
          'Review competitive landscape for similar solutions.',
        ]
      });
    }},
    { method: 'POST', pattern: '/api/ideas/:id/score', handler: function(params) {
      var idea = store.ideas.find(function(i) { return i.id === params.id; });
      if (idea) idea.score = Math.floor(Math.random() * 40 + 60);
      return jsonResponse({ message: 'Scoring started', ideaId: params.id });
    }},
    { method: 'GET', pattern: '/api/ideas/:id/edge', handler: function(params) {
      var edge = store.edges.find(function(e) { return e.ideaId === params.id; });
      if (!edge) {
        edge = { id: 'auto-' + params.id, ideaId: params.id, title: 'Business Outcomes', outcomes: [
          { label: 'Primary KPI', target: 'TBD', current: 'N/A', status: 'not_started' },
        ]};
      }
      return jsonResponse({ edge: edge });
    }},
    { method: 'POST', pattern: '/api/ideas/:id/edge', handler: function(params, body) {
      return jsonResponse({ message: 'Edge saved', ideaId: params.id });
    }},
    { method: 'POST', pattern: '/api/ideas/:id/convert', handler: function(params, body) {
      var idea = store.ideas.find(function(i) { return i.id === params.id; });
      if (!idea) return jsonResponse({ error: 'Not found' }, 404);
      var newProject = {
        id: String(store.projects.length + 1),
        name: body.name || idea.title,
        ideaId: idea.id,
        status: 'planning',
        progress: 0,
        owner: store.user.name,
        team: [store.user.name],
        startDate: new Date().toISOString().split('T')[0],
        targetDate: body.targetDate || '',
        budget: body.budget || 0,
        spent: 0,
        description: idea.description,
      };
      store.projects.push(newProject);
      idea.status = 'approved';
      return jsonResponse({ project: newProject }, 201);
    }},

    // Edges
    { method: 'GET', pattern: '/api/edges', handler: function() {
      return jsonResponse({ edges: store.edges });
    }},

    // Projects
    { method: 'GET', pattern: '/api/projects', handler: function() {
      return jsonResponse({ projects: store.projects });
    }},
    { method: 'GET', pattern: '/api/projects/:id', handler: function(params) {
      var project = store.projects.find(function(p) { return p.id === params.id; });
      if (!project) return jsonResponse({ error: 'Not found' }, 404);
      return jsonResponse({ project: project });
    }},
    { method: 'PUT', pattern: '/api/projects/:id', handler: function(params, body) {
      var project = store.projects.find(function(p) { return p.id === params.id; });
      if (!project) return jsonResponse({ error: 'Not found' }, 404);
      Object.assign(project, body);
      return jsonResponse({ project: project });
    }},

    // Reviews
    { method: 'GET', pattern: '/api/review', handler: function() {
      return jsonResponse({ reviews: store.reviews });
    }},
    { method: 'GET', pattern: '/api/review/:id', handler: function(params) {
      var review = store.reviews.find(function(r) { return r.id === params.id; });
      if (!review) return jsonResponse({ error: 'Not found' }, 404);
      var idea = store.ideas.find(function(i) { return i.id === review.ideaId; });
      return jsonResponse({ review: review, idea: idea });
    }},
    { method: 'POST', pattern: '/api/review/:id/approve', handler: function(params) {
      var review = store.reviews.find(function(r) { return r.id === params.id; });
      if (review) {
        review.status = 'approved';
        var idea = store.ideas.find(function(i) { return i.id === review.ideaId; });
        if (idea) idea.status = 'approved';
      }
      return jsonResponse({ message: 'Approved' });
    }},
    { method: 'POST', pattern: '/api/review/:id/reject', handler: function(params, body) {
      var review = store.reviews.find(function(r) { return r.id === params.id; });
      if (review) {
        review.status = 'rejected';
        var idea = store.ideas.find(function(i) { return i.id === review.ideaId; });
        if (idea) idea.status = 'rejected';
      }
      return jsonResponse({ message: 'Rejected' });
    }},

    // Crunch
    { method: 'POST', pattern: '/api/crunch/upload', handler: function(params, body) {
      return jsonResponse({ file: store.crunchFiles[0] }, 201);
    }},
    { method: 'GET', pattern: '/api/crunch/:fileId', handler: function(params) {
      var file = store.crunchFiles.find(function(f) { return f.id === params.fileId; });
      if (!file) return jsonResponse({ error: 'Not found' }, 404);
      return jsonResponse({ file: file });
    }},

    // Flows
    { method: 'GET', pattern: '/api/flows', handler: function() {
      return jsonResponse({ flows: store.flows });
    }},
    { method: 'POST', pattern: '/api/flows', handler: function(params, body) {
      var flow = { id: String(store.flows.length + 1), title: body.title, steps: body.steps || [] };
      store.flows.push(flow);
      return jsonResponse({ flow: flow }, 201);
    }},
    { method: 'GET', pattern: '/api/flows/:id', handler: function(params) {
      var flow = store.flows.find(function(f) { return f.id === params.id; });
      if (!flow) return jsonResponse({ error: 'Not found' }, 404);
      return jsonResponse({ flow: flow });
    }},

    // Team
    { method: 'GET', pattern: '/api/team', handler: function() {
      return jsonResponse({ team: store.team });
    }},
    { method: 'POST', pattern: '/api/team/invite', handler: function(params, body) {
      return jsonResponse({ member: addTeamMember(body) }, 201);
    }},
    { method: 'PUT', pattern: '/api/team/:userId/role', handler: function(params, body) {
      var member = store.team.find(function(m) { return m.id === params.userId; });
      if (member) member.role = body.role;
      return jsonResponse({ member: member });
    }},
    { method: 'PUT', pattern: '/api/team/:userId/status', handler: function(params, body) {
      var member = store.team.find(function(m) { return m.id === params.userId; });
      if (member) member.status = body.status;
      return jsonResponse({ member: member });
    }},

    // Account
    { method: 'GET', pattern: '/api/account', handler: function() {
      return jsonResponse({ user: store.user, company: store.company });
    }},
    { method: 'GET', pattern: '/api/account/profile', handler: function() {
      return jsonResponse({ profile: store.user });
    }},
    { method: 'PUT', pattern: '/api/account/profile', handler: function(params, body) {
      Object.assign(store.user, body);
      return jsonResponse({ profile: store.user });
    }},
    { method: 'GET', pattern: '/api/account/company', handler: function() {
      return jsonResponse({ company: store.company });
    }},
    { method: 'PUT', pattern: '/api/account/company', handler: function(params, body) {
      Object.assign(store.company, body);
      return jsonResponse({ company: store.company });
    }},
    { method: 'GET', pattern: '/api/account/users', handler: function() {
      return jsonResponse({ users: store.team });
    }},
    { method: 'POST', pattern: '/api/account/users/invite', handler: function(params, body) {
      return jsonResponse({ user: addTeamMember(body) }, 201);
    }},
    { method: 'PUT', pattern: '/api/account/users/:id', handler: function(params, body) {
      var member = store.team.find(function(m) { return m.id === params.id; });
      if (member) Object.assign(member, body);
      return jsonResponse({ user: member });
    }},
    { method: 'GET', pattern: '/api/account/activity', handler: function() {
      return jsonResponse({ activity: store.activity });
    }},
    { method: 'GET', pattern: '/api/account/notifications', handler: function() {
      return jsonResponse({ notifications: store.notifications });
    }},
    { method: 'PUT', pattern: '/api/account/notifications', handler: function(params, body) {
      Object.assign(store.notifications, body);
      return jsonResponse({ notifications: store.notifications });
    }},
  ];

  window.fetch = function(url, options) {
    options = options || {};
    var method = (options.method || 'GET').toUpperCase();

    // Parse URL
    var pathname = url;
    if (typeof url === 'object' && url.url) pathname = url.url;
    try { pathname = new URL(pathname, window.location.origin).pathname; } catch(e) {}

    // Only intercept /api/ calls
    if (!pathname.startsWith('/api/')) {
      return originalFetch.apply(window, arguments);
    }

    // Parse body
    var body = null;
    if (options.body) {
      try { body = JSON.parse(options.body); } catch(e) { body = options.body; }
    }

    // Match route
    for (var i = 0; i < routes.length; i++) {
      var route = routes[i];
      var params = matchRoute(method, pathname, route.method, route.pattern);
      if (params !== null) {
        return delay(LATENCY).then(function() {
          return route.handler(params, body);
        });
      }
    }

    // No match
    return delay(LATENCY).then(function() {
      return jsonResponse({ error: 'Not found: ' + method + ' ' + pathname }, 404);
    });
  };
})();
