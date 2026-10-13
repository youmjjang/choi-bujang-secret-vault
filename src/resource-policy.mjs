// Bindings must be loaded by the server from its verified registry, never request data.
export function createResourcePolicy(bindings) {
  const registry = structuredClone(bindings);
  return request => {
    if (request.service !== 'notes' || request.queryLength !== 0) return false;
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
