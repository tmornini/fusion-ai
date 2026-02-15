// Fusion AI — Fetch Interceptor & Mock Data Store
(function() {
  var App = window.FusionApp = window.FusionApp || {};

  // ==========================================
  // MOCK DATA STORE
  // ==========================================
  var store = {
    user: { email: 'demo@example.com', name: 'Demo User', role: 'admin', avatar: null },
    company: { name: 'Demo Company', industry: 'Technology', size: '50-200', plan: 'Pro' },

    ideas: [
      { id: '1', title: 'AI-Powered Customer Support Chatbot', description: 'Implement an AI chatbot that can handle tier-1 support tickets automatically, reducing response time and support costs.', status: 'approved', category: 'AI/ML', priority: 'high', author: 'Sarah Chen', createdAt: '2025-01-15', score: 87, tags: ['ai', 'support', 'automation'] },
      { id: '2', title: 'Mobile App Redesign', description: 'Complete redesign of the mobile application with modern UI patterns and improved user experience.', status: 'in_review', category: 'Product', priority: 'high', author: 'Mike Johnson', createdAt: '2025-01-20', score: 72, tags: ['mobile', 'ux', 'design'] },
      { id: '3', title: 'Real-Time Analytics Dashboard', description: 'Build a real-time analytics dashboard for monitoring key business metrics and KPIs.', status: 'draft', category: 'Data', priority: 'medium', author: 'Emily Rodriguez', createdAt: '2025-02-01', score: null, tags: ['analytics', 'dashboard'] },
      { id: '4', title: 'API Gateway Migration', description: 'Migrate existing API infrastructure to a modern gateway with rate limiting, caching, and better observability.', status: 'approved', category: 'Infrastructure', priority: 'high', author: 'Alex Kim', createdAt: '2025-01-10', score: 91, tags: ['api', 'infrastructure'] },
      { id: '5', title: 'Customer Portal V2', description: 'Next generation customer self-service portal with SSO integration and custom branding.', status: 'rejected', category: 'Product', priority: 'medium', author: 'John Davis', createdAt: '2025-01-25', score: 45, tags: ['portal', 'customer'] },
      { id: '6', title: 'Automated Testing Pipeline', description: 'Set up comprehensive automated testing including unit, integration, and e2e tests in CI/CD pipeline.', status: 'draft', category: 'Engineering', priority: 'medium', author: 'Lisa Park', createdAt: '2025-02-05', score: null, tags: ['testing', 'ci-cd'] },
      { id: '7', title: 'Data Lake Architecture', description: 'Design and implement a scalable data lake for centralized data storage and processing.', status: 'in_review', category: 'Data', priority: 'low', author: 'Tom Wilson', createdAt: '2025-02-08', score: 68, tags: ['data', 'architecture'] },
      { id: '8', title: 'Employee Onboarding Automation', description: 'Automate the employee onboarding process with digital forms, task assignments, and progress tracking.', status: 'approved', category: 'HR Tech', priority: 'medium', author: 'Sarah Chen', createdAt: '2025-01-05', score: 82, tags: ['hr', 'automation'] },
    ],

    projects: [
      { id: '1', name: 'AI Customer Support', ideaId: '1', status: 'in_progress', progress: 65, owner: 'Sarah Chen', team: ['Sarah Chen', 'Alex Kim', 'Emily Rodriguez'], startDate: '2025-02-01', targetDate: '2025-04-30', budget: 50000, spent: 32500, description: 'Building an AI-powered chatbot for tier-1 support tickets.' },
      { id: '2', name: 'API Gateway v2', ideaId: '4', status: 'in_progress', progress: 40, owner: 'Alex Kim', team: ['Alex Kim', 'Tom Wilson'], startDate: '2025-02-15', targetDate: '2025-05-15', budget: 35000, spent: 14000, description: 'Migrating to modern API gateway infrastructure.' },
      { id: '3', name: 'Onboarding Automation', ideaId: '8', status: 'completed', progress: 100, owner: 'Lisa Park', team: ['Lisa Park', 'John Davis'], startDate: '2025-01-10', targetDate: '2025-03-01', budget: 20000, spent: 18500, description: 'Digital employee onboarding system.' },
      { id: '4', name: 'Mobile App v3', ideaId: '2', status: 'planning', progress: 10, owner: 'Mike Johnson', team: ['Mike Johnson', 'Sarah Chen'], startDate: '2025-03-01', targetDate: '2025-06-30', budget: 75000, spent: 7500, description: 'Complete mobile app redesign project.' },
      { id: '5', name: 'Data Pipeline', ideaId: '7', status: 'on_hold', progress: 25, owner: 'Tom Wilson', team: ['Tom Wilson', 'Emily Rodriguez'], startDate: '2025-02-20', targetDate: '2025-07-01', budget: 45000, spent: 11250, description: 'Building centralized data processing pipeline.' },
    ],

    reviews: [
      { id: '1', ideaId: '2', ideaTitle: 'Mobile App Redesign', submittedBy: 'Mike Johnson', submittedAt: '2025-01-20', status: 'pending', priority: 'high', category: 'Product', summary: 'Complete mobile app redesign with modern UI.' },
      { id: '2', ideaId: '7', ideaTitle: 'Data Lake Architecture', submittedBy: 'Tom Wilson', submittedAt: '2025-02-08', status: 'pending', priority: 'low', category: 'Data', summary: 'Centralized data lake for analytics.' },
      { id: '3', ideaId: '6', ideaTitle: 'Automated Testing Pipeline', submittedBy: 'Lisa Park', submittedAt: '2025-02-05', status: 'pending', priority: 'medium', category: 'Engineering', summary: 'Comprehensive automated testing in CI/CD.' },
    ],

    team: [
      { id: '1', name: 'Sarah Chen', email: 'sarah@example.com', role: 'Lead Engineer', department: 'Engineering', status: 'active', avatar: null, joinedAt: '2024-06-15' },
      { id: '2', name: 'Mike Johnson', email: 'mike@example.com', role: 'Product Manager', department: 'Product', status: 'active', avatar: null, joinedAt: '2024-07-01' },
      { id: '3', name: 'Emily Rodriguez', email: 'emily@example.com', role: 'Data Scientist', department: 'Data', status: 'active', avatar: null, joinedAt: '2024-08-10' },
      { id: '4', name: 'Alex Kim', email: 'alex@example.com', role: 'DevOps Engineer', department: 'Engineering', status: 'active', avatar: null, joinedAt: '2024-09-01' },
      { id: '5', name: 'Tom Wilson', email: 'tom@example.com', role: 'Backend Developer', department: 'Engineering', status: 'active', avatar: null, joinedAt: '2024-10-15' },
      { id: '6', name: 'Lisa Park', email: 'lisa@example.com', role: 'QA Engineer', department: 'Engineering', status: 'active', avatar: null, joinedAt: '2024-11-01' },
      { id: '7', name: 'John Davis', email: 'john@example.com', role: 'UI Designer', department: 'Design', status: 'inactive', avatar: null, joinedAt: '2024-05-20' },
    ],

    edges: [
      { id: '1', ideaId: '1', title: 'Customer Support Efficiency', outcomes: [
        { label: 'Reduce ticket response time', target: '< 2 minutes', current: '8 minutes', status: 'in_progress' },
        { label: 'Automate tier-1 tickets', target: '70%', current: '35%', status: 'in_progress' },
        { label: 'Improve CSAT score', target: '4.5/5', current: '3.8/5', status: 'at_risk' },
      ]},
      { id: '2', ideaId: '4', title: 'API Performance', outcomes: [
        { label: 'API response time p99', target: '< 200ms', current: '450ms', status: 'in_progress' },
        { label: 'API uptime', target: '99.99%', current: '99.95%', status: 'on_track' },
        { label: 'Rate limit compliance', target: '100%', current: '92%', status: 'in_progress' },
      ]},
      { id: '3', ideaId: '8', title: 'Onboarding Metrics', outcomes: [
        { label: 'Time to productive', target: '3 days', current: '3.2 days', status: 'on_track' },
        { label: 'Onboarding completion rate', target: '95%', current: '97%', status: 'achieved' },
        { label: 'New hire satisfaction', target: '4.0/5', current: '4.3/5', status: 'achieved' },
      ]},
    ],

    flows: [
      { id: '1', title: 'Idea to Project Pipeline', steps: [
        { id: 's1', title: 'Submit Idea', description: 'Author submits idea with description and category', order: 1 },
        { id: 's2', title: 'Initial Review', description: 'Product team reviews and provides feedback', order: 2 },
        { id: 's3', title: 'AI Scoring', description: 'Automated scoring based on feasibility and impact', order: 3 },
        { id: 's4', title: 'Committee Approval', description: 'Steering committee votes on idea', order: 4 },
        { id: 's5', title: 'Project Creation', description: 'Approved idea is converted to a project', order: 5 },
      ]},
    ],

    crunchFiles: [
      { id: 'f1', name: 'sales_data_2025.csv', size: '2.4 MB', uploadedAt: '2025-02-10', rows: 15000, columns: [
        { name: 'date', type: 'date', nulls: 0, unique: 365 },
        { name: 'product', type: 'string', nulls: 0, unique: 12 },
        { name: 'revenue', type: 'number', nulls: 5, unique: 14200, min: 10, max: 50000, mean: 2340 },
        { name: 'region', type: 'string', nulls: 0, unique: 8 },
        { name: 'units_sold', type: 'number', nulls: 12, unique: 980, min: 1, max: 500, mean: 45 },
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

    notifications: {
      email: { ideas: true, projects: true, reviews: true, team: false, weekly_digest: true },
      inApp: { ideas: true, projects: true, reviews: true, team: true, mentions: true },
    },

    profile: {
      name: 'Demo User',
      email: 'demo@example.com',
      role: 'Admin',
      phone: '+1 (555) 123-4567',
      location: 'San Francisco, CA',
      bio: 'Product innovation enthusiast. Building the future of enterprise AI.',
      avatar: null,
    },
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

  // Route matching
  function matchRoute(method, url, routeMethod, pattern) {
    if (method.toUpperCase() !== routeMethod.toUpperCase()) return null;
    var parts = pattern.split('/').filter(Boolean);
    var urlParts = url.split('/').filter(Boolean);
    if (parts.length !== urlParts.length) return null;
    var params = {};
    for (var i = 0; i < parts.length; i++) {
      if (parts[i].charAt(0) === ':') {
        params[parts[i].slice(1)] = urlParts[i];
      } else if (parts[i] !== urlParts[i]) {
        return null;
      }
    }
    return params;
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
      return jsonResponse({ member: member }, 201);
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
      return jsonResponse({ profile: store.profile });
    }},
    { method: 'PUT', pattern: '/api/account/profile', handler: function(params, body) {
      Object.assign(store.profile, body);
      return jsonResponse({ profile: store.profile });
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
      var member = {
        id: String(store.team.length + 1),
        name: body.name || 'New User',
        email: body.email,
        role: body.role || 'Member',
        department: body.department || 'General',
        status: 'active',
        avatar: null,
        joinedAt: new Date().toISOString().split('T')[0],
      };
      store.team.push(member);
      return jsonResponse({ user: member }, 201);
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
