export const supplementalProjects = [
  {
    id: 'supplemental-landing-page',
    name: 'Landing Page',
    slug: 'landing-page',
    description: 'A responsive landing page for a project-based learning platform, with course highlights, learner testimonials and a free-trial sign-up form.',
    problemSolved: 'Presents the learning platform and its course offering in a clear, engaging format.',
    features: [
      'Course and platform highlights',
      'Learner testimonials',
      'Free-trial sign-up form'
    ],
    imageUrl: '/project-screenshots/task1-landing-page.png',
    stack: ['HTML5', 'CSS3', 'JavaScript'],
    liveUrl: 'https://task1-landing-page-olive.vercel.app/',
    repoUrl: '',
    featured: false,
    displayOrder: 0
  },
  {
    id: 'supplemental-personal-portfolio',
    name: 'Personal Portfolio',
    slug: 'personal-portfolio',
    description: 'A personal portfolio showcasing Hariom Tiwari’s background, skills and projects, with interactive navigation, theme switching and a validated contact form.',
    problemSolved: 'Brings personal background, selected work and contact information together in one portfolio.',
    features: [
      'Responsive navigation and project filters',
      'Dark-mode toggle with saved preference',
      'Animated role text and scroll reveals',
      'Contact form validation'
    ],
    imageUrl: '/project-screenshots/task2-portfolio.png',
    stack: ['HTML5', 'CSS3', 'JavaScript'],
    liveUrl: 'https://task2-portfolio-nine.vercel.app/',
    repoUrl: '',
    featured: false,
    displayOrder: 0
  },
  {
    id: 'supplemental-todo-app',
    name: 'To-Do App',
    slug: 'to-do-app',
    description: 'A task manager for creating, editing and prioritizing tasks, with completion filters and browser-based persistence.',
    problemSolved: 'Helps users organize tasks and track progress in a simple interface.',
    features: [
      'Add, edit, complete and delete tasks',
      'Prioritize tasks and filter by completion status',
      'Track completed-task progress',
      'Persist tasks with local storage'
    ],
    imageUrl: '/project-screenshots/task3-todo-app.png',
    stack: ['HTML5', 'CSS3', 'JavaScript', 'Local Storage'],
    liveUrl: 'https://task3-todo-app-mu.vercel.app/',
    repoUrl: '',
    featured: false,
    displayOrder: 0
  },
  {
    id: 'supplemental-weather-dashboard',
    name: 'Weather Dashboard',
    slug: 'weather-dashboard',
    description: 'A weather dashboard that looks up a city and displays current conditions and a five-day forecast using Open-Meteo.',
    problemSolved: 'Makes current conditions and a short forecast easy to check for a searched location.',
    features: [
      'Search for a city',
      'View current conditions and a five-day forecast',
      'Switch between Celsius and Fahrenheit',
      'Revisit recent searches'
    ],
    imageUrl: '/project-screenshots/task4-weather-dashboard.png',
    stack: ['HTML5', 'CSS3', 'JavaScript', 'Fetch API', 'Open-Meteo API'],
    liveUrl: 'https://task4-weather-dashboard.vercel.app/',
    repoUrl: '',
    featured: false,
    displayOrder: 0
  }
];

export const projectScreenshotOverrides = [
  {
    liveUrl: 'https://hariom-portfolio-fullstack.vercel.app/',
    imageUrl: '/project-screenshots/hariom-portfolio-fullstack.png'
  }
];
