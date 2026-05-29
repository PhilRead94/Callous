export type Level = {
  name: string;
  minPoints: number;
  maxPoints: number;
};

// Thresholds TBD — placeholder values for now
export const LEVELS: Level[] = [
  { name: 'Soft',             minPoints: 0,    maxPoints: 9 },
  { name: 'Getting There',    minPoints: 10,   maxPoints: 24 },
  { name: 'Hardening',        minPoints: 25,   maxPoints: 49 },
  { name: 'Iron Mind',        minPoints: 50,   maxPoints: 99 },
  { name: 'Built Different',  minPoints: 100,  maxPoints: 199 },
  { name: 'Mentality Monster',minPoints: 200,  maxPoints: Infinity },
];

export function getLevelForPoints(points: number): Level {
  return (
    LEVELS.slice().reverse().find((l) => points >= l.minPoints) ?? LEVELS[0]
  );
}
