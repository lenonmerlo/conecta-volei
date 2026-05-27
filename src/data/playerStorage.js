// Serviço de persistência local dos atletas

const MEMBERS_KEY = 'conecta_volei_members'

export function saveMember(player) {
  const members = getMembers()
  const existing = members.findIndex((p) => p.id === player.id)
  if (existing >= 0) {
    members[existing] = player
  } else {
    members.push(player)
  }
  localStorage.setItem(MEMBERS_KEY, JSON.stringify(members))
}

export function getMembers() {
  const data = localStorage.getItem(MEMBERS_KEY)
  return data ? JSON.parse(data) : []
}

export function saveGuest(player) {
  sessionStorage.setItem('conecta_volei_guest', JSON.stringify(player))
}

export function getGuest() {
  const data = sessionStorage.getItem('conecta_volei_guest')
  return data ? JSON.parse(data) : null
}

export function clearGuest() {
  sessionStorage.removeItem('conecta_volei_guest')
}