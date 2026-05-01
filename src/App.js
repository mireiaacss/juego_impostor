import { useState, useRef, useCallback } from "react";

const FONTS = `@import url('https://fonts.googleapis.com/css2?family=Nunito:wght@600;700;800;900&display=swap');`;

const CSS = `
  ${FONTS}
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; font-family: 'Nunito', sans-serif; }
  body { 
    background: linear-gradient(-45deg, #3b82f6, #8b5cf6, #ec4899, #f59e0b);
    background-size: 400% 400%;
    animation: gradientBG 15s ease infinite;
    color: #334155; 
  }

  @keyframes gradientBG {
    0% { background-position: 0% 50%; }
    50% { background-position: 100% 50%; }
    100% { background-position: 0% 50%; }
  }

  @keyframes fadeUp { from{opacity:0;transform:translateY(20px)} to{opacity:1;transform:translateY(0)} }
  @keyframes popIn { from{opacity:0;transform:scale(0.8)} to{opacity:1;transform:scale(1)} }
  @keyframes bounceIn { 0%{opacity:0;transform:scale(0.5)} 60%{transform:scale(1.15)} 80%{transform:scale(0.95)} 100%{opacity:1;transform:scale(1)} }

  input, textarea { outline: none; }
  button { cursor: pointer; border: none; transition: transform 0.1s; }
  button:active { transform: scale(0.95); }
`;

const DEFAULT_QUESTIONS = [
  {
    normal: "Cuantas veces sales de fiesta al mes?",
    impostor: "Cuantos paises has visitado?",
  },
];

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// Escoge impostores con probabilidad basada en cuántas veces lo han sido
function assignRoles(players, numImpostors, pool, impostorHistory) {
  const picked = pool[Math.floor(Math.random() * pool.length)];

  let availablePlayers = [...players];
  let chosenImpostors = [];

  for (let i = 0; i < numImpostors; i++) {
    // Calculamos el peso: cuantas más veces haya sido, menor el peso (probabilidad)
    const weights = availablePlayers.map(
      (p) => 1 / ((impostorHistory[p] || 0) + 1.5)
    ); // +1.5 para que no baje a cero absoluto tan rápido
    const totalWeight = weights.reduce((a, b) => a + b, 0);

    let rand = Math.random() * totalWeight;
    let selectedIdx = 0;
    for (let j = 0; j < weights.length; j++) {
      rand -= weights[j];
      if (rand <= 0) {
        selectedIdx = j;
        break;
      }
    }
    chosenImpostors.push(availablePlayers[selectedIdx]);
    availablePlayers.splice(selectedIdx, 1);
  }

  const assigned = players.map((name) => ({
    name,
    isImpostor: chosenImpostors.includes(name),
    question: chosenImpostors.includes(name) ? picked.impostor : picked.normal,
    normalQuestion: picked.normal,
    impostorQuestion: picked.impostor,
  }));

  return {
    assigned: shuffle(assigned),
    usedQuestion: picked,
    newImpostors: chosenImpostors,
  };
}

const SCREEN_BASE = {
  minHeight: "100vh",
  display: "flex",
  flexDirection: "column",
};
const INNER = {
  position: "relative",
  zIndex: 10,
  display: "flex",
  flexDirection: "column",
  flex: 1,
  padding: "40px 20px 32px",
  maxWidth: 440,
  margin: "0 auto",
  width: "100%",
};

const cardStyle = (extra = {}) => ({
  background: "rgba(255, 255, 255, 0.95)",
  backdropFilter: "blur(10px)",
  borderRadius: 20,
  padding: "20px",
  boxShadow: "0 8px 32px rgba(0,0,0,0.1)",
  color: "#334155",
  ...extra,
});

const btnPrimary = (extra = {}) => ({
  background: "#1e293b",
  color: "#ffffff",
  borderRadius: 16,
  padding: "18px 0",
  width: "100%",
  fontSize: 18,
  fontWeight: 800,
  boxShadow: "0 6px 0px rgba(0,0,0,0.3)",
  marginTop: "auto",
  ...extra,
});

