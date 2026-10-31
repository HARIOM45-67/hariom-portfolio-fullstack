import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { getGitHubData } from '../services/github.js';

const router = Router();
router.use(rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 30,
  standardHeaders: 'draft-7',
  legacyHeaders: false
}));

async function sendCachedData(res, next, select) {
  try {
    const result = await getGitHubData();
    res.set('X-GitHub-Cache', result.cache);
    if (result.stale) res.set('Warning', '110 - "Response is stale"');
    return res.json(select(result.data));
  } catch (error) {
    if (error.retryAfter) res.set('Retry-After', error.retryAfter);
    return next(error);
  }
}

router.get('/profile', (req, res, next) => sendCachedData(
  res,
  next,
  data => ({ profile: data.profile })
));

router.get('/repos', (req, res, next) => sendCachedData(
  res,
  next,
  data => ({ repositories: data.repositories })
));

export default router;
