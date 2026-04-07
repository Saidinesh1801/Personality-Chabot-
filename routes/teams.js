const express = require('express');
const router = express.Router();
const db = require('../src/db');
const {
  createTeam,
  getUserTeams,
  getTeamMembers,
  shareChatWithTeam,
  getTeamChats,
  getTeam,
  deleteTeam,
} = require('../src/teams');

router.get('/', (req, res) => {
  const teams = getUserTeams(req.userId);
  res.json({ teams });
});

router.post('/', (req, res) => {
  const { name } = req.body;
  if (!name) return res.status(400).json({ error: 'name is required' });
  const teamId = createTeam(name, req.userId);
  res.json({ teamId, name });
});

router.get('/:id', (req, res) => {
  const team = getTeam(req.params.id);
  if (!team) return res.status(404).json({ error: 'Team not found' });
  const members = getTeamMembers(req.params.id);
  const isMember = members.some((m) => m.userId === req.userId);
  if (!isMember) return res.status(403).json({ error: 'Not a team member' });
  const chats = getTeamChats(req.params.id, req.userId);
  res.json({ team, members, chats });
});

router.post('/:id/members', (req, res) => {
  const { email, role } = req.body;
  if (!email) return res.status(400).json({ error: 'email required' });
  const user = db.getUserByEmail(email);
  if (!user) return res.status(404).json({ error: 'User not found' });
  const { addTeamMember } = require('../src/teams');
  addTeamMember(req.params.id, user.id, role || 'member');
  res.json({ success: true });
});

router.delete('/:id/members/:userId', (req, res) => {
  const { removeTeamMember } = require('../src/teams');
  removeTeamMember(req.params.id, parseInt(req.params.userId));
  res.json({ success: true });
});

router.post('/:id/share/:chatId', (req, res) => {
  const shared = shareChatWithTeam(req.params.chatId, req.params.id, req.userId);
  res.json({ success: shared });
});

router.get('/:id/chats', (req, res) => {
  const chats = getTeamChats(req.params.id, req.userId);
  res.json({ chats });
});

router.delete('/:id', (req, res) => {
  const deleted = deleteTeam(req.params.id, req.userId);
  res.json({ success: deleted });
});

module.exports = router;
