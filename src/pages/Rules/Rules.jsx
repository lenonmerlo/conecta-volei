// Página de regras oficiais do grupo

import './Rules.css'

const sections = [
  {
    title: 'Inscrições e Prioridade na Lista',
    items: [
      'A lista será aberta toda quinta-feira às 19h.',
      'Membros têm prioridade para colocar o nome na quinta e sexta-feira.',
      'No sábado, os convidados poderão subir para a lista principal, conforme as vagas disponíveis.',
      'A lista principal comporta até 21 jogadores.',
      'Após atingir o limite de 21, será aberta lista de espera, com prioridade para jogadores do grupo (membros fixos) e depois convidados.',
      'Cada pessoa pode colocar no máximo 2 nomes por vez na lista (o seu + 1 colega do grupo).',
      'Não será permitido colocar apenas apelidos na lista. O nome deve ser informado de forma clara. Caso a pessoa queira incluir apelido, deverá colocar após o nome, entre parênteses.',
      'Ao adicionar um convidado na lista, isso deverá ser identificado de forma clara. Exemplo: Fulano - convidado.',
    ],
  },
  {
    title: 'Faltas e Penalidades',
    items: [
      'O prazo máximo para retirar o nome é até 18h de sábado.',
      'Quem retirar o nome após as 18h de sábado perderá a prioridade na semana seguinte e entrará como convidado.',
      'Quem colocar o nome na lista e não comparecer sem aviso prévio ficará bloqueado na lista da semana seguinte.',
      'O membro que ficar 8 domingos consecutivos (aproximadamente 2 meses) sem comparecer poderá ser removido da lista de membros. Caso queira voltar a jogar após esse período, entrará como convidado.',
      'Exceção: A regra de ausências não se aplica em casos de lesão, desde que o grupo seja informado previamente.',
      'Quem repetir faltas frequentes pode perder prioridade na próxima semana, a critério dos administradores.',
    ],
  },
  {
    title: 'Convidados',
    items: [
      'Convidados só podem entrar na lista a partir de sábado, após dois dias de prioridade exclusiva para os membros do grupo.',
      'A presença de convidados está sujeita à autorização dos administradores, dependendo da lotação e equilíbrio dos times.',
      'Cada jogador é responsável pelo comportamento do convidado que trouxer.',
    ],
  },
  {
    title: 'Horário e Pontualidade',
    items: [
      'Vamos respeitar os horários, para não deixar times desfalcados e nem atrapalhar o andamento dos jogos.',
      'Quem chegar atrasado pode ter que esperar a próxima rodada para entrar.',
      'O atraso máximo permitido para chegada será de 30 minutos. Após esse prazo, o jogador poderá perder a vaga na rodada do dia, a critério dos administradores.',
      'Quem precisar ir embora mais cedo também deverá respeitar o limite máximo de 30 minutos antes do encerramento, para não comprometer a organização dos times e das partidas.',
    ],
  },
  {
    title: 'Rodízio Interno e Formação dos Times',
    items: [
      'Todos jogam a mesma partida. O rodízio será feito de forma contínua: quando o jogador que estiver na saída for para o saque, o jogador que estiver fora de quadra entra, e assim o rodízio segue sucessivamente.',
      'Trocas só podem ser feitas entre rodadas, exceto em caso de lesão.',
      'Para manter o equilíbrio, administradores podem ajustar times quando necessário.',
      'Se uma equipe vencer 3 partidas seguidas, ela deve sair da quadra para dar lugar ao time de fora, mesmo que tenha vencido. Assim, evita-se sequência longa de vitórias e mantém o rodízio justo.',
    ],
  },
  {
    title: 'Comportamento e Fair Play',
    items: [
      'Bola no teto ou nos fios: jogo continua desde que não ultrapasse para o lado adversário.',
      'É proibido discutir ou xingar dentro da quadra. Críticas devem ser construtivas.',
      'Todos devem respeitar decisões dos árbitros improvisados (ou do ponto consensual).',
      'É proibido discutir jogadas durante o ponto; resolução só após o final da jogada.',
      'Brincadeiras são bem-vindas, mas sem ofensas pessoais ou provocações excessivas.',
    ],
  },
  {
    title: 'Organização da Quadra e Materiais',
    items: [
      'Todos são responsáveis por montar e recolher a rede quando necessário.',
      'Qualquer dano ao material deve ser comunicado imediatamente aos administradores.',
    ],
  },
]

function Rules() {
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
    </div>
  )
}

export default Rules