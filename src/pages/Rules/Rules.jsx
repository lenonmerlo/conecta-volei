// Página de regras oficiais do grupo

import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../app/AuthContext";
import Button from "../../components/Button/Button";
import "./Rules.css";

const sections = [
  {
    title: "📋 INSCRIÇÕES E PRIORIDADE NA LISTA",
    items: [
      "✅ A lista será aberta toda quinta-feira às 19h.",
      "✅ Membros têm prioridade para colocar o nome na quinta e sexta-feira.",
      "▪️ No sábado, os convidados poderão subir para a lista principal, conforme as vagas disponíveis.",
      "🏐 A lista principal comporta até 21 jogadores.",
      "▪️ Após atingir o limite de 21, será aberta lista de espera, com prioridade para jogadores do grupo (membros fixos) e depois convidados.",
      "▪️ Cada pessoa pode colocar no máximo 2 nomes por vez na lista (o seu + 1 colega do grupo).",
      "❌ Não será permitido colocar apenas apelidos na lista. O nome deve ser informado de forma clara. Caso a pessoa queira incluir apelido, deverá colocar após o nome, entre parênteses.",
      "✅ Ao adicionar um convidado na lista, isso deverá ser identificado de forma clara. Exemplo: Fulano - convidado.",
    ],
  },
  {
    title: "📋 FALTAS, DESISTÊNCIAS E PRIORIDADE",
    items: [
      "▪️ Sempre que possível, retire seu nome da lista até 21h de sábado, para dar tempo de chamar outra pessoa.",
      "▪️ Quem desistir depois das 21h de sábado, mesmo avisando no grupo, receberá uma advertência.",
      "▪️ Quem colocar o nome na lista e não comparecer sem avisar também receberá uma advertência.",
      "⚠️ Emergências e imprevistos serão analisados com bom senso pelos administradores.",
      "🏥 Ausências por lesão, viagem, trabalho, questões familiares ou outros motivos informados previamente não serão consideradas abandono do grupo.",
      "🤝 Caso seja necessário, os administradores poderão conversar com a pessoa antes de aplicar alguma restrição.",
      "📋 Sistema de advertências",
      "🟡 1ª advertência: Advertência.",
      "🟠 2ª advertência: Perda da prioridade na semana seguinte.",
      "🔴 3ª advertência: Suspensão da lista na semana seguinte.",
      "⚠️ Nos casos de falta sem aviso, a situação será avaliada pelos administradores. Dependendo da justificativa, o jogador poderá ser suspenso já na primeira ocorrência.",
      "💙 Nosso objetivo não é punir ninguém, mas manter a organização dos jogos de forma justa para todos. 🏐",
    ],
  },
  {
    title: "📋 CONVIDADOS",
    items: [
      "▪️ Convidados só podem entrar na lista a partir de sábado, após dois dias de prioridade exclusiva para os membros do grupo.",
      "⚠️ A presença de convidados está sujeita à autorização dos administradores, dependendo da lotação e equilíbrio dos times.",
      "🤝 Cada jogador é responsável pelo comportamento do convidado que trouxer.",
    ],
  },
  {
    title: "📋 HORÁRIO E PONTUALIDADE",
    items: [
      "✅ Vamos respeitar os horários, para não deixar times desfalcados e nem atrapalhar o andamento dos jogos.",
      "⚠️ Quem chegar atrasado pode ter que esperar a próxima rodada para entrar.",
      "❌ O atraso máximo permitido para chegada será de 30 minutos. Após esse prazo, o jogador poderá perder a vaga na rodada do dia, a critério dos administradores.",
      "⚠️ Quem precisar ir embora mais cedo também deverá respeitar o limite máximo de 30 minutos antes do encerramento, para não comprometer a organização dos times e das partidas.",
    ],
  },
  {
    title: "📋 RODÍZIO INTERNO E FORMAÇÃO DOS TIMES",
    items: [
      "🏐 Todos jogam a mesma partida. O rodízio será feito de forma contínua: quando o jogador que estiver na saída for para o saque, o jogador que estiver fora de quadra entra, e assim o rodízio segue sucessivamente.",
      "🏥 Trocas só podem ser feitas entre rodadas, exceto em caso de lesão.",
      "⚠️ Para manter o equilíbrio, administradores podem ajustar times quando necessário.",
      "▪️ Se uma equipe vencer 3 partidas seguidas, ela deve sair da quadra para dar lugar ao time de fora, mesmo que tenha vencido. Assim, evita-se sequência longa de vitórias e mantém o rodízio justo.",
    ],
  },
  {
    title: "📋 COMPORTAMENTO E FAIR PLAY",
    items: [
      "🏐 Bola no teto ou nos fios: jogo continua desde que não ultrapasse para o lado adversário.",
      "❌ É proibido discutir ou xingar dentro da quadra. Críticas devem ser construtivas.",
      "✅ Todos devem respeitar decisões dos árbitros improvisados (ou do ponto consensual).",
      "❌ É proibido discutir jogadas durante o ponto; resolução só após o final da jogada.",
      "🤝 Brincadeiras são bem-vindas, mas sem ofensas pessoais ou provocações excessivas.",
    ],
  },
  {
    title: "📋 ORGANIZAÇÃO DA QUADRA E MATERIAIS",
    items: [
      "🤝 Todos são responsáveis por montar e recolher a rede quando necessário.",
      "⚠️ Qualquer dano ao material deve ser comunicado imediatamente aos administradores.",
    ],
  },
];

function Rules() {
  const navigate = useNavigate();
  const { user, pendingRegister, commitRegister } = useAuth();
  const [error, setError] = useState("");

  async function handleAcceptAndFinish() {
    const result = await commitRegister();
    if (!result.success) {
      setError(result.error);
      return;
    }

    setError("");
    navigate("/?registered=1", { replace: true });
  }

  return (
    <div className="rules">
      <div className="rules__hero">
        <h2 className="rules__title">Regras Oficiais</h2>
        <p className="rules__subtitle">Grupo de Vôlei — Conecta Vôlei</p>
      </div>

      <div className="rules__sections">
        {sections.map((section) => (
          <div key={section.title} className="rules__section">
            <h3 className="rules__section-title">{section.title}</h3>
            <ul className="rules__list">
              {section.items.map((item, i) => (
                <li key={i} className="rules__item">
                  {item}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      <p className="rules__footer">CONECTA VÔLEI</p>

      {!user && (
        <div className="rules__actions">
          {pendingRegister ? (
            <>
              <p className="rules__pending">
                Cadastro pendente para {pendingRegister.name}. Ao aceitar as
                regras, seu cadastro será concluído.
              </p>
              {error && <p className="rules__error">{error}</p>}
              <div className="rules__buttons">
                <Button onClick={handleAcceptAndFinish}>
                  Aceito as regras e concluir cadastro
                </Button>
                <Button variant="secondary" onClick={() => navigate("/")}>
                  Voltar ao cadastro
                </Button>
              </div>
            </>
          ) : (
            <div className="rules__buttons">
              <Button variant="secondary" onClick={() => navigate("/")}>
                Voltar
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default Rules;
