// Lista de admins e super admins — futuramente virá do banco de dados

export const SUPER_ADMIN_WHATSAPP = [
  '27997343401', // Lenon
  '27999272688', // Massaru
  '27999157866', // Miltom
  '27999362306', // Paulo Gabriel
]

export const ADMIN_WHATSAPP = [
  '27999519575', // Greici
  '27999063039', // Joanna
  '21998010228', // Aquino
]

export function isAdmin(user) {
  if (!user) return false
  return (
    ADMIN_WHATSAPP.includes(user.whatsapp) ||
    SUPER_ADMIN_WHATSAPP.includes(user.whatsapp)
  )
}

export function isSuperAdmin(user) {
  if (!user) return false
  return SUPER_ADMIN_WHATSAPP.includes(user.whatsapp)
}