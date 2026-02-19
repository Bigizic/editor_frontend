// Sample voice profiles grouped by gender for quick selection.
// These are display values; backend stores the profile string.
export const VOICE_PROFILES = {
  male: [
    "James",
    "Adam",
    "Charlie",
    "Clyde",
    "Harry",
    "Josh",
    "George",
    "Aaron",
    "Andrew",
    "Michael",
    "Ethan",
    "Liam",
    "Noah",
    "William",
    "NZ"
  ],
  female: [
    "Rachel",
    "Bella",
    "Dorothy",
    "Freya",
    "Gigi",
    "Lily",
    "Suzanne",
    "Michelle",
    "Olivia",
    "Emma",
    "Ava",
    "Sophia",
    "Amelia",
    "Olufunmilola"
  ],
  neutral: [
    "Alex",
    "Taylor",
    "Jordan",
    "Casey"
  ],
  child: [
    "Mia (child)",
    "Leo (child)"
  ]
};

export const ELEVENLABS_PROFILE_IDS = {
  Adam: "pNInz6obpgDQGcFmaJgB",
  Bella: "EXAVITQu4vr4xnSDxMaL",
  Charlie: "IKne3meq5aSn9XLyUdCD",
  Clyde: "2EiwWnXFnvU5JabPnv8n",
  Dorothy: "ThT5KcBeYPX3keUQqHPh",
  Freya: "jsCqWAovK2LkecY7zXl4",
  Gigi: "jBpfuIE2acCO8z3wKNLl",
  Harry: "SOYHLrjzK2X1ezoPC6cr",
  James: "ZQe5CZNOzWyzPSCn5a3c",
  Lily: "pFZP5JQG7iQjIQuC4Bku",
  Rachel: "21m00Tcm4TlvDq8ikWAM",
  Alex: "29vD33N1CtxCmqQRPOHJ",
  Aaron: "g5CIjZEefAph4nQFvHAz",
  George: "JBFqnCBsd6RMkjVDRZzb",
  Josh: "TxGEqnHWrfWFTfGW9XjX",
  Olufunmilola: "9Dbo4hEvXQ5l7MXGZFQA",
  NZ: "gsyHQ9kWCDIipR26RqQ1"
};

const ID_TO_NAME = Object.fromEntries(
  Object.entries(ELEVENLABS_PROFILE_IDS).map(([name, id]) => [id, name])
);

export const getProfilesForGender = (gender) => {
  if (!gender) return [];
  const key = gender.toLowerCase();
  return VOICE_PROFILES[key] || [];
};

export const getAllVoiceProfiles = () => {
  const seen = new Set();
  const list = [];
  Object.values(VOICE_PROFILES).flat().forEach((p) => {
    if (p && !seen.has(p)) {
      seen.add(p);
      list.push(p);
    }
  });
  return list;
};

export const displayVoiceProfile = (value) => {
  if (!value) return "";
  if (ID_TO_NAME[value]) return ID_TO_NAME[value];
  // Cloned voice: "Speaker 1_voice" -> "Speaker 1 voice"
  if (typeof value === "string" && value.endsWith("_voice")) {
    return value.slice(0, -6).replace(/_/g, " ") + " voice";
  }
  return value;
};
