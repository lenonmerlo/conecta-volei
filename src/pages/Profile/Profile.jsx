// Página de perfil e cadastro do atleta

import { useState } from 'react'
import './Profile.css'
import Button from '../../components/Button/Button'
import { saveMember, saveGuest } from '../../data/playerStorage'
import { PLAYER_TYPE, PLAYER_STATUS } from '../../domain/constants'

function Profile() {
  const [form, setForm] = useState({
    name: '',
    nickname: '',
    whatsapp: '',
    type: PLAYER_TYPE.MEMBER,
    gender: 'M',
    acceptedRules: false,
  })

  const [saved, setSaved] = useState(false)
  const [errors, setErrors] = useState({})

  function validate() {
    const newErrors = {}
    if (!form.name.trim()) newErrors.name = 'Nome é obrigatório'
    if (!form.whatsapp.trim()) newErrors.whatsapp = 'WhatsApp é obrigatório'
    if (!form.acceptedRules) newErrors.acceptedRules = 'Você precisa aceitar as regras'
    return newErrors
  }

  function handleChange(e) {
    const { name, value, type, checked } = e.target
    setForm((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }))
  }

  function handleSubmit() {
    const newErrors = validate()
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors)
      return
    }

    const player = {
      id: crypto.randomUUID(),
      name: form.name.trim(),
      nickname: form.nickname.trim() || null,
      whatsapp: form.whatsapp.trim(),
      type: form.type,
      gender: form.gender,
      status: PLAYER_STATUS.ACTIVE,
      acceptedRules: true,
      createdAt: new Date().toISOString(),
    }

    if (form.type === PLAYER_TYPE.MEMBER) {
      saveMember(player)
    } else {
      saveGuest(player)
    }

    setSaved(true)
    setErrors({})
  }

  if (saved) {
    return (
      <div className="profile">
        <div className="profile__success">
          <h2>Cadastro realizado!</h2>
          <p>Bem-vindo ao Conecta Vôlei 🏐</p>
          <Button onClick={() => setSaved(false)} variant="secondary">
            Editar cadastro
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="profile">
      <h2 className="profile__title">Meu Cadastro</h2>

      <div className="profile__form">
        <div className="profile__field">
          <label>Nome completo *</label>
          <input
            name="name"
            value={form.name}
            onChange={handleChange}
            placeholder="Ex: João da Silva"
          />
          {errors.name && <span className="profile__error">{errors.name}</span>}
        </div>

        <div className="profile__field">
          <label>Apelido</label>
          <input
            name="nickname"
            value={form.nickname}
            onChange={handleChange}
            placeholder="Ex: Joãozinho (opcional)"
          />
        </div>

        <div className="profile__field">
          <label>WhatsApp *</label>
          <input
            name="whatsapp"
            value={form.whatsapp}
            onChange={handleChange}
            placeholder="Ex: 27999999999"
          />
          {errors.whatsapp && <span className="profile__error">{errors.whatsapp}</span>}
        </div>

        <div className="profile__field">
          <label>Tipo</label>
          <select name="type" value={form.type} onChange={handleChange}>
            <option value={PLAYER_TYPE.MEMBER}>Membro</option>
            <option value={PLAYER_TYPE.GUEST}>Convidado</option>
          </select>
        </div>

        <div className="profile__field">
          <label>Gênero</label>
          <select name="gender" value={form.gender} onChange={handleChange}>
            <option value="M">Masculino</option>
            <option value="F">Feminino</option>
          </select>
        </div>

        <div className="profile__field profile__field--checkbox">
          <input
            type="checkbox"
            name="acceptedRules"
            checked={form.acceptedRules}
            onChange={handleChange}
            id="acceptedRules"
          />
          <label htmlFor="acceptedRules">Li e aceito as regras do grupo</label>
          {errors.acceptedRules && <span className="profile__error">{errors.acceptedRules}</span>}
        </div>

        <Button onClick={handleSubmit}>Salvar cadastro</Button>
      </div>
    </div>
  )
}

export default Profile