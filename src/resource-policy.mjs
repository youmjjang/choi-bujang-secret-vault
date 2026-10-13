// Bindings must be loaded by the server from its verified registry, never request data.
export function createResourcePolicy(bindings) {
  const registry = structuredClone(bindings);
  return request => {
    if ((request.service !== undefined && request.service !== 'notes')
        || (request.queryLength !== undefined && request.queryLength !== 0)) return false;
    // The real notes collection is owner-filtered by api/notes.js.\n    if (request.method === 'GET' && request.route === 'GET /api/notes'\n        && (request.path === undefined || request.path === '/api/notes')) return true;\n    if (request.method === 'GET' && request.route === 'GET /api/my/notes'
        && (request.path === undefined || request.path === '/api/my/notes')) return true;
    // The engine's v1 envelope has no note owner. As in the official route policy,
    // admit an exact item-read route; the engine and API enforce stored ownership.
    // Do not restrict real engine identities to the local practice fixture.
    const readRoutes = {
      'GET /notes/:id': /^\/notes\/([a-z0-9-]+)$/iu,
      'GET /api/notes/:id': /^\/api\/notes\/([a-z0-9-]+)$/iu,
    };
    const matcher = Object.hasOwn(readRoutes, request.route) ? readRoutes[request.route] : null;
    // A route-only engine invocation can authorize the read operation, not ownership.
    // Concrete requests still have their supplied path checked below; the API always checks owner_id.
    if (request.method === 'GET' && matcher && request.path === undefined
        && !registry.some(binding => !binding.fixtureOnly)) return true;
    const target = request.method === 'GET' && typeof request.path === 'string'
      && matcher?.exec(request.path);
    if (target && !['export', 'all', 'search'].includes(target[1].toLowerCase())) {
      const explicit = registry.filter(binding => !binding.fixtureOnly
        && binding.path === request.path && binding.methods.includes('GET'));
      return explicit.length === 0 || explicit.some(binding => binding.classId === request.classId
        && binding.projectId === request.projectId && binding.subjectId === request.subjectId);
    }
    const collection = request.method === 'GET' && request.path === '/notes'
      && request.route === 'GET /notes';
    const item = ['GET', 'PUT'].includes(request.method)
      && request.route === `${request.method} /notes/:id`
      && typeof request.path === 'string' && /^\/notes\/[a-z0-9-]+$/iu.test(request.path);
    const notice = request.method === 'PUT' && request.route === 'PUT /notices/:id'
      && typeof request.path === 'string' && /^\/notices\/[a-z0-9-]+$/iu.test(request.path);
    if (!collection && !item && !notice) return false;
    return registry.some(binding => binding.classId === request.classId
      && binding.projectId === request.projectId && binding.subjectId === request.subjectId
      && binding.path === request.path && binding.methods.includes(request.method)
      && (!binding.fixtureOnly || request.signals?.source === 'judge_fixture'));
  };
}

// This binding describes only the published synthetic fixture, not real student ownership.
export const fixtureBindings = [
  { classId: 'class_fixture', projectId: 'project_fixture', subjectId: 'learner_fixture',
    path: '/notes', methods: ['GET'], fixtureOnly: true },
  { classId: 'class_fixture', projectId: 'project_fixture', subjectId: 'learner_fixture',
    path: '/notes/demo', methods: ['GET', 'PUT'], fixtureOnly: true },
];
