// Aba de avisos do painel admin

import { useEffect, useState } from "react";
import Button from "../../../components/Button/Button";
import {
  createAnnouncement,
  deleteAnnouncement,
  getAllAnnouncements,
  updateAnnouncement,
} from "../../../data/supabaseService";

function AdminAnnouncements() {
  const [announcements, setAnnouncements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const [form, setForm] = useState({ title: "", body: "", urgent: false });
  const [submitting, setSubmitting] = useState(false);
  const [editingId, setEditingId] = useState(null);

  async function load() {
    setLoading(true);
    setError("");

    const data = await getAllAnnouncements();
    setAnnouncements(data || []);
    setLoading(false);
  }

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      load();
    }, 0);

    return () => {
      clearTimeout(timeoutId);
    };
  }, []);

  function resetForm() {
    setForm({ title: "", body: "", urgent: false });
    setEditingId(null);
    setError("");
  }

  function startEdit(announcement) {
    setEditingId(announcement.id);
    setForm({
      title: announcement.title || "",
      body: announcement.body || "",
      urgent: Boolean(announcement.urgent),
    });
    setError("");
    setNotice("");
  }

  async function handleSubmit() {
    if (!form.title.trim() || !form.body.trim()) {
      setError("Titulo e texto sao obrigatorios.");
      return;
    }

    setSubmitting(true);
    setError("");
    setNotice("");

    if (editingId) {
      const current = announcements.find((item) => item.id === editingId);
      const ok = await updateAnnouncement(editingId, {
        title: form.title.trim(),
        body: form.body.trim(),
        urgent: form.urgent,
        active: current?.active ?? true,
      });

      if (!ok) {
        setError("Nao foi possivel atualizar o aviso.");
        setSubmitting(false);
        return;
      }

      setNotice("Aviso atualizado.");
    } else {
      const result = await createAnnouncement({
        title: form.title.trim(),
        body: form.body.trim(),
        urgent: form.urgent,
      });

      if (!result.success) {
        setError("Nao foi possivel criar o aviso.");
        setSubmitting(false);
        return;
      }

      setNotice("Aviso criado.");
    }

    setSubmitting(false);
    resetForm();
    await load();
  }

  async function handleToggleActive(announcement) {
    setError("");
    setNotice("");

    const ok = await updateAnnouncement(announcement.id, {
      title: announcement.title,
      body: announcement.body,
      urgent: announcement.urgent,
      active: !announcement.active,
    });

    if (!ok) {
      setError("Nao foi possivel alterar o status do aviso.");
      return;
    }

    setNotice(announcement.active ? "Aviso desativado." : "Aviso ativado.");
    await load();
  }

  async function handleDelete(id) {
    setError("");
    setNotice("");

    const ok = await deleteAnnouncement(id);
    if (!ok) {
      setError("Nao foi possivel excluir o aviso.");
      return;
    }

    setNotice("Aviso excluido.");
    if (editingId === id) resetForm();
    await load();
  }

  return (
    <div className="admin-tab">
      {error && <p className="admin-tab__restricted">{error}</p>}
      {notice && <p className="admin-tab__restricted">{notice}</p>}

      <div className="admin-tab__form">
        <h3 className="admin-tab__form-title">
          {editingId ? "Editar aviso" : "Novo aviso"}
        </h3>

        <input
          className="admin-tab__input"
          type="text"
          placeholder="Titulo"
          value={form.title}
          onChange={(e) =>
            setForm((prev) => ({ ...prev, title: e.target.value }))
          }
        />

        <textarea
          className="admin-tab__textarea"
          placeholder="Texto do aviso"
          rows={3}
          value={form.body}
          onChange={(e) =>
            setForm((prev) => ({ ...prev, body: e.target.value }))
          }
        />

        <label className="admin-tab__checkbox-label">
          <input
            type="checkbox"
            checked={form.urgent}
            onChange={(e) =>
              setForm((prev) => ({ ...prev, urgent: e.target.checked }))
            }
          />
          Marcar como urgente
        </label>

        <div className="admin-tab__actions">
          <Button
            size="sm"
            variant="primary"
            className="admin-tab__btn"
            onClick={handleSubmit}
            disabled={submitting}
          >
            {editingId ? "Salvar alteracoes" : "Publicar aviso"}
          </Button>

          {editingId && (
            <Button
              size="sm"
              variant="secondary"
              className="admin-tab__btn"
              onClick={resetForm}
              disabled={submitting}
            >
              Cancelar
            </Button>
          )}
        </div>
      </div>

      {loading && <p className="admin-tab__restricted">Carregando avisos...</p>}

      {!loading && announcements.length === 0 && (
        <p className="admin-tab__restricted">Nenhum aviso cadastrado.</p>
      )}

      <ul className="admin-tab__list">
        {announcements.map((announcement) => (
          <li key={announcement.id} className="admin-tab__item">
            <div className="admin-tab__info">
              <span className="admin-tab__name">
                {announcement.urgent ? "URGENTE - " : ""}
                {announcement.title}
              </span>
              <span
                className={`admin-tab__status admin-tab__status--${announcement.active ? "active" : "inactive"}`}
              >
                {announcement.active ? "Ativo" : "Inativo"}
              </span>
            </div>
            <p className="admin-tab__body">{announcement.body}</p>
            <div className="admin-tab__actions">
              <Button
                size="sm"
                variant="secondary"
                className="admin-tab__btn"
                onClick={() => startEdit(announcement)}
              >
                Editar
              </Button>
              <Button
                size="sm"
                variant={announcement.active ? "warning" : "success"}
                className="admin-tab__btn"
                onClick={() => handleToggleActive(announcement)}
              >
                {announcement.active ? "Desativar" : "Ativar"}
              </Button>
              <Button
                size="sm"
                variant="danger"
                className="admin-tab__btn"
                onClick={() => handleDelete(announcement.id)}
              >
                Excluir
              </Button>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

export default AdminAnnouncements;
