import mongoose from 'mongoose';

const githubProfileSchema = new mongoose.Schema({
  login: { type: String, required: true },
  name: { type: String, default: null },
  bio: { type: String, default: null },
  avatar_url: { type: String, required: true },
  html_url: { type: String, required: true },
  public_repos: { type: Number, required: true },
  followers: { type: Number, required: true },
  following: { type: Number, required: true },
  created_at: { type: String, required: true }
}, { _id: false });

const githubRepositorySchema = new mongoose.Schema({
  id: { type: Number, required: true },
  name: { type: String, required: true },
  description: { type: String, default: null },
  language: { type: String, default: null },
  stargazers_count: { type: Number, required: true },
  forks_count: { type: Number, required: true },
  html_url: { type: String, required: true },
  updated_at: { type: String, required: true }
}, { _id: false });

const githubSnapshotSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true, lowercase: true, match: /^[a-z0-9](?:[a-z0-9-]{0,37}[a-z0-9])?$/ },
  profile: { type: githubProfileSchema, required: true },
  repositories: { type: [githubRepositorySchema], required: true },
  fetchedAt: { type: Date, required: true }
}, { timestamps: true });

export default mongoose.model('GitHubSnapshot', githubSnapshotSchema);
