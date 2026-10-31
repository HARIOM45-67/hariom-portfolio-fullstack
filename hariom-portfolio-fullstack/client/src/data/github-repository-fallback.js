export const githubRepositoryFallback = [
  {
    id: 'hariom-ai',
    name: 'hariom-ai',
    description: 'Hariom AI – My personal AI project',
    language: 'JavaScript'
  },
  { id: 'student-management-system', name: 'Student-Management-System', language: 'JavaScript' },
  { id: 'hariom-portfolio', name: 'hariom-portfolio', language: 'TypeScript' },
  { id: 'itzfizz-hero', name: 'itzfizz-hero', language: 'CSS' },
  { id: 'full-stack-java', name: 'FULL-STACK-JAVA', language: 'Java' },
  { id: 'my-protoflio', name: 'MY-PROTOFLIO', language: 'CSS' }
].map(repository => ({
  ...repository,
  html_url: `https://github.com/HARIOM45-67/${repository.name}`
}));
