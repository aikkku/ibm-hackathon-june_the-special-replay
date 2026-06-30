export const RULES = [
  {
    id: "offside",
    icon: "🚩",
    color: "#c0392b",
    title: "Offside",
    short: "Why a perfectly good pass can suddenly get a player flagged.",
    explanation: [
      "An attacking player is in an offside position if they are nearer to the opponent's goal line than both the ball AND the second-last opponent (usually the last defender, since the goalkeeper is normally last) at the moment the ball is played to them.",
      "Being in an offside position is not an offence by itself — the referee only penalises a player if they actively take part in the play, for example by receiving the ball, interfering with an opponent, or gaining an advantage.",
      "A player level with the second-last defender is considered ONSIDE, not offside — ties always favour the attacker.",
      "Try it yourself below: drag the attacker left and right and see how the offside line changes the verdict.",
    ],
    animation: { type: "interactive" },
    quiz: [
      {
        question: "An attacker is exactly level with the last defender when the ball is played. Is this offside?",
        options: ["Yes, always offside", "No, level is onside", "Only if the goalkeeper says so", "Depends on the referee's mood"],
        correct: 1,
        explanation: "Ties go to the attacker. Being level with the defender means the attacker is onside.",
      },
      {
        question: "A player is in an offside position but never touches the ball or interferes with play. What happens?",
        options: ["Automatic yellow card", "Free kick to the defending team", "Nothing — offside position alone isn't an offence", "Goal disallowed automatically"],
        correct: 2,
        explanation: "Simply standing in an offside position is not punished. The player must become involved in active play to be penalised.",
      },
      {
        question: "Can a player be offside directly from a throw-in?",
        options: ["Yes", "No"],
        correct: 1,
        explanation: "There is no offside offence from a throw-in, corner kick, or goal kick — only from open play and other restarts like free kicks.",
      },
    ],
  },

  {
    id: "fouls",
    icon: "🟥",
    color: "#922b21",
    title: "Fouls",
    short: "Tackles, trips, and pushes — what counts as unfair play.",
    explanation: [
      "A foul happens when a player breaks the rules in a way that's careless, reckless, or uses excessive force against an opponent — for example kicking, tripping, pushing, or charging into them.",
      "Fouls are only given for offences against an opponent; rough but fair challenges for the ball are usually allowed.",
      "The punishment depends on severity: a free kick for a careless foul, a yellow card for a reckless one, and a red card for excessive force or if it denies an obvious goal-scoring chance.",
      "If a foul happens inside the defender's own penalty area, it results in a penalty kick instead of a normal free kick.",
    ],
    animation: {
      type: "sequence",
      players: [
        { id: "a1", team: "home", label: "9", x: 30, y: 32 },
        { id: "d1", team: "away", label: "4", x: 45, y: 36 },
        { id: "ref", team: "ref", label: "R", x: 50, y: 10 },
        { id: "ball", team: "ball", label: "", x: 30, y: 32 },
      ],
      steps: [
        { caption: "The attacker (red) dribbles forward with the ball.", duration: 1600, positions: { a1: [38, 32], ball: [38, 32], d1: [48, 35], ref: [50, 12] } },
        { caption: "The defender (blue) lunges in late and catches the attacker, not the ball.", duration: 1800, positions: { a1: [46, 32], ball: [46, 32], d1: [46, 32], ref: [48, 18] } },
        { caption: "Whistle! The referee stops play and awards a free kick for the foul.", duration: 1800, positions: { a1: [46, 32], ball: [46, 32], d1: [44, 38], ref: [46, 26] } },
      ],
    },
    quiz: [
      {
        question: "A defender slides in, misses the ball completely, and knocks the attacker over. What's the most likely outcome?",
        options: ["Play continues, no foul", "Free kick (or penalty if inside the box) for the attacking team", "Automatic red card every time", "Goal kick"],
        correct: 1,
        explanation: "Mistimed challenges that make contact with the player instead of the ball are usually fouls, punished with a free kick or penalty.",
      },
      {
        question: "Where does a foul committed by the defending team inside their own penalty area lead to?",
        options: ["A corner kick", "A throw-in", "A penalty kick", "A goal kick"],
        correct: 2,
        explanation: "Fouls by the defending side inside their own penalty area are punished with a penalty kick.",
      },
    ],
  },

  {
    id: "free-kicks",
    icon: "🎯",
    color: "#1a6fa8",
    title: "Free Kicks",
    short: "A free shot at restarting play after a foul.",
    explanation: [
      "A free kick is awarded to a team after the opponent commits a foul or certain other infringements, like handball.",
      "There are two kinds: a DIRECT free kick can be shot straight into the goal, while an INDIRECT free kick must touch another player before it can count as a goal.",
      "Opposing players must stand at least 9.15 metres (10 yards) away from the ball until it's kicked — this is why you see a 'wall' of defenders.",
      "The kick can be played short to a teammate or struck directly at goal, depending on the situation.",
    ],
    animation: {
      type: "sequence",
      players: [
        { id: "a1", team: "home", label: "9", x: 22, y: 32 },
        { id: "d1", team: "away", label: "4", x: 32, y: 28 },
        { id: "d2", team: "away", label: "5", x: 32, y: 32 },
        { id: "d3", team: "away", label: "6", x: 32, y: 36 },
        { id: "ball", team: "ball", label: "", x: 22, y: 32 },
      ],
      steps: [
        { caption: "Free kick awarded. Defenders form a wall 9.15m from the ball.", duration: 1600, positions: { d1: [32, 28], d2: [32, 32], d3: [32, 36] } },
        { caption: "The kicker curls a shot up and over the wall.", duration: 1700, positions: { ball: [70, 18], a1: [22, 32] } },
        { caption: "The ball dips back down into the corner of the goal — what a strike!", duration: 1500, positions: { ball: [92, 14] } },
      ],
    },
    quiz: [
      {
        question: "How far must opponents stand from the ball at a free kick?",
        options: ["1 metre", "5 metres", "9.15 metres", "20 metres"],
        correct: 2,
        explanation: "Defenders must retreat at least 9.15 metres (10 yards) from the ball, forming the familiar defensive 'wall'.",
      },
      {
        question: "Can a goal be scored directly from an indirect free kick?",
        options: ["Yes, straight in", "No, the ball must touch another player first", "Only in extra time", "Only if it's a header"],
        correct: 1,
        explanation: "That's exactly why it's called 'indirect' — another player (teammate or opponent) must touch the ball before it enters the goal.",
      },
    ],
  },

  {
    id: "penalty-kicks",
    icon: "🥅",
    color: "#6c3483",
    title: "Penalty Kicks",
    short: "One-on-one with the keeper, 11 metres from goal.",
    explanation: [
      "A penalty kick is awarded when the defending team commits a foul or handball inside their own penalty area.",
      "The ball is placed on the penalty spot, exactly 11 metres (12 yards) from the goal line.",
      "Only the kicker and the goalkeeper take part — every other player must stay outside the penalty area and arc until the ball is kicked.",
      "The goalkeeper must keep at least part of one foot on (or in line with) the goal line until the ball is struck.",
    ],
    animation: {
      type: "sequence",
      players: [
        { id: "a1", team: "home", label: "9", x: 78, y: 32 },
        { id: "gk", team: "away", label: "GK", x: 96, y: 32 },
        { id: "ball", team: "ball", label: "", x: 78, y: 32 },
      ],
      steps: [
        { caption: "The ball is placed on the penalty spot, 11 metres from goal.", duration: 1500, positions: { ball: [78, 32], a1: [70, 32] } },
        { caption: "The goalkeeper stays on the line, watching closely.", duration: 1300, positions: { gk: [96, 32] } },
        { caption: "The kicker strikes low into the corner... the keeper dives but it's in!", duration: 1700, positions: { ball: [98, 22], gk: [96, 24], a1: [80, 32] } },
      ],
    },
    quiz: [
      {
        question: "How far is the penalty spot from the goal line?",
        options: ["6 metres", "9.15 metres", "11 metres", "18 metres"],
        correct: 2,
        explanation: "The penalty spot sits exactly 11 metres (12 yards) from the goal line.",
      },
      {
        question: "Where must the goalkeeper's feet be when the penalty is struck?",
        options: ["Anywhere in the goal area", "At least one foot on or in line with the goal line", "Outside the penalty area", "Sitting down"],
        correct: 1,
        explanation: "The goalkeeper must have at least part of one foot on, or in line with, the goal line at the moment of the kick.",
      },
    ],
  },

  {
    id: "throw-ins",
    icon: "🤾",
    color: "#1e8449",
    title: "Throw-ins",
    short: "Getting the ball back into play after it leaves the side.",
    explanation: [
      "A throw-in restarts play when the whole ball crosses the touchline (the side boundary of the pitch), whether on the ground or in the air.",
      "It's awarded to the team that did NOT touch the ball last before it went out.",
      "The thrower must face the pitch, keep both feet on or behind the touchline, and use both hands to throw the ball from behind and over their head.",
      "A player cannot be offside directly from a throw-in.",
    ],
    animation: {
      type: "sequence",
      players: [
        { id: "a1", team: "home", label: "7", x: 4, y: 5 },
        { id: "d1", team: "away", label: "3", x: 14, y: 30 },
        { id: "ball", team: "ball", label: "", x: 2, y: 30 },
      ],
      steps: [
        { caption: "The ball rolls fully over the touchline — out of play.", duration: 1400, positions: { ball: [1, 32] } },
        { caption: "The player lines up with both feet behind the line, ball held with both hands behind the head.", duration: 1600, positions: { a1: [3, 32], ball: [3, 6] } },
        { caption: "A two-handed throw delivers the ball back into play.", duration: 1500, positions: { ball: [18, 30] } },
      ],
    },
    quiz: [
      {
        question: "Which team takes the throw-in?",
        options: ["Whoever gets there first", "The team that touched the ball last before it went out", "The team that did NOT touch it last", "Always the home team"],
        correct: 2,
        explanation: "The throw-in is awarded to the opponents of the player who last touched the ball before it left the pitch.",
      },
      {
        question: "Can a player be called offside straight from a throw-in?",
        options: ["Yes", "No"],
        correct: 1,
        explanation: "Offside cannot be given directly from a throw-in, just like with corner kicks and goal kicks.",
      },
    ],
  },

  {
    id: "goal-kicks",
    icon: "🥾",
    color: "#117a65",
    title: "Goal Kicks",
    short: "Restarting play after the ball goes out at the attacking end.",
    explanation: [
      "A goal kick is awarded to the defending team when the ball fully crosses the goal line (outside the goal) after last touching an attacker.",
      "The ball is placed anywhere inside the goal area and kicked back into play.",
      "Opponents must stay outside the penalty area until the ball is kicked and clearly moving.",
      "Unlike in the past, the goalkeeper no longer needs to kick it out of the penalty area before teammates can touch it.",
    ],
    animation: {
      type: "sequence",
      players: [
        { id: "gk", team: "away", label: "GK", x: 8, y: 32 },
        { id: "a1", team: "home", label: "9", x: 25, y: 20 },
        { id: "ball", team: "ball", label: "", x: 2, y: 32 },
      ],
      steps: [
        { caption: "The attacker's shot goes wide — the ball crosses the goal line.", duration: 1400, positions: { ball: [-1, 14] } },
        { caption: "Goal kick! The goalkeeper places the ball in the goal area.", duration: 1500, positions: { ball: [6, 38], gk: [6, 38] } },
        { caption: "A long kick down the pitch restarts the attack.", duration: 1600, positions: { ball: [55, 22] } },
      ],
    },
    quiz: [
      {
        question: "When is a goal kick awarded?",
        options: ["When the ball crosses the goal line after touching a defender last", "When the ball crosses the goal line after touching an attacker last", "After every goal", "When a player is offside"],
        correct: 1,
        explanation: "If the attacking team is the last to touch the ball before it leaves the pitch over the goal line, the defenders get a goal kick.",
      },
    ],
  },

  {
    id: "corner-kicks",
    icon: "🚩",
    color: "#d35400",
    title: "Corner Kicks",
    short: "A great attacking chance from the corner of the pitch.",
    explanation: [
      "A corner kick is awarded to the attacking team when the ball fully crosses the goal line after last touching a defending player (including the goalkeeper).",
      "The ball is placed inside the corner arc nearest to where it went out and kicked back into play.",
      "Opponents must stay at least 9.15 metres away until the ball is in play, just like a free kick.",
      "Corners are a major goal-scoring opportunity, often delivered as a cross into the penalty area.",
    ],
    animation: {
      type: "sequence",
      players: [
        { id: "d1", team: "away", label: "5", x: 14, y: 10 },
        { id: "a1", team: "home", label: "9", x: 86, y: 64 },
        { id: "a2", team: "home", label: "10", x: 88, y: 26 },
        { id: "ball", team: "ball", label: "", x: 8, y: 30 },
      ],
      steps: [
        { caption: "A defender's last touch sends the ball out behind their own goal line.", duration: 1400, positions: { ball: [-1, 5], d1: [10, 8] } },
        { caption: "Corner kick! The ball is placed in the corner arc.", duration: 1500, positions: { ball: [99, 63], a1: [86, 64] } },
        { caption: "A curling cross flies into the penalty area looking for a header.", duration: 1700, positions: { ball: [86, 28], a2: [86, 26] } },
      ],
    },
    quiz: [
      {
        question: "A corner kick is awarded when the ball crosses the goal line after last touching...",
        options: ["An attacker", "A defender (including the goalkeeper)", "The referee", "Nobody, it's random"],
        correct: 1,
        explanation: "If a defending player (or the goalkeeper) is the last to touch the ball before it goes out over their own goal line, it's a corner kick.",
      },
    ],
  },

  {
    id: "handball",
    icon: "✋",
    color: "#b7770d",
    title: "Handball",
    short: "When using the hand or arm becomes an offence.",
    explanation: [
      "It's a handball offence when a player deliberately touches the ball with their hand or arm — for example to control, pass, or stop it.",
      "It's also usually penalised if a player makes their body unnaturally bigger with their arm and the ball touches it, even without clear intent, especially when scoring or creating a big chance.",
      "Accidental contact, like a ball that strikes a player's hand or arm while it's close to their body in a natural position, is normally NOT a handball.",
      "Goalkeepers are allowed to use their hands, but only inside their own penalty area.",
    ],
    animation: {
      type: "sequence",
      players: [
        { id: "a1", team: "home", label: "9", x: 40, y: 30 },
        { id: "d1", team: "away", label: "4", x: 55, y: 32 },
        { id: "ref", team: "ref", label: "R", x: 50, y: 10 },
        { id: "ball", team: "ball", label: "", x: 38, y: 26 },
      ],
      steps: [
        { caption: "A cross comes in towards the defender.", duration: 1500, positions: { ball: [52, 30] } },
        { caption: "The defender deliberately blocks it with an outstretched arm.", duration: 1700, positions: { ball: [54, 31], d1: [54, 30] } },
        { caption: "Handball! The referee awards a free kick (or penalty if inside the box).", duration: 1700, positions: { ref: [50, 20] } },
      ],
    },
    quiz: [
      {
        question: "Is it always a handball if the ball touches a player's hand?",
        options: ["Yes, every single time", "No — accidental, natural contact is usually allowed", "Only if it's the goalkeeper", "Only outside the penalty area"],
        correct: 1,
        explanation: "The key factors are deliberate contact, unnatural body shape, or gaining a clear advantage — not just any touch.",
      },
      {
        question: "Where is a goalkeeper allowed to handle the ball with their hands?",
        options: ["Anywhere on the pitch", "Only inside their own penalty area", "Only in the opponent's half", "Never"],
        correct: 1,
        explanation: "Goalkeepers may use their hands only within their own penalty area; outside it, the same handball rules apply to them as any other player.",
      },
    ],
  },

  {
    id: "cards",
    icon: "🟨🟥",
    color: "#b7950b",
    title: "Yellow & Red Cards",
    short: "How referees punish misconduct and serious fouls.",
    explanation: [
      "A YELLOW CARD is a caution shown for reckless fouls, unsporting behaviour, persistent rule-breaking, or dissent.",
      "Two yellow cards in the same match equal an automatic RED CARD, sending the player off.",
      "A RED CARD can also be given directly for serious foul play, violent conduct, denying an obvious goal-scoring opportunity with a foul or handball, or serious offensive language/behaviour.",
      "A sent-off player cannot be replaced — their team must continue with one fewer player for the rest of the match.",
    ],
    animation: {
      type: "sequence",
      players: [
        { id: "d1", team: "away", label: "4", x: 50, y: 32 },
        { id: "ref", team: "ref", label: "R", x: 50, y: 20 },
      ],
      steps: [
        { caption: "A reckless tackle earns a first caution.", duration: 1500, positions: { ref: [50, 26] } },
        { caption: "Yellow card shown! The defender is officially warned.", duration: 1700, positions: {} },
        { caption: "A second reckless foul later in the match means a second yellow — which equals a red card and an early shower.", duration: 2000, positions: {} },
      ],
    },
    quiz: [
      {
        question: "How many yellow cards in one match lead to an automatic sending-off?",
        options: ["One", "Two", "Three", "Yellow cards never lead to a red"],
        correct: 1,
        explanation: "A second yellow card in the same match results in a red card and the player being sent off.",
      },
      {
        question: "Can a team bring on a substitute to replace a sent-off player?",
        options: ["Yes, immediately", "No, the team must play with one fewer player", "Only in the second half", "Only in youth football"],
        correct: 1,
        explanation: "A red card cannot be offset with a substitute — the team simply plays the rest of the match a player short.",
      },
    ],
  },

  {
    id: "match-duration",
    icon: "⏱️",
    color: "#2e4057",
    title: "Match Duration",
    short: "How long a football match actually lasts.",
    explanation: [
      "A standard match lasts 90 minutes, split into two 45-minute halves.",
      "There's a half-time break of up to 15 minutes between the two halves.",
      "The referee adds 'stoppage time' (also called injury time) at the end of each half to make up for time lost to substitutions, injuries, goal celebrations, and other delays.",
      "The match officially ends only when the referee blows the final whistle — not at exactly the 90-minute mark.",
    ],
    animation: {
      type: "sequence",
      players: [],
      steps: [
        { caption: "First half: 45 minutes of play begins.", duration: 1700, positions: {} },
        { caption: "Half-time! Up to a 15-minute break for both teams.", duration: 1700, positions: {} },
        { caption: "Second half: another 45 minutes, plus stoppage time added by the referee.", duration: 1900, positions: {} },
      ],
    },
    quiz: [
      {
        question: "How long is a standard football match (excluding stoppage time)?",
        options: ["60 minutes", "80 minutes", "90 minutes", "120 minutes"],
        correct: 2,
        explanation: "A regular match is 90 minutes, played as two 45-minute halves.",
      },
      {
        question: "Why is 'stoppage time' added at the end of a half?",
        options: ["To let TV broadcasters show more ads", "To make up for time lost to stoppages like injuries and substitutions", "It's added randomly by the home team", "Because extra time is required in every match"],
        correct: 1,
        explanation: "The referee adds time to compensate for delays during the half, ensuring the full amount of actual playing time is closer to 45 minutes.",
      },
    ],
  },

  {
    id: "extra-time",
    icon: "🏆",
    color: "#1a5276",
    title: "Extra Time & Penalty Shootouts",
    short: "Settling knockout matches that end level.",
    explanation: [
      "In knockout competitions, if the match is level after 90 minutes, it usually moves to EXTRA TIME: two further 15-minute halves.",
      "If the score is still level after extra time, the match is decided by a PENALTY SHOOTOUT.",
      "In a shootout, each team takes turns shooting from the penalty spot. After 5 kicks each, the team with more goals wins.",
      "If still tied after 5 rounds, it moves to 'sudden death' — one kick each per round until one team scores and the other misses.",
    ],
    animation: {
      type: "sequence",
      players: [
        { id: "a1", team: "home", label: "9", x: 78, y: 32 },
        { id: "gk", team: "away", label: "GK", x: 96, y: 32 },
        { id: "ball", team: "ball", label: "", x: 78, y: 32 },
      ],
      steps: [
        { caption: "90 minutes gone, scores level — onto 30 minutes of extra time.", duration: 1700, positions: {} },
        { caption: "Still level after extra time — it's going to penalties!", duration: 1700, positions: {} },
        { caption: "Each team takes 5 alternating penalties. Most goals after 5 rounds wins — or sudden death if it's still tied.", duration: 1900, positions: { ball: [98, 22], gk: [96, 24] } },
      ],
    },
    quiz: [
      {
        question: "How long is extra time in total?",
        options: ["10 minutes", "20 minutes", "30 minutes (two 15-minute halves)", "45 minutes"],
        correct: 2,
        explanation: "Extra time consists of two 15-minute halves, for a total of 30 minutes.",
      },
      {
        question: "What happens if a penalty shootout is still tied after 5 kicks each?",
        options: ["The match is declared a draw", "It moves to sudden death — one kick each per round", "They replay the entire match", "The team with fewer fouls wins"],
        correct: 1,
        explanation: "After 5 rounds, if still tied, the shootout continues in 'sudden death': one kick each per round until someone scores and the other misses.",
      },
    ],
  },
];
