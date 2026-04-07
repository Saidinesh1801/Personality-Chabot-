const path = require('path');
const fs = require('fs');

const dataDir = path.join(__dirname, '..', 'data');

let teamsData = [];
let teamMemberships = {};
let sharedChats = {};

try {
  const teamsPath = path.join(dataDir, 'teams.json');
  if (fs.existsSync(teamsPath)) {
    teamsData = JSON.parse(fs.readFileSync(teamsPath, 'utf8'));
  }
  const membershipsPath = path.join(dataDir, 'team_memberships.json');
  if (fs.existsSync(membershipsPath)) {
    teamMemberships = JSON.parse(fs.readFileSync(membershipsPath, 'utf8'));
  }
  const sharesPath = path.join(dataDir, 'shared_chats.json');
  if (fs.existsSync(sharesPath)) {
    sharedChats = JSON.parse(fs.readFileSync(sharesPath, 'utf8'));
  }
} catch (e) {
  teamsData = [];
  teamMemberships = {};
  sharedChats = {};
}

function saveTeams(teams) {
  teamsData = teams;
  fs.writeFileSync(path.join(dataDir, 'teams.json'), JSON.stringify(teams, null, 2));
}
function saveTeamMemberships(userId, memberships) {
  teamMemberships[userId] = memberships;
  fs.writeFileSync(
    path.join(dataDir, 'team_memberships.json'),
    JSON.stringify(teamMemberships, null, 2)
  );
}
function saveSharedChats(teamId, chats) {
  sharedChats[teamId] = chats;
  fs.writeFileSync(path.join(dataDir, 'shared_chats.json'), JSON.stringify(sharedChats, null, 2));
}

function getAllTeams() {
  return teamsData;
}
function getOrCreateTeamsTable() {
  return teamsData;
}
function getAllTeamMemberships() {
  const result = [];
  for (const memberships of Object.values(teamMemberships)) {
    result.push(...(memberships || []));
  }
  return result;
}
function getTeamMemberships(userId) {
  return teamMemberships[userId] || [];
}
function getSharedChats(teamId) {
  return sharedChats[teamId] || [];
}

const db = require('./db');

function createTeam(name, ownerId) {
  const teamId = 'team_' + Date.now() + '_' + Math.random().toString(36).slice(2, 8);
  const team = { id: teamId, name, ownerId, createdAt: Date.now() };
  teamsData.push(team);
  saveTeams(teamsData);
  addTeamMember(teamId, ownerId, 'owner');
  return teamId;
}

function getTeam(teamId) {
  return teamsData.find((t) => t.id === teamId) || null;
}

function getUserTeams(userId) {
  const memberships = getTeamMemberships(userId);
  return memberships
    .map((m) => {
      const team = teamsData.find((t) => t.id === m.teamId);
      return team ? { ...team, role: m.role } : null;
    })
    .filter(Boolean);
}

function addTeamMember(teamId, userId, role = 'member') {
  const memberships = getTeamMemberships(userId);
  if (memberships.find((m) => m.teamId === teamId)) return false;
  memberships.push({ teamId, userId, role, joinedAt: Date.now() });
  saveTeamMemberships(userId, memberships);
  return true;
}

function removeTeamMember(teamId, userId) {
  const memberships = getTeamMemberships(userId);
  const filtered = memberships.filter((m) => m.teamId !== teamId);
  saveTeamMemberships(userId, filtered);
}

function getTeamMembers(teamId) {
  const allMemberships = getAllTeamMemberships();
  const memberIds = allMemberships.filter((m) => m.teamId === teamId).map((m) => m.userId);
  return memberIds
    .map((uid) => {
      const user = db.getUserById(uid);
      if (!user) return null;
      const membership = allMemberships.find((m) => m.teamId === teamId && m.userId === uid);
      return { userId: uid, name: user.name, email: user.email, role: membership?.role };
    })
    .filter(Boolean);
}

function shareChatWithTeam(chatId, teamId, ownerId) {
  const memberships = getTeamMembers(teamId);
  const memberIds = memberships.map((m) => m.userId);
  if (!memberIds.includes(ownerId)) return false;

  const shares = getSharedChats(teamId);
  const existing = shares.find((s) => s.chatId === chatId && s.teamId === teamId);
  if (existing) return false;

  shares.push({ chatId, teamId, sharedBy: ownerId, sharedAt: Date.now() });
  saveSharedChats(teamId, shares);
  return true;
}

function getTeamChats(teamId, userId) {
  const shared = getSharedChats(teamId);
  const myChats = db.getAllChats(userId);
  const sharedChatIds = new Set(shared.map((s) => s.chatId));
  const myChatIds = new Set(myChats.map((c) => c.id));

  const allChatIds = new Set([...myChatIds, ...sharedChatIds]);

  return Array.from(allChatIds)
    .map((id) => {
      const isMine = myChatIds.has(id);
      const chat = isMine
        ? myChats.find((c) => c.id === id)
        : db.getChat(id, shared.find((s) => s.chatId === id)?.sharedBy);
      const share = shared.find((s) => s.chatId === id);
      return chat ? { ...chat, shared: !isMine, sharedBy: share?.sharedBy } : null;
    })
    .filter(Boolean);
}

function leaveTeam(teamId, userId) {
  removeTeamMember(teamId, userId);
}

function deleteTeam(teamId, ownerId) {
  const team = getTeam(teamId);
  if (!team || team.ownerId !== ownerId) return false;
  teamsData = teamsData.filter((t) => t.id !== teamId);
  saveTeams(teamsData);
  return true;
}

module.exports = {
  createTeam,
  getTeam,
  getUserTeams,
  addTeamMember,
  removeTeamMember,
  getTeamMembers,
  shareChatWithTeam,
  getSharedChats,
  getTeamChats,
  leaveTeam,
  deleteTeam,
  getAllTeams,
  getOrCreateTeamsTable,
  getAllTeamMemberships,
  getTeamMemberships,
  saveTeams,
  saveTeamMemberships,
  saveSharedChats,
};