// ── SETUP ─────────────────────────────────────────────────────────────────────
function SetupScreen({ initialPlayers, initialQuestions, usedCount, onStart }) {
  const [players, setPlayers] = useState(initialPlayers);
  const [newName, setNewName] = useState("");
  const [impostors, setImpostors] = useState(1);
  const [questions, setQuestions] = useState(initialQuestions);
  const [bulkText, setBulkText] = useState("");
  const [tab, setTab] = useState("players");

  const addPlayer = () => {
    const n = newName.trim();
    if (n && !players.includes(n)) {
      setPlayers([...players, n]);
      setNewName("");
    }
  };

  const handleBulkAdd = () => {
    if (!bulkText.trim()) return;
    const parsed = bulkText
      .split("\n")
      .map((line) => {
        const parts = line.split(",");
        if (parts.length >= 2)
          return { normal: parts[0].trim(), impostor: parts[1].trim() };
        return null;
      })
      .filter(Boolean);

    if (parsed.length) {
      setQuestions([...questions, ...parsed]);
      setBulkText("");
    }
  };

  const maxImpostors = Math.max(1, players.length - 1);
  const canStart =
    players.length >= 2 && impostors < players.length && questions.length > 0;
  const remaining = questions.length - usedCount;

  return (
    <div style={SCREEN_BASE}>
      <style>{CSS}</style>
      <div style={INNER}>
        <div
          style={{
            textAlign: "center",
            marginBottom: 24,
            color: "white",
            animation: "bounceIn 0.5s",
          }}
        >
          <div style={{ fontSize: 56, marginBottom: 4 }}>🕵️</div>
          <h1
            style={{
              fontSize: 38,
              fontWeight: 900,
              textShadow: "0 4px 12px rgba(0,0,0,0.2)",
            }}
          >
            Impostor
          </h1>
          <div
            style={{
              marginTop: 4,
              fontSize: 15,
              fontWeight: 800,
              opacity: 0.9,
            }}
          ></div>
        </div>

        <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
          {[
            ["players", "👥 Jugadores"],
            ["questions", "❓ Preguntas"],
          ].map(([k, l]) => (
            <button
              key={k}
              onClick={() => setTab(k)}
              style={{
                flex: 1,
                padding: "14px 0",
                borderRadius: 16,
                fontWeight: 800,
                fontSize: 15,
                background: tab === k ? "#ffffff" : "rgba(255,255,255,0.2)",
                color: tab === k ? "#334155" : "white",
                boxShadow: tab === k ? "0 4px 12px rgba(0,0,0,0.1)" : "none",
              }}
            >
              {l}
            </button>
          ))}
        </div>

        {tab === "players" && (
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: 12,
              animation: "fadeUp 0.2s ease",
            }}
          >
            <div style={{ display: "flex", gap: 8 }}>
              <input
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && addPlayer()}
                placeholder="Añadir jugador..."
                style={{
                  flex: 1,
                  padding: "16px",
                  borderRadius: 16,
                  border: "none",
                  fontSize: 16,
                  fontWeight: 700,
                  boxShadow: "0 4px 12px rgba(0,0,0,0.05)",
                }}
              />
              <button
                onClick={addPlayer}
                style={{
                  padding: "0 24px",
                  borderRadius: 16,
                  background: "#10b981",
                  color: "white",
                  fontSize: 24,
                  fontWeight: 900,
                  boxShadow: "0 4px 0px #059669",
                }}
              >
                +
              </button>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {players.map((p, i) => (
                <div
                  key={i}
                  style={{
                    ...cardStyle({ padding: "14px 18px", borderRadius: 16 }),
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                  }}
                >
                  <span style={{ fontWeight: 800, fontSize: 16 }}>{p}</span>
                  <button
                    onClick={() =>
                      setPlayers(players.filter((_, idx) => idx !== i))
                    }
                    style={{
                      background: "none",
                      color: "#ef4444",
                      fontWeight: 900,
                      fontSize: 16,
                    }}
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>

            <div
              style={{
                ...cardStyle({
                  marginTop: 8,
                  background: "rgba(255,255,255,0.9)",
                }),
              }}
            >
              <div
                style={{
                  fontSize: 15,
                  fontWeight: 800,
                  marginBottom: 12,
                  textAlign: "center",
                }}
              >
                ¿Cuántos impostores hay?
              </div>
              <div style={{ display: "flex", gap: 8 }}>
                {Array.from(
                  { length: Math.min(5, maxImpostors) },
                  (_, i) => i + 1
                ).map((n) => (
                  <button
                    key={n}
                    onClick={() => setImpostors(n)}
                    style={{
                      flex: 1,
                      padding: "14px 0",
                      borderRadius: 12,
                      fontWeight: 900,
                      fontSize: 20,
                      background: impostors === n ? "#ef4444" : "#e2e8f0",
                      color: impostors === n ? "white" : "#64748b",
                      boxShadow: impostors === n ? "0 4px 0px #b91c1c" : "none",
                    }}
                  >
                    {n}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {tab === "questions" && (
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: 10,
              animation: "fadeUp 0.2s ease",
            }}
          >
            <div style={{ ...cardStyle({ padding: "16px" }) }}>
              <div style={{ fontSize: 14, fontWeight: 800, marginBottom: 8 }}>
                Copiar y pegar (Normal, Impostora)
              </div>
              <textarea
                value={bulkText}
                onChange={(e) => setBulkText(e.target.value)}
                placeholder="Normal 1, Impostora 1&#10;Normal 2, Impostora 2..."
                style={{
                  width: "100%",
                  height: 100,
                  padding: "12px",
                  borderRadius: 12,
                  border: "2px dashed #cbd5e1",
                  resize: "none",
                  fontFamily: "inherit",
                  fontSize: 14,
                }}
              />
              <button
                onClick={handleBulkAdd}
                style={{
                  ...btnPrimary({
                    padding: "12px 0",
                    marginTop: 12,
                    background: "#8b5cf6",
                    boxShadow: "0 4px 0px #6d28d9",
                  }),
                }}
              >
                Añadir texto
              </button>
            </div>

            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: 8,
                marginTop: 8,
              }}
            >
              {questions.map((q, i) => (
                <div
                  key={i}
                  style={{
                    ...cardStyle({ padding: "14px", borderRadius: 16 }),
                    position: "relative",
                  }}
                >
                  <button
                    onClick={() =>
                      setQuestions(questions.filter((_, idx) => idx !== i))
                    }
                    style={{
                      position: "absolute",
                      top: 14,
                      right: 14,
                      background: "none",
                      color: "#ef4444",
                      fontWeight: 900,
                    }}
                  >
                    ✕
                  </button>
                  <div
                    style={{
                      fontSize: 11,
                      fontWeight: 800,
                      color: "#10b981",
                      textTransform: "uppercase",
                    }}
                  >
                    Normal
                  </div>
                  <div
                    style={{ fontSize: 15, fontWeight: 700, marginBottom: 8 }}
                  >
                    {q.normal}
                  </div>
                  <div
                    style={{
                      fontSize: 11,
                      fontWeight: 800,
                      color: "#ef4444",
                      textTransform: "uppercase",
                    }}
                  >
                    Impostora
                  </div>
                  <div style={{ fontSize: 15, fontWeight: 700 }}>
                    {q.impostor}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        <div style={{ marginTop: "auto", paddingTop: 28 }}>
          <button
            onClick={() => canStart && onStart(players, impostors, questions)}
            disabled={!canStart}
            style={{
              ...btnPrimary({
                padding: "22px 0",
                fontSize: 22,
                background: "white",
                color: "#1e293b",
                boxShadow: "0 6px 0px rgba(0,0,0,0.2)",
              }),
              opacity: canStart ? 1 : 0.6,
            }}
          >
            {canStart ? "¡EMPEZAR PARTIDA! 🚀" : "Faltan jugadores/preguntas"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── PASS PHONE ─────────────────────────────────────────────────────────────────
function PassScreen({ player, total, current, onReady }) {
  return (
    <div style={SCREEN_BASE}>
      <style>{CSS}</style>
      <div
        style={{
          position: "fixed",
          top: 24,
          left: 0,
          width: "100%",
          display: "flex",
          justifyContent: "center",
          gap: 8,
        }}
      >
        {Array.from({ length: total }, (_, i) => (
          <div
            key={i}
            style={{
              width: i === current ? 24 : 10,
              height: 10,
              borderRadius: 5,
              background: i <= current ? "white" : "rgba(255,255,255,0.3)",
              transition: "all 0.3s",
            }}
          />
        ))}
      </div>

      <div
        style={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          padding: "32px 24px",
          gap: 24,
        }}
      >
        <div style={{ fontSize: 90, animation: "bounceIn 0.5s ease" }}>📱</div>
        <div style={{ textAlign: "center", color: "white" }}>
          <div
            style={{
              fontSize: 18,
              fontWeight: 800,
              opacity: 0.9,
              textTransform: "uppercase",
              letterSpacing: 2,
            }}
          >
            Turno de
          </div>
          <div
            style={{
              fontSize: 56,
              fontWeight: 900,
              textShadow: "0 4px 12px rgba(0,0,0,0.2)",
            }}
          >
            {player.name}
          </div>
        </div>

        <div
          style={{
            ...cardStyle({
              maxWidth: 320,
              textAlign: "center",
              padding: "24px",
            }),
          }}
        >
          <span style={{ fontSize: 18, fontWeight: 700 }}>
            Pásale el móvil a <strong>{player.name}</strong> sin que nadie mire
            👀
          </span>
        </div>

        <button
          onClick={onReady}
          style={{
            ...btnPrimary({
              background: "#f59e0b",
              boxShadow: "0 6px 0px #d97706",
              maxWidth: 320,
              marginTop: 24,
              padding: "20px 0",
            }),
          }}
        >
          Soy {player.name} ✋
        </button>
      </div>
    </div>
  );
}

// ── REVEAL QUESTION ─────────────────────────────────────────────────────────────
function RevealScreen({ player, onDone }) {
  const [revealed, setRevealed] = useState(false);

  return (
    <div style={SCREEN_BASE}>
      <style>{CSS}</style>
      <div
        style={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          padding: "32px 24px",
          gap: 24,
        }}
      >
        <div style={{ textAlign: "center", color: "white" }}>
          <div
            style={{
              fontSize: 16,
              fontWeight: 800,
              opacity: 0.9,
              textTransform: "uppercase",
            }}
          >
            Pregunta de
          </div>
          <div style={{ fontSize: 42, fontWeight: 900 }}>{player.name}</div>
        </div>

        {!revealed ? (
          <div
            onClick={() => setRevealed(true)}
            style={{
              ...cardStyle({
                cursor: "pointer",
                border: "4px dashed rgba(255,255,255,0.8)",
                background: "rgba(255,255,255,0.2)",
                backdropFilter: "blur(12px)",
                color: "white",
                maxWidth: 340,
                width: "100%",
                textAlign: "center",
                padding: "50px 20px",
              }),
            }}
          >
            <div style={{ fontSize: 64, animation: "bounceIn 1s infinite" }}>
              🤫
            </div>
            <div style={{ marginTop: 16, fontSize: 22, fontWeight: 900 }}>
              Toca para leer
            </div>
            <div
              style={{
                fontSize: 16,
                fontWeight: 700,
                opacity: 0.8,
                marginTop: 8,
              }}
            >
              Que nadie más mire la pantalla
            </div>
          </div>
        ) : (
          <>
            <div
              style={{
                ...cardStyle({
                  maxWidth: 340,
                  width: "100%",
                  textAlign: "center",
                  padding: "40px 24px",
                  animation: "popIn 0.3s ease",
                }),
              }}
            >
              <div style={{ fontSize: 48, marginBottom: 20 }}>❓</div>
              <div style={{ fontWeight: 800, fontSize: 24, lineHeight: 1.4 }}>
                {player.question}
              </div>
            </div>
            <div
              style={{
                fontSize: 16,
                fontWeight: 800,
                color: "white",
                textAlign: "center",
                opacity: 0.9,
                textShadow: "0 2px 4px rgba(0,0,0,0.2)",
              }}
            >
              Memorízala y responde cuando te toque
            </div>
            <button
              onClick={onDone}
              style={{
                ...btnPrimary({
                  maxWidth: 340,
                  marginTop: 16,
                  padding: "20px 0",
                }),
              }}
            >
              Ya lo he leído ✅
            </button>
          </>
        )}
      </div>
    </div>
  );
}

// ── BIG REVEAL ──────────────────────────────────────────────────────────────────
function BigRevealScreen({ players, onNextRound, onRestart }) {
  const [phase, setPhase] = useState("debate");
  const impostors = players.filter((p) => p.isImpostor);
  const normals = players.filter((p) => !p.isImpostor);

  return (
    <div style={SCREEN_BASE}>
      <style>{CSS}</style>
      <div
        style={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          padding: "32px 24px",
          gap: 20,
          maxWidth: 440,
          margin: "0 auto",
          width: "100%",
        }}
      >
        {phase === "debate" && (
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 24,
              width: "100%",
              animation: "fadeUp 0.3s ease",
            }}
          >
            <div style={{ fontSize: 80 }}>🕵️‍♀️</div>
            <div style={{ textAlign: "center", color: "white" }}>
              <div
                style={{
                  fontSize: 36,
                  fontWeight: 900,
                  lineHeight: 1.2,
                  textShadow: "0 4px 12px rgba(0,0,0,0.2)",
                }}
              >
                ¡Todos han leído!
              </div>
              <div
                style={{ marginTop: 16, fontSize: 20, fontWeight: 800 }}
              ></div>
            </div>
            <button
              onClick={() => setPhase("question")}
              style={{
                ...btnPrimary({
                  background: "#f59e0b",
                  boxShadow: "0 6px 0px #d97706",
                  marginTop: 32,
                  padding: "22px 0",
                }),
              }}
            >
              VER LA PREGUNTA REAL
            </button>
          </div>
        )}

        {phase === "question" && (
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 20,
              width: "100%",
              animation: "popIn 0.3s ease",
            }}
          >
            <div style={{ textAlign: "center", color: "white" }}>
              <div
                style={{
                  fontSize: 16,
                  fontWeight: 800,
                  textTransform: "uppercase",
                  opacity: 0.9,
                }}
              >
                La pregunta real es...
              </div>
            </div>

            <div
              style={{
                ...cardStyle({
                  width: "100%",
                  textAlign: "center",
                  padding: "40px 24px",
                  border: "4px solid #10b981",
                }),
              }}
            >
              <div style={{ fontSize: 48, marginBottom: 16 }}>✅</div>
              <div style={{ fontWeight: 900, fontSize: 24, lineHeight: 1.4 }}>
                {normals[0]?.normalQuestion}
              </div>
            </div>

            <button
              onClick={() => setPhase("impostors")}
              style={{
                ...btnPrimary({
                  background: "#ef4444",
                  boxShadow: "0 6px 0px #b91c1c",
                  marginTop: 24,
                  padding: "22px 0",
                }),
              }}
            >
              ¿QUIÉN ERA EL IMPOSTOR? 👀
            </button>
          </div>
        )}

        {phase === "impostors" && (
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 16,
              width: "100%",
              animation: "popIn 0.3s ease",
            }}
          >
            <div style={{ fontSize: 72, animation: "bounceIn 0.5s ease" }}>
              🎭
            </div>
            <div
              style={{
                fontSize: 36,
                fontWeight: 900,
                color: "white",
                textAlign: "center",
                textShadow: "0 4px 12px rgba(0,0,0,0.2)",
              }}
            >
              {impostors.length > 1 ? "¡LOS IMPOSTORES!" : "¡EL IMPOSTOR!"}
            </div>

            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: 12,
                width: "100%",
              }}
            >
              {impostors.map((p, i) => (
                <div
                  key={i}
                  style={{
                    ...cardStyle({
                      background: "#fee2e2",
                      border: "3px solid #ef4444",
                      textAlign: "center",
                      padding: "20px",
                    }),
                  }}
                >
                  <div
                    style={{ fontSize: 32, fontWeight: 900, color: "#b91c1c" }}
                  >
                    {p.name}
                  </div>
                </div>
              ))}

              <div
                style={{
                  ...cardStyle({ background: "#fff1f2", textAlign: "center" }),
                }}
              >
                <div
                  style={{
                    fontSize: 15,
                    fontWeight: 900,
                    color: "#be123c",
                    marginBottom: 10,
                  }}
                >
                  🕵️ La pregunta secreta que tenían:
                </div>
                <div
                  style={{
                    fontSize: 20,
                    fontWeight: 800,
                    color: "#881337",
                    fontStyle: "italic",
                  }}
                >
                  "{impostors[0]?.impostorQuestion}"
                </div>
              </div>
            </div>

            <div
              style={{
                ...cardStyle({ width: "100%", marginTop: 8 }),
                padding: "20px",
              }}
            >
              <div
                style={{
                  fontSize: 15,
                  fontWeight: 900,
                  color: "#10b981",
                  marginBottom: 12,
                }}
              >
                Inocentes:
              </div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                {normals.map((p, i) => (
                  <span
                    key={i}
                    style={{
                      padding: "8px 16px",
                      borderRadius: 12,
                      background: "#d1fae5",
                      color: "#047857",
                      fontWeight: 900,
                      fontSize: 15,
                    }}
                  >
                    {p.name}
                  </span>
                ))}
              </div>
            </div>

            <div
              style={{ display: "flex", gap: 12, width: "100%", marginTop: 24 }}
            >
              <button
                onClick={onNextRound}
                style={{
                  ...btnPrimary({
                    flex: 1,
                    background: "white",
                    color: "#1e293b",
                    boxShadow: "0 6px 0px rgba(0,0,0,0.2)",
                  }),
                }}
              >
                🔄 Otra ronda
              </button>
              <button
                onClick={onRestart}
                style={{
                  padding: "0 24px",
                  borderRadius: 16,
                  background: "rgba(0,0,0,0.3)",
                  color: "white",
                  fontWeight: 800,
                }}
              >
                ⚙️ Setup
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default function App() {
  const [screen, setScreen] = useState("setup");
  const [players, setPlayers] = useState(["Mireia", "Emma", "Maria"]);
  const [allQuestions, setAllQuestions] = useState(DEFAULT_QUESTIONS);
  const [usedQuestions, setUsedQuestions] = useState([]);
  const [assigned, setAssigned] = useState([]);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [subScreen, setSubScreen] = useState("pass");

  // Guardamos cuántas veces ha sido impostor cada uno
  const [impostorCounts, setImpostorCounts] = useState({});
  const [numImps, setNumImps] = useState(1);

  const startRound = useCallback(
    (
      currentPlayers,
      impostorsAmount,
      currentQs,
      currentUsed,
      currentCounts
    ) => {
      const available = currentQs.filter(
        (q) => !currentUsed.some((u) => u.normal === q.normal)
      );

      // Si no quedan preguntas, avisamos y volvemos al inicio
      if (available.length === 0) {
        alert(
          "¡Os habéis quedado sin preguntas! Volviendo al inicio para añadir más o reiniciar la lista."
        );
        setScreen("setup");
        return;
      }

      const {
        assigned: a,
        usedQuestion,
        newImpostors,
      } = assignRoles(
        currentPlayers,
        impostorsAmount,
        available,
        currentCounts
      );

      setUsedQuestions([...currentUsed, usedQuestion]);

      // Actualizamos el contador de impostores
      const newCounts = { ...currentCounts };
      newImpostors.forEach((imp) => {
        newCounts[imp] = (newCounts[imp] || 0) + 1;
      });
      setImpostorCounts(newCounts);

      setAssigned(a);
      setCurrentIdx(0);
      setSubScreen("pass");
      setScreen("game");
    },
    []
  );

  const handleStart = (newPlayers, numImpostors, newQs) => {
    setPlayers(newPlayers);
    setAllQuestions(newQs);
    setNumImps(numImpostors);
    startRound(newPlayers, numImpostors, newQs, usedQuestions, impostorCounts);
  };

  const handleNextRound = () => {
    startRound(players, numImps, allQuestions, usedQuestions, impostorCounts);
  };

  const handleRestart = () => {
    setUsedQuestions([]);
    setImpostorCounts({});
    setScreen("setup");
  };

  const handleDone = () => {
    if (currentIdx + 1 >= assigned.length) {
      setScreen("bigReveal");
    } else {
      setCurrentIdx((i) => i + 1);
      setSubScreen("pass");
    }
  };

  if (screen === "setup")
    return (
      <SetupScreen
        initialPlayers={players}
        initialQuestions={allQuestions}
        usedCount={usedQuestions.length}
        onStart={handleStart}
      />
    );
  if (screen === "bigReveal")
    return (
      <BigRevealScreen
        players={assigned}
        onNextRound={handleNextRound}
        onRestart={handleRestart}
      />
    );

  const player = assigned[currentIdx];
  return (
    <div>
      <style>{CSS}</style>
      <div
        style={{
          position: "fixed",
          top: 16,
          right: 16,
          zIndex: 50,
          padding: "8px 16px",
          borderRadius: 16,
          fontSize: 15,
          fontWeight: 900,
          background: "rgba(0,0,0,0.3)",
          backdropFilter: "blur(5px)",
          color: "white",
        }}
      >
        {currentIdx + 1}/{assigned.length}
      </div>
      {subScreen === "pass" ? (
        <PassScreen
          player={player}
          total={assigned.length}
          current={currentIdx}
          onReady={() => setSubScreen("reveal")}
        />
      ) : (
        <RevealScreen player={player} onDone={handleDone} />
      )}
    </div>
  );
}
